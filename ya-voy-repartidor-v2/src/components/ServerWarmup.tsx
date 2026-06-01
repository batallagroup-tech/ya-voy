import { useEffect, useState } from "react";
import { warmupAPI } from "../lib/api";

const _API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function ServerWarmup() {
  const [estado, setEstado] = useState<"idle"|"cargando"|"fallo"|"mantenimiento">("idle");

  useEffect(() => {
    let done = false;
    // Verificar mantenimiento primero
    fetch(_API + "/api/mantenimiento")
      .then(r => r.json())
      .then(d => { if (d.mantenimiento) { setEstado("mantenimiento"); done = true; } })
      .catch(() => {});
    const t = setTimeout(() => { if (!done) setEstado("cargando"); }, 3000);
    warmupAPI().then((ok) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      if (ok === false) setEstado("fallo");
      else setEstado("idle");
    });
    return () => { clearTimeout(t); done = true; };
  }, []);

  if (estado === "idle") return null;

  if (estado === "mantenimiento" || estado === "fallo") return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8"
      style={{ background: "linear-gradient(135deg,#7B2FF7 0%,#F107A3 50%,#FF6B00 100%)" }}>
      <span className="text-7xl mb-6">{estado === "mantenimiento" ? "🔧" : "🛠️"}</span>
      <h1 className="text-2xl font-black text-white mb-2 text-center">
        {estado === "mantenimiento" ? "En mantenimiento" : "Mantenimiento"}
      </h1>
      <p className="text-white/70 text-sm text-center mb-6">
        {estado === "mantenimiento"
          ? "Estamos realizando mejoras. Vuelve en unos minutos."
          : "Estamos mejorando la app para ti. Vuelve en unos minutos."}
      </p>
      {estado === "fallo" && (
        <button onClick={() => { setEstado("idle"); window.location.reload(); }}
          className="bg-white font-black px-8 py-3 rounded-2xl text-sm" style={{ color: "#7B2FF7" }}>
          Reintentar
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Iniciando servidor... ~30 seg
    </div>
  );
}