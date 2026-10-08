import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sql from "../db.js";
import { supabase } from "../lib/supabaseClient.js";
import { createUser } from "../controller/User.js";

const router = express.Router();
const uploadProfileImage = async (req, res, next) => {
  try {
    const { default: multer } = await import("multer");
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    });
    upload.single("profile_image")(req, res, next);
  } catch (error) {
    next(error);
  }
};

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
  if (String(role).toLowerCase() === "admin") return { dashboard: true, writeCheque: true, bills: true, invoice: true, payroll: true, departments: true, employeeManagement: true, taxBrackets: true, taxJurisdictions: true, userScenarios: true, salaries: true, leaveManagement: true, reports: true };
  const { data, error } = await supabase
    .from("employee_permissions")
    .select("dashboard, write_cheque, bills, invoice, payroll, employee_management, tax_brackets, tax_jurisdictions, user_scenarios, departments, salaries, leave_management, reports")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Permission lookup error:", error.message);
  }
  return {
    dashboard: data?.dashboard ?? true,
    writeCheque: data?.write_cheque ?? false,
    bills: data?.bills ?? false,
    invoice: data?.invoice ?? false,
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

router.post("/api/employees", uploadProfileImage, async (req, res) => {
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
  const permissions = Array.isArray(permission) ? permission : [permission];
  const { data, error } = await supabase
    .from("employee_permissions")
    .select(permissions.join(","))
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) throw error;
  return { currentUser, allowed: permissions.some((name) => data?.[name] === true) };
};

router.get("/api/ledger/accounts", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["write_cheque", "bills", "invoice"]);
    if (!allowed) return res.status(403).json({ message: "Ledger permission required" });
    const { data, error } = await supabase
      .from("ledger_accounts")
      .select("id, code, name, account_type, group_ledger")
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
    const groupLedger = String(req.body?.groupLedger || "").trim();
    if (!code || !name || !["asset", "liability", "equity", "income", "expense"].includes(accountType)) {
      return res.status(400).json({ message: "Code, name, and a valid account type are required" });
    }
    const groupLedgerTypes = {
      "Account Payable": "liability",
      "Account Receivable": "asset",
    };
    if (groupLedger && groupLedgerTypes[groupLedger] !== accountType) {
      return res.status(400).json({ message: "Select a valid Group Ledger option" });
    }
    const { data: account, error } = await supabase
      .from("ledger_accounts")
      .insert({ code, name, account_type: accountType, group_ledger: groupLedger || null })
      .select("id, code, name, account_type, group_ledger, is_active")
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

const supplierSelect = "id, name, company_name, first_name, middle_name, last_name, salutation, job_title, email, main_email, cc_email, phone, main_phone, work_phone, mobile_phone, fax, website, other_email, address, billed_from, shipped_from, currency, account_number, credit_limit, payment_terms, print_name_on_cheque, billing_rate_level, bank_account_name, bank_sort_code, bank_account_number, vat_registration_number, supplier_vat(vat_registration_number), expense_account_1_id, expense_account_2_id, expense_account_3_id, supplier_type, custom_fields, is_active, created_at";
const formatSupplier = (supplier) => {
  const { supplier_vat: supplierVat, ...supplierDetails } = supplier;
  return {
    ...supplierDetails,
    vat_registration_number: supplierVat?.vat_registration_number ?? supplierDetails.vat_registration_number,
  };
};
const supplierColumnByField = {
  companyName: "company_name",
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  salutation: "salutation",
  jobTitle: "job_title",
  mainPhone: "main_phone",
  workPhone: "work_phone",
  mobilePhone: "mobile_phone",
  fax: "fax",
  mainEmail: "main_email",
  ccEmail: "cc_email",
  website: "website",
  otherEmail: "other_email",
  billedFrom: "billed_from",
  shippedFrom: "shipped_from",
  currency: "currency",
  accountNumber: "account_number",
  creditLimit: "credit_limit",
  paymentTerms: "payment_terms",
  printNameOnCheque: "print_name_on_cheque",
  billingRateLevel: "billing_rate_level",
  bankAccountName: "bank_account_name",
  bankSortCode: "bank_sort_code",
  bankAccountNumber: "bank_account_number",
  vatRegistrationNumber: "vat_registration_number",
  expenseAccount1Id: "expense_account_1_id",
  expenseAccount2Id: "expense_account_2_id",
  expenseAccount3Id: "expense_account_3_id",
  supplierType: "supplier_type",
  customFields: "custom_fields",
};
const supplierTextFields = new Set(Object.keys(supplierColumnByField).filter((field) => ![
  "creditLimit",
  "expenseAccount1Id",
  "expenseAccount2Id",
  "expenseAccount3Id",
  "customFields",
].includes(field)));

const buildSupplierPayload = (body) => {
  const payload = {};
  const rawName = body.supplierName ?? body.name ?? body.companyName;
  if (rawName !== undefined) payload.name = String(rawName).trim();

  for (const [field, column] of Object.entries(supplierColumnByField)) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    if (supplierTextFields.has(field)) {
      const value = String(body[field] ?? "").trim();
      payload[column] = value || null;
    } else if (field === "creditLimit") {
      const value = String(body[field] ?? "").trim();
      if (!value) {
        payload[column] = null;
      } else {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount < 0) throw new Error("Credit limit must be a non-negative amount");
        payload[column] = amount;
      }
    } else if (field.startsWith("expenseAccount")) {
      const value = String(body[field] ?? "").trim();
      if (!value) {
        payload[column] = null;
      } else if (!/^\d+$/.test(value)) {
        throw new Error("Expense account selections must be valid account IDs");
      } else {
        payload[column] = value;
      }
    } else if (field === "customFields") {
      if (!body[field] || typeof body[field] !== "object" || Array.isArray(body[field])) {
        throw new Error("Custom fields must be an object");
      }
      const customFields = Object.entries(body[field])
        .map(([key, value]) => [String(key).trim(), String(value ?? "").trim()]);
      if (customFields.some(([key]) => !key)) throw new Error("Custom field names cannot be blank");
      payload[column] = Object.fromEntries(customFields);
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "name") || Object.prototype.hasOwnProperty.call(body, "companyName")) {
    payload.company_name = String(body.companyName ?? body.name ?? "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "email") || Object.prototype.hasOwnProperty.call(body, "mainEmail")) {
    const email = normalizeEmail(body.mainEmail ?? body.email) || null;
    payload.main_email = email;
    payload.email = email;
  }
  if (Object.prototype.hasOwnProperty.call(body, "phone") || Object.prototype.hasOwnProperty.call(body, "mainPhone")) {
    const phone = String(body.mainPhone ?? body.phone ?? "").trim() || null;
    payload.main_phone = phone;
    payload.phone = phone;
  }
  if (Object.prototype.hasOwnProperty.call(body, "address") || Object.prototype.hasOwnProperty.call(body, "billedFrom")) {
    const address = String(body.billedFrom ?? body.address ?? "").trim() || null;
    payload.billed_from = address;
    payload.address = address;
  }
  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    if (typeof body.isActive !== "boolean") throw new Error("Supplier status must be active or inactive");
    payload.is_active = body.isActive;
  }
  return payload;
};

