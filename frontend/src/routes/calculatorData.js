import { supabase } from "../lib/supabaseClient";
import { loadBracketData } from "./brackets";

export async function calculatorLoader() { return loadBracketData(); }

export async function calculatorAction({ request }) {
  const formData = await request.formData();
  if (!supabase) return { error: "Connect Supabase to save calculations." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in with Supabase to save calculations." };
  const calculation = JSON.parse(formData.get("calculation"));
  const { error } = await supabase.from("user_saved_calculations").insert({ ...calculation, user_id: user.id, name: formData.get("name") || "Untitled calculation" });
  return error ? { error: error.message } : { saved: true };
}