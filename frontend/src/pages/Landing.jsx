import React, { useState } from "react";
import { Target, ChevronRight, Zap, Trophy, Users, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import api from "../lib/api";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/f7f94b26-065a-4f6e-be2e-e2c997afd0ff/images/f045bc91870ed88b24ac3e3a6655ec4da09de7b1fdaaabc58b1d90af73a3b17e.png";

export default function Landing() {
  const { handleAuthSuccess } = useAuth();
  const { t, lang, setLang, languages } = useI18n();

  const [mode, setMode] = useState(null); // null | "login" | "register"
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setIdentifiant(""); setPin(""); setName(""); setError(""); setShowPin(false);
  };

  const openMode = (m) => { resetForm(); setMode(m); };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login"
        ? { identifiant, pin }
        : { identifiant, pin, name };
      const { data } = await api.post(endpoint, payload);
      handleAuthSuccess(data.token);
    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white grain relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/50 to-[#0A0A0A]" />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/5">
        <div className="flex items-center gap-2" data-testid="brand-logo">
          <Target className="h-6 w-6 text-cyan-400" strokeWidth={2.5} />
          <span className="font-heading font-black text-2xl uppercase tracking-tight">BowLink</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-xs">
            {languages.map((l) => (
              <button
                key={l.code}
                data-testid={`landing-lang-${l.code}`}
                onClick={() => setLang(l.code)}
                className={`px-2 py-1 rounded uppercase tracking-wider ${lang === l.code ? "text-cyan-400" : "text-zinc-500 hover:text-white"}`}
              >
                {l.code}
              </button>
            ))}
          </div>
          <button
            data-testid="header-login-button"
            onClick={() => openMode("login")}
            className="text-zinc-400 hover:text-white text-sm uppercase tracking-[0.2em] transition-colors"
          >
            {t("landing.sign_in")}
          </button>
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-12 pt-16 md:pt-24 pb-32 max-w-6xl mx-auto">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs uppercase tracking-[0.2em]">
          <Zap className="h-3 w-3" /> {t("landing.tagline")}
        </div>
        <h1
          data-testid="landing-title"
          className="font-heading font-black text-6xl sm:text-7xl md:text-8xl uppercase leading-[0.9] tracking-tight max-w-4xl"
        >
          {t("landing.title_1")}
          <br />
          <span className="text-cyan-400">{t("landing.title_2")}</span>
          <br />
          {t("landing.title_3")}
        </h1>
        <p className="mt-8 text-zinc-400 text-lg md:text-xl max-w-2xl leading-relaxed">
          {t("landing.desc")}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <button
            data-testid="main-login-button"
            onClick={() => openMode("register")}
            className="group inline-flex items-center justify-center gap-3 bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase tracking-wide px-8 py-4 rounded-md transition-all"
          >
            Créer un compte
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => openMode("login")}
            className="inline-flex items-center justify-center gap-2 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 font-bold uppercase tracking-wide px-8 py-4 rounded-md transition-all"
          >
            Se connecter
          </button>
        </div>

        {/* ===== FORMULAIRE ===== */}
        {mode && (
          <div className="mt-12 max-w-sm">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
              {/* Onglets */}
              <div className="flex gap-2 mb-6">
                {["login", "register"].map((m) => (
                  <button
                    key={m}
                    onClick={() => openMode(m)}
                    className={`flex-1 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-colors ${
                      mode === m
                        ? "bg-cyan-400 text-black"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {m === "login" ? "Connexion" : "Inscription"}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {/* Nom (inscription seulement) */}
                {mode === "register" && (
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1">Nom affiché</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="ex : Robin des Bois"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 text-sm"
                    />
                  </div>
                )}

                {/* Identifiant */}
                <div>
                  <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1">Identifiant</label>
                  <input
                    type="text"
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ex : robin42"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 text-sm"
                  />
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1">
                    PIN {mode === "register" && "(min 4 chiffres)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      onKeyDown={handleKeyDown}
                      placeholder="••••"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 pr-10 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 text-sm tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Erreur */}
                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Bouton submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-black font-bold uppercase tracking-wide py-2.5 rounded-md transition-colors text-sm"
                >
                  {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Trophy, title: t("landing.feature_qual_title"), desc: t("landing.feature_qual_desc") },
            { icon: Users, title: t("landing.feature_match_title"), desc: t("landing.feature_match_desc") },
            { icon: Target, title: t("landing.feature_solo_title"), desc: t("landing.feature_solo_desc") },
          ].map((f, i) => (
            <div
              key={i}
              className="group bg-zinc-900/50 border border-zinc-800 hover:border-cyan-400/40 rounded-md p-6 backdrop-blur-sm transition-all"
            >
              <f.icon className="h-6 w-6 text-cyan-400 mb-4" strokeWidth={2} />
              <h3 className="font-heading font-black text-2xl uppercase tracking-tight">{f.title}</h3>
              <p className="mt-2 text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
