export const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...options.headers,
      },
    });
    clearTimeout(tid);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || 'Error en la solicitud');
    }
    return res.json();
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

export const syncUsuario = (data: any, token: string) => apiFetch('/api/auth/sync', { method: 'POST', body: JSON.stringify(data) }, token);
export const getSolicitud = (userId: string) => apiFetch(`/api/negocios/solicitud/${userId}`);
export const getNegocio  = (userId: string) => apiFetch(`/api/negocios/negocio/${userId}`);
export const enviarSolicitud = (data: any) => apiFetch('/api/negocios/solicitud', { method: 'POST', body: JSON.stringify(data) });
export const warmupAPI = () =>
  fetch(`${API}/api/health`).then(r => r.ok).catch(() => false);
