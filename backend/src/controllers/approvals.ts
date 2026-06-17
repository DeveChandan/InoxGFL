import { Request, Response } from 'express';
import { s4hanaRequest } from '../services/s4hana';

interface AuthRequest extends Request {
  user?: any;
}

// Helper to filter emails (case-insensitive for SAP)
const getEmailFilter = (email: string) => {
  const cleanEmail = (email || '').trim();
  const lower = cleanEmail.toLowerCase();
  const upper = cleanEmail.toUpperCase();
  const parts = cleanEmail.split('@');
  let capitalized = cleanEmail;
  if (parts.length === 2) {
    capitalized = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() + '@' + parts[1].toLowerCase();
  }
  const casings = Array.from(new Set([cleanEmail, lower, upper, capitalized]));
  return '(' + casings.map(c => `ApprovalEmail eq '${c}'`).join(' or ') + ')';
};

// Helper to parse OData Date & Time
const parseSAPDate = (dateField: any) => {
  if (!dateField) return new Date(0);
  if (typeof dateField === 'string' && dateField.includes('Date(')) {
    return new Date(parseInt(dateField.match(/\d+/)?.[0] || '0', 10));
  }
  return new Date(dateField);
};

const parseSAPWorktime = (dateField: any, timeStr: string) => {
  const date = parseSAPDate(dateField);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  if (!timeStr) return `${dateStr}T00:00:00`;

  let hours = 0, mins = 0, secs = 0;
  const match = timeStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (match) {
    if (match[1]) hours = parseInt(match[1].replace('H', ''), 10);
    if (match[2]) mins = parseInt(match[2].replace('M', ''), 10);
    if (match[3]) secs = parseInt(match[3].replace('S', ''), 10);
  }
  
  return `${dateStr}T${pad(hours)}:${pad(mins)}:${pad(secs)}`;
};

/**
 * 1. GET: Fetch pending approvals for the logged-in approver
 */
export const getPendingApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user?.email || req.body.email || '';
    const jwtToken = req.headers.authorization?.split(' ')[1];

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    // Call S/4HANA OData service
    const response = await s4hanaRequest(
      'GET', 
      `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/PendingApprovalsSet?$filter=${getEmailFilter(userEmail)}`, 
      undefined, 
      undefined, 
      jwtToken
    );

    let rawSteps = response.d?.results || response.d || [];
    let stepsArray = Array.isArray(rawSteps) ? rawSteps : [rawSteps];

    // Case-insensitive post-filtering for email, in case filter query matches loosely
    stepsArray = stepsArray.filter((step: any) => (step.ApprovalEmail || step.ApproverEmail || '').toLowerCase() === userEmail.toLowerCase());

    // Map OData fields to structure expected by frontend ApprovalDashboard.tsx
    const mappedApprovals = stepsArray.map((step: any) => {
      const clockIn = parseSAPWorktime(step.Workdate || step.workdate, step.ClockInTime || step.Clockintime || step.clockintime);
      const clockOut = (step.ClockOutTime || step.Clockouttime || step.clockouttime) 
        ? parseSAPWorktime(step.Workdate || step.workdate, step.ClockOutTime || step.Clockouttime || step.clockouttime) 
        : null;
      
      return {
        id: step.StepId || step.Stepid || step.stepid || step.id,
        attendance: {
          work_date: parseSAPDate(step.Workdate || step.workdate).toISOString(),
          clock_in_time: clockIn,
          clock_out_time: clockOut,
          hours_worked: step.HoursWorked || step.Hoursworked || step.hoursworked || "0.00",
          manual_location: step.ManualLocation || step.Manuallocation || step.manuallocation || "",
          ip_address: step.IpAddress || step.Ipaddress || step.ipaddress || "",
          os_system: step.OsSystem || step.Ossystem || step.ossystem || "",
          is_exception: step.IsException === 'X' || step.Isexception === 'X' || step.isexception === 'X' || step.IsException === 'Yes' || step.Isexception === 'Yes' || step.IsException === 'true' || step.Isexception === 'true',
          user: {
            name: step.EmployeeName || step.Employeename || step.employeename || "",
            email: step.EmployeeEmail || step.Employeeemail || step.employeeemail || "",
            track: step.Track || step.track || "",
            module: step.Module || step.module || "",
            vendor_role: step.VendorRole || step.Vendorrole || step.vendorrole || "",
            vendor: {
              vendor_name: step.VendorName || step.Vendorname || step.vendorname || ""
            }
          },
          worksheet: {
            tasks_description: step.TaskDescription || step.Taskdescription || step.taskdescription || ""
          }
        }
      };
    });

    res.json({ message: 'Success', approvals: mappedApprovals });
  } catch (error: any) {
    console.error('getPendingApprovals Error:', error);
    res.status(500).json({ message: 'Error fetching approvals from S/4HANA', error: error.message });
  }
};

/**
 * 2. POST: Approve or Reject a specific timesheet step
 */
export const actionApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // StepId
    const { action, comments } = req.body; // 'APPROVE' or 'REJECT'
    const jwtToken = req.headers.authorization?.split(' ')[1];

    if (!id || !action) {
      return res.status(400).json({ message: 'Missing parameters: id and action are required' });
    }

    const payload = {
      StepId: id,
      Action: action,
      Comments: comments || ""
    };

    const response = await s4hanaRequest('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/ApprovalActionSet', payload, undefined, jwtToken);
    res.json({ message: `Timesheet step ${action.toLowerCase()}d successfully`, data: response.d || response });
  } catch (error: any) {
    console.error('actionApproval Error:', error);
    res.status(500).json({ message: 'Error processing approval in S/4HANA', error: error.message });
  }
};

