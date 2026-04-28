import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Check, Globe } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { PRESET_AVATARS, DEFAULT_AVATAR } from "../lib/avatars";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const { t, lang, setLang, languages } = useI18n();
  const [nickname, setNickname] = useState("");
  const [selected, setSelected] = useState(null);
  const [customAvatar, setCustomAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || "");
      setSelected(user.picture || DEFAULT_AVATAR);
      setCustomAvatar(user.custom_avatar || null);
    }
  }, [user]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("settings.image_too_big"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomAvatar(reader.result);
      setSelected(null);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/profile", {
        nickname: nickname.trim() || user.name,
        picture: selected,
        custom_avatar: customAvatar || "",
      });
      await refresh();
      toast.success(t("settings.saved"));
      navigate("/dashboard");
    } catch {
      toast.error(t("settings.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = customAvatar || selected || DEFAULT_AVATAR;

  return (
    <div className="min-h-screen bg-[#0A0A0A] grain text-white">
      <header className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button data-testid="settings-back" onClick={() => navigate("/dashboard")} className="p-2 hover:bg-zinc-900 rounded-md">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-heading font-black text-xl uppercase tracking-tight">{t("settings.title")}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <div>
          <div className="text-cyan-400 text-xs uppercase tracking-[0.3em] mb-2">{t("settings.identity")}</div>
          <h1 className="font-heading font-black text-5xl uppercase tracking-tight">{t("settings.your_id")}</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-zinc-900 border-2 border-cyan-400/40 overflow-hidden flex items-center justify-center">
            <img src={currentAvatar} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2 block">{t("settings.nickname")}</label>
            <input
              data-testid="nickname-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("settings.nickname_placeholder")}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none rounded-md px-4 py-3 text-lg"
            />
          </div>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl uppercase tracking-tight mb-4">{t("settings.preset_avatars")}</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {PRESET_AVATARS.map((a, i) => (
              <button
                key={a.id}
                data-testid={`preset-avatar-${i}`}
                onClick={() => { setSelected(a.src); setCustomAvatar(null); }}
                title={a.label}
                className={`relative aspect-square rounded-md overflow-hidden bg-zinc-900 border-2 transition-all ${selected === a.src && !customAvatar ? "border-cyan-400" : "border-zinc-800 hover:border-zinc-600"}`}
              >
                <img src={a.src} alt={a.label} className="h-full w-full object-cover" />
                {selected === a.src && !customAvatar && (
                  <div className="absolute top-1 right-1 bg-cyan-400 text-black rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl uppercase tracking-tight mb-4">{t("settings.custom_upload")}</h2>
          <label className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-5 py-3 rounded-md cursor-pointer transition-colors">
            <Upload className="h-4 w-4 text-cyan-400" />
            <span className="uppercase text-sm tracking-wide">{t("settings.upload_btn")}</span>
            <input data-testid="avatar-upload" type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
          {customAvatar && (
            <div className="mt-4 text-sm text-cyan-400" data-testid="custom-avatar-selected">{t("settings.custom_selected")}</div>
          )}
        </div>

        <div>
          <h2 className="font-heading font-black text-2xl uppercase tracking-tight mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-400" /> {t("settings.language")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <button
                key={l.code}
                data-testid={`lang-${l.code}`}
                onClick={() => setLang(l.code)}
                className={`px-5 py-2.5 rounded-full border-2 text-sm uppercase tracking-wider font-bold transition-all ${lang === l.code ? "border-cyan-400 bg-cyan-400/10 text-cyan-400" : "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-800">
          <button
            data-testid="save-profile"
            disabled={saving}
            onClick={save}
            className="bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-8 py-4 rounded-md disabled:opacity-60 transition-colors"
          >
            {saving ? t("common.saving") : t("settings.save_profile")}
          </button>
        </div>
      </main>
    </div>
  );
}
