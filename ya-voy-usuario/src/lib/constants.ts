export const GRAD = "linear-gradient(135deg, #9C0D38 0%, #7A0A2C 50%, #4A051A 100%)";
export const COLOR_CARMINE = "#9C0D38";
export const COLOR_GOLD = "#FFB300";
export const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const STATUS_COLOR: Record<string, string> = {
  pendiente_pago: "bg-yellow-400", nuevo: "bg-blue-500", preparando: "bg-orange-500",
  listo: "bg-yellow-500", en_camino: "bg-purple-500", entregado: "bg-green-500",
  cancelado: "bg-red-500", pago_fallido: "bg-red-600",
  programado: "bg-indigo-500", pickup_listo: "bg-teal-500",
};

export const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Confirmando pago", nuevo: "Recibido", preparando: "Preparando",
  listo: "Listo", en_camino: "En camino", entregado: "Entregado",
  cancelado: "Cancelado", pago_fallido: "Pago fallido",
  programado: "Programado", pickup_listo: "Listo para recoger",
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
