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

    const result = await createUser({ name, email, password, role: "user" });
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

    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id, first_name, last_name, date_of_birth, sex, qualification, tin_no, ssni_no, position, department_id, basic_pay, allowance, bank_name, account_name, profile_image, users(id, name, email, role), departments(name)")
      .order("first_name", { ascending: true });

    if (employeeError) throw employeeError;

    const employees = (employeeRows || []).map((employee) => ({
      id: employee.id,
      user_id: employee.user_id,
      name: employee.users?.name || `${employee.first_name} ${employee.last_name}`.trim(),
      email: employee.users?.email || null,
      role: employee.users?.role || null,
      account_type: employee.user_id ? "software_user" : "payroll_only",
      first_name: employee.first_name,
      last_name: employee.last_name,
      date_of_birth: employee.date_of_birth,
      sex: employee.sex,
      qualification: employee.qualification,
      tin_no: employee.tin_no,
      ssni_no: employee.ssni_no,
      position: employee.position,
      department_id: employee.department_id,
      department: employee.departments?.name || null,
      basic_pay: employee.basic_pay,
      allowance: employee.allowance,
      bank_name: employee.bank_name,
      account_name: employee.account_name,
      profile_image: employee.profile_image,
    }));

    return res.json({ employees });
  } catch (error) {
    console.error("Employees lookup error:", error);
    const message = error?.message || "Unable to load employees";
    return res.status(500).json({ message });
  }
});

