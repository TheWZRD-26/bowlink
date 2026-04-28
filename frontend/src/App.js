import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Rules from "./pages/Rules";
import MatchCreate from "./pages/MatchCreate";
import MatchJoin from "./pages/MatchJoin";
import MatchLive from "./pages/MatchLive";
import SoloSetup from "./pages/SoloSetup";
import SoloLive from "./pages/SoloLive";
import History from "./pages/History";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-zinc-500 uppercase tracking-[0.3em]">
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0A0A0A]" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
      <Route path="/match/create" element={<ProtectedRoute><MatchCreate /></ProtectedRoute>} />
      <Route path="/match/join" element={<ProtectedRoute><MatchJoin /></ProtectedRoute>} />
      <Route path="/match/:matchId" element={<ProtectedRoute><MatchLive /></ProtectedRoute>} />
      <Route path="/solo/setup" element={<ProtectedRoute><SoloSetup /></ProtectedRoute>} />
      <Route path="/solo/:soloId" element={<ProtectedRoute><SoloLive /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster theme="dark" position="top-center" richColors />
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}

export default App;
