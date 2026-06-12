/**
 * Prisma Seed Script
 * BuddyRide - Initial Data
 *
 * Run with: npx ts-node prisma/seed.ts
 * Or via:   npm run prisma:seed
 */

import { PrismaClient, Role, ActiveMode } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main(): Promise<void> {
  console.log('Starting seed...\n');

  // ────────────────────────────────────────────────────────────
  // 1. Admin User
  // ────────────────────────────────────────────────────────────
  const adminPhone = '+919999999999';

  const adminUser = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      name: 'BuddyRide Admin',
      role: Role.admin,
      active_mode: ActiveMode.host,
      is_verified: true,
      is_suspended: false,
    },
    create: {
      name: 'BuddyRide Admin',
      phone: adminPhone,
      email: 'admin@buddyride.com',
      role: Role.admin,
      active_mode: ActiveMode.host,
      is_verified: true,
      is_suspended: false,
    },
  });

  console.log(`Admin user seeded: ${adminUser.id}  (${adminUser.phone})`);

  // ────────────────────────────────────────────────────────────
  // 2. PricingConfig
  // ────────────────────────────────────────────────────────────
  // Only create if no config exists (first run only)
  const existingPricing = await prisma.pricingConfig.findFirst();

  let pricingConfig;
  if (existingPricing) {
    pricingConfig = existingPricing;
    console.log(`PricingConfig already exists (id: ${pricingConfig.id}), skipping creation.`);
  } else {
    pricingConfig = await prisma.pricingConfig.create({
      data: {
        // BuddyRide base rate per km (competitively below aggregators)
        per_km_rate: 6.0,

        // Competitor benchmark rates (for comparison display in app)
        rapido_rate: 7.0,
        auto_rate:   8.0,
        ola_rate:    10.0,
        uber_rate:   12.0,

        updated_by: adminUser.id,
      },
    });
    console.log(`PricingConfig seeded: ${pricingConfig.id}`);
    console.log(`  per_km_rate : ₹${pricingConfig.per_km_rate}/km`);
    console.log(`  rapido_rate : ₹${pricingConfig.rapido_rate}/km`);
    console.log(`  auto_rate   : ₹${pricingConfig.auto_rate}/km`);
    console.log(`  ola_rate    : ₹${pricingConfig.ola_rate}/km`);
    console.log(`  uber_rate   : ₹${pricingConfig.uber_rate}/km`);
  }

  // ────────────────────────────────────────────────────────────
  // 3. Branding Config
  // ────────────────────────────────────────────────────────────
  const existingBranding = await prisma.branding.findFirst();

  let branding;
  if (existingBranding) {
    branding = existingBranding;
    console.log(`Branding already exists (id: ${branding.id}), skipping creation.`);
  } else {
    branding = await prisma.branding.create({
      data: {
        logo_url: 'https://res.cloudinary.com/buddyride/image/upload/v1/branding/logo.png',
        primary_color: '#FF7D00',
        navbar_links: [
          { label: 'Home',       href: '/',           order: 1 },
          { label: 'Rides',      href: '/rides',      order: 2 },
          { label: 'How It Works', href: '/how-it-works', order: 3 },
          { label: 'About',      href: '/about',      order: 4 },
          { label: 'Contact',    href: '/contact',    order: 5 },
        ],
        updated_by: adminUser.id,
      },
    });
    console.log(`Branding config seeded: ${branding.id}`);
    console.log(`  primary_color: ${branding.primary_color}`);
    console.log(`  logo_url     : ${branding.logo_url}`);
  }

  console.log('\nSeed completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