router.post("/api/payroll/runs", async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser) return res.status(401).json({ message: "Authentication required" });
    if (String(currentUser.role).toLowerCase() !== "admin") {
      const { data: permissions, error: permissionError } = await supabase
        .from("employee_permissions")
        .select("salaries")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (permissionError) throw permissionError;
      if (permissions?.salaries !== true) return res.status(403).json({ message: "Salary permission required" });
    }

    const { periodStart, periodEnd, rates, totals, entries } = req.body || {};
    if (!periodStart || !periodEnd || !Array.isArray(entries) || !entries.length) {
      return res.status(400).json({ message: "Payroll period and at least one employee are required" });
    }

    const { data: run, error: runError } = await supabase.from("payroll_runs").insert({
      period_start: periodStart,
      period_end: periodEnd,
      created_by: currentUser.id,
      ssnit_employee_rate: rates?.ssnitEmployee ?? 0.055,
      tier2_employee_rate: rates?.tier2Employee ?? 0,
      ssnit_employer_rate: rates?.ssnitEmployer ?? 0.08,
      tier2_employer_rate: rates?.tier2Employer ?? 0.05,
      total_gross: totals?.gross ?? 0,
      total_paye: totals?.paye ?? 0,
      total_employee_deductions: totals?.deductions ?? 0,
      total_net: totals?.net ?? 0,
      total_employer_contributions: totals?.employerContributions ?? 0,
      total_employer_cost: totals?.employerCost ?? 0,
    }).select("id").single();
    if (runError) throw runError;

    const rows = entries.map((entry) => ({
      payroll_run_id: run.id,
      employee_id: entry.employeeId,
      basic_pay: entry.basicPay,
      allowance: entry.allowance,
      gross_pay: entry.grossPay,
      ssnit_employee: entry.ssnitEmployee,
      tier2_employee: entry.tier2Employee,
      paye: entry.paye,
      total_employee_deductions: entry.totalEmployeeDeductions,
      net_pay: entry.netPay,
      ssnit_employer: entry.ssnitEmployer,
      tier2_employer: entry.tier2Employer,
      total_employer_contributions: entry.totalEmployerContributions,
      employer_cost: entry.employerCost,
    }));
    const { error: entriesError } = await supabase.from("payroll_entries").insert(rows);
    if (entriesError) throw entriesError;

    const payrollLines = [
      { account: "5600 - Wages expense", debit: Number(totals?.gross || 0), credit: 0, memo: "Gross payroll" },
      { account: "5610 - Employer SSNIT expense", debit: rows.reduce((sum, entry) => sum + Number(entry.ssnit_employer || 0), 0), credit: 0, memo: "Employer SSNIT contribution" },
      { account: "5620 - Employer Tier 2 expense", debit: rows.reduce((sum, entry) => sum + Number(entry.tier2_employer || 0), 0), credit: 0, memo: "Employer Tier 2 contribution" },
      { account: "2130 - Net wages payable", debit: 0, credit: Number(totals?.net || 0), memo: "Net wages owed to employees" },
      { account: "2100 - PAYE payable", debit: 0, credit: Number(totals?.paye || 0), memo: "PAYE withheld from employees" },
      { account: "2110 - SSNIT payable", debit: 0, credit: rows.reduce((sum, entry) => sum + Number(entry.ssnit_employee || 0) + Number(entry.ssnit_employer || 0), 0), memo: "Employee and employer SSNIT" },
      { account: "2120 - Tier 2 payable", debit: 0, credit: rows.reduce((sum, entry) => sum + Number(entry.tier2_employee || 0) + Number(entry.tier2_employer || 0), 0), memo: "Employee and employer Tier 2" },
    ].filter((line) => line.debit > 0 || line.credit > 0);

    const debitTotal = payrollLines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = payrollLines.reduce((sum, line) => sum + line.credit, 0);
    if (Math.abs(debitTotal - creditTotal) > 0.005) {
      throw new Error("Payroll journal entry is not balanced");
    }

    const { data: journalEntry, error: journalError } = await supabase
      .from("journal_entries")
      .insert({
        entry_date: periodEnd,
        reference: `PAYROLL-${run.id}`,
        description: `Payroll accrual for ${periodStart} to ${periodEnd}`,
        source: "payroll",
        created_by: currentUser.id,
      })
      .select("id")
      .single();
    if (journalError) throw journalError;

    const { error: journalLinesError } = await supabase
      .from("journal_lines")
      .insert(payrollLines.map((line) => ({ ...line, journal_entry_id: journalEntry.id })));
    if (journalLinesError) throw journalLinesError;

    const { error: statusError } = await supabase
      .from("payroll_runs")
      .update({ status: "processed" })
      .eq("id", run.id);
    if (statusError) throw statusError;

    return res.status(201).json({ runId: run.id, journalEntryId: journalEntry.id });
  } catch (error) {
    console.error("Payroll run creation error:", error);
    const message = error?.code === "23503"
      ? "Payroll employee records are not linked correctly. Apply the payroll employee ID migration in Supabase."
      : error?.message || "Unable to save payroll run";
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
    const role = "user";
    const accountType = String(req.body?.accountType || "software_user").trim().toLowerCase();
    const departmentId = Number(req.body?.departmentId);
    const basicPay = Number(req.body?.basicPay);
    const allowance = Number(req.body?.allowance || 0);

    if (!firstName || !lastName || !dateOfBirth || !sex || !Number.isInteger(departmentId) || !Number.isFinite(basicPay) || !Number.isFinite(allowance)) {
      return res.status(400).json({ message: "First name, last name, date of birth, sex, department, and basic pay are required" });
    }
    if (basicPay < 0 || allowance < 0) return res.status(400).json({ message: "Basic pay and allowance cannot be negative" });
    if (!["female", "male"].includes(sex)) return res.status(400).json({ message: "Invalid sex. Use female or male." });
    if (!["software_user", "payroll_only"].includes(accountType)) return res.status(400).json({ message: "Invalid employee account type" });
    if (accountType === "software_user" && (!email || !password)) return res.status(400).json({ message: "Email and password are required for a software user" });

    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .maybeSingle();
    if (departmentError) throw departmentError;
    if (!department) return res.status(400).json({ message: "Selected department does not exist" });

    let user = null;
    if (accountType === "software_user") {
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
      user = result.data?.[0];
      if (!user) throw new Error("Employee account was not created");
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .insert({
        user_id: user?.id || null,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        sex,
        qualification: req.body?.qualification?.trim() || null,
        tin_no: req.body?.tinNo?.trim() || null,
        ssni_no: req.body?.ssniNo?.trim() || null,
        position: req.body?.position?.trim() || null,
        department_id: departmentId,
        basic_pay: basicPay,
        allowance,
        bank_name: req.body?.bankName?.trim() || null,
        account_name: req.body?.accountName?.trim() || null,
        profile_image: req.file?.originalname || null,
      })
      .select()
      .single();
    if (employeeError) throw employeeError;

    return res.status(201).json({ employee: { ...employee, email: user?.email || null, role: user?.role || null, name: user?.name || `${firstName} ${lastName}`.trim(), account_type: accountType } });
  } catch (error) {
    console.error("Employee creation error:", error);
    const message = error?.code === "22P02"
      ? "The employee account could not be created because the users table role is invalid."
      : error?.code === "23503"
      ? "The selected department is not available. Refresh departments and try again."
      : error?.message || "Unable to add employee";
    return res.status(500).json({ message });
  }
});

