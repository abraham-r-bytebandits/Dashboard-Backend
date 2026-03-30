# ZIA Herbal Pro — Financial Dashboard API Documentation

**Base URL:** `http://localhost:4000/api`  
**Authentication:** Bearer Token (JWT)  
**Database:** MySQL via Prisma ORM

---

## Role-Based Access Control (RBAC)

| Role | Create | Read | Update | Delete | Manage Users |
|------|:------:|:----:|:------:|:------:|:------------:|
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **USER** | ❌ | ✅ | ❌ | ❌ | ❌ |

> SUPER_ADMIN implicitly passes all authorization checks.  
> No public signup — only SUPER_ADMIN creates accounts.  
> Google Auth is login-only (no account creation).

---

## 🔐 Auth Module

### POST `/auth/login`
Login with email & password. Returns JWT tokens + role.

**Body:**
```json
{
  "email": "admin@example.com", // OR use "phone": "+919876543210"
  "password": "password123",
  "remember": true
}
```
> **Note:** The backend accepts either an `email` field or a `phone` field. For convenience, if your frontend form only has a single text input, passing a mobile number directly into the `"email"` field will also work natively.

**Response:** `{ "accessToken": "...", "refreshToken": "...", "role": "SUPER_ADMIN" }`

---

### POST `/auth/google`
Login with Google OAuth credential. **Login only — no signup.**

**Body:** `{ "credential": "<google_id_token>" }`  
**Response:** `{ "accessToken": "...", "refreshToken": "...", "role": "ADMIN" }`  
**Error (new user):** `403 — "Account not found. Contact your administrator."`

---

### POST `/auth/login/send-otp`
Send OTP to email for passwordless login.

**Body:** `{ "email": "admin@example.com" }`  
**Response:** `{ "message": "OTP sent" }`

---

### POST `/auth/login/verify-otp`
Verify OTP and receive tokens.

**Body:** `{ "email": "admin@example.com", "otp": "123456", "remember": true }`  
**Response:** `{ "accessToken": "...", "refreshToken": "...", "role": "ADMIN" }`

---

### POST `/auth/verify-email`
Verify email after admin-created account setup.

**Body:** `{ "email": "user@example.com", "otp": "123456" }`

---

### POST `/auth/forgot-password`
**Body:** `{ "email": "user@example.com" }`

### POST `/auth/reset-password`
**Body:** `{ "email": "user@example.com", "otp": "123456", "newPassword": "newpass123" }`

---

### POST `/auth/refresh`
**Body:** `{ "refreshToken": "..." }`  
**Response:** `{ "accessToken": "..." }`

---

### GET `/auth/me` 🔒
Get current user with roles & permissions.

**Response:**
```json
{
  "publicId": "uuid",
  "email": "admin@example.com",
  "username": "admin@example.com",
  "status": "ACTIVE",
  "profile": { "firstName": "John", "lastName": "Doe", "phone": "+91..." },
  "roles": ["SUPER_ADMIN"],
  "permissions": ["user:create", "user:read", "expense:create", ...]
}
```

---

### POST `/auth/logout` 🔒
**Body:** `{ "refreshToken": "..." }`

---

## 👑 Admin Module (SUPER_ADMIN Only)

### POST `/admin/users` 🔒👑
Create a new user account. Generates random password & sends via email.

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "username": "johndoe",
  "role": "ADMIN"
}
```
> At least one of `email`, `phone`, or `username` is required.  
> `role` must be `"ADMIN"` or `"USER"` (cannot create SUPER_ADMIN).  
> If no email provided, `temporaryPassword` is returned in response.

---

### GET `/admin/users?page=1&pageSize=10` 🔒👑
List all users with roles (paginated).

---

### GET `/admin/users/:publicId` 🔒👑
Get user details with roles, permissions, and providers.

---

### PATCH `/admin/users/:publicId/role` 🔒👑
Change a user's role. Cannot change SUPER_ADMIN or self.

**Body:** `{ "role": "ADMIN" }`

---

### DELETE `/admin/users/:publicId` 🔒👑
Soft-delete a user. Cannot delete SUPER_ADMIN or self.

---

## 👤 User Profile Module

### GET `/user/profile` 🔒
Get own profile with roles & permissions.

### PUT `/user/profile` 🔒 (SUPER_ADMIN, ADMIN)
Update own profile.

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "dateOfBirth": "1995-06-15",
  "gender": "Male",
  "profileImage": "https://..."
}
```