router.get("/api/suppliers", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["write_cheque", "bills", "invoice"]);
    if (!allowed) return res.status(403).json({ message: "Supplier permission required" });
    let query = supabase.from("suppliers").select(supplierSelect);
    if (req.query.includeInactive !== "true") query = query.eq("is_active", true);
    const { data, error } = await query.order("name");
    if (error) throw error;
    return res.json({ suppliers: (data || []).map(formatSupplier) });
  } catch (error) {
    console.error("Suppliers lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load suppliers" });
  }
});

router.post("/api/suppliers", async (req, res) => {
  try {
    const { currentUser, allowed } = await canUseAccounting(req, ["write_cheque", "bills", "invoice"]);
    if (!allowed) return res.status(403).json({ message: "Supplier permission required" });

    const payload = buildSupplierPayload(req.body || {});
    if (!payload.name) return res.status(400).json({ message: "Supplier name is required" });

    const { data: existing, error: lookupError } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("name", payload.name)
      .eq("is_active", true)
      .limit(1);
    if (lookupError) throw lookupError;
    if (existing?.length) return res.status(409).json({ message: "A supplier with that name already exists" });

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert({ ...payload, is_active: payload.is_active ?? true, created_by: currentUser.id })
      .select(supplierSelect)
      .single();
    if (error) throw error;
    return res.status(201).json({ supplier: formatSupplier(supplier) });
  } catch (error) {
    if (error.message === "Credit limit must be a non-negative amount"
      || error.message === "Expense account selections must be valid account IDs"
      || error.message === "Custom fields must be an object"
      || error.message === "Custom field names cannot be blank"
      || error.message === "Supplier status must be active or inactive") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Supplier creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to create supplier" });
  }
});

router.patch("/api/suppliers/:id", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["write_cheque", "bills", "invoice"]);
    if (!allowed) return res.status(403).json({ message: "Supplier permission required" });
    if (!/^\d+$/.test(String(req.params.id))) return res.status(400).json({ message: "Invalid supplier ID" });

    const payload = buildSupplierPayload(req.body || {});
    if (!Object.keys(payload).length) return res.status(400).json({ message: "At least one supplier field is required" });
    if (Object.prototype.hasOwnProperty.call(payload, "name") && !payload.name) {
      return res.status(400).json({ message: "Supplier name is required" });
    }

    if (payload.name && payload.is_active !== false) {
      const { data: existing, error: lookupError } = await supabase
        .from("suppliers")
        .select("id")
        .ilike("name", payload.name)
        .eq("is_active", true)
        .neq("id", req.params.id)
        .limit(1);
      if (lookupError) throw lookupError;
      if (existing?.length) return res.status(409).json({ message: "A supplier with that name already exists" });
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("id", req.params.id)
      .select(supplierSelect)
      .maybeSingle();
    if (error) throw error;
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    return res.json({ supplier: formatSupplier(supplier) });
  } catch (error) {
    if (error.message === "Credit limit must be a non-negative amount"
      || error.message === "Expense account selections must be valid account IDs"
      || error.message === "Custom fields must be an object"
      || error.message === "Custom field names cannot be blank"
      || error.message === "Supplier status must be active or inactive") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Supplier update error:", error);
    return res.status(500).json({ message: error?.message || "Unable to update supplier" });
  }
});

