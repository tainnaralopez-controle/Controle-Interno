-- Setup for Prata 925 Management System

-- 1. Table for Access Requests
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable RLS for access_requests
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- 3. Policies for access_requests
DROP POLICY IF EXISTS "Anyone can request access" ON access_requests;
CREATE POLICY "Anyone can request access" ON access_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all requests" ON access_requests;
CREATE POLICY "Admins can view all requests" ON access_requests
  FOR SELECT USING (auth.jwt() ->> 'email' = 'tainnaralopez@gmail.com');

DROP POLICY IF EXISTS "Admins can update requests" ON access_requests;
CREATE POLICY "Admins can update requests" ON access_requests
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'tainnaralopez@gmail.com');

-- 4. Tables for the application data
-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  instagram TEXT,
  birthday TEXT,
  preferences TEXT,
  notes TEXT,
  tag TEXT CHECK (tag IN ('VIP', 'Atacado', 'Consignado', 'Inativo', 'Ativo')),
  purchase_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_purchase_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  material TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  delivery_time INTEGER NOT NULL DEFAULT 0,
  payment_terms TEXT NOT NULL,
  quality_rating INTEGER NOT NULL DEFAULT 3,
  notes TEXT NOT NULL,
  google_maps_url TEXT,
  websites JSONB DEFAULT '[]'::jsonb,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  sku TEXT,
  category TEXT NOT NULL,
  supplier TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
  taxes DECIMAL(10,2) DEFAULT 0,
  fees DECIMAL(10,2) DEFAULT 0,
  other_costs DECIMAL(10,2) DEFAULT 0,
  price DECIMAL(10,2),
  margin DECIMAL(10,2),
  weight DECIMAL(10,2),
  image TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  last_restock_date TEXT,
  turnover_days INTEGER,
  status TEXT NOT NULL,
  internal_code TEXT,
  description TEXT,
  tag INTEGER,
  plastic INTEGER,
  gift INTEGER,
  cert INTEGER,
  box INTEGER,
  profit_percent DECIMAL(10,2),
  mercado_pago DECIMAL(10,2),
  site DECIMAL(10,2),
  coupon DECIMAL(10,2),
  variations JSONB DEFAULT '[]'::jsonb,
  movements JSONB DEFAULT '[]'::jsonb,
  replenishments JSONB DEFAULT '[]'::jsonb,
  batch TEXT,
  expiry_date TEXT,
  stock_evolution JSONB DEFAULT '[]'::jsonb,
  psychological_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  product_id UUID,
  internal_code TEXT,
  measurements TEXT NOT NULL,
  total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  down_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('pix', 'debito', 'credito')),
  installments INTEGER,
  installment_value DECIMAL(10,2),
  due_date TEXT,
  promised_date TEXT,
  supplier_id UUID,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Aberto', 'Atrasado', 'Reservado')),
  notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saída')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ordem de Serviço
CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_whatsapp TEXT,
  peca_descricao TEXT NOT NULL,
  internal_code TEXT,
  tipo_dano TEXT NOT NULL,
  tipo_dano_descricao TEXT NOT NULL,
  avaliacao TEXT NOT NULL,
  valor_conserto DECIMAL(10,2),
  localizacao TEXT NOT NULL,
  nome_ourives TEXT,
  data_entrada TEXT NOT NULL,
  data_previsao_retorno TEXT,
  data_retorno TEXT,
  status TEXT NOT NULL,
  observacoes TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

-- Create policies for user-owned data
DROP POLICY IF EXISTS "Users can only access their own clients" ON clients;
CREATE POLICY "Users can only access their own clients" ON clients FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own suppliers" ON suppliers;
CREATE POLICY "Users can only access their own suppliers" ON suppliers FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own products" ON products;
CREATE POLICY "Users can only access their own products" ON products FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own orders" ON orders;
CREATE POLICY "Users can only access their own orders" ON orders FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own transactions" ON transactions;
CREATE POLICY "Users can only access their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own ordens_servico" ON ordens_servico;
CREATE POLICY "Users can only access their own ordens_servico" ON ordens_servico FOR ALL USING (auth.uid() = user_id);
