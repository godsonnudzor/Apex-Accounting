import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export const getApiUrl = (path) => {
  const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (import.meta.env.MODE !== "development") return path;
  const baseUrl = rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, "") : "http://localhost:5000";
  return new URL(path, `${baseUrl}/`).toString();
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
