import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Flag, Undo2 } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../context/I18nContext";
import { toast } from "sonner";
import ScorePad, { formatArrow, arrowColor } from "../components/ScorePad";

function endTotal(end) {
  return (end || []).reduce((s, v) => s + (v || 0), 0);
}

export default function SoloLive() {
  const { soloId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [s, setS] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/solo/${soloId}`);
      setS(data);
    } catch {}
  };

  useEffect(() => { load(); }, [soloId]); // eslint-disable-line

  const nextSlot = useMemo(() => {
    if (!s) return null;
    for (let e = 0; e < s.scores.length; e++) {
      for (let a = 0; a < s.scores[e].length; a++) {
        if (s.scores[e][a] === null || s.scores[e][a] === undefined) return [e, a];
      }
    }
    return null;
  }, [s]);

  const total = useMemo(() => (s?.scores || []).reduce((x, end) => x + endTotal(end), 0), [s]);

  const submit = async (value, isX) => {
    if (!nextSlot || s.status !== "active") return;
    const [e, a] = nextSlot;
    try {
      const { data } = await api.post(`/solo/${soloId}/score`, { end_index: e, arrow_index: a, value, is_x: isX });
      setS(data);
    } catch { toast.error(t("solo_live.submit_error")); }
  };

  const undo = async () => {
    if (!s) return;
    let last = null;
    for (let e = s.scores.length - 1; e >= 0; e--) {
      for (let a = s.scores[e].length - 1; a >= 0; a--) {
        if (s.scores[e][a] !== null && s.scores[e][a] !== undefined) { last = [e, a]; break; }
      }
      if (last) break;
    }
    if (!last) return;
    try {
      const { data } = await api.post(`/solo/${soloId}/score/reset`, { end_index: last[0], arrow_index: last[1] });
      setS(data);
    } catch { toast.error(t("match_live.reset_error")); }
  };

  const finish = async () => {
    try {
      const { data } = await api.post(`/solo/${soloId}/finish`);
      setS(data);
      toast.success(t("solo_live.toast_finished"));
    } catch {}
  };

  if (!s) return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
      <div className="text-zinc-500 uppercase tracking-widest">{t("common.loading")}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button data-testid="solo-back-live" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Solo</div>
              <div className="font-heading font-black text-lg uppercase tracking-tight">{s.status}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("solo_live.total")}</div>
            <div data-testid="solo-total" className="font-heading font-black text-3xl text-cyan-400 tabular-nums">{total}</div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-4 md:p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 uppercase text-xs tracking-[0.2em]">
                <th className="text-left pb-3 pr-3">{t("solo_live.end")}</th>
                {s.scores[0].map((_, i) => <th key={i} className="pb-3 px-1">A{i + 1}</th>)}
                <th className="pb-3 px-2">S</th>
              </tr>
            </thead>
            <tbody>
              {s.scores.map((end, ei) => (
                <tr key={ei} className="border-t border-zinc-800">
                  <td className="py-2 pr-3 text-zinc-400 font-heading font-bold">{ei + 1}</td>
                  {end.map((v, ai) => (
                    <td key={ai} className="py-2 px-1">
                      <div className={`h-10 w-10 md:h-11 md:w-11 rounded-md flex items-center justify-center font-heading font-black ${arrowColor(v, s.is_x?.[ei]?.[ai])}`}>
                        {formatArrow(v, s.is_x?.[ei]?.[ai])}
                      </div>
                    </td>
                  ))}
                  <td className="py-2 px-2 font-heading font-black text-cyan-400 text-lg tabular-nums">{endTotal(end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {s.status === "active" && nextSlot && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              {t("solo_live.end")} <span className="text-white font-bold">{nextSlot[0] + 1}</span> - {t("solo_live.arrow")} <span className="text-white font-bold">{nextSlot[1] + 1}</span>
            </div>
            <ScorePad onScore={submit} />
            <button
              data-testid="solo-undo-btn"
              onClick={undo}
              className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-red-500/50 hover:text-red-400 text-zinc-300 font-bold uppercase tracking-wide px-6 py-4 rounded-md transition-all"
            >
              <Undo2 className="h-5 w-5" /> {t("match_live.reset_last")}
            </button>
          </div>
        )}

        {s.status === "active" && !nextSlot && (
          <button data-testid="solo-finish" onClick={finish} className="inline-flex items-center gap-2 bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-6 py-3 rounded-md">
            <Flag className="h-4 w-4" /> {t("solo_live.finish")}
          </button>
        )}

        {s.status === "finished" && (
          <div className="bg-zinc-900/50 border border-cyan-400/30 rounded-md p-6 text-center">
            <div className="text-cyan-400 text-xs uppercase tracking-[0.3em]">{t("solo_live.finished")}</div>
            <div className="mt-2 font-heading font-black text-3xl uppercase">{t("solo_live.final")} {total}</div>
          </div>
        )}

        {s.status === "active" && (
          <div className="text-right">
            <button data-testid="solo-end-early" onClick={finish} className="text-zinc-500 hover:text-white text-xs uppercase tracking-[0.2em]">{t("solo_live.end_early")}</button>
          </div>
        )}
      </main>
    </div>
  );
}