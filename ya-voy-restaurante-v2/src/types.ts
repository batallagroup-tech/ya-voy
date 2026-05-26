export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  foto_url?: string;
  rol: 'cliente' | 'negocio' | 'repartidor' | 'admin';
}

export interface Negocio {
  id: string;
  owner_id: string;
  nombre: string;
  tipo: 'restaurant' | 'store';
  descripcion?: string;
  telefono: string;
  direccion: string;
  lat: number;
  lng: number;
  logo_url?: string;
  banner_url?: string;
  categorias: string[];
  horarios: Record<string, { abre: string; cierra: string; cerrado: boolean }>;
  activo: boolean;
  calificacion: number;
  total_resenas: number;
  status: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface Producto {
  id: string;
  negocio_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: string;
  imagen_url?: string;
  disponible: boolean;
  destacado: boolean;
}

export interface Pedido {
  id: string;
  negocio_id: string;
  cliente_id: string;
  repartidor_id?: string;
  items: PedidoItem[];
  total: number;
  status: 'nuevo' | 'preparando' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';
  direccion_entrega: string;
  notas?: string;
  creado_en: string;
}

export interface PedidoItem {
  producto_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface Solicitud {
  id: string;
  usuario_id: string;
  tipo: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  datos: any;
  documentos: any;
  razon_rechazo?: string;
  creado_en: string;
}