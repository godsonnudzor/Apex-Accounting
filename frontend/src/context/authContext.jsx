import { useEffect, useState } from "react";
import { AuthContext, getApiUrl } from "./auth";

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
  const asBoolean = (value, fallback = false) => {
    if (value === undefined || value === null) return fallback;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return Boolean(value);
  };

  const getPermissions = (employee = user) => {
    if (employee?.role === "admin") return { dashboard: true, writeCheque: true, bills: true, payroll: true, departments: true, salaries: true, reports: true };
    const permissions = employee?.permissions || {};
    return {
      dashboard: asBoolean(permissions.dashboard, true),
      writeCheque: asBoolean(permissions.writeCheque ?? permissions.write_cheque),
      bills: asBoolean(permissions.bills),
      payroll: asBoolean(permissions.payroll),
      departments: asBoolean(permissions.departments),
      salaries: asBoolean(permissions.salaries),
      reports: asBoolean(permissions.reports),
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

export default AuthProvider;