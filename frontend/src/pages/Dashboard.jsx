import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Target, Clock, Settings as SettingsIcon, LogOut, Plus, LogIn, BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { resolveAvatar } from "../lib/avatars";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="brand-link">
            <Target className="h-5 w-5 text-cyan-400" strokeWidth={2.5} />
            <span className="font-heading font-black text-xl uppercase tracking-tight">BowLink</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/settings" data-testid="nav-settings" className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-colors">
              <div className="h-7 w-7 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                <img src={resolveAvatar(user)} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="text-sm font-medium">{user?.nickname || user?.name}</span>
              <SettingsIcon className="h-4 w-4 text-zinc-500 ml-1" />
            </Link>
            <button data-testid="nav-logout" onClick={logout} className="text-zinc-400 hover:text-white p-2 rounded-md hover:bg-zinc-900 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <div className="mb-12">
          <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">{t("dashboard.control_room")}</div>
          <h1 data-testid="dashboard-title" className="font-heading font-black text-5xl sm:text-6xl uppercase tracking-tight">
            {t("dashboard.welcome")} <span className="text-cyan-400">{user?.nickname || user?.name}</span>
          </h1>
          <p className="mt-3 text-zinc-400 max-w-xl">{t("dashboard.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5">
          <button
            data-testid="tile-host-match"
            onClick={() => navigate("/match/create")}
            className="group md:col-span-4 md:row-span-2 text-left bg-gradient-to-br from-cyan-400/10 to-cyan-400/5 hover:from-cyan-400/20 border border-cyan-400/30 rounded-md p-8 md:p-10 min-h-[280px] transition-all relative overflow-hidden"
          >
            <div className="absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl group-hover:bg-cyan-400/20 transition-all" />
            <Plus className="h-8 w-8 text-cyan-400 mb-6" strokeWidth={2} />
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-2">{t("dashboard.tile_new_match")}</div>
            <h2 className="font-heading font-black text-5xl md:text-6xl uppercase tracking-tight leading-none">{t("dashboard.tile_host")}</h2>
            <p className="mt-4 text-zinc-300 max-w-md">{t("dashboard.tile_host_desc")}</p>
          </button>

          <button
            data-testid="tile-join-match"
            onClick={() => navigate("/match/join")}
            className="md:col-span-2 text-left bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md p-6 min-h-[135px] transition-all"
          >
            <LogIn className="h-6 w-6 text-white mb-3" strokeWidth={2} />
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">{t("dashboard.tile_join_label")}</div>
            <h3 className="font-heading font-black text-3xl uppercase tracking-tight mt-1">{t("dashboard.tile_join_title")}</h3>
          </button>

          <button
            data-testid="tile-solo"
            onClick={() => navigate("/solo/setup")}
            className="md:col-span-2 text-left bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md p-6 min-h-[135px] transition-all"
          >
            <Target className="h-6 w-6 text-[#FDE047] mb-3" strokeWidth={2} />
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">{t("dashboard.tile_solo_label")}</div>
            <h3 className="font-heading font-black text-3xl uppercase tracking-tight mt-1">{t("dashboard.tile_solo_title")}</h3>
          </button>

          <button
            data-testid="tile-history"
            onClick={() => navigate("/history")}
            className="md:col-span-3 text-left bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md p-6 min-h-[135px] transition-all"
          >
            <Clock className="h-6 w-6 text-white mb-3" strokeWidth={2} />
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">{t("dashboard.tile_history_label")}</div>
            <h3 className="font-heading font-black text-3xl uppercase tracking-tight mt-1">{t("dashboard.tile_history_title")}</h3>
            <p className="mt-1 text-sm text-zinc-500">{t("dashboard.tile_history_desc")}</p>
          </button>

          <button
            data-testid="tile-rules"
            onClick={() => navigate("/rules")}
            className="md:col-span-3 text-left bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md p-6 min-h-[135px] transition-all"
          >
            <BookOpen className="h-6 w-6 text-white mb-3" strokeWidth={2} />
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">{t("dashboard.tile_rules_label")}</div>
            <h3 className="font-heading font-black text-3xl uppercase tracking-tight mt-1">{t("dashboard.tile_rules_title")}</h3>
            <p className="mt-1 text-sm text-zinc-500">{t("dashboard.tile_rules_desc")}</p>
          </button>
        </div>
      </main>
    </div>
  );
}
