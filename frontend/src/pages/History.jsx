import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Target as TargetIcon, Swords, Trophy, Trash2 } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../context/I18nContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const ICONS = {
  qualification: Trophy,
  recurve: Swords,
  compound: TargetIcon,
  solo: TargetIcon,
};

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function History() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/history");
      setItems(data.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/history/${toDelete.type}/${toDelete.id}`);
      setItems((prev) => prev.filter((x) => x.id !== toDelete.id));
      toast.success(t("history.deleted"));
    } catch {
      toast.error(t("history.delete_error"));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button data-testid="history-back" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-heading font-black text-xl uppercase tracking-tight">{t("history.title")}</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        <div>
          <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-2">{t("history.label")}</div>
          <h1 className="font-heading font-black text-5xl uppercase tracking-tight">{t("history.heading")}</h1>
        </div>

        {loading && <div className="text-zinc-500 uppercase tracking-widest">{t("common.loading")}</div>}

        {!loading && items.length === 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-10 text-center">
            <Clock className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <div className="text-zinc-400">{t("history.empty")}</div>
          </div>
        )}

        <div className="space-y-2">
          {items.map((it) => {
            const Icon = ICONS[it.format] || TargetIcon;
            return (
              <div
                key={it.id}
                data-testid={`history-item-${it.id}`}
                className="group flex items-center gap-3 bg-zinc-900/30 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md transition-all"
              >
                <button
                  onClick={() => navigate(it.type === "match" ? `/match/${it.id}` : `/solo/${it.id}`)}
                  className="flex-1 flex items-center gap-4 text-left px-4 py-4"
                >
                  <div className="h-10 w-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="font-heading font-black uppercase tracking-tight text-lg">{t(`format.${it.format}`)}</div>
                      <div className={`text-xs uppercase tracking-[0.2em] px-2 py-0.5 rounded ${it.status === "finished" ? "bg-cyan-400/10 text-cyan-400" : "bg-zinc-800 text-zinc-400"}`}>
                        {it.status}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-500 mt-1">
                      {fmtDate(it.created_at)}
                      {it.type === "match" && it.players && <> · {it.players.length} {t("history.players_suffix")}</>}
                      {it.code && <> · <span className="font-mono tracking-widest">{it.code}</span></>}
                    </div>
                  </div>
                  <div className="text-zinc-600 text-xs uppercase tracking-[0.2em] hidden sm:block">{t("history.open")}</div>
                </button>
                <button
                  data-testid={`history-delete-${it.id}`}
                  onClick={(e) => { e.stopPropagation(); setToDelete(it); }}
                  title={t("history.delete")}
                  className="mr-3 p-2 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent data-testid="delete-dialog" className="bg-zinc-950 border border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-black text-2xl uppercase tracking-tight">{t("history.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">{t("history.delete_confirm_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel" className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800">
              {t("history.delete_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-confirm"
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deleting ? "..." : t("history.delete_ok")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
