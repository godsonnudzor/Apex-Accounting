import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import sql from "../db.js";
import { supabase } from "../lib/supabaseClient.js";
import { createUser } from "../controller/User.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

const authenticate = (req) => {
  const token = req.cookies?.token;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET || "secret_key_jwt"); } catch { return null; }
};

const hasUserPermission = async (user) => {
  if (String(user?.role).toLowerCase() === "admin") return true;
  const { data, error } = await supabase
    .from("employee_permissions")
    .select("departments")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.departments === true;
};

const readPermissions = async (userId, role) => {
  if (String(role).toLowerCase() === "admin") return { dashboard: true, writeCheque: true, bills: true, payroll: true, departments: true, employeeManagement: true, taxBrackets: true, taxJurisdictions: true, userScenarios: true, salaries: true, leaveManagement: true, reports: true };
  const { data, error } = await supabase
    .from("employee_permissions")
    .select("dashboard, write_cheque, bills, payroll, employee_management, tax_brackets, tax_jurisdictions, user_scenarios, departments, salaries, leave_management, reports")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Permission lookup error:", error.message);
  }
  return {
    dashboard: data?.dashboard ?? true,
    writeCheque: data?.write_cheque ?? false,
    bills: data?.bills ?? false,
    payroll: data?.payroll ?? false,
    employeeManagement: data?.employee_management ?? false,
    taxBrackets: data?.tax_brackets ?? false,
    taxJurisdictions: data?.tax_jurisdictions ?? false,
    userScenarios: data?.user_scenarios ?? false,
    departments: data?.departments ?? false,
    salaries: data?.salaries ?? false,
    leaveManagement: data?.leave_management ?? false,
    reports: data?.reports ?? false,
    
  };
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

router.get("/api/me", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key_jwt");
    let users = [];

    const { data: supabaseUser, error: supabaseError } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", decoded.id)
      .maybeSingle();

    if (!supabaseError && supabaseUser) {
      return res.json({ user: { ...supabaseUser, permissions: await readPermissions(supabaseUser.id, supabaseUser.role) } });
    }

    if (sql) {
      users = await sql`
        SELECT id, name, email, role
        FROM users
        WHERE id = ${decoded.id}
        LIMIT 1
      `;
    }

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: { ...users[0], permissions: await readPermissions(users[0].id, users[0].role) } });
  } catch (error) {
    console.error("Current user error:", error);
    return res.status(401).json({ message: "Not authenticated" });
  }
});

router.get("/api/users", async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser || currentUser.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const { data: users, error } = await supabase.from("users").select("id, name, email, role").order("name");
    if (error) return res.status(500).json({ message: "Unable to load employees" });
    const result = await Promise.all(users.map(async (employee) => ({
      ...employee,
      permissions: await readPermissions(employee.id, employee.role),
    })));
    return res.status(200).json({ users: result });
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

router.get("/api/employees", async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser) return res.status(401).json({ message: "Authentication required" });

    if (String(currentUser.role).toLowerCase() !== "admin") {
      const { data: permissions, error: permissionError } = await supabase
        .from("employee_permissions")
        .select("employee_management")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (permissionError) throw permissionError;
      if (permissions?.employee_management !== true) {
        return res.status(403).json({ message: "Employee permission required" });
      }
    }

    const employees = await sql`
      SELECT
        public.users.id,
        public.users.name,
        public.users.email,
        public.users.role,
        public.employees.first_name,
        public.employees.last_name,
        public.employees.date_of_birth,
        public.employees.sex,
        public.employees.qualification,
        public.employees.department_id,
        public.departments.name AS department,
        public.employees.basic_pay,
        public.employees.profile_image
      FROM public.employees
      INNER JOIN public.users ON public.users.id = public.employees.user_id
      LEFT JOIN public.departments ON public.departments.id = public.employees.department_id
      ORDER BY LOWER(public.users.name), public.users.id
    `;

    return res.json({ employees });
  } catch (error) {
    console.error("Employees lookup error:", error);
    const message = error?.message?.includes('relation "users" does not exist')
      ? "The users table is not present in the connected database."
      : "Unable to load employees";
    return res.status(500).json({ message });
  }
});

