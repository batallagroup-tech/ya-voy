export interface UserProfile {
  id: string; // id instead of uid
  email: string;
  name: string; // name instead of displayName
  photo_url: string;
  role: 'repartidor' | 'admin' | 'user';
  driver_status: 'online' | 'offline' | 'busy';
  registration_status: 'pending_review' | 'approved' | 'rejected' | 'not_started';
  rejection_reason?: string;
  phone?: string;
  verified?: boolean;
  ine_front_url?: string;
  ine_back_url?: string;
  selfie_url?: string;
  ine_name?: string;
  vehicle_info?: {
    type: 'moto' | 'auto' | 'bici';
    model: string;
    plate: string;
  };
  current_order_id?: string;
  last_location?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  total_earnings?: number;
  total_deliveries?: number;
  rating?: number;
  debt?: number;
  balance?: number;
  push_token?: string;
}

export interface RegistrationRequest {
  id: string;
  user_id: string;
  type: 'store' | 'restaurant' | 'user' | 'driver';
  status: 'pending' | 'approved' | 'rejected';
  data: {
    name: string;
    email: string;
    phone: string;
    address: string;
    description?: string;
    type?: string;
  };
  documents: {
    front: string;
    back: string;
    selfie?: string;
  };
  created_at: string;
  rejection_reason?: string;
}

export interface Order {
  id: string;
  client_id: string;
  restaurant_id: string;
  driver_id?: string; // driver_id instead of repartidorId
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
  items: any[];
  total: number;
  commission?: number;
  delivery_address: string;
  restaurant_address: string;
  delivery_coords?: { lat: number; lng: number };
  restaurant_coords?: { lat: number; lng: number };
  created_at: string;
  updated_at: string;
  completed_at?: string;
  restaurant_name?: string;
  client_name?: string;
  phone?: string;
  restaurant_keyword?: string;
  user_keyword?: string;
  is_restaurant_verified?: boolean;
  is_user_verified?: boolean;
  driver_location?: { lat: number; lng: number };
  driver_name?: string;
  driver_phone?: string;
}

export interface Withdrawal {
  id?: string;
  user_id: string;
  user_name: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed';
  created_at: any;
}

export interface Vehicle {
  id?: string;
  user_id?: string;
  user_name?: string;
  type: 'moto' | 'auto' | 'bici';
  model: string;
  plate: string;
  papers_url?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  created_at: any;
}

export interface Message {
  id?: string;
  text: string;
  sender_id: string;
  sender_role: 'user' | 'driver' | 'store';
  created_at: any;
}

export interface Review {
  id?: string;
  order_id: string;
  client_id: string;
  client_name: string;
  client_photo_url?: string;
  rating: number;
  comment: string;
  created_at: any;
}
