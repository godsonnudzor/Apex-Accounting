import { supabase } from "../lib/supabaseClient";

export const demoJurisdiction = {
  id: "demo-gh-2025",
  name: "Ghana",
  country: "GH",
  tax_year: 2026,
  currency: "GHS",
};
export const demoBrackets = [
  ["single", 0, 490, 0.0],
  ["single", 490, 600, 0.05],
  ["single", 600, 730, 0.1],
  ["single", 730, 3896.67, 0.175],
  ["single", 3896.67, 19896.67, 0.25],
  ["single", 19896.67, 50416.67, 0.3],
  ["single", 50416.67, null, 0.35],
].map(([filing_status, min_income, max_income, rate], index) => ({
  id: `demo-${index}`,
  jurisdiction_id: demoJurisdiction.id,
  filing_status,
  min_income,
  max_income,
  rate,
}));

export async function loadBracketData() {
  if (!supabase)
    return {
      jurisdictions: [demoJurisdiction],
      brackets: demoBrackets,
      demo: true,
    };
  const [
    { data: jurisdictions, error: jurisdictionError },
    { data: brackets, error: bracketError },
  ] = await Promise.all([
    supabase.from("jurisdictions").select("*").order("name"),
    supabase.from("tax_brackets").select("*").order("min_income"),
  ]);
  if (jurisdictionError || bracketError)
    throw new Response("Unable to load tax data", { status: 502 });
  return { jurisdictions, brackets, demo: false };
}

export async function bracketsLoader() {
  return loadBracketData();
}
