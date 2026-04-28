import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Swords, Target as TargetIcon } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../context/I18nContext";
import { toast } from "sonner";

export default function MatchCreate() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const FORMATS = [
    { id: "qualification", label: t("match_create.qualification"), icon: Trophy, color: "text-[#FDE047]", desc: t("match_create.qualification_desc"), defaults: { ends: 12, arrows_per_end: 6, set_system: false, sets: 5 } },
    { id: "recurve", label: t("match_create.recurve"), icon: Swords, color: "text-cyan-400", desc: t("match_create.recurve_desc"), defaults: { ends: 5, arrows_per_end: 3, set_system: true, sets: 5 } },
    { id: "compound", label: t("match_create.compound"), icon: TargetIcon, color: "text-[#EF4444]", desc: t("match_create.compound_desc"), defaults: { ends: 5, arrows_per_end: 3, set_system: false, sets: 5 } },
  ];

  const [format, setFormat] = useState(FORMATS[0]);
  const [ends, setEnds] = useState(FORMATS[0].defaults.ends);
  const [arrows, setArrows] = useState(FORMATS[0].defaults.arrows_per_end);
  const [creating, setCreating] = useState(false);

  const pick = (f) => {
    setFormat(f);
    setEnds(f.defaults.ends);
    setArrows(f.defaults.arrows_per_end);
  };

  const create = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/matches", {
        settings: {
          format: format.id,
          ends,
          arrows_per_end: arrows,
          set_system: format.defaults.set_system,
          sets: format.defaults.sets,
        },
      });
      navigate(`/match/${data.match_id}`);
    } catch {
      toast.error(t("match_create.error_create"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button data-testid="create-back" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-heading font-black text-xl uppercase tracking-tight">{t("match_create.title")}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div>
          <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-2">{t("match_create.step1")}</div>
          <h1 className="font-heading font-black text-5xl uppercase tracking-tight">{t("match_create.step1_title")}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FORMATS.map((f) => {
            const active = f.id === format.id;
            return (
              <button
                key={f.id}
                data-testid={`format-${f.id}`}
                onClick={() => pick(f)}
                className={`text-left rounded-md p-6 border-2 transition-all ${active ? "border-cyan-400 bg-cyan-400/5" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"}`}
              >
                <f.icon className={`h-6 w-6 ${f.color} mb-3`} strokeWidth={2} />
                <h3 className="font-heading font-black text-2xl uppercase tracking-tight">{f.label}</h3>
                <p className="mt-2 text-sm text-zinc-400">{f.desc}</p>
              </button>
            );
          })}
        </div>

        <div>
          <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-2">{t("match_create.step2")}</div>
          <h2 className="font-heading font-black text-3xl uppercase tracking-tight">{t("match_create.step2_title")}</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 block mb-2">
                {format.defaults.set_system ? t("match_create.sets") : t("match_create.ends")}
              </label>
              <input
                data-testid="input-ends"
                type="number"
                min={1}
                max={20}
                value={ends}
                onChange={(e) => setEnds(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 outline-none rounded-md px-4 py-3 text-lg"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 block mb-2">{t("match_create.arrows_per_end")}</label>
              <input
                data-testid="input-arrows"
                type="number"
                min={1}
                max={6}
                value={arrows}
                onChange={(e) => setArrows(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 outline-none rounded-md px-4 py-3 text-lg"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-800">
          <button
            data-testid="create-match-button"
            disabled={creating}
            onClick={create}
            className="bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-10 py-4 rounded-md disabled:opacity-60 transition-colors"
          >
            {creating ? t("match_create.creating") : t("match_create.cta_create")}
          </button>
        </div>
      </main>
    </div>
  );
}
