import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sql from "../db.js";

const router = express.Router();

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ loginStatus: false, Error: "Email and password are required" });
    }

    const result = await sql`SELECT * FROM employees WHERE email = ${email}`;

    if (result.length === 0) {
      return res.status(401).json({ loginStatus: false, Error: "Wrong Email or Password" });
    }

    const admin = result[0];
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
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({ loginStatus: true, id: admin.id });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ loginStatus: false, Error: "Server error" });
  }
};

router.post("/api/login", handleLogin);
router.post("/login", handleLogin);

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
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

export { router as adminRouter };
