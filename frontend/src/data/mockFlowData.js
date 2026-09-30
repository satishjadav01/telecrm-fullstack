export const dashboardKpis = [
  { title: 'Daily Calls', value: '2,184', delta: '+12%' },
  { title: 'Follow-ups Completed', value: '1,046', delta: '+9%' },
  { title: 'Connected Rate', value: '64%', delta: '+5%' },
  { title: 'Conversions', value: '123', delta: '+18%' },
]

export const flowSteps = [
  { title: 'Initial Setup', desc: 'Users, roles, permissions, and workspace setup.' },
  { title: 'Lead Import', desc: 'CSV/API/manual lead intake and checks.' },
  { title: 'Lead Assignment', desc: 'Manual, round-robin, and priority queues.' },
  { title: 'Agent Calling', desc: 'Disposition, notes, and recordings from mobile.' },
  { title: 'Follow-up Engine', desc: 'Reminders, overdue queues, and SLA checks.' },
  { title: 'Manager Reporting', desc: 'Conversion funnel and source performance.' },
]

export const leadQueue = [
  {
    lead: 'Arjun Malhotra',
    source: 'Facebook Ads',
    stage: 'Follow-up',
    owner: 'Riya',
    due: 'Today, 5:00 PM',
  },
  {
    lead: 'Sneha Gupta',
    source: 'Referral',
    stage: 'Qualified',
    owner: 'Rahul',
    due: 'Tomorrow, 11:00 AM',
  },
  {
    lead: 'Mahesh Rao',
    source: 'Google Search',
    stage: 'Contacted',
    owner: 'Kavya',
    due: 'Today, 7:30 PM',
  },
  {
    lead: 'Shivani Desai',
    source: 'Website Form',
    stage: 'New',
    owner: 'Rohan',
    due: 'Today, 6:45 PM',
  },
]

export const adminSetupBlocks = [
  {
    title: 'User and Role Setup',
    bullets: ['Admin, Manager, Team Lead, Agent roles', 'RBAC permission matrix'],
  },
  {
    title: 'Lead Masters',
    bullets: ['Lead status pipeline', 'Call dispositions and outcomes'],
  },
  {
    title: 'Workspace Configuration',
    bullets: ['Lead source setup', 'Default assignment strategy'],
  },
  {
    title: 'Recording and Compliance',
    bullets: ['Recording storage policy', 'Consent and restricted access'],
  },
]