const supplierBillSelect = "id, supplier_id, document_type, reference, bill_date, due_date, payment_terms, currency, subtotal, discount_amount, tax_amount, total_amount, bill_received, memo, created_at, supplier:suppliers(id, name, currency), lines:supplier_bill_lines(id, ledger_account_id, amount, memo, ledger_account:ledger_accounts(id, code, name, account_type))";
const daysSinceDate = (dateValue, now = new Date()) => {
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((todayUtc - date.getTime()) / 86400000));
};
const formatSupplierBill = (bill, now = new Date()) => ({
  ...bill,
  age_days: daysSinceDate(bill.bill_date, now),
  signed_amount: Number(bill.total_amount || 0) * (bill.document_type === "credit" ? -1 : 1),
  lines: (bill.lines || []).map((line) => ({
    ...line,
    ledger_account: Array.isArray(line.ledger_account) ? line.ledger_account[0] : line.ledger_account,
  })),
  supplier: Array.isArray(bill.supplier) ? bill.supplier[0] : bill.supplier,
});

router.get("/api/supplier-bills", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["bills", "write_cheque"]);
    if (!allowed) return res.status(403).json({ message: "Supplier bill permission required" });
    const { data, error } = await supabase
      .from("supplier_bills")
      .select(supplierBillSelect)
      .order("bill_date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return res.json({ bills: (data || []).map((bill) => formatSupplierBill(bill)) });
  } catch (error) {
    console.error("Supplier bills lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load supplier transactions" });
  }
});

router.post("/api/supplier-bills", async (req, res) => {
  let insertedBillId = null;
  try {
    const { currentUser, allowed } = await canUseAccounting(req, ["bills", "write_cheque"]);
    if (!allowed) return res.status(403).json({ message: "Supplier bill permission required" });

    const supplierId = String(req.body?.supplierId ?? "");
    const documentType = req.body?.documentType === "credit" ? "credit" : req.body?.documentType === "bill" ? "bill" : "";
    const billDate = String(req.body?.billDate || "");
    const dueDate = String(req.body?.dueDate || "") || null;
    const currencyCode = String(req.body?.currency || "GHS").trim().toUpperCase();
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    const discountAmount = Number(req.body?.discountAmount || 0);
    const taxAmount = Number(req.body?.taxAmount || 0);
    if (!/^\d+$/.test(supplierId)) return res.status(400).json({ message: "Select a valid supplier" });
    if (!documentType) return res.status(400).json({ message: "Transaction type must be bill or credit" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate) || Number.isNaN(Date.parse(`${billDate}T00:00:00Z`))) {
      return res.status(400).json({ message: "Enter a valid bill date" });
    }
    if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(`${dueDate}T00:00:00Z`)))) {
      return res.status(400).json({ message: "Enter a valid due date" });
    }
    if (!/^[A-Z]{3,10}$/.test(currencyCode)) return res.status(400).json({ message: "Enter a valid currency code" });
    if (!lines.length || lines.length > 100) return res.status(400).json({ message: "Add between 1 and 100 transaction lines" });
    if (!Number.isFinite(discountAmount) || discountAmount < 0 || !Number.isFinite(taxAmount) || taxAmount < 0) {
      return res.status(400).json({ message: "Discount and tax amounts must be non-negative numbers" });
    }

    const normalizedLines = lines.map((line) => ({
      ledger_account_id: line.ledgerAccountId == null || line.ledgerAccountId === ""
        ? null
        : String(line.ledgerAccountId),
      amount: Number(line.amount),
      memo: String(line.memo || "").trim() || null,
    }));
    if (normalizedLines.some((line) => (
      (line.ledger_account_id !== null && !/^\d+$/.test(line.ledger_account_id))
      || !Number.isFinite(line.amount)
      || line.amount <= 0
    ))) {
      return res.status(400).json({ message: "Every line needs an amount greater than zero, and any supplied expense account must be valid and active" });
    }
    const accountIds = [...new Set(normalizedLines.map((line) => line.ledger_account_id).filter(Boolean))];
    if (accountIds.length) {
      const { data: validAccounts, error: accountError } = await supabase
        .from("ledger_accounts")
        .select("id")
        .in("id", accountIds)
        .eq("is_active", true)
        .eq("account_type", "expense");
      if (accountError) throw accountError;
      if ((validAccounts || []).length !== accountIds.length) {
        return res.status(400).json({ message: "Choose active expense ledger accounts for all assigned transaction lines" });
      }
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("is_active", true)
      .maybeSingle();
    if (supplierError) throw supplierError;
    if (!supplier) return res.status(400).json({ message: "Choose an active supplier" });

    const subtotal = normalizedLines.reduce((sum, line) => sum + line.amount, 0);
    if (discountAmount > subtotal) return res.status(400).json({ message: "Discount cannot exceed the transaction subtotal" });
    const totalAmount = Number((subtotal - discountAmount + taxAmount).toFixed(2));
    if (totalAmount <= 0) return res.status(400).json({ message: "Transaction total must be greater than zero" });

    const { data: bill, error: billError } = await supabase
      .from("supplier_bills")
      .insert({
        supplier_id: supplierId,
        document_type: documentType,
        reference: String(req.body?.reference || "").trim() || null,
        bill_date: billDate,
        due_date: dueDate,
        payment_terms: String(req.body?.paymentTerms || "").trim() || null,
        currency: currencyCode,
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(discountAmount.toFixed(2)),
        tax_amount: Number(taxAmount.toFixed(2)),
        total_amount: totalAmount,
        bill_received: req.body?.billReceived !== false,
        memo: String(req.body?.memo || "").trim() || null,
        created_by: currentUser.id,
      })
      .select("id")
      .single();
    if (billError) throw billError;
    insertedBillId = bill.id;

    const { error: linesError } = await supabase
      .from("supplier_bill_lines")
      .insert(normalizedLines.map((line) => ({ ...line, supplier_bill_id: bill.id })));
    if (linesError) throw linesError;

    const { data: savedBill, error: savedBillError } = await supabase
      .from("supplier_bills")
      .select(supplierBillSelect)
      .eq("id", bill.id)
      .single();
    if (savedBillError) throw savedBillError;
    return res.status(201).json({ bill: formatSupplierBill(savedBill) });
  } catch (error) {
    if (insertedBillId) {
      const { error: rollbackError } = await supabase.from("supplier_bills").delete().eq("id", insertedBillId);
      if (rollbackError) console.error("Supplier bill cleanup error:", rollbackError);
    }
    console.error("Supplier bill creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to save supplier transaction" });
  }
});

