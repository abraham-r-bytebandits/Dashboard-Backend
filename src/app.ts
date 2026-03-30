import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import clientRoutes from "./routes/client.routes";
import invoiceRoutes from "./routes/invoice.routes";
import expenseRoutes from "./routes/expense.routes";
import contributionRoutes from "./routes/contribution.routes";
import transactionRoutes from "./routes/transaction.routes";
import reportRoutes from "./routes/report.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import imageRoutes from "./routes/image.routes";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
dotenv.config();


const app = express();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/image", imageRoutes);
app.use("/api/auth", authLimiter);
app.use(helmet());

export default app;
