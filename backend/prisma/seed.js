const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/core/utils/crypto');

const prisma = new PrismaClient();

const hasFlag = (flag) => process.argv.includes(flag);
const MODE_SUPER_ADMIN_ONLY = hasFlag('--super-admin-only') || hasFlag('--minimal');
const MODE_CLEANUP = hasFlag('--cleanup');

const cleanupDatabaseKeepSuperAdmin = async () => {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@telecrm.local';
  const superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail }, select: { id: true } });

  await prisma.$transaction([
    prisma.aiCallInsight.deleteMany({}),
    prisma.callTranscript.deleteMany({}),
    prisma.callRecording.deleteMany({}),
    prisma.followUp.deleteMany({}),
    prisma.call.deleteMany({}),
    prisma.leadActivity.deleteMany({}),
    prisma.leadCustomField.deleteMany({}),
    prisma.lead.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.auditLog.deleteMany({}),
    prisma.user.deleteMany({
      where: superAdmin?.id ? { id: { not: superAdmin.id } } : {},
    }),
    prisma.company.deleteMany({}),
  ]);
};

const seed = async () => {
  if (MODE_CLEANUP) {
    await cleanupDatabaseKeepSuperAdmin();
  }

  const roles = [
    { code: 'super_admin', name: 'Super Admin' },
    { code: 'admin', name: 'Admin' },
    { code: 'manager', name: 'Manager' },
    { code: 'team_lead', name: 'Team Lead' },
    { code: 'agent', name: 'Agent' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, isActive: true },
      create: { code: role.code, name: role.name },
    });
  }

  const permissions = [
    { code: 'users.read', name: 'Read Users' },
    { code: 'users.write', name: 'Write Users' },
    { code: 'leads.read', name: 'Read Leads' },
    { code: 'leads.write', name: 'Write Leads' },
    { code: 'calls.write', name: 'Write Calls' },
    { code: 'reports.read', name: 'Read Reports' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: permission,
    });
  }

  const adminRole = await prisma.role.findFirst({ where: { code: 'admin' } });
  const allPermissions = await prisma.permission.findMany({ select: { id: true } });

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const superAdminRole = await prisma.role.findFirst({ where: { code: 'super_admin' } });
  const superAdminPassword = await hashPassword(process.env.SEED_SUPER_ADMIN_PASSWORD || 'SuperAdmin@123');

  await prisma.user.upsert({
    where: { email: process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@telecrm.local' },
    update: {
      fullName: 'Super Admin',
      roleId: superAdminRole.id,
      companyId: null,
      passwordHash: superAdminPassword,
      isActive: true,
    },
    create: {
      fullName: 'Super Admin',
      email: process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@telecrm.local',
      passwordHash: superAdminPassword,
      roleId: superAdminRole.id,
      companyId: null,
      isActive: true,
    },
  });

  if (!MODE_SUPER_ADMIN_ONLY) {
    const defaultCompanyCode = process.env.SEED_DEFAULT_COMPANY_CODE || 'default';
    const defaultCompanyName = process.env.SEED_DEFAULT_COMPANY_NAME || 'Default Company';

    const defaultCompany = await prisma.company.upsert({
      where: { code: defaultCompanyCode },
      update: { name: defaultCompanyName, isActive: true },
      create: { code: defaultCompanyCode, name: defaultCompanyName },
    });

    const adminPassword = await hashPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin@123');

    await prisma.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL || 'admin@telecrm.local' },
      update: {
        fullName: 'System Admin',
        roleId: adminRole.id,
        companyId: defaultCompany.id,
        passwordHash: adminPassword,
        isActive: true,
      },
      create: {
        fullName: 'System Admin',
        email: process.env.SEED_ADMIN_EMAIL || 'admin@telecrm.local',
        passwordHash: adminPassword,
        roleId: adminRole.id,
        companyId: defaultCompany.id,
        isActive: true,
      },
    });

    // Backfill companyId for existing data (single-company installs).
    await prisma.user.updateMany({
      where: {
        companyId: null,
        role: { code: { not: 'super_admin' } },
      },
      data: { companyId: defaultCompany.id },
    });
    await prisma.lead.updateMany({ where: { companyId: null }, data: { companyId: defaultCompany.id } });
    await prisma.call.updateMany({ where: { companyId: null }, data: { companyId: defaultCompany.id } });
    await prisma.callRecording.updateMany({ where: { companyId: null }, data: { companyId: defaultCompany.id } });
    await prisma.followUp.updateMany({ where: { companyId: null }, data: { companyId: defaultCompany.id } });
  }

  console.log('Seed completed');
};

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