router.patch("/api/supplier-bill-lines/:lineId", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["bills", "write_cheque"]);
    if (!allowed) return res.status(403).json({ message: "Supplier bill permission required" });
    const lineId = String(req.params.lineId || "");
    const accountId = String(req.body?.ledgerAccountId || "");
    if (!/^\d+$/.test(lineId) || !/^\d+$/.test(accountId)) {
      return res.status(400).json({ message: "Select a valid transaction line and ledger account" });
    }
    const { data: account, error: accountError } = await supabase
      .from("ledger_accounts")
      .select("id, code, name, account_type")
      .eq("id", accountId)
      .eq("is_active", true)
      .eq("account_type", "expense")
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) return res.status(400).json({ message: "Choose an active expense ledger account" });

    const { data: line, error } = await supabase
      .from("supplier_bill_lines")
      .update({ ledger_account_id: accountId })
      .eq("id", lineId)
      .select("id, supplier_bill_id, ledger_account_id, amount, memo")
      .maybeSingle();
    if (error) throw error;
    if (!line) return res.status(404).json({ message: "Supplier transaction line not found" });
    return res.json({ line: { ...line, ledger_account: account } });
  } catch (error) {
    console.error("Supplier transaction account update error:", error);
    return res.status(500).json({ message: error?.message || "Unable to update transaction ledger account" });
  }
});

const customerProfileSelect = "id, name, company_name, salutation, first_name, middle_name, last_name, job_title, main_phone, work_phone, mobile_phone, fax, main_email, cc_email, website, other_email, invoice_address, shipping_address, currency, account_number, credit_limit, payment_terms, price_level, preferred_delivery_method, preferred_payment_method, vat_code, vat_registration_number, customer_vat(vat_code, vat_registration_number), customer_type, sales_rep, custom_fields, job_description, job_type, job_status, job_start_date, projected_end_date, job_end_date, email, phone, address, is_active, created_at";
const formatCustomer = (customer) => {
  const { customer_vat: customerVat, ...customerDetails } = customer;
  const vat = Array.isArray(customerVat) ? customerVat[0] : customerVat;
  return {
    ...customerDetails,
    vat_code: vat?.vat_code ?? customer.vat_code ?? null,
    vat_registration_number: vat?.vat_registration_number ?? customer.vat_registration_number ?? null,
  };
};
const customerProfileFields = {
  companyName: "company_name",
  salutation: "salutation",
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  jobTitle: "job_title",
  mainPhone: "main_phone",
  workPhone: "work_phone",
  mobilePhone: "mobile_phone",
  fax: "fax",
  mainEmail: "main_email",
  ccEmail: "cc_email",
  website: "website",
  otherEmail: "other_email",
  invoiceAddress: "invoice_address",
  shippingAddress: "shipping_address",
  currency: "currency",
  accountNumber: "account_number",
  creditLimit: "credit_limit",
  paymentTerms: "payment_terms",
  priceLevel: "price_level",
  preferredDeliveryMethod: "preferred_delivery_method",
  preferredPaymentMethod: "preferred_payment_method",
  vatCode: "vat_code",
  vatRegistrationNumber: "vat_registration_number",
  customerType: "customer_type",
  salesRep: "sales_rep",
  jobDescription: "job_description",
  jobType: "job_type",
  jobStatus: "job_status",
  jobStartDate: "job_start_date",
  projectedEndDate: "projected_end_date",
  jobEndDate: "job_end_date",
};
const buildCustomerPayload = (body) => {
  const payload = {};
  for (const [field, column] of Object.entries(customerProfileFields)) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    const value = body[field];
    if (field === "creditLimit") {
      if (value === "" || value == null) payload[column] = null;
      else {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount < 0) throw new Error("Credit limit must be a non-negative amount");
        payload[column] = amount;
      }
    } else if (["jobStartDate", "projectedEndDate", "jobEndDate"].includes(field)) {
      if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) {
        throw new Error("Job dates must be valid calendar dates");
      }
      payload[column] = String(value || "").trim() || null;
    } else if (field === "mainEmail" || field === "ccEmail" || field === "otherEmail") {
      const email = normalizeEmail(value) || null;
      if (value && !email) throw new Error("Enter a valid customer email address");
      payload[column] = email;
    } else {
      payload[column] = String(value ?? "").trim() || null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "customFields")) {
    if (!body.customFields || typeof body.customFields !== "object" || Array.isArray(body.customFields)) {
      throw new Error("Custom fields must be an object");
    }
    const customFields = Object.entries(body.customFields)
      .map(([key, value]) => [String(key).trim(), String(value ?? "").trim()]);
    if (customFields.some(([key]) => !key)) throw new Error("Custom field names cannot be blank");
    payload.custom_fields = Object.fromEntries(customFields);
  }

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    payload.name = String(body.name ?? "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "mainEmail") || Object.prototype.hasOwnProperty.call(body, "email")) {
    const email = normalizeEmail(body.mainEmail ?? body.email) || null;
    payload.main_email = email;
    payload.email = email;
  }
  if (Object.prototype.hasOwnProperty.call(body, "mainPhone") || Object.prototype.hasOwnProperty.call(body, "phone")) {
    const phone = String(body.mainPhone ?? body.phone ?? "").trim() || null;
    payload.main_phone = phone;
    payload.phone = phone;
  }
  if (Object.prototype.hasOwnProperty.call(body, "invoiceAddress") || Object.prototype.hasOwnProperty.call(body, "address")) {
    const address = String(body.invoiceAddress ?? body.address ?? "").trim() || null;
    payload.invoice_address = address;
    payload.address = address;
  }
  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    if (typeof body.isActive !== "boolean") throw new Error("Customer status must be active or inactive");
    payload.is_active = body.isActive;
  }
  return payload;
};