router.get("/api/payroll/liabilities", async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser) return res.status(401).json({ message: "Authentication required" });
    if (String(currentUser.role).toLowerCase() !== "admin") {
      const { data: permissions, error: permissionError } = await supabase
        .from("employee_permissions")
        .select("salaries")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (permissionError) throw permissionError;
      if (permissions?.salaries !== true) return res.status(403).json({ message: "Salary permission required" });
    }

    const { data: runs, error: runsError } = await supabase
      .from("payroll_runs")
      .select("id, period_start, period_end, status, currency, total_gross, total_paye, total_employee_deductions, total_net, total_employer_contributions, total_employer_cost, created_at, payroll_entries(ssnit_employee, tier2_employee, ssnit_employer, tier2_employer)")
      .order("period_start", { ascending: false });
    if (runsError) throw runsError;

    const liabilities = (runs || []).map((run) => {
      const entries = run.payroll_entries || [];
      const total = (field) => entries.reduce((sum, entry) => sum + Number(entry[field] || 0), 0);
      const ssnitEmployee = total("ssnit_employee");
      const tier2Employee = total("tier2_employee");
      const ssnitEmployer = total("ssnit_employer");
      const tier2Employer = total("tier2_employer");

      return {
        id: run.id,
        period_start: run.period_start,
        period_end: run.period_end,
        status: run.status,
        currency: run.currency,
        gross_pay: Number(run.total_gross || 0),
        paye: Number(run.total_paye || 0),
        net_pay: Number(run.total_net || 0),
        ssnit_employee: ssnitEmployee,
        tier2_employee: tier2Employee,
        employee_deductions: Number(run.total_employee_deductions || 0),
        ssnit_employer: ssnitEmployer,
        tier2_employer: tier2Employer,
        employer_contributions: Number(run.total_employer_contributions || 0),
        employer_cost: Number(run.total_employer_cost || 0),
        total_payroll_liabilities: Number(run.total_net || 0) + Number(run.total_employee_deductions || 0) + Number(run.total_employer_contributions || 0),
        created_at: run.created_at,
      };
    });

    return res.json({ liabilities });
  } catch (error) {
    console.error("Payroll liabilities lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load payroll liabilities" });
  }
});

const canUseAccounting = async (req, permission = "write_cheque") => {
  const currentUser = authenticate(req);
  if (!currentUser) return { currentUser: null, allowed: false };
  if (String(currentUser.role).toLowerCase() === "admin") return { currentUser, allowed: true };
  const { data, error } = await supabase.from("employee_permissions").select(permission).eq("user_id", currentUser.id).maybeSingle();
  if (error) throw error;
  return { currentUser, allowed: data?.[permission] === true };
};

