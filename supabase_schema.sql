-- 🍽️ Ya Voy Restaurante — Schema para Supabase

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Negocios registrados (viveres)
CREATE TABLE viveres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  type TEXT DEFAULT 'restaurante', -- 'restaurante' | 'tienda' | 'paqueteria'
  img TEXT, -- URL de la foto principal
  rating NUMERIC(3,2) DEFAULT 0,
  is_open BOOLEAN DEFAULT false,
  is_auto_open_enabled BOOLEAN DEFAULT false,
  opening_time TEXT,
  closing_time TEXT,
  schedule JSONB, -- { lun: { open: '09:00', close: '22:00', isClosed: false }, ... }
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  rejection_reason TEXT,
  maps_url TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Solicitudes de registro
CREATE TABLE solicitudes_de_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT DEFAULT 'restaurant',
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  data JSONB, -- { nombre, email, telefono, direccion, descripcion }
  documents JSONB, -- { front: url, back: url, selfie: url }
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Productos / Menú
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES viveres(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'comida', -- 'comida' | 'tienda' | 'paquete'
  sub TEXT, -- Categoría
  price NUMERIC(10,2),
  desc TEXT, -- Descripción
  img TEXT, -- Foto principal
  images JSONB DEFAULT '[]', -- Array de URLs de fotos
  is_available BOOLEAN DEFAULT true,
  options JSONB, -- opciones personalizables
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Promociones
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES viveres(id) ON DELETE CASCADE,
  code TEXT UNIQUE,
  discount_type TEXT, -- 'percent' | 'fixed'
  discount_value NUMERIC(10,2),
  min_order NUMERIC(10,2) DEFAULT 0,
  max_uses INT DEFAULT 100,
  uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Pedidos (Orders)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES viveres(id),
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled'
  total NUMERIC(10,2),
  items JSONB, -- Array de items [{name, price, quantity}]
  order_number INT,
  keyword_a TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Reseñas
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  store_id UUID REFERENCES viveres(id),
  client_id UUID REFERENCES auth.users(id),
  client_name TEXT,
  client_photo_url TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Seguridad)
ALTER TABLE viveres ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_de_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Ejemplo: Dueño puede ver/editar sus datos)
CREATE POLICY "Dueño puede ver su negocio" ON viveres FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Dueño puede editar su negocio" ON viveres FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Dueño puede ver sus productos" ON products FOR SELECT USING (TRUE); -- Público
CREATE POLICY "Dueño puede editar sus productos" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM viveres WHERE id = store_id AND owner_id = auth.uid())
);
