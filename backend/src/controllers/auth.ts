import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { s4hanaRequest } from '../services/s4hana';

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
  return '(' + casings.map(c => `Email eq '${c}'`).join(' or ') + ')';
};

// In BTP with XSUAA, login is handled by the platform.
// This endpoint now checks the user against S/4HANA.
export const login = async (req: Request, res: Response) => {
  try {
    // req.user is populated by passport/xssec
    let user: any = req.user;
    
    // Prioritize the email submitted in the login form so we can test different users,
    // otherwise fallback to the BTP XSUAA session user, or finally a default mock user in dev.
    let rawEmail = req.body.email;
    if (!rawEmail) {
      if (user && (user.email || user.id)) {
        rawEmail = user.email || user.id;
      } else if (process.env.NODE_ENV !== 'production') {
        rawEmail = 'vineet.kumar@gfl.co.in';
      } else {
        return res.status(401).json({ message: 'Unauthorized: No active SAP BTP session found' });
      }
    }
    const userEmail = rawEmail; // DO NOT lowercase this! S/4HANA OData query is case-sensitive!
    
    let assignedEmail = userEmail;

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
      const response = await s4hanaRequest('GET', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$filter=${getEmailFilter(userEmail)}`, undefined, undefined, jwtToken);
      
      if (response.d && response.d.results && response.d.results.length > 0) {
        // Manually find the matching user in case the ABAP backend ignores the $filter query
        // Prioritize the user record that has a populated Vendorcode
        let s4User = response.d.results.find((u: any) => {
          const uEmail = u.Email || u.email || '';
          const uVendor = u.Vendorcode || u.vendor_code || '';
          return uEmail.toLowerCase() === userEmail.toLowerCase() && uVendor.trim() !== '';
        });
        if (!s4User) {
          s4User = response.d.results.find((u: any) => (u.Email || u.email || '').toLowerCase() === userEmail.toLowerCase());
        }
        if (s4User) {
          // Normalize email to match the exact casing in SAP database
          assignedEmail = s4User.Email || s4User.email || userEmail;
          
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

    // Block login if user's vendor is deactivated
    if (assignedVendor && !isMasterKey) {
      try {
        const vResponse = await s4hanaRequest(
          'GET', 
          `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet?$filter=Vendorcode eq '${assignedVendor.toUpperCase()}'`, 
          undefined, 
          undefined, 
          jwtToken
        );
        const vendorsList = vResponse.d?.results || vResponse.d || [];
        const vendor = Array.isArray(vendorsList) 
          ? vendorsList.find((v: any) => v.Vendorcode?.toUpperCase() === assignedVendor.toUpperCase()) 
          : vendorsList;
        
        if (vendor) {
          const vStatus = (vendor.Status || vendor.status || '').toUpperCase().trim();
          if (vStatus === 'DEACTIVE' || vStatus === 'INACTIVE') {
            console.warn(`[Login] Rejected login for ${assignedEmail}: Vendor ${assignedVendor} is deactivated.`);
            return res.status(403).json({ 
              message: 'Access Denied: Your vendor is currently deactivated. Please contact the administrator.' 
            });
          }
        }
      } catch (vErr: any) {
        console.warn(`[Login] Could not verify vendor status for ${assignedVendor}:`, vErr.message);
      }
    }

    const customToken = jwt.sign(
      { email: assignedEmail, role: assignedRole, vendor_code: assignedVendor }, 
      process.env.JWT_SECRET || 'super_secret_jwt_key_inoxgfl_2026', 
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Authentication successful via SAP BTP',
      token: customToken,
      user: {
        email: assignedEmail,
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