### DELETE `/user/account` 🔒 (SUPER_ADMIN only)
Self-delete account.

---

## 🏢 Clients Module

### POST `/clients` 🔒 (SUPER_ADMIN, ADMIN)
**Body:**
```json
{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "phone": "+919876543210",
  "companyName": "Acme Corporation",
  "billingAddressLine1": "123 Main St",
  "city": "Mumbai", "state": "Maharashtra",
  "country": "India", "postalCode": "400001",
  "notes": "Premium client"
}
```

### GET `/clients?page=1&pageSize=10&search=acme&sortBy=name&sortOrder=asc` 🔒
### GET `/clients/:publicId` 🔒
### PUT `/clients/:publicId` 🔒 (SUPER_ADMIN, ADMIN)
### DELETE `/clients/:publicId` 🔒 (SUPER_ADMIN only)

---

## 🧾 Invoices Module

### POST `/invoices` 🔒 (SUPER_ADMIN, ADMIN)
**Body:**
```json
{
  "title": "Website Development",
  "featureProject": "Q1 Sprint",
  "description": "Full-stack development",
  "currency": "INR",
  "issuedDate": "2026-03-01",
  "dueDate": "2026-04-01",
  "clientPublicId": "<client_uuid>",
  "items": [
    {
      "itemName": "Frontend",
      "description": "React dashboard",
      "quantity": 1,
      "unitPrice": 50000,
      "taxPercent": 18,
      "discount": 0
    }
  ]
}
```

### GET `/invoices?page=1&pageSize=10&status=PENDING&search=INV&sortBy=dueDate` 🔒
### GET `/invoices/:publicId` 🔒
### PUT `/invoices/:publicId` 🔒 (SUPER_ADMIN, ADMIN)
### DELETE `/invoices/:publicId` 🔒 (SUPER_ADMIN only)

### POST `/invoices/:publicId/payments` 🔒 (SUPER_ADMIN, ADMIN)
**Body:**
```json
{
  "amount": 50000,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNo": "TXN-001",
  "notes": "Partial payment",
  "paidAt": "2026-03-15"
}
```
**Payment Methods:** `CASH`, `BANK_TRANSFER`, `CARD`, `UPI`, `WALLET`, `CHEQUE`, `OTHER`  
**Invoice Statuses:** `DRAFT`, `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`

### GET `/invoices/:publicId/payments` 🔒

---

## 💰 Expenses Module

### POST `/expenses` 🔒 (SUPER_ADMIN, ADMIN)
**Body:**
```json
{
  "expenseType": "FIXED",
  "title": "Office Rent",
  "category": "Salaries",
  "description": "Monthly rent",
  "comments": "Q1 2026",
  "amount": 50000,
  "expenseDate": "2026-03-01",
  "dueDate": "2026-03-31",
  "status": "PENDING",
  "recurring": true,
  "frequency": "monthly",
  "vendorName": "Landlord Corp",
  "paymentMethod": "BANK_TRANSFER"
}
```
**Expense Types:** `FIXED`, `OPERATIONAL`  
**Statuses:** `PENDING`, `APPROVED`, `PAID`, `REJECTED`  
**Categories:** `Salaries`, `Professional Fees`, `Technology`, `Utilities`

### GET `/expenses?page=1&pageSize=10&expenseType=FIXED&status=PENDING&category=Salaries&sortBy=dueDate` 🔒
### GET `/expenses/:publicId` 🔒
### PUT `/expenses/:publicId` 🔒 (SUPER_ADMIN, ADMIN)
### PATCH `/expenses/:publicId/pay` 🔒 (SUPER_ADMIN, ADMIN)
### DELETE `/expenses/:publicId` 🔒 (SUPER_ADMIN only)

---

## 🤝 Contributions Module

### POST `/contributions` 🔒 (SUPER_ADMIN, ADMIN)
**Body:**
```json
{
  "contributorName": "John Doe",
  "amount": 500000,
  "contributionDate": "2026-01-01",
  "notes": "Initial capital",
  "color": "#2563eb"
}
```

