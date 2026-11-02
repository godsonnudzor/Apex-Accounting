import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export const getApiUrl = (path) => {
  const apiPath = path.replace(/\/+$/, "") || "/";
  const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (import.meta.env.MODE !== "development") return apiPath;
  const baseUrl = rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, "") : "http://localhost:4000";
  return new URL(apiPath, `${baseUrl}/`).toString();
};

export const readApiResponse = async (response) => {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    const summary = body
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const detail = summary ? `: ${summary}` : "";
    throw new Error(
      `The API returned a non-JSON response (HTTP ${response.status})${detail}. Check that the backend API route is deployed and reachable.`,
    );
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
