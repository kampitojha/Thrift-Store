import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'test@test.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`User not found: ${email}`);
    process.exit(1);
  }
  console.log(`Found: ${user.id} ${user.email} role=${user.role}`);
  await prisma.user.update({ where: { id: user.id }, data: { role: 'SUPER_ADMIN' } });
  console.log('Updated to SUPER_ADMIN ✓');
  const u = await prisma.user.findUnique({ where: { id: user.id } });
  console.log(`Verified: ${u.role}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  prisma.$disconnect();
  process.exit(1);
});
