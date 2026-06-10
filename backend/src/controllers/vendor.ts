import { Request, Response } from 'express';
import { s4hanaRequest } from '../services/s4hana';

interface AuthRequest extends Request {
  user?: any;
}

export const getVendors = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    // ABAP URL Placeholder: /sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet
    const response = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet', undefined, undefined, jwtToken);
    
    // Map S/4HANA fields to frontend expected fields
    const rawVendors = response.d?.results || response.d || response || [];
    const mappedVendors = (Array.isArray(rawVendors) ? rawVendors : [rawVendors]).map((v: any) => ({
      id: v.Vendorcode || v.vendor_code,
      vendor_code: v.Vendorcode || v.vendor_code,
      vendor_name: v.Vendorname || v.vendor_name,
      total_emp: v.Totalemp || v.total_emp,
      rate: v.Rate || v.rate,
      contract_person: v.Contractperson || v.contract_person,
      contact_email: v.Contactemail || v.contact_email,
      contact_phone: v.Contactphone || v.contact_phone,
      contact_address: v.Contactaddress || v.contact_address,
      status: v.Status || v.status || 'ACTIVE'
    }));

    res.json({ message: 'Success', vendors: mappedVendors });
  } catch (error: any) {
    console.error('getVendors Error:', error);
    res.status(500).json({ message: 'Error fetching vendors from S/4HANA', error: error.message });
  }
};

export const createVendor = async (req: AuthRequest, res: Response) => {
  try {
    const vendorData = req.body;
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    // Map frontend fields to S/4HANA fields
    const s4hanaData = {
      Vendorcode: vendorData.vendor_code || vendorData.Vendorcode,
      Vendorname: vendorData.vendor_name || vendorData.Vendorname,
      Totalemp: vendorData.total_emp || vendorData.Totalemp || "0",
      Rate: vendorData.rate || vendorData.Rate || "0.00",
      Contractperson: vendorData.contract_person || vendorData.Contractperson || "",
      Contactemail: vendorData.contact_email || vendorData.Contactemail || "",
      Contactphone: vendorData.contact_phone || vendorData.Contactphone || "",
      Contactaddress: vendorData.contact_address || vendorData.Contactaddress || "",
      Status: vendorData.status || vendorData.Status || "ACTIVE"
    };

    // ABAP URL Placeholder: /sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet
    const response = await s4hanaRequest('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet', s4hanaData, undefined, jwtToken);
    res.json({ message: 'Vendor created successfully in S/4HANA', data: response.d || response });
  } catch (error: any) {
    console.error('createVendor Error:', error);
    res.status(500).json({ message: 'Error creating vendor in S/4HANA', error: error.message });
  }
};
