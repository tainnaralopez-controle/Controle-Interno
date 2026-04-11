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
  websites: { link: string; category: string }[];
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
  size?: string;
  color?: string;
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
  | 'venda' | 'compra_fornecedor' | 'impostos' | 'materiais'
  | 'pro_labore' | 'marketing' | 'aluguel' | 'despesas_fixas'
  | 'funcionario' | 'taxa' | 'despesa_operacional' | 'outro';
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

export type OSDanoTipo = 
  | 'pedra_solta' 
  | 'pedra_perdida' 
  | 'fecho_quebrado' 
  | 'corrente_arrebentada' 
  | 'amassado' 
  | 'arranhado' 
  | 'solda_solta' 
  | 'outro';

export type OSAvaliacao = 
  | 'aguardando_avaliacao'
  | 'reembolso_cliente'
  | 'pagamento_conserto_loja'
  | 'pagamento_por_conta_cliente';

export type OSLocalizacao = 
  | 'na_loja'
  | 'no_ourives'
  | 'resolvido';

export type OSStatus = 
  | 'aberta'
  | 'em_andamento'
  | 'aguardando_peca'
  | 'concluida'
  | 'cancelada';

export interface OrdemServico {
  id: string;
  user_id: string;
  
  // Vinculo com pedido existente
  orderId?: string;           // ID do pedido original (opcional)
  orderNumber?: string;       // Número do pedido para busca rápida
  
  // Dados do cliente
  clientId?: string;
  clientName: string;
  clientWhatsapp?: string;
  
  // Dados da peça
  pecaDescricao: string;      // Descrição da joia/peça
  internalCode?: string;      // Código interno da peça
  
  // Dano
  tipoDano: OSDanoTipo;
  tipoDanoDescricao: string;  // Descrição livre do dano
  
  // Avaliação e responsabilidade
  avaliacao: OSAvaliacao;
  valorConserto?: number;     // Valor cobrado pelo conserto (se houver)
  
  // Localização da peça
  localizacao: OSLocalizacao;
  nomeOurives?: string;       // Nome do ourives (se estiver fora)
  
  // Datas
  dataEntrada: string;        // Data que a peça chegou na loja
  dataPrevisaoRetorno?: string; // Previsão de retorno para a cliente
  dataRetorno?: string;       // Data real que voltou para a cliente
  
  // Status geral da OS
  status: OSStatus;
  
  observacoes?: string;
  fotoUrl?: string;           // URL de foto do dano (opcional)
  
  createdAt: string;
}