router.get("/api/ledger/accounts", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Ledger permission required" });
    const { data, error } = await supabase
      .from("ledger_accounts")
      .select("id, code, name, account_type")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    const { data: lines, error: linesError } = await supabase
      .from("journal_lines")
      .select("account, debit, credit, journal_entries!inner(status)")
      .eq("journal_entries.status", "posted");
    if (linesError) throw linesError;
    const balances = (lines || []).reduce((summary, line) => {
      summary[line.account] = (summary[line.account] || 0) + Number(line.debit || 0) - Number(line.credit || 0);
      return summary;
    }, {});
    return res.json({ accounts: (data || []).map((account) => ({
      ...account,
      balance: balances[`${account.code} - ${account.name}`] || 0,
    })) });
  } catch (error) {
    console.error("Ledger accounts lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load ledger accounts" });
  }
});

router.post("/api/ledger/accounts", async (req, res) => {
  try {
    const { currentUser, allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Ledger permission required" });
    const code = String(req.body?.code || "").trim();
    const name = String(req.body?.name || "").trim();
    const accountType = String(req.body?.accountType || "").trim().toLowerCase();
    if (!code || !name || !["asset", "liability", "equity", "income", "expense"].includes(accountType)) {
      return res.status(400).json({ message: "Code, name, and a valid account type are required" });
    }
    const { data: account, error } = await supabase
      .from("ledger_accounts")
      .insert({ code, name, account_type: accountType })
      .select("id, code, name, account_type, is_active")
      .single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ message: "An account with that code already exists" });
      throw error;
    }
    return res.status(201).json({ account: { ...account, balance: 0, created_by: currentUser.id } });
  } catch (error) {
    console.error("Ledger account creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to create ledger account" });
  }
});

router.get("/api/cash-bank-accounts", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Ledger permission required" });
    const { data: accounts, error } = await supabase
      .from("cash_bank_accounts")
      .select("id, account_name, account_number, bank_name, account_type, ledger_account_id, ledger_accounts(id, code, name, account_type)")
      .eq("is_active", true)
      .order("account_name");
    if (error) throw error;
    const { data: lines, error: linesError } = await supabase
      .from("journal_lines")
      .select("account, debit, credit, journal_entries!inner(status)")
      .eq("journal_entries.status", "posted");
    if (linesError) throw linesError;
    const balances = (lines || []).reduce((summary, line) => {
      summary[line.account] = (summary[line.account] || 0) + Number(line.debit || 0) - Number(line.credit || 0);
      return summary;
    }, {});
    return res.json({ accounts: (accounts || []).map((account) => ({
      ...account,
      balance: balances[`${account.ledger_accounts.code} - ${account.ledger_accounts.name}`] || 0,
    })) });
  } catch (error) {
    console.error("Cash and bank accounts lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load cash and bank accounts" });
  }
});

router.get("/api/suppliers", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Supplier permission required" });
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, email, phone, address")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return res.json({ suppliers: data || [] });
  } catch (error) {
    console.error("Suppliers lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load suppliers" });
  }
});

router.post("/api/suppliers", async (req, res) => {
  try {
    const { currentUser, allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Supplier permission required" });

    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email) || null;
    const phone = String(req.body?.phone || "").trim() || null;
    const address = String(req.body?.address || "").trim() || null;
    if (!name) return res.status(400).json({ message: "Supplier name is required" });

    const { data: existing, error: lookupError } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("name", name)
      .eq("is_active", true)
      .limit(1);
    if (lookupError) throw lookupError;
    if (existing?.length) return res.status(409).json({ message: "A supplier with that name already exists" });

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert({ name, email, phone, address, is_active: true, created_by: currentUser.id })
      .select("id, name, email, phone, address, is_active, created_at")
      .single();
    if (error) throw error;
    return res.status(201).json({ supplier });
  } catch (error) {
    console.error("Supplier creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to create supplier" });
  }
});

router.get("/api/payments/history", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Payment permission required" });
    const payee = String(req.query?.payee || "").trim();
    if (!payee) return res.json({ payments: [] });
    const { data, error } = await supabase
      .from("payment_records")
      .select("id, payment_type, payment_number, payment_date, payee, amount, memo, bank_account, journal_entry_id")
      .ilike("payee", payee)
      .order("payment_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(20);
    if (error) throw error;
    return res.json({ payments: data || [] });
  } catch (error) {
    console.error("Payment history lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load payment history" });
  }
});

