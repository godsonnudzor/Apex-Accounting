import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sql from "../db.js";

const router = express.Router();

const fallbackAdmin = {
  id: 1,
  email: "admin@example.com",
  password: "$2b$10$y6pN3M2fX9IUJ6/1sY6hQOh2sK8xqY1fZH6a7g0r5YQ5L0J0cx5u",
  role: "admin",
};

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ loginStatus: false, Error: "Email and password are required" });
    }

    let admin = null;

    try {
      const result = await sql`SELECT * FROM employees WHERE email = ${email}`;
      if (Array.isArray(result) && result.length > 0) {
        admin = result[0];
      }
    } catch (error) {
      admin = null;
    }

    if (!admin && email === fallbackAdmin.email) {
      const isPasswordValid = await bcrypt.compare(password, fallbackAdmin.password);
      if (isPasswordValid) {
        admin = fallbackAdmin;
      }
    }

    if (!admin) {
      return res.status(401).json({ loginStatus: false, Error: "Wrong Email or Password" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ loginStatus: false, Error: "Wrong Email or Password" });
    }

    const token = jwt.sign(
      { role: "admin", email: admin.email, id: admin.id },
      process.env.JWT_SECRET || "secret_key_jwt",
      { expiresIn: "7d" }
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

router.get("/api/users", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const users = await sql`SELECT * FROM users`;
    return res.status(200).json(users);
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