/**
 * 3. POST: Bulk Action (Approve/Reject multiple timesheets)
 */
export const bulkActionApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { stepIds, action, comments } = req.body;
    const jwtToken = req.headers.authorization?.split(' ')[1];

    if (!Array.isArray(stepIds) || stepIds.length === 0 || !action) {
      return res.status(400).json({ message: 'Invalid payload: stepIds must be a non-empty array and action is required' });
    }

    // Process sequentially
    for (const stepId of stepIds) {
      const payload = {
        StepId: String(stepId),
        Action: action,
        Comments: comments || ""
      };
      await s4hanaRequest('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/ApprovalActionSet', payload, undefined, jwtToken);
    }

    res.json({ message: `Successfully bulk ${action.toLowerCase()}d ${stepIds.length} items` });
  } catch (error: any) {
    console.error('bulkActionApproval Error:', error);
    res.status(500).json({ message: 'Error bulk processing approvals in S/4HANA', error: error.message });
  }
};

/**
 * 4. GET: Fetch all Routing Rules (Approval Matrix)
 */
export const getMatrixRules = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    const response = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/ApprovalMatrixSet', undefined, undefined, jwtToken);
    
    const rawRules = response.d?.results || response.d || [];
    const rulesArray = Array.isArray(rawRules) ? rawRules : [rawRules];

    // Format to match the frontend 'ApprovalMatrixAdmin' columns
    const mappedRules = rulesArray.map((rule: any) => ({
      id: rule.RuleId || rule.id,
      vendor_code: rule.Vendorcode || rule.vendor_code,
      employee_role: rule.EmployeeRole || rule.employee_role,
      track: rule.Track || rule.track,
      module: rule.Workingmodule || rule.module, // Note: Workingmodule in metadata
      level: parseInt(rule.AppLevel || rule.level || "0"),
      approver_id: rule.ApproverEmail || rule.approver_id,
      approver_type: rule.ApproverType || rule.approver_type,
      vendor: { 
        vendor_code: rule.Vendorcode || "", 
        vendor_name: rule.Vendorcode || "" 
      },
      approver: { 
        email: rule.ApproverEmail || "", 
        name: rule.ApproverEmail || "" 
      }
    }));

    res.json({ message: 'Success', rules: mappedRules });
  } catch (error: any) {
    console.error('getMatrixRules Error:', error);
    res.status(500).json({ message: 'Error fetching matrix rules', error: error.message });
  }
};

/**
 * 5. POST: Create a new routing rule in the Matrix
 */
export const createMatrixRule = async (req: AuthRequest, res: Response) => {
  try {
    const r = req.body;
    const jwtToken = req.headers.authorization?.split(' ')[1];

    const payload = {
      RuleId: "", // Let SAP generate or generate UUID if required
      Vendorcode: String(r.vendor_code || r.vendor_id || ""),
      EmployeeRole: r.employee_role,
      Track: r.track,
      Workingmodule: r.module || "", // Note: Workingmodule in metadata
      ApproverEmail: String(r.approver_id || ""), // Front-end passes email as approver_id
      ApproverType: r.approver_type,
      AppLevel: Number(r.level || 0)
    };

    const response = await s4hanaRequest('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/ApprovalMatrixSet', payload, undefined, jwtToken);
    res.json({ message: 'Approval rule created in S/4HANA', data: response.d || response });
  } catch (error: any) {
    console.error('createMatrixRule Error:', error);
    res.status(500).json({ message: 'Error creating matrix rule in S/4HANA', error: error.message });
  }
};

/**
 * 6. PUT: Update a routing rule
 */
export const updateMatrixRule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const r = req.body;
    const jwtToken = req.headers.authorization?.split(' ')[1];

    if (!id) {
      return res.status(400).json({ message: 'Missing parameter: id is required' });
    }

    const payload = {
      RuleId: id,
      Vendorcode: String(r.vendor_code || r.vendor_id || ""),
      EmployeeRole: r.employee_role,
      Track: r.track,
      Workingmodule: r.module || "",
      ApproverEmail: String(r.approver_id || ""),
      ApproverType: r.approver_type,
      AppLevel: Number(r.level || 0)
    };

    // Use PUT or PATCH for OData updates
    await s4hanaRequest('PUT', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/ApprovalMatrixSet('${id}')`, payload, undefined, jwtToken);
    res.json({ message: 'Approval rule updated in S/4HANA' });
  } catch (error: any) {
    console.error('updateMatrixRule Error:', error);
    res.status(500).json({ message: 'Error updating matrix rule in S/4HANA', error: error.message });
  }
};

/**
 * 7. DELETE: Delete a routing rule
 */
export const deleteMatrixRule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jwtToken = req.headers.authorization?.split(' ')[1];

    if (!id) {
      return res.status(400).json({ message: 'Missing parameter: id is required' });
    }

    await s4hanaRequest('DELETE', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/ApprovalMatrixSet('${id}')`, undefined, undefined, jwtToken);
    res.json({ message: 'Approval rule deleted from S/4HANA' });
  } catch (error: any) {
    console.error('deleteMatrixRule Error:', error);
    res.status(500).json({ message: 'Error deleting matrix rule from S/4HANA', error: error.message });
  }
};
