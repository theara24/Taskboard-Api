import { prisma } from '../src/config/prisma';

async function cleanTestData() {
  console.log('🧹 Cleaning test users and dummy projects...');

  const testEmails = [
    'alice@example.com',
    'bob@example.com',
    'charlie@example.com',
    'google.developer@example.com',
  ];

  // Find test users
  const testUsers = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { id: true, email: true },
  });

  const testUserIds = testUsers.map((u) => u.id);
  console.log(`Found ${testUsers.length} test users to remove:`, testUsers.map((u) => u.email));

  if (testUserIds.length > 0) {
    // Find projects owned by test users
    const dummyProjects = await prisma.project.findMany({
      where: { ownerId: { in: testUserIds } },
      select: { id: true, name: true },
    });

    const dummyProjectIds = dummyProjects.map((p) => p.id);
    console.log(`Found ${dummyProjects.length} dummy projects to remove:`, dummyProjects.map((p) => p.name));

    if (dummyProjectIds.length > 0) {
      // Delete activities for dummy projects' issues
      const dummyIssues = await prisma.issue.findMany({
        where: { projectId: { in: dummyProjectIds } },
        select: { id: true },
      });
      const dummyIssueIds = dummyIssues.map((i) => i.id);

      if (dummyIssueIds.length > 0) {
        await prisma.activity.deleteMany({ where: { issueId: { in: dummyIssueIds } } });
        await prisma.comment.deleteMany({ where: { issueId: { in: dummyIssueIds } } });
        await prisma.issueLabel.deleteMany({ where: { issueId: { in: dummyIssueIds } } });
        await prisma.issue.deleteMany({ where: { id: { in: dummyIssueIds } } });
      }

      await prisma.label.deleteMany({ where: { projectId: { in: dummyProjectIds } } });
      await prisma.projectMember.deleteMany({ where: { projectId: { in: dummyProjectIds } } });
      await prisma.project.deleteMany({ where: { id: { in: dummyProjectIds } } });
    }

    // Delete any memberships or remaining activities linked to test users
    await prisma.projectMember.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.comment.deleteMany({ where: { authorId: { in: testUserIds } } });
    await prisma.activity.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.issue.updateMany({
      where: { assigneeId: { in: testUserIds } },
      data: { assigneeId: null },
    });

    // Delete test users
    const deleteResult = await prisma.user.deleteMany({
      where: { id: { in: testUserIds } },
    });
    console.log(`Successfully deleted ${deleteResult.count} test users.`);
  }

  // Verify remaining real data
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, provider: true },
  });
  console.log('\n✅ REMAINING REAL USERS IN DATABASE:');
  console.log(JSON.stringify(remainingUsers, null, 2));

  const remainingProjects = await prisma.project.findMany({
    select: { id: true, name: true, key: true, ownerId: true },
  });
  console.log('\n✅ REMAINING REAL PROJECTS IN DATABASE:');
  console.log(JSON.stringify(remainingProjects, null, 2));
}

cleanTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