const isCustomerValidationError = (message) => [
  "Credit limit must be a non-negative amount",
  "Job dates must be valid calendar dates",
  "Enter a valid customer email address",
  "Custom fields must be an object",
  "Custom field names cannot be blank",
  "Customer status must be active or inactive",
].includes(message);

router.get("/api/customers", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["write_cheque", "bills", "invoice"]);
    if (!allowed) return res.status(403).json({ message: "Customer permission required" });
    let query = supabase.from("customers").select(customerProfileSelect);
    if (req.query.includeInactive !== "true") query = query.eq("is_active", true);
    const { data, error } = await query.order("name");
    if (error) throw error;
    return res.json({ customers: (data || []).map(formatCustomer) });
  } catch (error) {
    console.error("Customers lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load customers" });
  }
});

router.post("/api/customers", async (req, res) => {
  try {
    const { currentUser, allowed } = await canUseAccounting(req, ["invoice", "bills"]);
    if (!allowed) return res.status(403).json({ message: "Invoice permission required" });

    const payload = buildCustomerPayload(req.body || {});
    if (!payload.name) return res.status(400).json({ message: "Customer name is required" });

    const { data: existing, error: lookupError } = await supabase
      .from("customers")
      .select("id")
      .ilike("name", payload.name)
      .eq("is_active", true)
      .limit(1);
    if (lookupError) throw lookupError;
    if (existing?.length) return res.status(409).json({ message: "A customer with that name already exists" });

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        ...payload,
        is_active: payload.is_active ?? true,
        currency: payload.currency || "GHS",
        custom_fields: payload.custom_fields || {},
        created_by: currentUser.id,
      })
      .select(customerProfileSelect)
      .single();
    if (error) throw error;
    return res.status(201).json({ customer: formatCustomer(customer) });
  } catch (error) {
    if (isCustomerValidationError(error.message)) return res.status(400).json({ message: error.message });
    console.error("Customer creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to create customer" });
  }
});

router.patch("/api/customers/:id", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["invoice", "bills"]);
    if (!allowed) return res.status(403).json({ message: "Invoice permission required" });
    if (!/^\d+$/.test(String(req.params.id))) return res.status(400).json({ message: "Invalid customer ID" });

    const payload = buildCustomerPayload(req.body || {});
    if (!Object.keys(payload).length) return res.status(400).json({ message: "At least one customer field is required" });
    if (Object.prototype.hasOwnProperty.call(payload, "name") && !payload.name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (payload.name && payload.is_active !== false) {
      const { data: existing, error: lookupError } = await supabase
        .from("customers")
        .select("id")
        .ilike("name", payload.name)
        .eq("is_active", true)
        .neq("id", req.params.id)
        .limit(1);
      if (lookupError) throw lookupError;
      if (existing?.length) return res.status(409).json({ message: "A customer with that name already exists" });
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", req.params.id)
      .select(customerProfileSelect)
      .maybeSingle();
    if (error) throw error;
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json({ customer: formatCustomer(customer) });
  } catch (error) {
    if (isCustomerValidationError(error.message)) return res.status(400).json({ message: error.message });
    console.error("Customer update error:", error);
    return res.status(500).json({ message: error?.message || "Unable to update customer" });
  }
});

