import { s4hanaRequest } from './services/s4hana';

async function run() {
  try {
    const res = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet');
    const users = res.d?.results || res.d || [];
    console.log('USERS IN S/4HANA:');
    users.forEach((u: any) => {
      console.log(`Email: ${u.Email}, Name: ${u.Name}, Role: ${u.Systemrole || u.systemrole}, Vendorcode: ${u.Vendorcode || u.vendorcode}`);
    });
  } catch (err: any) {
    console.error('Failed to query users:', err.message);
  }
}

run();
