import { s4hanaRequest } from './services/s4hana';

async function run() {
  try {
    const res = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet');
    const vendors = res.d?.results || res.d || [];
    console.log('VENDORS IN S/4HANA:');
    vendors.forEach((v: any) => {
      console.log(`Code: ${v.Vendorcode}, Name: ${v.Vendorname}`);
    });
  } catch (err: any) {
    console.error('Failed to query vendors:', err.message);
  }
}

run();
