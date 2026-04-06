export type OrderStatus = 'Pago' | 'Aberto' | 'Atrasado' | 'Reservado';

export interface Client {
  id: string;
  name: string;
  avatar?: string;
  whatsapp: string;
  email: string;
  instagram?: string;
  birthday: string;
  preferences: string;
  notes: string;
  tag: 'VIP' | 'Atacado' | 'Consignado' | 'Inativo' | 'Ativo';
  purchaseHistory: string[]; // Order IDs
  totalSpent: number;
  lastPurchaseDate?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  whatsapp: string;
  material: string;
  city: string;
  state: string;
  deliveryTime: number; // days
  paymentTerms: string;
  qualityRating: number; // 1-5
  notes: string;
  googleMapsUrl?: string;
  minPurchase?: number;
}

export interface StockMovement {
  id: string;
  type: string;
  reason: string;
  quantity: number;
  date: string;
  note?: string;
}

export interface Replenishment {
  id: string;
  date: string;
  quantity: number;
  supplier: string;
  cost: number;
  status: string;
}

export interface Product {
  id: string;
  name?: string;
  sku?: string;
  category: string;
  supplier: string;
  cost: number;
  shipping: number;
  taxes?: number;
  fees?: number;
  otherCosts?: number;
  price?: number;
  margin?: number;
  weight?: number;
  image?: string;
  stock: number;
  minStock: number;
  reserved: number;
  salesCount: number;
  sold: number;
  lastRestockDate?: string;
  turnoverDays?: number; // Avg days to sell
  status: string;
  internalCode?: string;
  description?: string;
  tag?: number;
  plastic?: number;
  gift?: number;
  cert?: number;
  box?: number;
  profitPercent?: number;
  mercadoPago?: number;
  site?: number;
  coupon?: number;
  variations?: {
    name: string;
    stock: number;
  }[];
  movements?: StockMovement[];
  replenishments?: Replenishment[];
  batch?: string;
  expiryDate?: string;
  stockEvolution?: { date: string; stock: number }[];
  psychologicalPrice?: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  productDescription: string;
  productId?: string;
  internalCode?: string;
  measurements: string;
  totalValue: number;
  downPayment: number;
  balanceDue: number;
  paymentMethod?: 'pix' | 'debito' | 'credito';
  installments?: number;
  installmentValue?: number;
  dueDate?: string;
  promisedDate?: string;
  supplierId?: string;
  status: OrderStatus;
  notes: string;
  createdAt: string;
}

export type TxType = 'entrada' | 'saída';
export type TxCategory =
  | 'venda' | 'compra_fornecedor' | 'taxa'
  | 'despesa_operacional' | 'salario' | 'aluguel'
  | 'marketing' | 'outro';
export type TxStatus = 'pago' | 'pendente' | 'cancelado';
export type TxPayment =
  | 'pix' | 'cartão_débito' | 'cartão_crédito'
  | 'dinheiro' | 'boleto' | 'outro';

export interface Transaction {
  id: string;
  date: string;           // 'YYYY-MM-DD'
  type: TxType;
  category: TxCategory;
  description: string;
  value: number;
  status: TxStatus;
  paymentMethod: TxPayment;
  clientId?: string;
  supplierId?: string;
  orderId?: string;
  productId?: string;
  isAutomatic: boolean;
}

export interface FinancialEntry {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
}

export interface Insight {
  id: string;
  type: 'alert' | 'success' | 'info' | 'warning';
  message: string;
  date: string;
}
