"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle,
  Loader2, ArrowLeft, ShieldAlert,
} from "lucide-react";

/* ── Fonts & CSS ─────────────────────────────────────────────────── */
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
`;

const CSS = `
  .al-root {
    min-height:100svh; display:flex; align-items:center; justify-content:center;
    background:#0F1117; font-family:'DM Sans',system-ui,sans-serif;
    padding:20px 16px; position:relative; overflow:hidden;
  }
  .al-bg-ring{position:fixed; border-radius:50%; pointer-events:none; border:1px solid rgba(99,102,241,.08);}
  .al-bg-ring-1{width:700px; height:700px; top:50%; left:50%; transform:translate(-50%,-50%);}
  .al-bg-ring-2{width:500px; height:500px; top:50%; left:50%; transform:translate(-50%,-50%); border-color:rgba(99,102,241,.05);}
  .al-blob{position:fixed; pointer-events:none; border-radius:50%; width:480px; height:480px;
    background:radial-gradient(circle,rgba(99,102,241,.10) 0%,transparent 68%); top:-160px; right:-120px;}
  .al-blob2{width:320px; height:320px;
    background:radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 68%); bottom:-100px; left:-80px;}
  .al-card {
    width:100%; max-width:420px;
    background:rgba(255,255,255,.033); border:1px solid rgba(255,255,255,.07);
    border-radius:20px; padding:36px 28px; position:relative; z-index:1;
    box-shadow:0 24px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.04);
    backdrop-filter:blur(12px);
  }
  @media(min-width:480px){.al-card{padding:44px 40px;}}
  /* Step indicator */
  .al-steps{display:flex; align-items:center; gap:0; margin-bottom:32px;}
  .al-step-dot{
    width:28px; height:28px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:700; transition:all .3s; flex-shrink:0;
  }
  .al-step-dot.done{background:rgba(99,102,241,.18); color:#818CF8; border:1.5px solid rgba(99,102,241,.35);}
  .al-step-dot.active{background:#4F46E5; color:#fff; border:1.5px solid #4F46E5; box-shadow:0 0 0 4px rgba(79,70,229,.2);}
  .al-step-dot.idle{background:rgba(255,255,255,.05); color:rgba(255,255,255,.25); border:1.5px solid rgba(255,255,255,.1);}
  .al-step-line{flex:1; height:1.5px; background:rgba(255,255,255,.08); transition:background .4s;}
  .al-step-line.done{background:rgba(99,102,241,.4);}
  /* Labels */
  .al-label{display:block; font-size:10.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.3); margin-bottom:7px;}
  /* Inputs */
  .al-input {
    width:100%; background:rgba(255,255,255,.045); border:1.5px solid rgba(255,255,255,.09);
    border-radius:11px; padding:13px 44px 13px 15px;
    font-size:14px; font-family:'DM Sans',sans-serif; color:#fff;
    outline:none; -webkit-appearance:none;
    transition:border-color .2s,background .2s,box-shadow .2s;
  }
  .al-input::placeholder{color:rgba(255,255,255,.18);}
  .al-input:hover:not(:disabled){border-color:rgba(255,255,255,.18);}
  .al-input:focus{border-color:#4F46E5; background:rgba(79,70,229,.06); box-shadow:0 0 0 3px rgba(79,70,229,.12);}
  .al-input.al-err{border-color:rgba(239,68,68,.5); box-shadow:0 0 0 3px rgba(239,68,68,.09);}
  .al-input:disabled{opacity:.45; cursor:not-allowed;}
  .al-input-icon{
    position:absolute; right:13px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; padding:4px;
    color:rgba(255,255,255,.28); transition:color .18s; display:flex; align-items:center;
  }
  .al-input-icon:hover{color:rgba(255,255,255,.65);}
  /* OTP input */
  .al-otp-input {
    width:100%; background:rgba(255,255,255,.045); border:1.5px solid rgba(255,255,255,.09);
    border-radius:14px; padding:18px 16px; text-align:center;
    font-size:28px; font-weight:700; letter-spacing:16px;
    font-family:'DM Mono',monospace; color:#fff;
    outline:none; -webkit-appearance:none;
    transition:border-color .2s,background .2s,box-shadow .2s;
  }
  .al-otp-input:focus{border-color:#4F46E5; background:rgba(79,70,229,.07); box-shadow:0 0 0 3px rgba(79,70,229,.13);}
  .al-otp-input.al-err{border-color:rgba(239,68,68,.5); box-shadow:0 0 0 3px rgba(239,68,68,.09);}
  .al-otp-input:disabled{opacity:.45; cursor:not-allowed;}
  /* Error / Warning */
  .al-error{
    display:flex; align-items:flex-start; gap:9px;
    background:rgba(239,68,68,.07); border:1px solid rgba(239,68,68,.2);
    border-radius:10px; padding:10px 12px; font-size:13px; color:#FCA5A5; line-height:1.5;
  }
  .al-warning{
    display:flex; align-items:flex-start; gap:9px;
    background:rgba(234,179,8,.07); border:1px solid rgba(234,179,8,.25);
    border-radius:10px; padding:10px 12px; font-size:13px; color:#FDE68A; line-height:1.5;
  }
  /* Buttons */
  .al-btn {
    width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
    padding:13px 22px; border-radius:11px; border:none; cursor:pointer;
    background:#4F46E5; color:#fff; font-size:14px; font-weight:600;
    font-family:'DM Sans',sans-serif; letter-spacing:.02em; position:relative; overflow:hidden;
    transition:background .18s,transform .12s,box-shadow .2s;
    box-shadow:0 4px 20px rgba(79,70,229,.28);
  }
  .al-btn::before{content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.12) 0%,transparent 55%); pointer-events:none;}
  .al-btn:hover:not(:disabled){background:#4338CA; transform:translateY(-1px); box-shadow:0 8px 26px rgba(79,70,229,.38);}
  .al-btn:active:not(:disabled){transform:translateY(0);}
  .al-btn:disabled{opacity:.44; cursor:not-allowed; transform:none!important;}
  .al-btn-ghost{
    background:none; border:none; cursor:pointer; padding:0;
    display:inline-flex; align-items:center; gap:6px;
    font-size:12.5px; font-family:'DM Sans',sans-serif;
    color:rgba(255,255,255,.3); transition:color .18s;
  }
  .al-btn-ghost:hover{color:rgba(255,255,255,.65);}
  .al-back-link{
    display:inline-flex; align-items:center; gap:5px; font-size:12px;
    color:rgba(255,255,255,.2); background:none; border:none; cursor:pointer;
    padding:0; font-family:'DM Sans',sans-serif; transition:color .18s;
  }
  .al-back-link:hover{color:rgba(255,255,255,.5);}
  /* Shield badge */
  .al-shield{
    width:52px; height:52px; border-radius:14px;
    background:rgba(79,70,229,.15); border:1px solid rgba(79,70,229,.3);
    display:flex; align-items:center; justify-content:center; margin-bottom:20px;
  }
  /* Progress bar */
  .al-progress{
    position:absolute; top:0; left:0; right:0; height:2px;
    background:rgba(255,255,255,.06); border-radius:20px 20px 0 0; overflow:hidden;
  }
  .al-progress-fill{
    height:100%; border-radius:99px;
    background:linear-gradient(90deg,#4F46E5,#818CF8);
    transition:width .5s cubic-bezier(.16,1,.3,1);
  }
  @keyframes al-spin{to{transform:rotate(360deg);}}
  .al-spin{animation:al-spin .7s linear infinite;}
  .al-otp-meta{display:flex; justify-content:center; align-items:center; gap:8px; font-size:12px; color:rgba(255,255,255,.25);}
  .al-otp-dot{width:5px; height:5px; border-radius:50%; background:rgba(79,70,229,.6); animation:al-otp-blink 1.2s ease-in-out infinite;}
  @keyframes al-otp-blink{0%,100%{opacity:1}50%{opacity:.3}}
  .al-loading{min-height:100svh; display:flex; align-items:center; justify-content:center; background:#0F1117;}
  .al-spinner{width:36px; height:36px; border-radius:50%; border:2.5px solid rgba(79,70,229,.15); border-top-color:#4F46E5; animation:al-spin .7s linear infinite;}
`;

/* ── Field ───────────────────────────────────────────────────────── */
function Field({ label, type = "text", placeholder, value, onChange, disabled, hasErr, right }: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  disabled: boolean; hasErr: boolean; right?: React.ReactNode;
}) {
  return (
    <div>
      <label className="al-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className={`al-input${hasErr ? " al-err" : ""}`}
          type={type} placeholder={placeholder ?? ""}
          value={value} onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={right ? {} : { paddingRight: 15 }}
        />
        {right}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login, isAdmin } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [otp,      setOtp]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [warning,  setWarning]  = useState("");
  // step "login" = étape 1 (identifiants), "otp" = étape 2 (code OTP)
  const [step,     setStep]     = useState<"login" | "otp">("login");
  const [userId,   setUserId]   = useState<number | null>(null);

  const otpRef = useRef<HTMLInputElement>(null);

  // Déjà connecté admin → rediriger directement
  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdmin)  router.replace("/admin/dashboard");
    if (!isLoading && isAuthenticated && !isAdmin) router.replace("/dashboard");
  }, [isAuthenticated, isLoading, isAdmin, router]);

  // Focus automatique sur le champ OTP quand on arrive à l'étape 2
  useEffect(() => {
    if (step === "otp") setTimeout(() => otpRef.current?.focus(), 350);
  }, [step]);

  /* ── ÉTAPE 1 : vérifier email + mdp, contrôler rôle ADMIN ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setWarning("");
    try {
      // On appelle /api/admin/auth/login (endpoint dédié à l'espace admin)
      // qui répond avec { userId } si les identifiants sont corrects
      // → le token N'EST PAS encore stocké à ce stade
      const res  = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data: { userId?: number; error?: string; skipOtp?: boolean } = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Identifiants incorrects";
        if (msg.toLowerCase().includes("désactivé") || msg.toLowerCase().includes("suspendu")) {
          setWarning(msg);
        } else {
          setError(msg);
        }
        return;
      }

      // En développement local, l'API a déjà vérifié le mot de passe et le rôle ADMIN.
      if (data.skipOtp) {
        await login(email.trim(), password);
        router.replace("/admin/dashboard");
        return;
      }

      // Identifiants OK → passer à l'étape OTP
      setUserId(data.userId ?? null);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  /* ── ÉTAPE 2 : vérifier le code OTP puis finaliser la connexion ── */
  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: otp }),
      });
      const data: { success?: boolean; token?: string; user?: object; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Code OTP invalide ou expiré");
        return;
      }

      // OTP validé → login complet via useAuth (stocke token + user, set cookie)
      await login(email.trim(), password);
      router.replace("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur OTP");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="al-loading">
        <style>{FONTS + CSS}</style>
        <div className="al-spinner" />
      </div>
    );
  }

  const isLoginStep = step === "login";

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.09, duration: 0.38, ease: "easeOut" as const },
  });

  return (
    <>
      <style>{FONTS + CSS}</style>
      <div className="al-root">
        <div className="al-bg-ring al-bg-ring-1" />
        <div className="al-bg-ring al-bg-ring-2" />
        <div className="al-blob" />
        <div className="al-blob al-blob2" />

        <motion.div className="al-card"
          initial={{ opacity: 0, y: 24, scale: .97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: .46, ease: [.25,.46,.45,.94] }}>

          {/* Barre de progression */}
          <div className="al-progress">
            <motion.div className="al-progress-fill"
              animate={{ width: isLoginStep ? "50%" : "100%" }}
              transition={{ duration: .5, ease: [.16,1,.3,1] }} />
          </div>

          {/* Indicateur d'étapes */}
          <div className="al-steps">
            <div className={`al-step-dot ${isLoginStep ? "active" : "done"}`}>
              {isLoginStep ? "1" : "✓"}
            </div>
            <div className={`al-step-line ${!isLoginStep ? "done" : ""}`} />
            <div className={`al-step-dot ${!isLoginStep ? "active" : "idle"}`}>2</div>
          </div>

          {/* Logo */}
          <motion.div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }} {...stagger(0)}>
            <Image src="/medias/images/logo_navbar.png" alt="Logo" width={90} height={30} style={{ opacity: .85 }} />
          </motion.div>

          {/* ══════════ ÉTAPE 1 — Identifiants ══════════ */}
          <AnimatePresence mode="wait">
            {isLoginStep && (
              <motion.div key="login"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} transition={{ duration: .32, ease: [.25,.46,.45,.94] }}>

                <div style={{ marginBottom: 28 }}>
                  <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,4vw,27px)", fontWeight: 600, color: "#fff", letterSpacing: "-.02em", marginBottom: 4, lineHeight: 1.2 }}>
                    Espace administrateur
                  </h1>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.32)", margin: 0 }}>
                    Authentification sécurisée en deux étapes
                  </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <AnimatePresence>
                    {warning && (
                      <motion.div className="al-warning"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: .2 }}>
                        <ShieldAlert size={14} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 2 }} />
                        <span>{warning}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {error && (
                      <motion.div className="al-error"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: .2 }}>
                        <AlertCircle size={14} style={{ color: "#EF4444", flexShrink: 0, marginTop: 2 }} />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div {...stagger(1)}>
                    <Field label="Email administrateur" type="email" placeholder="admin@restaurant.com"
                      value={email} onChange={v => { setEmail(v); setError(""); setWarning(""); }}
                      disabled={loading} hasErr={!!error} />
                  </motion.div>
                  <motion.div {...stagger(2)}>
                    <Field label="Mot de passe" type={showPwd ? "text" : "password"} placeholder="••••••••"
                      value={password} onChange={v => { setPassword(v); setError(""); }}
                      disabled={loading} hasErr={!!error}
                      right={
                        <button type="button" className="al-input-icon"
                          onClick={() => setShowPwd(p => !p)} tabIndex={-1}>
                          {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      } />
                  </motion.div>
                  <motion.div {...stagger(3)}>
                    <motion.button type="submit" className="al-btn"
                      disabled={loading || !email || !password} whileTap={{ scale: .97 }}>
                      {loading
                        ? <><Loader2 size={15} className="al-spin" /> Vérification…</>
                        : <><span>Continuer</span><ArrowRight size={15} /></>}
                    </motion.button>
                  </motion.div>
                </form>

                {/* Lien retour vers login utilisateur */}
                <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                  <button className="al-back-link" onClick={() => router.push("/")}>
                    <ArrowLeft size={12} /> Connexion utilisateur
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══════════ ÉTAPE 2 — OTP ══════════ */}
            {!isLoginStep && (
              <motion.div key="otp"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }} transition={{ duration: .32, ease: [.25,.46,.45,.94] }}>

                {/* Shield icon */}
                <motion.div
                  initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 16 }}>
                  <div className="al-shield">
                    <ShieldCheck size={24} style={{ color: "#818CF8" }} />
                  </div>
                </motion.div>

                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(20px,4vw,25px)", fontWeight: 600, color: "#fff", letterSpacing: "-.02em", marginBottom: 4, lineHeight: 1.2 }}>
                    Vérification OTP
                  </h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.32)", margin: 0 }}>
                    Saisissez le code à 6 chiffres envoyé à{" "}
                    <strong style={{ color: "rgba(255,255,255,.5)" }}>{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <AnimatePresence>
                    {error && (
                      <motion.div className="al-error"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: .2 }}>
                        <AlertCircle size={14} style={{ color: "#EF4444", flexShrink: 0, marginTop: 2 }} />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 }}>
                    <label className="al-label">Code de vérification</label>
                    <input
                      ref={otpRef}
                      className={`al-otp-input${error ? " al-err" : ""}`}
                      type="text" inputMode="numeric" pattern="[0-9]*"
                      placeholder="——————" maxLength={6}
                      value={otp}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "");
                        setOtp(v);
                        if (v.length === 6) setError("");
                      }}
                      disabled={loading} autoComplete="one-time-code"
                    />
                    <div className="al-otp-meta" style={{ marginTop: 10 }}>
                      <div className="al-otp-dot" />
                      <span>Code valide pendant 10 minutes</span>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }}>
                    <motion.button type="submit" className="al-btn"
                      disabled={loading || otp.length < 6} whileTap={{ scale: .97 }}>
                      {loading
                        ? <><Loader2 size={15} className="al-spin" /> Vérification…</>
                        : <><ShieldCheck size={15} /><span>Valider</span></>}
                    </motion.button>
                  </motion.div>

                  {/* Retour à l'étape 1 */}
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
                    <button type="button" className="al-btn-ghost"
                      onClick={() => { setStep("login"); setOtp(""); setError(""); }}>
                      <ArrowLeft size={13} /> Retour à la connexion
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </>
  );
}