### GET `/contributions?page=1&pageSize=10&contributor=John&sortBy=contributionDate` 🔒
### GET `/contributions/:publicId` 🔒
### PUT `/contributions/:publicId` 🔒 (SUPER_ADMIN, ADMIN)
### DELETE `/contributions/:publicId` 🔒 (SUPER_ADMIN only)

---

## 📒 Transactions Module

### POST `/transactions` 🔒 (SUPER_ADMIN, ADMIN)
**Body:**
```json
{
  "type": "CREDIT",
  "category": "REVENUE",
  "amount": 100000,
  "currency": "INR",
  "date": "2026-03-15",
  "description": "Payment received",
  "referenceNo": "REF-001"
}
```
**Types:** `CREDIT`, `DEBIT`  
**Categories:** `REVENUE`, `EXPENSE`, `CAPITAL`, `INVOICE_PAYMENT`, `ADJUSTMENT`, `REFUND`, `WITHDRAWAL`, `DEPOSIT`

### GET `/transactions?page=1&pageSize=10&type=CREDIT&category=REVENUE&fromDate=2026-01-01&toDate=2026-12-31` 🔒
### GET `/transactions/:publicId` 🔒
### GET `/transactions/summary?fromDate=2026-01-01&toDate=2026-12-31` 🔒

**Summary Response:**
```json
{
  "totalCredits": 500000,
  "totalDebits": 200000,
  "netBalance": 300000,
  "creditCount": 15,
  "debitCount": 8
}
```

---

## 📊 Reports Module

### POST `/reports` 🔒 (SUPER_ADMIN, ADMIN)
**Body:**
```json
{
  "name": "Q1 Financial Summary",
  "type": "FINANCIAL_SUMMARY",
  "fromDate": "2026-01-01",
  "toDate": "2026-03-31",
  "format": "pdf"
}
```
**Report Types:** `FINANCIAL_SUMMARY`, `REVENUE_REPORT`, `EXPENSE_REPORT`, `INVOICE_REPORT`, `CLIENT_REPORT`, `CASHFLOW_REPORT`  
**Formats:** `pdf`, `csv`, `xlsx`  
**Statuses:** `PENDING`, `GENERATED`, `FAILED`

### GET `/reports?page=1&pageSize=10&type=FINANCIAL_SUMMARY&status=PENDING` 🔒
### GET `/reports/:publicId` 🔒
### PATCH `/reports/:publicId/status` 🔒 (SUPER_ADMIN, ADMIN)
**Body:** `{ "status": "GENERATED", "fileUrl": "https://..." }`
### DELETE `/reports/:publicId` 🔒 (SUPER_ADMIN only)

---

## 📈 Dashboard Module

All dashboard endpoints are read-only and accessible to all authenticated roles.

### GET `/dashboard/overview?from=2026-01-01&to=2026-03-31` 🔒
Returns: `accountBalance`, `totalRevenue`, `totalExpenses`, `fixedCosts`, `operationalCosts`, `totalExpenditure`, `netProfit` — all with `*Change` percentage fields.

### GET `/dashboard/account-balance?from=...&to=...` 🔒
### GET `/dashboard/summary` 🔒
### GET `/dashboard/contributions?from=...&to=...` 🔒
### GET `/dashboard/stats` 🔒
Returns: `{ "clients": 5, "invoices": 12, "pendingDues": 3, "expenses": 8 }`

### GET `/dashboard/chart-data?from=...&to=...` 🔒
Returns: `{ "transactionsData": [...], "barChartData": [...], "pieChartData": [...] }`

### GET `/dashboard/table/pending-invoices?page=1&pageSize=10` 🔒
### GET `/dashboard/table/recent-transactions?page=1&pageSize=10` 🔒

---

## Pagination & Sorting

All list endpoints support:

| Param | Description | Default |
|-------|------------|---------|
| `page` | Page number | `1` |
| `pageSize` | Items per page (max 100) | `10` |
| `sortBy` / `sort` | Field to sort by | `createdAt` |
| `sortOrder` / `order` | `asc` or `desc` | `desc` |

**Paginated Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

---

## Legend

| Icon | Meaning |
|------|---------|
| 🔒 | Requires authentication (Bearer token) |
| 👑 | SUPER_ADMIN only |
