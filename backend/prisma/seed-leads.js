const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/core/utils/crypto');

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Rahul', 'Aarav', 'Aditi', 'Priya', 'Rohit', 'Karan', 'Neha', 'Sneha', 'Vikram', 'Pooja',
  'Ankit', 'Ritu', 'Nikita', 'Mohit', 'Sahil', 'Naman', 'Isha', 'Kavya', 'Aman', 'Deepak',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Gupta', 'Verma', 'Yadav', 'Singh', 'Mehta', 'Joshi', 'Khan', 'Mishra',
  'Das', 'Reddy', 'Saxena', 'Kapoor', 'Jain', 'Nair', 'Pillai', 'Bose', 'Ghosh', 'Chawla',
];

const SOURCES = ['Meta Ads', 'Google Ads', 'Website', 'Referral', 'WhatsApp Campaign', 'Walk-in'];
const STAGES = ['new', 'attempted', 'connected', 'follow_up'];

const pick = (arr, index) => arr[index % arr.length];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const ensureDefaultCompany = async () => {
  const code = process.env.SEED_DEFAULT_COMPANY_CODE || 'default';
  const name = process.env.SEED_DEFAULT_COMPANY_NAME || 'Default Company';

  return prisma.company.upsert({
    where: { code },
    update: { name, isActive: true },
    create: { code, name, isActive: true },
  });
};

const ensureAgentRole = async () => {
  return prisma.role.upsert({
    where: { code: 'agent' },
    update: { name: 'Agent', isActive: true },
    create: { code: 'agent', name: 'Agent', isActive: true },
  });
};

const ensureAgents = async (companyId, count = 3) => {
  const agentRole = await ensureAgentRole();
  const passwordHash = await hashPassword(process.env.SEED_AGENT_PASSWORD || 'Agent@123');

  const agents = [];
  for (let i = 1; i <= count; i += 1) {
    const email = `agent${i}@telecrm.local`;
    const fullName = `Agent ${i}`;
    const phone = `90000000${String(i).padStart(2, '0')}`;

    const agent = await prisma.user.upsert({
      where: { email },
      update: {
        fullName,
        phone,
        roleId: agentRole.id,
        companyId,
        isActive: true,
      },
      create: {
        fullName,
        email,
        phone,
        passwordHash,
        roleId: agentRole.id,
        companyId,
        isActive: true,
      },
      select: { id: true, fullName: true, email: true },
    });

    agents.push(agent);
  }

  return agents;
};

const seedLeads = async () => {
  const target = Math.max(1, Number(process.env.SEED_TEST_LEADS || 40));
  const company = await ensureDefaultCompany();
  const agents = await ensureAgents(company.id, 4);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < target; i += 1) {
    const firstName = pick(FIRST_NAMES, i + randomInt(0, 8));
    const lastName = pick(LAST_NAMES, i + randomInt(0, 8));
    const phonePrimary = `98${String(10000000 + i).padStart(8, '0')}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const stage = pick(STAGES, i);
    const source = pick(SOURCES, i + 2);
    const priority = randomInt(1, 5);
    const assignedTo = agents[i % agents.length].id;

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - randomInt(0, 10));
    createdAt.setHours(randomInt(9, 20), randomInt(0, 59), 0, 0);

    const exists = await prisma.lead.findFirst({
      where: { companyId: company.id, phonePrimary, isActive: true },
      select: { id: true },
    });

    if (exists) {
      skipped += 1;
      continue;
    }

    await prisma.lead.create({
      data: {
        companyId: company.id,
        firstName,
        lastName,
        phonePrimary,
        email,
        source,
        city: i % 2 ? 'Mumbai' : 'Pune',
        stage,
        priority,
        notes: `Seed test lead ${i + 1}. Interested in demo.`,
        assignedTo,
        createdAt,
      },
    });

    created += 1;
  }

  console.log(`Seed leads completed. Company=${company.code}, Created=${created}, Skipped=${skipped}, Agents=${agents.length}`);
};

seedLeads()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

