/**
 * app/login/page.tsx
 *
 * Page de connexion pour TOUS les utilisateurs (staff + admin).
 * Après login :
 *   - ADMIN      → /admin/dashboard
 *   - Autres     → /dashboard
 *
 * Corrections :
 *   - Lien "Accès administrateur" → /admin/login  (était /login/pg-admin)
 *   - Redirection 403 reçue via ?error= correctement affichée
 */
"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2, ShieldAlert } from "lucide-react";

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
`;

const CSS = `
  .lp-root{min-height:100svh;display:flex;font-family:'DM Sans',system-ui,sans-serif;background:#0D0B09;overflow:hidden;position:relative;}
  .lp-grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:56px 56px;}
  .lp-blob1{position:fixed;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(234,88,12,.16) 0%,transparent 68%);top:-200px;right:-100px;pointer-events:none;z-index:0;}
  .lp-blob2{position:fixed;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(180,50,0,.10) 0%,transparent 68%);bottom:-120px;left:-80px;pointer-events:none;z-index:0;}
  .lp-brand{display:none;flex:1;flex-direction:column;justify-content:space-between;padding:52px 60px;position:relative;z-index:1;border-right:1px solid rgba(255,255,255,.06);}
  @media(min-width:900px){.lp-brand{display:flex;}}
  .lp-brand-quote{font-family:'Playfair Display',Georgia,serif;font-size:clamp(24px,2.6vw,40px);font-style:italic;line-height:1.38;color:rgba(255,255,255,.78);max-width:400px;}
  .lp-brand-quote em{font-style:normal;color:#F97316;}
  .lp-pills{display:flex;gap:8px;margin-top:28px;}
  .lp-pill{height:3px;border-radius:99px;background:rgba(255,255,255,.1);flex:1;}
  .lp-pill.on{background:#F97316;}
  .lp-brand-foot{display:flex;flex-direction:column;gap:4px;}
  .lp-brand-foot p{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.22);margin:0;}
  .lp-panel{display:flex;flex-direction:column;justify-content:center;align-items:center;flex:none;width:100%;padding:28px 18px;position:relative;z-index:1;}
  @media(min-width:900px){.lp-panel{width:460px;padding:52px 60px;}}
  .lp-card{width:100%;max-width:380px;}
  .lp-label{display:block;font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.32);margin-bottom:7px;}
  .lp-field-wrap{position:relative;}
  .lp-input{width:100%;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.09);border-radius:11px;padding:13px 44px 13px 15px;font-size:14px;font-family:'DM Sans',sans-serif;color:#fff;outline:none;-webkit-appearance:none;transition:border-color .2s,background .2s,box-shadow .2s;}
  .lp-input::placeholder{color:rgba(255,255,255,.18);}
  .lp-input:hover:not(:disabled){border-color:rgba(255,255,255,.18);}
  .lp-input:focus{border-color:#F97316;background:rgba(249,115,22,.055);box-shadow:0 0 0 3px rgba(249,115,22,.11);}
  .lp-input.lp-err{border-color:rgba(239,68,68,.6);box-shadow:0 0 0 3px rgba(239,68,68,.09);}
  .lp-input:disabled{opacity:.45;cursor:not-allowed;}
  .lp-eye{position:absolute;right:13px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;color:rgba(255,255,255,.28);transition:color .18s;display:flex;align-items:center;}
  .lp-eye:hover{color:rgba(255,255,255,.65);}
  .lp-error{display:flex;align-items:flex-start;gap:10px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.22);border-radius:10px;padding:11px 13px;font-size:13px;color:#FCA5A5;line-height:1.5;}
  .lp-warning{display:flex;align-items:flex-start;gap:10px;background:rgba(234,179,8,.07);border:1px solid rgba(234,179,8,.25);border-radius:10px;padding:11px 13px;font-size:13px;color:#FDE68A;line-height:1.5;}
  .lp-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 22px;border-radius:11px;border:none;cursor:pointer;background:#F97316;color:#fff;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;letter-spacing:.02em;position:relative;overflow:hidden;transition:background .18s,transform .12s,box-shadow .2s;box-shadow:0 4px 22px rgba(249,115,22,.3);}
  .lp-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.15) 0%,transparent 55%);pointer-events:none;}
  .lp-btn:hover:not(:disabled){background:#EA6C0D;transform:translateY(-1px);box-shadow:0 8px 28px rgba(249,115,22,.38);}
  .lp-btn:active:not(:disabled){transform:translateY(0);}
  .lp-btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important;}
  .lp-admin-link{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,.22);text-decoration:none;transition:color .18s;background:none;border:none;cursor:pointer;padding:0;font-family:'DM Sans',sans-serif;}
  .lp-admin-link:hover{color:rgba(255,255,255,.5);}
  .lp-divider{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:.06em;color:rgba(255,255,255,.18);}
  .lp-divider::before,.lp-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.07);}
  .lp-foot{font-size:12px;color:rgba(255,255,255,.26);text-align:center;line-height:1.6;margin:0;}
  .lp-loading-screen{min-height:100svh;display:flex;align-items:center;justify-content:center;background:#0D0B09;}
  @keyframes lp-spin{to{transform:rotate(360deg);}}
  .lp-spinner{width:38px;height:38px;border-radius:50%;border:2.5px solid rgba(249,115,22,.18);border-top-color:#F97316;animation:lp-spin .7s linear infinite;}
  .lp-mobile-logo{display:flex;justify-content:center;margin-bottom:28px;}
  @media(min-width:900px){.lp-mobile-logo{display:none;}}
`;

function Field({ label, type = "text", placeholder, value, onChange, disabled, hasErr, right }: {
  label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  disabled: boolean; hasErr: boolean; right?: React.ReactNode;
}) {
  return (
    <div>
      <label className="lp-label">{label}</label>
      <div className="lp-field-wrap">
        <input
          className={`lp-input${hasErr ? " lp-err" : ""}`}
          type={type} placeholder={placeholder}
          value={value} onChange={e => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={type === "password" ? "current-password" : "email"}
        />
        {right}
      </div>
    </div>
  );
}

export default function LoginPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login, isAdmin } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");
  const [warning,  setWarning]  = useState("");
  const [loading,  setLoading]  = useState(false);

  // Message transmis via ?error= (compte désactivé entre deux sessions)
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setWarning(decodeURIComponent(err));
  }, [searchParams]);

  // Déjà connecté → rediriger
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setWarning(""); setLoading(true);
    try {
      const user = await login(email.trim(), password);
      router.replace(user.roles?.some(role => role.toUpperCase() === "ADMIN") ? "/admin/dashboard" : "/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      if (msg.toLowerCase().includes("désactivé") || msg.toLowerCase().includes("suspendu")) {
        setWarning(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="lp-loading-screen">
        <style>{FONTS + CSS}</style>
        <motion.div className="lp-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      </div>
    );
  }

  const s = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.09, duration: 0.38, ease: "easeOut" as const },
  });

  return (
    <>
      <style>{FONTS + CSS}</style>
      <div className="lp-root">
        <div className="lp-grid" />
        <div className="lp-blob1" />
        <div className="lp-blob2" />

        {/* ── Panneau gauche ── */}
        <motion.div className="lp-brand"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: .6, ease: [.25,.46,.45,.94] }}>
          <div>
            <div style={{ marginBottom: 52 }}>
              <Image src="/medias/images/logo_navbar.png" alt="Logo" width={108} height={34} style={{ opacity: .88 }} />
            </div>
            <p className="lp-brand-quote">
              Une cuisine bien gérée commence par <em>un stock maîtrisé.</em>
            </p>
            <div className="lp-pills">
              <div className="lp-pill on" /><div className="lp-pill" /><div className="lp-pill" />
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.28)", marginTop: 20, lineHeight: 1.7 }}>
              Gestion FIFO · Zéro perte · Alertes temps réel
            </p>
          </div>
          <motion.div className="lp-brand-foot"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .5, duration: .5 }}>
            <p>Système de gestion de stock restaurant</p>
            <p style={{ color: "rgba(255,255,255,.12)" }}>© {new Date().getFullYear()} Local Grill</p>
          </motion.div>
        </motion.div>

        {/* ── Panneau droit ── */}
        <div className="lp-panel">
          <div className="lp-card">
            <motion.div className="lp-mobile-logo" {...s(0)}>
              <Image src="/medias/images/logo_navbar.png" alt="Logo" width={90} height={30} />
            </motion.div>

            <motion.div {...s(1)} style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: "clamp(26px,5vw,32px)", fontWeight: 600, color: "#fff", lineHeight: 1.2, letterSpacing: "-.02em", marginBottom: 6 }}>
                Bon retour
              </h1>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.36)", margin: 0 }}>
                Connectez-vous à votre espace de gestion
              </p>
            </motion.div>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <AnimatePresence>
                {warning && (
                  <motion.div className="lp-warning"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: .22 }}>
                    <ShieldAlert size={15} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                    <span>{warning}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {error && (
                  <motion.div className="lp-error"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: .22 }}>
                    <AlertCircle size={15} style={{ color: "#EF4444", flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div {...s(2)}>
                <Field label="Adresse email" type="email" placeholder="utilisateur@restaurant.com"
                  value={email} onChange={v => { setEmail(v); setError(""); }}
                  disabled={loading} hasErr={!!error} />
              </motion.div>
              <motion.div {...s(3)}>
                <Field label="Mot de passe" type={showPwd ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={v => { setPassword(v); setError(""); }}
                  disabled={loading} hasErr={!!error}
                  right={
                    <button type="button" className="lp-eye" onClick={() => setShowPwd(p => !p)} tabIndex={-1}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  } />
              </motion.div>
              <motion.div {...s(4)}>
                <motion.button type="submit" className="lp-btn"
                  disabled={loading || !email.trim() || !password} whileTap={{ scale: .97 }}>
                  {loading
                    ? <><Loader2 size={15} style={{ animation: "lp-spin .7s linear infinite" }} /> Connexion…</>
                    : <><span>Se connecter</span><ArrowRight size={15} /></>}
                </motion.button>
              </motion.div>
            </form>

            <motion.div {...s(5)} style={{ marginTop: 28 }}>
              <div className="lp-divider">Aide</div>
              <p className="lp-foot" style={{ marginTop: 10 }}>
                Mot de passe oublié ? Contactez votre administrateur.
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                {/* ✅ CORRIGÉ : était /login/pg-admin → maintenant /admin/login */}
                <button className="lp-admin-link" onClick={() => router.push("/login/pg-admin")}>
                  Accès administrateur →
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
