import { Request, Response } from 'express';
import { s4hanaRequest } from '../services/s4hana';

interface AuthRequest extends Request {
  user?: any;
}

export const getWorksheets = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    const response = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet', undefined, undefined, jwtToken);
    
    const rawWorksheets = response.d?.results || response.d || response || [];
    const mappedWorksheets = (Array.isArray(rawWorksheets) ? rawWorksheets : [rawWorksheets]).map((w: any) => ({
      id: w.Worksheetid || w.id || w.worksheet_id,
      email: w.Email || w.email,
      date: w.Workdate || w.date,
      task_description: w.Taskdescription || w.task_description,
      hours_spent: w.Hoursspent || w.hours_spent,
      status: w.Status || w.status
    }));

    res.json({ message: 'Success', worksheets: mappedWorksheets });
  } catch (error: any) {
    console.error('getWorksheets Error:', error);
    res.status(500).json({ message: 'Error fetching worksheets from S/4HANA', error: error.message });
  }
};

export const submitWorksheet = async (req: AuthRequest, res: Response) => {
  try {
    const w = req.body;
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    let workDateStr = w.date || w.Workdate;
    if (!workDateStr) {
      workDateStr = `${formatter.format(new Date())}T00:00:00`;
    } else {
      const datePart = workDateStr.split('T')[0];
      workDateStr = `${datePart}T00:00:00`;
    }

    let worksheetId = w.id || w.worksheet_id || w.Worksheetid;
    if (!worksheetId) {
      const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
      worksheetId = `WS${Date.now()}${randHex}`.substring(0, 20);
    }

    const s4hanaData = {
      Worksheetid: worksheetId,
      Email: req.user?.email || w.email || "",
      Workdate: workDateStr,
      Taskdescription: w.tasks_description || w.task_description || w.Taskdescription || "",
      Hoursspent: w.hours_spent ? String(w.hours_spent) : (w.Hoursspent || "0"),
      Status: w.status || w.Status || "PENDING"
    };

    const jwtToken = req.headers.authorization?.split(' ')[1];
    const response = await s4hanaRequest('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet', s4hanaData, undefined, jwtToken);
    res.json({ message: 'Worksheet created successfully in S/4HANA', data: response.d || response });
  } catch (error: any) {
    console.error('submitWorksheet Error:', error);
    res.status(500).json({ message: 'Error submitting worksheet', error: error.message });
  }
};
