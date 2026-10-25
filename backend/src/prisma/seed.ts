import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // Seed default demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.ai' },
    update: {},
    create: {
      email: 'demo@reachinbox.ai',
      name: 'Alex Morgan',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  // Seed default senders
  const senders = [
    {
      name: 'Alex Morgan (ReachInbox Growth)',
      email: 'alex@reachinbox.ai',
      isDefault: true,
      hourlyLimit: 100,
    },
    {
      name: 'Sarah Connor (Outbound Outbox)',
      email: 'sarah@growthoutbox.io',
      isDefault: false,
      hourlyLimit: 50,
    },
    {
      name: 'Outbox Automation Bot',
      email: 'automation@outboxlabs.com',
      isDefault: false,
      hourlyLimit: 200,
    },
  ];

  for (const s of senders) {
    await prisma.sender.upsert({
      where: { email: s.email },
      update: { name: s.name, isDefault: s.isDefault, hourlyLimit: s.hourlyLimit },
      create: s,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