const customerInvoiceSelect = "id, customer_id, invoice_number, invoice_date, receivable_account_id, currency, exchange_rate, total_amount, customer_message, memo, status, created_at, customer:customers(id, name, currency), receivable_account:ledger_accounts(id, code, name), lines:customer_invoice_lines(id, line_number, item, description, quantity, rate, amount, income_account_id, income_account:ledger_accounts(id, code, name))";
const formatCustomerInvoice = (invoice) => ({
  ...invoice,
  customer: Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer,
  receivable_account: Array.isArray(invoice.receivable_account)
    ? invoice.receivable_account[0]
    : invoice.receivable_account,
  lines: (invoice.lines || [])
    .map((line) => ({
      ...line,
      income_account: Array.isArray(line.income_account) ? line.income_account[0] : line.income_account,
    }))
    .sort((left, right) => left.line_number - right.line_number),
  open_balance: invoice.status === "open" ? Number(invoice.total_amount || 0) : 0,
});

router.get("/api/customer-invoices", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req, ["invoice", "bills"]);
    if (!allowed) return res.status(403).json({ message: "Invoice permission required" });
    let query = supabase.from("customer_invoices").select(customerInvoiceSelect);
    if (req.query.customerId) {
      if (!/^\d+$/.test(String(req.query.customerId))) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      query = query.eq("customer_id", req.query.customerId);
    }
    const { data, error } = await query
      .order("invoice_date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return res.json({ invoices: (data || []).map(formatCustomerInvoice) });
  } catch (error) {
    console.error("Customer invoices lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load customer transactions" });
  }
});

