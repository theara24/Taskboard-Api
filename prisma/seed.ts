import { PrismaClient, Role, ProjectMemberRole, IssueType, IssueStatus, IssuePriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TaskBoard database seeding...');

  // 1. Clean existing database data in reverse relation order
  console.log('Cleaning existing records...');
  await prisma.activity.deleteMany();
  await prisma.issueLabel.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.label.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default password
  const passwordSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', passwordSalt);
  const userPasswordHash = await bcrypt.hash('User123!', passwordSalt);

  // 3. Create Users
  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Admin)',
      email: 'admin@taskboard.io',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  console.log(`Users created: ${admin.email}, ${alice.email}, ${bob.email}, ${charlie.email}`);

  // 4. Create Project 1: TaskBoard Web (WEB)
  console.log('Creating projects...');
  const webProject = await prisma.project.create({
    data: {
      name: 'TaskBoard Web Platform',
      key: 'WEB',
      description: 'Single-page web client and public API for TaskBoard.',
      ownerId: alice.id,
      issueCounter: 3,
    },
  });

  // Add members to WEB project
  await prisma.projectMember.createMany({
    data: [
      { projectId: webProject.id, userId: alice.id, role: ProjectMemberRole.OWNER },
      { projectId: webProject.id, userId: bob.id, role: ProjectMemberRole.MEMBER },
      { projectId: webProject.id, userId: charlie.id, role: ProjectMemberRole.MEMBER },
    ],
  });

  // Create Project 2: Mobile App (MOB)
  const mobileProject = await prisma.project.create({
    data: {
      name: 'TaskBoard Mobile App',
      key: 'MOB',
      description: 'iOS and Android companion apps for mobile productivity.',
      ownerId: bob.id,
      issueCounter: 2,
    },
  });

  // Add members to MOB project
  await prisma.projectMember.createMany({
    data: [
      { projectId: mobileProject.id, userId: bob.id, role: ProjectMemberRole.OWNER },
      { projectId: mobileProject.id, userId: alice.id, role: ProjectMemberRole.MEMBER },
    ],
  });

  // 5. Create Labels
  console.log('Creating project labels...');
  const labelBackend = await prisma.label.create({
    data: { name: 'backend', projectId: webProject.id },
  });
  const labelFrontend = await prisma.label.create({
    data: { name: 'frontend', projectId: webProject.id },
  });
  const labelBug = await prisma.label.create({
    data: { name: 'bugfix', projectId: webProject.id },
  });
  const labelSecurity = await prisma.label.create({
    data: { name: 'security', projectId: webProject.id },
  });

  const labelMobileUi = await prisma.label.create({
    data: { name: 'mobile-ui', projectId: mobileProject.id },
  });

  // 6. Create Issues in Project WEB
  console.log('Creating issues and activities...');
  const issue1 = await prisma.issue.create({
    data: {
      issueKey: 'WEB-1',
      title: 'Implement JWT Authentication & Refresh Tokens',
      description: 'Design secure stateless authentication with standard bearer tokens and role-based permissions.',
      type: IssueType.FEATURE,
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      projectId: webProject.id,
      reporterId: alice.id,
      assigneeId: bob.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      labels: {
        create: [{ labelId: labelBackend.id }, { labelId: labelSecurity.id }],
      },
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        issueId: issue1.id,
        userId: alice.id,
        action: 'ISSUE_CREATED',
        newValue: 'Issue WEB-1 created as FEATURE with HIGH priority',
      },
      {
        issueId: issue1.id,
        userId: bob.id,
        action: 'STATUS_CHANGED',
        oldValue: 'IN_PROGRESS',
        newValue: 'DONE',
      },
    ],
  });

  const issue2 = await prisma.issue.create({
    data: {
      issueKey: 'WEB-2',
      title: 'Fix issue filtering query pagination offset bug',
      description: 'When page number exceeds total records, API should return empty array instead of 500 error.',
      type: IssueType.BUG,
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.CRITICAL,
      projectId: webProject.id,
      reporterId: charlie.id,
      assigneeId: alice.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      labels: {
        create: [{ labelId: labelBackend.id }, { labelId: labelBug.id }],
      },
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        issueId: issue2.id,
        userId: charlie.id,
        action: 'ISSUE_CREATED',
        newValue: 'Issue WEB-2 created as BUG with CRITICAL priority',
      },
      {
        issueId: issue2.id,
        userId: alice.id,
        action: 'STATUS_CHANGED',
        oldValue: 'TODO',
        newValue: 'IN_PROGRESS',
      },
    ],
  });

  const issue3 = await prisma.issue.create({
    data: {
      issueKey: 'WEB-3',
      title: 'Design Kanban board drag and drop state machine',
      description: 'Provide optimistic updates and issue column reordering REST contracts.',
      type: IssueType.TASK,
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      projectId: webProject.id,
      reporterId: alice.id,
      assigneeId: charlie.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      labels: {
        create: [{ labelId: labelFrontend.id }],
      },
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue3.id,
      userId: alice.id,
      action: 'ISSUE_CREATED',
      newValue: 'Issue WEB-3 created as TASK with MEDIUM priority',
    },
  });

  // Create Issues in Project MOB
  const issueMob1 = await prisma.issue.create({
    data: {
      issueKey: 'MOB-1',
      title: 'Push notification setup for issue assignment alerts',
      description: 'Integrate Firebase Cloud Messaging (FCM) to alert developers when assigned an issue.',
      type: IssueType.FEATURE,
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      projectId: mobileProject.id,
      reporterId: bob.id,
      assigneeId: bob.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      labels: {
        create: [{ labelId: labelMobileUi.id }],
      },
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issueMob1.id,
      userId: bob.id,
      action: 'ISSUE_CREATED',
      newValue: 'Issue MOB-1 created as FEATURE with HIGH priority',
    },
  });

  const issueMob2 = await prisma.issue.create({
    data: {
      issueKey: 'MOB-2',
      title: 'Offline mode caching for issue cards',
      description: 'Use local SQLite/AsyncStorage to cache issue list when connectivity is lost.',
      type: IssueType.TASK,
      status: IssueStatus.BACKLOG,
      priority: IssuePriority.LOW,
      projectId: mobileProject.id,
      reporterId: bob.id,
      assigneeId: alice.id,
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issueMob2.id,
      userId: bob.id,
      action: 'ISSUE_CREATED',
      newValue: 'Issue MOB-2 created as TASK with LOW priority',
    },
  });

  // 7. Create Comments
  console.log('Adding comments...');
  await prisma.comment.create({
    data: {
      content: 'JWT authentication implementation looks clean. All unit tests passing!',
      issueId: issue1.id,
      authorId: alice.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Verified fix on staging environment, ready for production rollout.',
      issueId: issue1.id,
      authorId: bob.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'I have reproduced the pagination offset edge case and writing a regression test.',
      issueId: issue2.id,
      authorId: alice.id,
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('  Admin User:  admin@taskboard.io / Admin123!');
  console.log('  Normal User: alice@example.com  / User123!');
  console.log('  Normal User: bob@example.com    / User123!');
  console.log('  Normal User: charlie@example.com/ User123!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
