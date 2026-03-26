import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  ////////////////////////////////////////
  // ROLES
  ////////////////////////////////////////

  const roles = ["ADMIN", "USER"];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: {
        name: role,
        description: `${role} role`,
      },
    });
  }

  console.log("✅ Roles seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });