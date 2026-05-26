import { useEffect, useState } from "react";
import { warmupAPI } from "../lib/api";

export default function ServerWarmup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let done = false;
    const t = setTimeout(() => { if (!done) setVisible(true); }, 3000);
    warmupAPI().then(() => { done = true; clearTimeout(t); setVisible(false); });
    return () => { clearTimeout(t); done = true; };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Iniciando servidor… ~30 seg
    </div>
  );
}
