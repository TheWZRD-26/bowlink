import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../context/I18nContext";
import { toast } from "sonner";

export default function SoloSetup() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [ends, setEnds] = useState(6);
  const [arrows, setArrows] = useState(6);
  const [creating, setCreating] = useState(false);

  const start = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/solo", {
        settings: { format: "solo", ends, arrows_per_end: arrows, set_system: false, sets: 5 },
      });
      navigate(`/solo/${data.solo_id}`);
    } catch {
      toast.error(t("solo_setup.error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button data-testid="solo-back" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-heading font-black text-xl uppercase tracking-tight">{t("solo_setup.title")}</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-2">{t("solo_setup.label")}</div>
          <h1 className="font-heading font-black text-5xl uppercase tracking-tight">{t("solo_setup.heading")}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 block mb-2">{t("solo_setup.ends")}</label>
            <input data-testid="solo-ends" type="number" min={1} max={30} value={ends}
              onChange={(e) => setEnds(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 outline-none rounded-md px-4 py-3 text-lg" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 block mb-2">{t("solo_setup.arrows_per_end")}</label>
            <input data-testid="solo-arrows" type="number" min={1} max={6} value={arrows}
              onChange={(e) => setArrows(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 outline-none rounded-md px-4 py-3 text-lg" />
          </div>
        </div>
        <button data-testid="solo-start" onClick={start} disabled={creating}
          className="bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-10 py-4 rounded-md disabled:opacity-60 transition-colors">
          {creating ? t("solo_setup.creating") : t("solo_setup.cta")}
        </button>
      </main>
    </div>
  );
}
