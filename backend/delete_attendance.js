const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vendor = await prisma.vendor.findUnique({ where: { vendor_code: 'V-5000' } });
  if (!vendor) return console.log('Vendor V-5000 not found');

  const users = await prisma.user.findMany({ where: { vendor_id: vendor.id } });
  const userIds = users.map(u => u.id);

  if (userIds.length > 0) {
    const deleted = await prisma.attendance.deleteMany({
      where: { user_id: { in: userIds } }
    });
    console.log(`Deleted ${deleted.count} attendance records for V-5000.`);
  } else {
    console.log('No users found for V-5000.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