router.post("/api/customer-invoices", async (req, res) => {
  let createdInvoiceId = null;
  try {
    const { currentUser, allowed } = await canUseAccounting(req, ["invoice", "bills"]);
    if (!allowed) return res.status(403).json({ message: "Invoice permission required" });
    const customerId = String(req.body?.customerId ?? "");
    const invoiceNumber = String(req.body?.invoiceNumber || "").trim();
    const invoiceDate = String(req.body?.invoiceDate || "");
    const accountId = String(req.body?.receivableAccountId ?? "");
    const currencyCode = String(req.body?.currency || "GHS").trim().toUpperCase();
    const exchangeRate = Number(req.body?.exchangeRate ?? 1);
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    if (!/^\d+$/.test(customerId)) return res.status(400).json({ message: "Select a valid customer" });
    if (!invoiceNumber) return res.status(400).json({ message: "Invoice number is required" });
    if (!/^\d+$/.test(accountId)) return res.status(400).json({ message: "Select a valid receivable account" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)
      || Number.isNaN(Date.parse(`${invoiceDate}T00:00:00Z`))) {
      return res.status(400).json({ message: "Enter a valid invoice date" });
    }
    if (!/^[A-Z]{3,10}$/.test(currencyCode)) return res.status(400).json({ message: "Enter a valid currency code" });
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return res.status(400).json({ message: "Exchange rate must be greater than zero" });
    }
    if (!lines.length || lines.length > 100) {
      return res.status(400).json({ message: "Add between 1 and 100 invoice lines" });
    }
    const normalizedLines = lines.map((line, index) => {
      const quantity = Number(line.quantity);
      const rate = Number(line.rate);
      return {
        line_number: index + 1,
        item: String(line.item || "").trim() || null,
        description: String(line.description || "").trim() || null,
        income_account_id: String(line.incomeAccountId ?? ""),
        quantity,
        rate,
        amount: Number((quantity * rate).toFixed(2)),
      };
    });
    if (normalizedLines.some((line) => !Number.isFinite(line.quantity)
      || line.quantity <= 0
      || !Number.isFinite(line.rate)
      || line.rate < 0
      || !/^\d+$/.test(line.income_account_id)
      || !Number.isFinite(line.amount)
      || line.amount <= 0)) {
      return res.status(400).json({ message: "Each invoice line needs a positive quantity and amount, and an income account" });
    }
    const totalAmount = Number(normalizedLines.reduce((sum, line) => sum + line.amount, 0).toFixed(2));

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("is_active", true)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) return res.status(400).json({ message: "Choose an active customer" });

    const { data: account, error: accountError } = await supabase
      .from("ledger_accounts")
      .select("id, code, name")
      .eq("id", accountId)
      .eq("is_active", true)
      .eq("account_type", "asset")
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) return res.status(400).json({ message: "Choose an active receivable account" });

    const incomeAccountIds = [...new Set(normalizedLines.map((line) => line.income_account_id))];
    const { data: incomeAccounts, error: incomeAccountsError } = await supabase
      .from("ledger_accounts")
      .select("id, code, name")
      .in("id", incomeAccountIds)
      .eq("is_active", true)
      .eq("account_type", "income");
    if (incomeAccountsError) throw incomeAccountsError;
    if ((incomeAccounts || []).length !== incomeAccountIds.length) {
      return res.status(400).json({ message: "Choose an active income account for every invoice line" });
    }
    const incomeAccountsById = new Map(incomeAccounts.map((incomeAccount) => [String(incomeAccount.id), incomeAccount]));

    const { data: invoice, error: invoiceError } = await supabase
      .from("customer_invoices")
      .insert({
        customer_id: customerId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        receivable_account_id: accountId,
        currency: currencyCode,
        exchange_rate: exchangeRate,
        total_amount: totalAmount,
        customer_message: String(req.body?.customerMessage || "").trim() || null,
        memo: String(req.body?.memo || "").trim() || null,
        created_by: currentUser.id,
      })
      .select("id")
      .single();
    if (invoiceError) {
      if (invoiceError.code === "23505") {
        return res.status(409).json({ message: "This invoice number is already used for this customer" });
      }
      throw invoiceError;
    }
    createdInvoiceId = invoice.id;

    const { error: linesError } = await supabase
      .from("customer_invoice_lines")
      .insert(normalizedLines.map((line) => ({ ...line, customer_invoice_id: invoice.id })));
    if (linesError) throw linesError;

    const { data: journalEntry, error: journalEntryError } = await supabase
      .from("journal_entries")
      .insert({
        entry_date: invoiceDate,
        reference: invoiceNumber,
        description: `Customer invoice ${invoiceNumber}`,
        source: "invoice",
        customer_invoice_id: invoice.id,
        created_by: currentUser.id,
      })
      .select("id")
      .single();
    if (journalEntryError) throw journalEntryError;

    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        account: `${account.code} - ${account.name}`,
        debit: totalAmount,
        credit: 0,
        memo: `Receivable for invoice ${invoiceNumber}`,
      },
      ...normalizedLines.map((line) => {
        const incomeAccount = incomeAccountsById.get(line.income_account_id);
        return {
          journal_entry_id: journalEntry.id,
          account: `${incomeAccount.code} - ${incomeAccount.name}`,
          debit: 0,
          credit: line.amount,
          memo: line.description || line.item || `Income for invoice ${invoiceNumber}`,
        };
      }),
    ];
    const { error: journalLinesError } = await supabase.from("journal_lines").insert(journalLines);
    if (journalLinesError) throw journalLinesError;

    const { data: savedInvoice, error: savedInvoiceError } = await supabase
      .from("customer_invoices")
      .select(customerInvoiceSelect)
      .eq("id", invoice.id)
      .single();
    if (savedInvoiceError) throw savedInvoiceError;
    return res.status(201).json({ invoice: formatCustomerInvoice(savedInvoice) });
  } catch (error) {
    if (createdInvoiceId) {
      const { error: cleanupError } = await supabase
        .from("customer_invoices")
        .delete()
        .eq("id", createdInvoiceId);
      if (cleanupError) console.error("Customer invoice cleanup error:", cleanupError);
    }
    console.error("Customer invoice creation error:", error);
    return res.status(500).json({ message: error?.message || "Unable to save customer invoice" });
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

router.get("/api/reports/financial", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Report permission required" });
    const year = /^\d{4}$/.test(String(req.query?.year || "")) ? String(req.query.year) : String(new Date().getUTCFullYear());
    const { data: accounts, error: accountError } = await supabase.from("ledger_accounts").select("id, code, name, account_type").eq("is_active", true).order("code");
    if (accountError) throw accountError;
    const { data: entries, error: entriesError } = await supabase.from("journal_entries").select("id, entry_date, reference, description, source, journal_lines(account, debit, credit, memo)").eq("status", "posted");
    if (entriesError) throw entriesError;
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - (11 - index));
      const key = date.toISOString().slice(0, 7);
      return { key, label: date.toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" }) };
    });
    const yearEntries = (entries || []).filter((entry) => String(entry.entry_date || "").startsWith(year));
    const balances = yearEntries.reduce((summary, entry) => {
      (entry.journal_lines || []).forEach((line) => {
        summary[line.account] = (summary[line.account] || 0) + Number(line.debit || 0) - Number(line.credit || 0);
      });
      return summary;
    }, {});
    const rows = (accounts || []).map((account) => {
      const rawBalance = balances[`${account.code} - ${account.name}`] || 0;
      const balance = ["liability", "equity", "income"].includes(account.account_type) ? -rawBalance : rawBalance;
      return { ...account, balance };
    });
    const profitLoss = rows.filter((account) => ["income", "expense"].includes(account.account_type));
    const balanceSheet = rows.filter((account) => ["asset", "liability", "equity"].includes(account.account_type));
    const monthlyRaw = {};
    months.forEach((month) => { monthlyRaw[month.key] = {}; });
    yearEntries.forEach((entry) => {
      const month = String(entry.entry_date || "").slice(0, 7);
      if (!monthlyRaw[month]) return;
      (entry.journal_lines || []).forEach((line) => {
        monthlyRaw[month][line.account] = (monthlyRaw[month][line.account] || 0) + Number(line.debit || 0) - Number(line.credit || 0);
      });
    });
    const monthlyRows = (sourceRows, closing) => sourceRows.map((account) => {
      let cumulative = 0;
      const values = months.map((month) => {
        const raw = monthlyRaw[month.key][`${account.code} - ${account.name}`] || 0;
        const signed = ["liability", "equity", "income"].includes(account.account_type) ? -raw : raw;
        cumulative += signed;
        return closing ? cumulative : signed;
      });
      return { ...account, months: values };
    });
    const monthlyProfitLoss = monthlyRows(profitLoss, false);
    const monthlyBalanceSheet = monthlyRows(balanceSheet, true);
    const monthlyNetProfit = months.map((_, index) => monthlyProfitLoss.reduce((sum, account) => sum + (account.account_type === "income" ? account.months[index] : -account.months[index]), 0));
    return res.json({ year, profitLoss, netProfit: profitLoss.reduce((sum, account) => sum + (account.account_type === "income" ? account.balance : -account.balance), 0), balanceSheet, balanceSheetTotal: balanceSheet.reduce((sum, account) => sum + account.balance, 0), months, monthlyProfitLoss, monthlyBalanceSheet, monthlyNetProfit });
  } catch (error) {
    console.error("Financial report lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load financial reports" });
  }
});

