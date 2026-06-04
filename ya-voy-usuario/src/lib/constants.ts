export const GRAD = "linear-gradient(135deg, #6C3CE1 0%, #9B59B6 50%, #E91E8C 100%)";
export const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const STATUS_COLOR: Record<string, string> = {
  nuevo: "bg-blue-500", preparando: "bg-orange-500", listo: "bg-yellow-500",
  en_camino: "bg-purple-500", entregado: "bg-green-500", cancelado: "bg-red-500",
};

export const STATUS_LABEL: Record<string, string> = {
  nuevo: "Recibido", preparando: "Preparando", listo: "Listo",
  en_camino: "En camino", entregado: "Entregado", cancelado: "Cancelado",
};

export interface CartItem {
  cartKey: string;
  productoId: string;
  nombre: string;
  precio: number;
  precioBase: number;
  cantidad: number;
  negocioId: string;
  opciones?: { grupoNombre: string; nombre: string; precio: number }[];
}
