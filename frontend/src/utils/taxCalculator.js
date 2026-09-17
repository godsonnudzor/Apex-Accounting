export function calculateTax({
  grossIncome,
  filingStatus = "single",
  brackets,
}) {
  const income = Math.max(0, Number(grossIncome) || 0);
  const applicableBrackets = (brackets || [])
    .filter((bracket) => bracket.filing_status === filingStatus)
    .sort((a, b) => Number(a.min_income) - Number(b.min_income));
  let totalTax = 0;
  const breakdown = applicableBrackets
    .map((bracket) => {
      const lower = Number(bracket.min_income);
      const upper =
        bracket.max_income == null ? income : Number(bracket.max_income);
      const taxableIncome = Math.max(0, Math.min(income, upper) - lower);
      const tax = taxableIncome * Number(bracket.rate);
      totalTax += tax;
      return {
        ...bracket,
        taxableIncome,
        tax,
        share: income ? taxableIncome / income : 0,
      };
    })
    .filter((bracket) => bracket.taxableIncome > 0);
  const marginalBracket = applicableBrackets.find(
    (bracket) =>
      income > Number(bracket.min_income) &&
      (bracket.max_income == null || income <= Number(bracket.max_income)),
  );
  const marginalRate = marginalBracket ? Number(marginalBracket.rate) : 0;
  return {
    grossIncome: income,
    totalTax,
    effectiveRate: income ? totalTax / income : 0,
    marginalRate,
    netIncome: income - totalTax,
    breakdown,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("ghs", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatPercent(value) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}
