import { Request, Response } from 'express';
import { s4hanaRequest } from '../services/s4hana';

interface AuthRequest extends Request {
  user?: any;
}

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    const userEmail = req.user?.email || '';
    
    const response = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet', undefined, undefined, jwtToken);
    
    const rawUsers = response.d?.results || response.d || response || [];
    let mappedUsers = (Array.isArray(rawUsers) ? rawUsers : [rawUsers]).map((u: any) => ({
      id: u.Email || u.email,
      email: u.Email || u.email,
      name: u.Name || u.name,
      role: u.Systemrole || u.role,
      vendor_code: u.Vendorcode || u.vendor_code,
      designation: u.Designation || u.designation,
      track: u.Track || u.track,
      module: u.Workmodule || u.module,
      billing_alloc: u.Billingalloc || u.billing_alloc,
      vendor_mail: u.Vendormail || u.vendor_mail,
      vendor_domain: u.Vendordomain || u.vendor_domain,
      vendor_role: u.Vendorrole || u.vendor_role,
      onboarding_date: u.Onboardingdate || u.onboarding_date,
      offboarding_date: u.Offboardingdate || u.offboarding_date
    }));

    // Find the caller's profile to enforce Role-Based Access Control
    const callerProfile = mappedUsers.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    const callerRole = req.user?.role || callerProfile?.role || 'EMPLOYEE';
    const callerVendorCode = req.user?.vendor_code || callerProfile?.vendor_code || '';

    const isGlobalAdmin = (userEmail.toLowerCase() === 'vineet.kumar@gfl.co.in' || callerRole === 'SUPER_ADMIN' || callerRole === 'SUPERADMIN' || (callerRole === 'ADMIN' && !callerVendorCode));
    const isVendorRestricted = !isGlobalAdmin && callerVendorCode;

    if (!callerProfile && userEmail.toLowerCase() !== 'vineet.kumar@gfl.co.in') {
      // If user isn't in DB yet and not master key, return nothing to be safe
      mappedUsers = [];
    } else if (isGlobalAdmin) {
      // SUPERADMIN/Global ADMIN sees everything
    } else if (isVendorRestricted) {
      // Vendor-restricted admin only sees users from their exact same vendor
      mappedUsers = mappedUsers.filter(u => (u.vendor_code || '').toUpperCase() === callerVendorCode.toUpperCase());
    } else {
      // Regular EMPLOYEE only sees their own profile
      mappedUsers = mappedUsers.filter(u => u.email.toLowerCase() === userEmail.toLowerCase());
    }

    res.json({ message: 'Success', users: mappedUsers });
  } catch (error: any) {
    console.error('getUsers Error:', error);
    res.status(500).json({ message: 'Error fetching users from S/4HANA', error: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const u = req.body;
    const s4hanaData = {
      Email: u.email || u.Email,
      Name: u.name || u.Name,
      Systemrole: u.role || u.Systemrole || "EMPLOYEE",
      Vendorcode: u.vendor_code || u.vendor_id || u.Vendorcode || "",
      Designation: u.designation || u.Designation || "",
      Track: u.track || u.Track || "",
      Workmodule: u.module || u.Workmodule || "",
      Billingalloc: u.billing_alloc || u.Billingalloc || "",
      Vendormail: u.vendor_mail || u.Vendormail || "",
      Vendordomain: u.vendor_domain || u.Vendordomain || "",
      Vendorrole: u.vendor_role || u.Vendorrole || "",
      Onboardingdate: u.onboarding_date || u.Onboardingdate || "",
      Offboardingdate: u.offboarding_date || u.Offboardingdate || ""
    };

    const jwtToken = req.headers.authorization?.split(' ')[1];
    const response = await s4hanaRequest('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet', s4hanaData, undefined, jwtToken);
    res.json({ message: 'User created successfully in S/4HANA', data: response.d || response });
  } catch (error: any) {
    console.error('createUser Error:', error);
    res.status(500).json({ message: 'Error creating user in S/4HANA', error: error.message });
  }
};

export const debugUsers = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    const targets = [
      { email: 'totan@gfl.co.in', name: 'totan', role: 'VENDOR_ADMIN' },
      { email: 'arnab@gfl.co.in', name: 'arnab', role: 'EMPLOYEE' },
      { email: 'pwcnew@gfl.co.in', name: 'pwcnew', role: 'VENDOR_ADMIN' },
      { email: 'pwc@gfl.co.in', name: 'pwc', role: 'EMPLOYEE' },
      { email: 'pwc1@gfl.co.in', name: 'pwc1', role: 'EMPLOYEE' }
    ];
    
    const results = [];
    for (const t of targets) {
      const payload = {
        Email: t.email,
        Name: t.name,
        Systemrole: t.role,
        Vendorcode: 'V-1002',
        Designation: 'CONSULTANT',
        Track: 'S4HANA',
        Workmodule: 'MM',
        Billingalloc: 'FULL',
        Vendormail: t.email,
        Vendordomain: 'MM',
        Vendorrole: 'ML',
        Onboardingdate: '2026-06-08',
        Offboardingdate: ''
      };

      let status = 'Failed';
      let data = null;

      // Try PUT first
      try {
        const putRes = await s4hanaRequest('PUT', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet('${t.email}')`, payload, undefined, jwtToken);
        status = 'Updated (PUT)';
        data = putRes;
      } catch (putErr: any) {
        console.warn(`PUT failed for user ${t.email}:`, putErr.message);
        // Try PATCH
        try {
          const patchRes = await s4hanaRequest('PATCH', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet('${t.email}')`, payload, undefined, jwtToken);
          status = 'Updated (PATCH)';
          data = patchRes;
        } catch (patchErr: any) {
          console.warn(`PATCH failed for user ${t.email}:`, patchErr.message);
          // Try POST (recreate fallback)
          try {
            const createRes = await s4hanaRequest('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet', payload, undefined, jwtToken);
            status = 'Created (POST)';
            data = createRes;
          } catch (postErr: any) {
            console.error(`All write operations failed for user ${t.email}:`, postErr.message);
            status = `Failed: ${postErr.message}`;
          }
        }
      }

      results.push({ email: t.email, status, data });
    }
    
    res.json({ message: 'Debug user mapping completed', results });
  } catch (error: any) {
    console.error('debugUsers error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const listDebugUsers = async (req: Request, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    const response = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet', undefined, undefined, jwtToken);
    const rawUsers = response.d?.results || response.d || response || [];
    const mappedUsers = (Array.isArray(rawUsers) ? rawUsers : [rawUsers]).map((u: any) => ({
      email: u.Email || u.email,
      name: u.Name || u.name,
      role: u.Systemrole || u.role,
      vendor_code: u.Vendorcode || u.vendor_code,
      designation: u.Designation || u.designation,
      track: u.Track || u.track,
      module: u.Workmodule || u.module,
      billing_alloc: u.Billingalloc || u.billing_alloc
    }));
    res.json({ message: 'Success', users: mappedUsers });
  } catch (error: any) {
    console.error('listDebugUsers error:', error);
    res.status(500).json({ error: error.message });
  }
};
