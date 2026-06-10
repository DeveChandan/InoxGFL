const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- Checking Vendor V-5000 ---");
  const vendor = await prisma.vendor.findUnique({
    where: { vendor_code: 'V-5000' },
    include: {
      users: { select: { id: true, name: true, email: true, vendor_role: true, track: true, module: true, role: true } },
      approval_matrices: { include: { approver: { select: { name: true } } } }
    }
  });

  if (!vendor) {
    console.log("Vendor V-5000 not found!");
    return;
  }

  console.log(`Vendor ID: ${vendor.id}, Name: ${vendor.vendor_name}`);
  
  console.log("\nUsers:");
  vendor.users.forEach(u => console.log(` - [${u.id}] ${u.name} | Role: ${u.role} | V_Role: ${u.vendor_role} | Track: ${u.track} | Module: "${u.module}"`));

  console.log("\nMatrix Rules:");
  vendor.approval_matrices.forEach(r => console.log(` - L${r.level} | V_Role: ${r.employee_role} | Track: ${r.track} | Module: "${r.module}" | Approver: ${r.approver.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
