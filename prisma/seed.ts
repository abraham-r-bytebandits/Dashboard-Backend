import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up old database records...");

  // Delete in reverse foreign key order
  await prisma.activityAuditLog.deleteMany();
  await prisma.authAuditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.invoicePayment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.report.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.site.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.authProvider.deleteMany();
  await prisma.session.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.accountRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.functionalRole.deleteMany();
  await prisma.client.deleteMany();
  await prisma.account.deleteMany();

  console.log("✅ Database clean complete.");

  ////////////////////////////////////////
  // 1. ROLES
  ////////////////////////////////////////
  console.log("🌱 Seeding canonical roles...");
  const roleDefs = [
    { name: "ADMIN", description: "Universal System Administrator" },
    { name: "MANAGER", description: "Team / Department Manager with dynamic page permissions" },
    { name: "INTERNAL_USER", description: "Internal Employee / Staff" },
    { name: "EXTERNAL_USER", description: "External Partner / Contractor" },
    { name: "SUPER_ADMIN", description: "Legacy Super Admin alias" },
    { name: "USER", description: "Standard User alias" },
  ];

  const roleMap: Record<string, bigint> = {};
  for (const r of roleDefs) {
    const created = await prisma.role.create({
      data: r,
    });
    roleMap[r.name] = created.id;
  }

  ////////////////////////////////////////
  // 2. FUNCTIONAL ROLES
  ////////////////////////////////////////
  console.log("🌱 Seeding functional roles...");
  const functionalRoleDefs = [
    { name: "Developer", description: "Software development and engineering", color: "indigo" },
    { name: "Marketing", description: "Marketing campaigns and user growth", color: "pink" },
    { name: "Design", description: "UI/UX and brand design", color: "amber" },
    { name: "Product", description: "Product management and requirements", color: "violet" },
    { name: "QA", description: "Quality assurance and testing", color: "teal" },
    { name: "Operations", description: "Business operations and support", color: "gray" },
  ];

  for (const fr of functionalRoleDefs) {
    await prisma.functionalRole.create({
      data: {
        publicId: crypto.randomUUID(),
        ...fr,
      },
    });
  }

  ////////////////////////////////////////
  // 3. PERMISSIONS
  ////////////////////////////////////////
  console.log("🌱 Seeding permissions...");
  const permissions = [
    { code: "user:create", description: "Create new user accounts" },
    { code: "user:read", description: "View user profiles and directories" },
    { code: "user:update", description: "Update user profiles and permissions" },
    { code: "user:delete", description: "Delete user accounts" },
    { code: "role:assign", description: "Assign or change user roles" },

    { code: "work:create", description: "Create work assessments and tasks" },
    { code: "work:read", description: "View work assessments and boards" },
    { code: "work:update", description: "Update work tasks, status, milestones" },
    { code: "work:delete", description: "Delete work items" },
    { code: "work:priority", description: "Update work priority on impact board" },

    { code: "expense:create", description: "Create expenses" },
    { code: "expense:read", description: "View expenses" },
    { code: "expense:update", description: "Update expenses" },
    { code: "expense:delete", description: "Delete expenses" },
    { code: "expense:pay", description: "Mark expense as paid" },

    { code: "invoice:create", description: "Create invoices" },
    { code: "invoice:read", description: "View invoices" },
    { code: "invoice:update", description: "Update invoices" },
    { code: "invoice:delete", description: "Delete invoices" },
    { code: "invoice:pay", description: "Record invoice payment" },

    { code: "client:create", description: "Create clients" },
    { code: "client:read", description: "View clients" },
    { code: "client:update", description: "Update clients" },
    { code: "client:delete", description: "Delete clients" },

    { code: "contribution:create", description: "Create contributions" },
    { code: "contribution:read", description: "View contributions" },
    { code: "contribution:update", description: "Update contributions" },
    { code: "contribution:delete", description: "Delete contributions" },

    { code: "transaction:create", description: "Create transactions" },
    { code: "transaction:read", description: "View transactions" },

    { code: "report:create", description: "Generate reports" },
    { code: "report:read", description: "View reports" },
    { code: "report:delete", description: "Delete reports" },

    { code: "site:create", description: "Create site credential entries" },
    { code: "site:read", description: "View site credential entries" },
    { code: "site:update", description: "Update site credentials" },
    { code: "site:delete", description: "Delete site credentials" },

    { code: "contact:read", description: "View contact messages" },
    { code: "contact:update", description: "Update contact message status" },
    { code: "contact:delete", description: "Delete contact messages" },

    { code: "dashboard:read", description: "View executive financial dashboard" },
  ];

  const permMap: Record<string, bigint> = {};
  for (const perm of permissions) {
    const created = await prisma.permission.create({
      data: perm,
    });
    permMap[perm.code] = created.id;
  }

  // Map permissions to roles
  const allPermIds = Object.values(permMap);
  const managerPermCodes = [
    "dashboard:read",
    "work:create", "work:read", "work:update", "work:priority",
    "client:read", "client:create",
    "invoice:read", "invoice:create",
    "contact:read",
    "user:read"
  ];
  const userPermCodes = [
    "work:read", "work:update"
  ];

  // Admin & Super Admin get everything
  for (const rName of ["ADMIN", "SUPER_ADMIN"]) {
    const rId = roleMap[rName];
    for (const pId of allPermIds) {
      await prisma.rolePermission.create({
        data: { roleId: rId, permissionId: pId },
      });
    }
  }

  // Manager permissions
  for (const code of managerPermCodes) {
    if (permMap[code]) {
      await prisma.rolePermission.create({
        data: { roleId: roleMap["MANAGER"], permissionId: permMap[code] },
      });
    }
  }

  // User & Internal/External permissions
  for (const rName of ["INTERNAL_USER", "EXTERNAL_USER", "USER"]) {
    for (const code of userPermCodes) {
      if (permMap[code]) {
        await prisma.rolePermission.create({
          data: { roleId: roleMap[rName], permissionId: permMap[code] },
        });
      }
    }
  }

  console.log("✅ Role-Permission mappings seeded.");

  ////////////////////////////////////////
  // 4. SEED USERS & HIERARCHY
  ////////////////////////////////////////
  console.log("🌱 Seeding realistic user accounts & hierarchy...");
  const defaultPassword = "Password@123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Helper to create account
  async function createAccount(params: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
    functionalRole?: string;
    affiliation?: "internal" | "external";
    managerPublicId?: string;
    accessiblePages?: string[];
  }) {
    const publicId = crypto.randomUUID();
    const account = await prisma.account.create({
      data: {
        publicId,
        email: params.email,
        username: params.username,
        status: "ACTIVE",
        isEmailVerified: true,
        managerPublicId: params.managerPublicId || null,
        accessiblePages: params.accessiblePages ? params.accessiblePages : undefined,
        credential: {
          create: {
            passwordHash,
          },
        },
        profile: {
          create: {
            firstName: params.firstName,
            lastName: params.lastName,
            phone: params.phone || "9876543210",
            functionalRole: params.functionalRole || null,
            affiliation: params.affiliation || "internal",
          },
        },
      },
    });

    const roleId = roleMap[params.role];
    if (roleId) {
      await prisma.accountRole.create({
        data: {
          accountPublicId: publicId,
          roleId,
        },
      });
    }

    return account;
  }

  // A. Admin accounts
  const masterAdmin = await createAccount({
    email: "admin@bytebandits.com",
    username: "admin",
    firstName: "Master",
    lastName: "Admin",
    phone: "9876543210",
    role: "ADMIN",
    affiliation: "internal",
    accessiblePages: ["*"],
  });

  await createAccount({
    email: "abrahambillclinton@gmail.com",
    username: "abraham",
    firstName: "Abraham",
    lastName: "Clinton",
    phone: "9876543211",
    role: "ADMIN",
    affiliation: "internal",
    accessiblePages: ["*"],
  });

  // B. Managers
  const alexManager = await createAccount({
    email: "alex.manager@bytebandits.com",
    username: "alex.manager",
    firstName: "Alex",
    lastName: "Morgan",
    phone: "9876543212",
    role: "MANAGER",
    functionalRole: "Operations",
    affiliation: "internal",
    accessiblePages: [
      "dashboard",
      "status-board",
      "impact-board",
      "create-assessment",
      "invoices",
    ],
  });

  const sarahManager = await createAccount({
    email: "sarah.manager@bytebandits.com",
    username: "sarah.manager",
    firstName: "Sarah",
    lastName: "Jenkins",
    phone: "9876543213",
    role: "MANAGER",
    functionalRole: "Operations",
    affiliation: "internal",
    accessiblePages: [
      "dashboard",
      "status-board",
      "impact-board",
      "create-assessment",
      "clients",
      "contact-messages",
    ],
  });

  // C. Internal Staff (Reporting to Managers)
  const priyaDev = await createAccount({
    email: "priya.dev@bytebandits.com",
    username: "priya.dev",
    firstName: "Priya",
    lastName: "Patel",
    phone: "9876543214",
    role: "INTERNAL_USER",
    functionalRole: "Developer",
    affiliation: "internal",
    managerPublicId: alexManager.publicId,
  });

  const davidProduct = await createAccount({
    email: "david.product@bytebandits.com",
    username: "david.product",
    firstName: "David",
    lastName: "Kim",
    phone: "9876543215",
    role: "INTERNAL_USER",
    functionalRole: "Product",
    affiliation: "internal",
    managerPublicId: alexManager.publicId,
  });

  const sophieMarketing = await createAccount({
    email: "sophie.marketing@bytebandits.com",
    username: "sophie.marketing",
    firstName: "Sophie",
    lastName: "Taylor",
    phone: "9876543216",
    role: "INTERNAL_USER",
    functionalRole: "Marketing",
    affiliation: "internal",
    managerPublicId: sarahManager.publicId,
  });

  const elenaDesign = await createAccount({
    email: "elena.design@bytebandits.com",
    username: "elena.design",
    firstName: "Elena",
    lastName: "Rostova",
    phone: "9876543217",
    role: "INTERNAL_USER",
    functionalRole: "Design",
    affiliation: "internal",
    managerPublicId: sarahManager.publicId,
  });

  // D. External Collaborators (Reporting to Managers)
  const liamQa = await createAccount({
    email: "liam.qa@externalvendor.com",
    username: "liam.qa",
    firstName: "Liam",
    lastName: "OConnor",
    phone: "9876543218",
    role: "EXTERNAL_USER",
    functionalRole: "QA",
    affiliation: "external",
    managerPublicId: alexManager.publicId,
  });

  const marcusAgency = await createAccount({
    email: "marcus.agency@externalpartners.com",
    username: "marcus.agency",
    firstName: "Marcus",
    lastName: "Vance",
    phone: "9876543219",
    role: "EXTERNAL_USER",
    functionalRole: "Marketing",
    affiliation: "external",
    managerPublicId: sarahManager.publicId,
  });

  console.log("✅ Users and reporting relationships created.");

  ////////////////////////////////////////
  // 5. SEED CLIENTS
  ////////////////////////////////////////
  console.log("🌱 Seeding realistic clients...");
  const clientAlpha = await prisma.client.create({
    data: {
      publicId: crypto.randomUUID(),
      name: "Acme Cloud Technologies",
      email: "billing@acmecloud.io",
      phone: "+1 (555) 234-5678",
      companyName: "Acme Corp Ltd.",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94107",
      createdByPublicId: masterAdmin.publicId,
    },
  });

  const clientBeta = await prisma.client.create({
    data: {
      publicId: crypto.randomUUID(),
      name: "Nexus Fintech Solutions",
      email: "accounts@nexusfintech.com",
      phone: "+1 (555) 876-5432",
      companyName: "Nexus Global",
      city: "New York",
      state: "NY",
      country: "USA",
      postalCode: "10001",
      createdByPublicId: masterAdmin.publicId,
    },
  });

  ////////////////////////////////////////
  // 6. SEED INVOICES
  ////////////////////////////////////////
  console.log("🌱 Seeding invoices & payments...");
  await prisma.invoice.create({
    data: {
      publicId: crypto.randomUUID(),
      invoiceNumber: "INV-2026-001",
      issuedDate: new Date("2026-02-01"),
      dueDate: new Date("2026-03-01"),
      status: "PAID",
      subtotal: 12500.0,
      taxAmount: 1250.0,
      totalAmount: 13750.0,
      receivedAmount: 13750.0,
      balanceDue: 0.0,
      createdByPublicId: masterAdmin.publicId,
      clients: {
        create: [{ clientId: clientAlpha.id }],
      },
      items: {
        create: [
          {
            itemName: "Cloud Architecture Audit",
            description: "Quarterly Cloud Architecture & Security Audit",
            quantity: 1,
            unitPrice: 12500.0,
            taxPercent: 10.0,
            total: 13750.0,
          },
        ],
      },
      payments: {
        create: [
          {
            publicId: crypto.randomUUID(),
            amount: 13750.0,
            paymentMethod: "BANK_TRANSFER",
            referenceNo: "WIRE-8947291",
            paidAt: new Date("2026-02-15"),
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      publicId: crypto.randomUUID(),
      invoiceNumber: "INV-2026-002",
      issuedDate: new Date("2026-03-01"),
      dueDate: new Date("2026-04-01"),
      status: "PENDING",
      subtotal: 8200.0,
      taxAmount: 820.0,
      totalAmount: 9020.0,
      receivedAmount: 0.0,
      balanceDue: 9020.0,
      createdByPublicId: masterAdmin.publicId,
      clients: {
        create: [{ clientId: clientBeta.id }],
      },
      items: {
        create: [
          {
            itemName: "Fintech API Integration",
            description: "Fintech Dashboard API Integration",
            quantity: 1,
            unitPrice: 8200.0,
            taxPercent: 10.0,
            total: 9020.0,
          },
        ],
      },
    },
  });

  ////////////////////////////////////////
  // 7. SEED EXPENSES
  ////////////////////////////////////////
  console.log("🌱 Seeding realistic expenses...");
  await prisma.expense.create({
    data: {
      publicId: crypto.randomUUID(),
      expenseId: "#FIX001",
      expenseType: "FIXED",
      title: "AWS Cloud Infrastructure",
      category: "technology",
      amount: 1450.0,
      expenseDate: new Date("2026-03-01"),
      status: "PAID",
      recurring: true,
      frequency: "monthly",
      vendorName: "Amazon Web Services",
      paymentMethod: "CARD",
      createdByPublicId: masterAdmin.publicId,
    },
  });

  await prisma.expense.create({
    data: {
      publicId: crypto.randomUUID(),
      expenseId: "#OPE001",
      expenseType: "OPERATIONAL",
      title: "Engineering Team Sprints & Tooling",
      category: "salaries",
      amount: 4800.0,
      expenseDate: new Date("2026-03-05"),
      status: "PAID",
      vendorName: "ByteBandits Payroll",
      paymentMethod: "BANK_TRANSFER",
      createdByPublicId: masterAdmin.publicId,
    },
  });

  ////////////////////////////////////////
  // 8. SEED WORK ITEMS (Real, Scoped to Teams)
  ////////////////////////////////////////
  console.log("🌱 Seeding realistic work items scoped to managers...");

  // Task 1: Engineering Team Task (Managed by Alex)
  await prisma.workItem.create({
    data: {
      publicId: crypto.randomUUID(),
      customId: "ASSESS-ENG-001",
      isMainCompleted: false,
      subtasks: [
        {
          id: "sub-eng-1",
          title: "Implement Stripe Webhook Signature Verification",
          description: "<p>Implement HMAC SHA-256 signature verification and anti-replay attack timestamp checks.</p>",
          isCompleted: true,
          createdAt: new Date("2026-03-20").toISOString(),
        },
        {
          id: "sub-eng-2",
          title: "Configure Multi-Currency Fallback Gateway",
          description: "<p>Set up automatic provider rollover with exponential backoff on payment gateway 5xx timeouts.</p>",
          isCompleted: true,
          createdAt: new Date("2026-03-22").toISOString(),
        },
        {
          id: "sub-eng-3",
          title: "Automated Ledger Reconciliation Tests",
          description: "<p>Run parity tests between local database transaction ledgers and third-party settlement reports.</p>",
          isCompleted: false,
          createdAt: new Date("2026-03-25").toISOString(),
        },
      ],
      title: "Stripe & Crypto Payment Gateway Redundancy",
      description: "Implement redundant payment failover webhooks and multi-currency ledger reconciliation for checkout flows.",
      priority: "high",
      status: "under_analysis",
      dueDate: new Date("2026-04-15"),
      milestoneCompleted: 3,
      milestoneTotal: 5,
      attachmentsCount: 1,
      attachments: [
        {
          id: "att-1",
          name: "Payment_Failover_Architecture.pdf",
          size: 2458000,
          type: "application/pdf",
          url: "/uploads/work-items/spec-1.pdf",
          uploadedAt: new Date().toISOString(),
        },
      ],
      assignees: [
        {
          id: priyaDev.publicId,
          name: "Priya Patel",
          email: priyaDev.email,
          role: "Developer",
          affiliation: "internal",
        },
        {
          id: liamQa.publicId,
          name: "Liam OConnor",
          email: liamQa.email,
          role: "QA",
          affiliation: "external",
        },
      ],
      commentsCount: 4,
      managerPublicId: alexManager.publicId,
      createdByPublicId: alexManager.publicId,
    },
  });

  // Task 2: Engineering Task (Product Spec)
  await prisma.workItem.create({
    data: {
      publicId: crypto.randomUUID(),
      customId: "ASSESS-ENG-002",
      isMainCompleted: false,
      subtasks: [
        {
          id: "sub-eng-4",
          title: "Mobile Navigation Breakpoints & Drawer UX",
          description: "<p>Adopt responsive sliding drawer and touch target spacing for viewports under 768px.</p>",
          isCompleted: true,
          createdAt: new Date("2026-03-21").toISOString(),
        },
        {
          id: "sub-eng-5",
          title: "High-DPI Chart Canvas Scaling",
          description: "<p>Ensure Chart.js and SVG graphs render crisply on Retina and mobile AMOLED displays.</p>",
          isCompleted: false,
          createdAt: new Date("2026-03-23").toISOString(),
        },
      ],
      title: "Mobile Dashboard Responsive Redesign",
      description: "Optimize financial charts and transaction breakdowns for mobile touch screens and tablet viewports.",
      priority: "medium",
      status: "todo",
      dueDate: new Date("2026-04-20"),
      milestoneCompleted: 1,
      milestoneTotal: 4,
      attachmentsCount: 0,
      attachments: [],
      assignees: [
        {
          id: davidProduct.publicId,
          name: "David Kim",
          email: davidProduct.email,
          role: "Product",
          affiliation: "internal",
        },
        {
          id: priyaDev.publicId,
          name: "Priya Patel",
          email: priyaDev.email,
          role: "Developer",
          affiliation: "internal",
        },
      ],
      commentsCount: 2,
      managerPublicId: alexManager.publicId,
      createdByPublicId: alexManager.publicId,
    },
  });

  // Task 3: Marketing Team Task (Managed by Sarah)
  await prisma.workItem.create({
    data: {
      publicId: crypto.randomUUID(),
      customId: "ASSESS-MKT-001",
      isMainCompleted: false,
      subtasks: [
        {
          id: "sub-mkt-1",
          title: "Ad Copywriting & CFO Value Proposition",
          description: "<p>Draft targeted messaging highlighting operational efficiency, cost reduction, and compliance governance.</p>",
          isCompleted: false,
          createdAt: new Date("2026-03-24").toISOString(),
        },
        {
          id: "sub-mkt-2",
          title: "Landing Page Conversion Funnel Analytics",
          description: "<p>Configure UTM tracking parameters, heatmaps, and conversion goal funnels.</p>",
          isCompleted: false,
          createdAt: new Date("2026-03-25").toISOString(),
        },
      ],
      title: "Q2 Enterprise Lead Generation & Ad Campaign",
      description: "Launch targeted search and social campaign targeting CFOs and operations executives for corporate dashboard tier.",
      priority: "high",
      status: "clarifications",
      dueDate: new Date("2026-04-10"),
      milestoneCompleted: 2,
      milestoneTotal: 4,
      attachmentsCount: 0,
      attachments: [],
      assignees: [
        {
          id: sophieMarketing.publicId,
          name: "Sophie Taylor",
          email: sophieMarketing.email,
          role: "Marketing",
          affiliation: "internal",
        },
        {
          id: marcusAgency.publicId,
          name: "Marcus Vance",
          email: marcusAgency.email,
          role: "Marketing",
          affiliation: "external",
        },
      ],
      commentsCount: 5,
      managerPublicId: sarahManager.publicId,
      createdByPublicId: sarahManager.publicId,
    },
  });

  // Task 4: Design & Brand System Task (Managed by Sarah)
  await prisma.workItem.create({
    data: {
      publicId: crypto.randomUUID(),
      customId: "ASSESS-MKT-002",
      isMainCompleted: true,
      subtasks: [
        {
          id: "sub-mkt-3",
          title: "Color Palette & Token Harmony Review",
          description: "<p>Audit WCAG AAA contrast ratios across light and dark system themes.</p>",
          isCompleted: true,
          createdAt: new Date("2026-03-18").toISOString(),
        },
        {
          id: "sub-mkt-4",
          title: "Iconography & Asset Export Packaging",
          description: "<p>Export unified SVG icon sets and shared Figma component library.</p>",
          isCompleted: true,
          createdAt: new Date("2026-03-19").toISOString(),
        },
      ],
      title: "Brand Style Guide & Component Tokens v2",
      description: "Unify color palette tokens, accessible typography contrast ratios, and iconography across marketing site.",
      priority: "low",
      status: "approval",
      dueDate: new Date("2026-03-30"),
      milestoneCompleted: 4,
      milestoneTotal: 4,
      attachmentsCount: 0,
      attachments: [],
      assignees: [
        {
          id: elenaDesign.publicId,
          name: "Elena Rostova",
          email: elenaDesign.email,
          role: "Design",
          affiliation: "internal",
        },
      ],
      commentsCount: 1,
      managerPublicId: sarahManager.publicId,
      createdByPublicId: sarahManager.publicId,
    },
  });

  ////////////////////////////////////////
  // 9. SEED CONTACT MESSAGES
  ////////////////////////////////////////
  console.log("🌱 Seeding contact messages...");
  await prisma.contact.create({
    data: {
      publicId: crypto.randomUUID(),
      name: "Marcus Aurelius",
      email: "m.aurelius@rome-enterprises.com",
      phone: "+1 555-123-4567",
      website: "https://rome-enterprises.com",
      message: "Interested in deploying your financial dashboard for our 12 subsidiary companies. Would love a demonstration.",
      consent: true,
      source: "Website Contact Form",
    },
  });

  console.log("🎉 Seeding completed successfully!");
  console.log("==========================================");
  console.log("Master Admin: admin@bytebandits.com (Password@123)");
  console.log("Abraham Admin: abrahambillclinton@gmail.com (Password@123)");
  console.log("Eng Manager: alex.manager@bytebandits.com (Password@123)");
  console.log("Mkt Manager: sarah.manager@bytebandits.com (Password@123)");
  console.log("Dev: priya.dev@bytebandits.com (Password@123)");
  console.log("QA External: liam.qa@externalvendor.com (Password@123)");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
