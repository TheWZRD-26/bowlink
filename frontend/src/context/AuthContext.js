import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "bowlink_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (token) => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    fetchUser(token);
  }, [fetchUser]);

  // Appelé après un login ou register réussi
  const handleAuthSuccess = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    fetchUser(token);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    window.location.href = "/";
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const refresh = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    await fetchUser(token);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, refresh, getToken, handleAuthSuccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