router.post("/api/employees", upload.single("profile_image"), async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser || String(currentUser.role).toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const dateOfBirth = String(req.body?.dateOfBirth || "").trim();
    const sex = String(req.body?.sex || "").trim().toLowerCase();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "employee").trim().toLowerCase();
    const departmentId = Number(req.body?.departmentId);
    const basicPay = Number(req.body?.basicPay);

    if (!firstName || !lastName || !dateOfBirth || !sex || !email || !password || !Number.isInteger(departmentId) || !Number.isFinite(basicPay)) {
      return res.status(400).json({ message: "First name, last name, date of birth, sex, department, email, password, and basic pay are required" });
    }
    if (!["employee", "admin", "user", "public"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    if (!["female", "male"].includes(sex)) return res.status(400).json({ message: "Invalid sex" });

    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .maybeSingle();
    if (departmentError) throw departmentError;
    if (!department) return res.status(400).json({ message: "Selected department does not exist" });

    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    if (lookupError) throw lookupError;
    if (existingUser?.length) return res.status(409).json({ message: "An account with this email already exists" });

    const result = await createUser({
      ...req.body,
      firstName,
      lastName,
      dateOfBirth,
      sex,
      email,
      password,
      role,
      basicPay,
    });
    if (!result.success) throw result.error;

    const user = result.data?.[0];
    if (!user) throw new Error("Employee account was not created");

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .insert({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        sex,
        qualification: req.body?.qualification?.trim() || null,
        department_id: departmentId,
        basic_pay: basicPay,
        profile_image: req.file?.originalname || null,
      })
      .select()
      .single();
    if (employeeError) throw employeeError;

    return res.status(201).json({ employee: { ...employee, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    console.error("Employee creation error:", error);
    const message = error?.code === "22P02"
      ? "The selected role is not available in the users table. Apply the employee role migration."
      : error?.code === "23503"
      ? "The selected department is not available. Refresh departments and try again."
      : error?.message || "Unable to add employee";
    return res.status(500).json({ message });
  }
});

router.get("/api/departments", async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser) return res.status(401).json({ message: "Authentication required" });
    if (!(await hasUserPermission(currentUser))) return res.status(403).json({ message: "Department permission required" });

    const { data, error } = await supabase
      .from("departments")
      .select("id, name, description, created_at")
      .order("name");
    if (error) throw error;
    return res.json({ departments: data || [] });
  } catch (error) {
    console.error("Departments lookup error:", error);
    return res.status(500).json({ message: "Unable to load departments" });
  }
});

router.post("/api/departments", async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser) return res.status(401).json({ message: "Authentication required" });
    if (!(await hasUserPermission(currentUser))) return res.status(403).json({ message: "Department permission required" });

    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    if (!name) return res.status(400).json({ message: "Department name is required" });
    if (name.length > 100) return res.status(400).json({ message: "Department name must be 100 characters or fewer" });

    const { data, error } = await supabase
      .from("departments")
      .insert({ name, description: description || null, created_by: currentUser.id })
      .select("id, name, description, created_at")
      .single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ message: "A department with that name already exists" });
      throw error;
    }
    return res.status(201).json({ department: data });
  } catch (error) {
    console.error("Department creation error:", error);
    return res.status(500).json({ message: "Unable to create department" });
  }
});
// ...existing code...

router.put("/api/departments/:id", async (req, res) => {
  try {
    const currentUser = authenticate(req);

    if (!currentUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!(await hasUserPermission(currentUser))) {
      return res.status(403).json({ message: "Department permission required" });
    }

    const id = Number(req.params.id);
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid department ID" });
    }

    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }

    if (name.length > 100) {
      return res
        .status(400)
        .json({ message: "Department name must be 100 characters or fewer" });
    }

    const { data, error } = await supabase
      .from("departments")
      .update({
        name,
        description: description || null,
      })
      .eq("id", id)
      .select("id, name, description, created_at")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ message: "Department not found" });
      }

      if (error.code === "23505") {
        return res
          .status(409)
          .json({ message: "A department with that name already exists" });
      }

      throw error;
    }

    return res.json({
      message: "Department updated successfully",
      department: data,
    });
  } catch (error) {
    console.error("Department update error:", error);
    return res.status(500).json({ message: "Unable to update department" });
  }
});

router.delete("/api/departments/:id", async (req, res) => {
  try {
    const currentUser = authenticate(req);

    if (!currentUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!(await hasUserPermission(currentUser))) {
      return res.status(403).json({ message: "Department permission required" });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid department ID" });
    }

    const { data, error } = await supabase
      .from("departments")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ message: "Department not found" });
    }

    return res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Department deletion error:", error);
    return res.status(500).json({ message: "Unable to delete department" });
  }
});

// Remove these incorrect lines:
// router.put("/:id", updateDepartment);
// router.delete("/:id", deleteDepartment);

// ...existing code...

router.put("/api/users/:userId/permissions", async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser || currentUser.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const userId = Number(req.params.userId);
    const {
      dashboard = true,
      writeCheque = false,
      bills = false,
      payroll = false,
      departments = false,
      salaries = false,
      leaveManagement = false,
      employeeManagement = false,
      taxBrackets = false,
      taxJurisdictions = false,
      userScenarios = false,
      reports = false,
      
    } = req.body;

    const { data, error } = await supabase
      .from("employee_permissions")
      .upsert({
        user_id: userId,
        dashboard,
        write_cheque: writeCheque,
        bills,
        payroll,
        departments,
        salaries,
        leave_management: leaveManagement,
        employee_management: employeeManagement,
        tax_brackets: taxBrackets,
        tax_jurisdictions: taxJurisdictions,
        user_scenarios: userScenarios,
        reports,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.json({
      permissions: {
        dashboard: data.dashboard,
        writeCheque: data.write_cheque,
        bills: data.bills,
        payroll: data.payroll,
        reports: data.reports,
        departments: data.departments,
        salaries: data.salaries,
        leaveManagement: data.leave_management,
        employeeManagement: data.employee_management,
        taxBrackets: data.tax_brackets,
        taxJurisdictions: data.tax_jurisdictions,
        userScenarios: data.user_scenarios,
      },
    });
  } catch {
    return res.status(500).json({ message: "Unable to update permissions" });
  }
});


export { router as adminRouter };
