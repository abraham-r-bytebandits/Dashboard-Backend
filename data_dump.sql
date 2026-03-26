
-- Comprehensive Financial Dashboard Database Dump
-- Contains perfect relational data satisfying Prisma schema constraints.

USE `FinancialDashboard`;
SET FOREIGN_KEY_CHECKS=0;

TRUNCATE TABLE `InvoicePayment`;
TRUNCATE TABLE `InvoiceItem`;
TRUNCATE TABLE `ClientInvoice`;
TRUNCATE TABLE `Transaction`;
TRUNCATE TABLE `Expense`;
TRUNCATE TABLE `Contribution`;
TRUNCATE TABLE `Invoice`;
TRUNCATE TABLE `Client`;
TRUNCATE TABLE `UserProfile`;
TRUNCATE TABLE `Credential`;
TRUNCATE TABLE `AccountRole`;
TRUNCATE TABLE `Role`;
TRUNCATE TABLE `Account`;

INSERT INTO `Role` (`id`, `name`, `description`) VALUES
(1, 'USER', 'Standard user with read-only access'),
(2, 'ADMIN', 'Admin user with create, read, update, delete capabilities');

INSERT INTO `Account` (`id`, `publicId`, `email`, `username`, `status`, `isEmailVerified`, `createdAt`, `updatedAt`) 
VALUES 
(1, '0d1df965-ccdc-488d-9b5e-154e8143d619', 'abrahambillclinton@gmail.com', 'abrahambillclinton@gmail.com', 'ACTIVE', 1, NOW(), NOW()),
(2, '270ac67f-9662-462f-9aae-f54ce92525a7', 'dk.bbtech@gmail.com', 'dk.bbtech@gmail.com', 'ACTIVE', 1, NOW(), NOW());

INSERT INTO `Credential` (`id`, `accountPublicId`, `passwordHash`, `failedAttempts`)
VALUES 
(1, '0d1df965-ccdc-488d-9b5e-154e8143d619', '$2b$10$RGQRLtvDXhJBCz1/Ch2s0.OHADYNZeGJPUN2qGz4mSsWO8ECE/xZy', 0),
(2, '270ac67f-9662-462f-9aae-f54ce92525a7', '$2b$10$Yxqtvf6zRk13Dk.jy/c3M.UwnPccSDcwso36GQZztAvy3aoS6V.EC', 0);

INSERT INTO `AccountRole` (`accountPublicId`, `roleId`, `assignedAt`) 
VALUES 
('0d1df965-ccdc-488d-9b5e-154e8143d619', 2, NOW()),
('270ac67f-9662-462f-9aae-f54ce92525a7', 2, NOW());

INSERT INTO `UserProfile` (`id`, `accountPublicId`, `firstName`, `lastName`)
VALUES
(1, '0d1df965-ccdc-488d-9b5e-154e8143d619', 'Abraham', 'Clinton'),
(2, '270ac67f-9662-462f-9aae-f54ce92525a7', 'DK', 'Tech');

-- Insert 10 Fake Expenses
INSERT INTO `Expense` (`id`, `publicId`, `expenseId`, `expenseType`, `title`, `category`, `amount`, `expenseDate`, `dueDate`, `status`, `recurring`, `frequency`, `vendorName`, `paymentMethod`, `createdAt`, `updatedAt`, `paidByPublicId`, `createdByPublicId`) VALUES
(1, UUID(), '#FIX001', 'FIXED', 'Staff Salaries', 'Salaries', 120000.00, '2023-10-01', '2023-10-05', 'PAID', 1, 'monthly', 'Internal', 'BANK_TRANSFER', NOW(), NOW(), '0d1df965-ccdc-488d-9b5e-154e8143d619', '0d1df965-ccdc-488d-9b5e-154e8143d619'),
(2, UUID(), '#OPE001', 'OPERATIONAL', 'Legal Consulting', 'Professional Fees', 50000.00, '2023-10-02', '2023-10-10', 'PAID', 0, NULL, 'Law Firm LLC', 'CASH', NOW(), NOW(), '0d1df965-ccdc-488d-9b5e-154e8143d619', '0d1df965-ccdc-488d-9b5e-154e8143d619'),
(3, UUID(), '#OPE002', 'OPERATIONAL', 'AWS Hosting', 'Technology', 15000.00, '2023-10-05', '2023-10-15', 'PAID', 1, 'monthly', 'Amazon Web Services', 'CARD', NOW(), NOW(), '270ac67f-9662-462f-9aae-f54ce92525a7', '270ac67f-9662-462f-9aae-f54ce92525a7'),
(4, UUID(), '#FIX002', 'FIXED', 'Electricity Bill', 'Utilities', 2500.00, '2023-10-12', '2023-10-15', 'PAID', 1, 'monthly', 'City Power', 'UPI', NOW(), NOW(), '0d1df965-ccdc-488d-9b5e-154e8143d619', '0d1df965-ccdc-488d-9b5e-154e8143d619'),
(5, UUID(), '#FIX003', 'FIXED', 'Executive Salaries', 'Salaries', 80000.00, '2023-10-10', '2023-10-15', 'PAID', 1, 'monthly', 'Internal', 'BANK_TRANSFER', NOW(), NOW(), '270ac67f-9662-462f-9aae-f54ce92525a7', '270ac67f-9662-462f-9aae-f54ce92525a7'),
(6, UUID(), '#OPE003', 'OPERATIONAL', 'Accounting Audit', 'Professional Fees', 12000.00, '2023-10-18', '2023-10-20', 'PENDING', 0, NULL, 'Audit Partners', NULL, NOW(), NOW(), NULL, '0d1df965-ccdc-488d-9b5e-154e8143d619'),
(7, UUID(), '#OPE004', 'OPERATIONAL', 'SaaS Subscriptions', 'Technology', 8500.00, '2023-10-20', '2023-10-25', 'PAID', 1, 'monthly', 'Various', 'CARD', NOW(), NOW(), '270ac67f-9662-462f-9aae-f54ce92525a7', '270ac67f-9662-462f-9aae-f54ce92525a7'),
(8, UUID(), '#FIX004', 'FIXED', 'Internet Plan', 'Utilities', 1500.00, '2023-10-15', '2023-10-20', 'PAID', 1, 'monthly', 'Airtel', 'UPI', NOW(), NOW(), '0d1df965-ccdc-488d-9b5e-154e8143d619', '0d1df965-ccdc-488d-9b5e-154e8143d619'),
(9, UUID(), '#OPE005', 'OPERATIONAL', 'Freelance Design', 'Professional Fees', 5000.00, '2023-10-22', '2023-10-30', 'PENDING', 0, NULL, 'Designer Co', NULL, NOW(), NOW(), NULL, '270ac67f-9662-462f-9aae-f54ce92525a7'),
(10, UUID(), '#OPE006', 'OPERATIONAL', 'Software Licenses', 'Technology', 4000.00, '2023-10-25', '2023-10-31', 'REJECTED', 0, NULL, 'Microsoft', NULL, NOW(), NOW(), NULL, '0d1df965-ccdc-488d-9b5e-154e8143d619');

