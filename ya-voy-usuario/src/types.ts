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
  tiempo_estimado?: string;
  owner_id?: string;
  costo_envio_base?: number;
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
  agotado?: boolean;
  destacado?: boolean;
  opciones?: OpcionGrupo[];
}

export type PedidoStatus =
  | "pendiente_pago"
  | "nuevo"
  | "preparando"
  | "listo"
  | "en_camino"
  | "esperando_cliente"
  | "entregado"
  | "cancelado"
  | "pago_fallido";

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
  repartidor_vehiculo?: string;
  items: PedidoItem[];
  total: number;
  costo_envio?: number;
  propina?: number;
  status: PedidoStatus;
  metodo_pago?: string;
  direccion_entrega?: string;
  lat_entrega?: number;
  lng_entrega?: number;
  notas?: string;
  creado_en: string;
  actualizado_en?: string;
  cancelado_en?: string;
  entregado_en?: string;
  esperando_desde?: string;
  codigo_entrega?: string;
  palabras_verificacion?: { entrega: string[]; restaurante?: string[] };
  tiempo_estimado?: string;
  tiempo_estimado_min?: number;
  foto_entrega?: string;
  rating_restaurante?: number;
  rating_repartidor?: number;
  payment_intent_id?: string;
}

export interface AppConfig {
  whatsapp?: string;
  mantenimiento?: string;
  comision_pct?: string;
  envio_minimo?: string;
  envio_precio_km?: string;
  [key: string]: string | undefined;
}
