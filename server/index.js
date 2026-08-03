import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { adminRouter } from "./Routes/adminRoute.js";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000,https://apex-accounting.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalized = origin.trim();
  return (
    allowedOrigins.includes(normalized) ||
    normalized.endsWith(".vercel.app") ||
    normalized.endsWith(".vercel.app/")
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.static("Public"));

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, "secret_key_jwt", (err, decoded) => {
      if (err) return res.json({ Status: false, Error: "Wrong Token" });
      req.id = decoded.id;
      req.role = decoded.role;
      next();
    });
  } else {
    return res.json({ Status: false, Error: "Not authenticated" });
  }
};

app.get("/verify", verifyUser, (req, res) => {
  return res.json({
    Status: true,
    role: req.role,
    id: req.id,
  });
});

app.use("/admin", adminRouter);
app.use("/", adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  if (err instanceof Error && err.message.includes("Not allowed by CORS")) {
    return res.status(403).json({ error: "CORS origin not allowed" });
  }
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT) || 6000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set PORT in .env or stop the process using it.`);
    process.exit(1);
  }
  console.error("Server error:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});