router.get("/api/journal", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Journal permission required" });
    const { data, error } = await supabase
      .from("journal_entries")
      .select("id, entry_date, reference, description, source, status, created_at, journal_lines(id, account, debit, credit, memo), payment_records(id, payment_type, payment_number, payee, amount, bank_account)")
      .order("entry_date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return res.json({ entries: data || [] });
  } catch (error) {
    console.error("Journal lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load journal entries" });
  }
});

router.post("/api/journal", async (req, res) => {
  try {
    const { currentUser, allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Journal permission required" });
    const entryDate = String(req.body?.entryDate || "").trim();
    const description = String(req.body?.description || "").trim();
    const reference = String(req.body?.reference || "").trim() || null;
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    const normalizedLines = lines.map((line) => ({
      account: String(line.account || "").trim(),
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      memo: String(line.memo || "").trim() || null,
    }));
    const debitTotal = normalizedLines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = normalizedLines.reduce((sum, line) => sum + line.credit, 0);
    if (!entryDate || !description || normalizedLines.length < 2 || normalizedLines.some((line) => !line.account || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0))) {
      return res.status(400).json({ message: "Date, description, and valid journal lines are required" });
    }
    if (Math.abs(debitTotal - creditTotal) > 0.005) return res.status(400).json({ message: "Debits and credits must balance" });
    const { data: entry, error: entryError } = await supabase.from("journal_entries").insert({ entry_date: entryDate, reference, description, source: "manual", created_by: currentUser.id }).select("id").single();
    if (entryError) throw entryError;
    const { error: linesError } = await supabase.from("journal_lines").insert(normalizedLines.map((line) => ({ ...line, journal_entry_id: entry.id })));
    if (linesError) throw linesError;
    return res.status(201).json({ entryId: entry.id });
  } catch (error) {
    console.error("Journal creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to save journal entry" });
  }
});

router.post("/api/payments", async (req, res) => {
  try {
    const { currentUser, allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Payment permission required" });
    const paymentType = String(req.body?.paymentType || "").trim();
    const payee = String(req.body?.payee || "").trim();
    const paymentDate = String(req.body?.paymentDate || "").trim();
    const cashBankAccountId = Number(req.body?.cashBankAccountId);
    const amount = Number(req.body?.amount || 0);
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    if (!["cheque", "cash", "bank_transfer"].includes(paymentType) || !payee || !paymentDate || !Number.isInteger(cashBankAccountId) || cashBankAccountId <= 0 || amount <= 0 || !lines.length) return res.status(400).json({ message: "Payment type, date, payee, cash or bank account, amount, and expense lines are required" });
    const { data: cashBankAccount, error: cashBankAccountError } = await supabase
      .from("cash_bank_accounts")
      .select("id, account_name, ledger_accounts!inner(code, name, account_type, is_active)")
      .eq("id", cashBankAccountId)
      .eq("is_active", true)
      .maybeSingle();
    if (cashBankAccountError) throw cashBankAccountError;
    if (!cashBankAccount || cashBankAccount.ledger_accounts.account_type !== "asset" || !cashBankAccount.ledger_accounts.is_active) return res.status(400).json({ message: "Select an active cash or bank account" });
    const linkedBankAccount = `${cashBankAccount.ledger_accounts.code} - ${cashBankAccount.ledger_accounts.name}`;
    const normalizedLines = lines.map((line) => ({ account: String(line.account || "").trim(), debit: Number(line.amount || 0), credit: 0, memo: String(line.memo || "").trim() || null }));
    if (normalizedLines.some((line) => !line.account || line.debit <= 0)) return res.status(400).json({ message: "Every payment line needs an account and amount" });
    const lineTotal = normalizedLines.reduce((sum, line) => sum + line.debit, 0);
    if (Math.abs(lineTotal - amount) > 0.005) return res.status(400).json({ message: "Payment lines must equal the payment amount" });
    const { data: entry, error: entryError } = await supabase.from("journal_entries").insert({ entry_date: paymentDate, reference: req.body?.paymentNumber || null, description: `${paymentType} payment to ${payee}`, source: paymentType, created_by: currentUser.id }).select("id").single();
    if (entryError) throw entryError;
    const { error: linesError } = await supabase.from("journal_lines").insert([...normalizedLines.map((line) => ({ ...line, journal_entry_id: entry.id })), { journal_entry_id: entry.id, account: linkedBankAccount, debit: 0, credit: amount, memo: req.body?.memo || null }]);
    if (linesError) throw linesError;
    const { data: payment, error: paymentError } = await supabase.from("payment_records").insert({ journal_entry_id: entry.id, payment_type: paymentType, payment_number: req.body?.paymentNumber || null, payment_date: paymentDate, payee, bank_account: linkedBankAccount, cash_bank_account_id: cashBankAccountId, amount, memo: req.body?.memo || null, created_by: currentUser.id }).select("id").single();
    if (paymentError) throw paymentError;
    return res.status(201).json({ paymentId: payment.id, entryId: entry.id });
  } catch (error) {
    console.error("Payment creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to save payment" });
  }
});

