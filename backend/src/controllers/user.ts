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
    
    if (!callerProfile && userEmail.toLowerCase() !== 'vineet.kumar@gfl.co.in') {
      // If user isn't in DB yet and not master key, return nothing to be safe
      mappedUsers = [];
    } else if (userEmail.toLowerCase() === 'vineet.kumar@gfl.co.in' || callerProfile?.role === 'SUPERADMIN' || callerProfile?.role === 'SUPER_ADMIN') {
      // SUPERADMIN sees everything
    } else if (callerProfile?.role === 'VENDOR_ADMIN') {
      // VENDOR_ADMIN only sees users from their exact same vendor
      mappedUsers = mappedUsers.filter(u => (u.vendor_code || '') === (callerProfile.vendor_code || ''));
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
