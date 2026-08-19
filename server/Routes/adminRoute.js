import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sql from "../db.js";
import { supabase } from "../lib/supabaseClient.js";
import { createUser } from "../controller/User.js";

const router = express.Router();

const fallbackAdmin = {
  id: 1,
  email: (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "$2b$10$y6pN3M2fX9IUJ6/1sY6hQOh2sK8xqY1fZH6a7g0r5YQ5L0J0cx5u",
  role: "admin",
};

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const passwordMatches = async (candidatePassword, storedPassword) => {
  if (!candidatePassword || !storedPassword) return false;

  const normalizedStoredPassword = String(storedPassword).trim();
  if (normalizedStoredPassword.startsWith("$2") && normalizedStoredPassword.length > 20) {
    return bcrypt.compare(candidatePassword, normalizedStoredPassword);
  }

  return candidatePassword === normalizedStoredPassword;
};

const handleLogin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ loginStatus: false, Error: "Email and password are required" });
    }

    let admin = null;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email)
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        admin = data[0];
      }
    } catch (error) {
      admin = null;
    }

    if (!admin && sql) {
      try {
        const result = await sql`SELECT * FROM users WHERE LOWER(email) = ${email}`;
        if (Array.isArray(result) && result.length > 0) {
          admin = result[0];
        }
      } catch (error) {
        admin = null;
      }
    }

    if (!admin && email === normalizeEmail(fallbackAdmin.email)) {
      const isPasswordValid = await passwordMatches(password, fallbackAdmin.password);
      if (isPasswordValid) {
        admin = { ...fallbackAdmin, email: fallbackAdmin.email, password: fallbackAdmin.password };
      }
    }

    if (!admin) {
      return res.status(401).json({ loginStatus: false, Error: "Wrong Email or Password" });
    }

    const storedPassword = admin.password ?? admin.password_hash ?? admin.password_hash ?? null;
    const isPasswordValid = await passwordMatches(password, storedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ loginStatus: false, Error: "Wrong Email or Password" });
    }

    const token = jwt.sign(
      { role: admin.role || "admin", email: admin.email, id: admin.id },
      process.env.JWT_SECRET || "secret_key_jwt",
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({ loginStatus: true, id: admin.id });
  } catch (error) {
    console.error("Admin login error:", error);
    const message = error?.message?.includes("password authentication failed")
      ? "Database authentication failed. Please update the backend database credentials."
      : error?.message?.includes("relation \"employees\" does not exist")
      ? "The employees table is not present in the connected database."
      : error.message || "Server error";
    return res.status(500).json({ loginStatus: false, Error: message });
  }
};

router.post("/api/login", handleLogin);
router.post("/login", handleLogin);
router.post("/admin/api/login", handleLogin);

router.post("/api/signup", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const { data: existingUsers, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .ilike("email", email)
      .limit(1);

    if (lookupError) {
      return res.status(500).json({ message: "Database error while checking the email" });
    }

    if (existingUsers?.length) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const result = await createUser({ name, email, password, role: "employee" });
    if (!result.success) {
      return res.status(500).json({ message: "Unable to create account" });
    }

    const user = result.data?.[0];
    return res.status(201).json({
      message: "Account created successfully",
      user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Unable to create account" });
  }
});

router.get("/api/users", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admins = await sql`SELECT * FROM users`;
    return res.status(200).json(admins);
  } catch (error) {
    console.error("Users endpoint error:", error);
    const message = error?.message?.includes("password authentication failed")
      ? "Database authentication failed. Please update the backend database credentials."
      : error?.message?.includes("relation \"users\" does not exist")
      ? "The users table is not present in the connected database."
      : error.message || "Server error";
    return res.status(500).json({ message, error: error.message });
  }
});

export { router as adminRouter };
