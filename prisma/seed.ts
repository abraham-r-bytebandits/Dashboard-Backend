import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  ////////////////////////////////////////
  // ROLES
  ////////////////////////////////////////

  const roles = ["SUPER_ADMIN", "ADMIN", "USER"];

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

  ////////////////////////////////////////
  // PERMISSIONS
  ////////////////////////////////////////

  const permissions = [
    // User management
    { code: "user:create", description: "Create new user accounts" },
    { code: "user:read", description: "View user profiles" },
    { code: "user:update", description: "Update user profiles" },
    { code: "user:delete", description: "Delete user accounts" },
    { code: "role:assign", description: "Assign or change user roles" },

    // Expense
    { code: "expense:create", description: "Create expenses" },
    { code: "expense:read", description: "View expenses" },
    { code: "expense:update", description: "Update expenses" },
    { code: "expense:delete", description: "Delete expenses" },
    { code: "expense:pay", description: "Mark expense as paid" },

    // Invoice
    { code: "invoice:create", description: "Create invoices" },
    { code: "invoice:read", description: "View invoices" },
    { code: "invoice:update", description: "Update invoices" },
    { code: "invoice:delete", description: "Delete invoices" },
    { code: "invoice:pay", description: "Record invoice payment" },

    // Client
    { code: "client:create", description: "Create clients" },
    { code: "client:read", description: "View clients" },
    { code: "client:update", description: "Update clients" },
    { code: "client:delete", description: "Delete clients" },

    // Contribution
    { code: "contribution:create", description: "Create contributions" },
    { code: "contribution:read", description: "View contributions" },
    { code: "contribution:update", description: "Update contributions" },
    { code: "contribution:delete", description: "Delete contributions" },

    // Transaction
    { code: "transaction:create", description: "Create transactions" },
    { code: "transaction:read", description: "View transactions" },

    // Report
    { code: "report:create", description: "Generate reports" },
    { code: "report:read", description: "View reports" },
    { code: "report:delete", description: "Delete reports" },

    // Dashboard
    { code: "dashboard:read", description: "View dashboard" },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  console.log("✅ Permissions seeded successfully");

  ////////////////////////////////////////
  // ROLE-PERMISSION MAPPINGS
  ////////////////////////////////////////

  const allPermCodes = permissions.map((p) => p.code);

  const adminPermCodes = allPermCodes.filter(
    (code) =>
      !code.startsWith("user:") &&
      code !== "role:assign" &&
      !code.endsWith(":delete")
  );

  const userPermCodes = allPermCodes.filter(
    (code) => code.endsWith(":read")
  );

  const rolePermMap: Record<string, string[]> = {
    SUPER_ADMIN: allPermCodes,
    ADMIN: adminPermCodes,
    USER: userPermCodes,
  };

  for (const [roleName, permCodes] of Object.entries(rolePermMap)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const code of permCodes) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (!perm) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log("✅ Role-Permission mappings seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });