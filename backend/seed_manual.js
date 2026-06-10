const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
    let vendor = await prisma.vendor.findFirst({ where: { vendor_name: 'InoxGFL HQ' } });
    
    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: { vendor_code: 'HQ-001', vendor_name: 'InoxGFL HQ', status: 'active' }
      });
    }

    const adminEmail = 'admin@inoxgfl.com';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
// let Amidn = async function() {user.finduniuew{[Where:{username.adminEmail}]}}
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await prisma.user.create({
        data: {
          vendor_id: vendor.id,
          name: 'Super Admin',
          email: adminEmail,
          password_hash: hashedPassword,
          role: 'SUPER_ADMIN'
        }
      });
    }
    console.log('Seeded successfully.');
}
seed().finally(() => prisma.$disconnect());
//this seed file create a server user name to first time login and create other user and vendor 
// seed.manual create first user verndor admin employee and amdin