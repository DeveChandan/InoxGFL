const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({select: {id: true, role: true, vendor_id: true, name: true}});
  console.log(users);
}
main().finally(() => prisma.$disconnect());
