const s4 = require('./src/services/s4hana');
async function test() {
    try {
        const response = await s4.s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet');
        console.log(JSON.stringify(response.d.results.slice(0, 5), null, 2));
    } catch (e) {
        console.error(e.message);
    }
}
test();
