import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../context/I18nContext";
import { toast } from "sonner";

export default function MatchJoin() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      const { data } = await api.post("/matches/join", { code: code.trim().toUpperCase() });
      navigate(`/match/${data.match_id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || t("match_join.not_found"));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <button data-testid="join-back" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-heading font-black text-xl uppercase tracking-tight">{t("match_join.title")}</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-2">{t("match_join.label")}</div>
        <h1 className="font-heading font-black text-5xl uppercase tracking-tight">{t("match_join.heading")}</h1>
        <p className="mt-3 text-zinc-400">{t("match_join.desc")}</p>

        <input
          data-testid="join-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXXXX"
          maxLength={8}
          className="mt-10 w-full bg-zinc-950 border-2 border-zinc-800 focus:border-cyan-400 outline-none rounded-md px-6 py-6 text-center font-heading font-black text-5xl tracking-[0.3em] uppercase"
        />

        <button
          data-testid="join-submit"
          onClick={join}
          disabled={joining || !code.trim()}
          className="mt-6 w-full bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-8 py-4 rounded-md disabled:opacity-60 transition-colors"
        >
          {joining ? t("match_join.joining") : t("match_join.cta")}
        </button>
      </main>
    </div>
  );
}
