import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { Card } from "./ui.jsx";
import { TAP_PRESS } from "../lib/motion.js";

const inputClass =
  "w-full rounded-xl border border-hairline bg-transparent px-3 py-2 text-[14px] dark:border-hairline-dark dark:text-ink-dark";

export default function Login() {
  const { login, registrar } = useAuth();
  const [modo, setModo] = useState("login"); // login | registro
  const [form, setForm] = useState({ usuario: "", password: "", nombre: "", codigo_invitacion: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (modo === "login") {
        await login(form.usuario, form.password);
      } else {
        await registrar(form.usuario, form.password, form.nombre, form.codigo_invitacion);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-plane px-5 dark:bg-plane-dark">
      <div className="studi-noise-overlay" aria-hidden="true" />
      <div className="relative z-[1] w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-[22px] font-bold tracking-tight">
            STUDI<span className="text-[#2a78d6]">.</span>
          </span>
          <p className="mt-1 text-[13px] text-ink-muted">
            {modo === "login" ? "Ingresa a tu cuenta" : "Crea tu cuenta"}
          </p>
        </div>

        <Card className="flex flex-col gap-3">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
              Usuario
              <input
                className={inputClass}
                value={form.usuario}
                onChange={(e) => set("usuario", e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            {modo === "registro" && (
              <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
                Nombre
                <input
                  className={inputClass}
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Como quieres que te llamemos"
                  required
                />
              </label>
            )}

            <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
              Contraseña
              <input
                type="password"
                className={inputClass}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                required
                minLength={modo === "registro" ? 6 : undefined}
              />
            </label>

            {modo === "registro" && (
              <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
                Código de invitación
                <input
                  className={inputClass}
                  value={form.codigo_invitacion}
                  onChange={(e) => set("codigo_invitacion", e.target.value)}
                  required
                />
              </label>
            )}

            {error && <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>}

            <motion.button
              type="submit"
              whileTap={enviando ? undefined : TAP_PRESS}
              disabled={enviando}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-70 dark:bg-ink-dark dark:text-plane-dark"
            >
              {enviando ? (
                <motion.span
                  className="h-2.5 w-2.5 rounded-full border-[1.5px] border-white/40 border-t-white dark:border-plane-dark/40 dark:border-t-plane-dark"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                />
              ) : modo === "login" ? (
                "Entrar"
              ) : (
                "Crear cuenta"
              )}
            </motion.button>
          </form>
        </Card>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setModo((m) => (m === "login" ? "registro" : "login"));
          }}
          className="mt-4 w-full text-center text-[13px] text-ink-secondary underline-offset-2 hover:underline dark:text-ink-dark-secondary"
        >
          {modo === "login" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
