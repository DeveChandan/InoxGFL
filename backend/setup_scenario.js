const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database setup for the EY and Deloitte scenario...');

  // 1. Setup Vendors
  const gflVendor = await prisma.vendor.upsert({
    where: { vendor_name: 'InoxGFL HQ' },
    update: {},
    create: { vendor_code: 'GFL-HQ', vendor_name: 'InoxGFL HQ' }
  });

  const eyVendor = await prisma.vendor.upsert({
    where: { vendor_name: 'EY' },
    update: {},
    create: { vendor_code: 'EY-01', vendor_name: 'EY' }
  });

  const deloitteVendor = await prisma.vendor.upsert({
    where: { vendor_name: 'Deloitte' },
    update: {},
    create: { vendor_code: 'DEL-01', vendor_name: 'Deloitte' }
  });

  console.log('Vendors ensured.');

  // 2. Setup GFL Approvers
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const createAdmin = async (name, email) => {
    return await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: {
        name, email, password_hash: passwordHash, role: 'ADMIN', vendor_id: gflVendor.id
      }
    });
  };

  const dheeraj = await createAdmin('Dheeraj Malo', 'dheeraj@gfl.com');
  const vineet = await createAdmin('Vineet Kumar', 'vineet@gfl.com');
  const amit = await createAdmin('Amit Jain', 'amit@gfl.com');
  const rahul = await createAdmin('Rahul Sharma', 'rahul@gfl.com');
  const sunil = await createAdmin('Sunil Gupta', 'sunil@gfl.com');

  console.log('GFL Admins ensured.');

  // 3. Setup EY Users
  const eyManager = await prisma.user.upsert({
    where: { email: 'manager@ey.com' },
    update: {},
    create: { name: 'EY Manager', email: 'manager@ey.com', password_hash: passwordHash, role: 'VENDOR_ADMIN', vendor_id: eyVendor.id }
  });
  
  const eyDirector = await prisma.user.upsert({
    where: { email: 'director@ey.com' },
    update: {},
    create: { name: 'EY Director', email: 'director@ey.com', password_hash: passwordHash, role: 'VENDOR_ADMIN', vendor_id: eyVendor.id }
  });

  const eyEmployee = await prisma.user.upsert({
    where: { email: 'employee@ey.com' },
    update: { vendor_role: 'CTM', track: 'S4HANA', module: 'PP' },
    create: { 
      name: 'EY Employee', email: 'employee@ey.com', password_hash: passwordHash, role: 'EMPLOYEE', vendor_id: eyVendor.id,
      vendor_role: 'CTM', track: 'S4HANA', module: 'PP'
    }
  });

  // 4. Setup Deloitte Users
  const deloitteManager = await prisma.user.upsert({
    where: { email: 'manager@deloitte.com' },
    update: {},
    create: { name: 'Deloitte Manager', email: 'manager@deloitte.com', password_hash: passwordHash, role: 'VENDOR_ADMIN', vendor_id: deloitteVendor.id }
  });
  
  const deloitteDirector = await prisma.user.upsert({
    where: { email: 'director@deloitte.com' },
    update: {},
    create: { name: 'Deloitte Director', email: 'director@deloitte.com', password_hash: passwordHash, role: 'VENDOR_ADMIN', vendor_id: deloitteVendor.id }
  });

  const deloitteEmployee = await prisma.user.upsert({
    where: { email: 'employee@deloitte.com' },
    update: { vendor_role: 'CTM', track: 'S4HANA', module: 'PP' },
    create: { 
      name: 'Deloitte Employee', email: 'employee@deloitte.com', password_hash: passwordHash, role: 'EMPLOYEE', vendor_id: deloitteVendor.id,
      vendor_role: 'CTM', track: 'S4HANA', module: 'PP'
    }
  });

  console.log('Vendor users ensured.');

  // 5. Clear old matrices to prevent duplicates
  await prisma.approvalMatrix.deleteMany({});
  console.log('Cleared old matrix rules.');

  // 6. Create EY Matrix
  await prisma.approvalMatrix.createMany({
    data: [
      { vendor_id: eyVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 1, approver_id: eyManager.id, approver_type: 'EY Manager' },
      { vendor_id: eyVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 2, approver_id: eyDirector.id, approver_type: 'EY Director' },
      { vendor_id: eyVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 3, approver_id: dheeraj.id, approver_type: 'GFL L3' },
      { vendor_id: eyVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 4, approver_id: vineet.id, approver_type: 'GFL L4' },
      { vendor_id: eyVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 5, approver_id: amit.id, approver_type: 'GFL L5' }
    ]
  });

  // 7. Create Deloitte Matrix
  await prisma.approvalMatrix.createMany({
    data: [
      { vendor_id: deloitteVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 1, approver_id: deloitteManager.id, approver_type: 'Deloitte Manager' },
      { vendor_id: deloitteVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 2, approver_id: deloitteDirector.id, approver_type: 'Deloitte Director' },
      { vendor_id: deloitteVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 3, approver_id: rahul.id, approver_type: 'GFL L3' },
      { vendor_id: deloitteVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 4, approver_id: sunil.id, approver_type: 'GFL L4' },
      { vendor_id: deloitteVendor.id, employee_role: 'CTM', track: 'S4HANA', module: 'PP', level: 5, approver_id: amit.id, approver_type: 'GFL L5' }
    ]
  });

  console.log('Matrix rules successfully created for EY and Deloitte!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
