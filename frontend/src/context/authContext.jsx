import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const permissionDefaults = { dashboard: true, writeCheque: false, bills: false, reports: false };

export const getApiUrl = (path) => {
  const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (import.meta.env.MODE !== "development") return path;
  const baseUrl = rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, "") : "http://localhost:5000";
  return new URL(path, `${baseUrl}/`).toString();
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/me"), { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        return result.user || null;
      })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await fetch(getApiUrl("/api/login"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        typeof result === "object"
          ? result?.Error || result?.message || "Login failed"
          : result || "Login failed",
      );
    }

    const currentUserResponse = await fetch(getApiUrl("/api/me"), {
      credentials: "include",
    });
    const currentUser = currentUserResponse.ok
      ? (await currentUserResponse.json()).user
      : null;
    setUser(currentUser);
    return currentUser;
  };

  const logout = () => setUser(null);
  const getPermissions = (employee = user) => {
    if (employee?.role === "admin") return { dashboard: true, writeCheque: true, bills: true, reports: true };
    const permissions = employee?.permissions || {};
    return {
      dashboard: permissions.dashboard ?? true,
      writeCheque: permissions.writeCheque ?? permissions.write_cheque ?? false,
      bills: permissions.bills ?? false,
      reports: permissions.reports ?? false,
    };
  };
  const updatePermissions = async (userId, nextPermissions) => {
    const response = await fetch(getApiUrl(`/api/users/${userId}/permissions`), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextPermissions),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to update permissions");
    return result.permissions;
  };
  const hasPermission = (permission) => Boolean(getPermissions(user)[permission]);
  return (
    <AuthContext.Provider value={{ user,
    loading,
    login,
    logout,
    getPermissions,
    updatePermissions,
    hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};

export default AuthProvider;