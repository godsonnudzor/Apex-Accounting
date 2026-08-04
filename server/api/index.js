import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { adminRouter } from "../Routes/adminRoute.js";

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000,https://apex-accounting.vercel.app,https://apex-accounting-server.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/verify", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ Status: false, Error: "Not authenticated" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "secret_key_jwt", (err, decoded) => {
    if (err) return res.status(401).json({ Status: false, Error: "Wrong Token" });
    return res.json({ Status: true, role: decoded.role, id: decoded.id });
  });
});

app.use("/", adminRouter);

export default app;
