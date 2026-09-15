import { supabase } from "../lib/supabaseClient";

export const demoJurisdiction = { id: "demo-us-2025", name: "United States Federal", country: "US", tax_year: 2025, currency: "USD" };
export const demoBrackets = [["single", 0, 11925, .10], ["single", 11925, 48475, .12], ["single", 48475, 103350, .22], ["single", 103350, 197300, .24], ["single", 197300, 250525, .32], ["single", 250525, 626350, .35], ["single", 626350, null, .37], ["married_joint", 0, 23850, .10], ["married_joint", 23850, 96950, .12], ["married_joint", 96950, 206700, .22], ["married_joint", 206700, 394600, .24], ["married_joint", 394600, 501050, .32], ["married_joint", 501050, 751600, .35], ["married_joint", 751600, null, .37]].map(([filing_status, min_income, max_income, rate], index) => ({ id: `demo-${index}`, jurisdiction_id: demoJurisdiction.id, filing_status, min_income, max_income, rate }));

export async function loadBracketData() {
  if (!supabase) return { jurisdictions: [demoJurisdiction], brackets: demoBrackets, demo: true };
  const [{ data: jurisdictions, error: jurisdictionError }, { data: brackets, error: bracketError }] = await Promise.all([supabase.from("jurisdictions").select("*").order("name"), supabase.from("tax_brackets").select("*").order("min_income")]);
  if (jurisdictionError || bracketError) throw new Response("Unable to load tax data", { status: 502 });
  return { jurisdictions, brackets, demo: false };
}

export async function bracketsLoader() { return loadBracketData(); }