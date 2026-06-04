export interface Negocio {
  id: string;
  nombre: string;
  tipo: string;
  imagen_url?: string;
  rating?: number;
  lat?: number;
  lng?: number;
  direccion?: string;
  esta_abierto?: boolean;
  aceptando_pedidos?: boolean;
  horarios?: Record<string, { abierto: boolean; desde: string; hasta: string }>;
  suspendido?: boolean;
  bloqueado?: boolean;
}

export interface OpcionItem {
  id: string;
  nombre: string;
  precio: number;
}

export interface OpcionGrupo {
  id: string;
  nombre: string;
  tipo: 'unico' | 'multiple';
  requerido: boolean;
  opciones: OpcionItem[];
}

export interface OpcionSeleccionada {
  grupoNombre: string;
  nombre: string;
  precio: number;
}

export interface Producto {
  id: string;
  negocio_id: string;
  negocio_nombre?: string;
  negocio_imagen?: string;
  negocio_rating?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen_url?: string;
  categoria?: string;
  disponible?: boolean;
  opciones?: OpcionGrupo[];
}

export type PedidoStatus =
  | "nuevo"
  | "preparando"
  | "listo"
  | "en_camino"
  | "esperando_cliente"
  | "entregado"
  | "cancelado";

export interface PedidoItem {
  id?: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
}

export interface Pedido {
  id: string;
  negocio_id: string;
  negocio_nombre?: string;
  negocio_imagen?: string;
  cliente_id: string;
  repartidor_id?: string;
  repartidor_rating?: number;
  items: PedidoItem[];
  total: number;
  status: PedidoStatus;
  direccion_entrega?: string;
  notas?: string;
  creado_en: string;
  actualizado_en?: string;
  cancelado_en?: string;
  entregado_en?: string;
  esperando_desde?: string;
  codigo_entrega?: string;
  palabras_verificacion?: { entrega: string[] };
  tiempo_estimado?: string;
  foto_entrega?: string;
}

export interface AppConfig {
  whatsapp?: string;
  mantenimiento?: string;
  comision_pct?: string;
  [key: string]: string | undefined;
}
