import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { useI18n } from "../context/I18nContext";

export default function Rules() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const items = [
    { key: "qualification", name: t("rules.qualification_name"), body: t("rules.qualification_body") },
    { key: "recurve", name: t("rules.recurve_name"), body: t("rules.recurve_body") },
    { key: "compound", name: t("rules.compound_name"), body: t("rules.compound_body") },
    { key: "solo", name: t("rules.solo_name"), body: t("rules.solo_body") },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button data-testid="rules-back" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-heading font-black text-xl uppercase tracking-tight">{t("rules.title")}</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div>
          <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-2">{t("rules.label")}</div>
          <h1 className="font-heading font-black text-5xl uppercase tracking-tight">{t("rules.title")}</h1>
        </div>

        <div className="space-y-4">
          {items.map((s) => (
            <div key={s.key} data-testid={`rule-${s.key}`} className="bg-zinc-900/50 border border-zinc-800 rounded-md p-5">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-heading font-black text-xl uppercase tracking-tight">{s.name}</h3>
                  <p className="mt-1 text-zinc-300 text-sm leading-relaxed">{s.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
