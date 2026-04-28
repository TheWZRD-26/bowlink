import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Check, Play, Flag, Undo2, Crown, X as XIcon } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { toast } from "sonner";
import ScorePad, { formatArrow, arrowColor } from "../components/ScorePad";
import { DEFAULT_AVATAR } from "../lib/avatars";

function endTotal(end) {
  return (end || []).reduce((s, v) => s + (v || 0), 0);
}
function endFilled(end) {
  return (end || []).every((v) => v !== null && v !== undefined);
}
function playerArrowTotal(scores) {
  return (scores || []).reduce((s, end) => s + endTotal(end), 0);
}

function recurveSetPoints(a, b) {
  let pa = 0, pb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (!endFilled(a[i]) || !endFilled(b[i])) continue;
    const ta = endTotal(a[i]), tb = endTotal(b[i]);
    if (ta > tb) pa += 2;
    else if (tb > ta) pb += 2;
    else { pa += 1; pb += 1; }
  }
  return [pa, pb];
}

function allArrowsFilled(match) {
  return match.players.every((p) => p.scores.every(endFilled));
}

function tiebreakState(match) {
  if (match.players.length !== 2) return "none";
  if (match.manual_winner_id) return "resolved";
  if (!allArrowsFilled(match)) return "none";
  const [a, b] = match.players;
  const isRecurve = match.settings.format === "recurve";
  let tied = false;
  if (isRecurve) {
    const [pa, pb] = recurveSetPoints(a.scores, b.scores);
    tied = pa === pb;
  } else {
    tied = playerArrowTotal(a.scores) === playerArrowTotal(b.scores);
  }
  if (!tied) return "none";
  const so = match.shootoff || {};
  const soA = so[a.user_id];
  const soB = so[b.user_id];
  if (!soA || !soB) return "shootoff";
  if (soA.value > soB.value) return "resolved";
  if (soB.value > soA.value) return "resolved";
  if (soA.is_x && !soB.is_x) return "resolved";
  if (soB.is_x && !soA.is_x) return "resolved";
  return "manual";
}

function computeWinnerId(match) {
  if (match.players.length !== 2) return null;
  if (match.manual_winner_id) return match.manual_winner_id;
  if (!allArrowsFilled(match)) return null;
  const [a, b] = match.players;
  const isRecurve = match.settings.format === "recurve";
  if (isRecurve) {
    const [pa, pb] = recurveSetPoints(a.scores, b.scores);
    if (pa > pb) return a.user_id;
    if (pb > pa) return b.user_id;
  } else {
    const ta = playerArrowTotal(a.scores), tb = playerArrowTotal(b.scores);
    if (ta > tb) return a.user_id;
    if (tb > ta) return b.user_id;
  }
  const so = match.shootoff || {};
  const soA = so[a.user_id]; const soB = so[b.user_id];
  if (soA && soB) {
    if (soA.value > soB.value) return a.user_id;
    if (soB.value > soA.value) return b.user_id;
    if (soA.is_x && !soB.is_x) return a.user_id;
    if (soB.is_x && !soA.is_x) return b.user_id;
  }
  return null;
}

function lastCompletedEndIndex(match) {
  if (match.players.length !== 2) return -1;
  const [a, b] = match.players;
  let last = -1;
  const n = Math.min(a.scores.length, b.scores.length);
  for (let i = 0; i < n; i++) {
    if (endFilled(a.scores[i]) && endFilled(b.scores[i])) last = i;
  }
  return last;
}

