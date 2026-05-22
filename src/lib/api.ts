/**
 * Wrapper de fetch que adjunta el token de sesion Clerk automaticamente.
 *
 * Uso normal (JSON):
 *   const orders = await apiFetch('/api/dashboard/orders', {}, getToken);
 *
 * Uso con archivo (FormData — NO pasar Content-Type, el browser lo pone):
 *   const fd = new FormData();
 *   fd.append('file', file);
 *   fd.append('type', 'selfie');
 *   const { url } = await apiFetch('/api/upload/document', { method: 'POST', body: fd }, getToken);
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  getToken?: () => Promise<string | null>
): Promise<any> {
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (getToken) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const res  = await fetch(`${base}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