-- Insert 10 Fake Transactions (DEBITs for PAID expenses, some CREDITs for REVENUE to show balance)
INSERT INTO `Transaction` (`id`, `publicId`, `type`, `category`, `amount`, `currency`, `date`, `description`, `expenseId`, `createdByPublicId`, `createdAt`, `updatedAt`) VALUES
(1, UUID(), 'DEBIT', 'EXPENSE', 120000.00, 'INR', '2023-10-01', 'Expense paid: Staff Salaries', 1, '0d1df965-ccdc-488d-9b5e-154e8143d619', NOW(), NOW()),
(2, UUID(), 'DEBIT', 'EXPENSE', 50000.00, 'INR', '2023-10-02', 'Expense paid: Legal Consulting', 2, '0d1df965-ccdc-488d-9b5e-154e8143d619', NOW(), NOW()),
(3, UUID(), 'DEBIT', 'EXPENSE', 15000.00, 'INR', '2023-10-05', 'Expense paid: AWS Hosting', 3, '270ac67f-9662-462f-9aae-f54ce92525a7', NOW(), NOW()),
(4, UUID(), 'DEBIT', 'EXPENSE', 2500.00, 'INR', '2023-10-12', 'Expense paid: Electricity Bill', 4, '0d1df965-ccdc-488d-9b5e-154e8143d619', NOW(), NOW()),
(5, UUID(), 'DEBIT', 'EXPENSE', 80000.00, 'INR', '2023-10-10', 'Expense paid: Executive Salaries', 5, '270ac67f-9662-462f-9aae-f54ce92525a7', NOW(), NOW()),
(6, UUID(), 'DEBIT', 'EXPENSE', 8500.00, 'INR', '2023-10-20', 'Expense paid: SaaS Subscriptions', 7, '270ac67f-9662-462f-9aae-f54ce92525a7', NOW(), NOW()),
(7, UUID(), 'DEBIT', 'EXPENSE', 1500.00, 'INR', '2023-10-15', 'Expense paid: Internet Plan', 8, '0d1df965-ccdc-488d-9b5e-154e8143d619', NOW(), NOW()),
(8, UUID(), 'CREDIT', 'REVENUE', 150000.00, 'INR', '2023-10-03', 'Client Payment from Acme Corp', NULL, '0d1df965-ccdc-488d-9b5e-154e8143d619', NOW(), NOW()),
(9, UUID(), 'CREDIT', 'REVENUE', 75000.00, 'INR', '2023-10-08', 'Consulting Fees', NULL, '270ac67f-9662-462f-9aae-f54ce92525a7', NOW(), NOW()),
(10, UUID(), 'CREDIT', 'CAPITAL', 200000.00, 'INR', '2023-10-01', 'Initial Capital Investment', NULL, '0d1df965-ccdc-488d-9b5e-154e8143d619', NOW(), NOW());

-- Insert 2 Fake Contributions
INSERT INTO `Contribution` (`id`, `publicId`, `contributorName`, `amount`, `contributionDate`, `notes`, `color`, `createdAt`, `updatedAt`, `createdByPublicId`) VALUES
(1, UUID(), 'Abraham Clinton', 500000.00, '2023-09-15', 'Initial Founding Capital', '#ef4444', NOW(), NOW(), '0d1df965-ccdc-488d-9b5e-154e8143d619'),
(2, UUID(), 'DK Tech', 200000.00, '2023-10-01', 'Follow-on Funding', '#3b82f6', NOW(), NOW(), '270ac67f-9662-462f-9aae-f54ce92525a7');

SET FOREIGN_KEY_CHECKS=1;
