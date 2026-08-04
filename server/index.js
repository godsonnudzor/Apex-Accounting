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

app.use(
  cors({
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

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});