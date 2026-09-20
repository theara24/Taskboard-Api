import { prisma } from '../src/config/prisma';

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, provider: true },
  });
  console.log('CURRENT USERS IN DB:', JSON.stringify(users, null, 2));
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, key: true, ownerId: true },
  });
  console.log('CURRENT PROJECTS IN DB:', JSON.stringify(projects, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
