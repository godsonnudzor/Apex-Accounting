import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export const getApiUrl = (path) => {
  const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (import.meta.env.MODE !== "development") return path;
  const baseUrl = rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, "") : "http://localhost:4000";
  return new URL(path, `${baseUrl}/`).toString();
};

export const readApiResponse = async (response) => {
  const body = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch {
      return { message: `The API returned invalid JSON (${response.status})` };
    }
  }
  return {
    message: `The API returned an HTML or text response (${response.status}). Check the Vercel API deployment.`,
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
