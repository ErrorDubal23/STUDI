import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { auth, setOnUnauthorized } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cerrarSesion = useCallback(() => {
    auth.borrarToken();
    setUsuario(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(cerrarSesion);
  }, [cerrarSesion]);

  useEffect(() => {
    if (!auth.tieneToken()) {
      setCargando(false);
      return;
    }
    auth
      .yo()
      .then(setUsuario)
      .catch(() => auth.borrarToken())
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (usuarioNombre, password) => {
    const res = await auth.login(usuarioNombre, password);
    auth.guardarToken(res.token);
    setUsuario(res.usuario);
  }, []);

  const registrar = useCallback(async (usuarioNombre, password, nombre, codigo) => {
    const res = await auth.registro(usuarioNombre, password, nombre, codigo);
    auth.guardarToken(res.token);
    setUsuario(res.usuario);
  }, []);

  const logout = useCallback(() => {
    auth.logout().catch(() => {});
    cerrarSesion();
  }, [cerrarSesion]);

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
