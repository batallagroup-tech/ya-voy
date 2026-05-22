import { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '@/lib/api';

export type DocType = 'ine_front' | 'ine_back' | 'selfie' | 'logo' | 'banner' | 'menu_item';

interface Props {
  type: DocType;
  label: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
  accept?: string;
}

export function DocumentUpload({ type, label, currentUrl, onUploaded, accept = 'image/*' }: Props) {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState<string | null>(currentUrl ?? null);
  const [error,     setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    setError(null);
    setUploading(true);

    // Preview inmediato
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);

      const { url } = await apiFetch(
        '/api/upload/document',
        { method: 'POST', body: fd },
        getToken
      );
      onUploaded(url);
    } catch (e: any) {
      setError(e.message);
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`relative w-full h-36 rounded-xl border-2 border-dashed transition-colors overflow-hidden
          ${uploading ? 'opacity-60 cursor-not-allowed border-gray-200' : 'border-orange-300 hover:border-orange-500 cursor-pointer'}`}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-xs">Toca para subir</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {preview && !uploading && (
        <button
          type="button"
          onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ''; }}
          className="text-xs text-gray-400 hover:text-red-500 text-left"
        >
          Quitar imagen
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
