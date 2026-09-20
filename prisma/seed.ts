import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TaskBoard production seeding...');

  // Ensure the single designated System Administrator exists
  const adminEmail = 'admin@taskboard.io';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin123!', salt);

    const admin = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      },
    });
    console.log(`✅ Created system administrator account: ${admin.email}`);
  } else {
    console.log(`ℹ️ System administrator account already exists: ${existingAdmin.email}`);
  }

  console.log('✨ Seeding complete. Zero dummy test data injected.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