router.put("/api/employees/:id", upload.single("profile_image"), async (req, res) => {
  try {
    const currentUser = authenticate(req);
    if (!currentUser || String(currentUser.role).toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = Number(req.params.id);
    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const dateOfBirth = String(req.body?.dateOfBirth || "").trim();
    const sex = String(req.body?.sex || "").trim().toLowerCase();
    const departmentId = Number(req.body?.departmentId);
    const basicPay = Number(req.body?.basicPay);
    const allowance = Number(req.body?.allowance || 0);

    if (!Number.isInteger(id) || !firstName || !lastName || !dateOfBirth || !sex || !Number.isInteger(departmentId) || !Number.isFinite(basicPay) || !Number.isFinite(allowance)) {
      return res.status(400).json({ message: "First name, last name, date of birth, sex, department, and basic pay are required" });
    }
    if (basicPay < 0 || allowance < 0) return res.status(400).json({ message: "Basic pay and allowance cannot be negative" });
    if (!["female", "male"].includes(sex)) return res.status(400).json({ message: "Invalid sex. Use female or male." });

    const { data: existingEmployee, error: lookupError } = await supabase
      .from("employees")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existingEmployee) return res.status(404).json({ message: "Employee not found" });

    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .maybeSingle();
    if (departmentError) throw departmentError;
    if (!department) return res.status(400).json({ message: "Selected department does not exist" });

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .update({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        sex,
        qualification: req.body?.qualification?.trim() || null,
        tin_no: req.body?.tinNo?.trim() || null,
        ssni_no: req.body?.ssniNo?.trim() || null,
        position: req.body?.position?.trim() || null,
        department_id: departmentId,
        basic_pay: basicPay,
        allowance,
        bank_name: req.body?.bankName?.trim() || null,
        account_name: req.body?.accountName?.trim() || null,
        ...(req.file ? { profile_image: req.file.originalname } : {}),
      })
      .eq("id", id)
      .select()
      .single();
    if (employeeError) throw employeeError;

    if (existingEmployee.user_id) {
      const email = normalizeEmail(req.body?.email);
      const userUpdate = { name: `${firstName} ${lastName}`.trim() };
      if (email) userUpdate.email = email;
      if (req.body?.password) userUpdate.password = await bcrypt.hash(String(req.body.password), 10);
      const { error: userError } = await supabase.from("users").update(userUpdate).eq("id", existingEmployee.user_id);
      if (userError) throw userError;
    }

    return res.json({ employee });
  } catch (error) {
    console.error("Employee update error:", error);
    return res.status(500).json({ message: error?.message || "Unable to update employee" });
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