export default function MatchLive() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [match, setMatch] = useState(null);
  const [copied, setCopied] = useState(false);
  const [opponentPulse, setOpponentPulse] = useState(false);
  const lastSigRef = useRef("");
  const [endConfirmModal, setEndConfirmModal] = useState(null);
  const lastConfirmedEndRef = useRef(-1);

  const load = async () => {
    try {
      const { data } = await api.get(`/matches/${matchId}`);
      const sig = JSON.stringify([
        data.players.map((p) => p.scores),
        data.shootoff || null,
        data.manual_winner_id || null,
      ]);
      if (lastSigRef.current && lastSigRef.current !== sig) {
        setOpponentPulse(true);
        setTimeout(() => setOpponentPulse(false), 700);
      }
      lastSigRef.current = sig;
      setMatch(data);
      if (
        data.settings.format === "recurve" &&
        data.players.length === 2 &&
        data.status === "active"
      ) {
        const completedEnd = lastCompletedEndIndex(data);
        if (completedEnd > lastConfirmedEndRef.current) {
          const [a, b] = data.players;
          const [pa, pb] = recurveSetPoints(a.scores, b.scores);
          setEndConfirmModal({ endIndex: completedEnd, pa, pb, playerA: a, playerB: b, shouldFinish: pa >= 6 || pb >= 6 });
          lastConfirmedEndRef.current = completedEnd;
        }
      }
    } catch {}
  };

  useEffect(() => {
    load();
    const intv = setInterval(load, 2000);
    return () => clearInterval(intv);
    // eslint-disable-next-line
  }, [matchId]);

  const me = useMemo(() => match?.players.find((p) => p.user_id === user?.user_id), [match, user]);
  const isHost = match && user && match.host_id === user.user_id;
  const tb = match ? tiebreakState(match) : "none";
  const winnerId = match ? computeWinnerId(match) : null;
  const isRecurve = match?.settings?.format === "recurve";
  const setPoints = isRecurve && match?.players?.length === 2
    ? recurveSetPoints(match.players[0].scores, match.players[1].scores) : null;

  const nextSlot = useMemo(() => {
    if (!me) return null;
    for (let e = 0; e < me.scores.length; e++) {
      for (let a = 0; a < me.scores[e].length; a++) {
        if (me.scores[e][a] === null || me.scores[e][a] === undefined) return [e, a];
      }
    }
    return null;
  }, [me]);

  const submit = async (value, isX) => {
    if (!nextSlot || match.status !== "active") return;
    const [e, a] = nextSlot;
    try {
      const { data } = await api.post(`/matches/${matchId}/score`, { end_index: e, arrow_index: a, value, is_x: isX });
      setMatch(data);
    } catch { toast.error(t("match_live.submit_error")); }
  };

  const submitShootoff = async (value, isX) => {
    try {
      const { data } = await api.post(`/matches/${matchId}/shootoff`, { value, is_x: isX });
      setMatch(data);
      toast.success(t("match_live.shootoff_shot"));
    } catch { toast.error(t("match_live.submit_error")); }
  };

  const declareWinner = async (uid) => {
    try {
      const { data } = await api.post(`/matches/${matchId}/manual-winner`, { user_id: uid });
      setMatch(data);
      toast.success(t("match_live.winner_declared"));
    } catch {}
  };

  const undo = async () => {
    if (!me) return;
    let last = null;
    for (let e = me.scores.length - 1; e >= 0; e--) {
      for (let a = me.scores[e].length - 1; a >= 0; a--) {
        if (me.scores[e][a] !== null && me.scores[e][a] !== undefined) { last = [e, a]; break; }
      }
      if (last) break;
    }
    if (!last) return;
    try {
      const { data } = await api.post(`/matches/${matchId}/score/reset`, { end_index: last[0], arrow_index: last[1] });
      setMatch(data);
    } catch { toast.error(t("match_live.reset_error")); }
  };

  const start = async () => {
    try { await api.post(`/matches/${matchId}/start`); toast.success(t("match_live.started")); load(); }
    catch { toast.error(t("match_live.start_error")); }
  };

  const finish = async () => {
    try { await api.post(`/matches/${matchId}/finish`); toast.success(t("match_live.finished_toast")); load(); }
    catch { toast.error(t("match_live.finish_error")); }
  };

  const handleEndConfirm = async () => {
    const shouldFinish = endConfirmModal?.shouldFinish;
    setEndConfirmModal(null);
    if (shouldFinish) await finish();
  };

  const copy = () => {
    if (!match) return;
    navigator.clipboard.writeText(match.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!match) return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
      <div className="text-zinc-500 uppercase tracking-widest">{t("common.loading")}</div>
    </div>
  );

  const statusLabel = match.status === "waiting" ? t("match_live.waiting")
    : match.status === "active" ? t("match_live.live")
    : t("match_live.finished");

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A] grain text-white">
        <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button data-testid="match-back" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t(`format.${match.settings.format}`)}</div>
                <div className="font-heading font-black text-lg uppercase tracking-tight" data-testid="match-status">{statusLabel}</div>
              </div>
            </div>
            <button data-testid="room-code" onClick={copy} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-md">
              <span className="font-heading font-black text-xl tracking-[0.2em] text-cyan-400">{match.code}</span>
              {copied ? <Check className="h-4 w-4 text-cyan-400" /> : <Copy className="h-4 w-4 text-zinc-400" />}
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
          <div className={`grid grid-cols-1 ${match.players.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            {match.players.map((p, i) => {
              const arrowTotal = playerArrowTotal(p.scores);
              const isMe = p.user_id === user?.user_id;
              const mainScore = isRecurve && setPoints ? setPoints[i] : arrowTotal;
              const isWinner = winnerId === p.user_id;
              return (
                <div key={p.user_id} data-testid={`player-card-${i}`}
                  className={`rounded-md p-4 border transition-all ${isWinner ? "border-[#FDE047]/60 bg-[#FDE047]/5" : isMe ? "border-cyan-400/50 bg-cyan-400/5" : "border-zinc-800 bg-zinc-900/50"} ${!isMe && opponentPulse ? "pulse-cyan" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                      <img src={p.picture || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 truncate flex items-center gap-1">
                        {isMe ? t("match_live.you") : t("match_live.opponent")}
                        {isWinner && <Crown className="h-3 w-3 text-[#FDE047]" />}
                      </div>
                      <div className="font-heading font-black text-lg uppercase truncate">{p.nickname}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-heading font-black text-4xl tabular-nums ${isWinner ? "text-[#FDE047]" : "text-cyan-400"}`} data-testid={`player-total-${i}`}>{mainScore}</div>
                      {isRecurve && <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">{t("match_live.set_points")}</div>}
                    </div>
                  </div>
                  {isRecurve && (
                    <div className="mt-2 text-xs text-zinc-400 flex justify-between">
                      <span className="uppercase tracking-[0.15em]">{t("match_live.total_arrows")}</span>
                      <span className="font-heading font-black text-white tabular-nums">{arrowTotal}</span>
                    </div>
                  )}
                  {match.shootoff?.[p.user_id] && (
                    <div className="mt-2 pt-2 border-t border-zinc-800 text-xs uppercase tracking-[0.15em] flex justify-between">
                      <span className="text-zinc-400">{t("match_live.tiebreak_title")}</span>
                      <span className={`font-heading font-black ${arrowColor(match.shootoff[p.user_id].value, match.shootoff[p.user_id].is_x)} px-2 rounded`}>
                        {formatArrow(match.shootoff[p.user_id].value, match.shootoff[p.user_id].is_x)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {match.status === "waiting" && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-6 text-center">
              <div className="text-zinc-400 text-sm uppercase tracking-[0.2em] mb-2">{t("match_live.share_code")}</div>
              <div className="font-heading font-black text-5xl md:text-6xl tracking-[0.3em] text-cyan-400">{match.code}</div>
              <div className="mt-2 text-zinc-500 text-sm">{match.players.length} {t("match_live.players_joined")}</div>
              {isHost && (
                <button data-testid="start-match" onClick={start} className="mt-6 inline-flex items-center gap-2 bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-8 py-3 rounded-md transition-colors">
                  <Play className="h-4 w-4" /> {t("match_live.start_match")}
                </button>
              )}
            </div>
          )}

          {match.status !== "waiting" && (
            <>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-4 md:p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 uppercase text-xs tracking-[0.2em]">
                      <th className="text-left pb-3 pr-3">{t("match_live.end")}</th>
                      {match.players[0].scores[0].map((_, i) => (<th key={i} className="pb-3 px-1">A{i + 1}</th>))}
                      <th className="pb-3 px-2">S</th>
                      {isRecurve && match.players.length === 2 && <th className="pb-3 px-2">Set</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(me?.scores || []).map((end, ei) => {
                      let setTag = null;
                      if (isRecurve && match.players.length === 2) {
                        const other = match.players.find((p) => p.user_id !== user.user_id);
                        if (other && endFilled(end) && endFilled(other.scores[ei])) {
                          const ta = endTotal(end), tb = endTotal(other.scores[ei]);
                          setTag = ta > tb ? "2" : tb > ta ? "0" : "1";
                        }
                      }
                      return (
                        <tr key={ei} className="border-t border-zinc-800">
                          <td className="py-2 pr-3 text-zinc-400 font-heading font-bold">{ei + 1}</td>
                          {end.map((v, ai) => (
                            <td key={ai} className="py-2 px-1">
                              <div className={`h-10 w-10 md:h-11 md:w-11 rounded-md flex items-center justify-center font-heading font-black ${arrowColor(v, me?.is_x?.[ei]?.[ai])}`}>
                                {formatArrow(v, me?.is_x?.[ei]?.[ai])}
                              </div>
                            </td>
                          ))}
                          <td className="py-2 px-2 font-heading font-black text-cyan-400 text-lg tabular-nums">{endTotal(end)}</td>
                          {isRecurve && match.players.length === 2 && (
                            <td className="py-2 px-2 font-heading font-black text-[#FDE047] tabular-nums">{setTag ?? "-"}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {match.status === "active" && nextSlot && tb === "none" && (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                    {t("match_live.end")} <span className="text-white font-bold">{nextSlot[0] + 1}</span> - {t("match_live.arrow")} <span className="text-white font-bold">{nextSlot[1] + 1}</span>
                  </div>
                  <ScorePad onScore={submit} disabled={match.status !== "active"} />
                  <button data-testid="undo-btn" onClick={undo} className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-red-500/50 hover:text-red-400 text-zinc-300 font-bold uppercase tracking-wide px-6 py-4 rounded-md transition-all">
                    <Undo2 className="h-5 w-5" /> {t("match_live.reset_last")}
                  </button>
                </div>
              )}

              {match.status === "active" && tb === "shootoff" && (
                <div className="bg-[#FDE047]/5 border-2 border-[#FDE047]/40 rounded-md p-6 space-y-4" data-testid="shootoff-panel">
                  <div>
                    <div className="text-[#FDE047] text-xs uppercase tracking-[0.3em]">{t("match_live.tiebreak_title")}</div>
                    <h3 className="font-heading font-black text-3xl uppercase tracking-tight mt-1">
                      {isRecurve ? t("match_live.tiebreak_desc_recurve") : t("match_live.tiebreak_desc_compound")}
                    </h3>
                  </div>
                  {match.shootoff?.[user.user_id]
                    ? <div className="text-zinc-400 text-sm uppercase tracking-[0.2em]">{t("match_live.shootoff_waiting")}</div>
                    : <ScorePad onScore={submitShootoff} />}
                </div>
              )}

              {match.status === "active" && tb === "manual" && isHost && (
                <div className="bg-zinc-900/50 border-2 border-[#FDE047]/40 rounded-md p-6 space-y-4" data-testid="manual-winner-panel">
                  <div>
                    <div className="text-[#FDE047] text-xs uppercase tracking-[0.3em]">{t("match_live.tiebreak_title")}</div>
                    <h3 className="font-heading font-black text-2xl uppercase tracking-tight mt-1">{t("match_live.still_tied")}</h3>
                    <p className="mt-2 text-zinc-300">{t("match_live.who_closest")}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {match.players.map((p) => (
                      <button key={p.user_id} data-testid={`declare-winner-${p.user_id}`} onClick={() => declareWinner(p.user_id)}
                        className="flex items-center gap-3 bg-zinc-950 hover:bg-[#FDE047]/10 border-2 border-zinc-800 hover:border-[#FDE047] rounded-md p-4 transition-all">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-zinc-900">
                          <img src={p.picture || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-heading font-black text-xl uppercase">{p.nickname}</div>
                          <div className="text-xs uppercase tracking-[0.2em] text-[#FDE047]">{t("match_live.declare_winner")}</div>
                        </div>
                        <Crown className="h-5 w-5 text-[#FDE047]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {match.status === "active" && tb === "manual" && !isHost && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-6" data-testid="manual-winner-waiting">
                  <div className="text-[#FDE047] text-xs uppercase tracking-[0.3em]">{t("match_live.tiebreak_title")}</div>
                  <h3 className="font-heading font-black text-2xl uppercase tracking-tight mt-1">{t("match_live.still_tied")}</h3>
                  <p className="mt-2 text-zinc-400 text-sm uppercase tracking-[0.2em]">{t("match_live.shootoff_waiting")}</p>
                </div>
              )}

              {(tb === "resolved" || match.status === "finished") && winnerId && (
                <div className="bg-[#FDE047]/10 border-2 border-[#FDE047]/50 rounded-md p-6 text-center space-y-2" data-testid="winner-banner">
                  <Crown className="h-8 w-8 text-[#FDE047] mx-auto" />
                  <div className="text-[#FDE047] text-xs uppercase tracking-[0.3em]">{t("match_live.winner")}</div>
                  <div className="font-heading font-black text-4xl uppercase tracking-tight">
                    {match.players.find((p) => p.user_id === winnerId)?.nickname}
                  </div>
                  {isHost && match.manual_winner_id && match.status === "active" && (
                    <button data-testid="cancel-winner" onClick={() => declareWinner("")} className="mt-2 inline-flex items-center gap-1 text-zinc-400 hover:text-white text-xs uppercase tracking-[0.2em]">
                      <XIcon className="h-3 w-3" /> {t("match_live.cancel_winner")}
                    </button>
                  )}
                  {isHost && match.status === "active" && (
                    <div>
                      <button data-testid="finish-match" onClick={finish} className="mt-3 inline-flex items-center gap-2 bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-6 py-3 rounded-md transition-colors">
                        <Flag className="h-4 w-4" /> {t("match_live.finish_match")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {match.status === "active" && !nextSlot && tb === "none" && !winnerId && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-6 text-center">
                  <div className="font-heading font-black text-2xl uppercase">{t("match_live.all_shot")}</div>
                  {isHost && (
                    <button data-testid="finish-match" onClick={finish} className="mt-4 inline-flex items-center gap-2 bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-6 py-3 rounded-md transition-colors">
                      <Flag className="h-4 w-4" /> {t("match_live.finish_match")}
                    </button>
                  )}
                </div>
              )}

              {match.status === "finished" && !winnerId && (
                <div className="bg-zinc-900/50 border border-cyan-400/30 rounded-md p-6 text-center">
                  <div className="text-cyan-400 text-xs uppercase tracking-[0.3em]">{t("match_live.finished")}</div>
                  <div className="mt-2 font-heading font-black text-3xl uppercase">{t("match_live.final_score")} {me ? playerArrowTotal(me.scores) : 0}</div>
                </div>
              )}

              {isHost && match.status === "active" && (
                <div className="text-right">
                  <button data-testid="host-finish-early" onClick={finish} className="text-zinc-500 hover:text-white text-xs uppercase tracking-[0.2em]">
                    {t("match_live.end_match")}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {endConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#111] border border-zinc-700 rounded-xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div>
              <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-1">Arc classique - Volee {endConfirmModal.endIndex + 1}</div>
              <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white">
                {endConfirmModal.shouldFinish ? "Match termine !" : "Confirmation du score"}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[endConfirmModal.playerA, endConfirmModal.playerB].map((p, i) => {
                const pts = i === 0 ? endConfirmModal.pa : endConfirmModal.pb;
                const isWinner = endConfirmModal.shouldFinish && pts >= 6;
                return (
                  <div key={p.user_id} className={`rounded-lg p-3 border text-center ${isWinner ? "border-[#FDE047]/60 bg-[#FDE047]/10" : "border-zinc-800 bg-zinc-900"}`}>
                    <div className="text-xs uppercase tracking-[0.15em] text-zinc-400 truncate mb-1">{p.nickname}</div>
                    <div className={`font-heading font-black text-4xl tabular-nums ${isWinner ? "text-[#FDE047]" : "text-cyan-400"}`}>{pts}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">set pts</div>
                    {isWinner && <Crown className="h-4 w-4 text-[#FDE047] mx-auto mt-1" />}
                  </div>
                );
              })}
            </div>
            {endConfirmModal.shouldFinish
              ? <p className="text-zinc-300 text-sm text-center">Un archer a atteint <span className="text-[#FDE047] font-bold">6 points</span> — le match se termine automatiquement.</p>
              : <p className="text-zinc-400 text-sm text-center">Ces scores sont-ils corrects ?</p>}
            <div className="flex gap-3">
              {!endConfirmModal.shouldFinish && (
                <button onClick={() => setEndConfirmModal(null)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold uppercase tracking-wide py-3 rounded-md text-sm transition-colors">
                  Corriger
                </button>
              )}
              <button onClick={handleEndConfirm}
                className={`flex-1 ${endConfirmModal.shouldFinish ? "bg-[#FDE047] hover:bg-yellow-300 text-black" : "bg-cyan-400 hover:bg-cyan-300 text-black"} font-bold uppercase tracking-wide py-3 rounded-md text-sm transition-colors`}>
                {endConfirmModal.shouldFinish ? "Terminer le match" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}