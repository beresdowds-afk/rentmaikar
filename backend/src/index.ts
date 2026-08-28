import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { healthRouter } from "./routes/health";
import { cpaasRouter } from "./routes/cpaas";
import { webhooksRouter } from "./routes/webhooks";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware configuration
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// API Route Registration
app.use("/api/health", healthRouter);
app.use("/api/cpaas", cpaasRouter);
app.use("/api/webhooks", webhooksRouter);

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} does not exist on Rentmaikar API Gateway`,
  });
});

// Server boot
app.listen(PORT, () => {
  console.log(`🚀 Rentmaikar Backend API Gateway running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
});
