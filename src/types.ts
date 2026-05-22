export interface Address {
  id: string;
  label: string;
  address: string;
  references: string;
  primary: boolean;
  type: 'home' | 'work' | 'other';
  lat?: number;
  lng?: number;
  location?: { lat: number; lng: number };
}

export interface Card {
  id: string;
  last4: string;
  brand: string;
  holder: string;
  expiry: string;
  color: string;
}

export interface Store {
  id: string;
  ownerId?: string;
  name: string;
  description?: string;
  address: string;
  distance?: string;
  time: string;
  img: string;
  type: string;
  location: { lat: number; lng: number };
  mapsUrl?: string;
  rating?: number;
  isOpen?: boolean;
  openingTime?: string;
  closingTime?: string;
  schedule?: {
    [key: string]: {
      open: string;
      close: string;
      isClosed: boolean;
    };
  };
  isAutoOpenEnabled?: boolean;
  createdAt?: any;
}

export interface ProductOption {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required?: boolean;
  choices: {
    id: string;
    name: string;
    price: number;
  }[];
}

export interface Product {
  id: string | number;
  storeId?: string;
  name: string;
  type: 'comida' | 'tienda' | 'paquete';
  sub: string;
  price: number;
  desc: string;
  img: string;
  isAvailable?: boolean;
  extras?: { id: string; name: string; price: number }[];
  personalizar?: string[];
  options?: ProductOption[];
}

export interface CartItem extends Product {
  finalPrice: number;
  qty: number;
  selectedExtras?: { id: string; name: string; price: number }[];
  customChoices?: string[];
  selectedOptions?: {
    optionId: string;
    optionName: string;
    choices: {
      id: string;
      name: string;
      price: number;
    }[];
  }[];
  note?: string;
}

export interface Order {
  id: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  name: string;
  img: string;
  items: number;
  price: number;
  total?: number;
  date: string;
  status: 'pending' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';
  step: number;
  driverId?: string;
  storeId?: string;
  storeName?: string;
  driver?: {
    name: string;
    phone: string;
    rating: number;
    vehicle: string;
  };
  details: string[];
  address: string;
  createdAt: any;
  paymentMethod?: any;
  lastMessage?: string;
  lastMessageAt?: any;
  deliveryKeyword?: string;
  restaurantRating?: number;
  restaurantReview?: string;
  driverRating?: number;
  driverReview?: string[];
  subtotal?: number;
  deliveryFee?: number;
  appFee?: number;
  penalty?: number;
  deliveryLat?: number;
  deliveryLng?: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderRole: 'user' | 'driver' | 'store';
  createdAt: any;
}
