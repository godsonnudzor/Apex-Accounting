import { calculateTax } from "./taxCalculator";

export const GHANA_PAYROLL_RATES = {
  ssnitEmployee: 0.055,
  tier2Employee: 0,
  ssnitEmployer: 0.13,
  tier2Employer: 0.05,
};

export const GHANA_MONTHLY_BRACKETS = [
  [0, 490, 0],
  [490, 600, 0.05],
  [600, 730, 0.1],
  [730, 3896.67, 0.175],
  [3896.67, 19896.67, 0.25],
  [19896.67, 50416.67, 0.3],
  [50416.67, null, 0.35],
].map(([min_income, max_income, rate], id) => ({
  id: `ghana-${id}`,
  filing_status: "single",
  min_income,
  max_income,
  rate,
}));

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

export function calculateGhanaPayroll(employee, rates = GHANA_PAYROLL_RATES) {
  const basicPay = Math.max(0, Number(employee.basic_pay) || 0);
  const allowance = Math.max(0, Number(employee.allowance) || 0);
  const grossPay = money(basicPay + allowance);
  const ssnitEmployee = money(basicPay * rates.ssnitEmployee);
  const tier2Employee = money(basicPay * rates.tier2Employee);
  const taxablePay = Math.max(0, grossPay - ssnitEmployee - tier2Employee);
  const paye = money(calculateTax({ grossIncome: taxablePay, brackets: GHANA_MONTHLY_BRACKETS }).totalTax);
  const totalEmployeeDeductions = money(ssnitEmployee + tier2Employee + paye);
  const netPay = money(grossPay - totalEmployeeDeductions);
  const ssnitEmployer = money(basicPay * rates.ssnitEmployer);
  const tier2Employer = money(basicPay * rates.tier2Employer);
  const totalEmployerContributions = money(ssnitEmployer + tier2Employer);

  return {
    employeeId: employee.id,
    basicPay,
    allowance,
    grossPay,
    ssnitEmployee,
    tier2Employee,
    paye,
    totalEmployeeDeductions,
    netPay,
    ssnitEmployer,
    tier2Employer,
    totalEmployerContributions,
    employerCost: money(grossPay + totalEmployerContributions),
  };
}

export function calculatePayrollTotals(entries) {
  return entries.reduce((totals, entry) => {
    totals.gross += entry.grossPay;
    totals.paye += entry.paye;
    totals.deductions += entry.totalEmployeeDeductions;
    totals.net += entry.netPay;
    totals.employerContributions += entry.totalEmployerContributions;
    totals.employerCost += entry.employerCost;
    return totals;
  }, { gross: 0, paye: 0, deductions: 0, net: 0, employerContributions: 0, employerCost: 0 });
}