router.get("/api/reports/financial/details", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Report permission required" });
    const account = String(req.query?.account || "").trim();
    const report = String(req.query?.report || "").trim();
    const year = /^\d{4}$/.test(String(req.query?.year || "")) ? String(req.query.year) : String(new Date().getUTCFullYear());
    const month = String(req.query?.month || "").trim();
    const reportTypes = report === "profit-loss" ? ["income", "expense"] : report === "balance-sheet" ? ["asset", "liability", "equity"] : [];
    if (!account && !reportTypes.length) return res.status(400).json({ message: "Account or report is required" });
    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("id, entry_date, reference, description, source, journal_lines(account, debit, credit, memo)")
      .eq("status", "posted")
      .order("entry_date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    const accountNames = reportTypes.length ? (await supabase.from("ledger_accounts").select("code, name").in("account_type", reportTypes)).data || [] : [];
    const reportAccounts = new Set(accountNames.map((item) => `${item.code} - ${item.name}`));
    const details = (entries || []).filter((entry) => String(entry.entry_date).startsWith(year) && (!month || String(entry.entry_date).startsWith(month))).map((entry) => ({
      ...entry,
      lines: (entry.journal_lines || []).filter((line) => account ? line.account === account : reportAccounts.has(line.account)),
    })).filter((entry) => entry.lines.length);
    return res.json({ account, month, entries: details });
  } catch (error) {
    console.error("Financial report detail lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load report details" });
  }
});

router.get("/api/reports/aging", async (req, res) => {
  try {
    const { allowed } = await canUseAccounting(req);
    if (!allowed) return res.status(403).json({ message: "Report permission required" });
    const { data, error } = await supabase
      .from("supplier_bills")
      .select("id, supplier_id, document_type, reference, bill_date, due_date, currency, total_amount, supplier:suppliers(id, name, currency)")
      .order("bill_date", { ascending: true });
    if (error) throw error;
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("customer_invoices")
      .select("id, customer_id, invoice_number, invoice_date, currency, total_amount, status, customer:customers(id, name, currency)")
      .eq("status", "open")
      .order("invoice_date", { ascending: true });
    if (invoiceError) throw invoiceError;
    const suppliersById = new Map();
    for (const bill of data || []) {
      const supplier = Array.isArray(bill.supplier) ? bill.supplier[0] : bill.supplier;
      if (!supplier) continue;
      const ageDays = daysSinceDate(bill.bill_date);
      const signedAmount = Number(bill.total_amount || 0) * (bill.document_type === "credit" ? -1 : 1);
      const summary = suppliersById.get(String(supplier.id)) || {
        supplier_id: supplier.id,
        name: supplier.name,
        currency: supplier.currency || bill.currency || "GHS",
        total: 0,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        transactions: [],
      };
      summary.total += signedAmount;
      if (ageDays <= 30) summary.days1to30 += signedAmount;
      else if (ageDays <= 60) summary.days31to60 += signedAmount;
      else if (ageDays <= 90) summary.days61to90 += signedAmount;
      else summary.over90 += signedAmount;
      summary.transactions.push({
        id: bill.id,
        document_type: bill.document_type,
        reference: bill.reference,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        age_days: ageDays,
        amount: signedAmount,
      });
      suppliersById.set(String(supplier.id), summary);
    }
    const customersById = new Map();
    for (const invoice of invoiceData || []) {
      const customer = Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer;
      if (!customer) continue;
      const ageDays = daysSinceDate(invoice.invoice_date);
      const amount = Number(invoice.total_amount || 0);
      const summary = customersById.get(String(customer.id)) || {
        customer_id: customer.id,
        name: customer.name,
        currency: customer.currency || invoice.currency || "GHS",
        total: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        transactions: [],
      };
      summary.total += amount;
      if (ageDays <= 30) summary.days1to30 += amount;
      else if (ageDays <= 60) summary.days31to60 += amount;
      else if (ageDays <= 90) summary.days61to90 += amount;
      else summary.over90 += amount;
      summary.transactions.push({
        id: invoice.id,
        document_type: "invoice",
        reference: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        age_days: ageDays,
        amount,
      });
      customersById.set(String(customer.id), summary);
    }
    return res.json({
      suppliers: [...suppliersById.values()].filter((supplier) => supplier.total !== 0),
      customers: [...customersById.values()].filter((customer) => customer.total !== 0),
      message: "Supplier and customer aging is calculated from the bill or invoice date. Payment allocations are not yet recorded.",
    });
  } catch (error) {
    console.error("Aging report lookup error:", error);
    return res.status(500).json({ message: error?.message || "Unable to load aging reports" });
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

router.put("/api/employees/:id", uploadProfileImage, async (req, res) => {
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
      invoice = false,
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
        invoice,
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
        invoice: data.invoice,
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
