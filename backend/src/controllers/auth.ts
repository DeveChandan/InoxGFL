import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { s4hanaRequest } from '../services/s4hana';

// In BTP with XSUAA, login is handled by the platform.
// This endpoint now checks the user against S/4HANA.
export const login = async (req: Request, res: Response) => {
  try {
    // req.user is populated by passport/xssec
    let user: any = req.user;
    
    // Prioritize the email submitted in the login form so we can test different users,
    // otherwise fallback to the BTP XSUAA session user, or finally a default mock user.
    const rawEmail = req.body.email || (user ? (user.email || user.id) : null) || 'vineet.kumar@gfl.co.in';
    const userEmail = rawEmail; // DO NOT lowercase this! S/4HANA OData query is case-sensitive!
    
    // Default fallback values
    let assignedRole = 'EMPLOYEE';
    let assignedName = 'Unknown User';
    let assignedVendor = null;
    let isMasterKey = false;

    // MASTER SUPER ADMIN CHECK
    if (userEmail.toLowerCase() === 'vineet.kumar@gfl.co.in') {
      assignedRole = 'SUPER_ADMIN';
      assignedName = 'Vineet Kumar';
      isMasterKey = true;
    }

    const jwtToken = req.headers.authorization?.split(' ')[1];

    try {
      // Query S/4HANA to see if the user exists in ZINOX_USERS
      const response = await s4hanaRequest('GET', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$filter=Email eq '${userEmail}'`, undefined, undefined, jwtToken);
      
      if (response.d && response.d.results && response.d.results.length > 0) {
        // Manually find the matching user in case the ABAP backend ignores the $filter query
        const s4User = response.d.results.find((u: any) => u.Email?.toLowerCase() === userEmail.toLowerCase());
        if (s4User) {
          // Robust extraction to handle VendorCode, Vendorcode, SystemRole, Systemrole etc.
          const getProp = (obj: any, target: string) => {
            const key = Object.keys(obj).find(k => k.toLowerCase().replace(/_/g, '') === target.toLowerCase().replace(/_/g, ''));
            return key ? obj[key] : undefined;
          };
          
          assignedRole = isMasterKey ? 'SUPER_ADMIN' : (getProp(s4User, 'systemrole') || assignedRole);
          assignedName = getProp(s4User, 'name') || assignedName;
          assignedVendor = getProp(s4User, 'vendorcode') || null;
        } else if (!isMasterKey) {
          return res.status(403).json({ message: 'Access Denied: You are not registered in the system.' });
        }
      } else if (!isMasterKey) {
        // If they are not in the database and NOT the master key, deny access
        return res.status(403).json({ message: 'Access Denied: You are not registered in the system.' });
      }
    } catch (s4Err) {
      console.warn('Could not connect to S/4HANA for auth check, using fallback.', s4Err);
    }

    const customToken = jwt.sign(
      { email: userEmail, role: assignedRole, vendor_code: assignedVendor }, 
      process.env.JWT_SECRET || 'super_secret_jwt_key_inoxgfl_2026', 
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Authentication successful via SAP BTP',
      token: customToken,
      user: {
        email: userEmail,
        name: assignedName,
        role: assignedRole, 
        vendor_code: assignedVendor 
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const seedInitialData = async (req: Request, res: Response) => {
  res.status(400).json({ message: 'Seeding is disabled on SAP BTP. Data is managed in S/4HANA.' });
};
