import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Tag, 
  ShoppingBag, 
  Users, 
  Truck, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  MapPin,
  Bell, 
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Menu,
  X,
  MessageSquare,
  Instagram,
  Phone,
  Filter,
  RefreshCcw,
  Trash2,
  Save,
  Calculator,
  Download,
  History,
  Settings2,
  Edit3,
  FileText,
  BarChart3,
  ArrowUpDown,
  Printer,
  Check,
  Copy,
  Sparkles,
  Shield,
  Image as ImageIcon,
  Map as MapIcon,
  BrainCircuit,
  Zap,
  Wrench,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import Barcode from 'react-barcode';
import JsBarcode from 'jsbarcode';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { FinancialView } from './FinancialView';
import { OrdemServicoView } from './components/OrdemServicoView';
import { formatCurrency, formatPercent, cn } from './lib/utils';
import { OrderStatus, Client, Order, Product, Supplier, Transaction, OrdemServico } from './types';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { AdminView } from './components/AdminView';
import { UserPanel } from './components/UserPanel';
import { ProfileView } from './components/ProfileView';
import { Session, User } from '@supabase/supabase-js';

// --- Components ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border-2 border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black mb-4 text-gray-900">Algo deu errado</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Ocorreu um erro inesperado. Por favor, tente recarregar a página ou entre em contato com o suporte.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-40">
              <code className="text-[10px] text-red-500 font-mono">
                {this.state.error?.message || String(this.state.error)}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left group",
      active 
        ? "bg-black text-white shadow-md" 
        : "text-gray-500 hover:bg-gray-100 hover:text-black"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "text-gray-400 group-hover:text-black")} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const StatCard = ({ label, value, trend, trendValue, icon: Icon }: any) => (
  <div className="premium-card p-6 bg-white border-2 border-gray-100 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 bg-gray-50 rounded-xl">
        <Icon size={20} className="text-black" />
      </div>
      {trendValue && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider",
          (trend === 'up' || trend === 'success') ? "bg-green-50 text-green-600" : 
          trend === 'down' ? "bg-red-50 text-red-600" : 
          "bg-blue-50 text-blue-600"
        )}>
          {trend === 'up' && <ArrowUpRight size={12} />}
          {trend === 'down' && <ArrowDownRight size={12} />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-2xl font-black text-gray-900">{value}</h3>
  </div>
);

const InsightItem = ({ insight }: { insight: any }) => {
  const icons = {
    alert: <AlertCircle className="text-red-500" size={18} />,
    warning: <AlertCircle className="text-amber-500" size={18} />,
    info: <Bell className="text-blue-500" size={18} />,
    success: <CheckCircle2 className="text-green-500" size={18} />,
  };

  return (
    <div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 mb-3 last:mb-0">
      <div className="mt-0.5">{icons[insight.type as keyof typeof icons]}</div>
      <div>
        <p className="text-sm text-gray-800 font-medium leading-tight">{insight.message}</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{insight.date}</p>
      </div>
    </div>
  );
};

// --- Views ---

const DashboardView = ({ products, transactions, clients, alerts }: { products: any[], transactions: any[], clients: any[], alerts: any }) => {
  const birthdays = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return clients.filter(c => {
      if (!c.birthday) return false;
      // Assuming format DD/MM
      const parts = c.birthday.split('/');
      if (parts.length < 2) return false;
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const bDate = new Date(now.getFullYear(), month - 1, day);
      
      // Handle end of year wrap around
      if (bDate < now && month === 1 && now.getMonth() === 11) {
        bDate.setFullYear(now.getFullYear() + 1);
      }

      return bDate >= now && bDate <= nextWeek;
    });
  }, [clients]);

  const data = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        name: days[d.getDay()],
        date: d.toISOString().split('T')[0],
        sales: 0,
        profit: 0
      };
    });

    transactions.forEach(t => {
      const day = last7Days.find(d => d.date === t.date);
      if (day) {
        if (t.type === 'entrada') {
          day.sales += t.amount || t.value || 0;
          // Simplified profit calculation: 40% of sales if not specified
          day.profit += (t.amount || t.value || 0) * 0.4;
        }
      }
    });

    return last7Days;
  }, [transactions]);

  const pieData = useMemo(() => {
    if (products.length === 0) return [{ name: 'Sem dados', value: 1 }];
    const categories = Array.from(new Set(products.map(p => p.category)));
    return categories.map(cat => ({
      name: cat,
      value: products.filter(p => p.category === cat).reduce((acc, p) => acc + (p.salesCount || 0), 0)
    })).filter(item => item.value > 0).slice(0, 4);
  }, [products]);

  const COLORS = ['#1a1a1a', '#404040', '#737373', '#a3a3a3'];

  const profitableProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const profitA = (a.price || 0) - (a.cost || 0);
        const profitB = (b.price || 0) - (b.cost || 0);
        return profitB - profitA;
      })
      .slice(0, 4);
  }, [products]);

  const totals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const revenue = monthTransactions.filter(t => t.type === 'entrada').reduce((acc, t) => acc + (t.amount || t.value || 0), 0);
    const expenses = monthTransactions.filter(t => t.type === 'saída').reduce((acc, t) => acc + (t.amount || t.value || 0), 0);
    const profit = revenue - expenses;
    const ticketMedio = revenue / (monthTransactions.filter(t => t.type === 'entrada').length || 1);

    return { revenue, profit, ticketMedio };
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* Alert Banner */}
      {(alerts.ordensAtrasadas.length > 0 || alerts.ordensVencendo.length > 0 || alerts.contasAtrasadas.length > 0 || alerts.estoqueCritico.length > 0) && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <AlertCircle size={14} /> Atenção
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {alerts.ordensAtrasadas.length > 0 && (
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-red-600 uppercase tracking-widest">{alerts.ordensAtrasadas.length} Pedidos Atrasados</p>
                  <p className="text-[10px] text-red-400 font-bold">Ação imediata necessária</p>
                </div>
              </div>
            )}
            {alerts.ordensVencendo.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-600 uppercase tracking-widest">{alerts.ordensVencendo.length} Vencendo em 3 dias</p>
                  <p className="text-[10px] text-amber-400 font-bold">Prepare as entregas</p>
                </div>
              </div>
            )}
            {alerts.contasAtrasadas.length > 0 && (
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-red-600 uppercase tracking-widest">{alerts.contasAtrasadas.length} Contas Atrasadas</p>
                  <p className="text-[10px] text-red-400 font-bold">Verifique o financeiro</p>
                </div>
              </div>
            )}
            {alerts.estoqueCritico.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-100 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-orange-600 uppercase tracking-widest">{alerts.estoqueCritico.length} Estoque Crítico</p>
                  <p className="text-[10px] text-orange-400 font-bold">Reposição necessária</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Faturamento Mês" value={formatCurrency(totals.revenue)} trend="up" trendValue="+12.5%" icon={DollarSign} />
        <StatCard label="Lucro Líquido" value={formatCurrency(totals.profit)} trend="up" trendValue="+8.2%" icon={TrendingUp} />
        <StatCard label="Ticket Médio" value={formatCurrency(totals.ticketMedio)} trend="down" trendValue="-2.1%" icon={ShoppingBag} />
        <StatCard label="Ordens Ativas" value={transactions.length.toString()} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 premium-card p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold">Evolução de Vendas</h3>
            <select className="text-xs border-none bg-gray-50 rounded-lg px-3 py-2 font-medium focus:ring-0">
              <option>Últimos 7 dias</option>
              <option>Último mês</option>
            </select>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="sales" stroke="#1a1a1a" strokeWidth={3} dot={{ r: 4, fill: '#1a1a1a' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="profit" stroke="#c0c0c0" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="premium-card p-6">
            <h3 className="text-lg font-bold mb-6">Insights Automáticos</h3>
            <div className="space-y-1">
              {/* Insights could be generated by AI or calculated from data */}
              <div className="text-xs text-gray-400 italic p-4">Nenhum insight disponível no momento.</div>
            </div>
            <button className="w-full mt-6 py-3 text-xs font-bold text-gray-500 hover:text-black transition-colors flex items-center justify-center gap-2">
              Ver todos os alertas <ChevronRight size={14} />
            </button>
          </div>

          {birthdays.length > 0 && (
            <div className="premium-card p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🎂 Aniversariantes</h3>
              <div className="space-y-3">
                {birthdays.map(client => (
                  <div key={client.id} className="flex items-center justify-between bg-white/60 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold text-[10px]">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{client.name}</p>
                        <p className="text-[10px] text-gray-400">{client.birthday}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.open(`https://wa.me/${client.whatsapp.replace(/\D/g, '')}?text=Parabéns, ${client.name}! 🎉`, '_blank')}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Phone size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="premium-card p-6">
          <h3 className="text-lg font-bold mb-6">Categorias mais Vendidas</h3>
          <div style={{ width: "100%", height: 250 }} className="flex items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-4">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs font-medium text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-lg font-bold mb-6">Produtos mais Lucrativos</h3>
          <div className="space-y-4">
            {profitableProducts.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-xs">
                    {product.internalCode || product.sku}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{product.description || product.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-black">{formatCurrency((product.price || 0) - (product.cost || 0))}</p>
                  <p className="text-[10px] text-green-600 font-bold">{formatPercent(product.profitPercent || product.margin)} margem</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StockView = ({ products, setProducts, onAddProduct, onUpdateProduct, onDeleteProduct }: { 
  products: any[], 
  setProducts: (p: any[]) => void,
  onAddProduct: (data: any) => Promise<void>,
  onUpdateProduct: (id: string, data: Partial<Product>) => Promise<void>,
  onDeleteProduct: (id: string) => Promise<void>
}) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ quantity: 0, reason: 'ajuste manual', note: '' });
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'history' | 'evolution'>('info');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleData, setSaleData] = useState({ quantity: 1, type: 'venda' as 'venda' | 'reserva' });
  
  const handleSaleOrReservation = async (productId: string, quantity: number, type: 'venda' | 'reserva') => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const isVenda = type === 'venda';
    const newStock = product.stock - quantity;
    const newReserved = isVenda ? product.reserved : (product.reserved || 0) + quantity;
    const newSold = isVenda ? (product.sold || 0) + quantity : (product.sold || 0);
    const newSalesCount = isVenda ? (product.salesCount || 0) + quantity : (product.salesCount || 0);
    
    const movement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'saída',
      reason: isVenda ? 'venda' : 'reserva',
      quantity,
      date: new Date().toISOString().split('T')[0],
      note: isVenda ? 'Venda realizada' : 'Reserva para cliente'
    };

    await onUpdateProduct(productId, {
      stock: newStock,
      reserved: newReserved,
      sold: newSold,
      salesCount: newSalesCount,
      movements: [movement, ...(product.movements || [])],
      stockEvolution: [...(product.stockEvolution || []), { date: new Date().toISOString().split('T')[0], stock: newStock }]
    });
    setShowSaleModal(false);
  };

  const convertReservationToSale = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newReserved = Math.max(0, (product.reserved || 0) - quantity);
    const newSold = (product.sold || 0) + quantity;
    const newSalesCount = (product.salesCount || 0) + quantity;

    const movement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'saída',
      reason: 'venda',
      quantity,
      date: new Date().toISOString().split('T')[0],
      note: 'Reserva convertida em venda'
    };

    await onUpdateProduct(productId, {
      reserved: newReserved,
      sold: newSold,
      salesCount: newSalesCount,
      movements: [movement, ...(product.movements || [])]
    });
  };

  const handleAdjustment = async (productId: string, quantity: number, reason: any, note: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newStock = (product.stock || 0) + quantity;
    const movement = {
      id: Math.random().toString(36).substr(2, 9),
      type: quantity > 0 ? 'entrada' : 'saída',
      reason,
      quantity: Math.abs(quantity),
      date: new Date().toISOString().split('T')[0],
      note
    };

    await onUpdateProduct(productId, {
      stock: newStock,
      movements: [movement, ...(product.movements || [])],
      stockEvolution: [...(product.stockEvolution || []), { date: new Date().toISOString().split('T')[0], stock: newStock }]
    });
    setShowAdjustmentModal(false);
    // Update selected product to reflect changes
    setSelectedProduct({ ...product, stock: newStock });
  };

  const updateMinStock = async (productId: string, newMin: number) => {
    await onUpdateProduct(productId, { minStock: newMin });
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct({ ...selectedProduct, minStock: newMin });
    }
  };

  const generatePurchaseOrder = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newReplenishment = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      supplier: product.supplier,
      quantity,
      status: 'pendente',
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    await onUpdateProduct(productId, {
      replenishments: [newReplenishment, ...(product.replenishments || [])]
    });
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const stockItems = useMemo(() => {
    let items = products.map(p => {
      const { resalePrice } = calculateProductPricing(p);
      const salesPerDay = (p.salesCount || 0) / 30;
      const daysUntilZero = salesPerDay > 0 ? Math.floor(p.stock / salesPerDay) : Infinity;
      
      return {
        ...p,
        name: p.description || p.name,
        sku: p.internalCode || p.sku,
        price: resalePrice,
        reserved: p.reserved || 0,
        salesCount: p.salesCount || 0,
        turnoverDays: p.turnoverDays || 0,
        minStock: p.minStock || 5,
        daysUntilZero,
        status: p.status === 'Fora de Estoque' ? 'low' : (p.salesCount > 30 ? 'high' : 'medium')
      };
    });
    
    // Add some raw silver mock data for this view
    const rawSilver: any = {
      id: 'rs1',
      name: 'Prata 925 Granulada (Bruta)',
      sku: 'SIL-001',
      category: 'Matéria-Prima',
      supplier: 'Pratas do Sul',
      cost: 4.50,
      stock: 450,
      minStock: 1000,
      reserved: 0,
      salesCount: 150,
      lastRestockDate: '2024-03-01',
      turnoverDays: 2,
      status: 'high',
      price: 0,
      margin: 0,
      daysUntilZero: 90
    };
    
    if (!items.find(i => i.id === 'rs1')) {
      items.push(rawSilver);
    }

    let filteredItems = items.filter(item => {
      const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filter === 'low') return matchesSearch && item.stock <= item.minStock;
      if (filter === 'high-sales') return matchesSearch && item.status === 'high';
      return matchesSearch;
    });

    if (sortConfig) {
      filteredItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredItems;
  }, [products, filter, searchTerm, sortConfig]);

  const lowStockItems = useMemo(() => 
    stockItems.filter(i => i.stock <= i.minStock).sort((a, b) => a.stock - b.stock)
  , [stockItems]);

  const bestSellers = useMemo(() => 
    [...stockItems].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5)
  , [stockItems]);

  const stockValue = useMemo(() => ({
    invested: stockItems.reduce((acc, p) => acc + (p.stock * (p.cost || 0)), 0),
    potential: stockItems.reduce((acc, p) => acc + (p.stock * (p.price || 0)), 0),
    profit: stockItems.reduce((acc, p) => acc + (p.stock * ((p.price || 0) - (p.cost || 0))), 0)
  }), [stockItems]);

  const replenishmentSuggestions = useMemo(() => {
    return stockItems
      .filter(p => p.status === 'high' && p.stock <= p.minStock * 1.5)
      .sort((a, b) => (a.stock / a.minStock) - (b.stock / b.minStock));
  }, [stockItems]);

  const deceptiveProducts = useMemo(() => {
    // High sales, low profit margin
    const highSalesLowMargin = stockItems.filter(p => p.salesCount > 50 && (p.profitPercent || 0) < 110);
    // Low sales, high profit margin
    const lowSalesHighMargin = stockItems.filter(p => p.salesCount < 10 && (p.profitPercent || 0) > 140);
    return { highSalesLowMargin, lowSalesHighMargin };
  }, [stockItems]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black mb-2 text-gray-900">Estrutura Inteligente de Estoque</h2>
          <p className="text-gray-500 font-medium">Gestão avançada baseada em giro, lucro e reposição.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm">
            <Download size={18} /> Exportar Inventário
          </button>
          <div className="flex bg-gray-100/80 p-1.5 rounded-3xl">
            <button 
              onClick={() => setFilter('all')}
              className={cn("px-6 py-2 rounded-2xl text-sm font-bold transition-all", filter === 'all' ? "bg-white shadow-md text-black" : "text-gray-500 hover:text-black")}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('low')}
              className={cn("px-6 py-2 rounded-2xl text-sm font-bold transition-all", filter === 'low' ? "bg-white shadow-md text-red-600" : "text-gray-500 hover:text-black")}
            >
              Estoque Baixo
            </button>
            <button 
              onClick={() => setFilter('high-sales')}
              className={cn("px-6 py-2 rounded-2xl text-sm font-bold transition-all", filter === 'high-sales' ? "bg-white shadow-md text-blue-600" : "text-gray-500 hover:text-black")}
            >
              Alta Saída
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Dinheiro Parado (Custo)" 
          value={formatCurrency(stockValue.invested)} 
          icon={DollarSign} 
          trend="down" 
          trendValue="-5% este mês"
        />
        <StatCard 
          label="Valor Potencial de Venda" 
          value={formatCurrency(stockValue.potential)} 
          icon={TrendingUp} 
          trend="up" 
          trendValue="+12% vs mês anterior"
        />
        <StatCard 
          label="Lucro Potencial em Estoque" 
          value={formatCurrency(stockValue.profit)} 
          icon={CheckCircle2} 
          trend="success" 
          trendValue="Margem média 58%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card border-2 border-gray-100 shadow-sm">
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <h3 className="font-black text-xl text-gray-900">Inventário Detalhado</h3>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou SKU..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50/80 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-black transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th 
                      className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold cursor-pointer hover:text-black transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Produto / SKU <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold cursor-pointer hover:text-black transition-colors"
                      onClick={() => handleSort('turnoverDays')}
                    >
                      <div className="flex items-center gap-2">
                        Giro <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold cursor-pointer hover:text-black transition-colors"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center gap-2">
                        Estoque <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold cursor-pointer hover:text-black transition-colors"
                      onClick={() => handleSort('salesCount')}
                    >
                      <div className="flex items-center gap-2">
                        Venda <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold cursor-pointer hover:text-black transition-colors"
                      onClick={() => handleSort('reserved')}
                    >
                      <div className="flex items-center gap-2">
                        Saída e Reserva <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-right">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stockItems.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedProduct(item)}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <ShoppingBag size={18} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-black">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{item.sku} • {item.category}</p>
                            {item.variations && (
                              <div className="flex gap-1 mt-1">
                                {item.variations.map(v => (
                                  <span key={v.name} className={cn(
                                    "text-[8px] px-1.5 py-0.5 rounded-md font-bold border",
                                    v.stock <= 2 ? "bg-red-50 text-red-600 border-red-100" : "bg-gray-50 text-gray-500 border-gray-100"
                                  )}>
                                    {v.name}: {v.stock}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full w-fit uppercase tracking-wider mb-1",
                            item.status === 'high' ? "bg-green-100 text-green-700" :
                            item.status === 'medium' ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {item.status === 'high' ? 'Alta Saída' : item.status === 'medium' ? 'Médio Giro' : 'Baixa Saída'}
                          </span>
                          <p className="text-[10px] text-gray-400 font-medium">{item.turnoverDays} dias p/ vender</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <p className="text-sm font-bold">{item.stock} un</p>
                          <p className="text-[10px] text-gray-400">Mín: {item.minStock}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-blue-600">{item.salesCount || 0} un</p>
                          <p className="text-[10px] text-gray-400">Total vendido</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Saída</p>
                              <p className="text-sm font-bold text-gray-700">{item.sold || 0} un</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Reserva</p>
                              <p className="text-sm font-bold text-amber-600">{item.reserved || 0} un</p>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(item);
                                setShowSaleModal(true);
                                setSaleData({ quantity: 1, type: 'venda' });
                              }}
                              className="text-[8px] font-bold bg-black text-white px-2 py-1 rounded-md hover:bg-gray-800 transition-all"
                            >
                              Registrar
                            </button>
                            {item.reserved > 0 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  convertReservationToSale(item.id, 1);
                                }}
                                className="text-[8px] font-bold bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 transition-all"
                              >
                                Efetivar
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.stock <= item.minStock ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">
                              <AlertCircle size={12} /> Repor Urgente
                            </span>
                            <p className="text-[10px] text-red-400 mt-1 font-bold">
                              {item.daysUntilZero === 0 ? 'Zerado' : `Acaba em ~${item.daysUntilZero} dias`}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">
                              <CheckCircle2 size={12} /> Saudável
                            </span>
                            {item.daysUntilZero !== Infinity && (
                              <p className="text-[10px] text-gray-400 mt-1 font-medium">Autonomia: {item.daysUntilZero} dias</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Tem certeza que deseja excluir este produto?')) {
                              onDeleteProduct(item.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Excluir Produto"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="premium-card p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                <TrendingUp size={16} className="text-black" /> Top Produtos do Mês
              </h3>
              <div className="space-y-4">
                {bestSellers.slice(0, 3).map((item, idx) => (
                  <div key={`top-${item.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.salesCount} vendas • {formatCurrency(item.price * item.salesCount)} faturado</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-card p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                <AlertCircle size={16} className="text-amber-500" /> Produtos que Enganam
              </h3>
              <div className="space-y-3">
                {deceptiveProducts.highSalesLowMargin.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">Giro alto, Lucro baixo</p>
                    <p className="text-xs text-amber-700">{deceptiveProducts.highSalesLowMargin[0].name}</p>
                  </div>
                )}
                {deceptiveProducts.lowSalesHighMargin.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-800 uppercase mb-1">Giro baixo, Lucro alto</p>
                    <p className="text-xs text-blue-700">{deceptiveProducts.lowSalesHighMargin[0].name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="premium-card p-6 bg-black text-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <ShoppingBag size={18} className="text-white" /> O Que Comprar Hoje
              </h3>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prioridade</span>
            </div>
            <div className="space-y-4">
              {replenishmentSuggestions.map(item => (
                <div key={`buy-${item.id}`} className="p-4 bg-white/5 rounded-xl border border-white/10 group hover:bg-white/10 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-[10px] text-gray-400">Fornecedor: {item.supplier}</p>
                    </div>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">Urgente</span>
                  </div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-[10px] text-gray-400">
                        <p>Estoque: {item.stock} un</p>
                        <p>Vendas/Mês: {item.salesCount} un</p>
                      </div>
                      <button 
                        onClick={() => generatePurchaseOrder(item.id, item.minStock * 2 - item.stock)}
                        className="px-3 py-1.5 bg-white text-black rounded-lg text-[10px] font-bold hover:bg-gray-200 transition-all"
                      >
                        Gerar Pedido ({item.minStock * 2 - item.stock} un)
                      </button>
                    </div>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card p-6">
            <h3 className="font-bold text-sm mb-4 uppercase tracking-widest text-gray-400">Alertas de Inatividade</h3>
            <div className="space-y-4">
              {stockItems.filter(p => p.status === 'low').slice(0, 2).map(item => (
                <div key={`stale-${item.id}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg text-gray-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{item.name}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Sem saída há 45 dias. Considere promoção ou ajuste de preço.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card p-6 border-dashed border-2 border-gray-200 bg-transparent">
            <div className="text-center py-4">
              <RefreshCcw size={32} className="mx-auto text-gray-300 mb-3" />
              <h4 className="text-sm font-bold text-gray-900">Histórico de Movimentação</h4>
              <p className="text-[10px] text-gray-400 mt-1 mb-4">Acompanhe todas as entradas, saídas e ajustes manuais.</p>
              <button className="text-xs font-bold text-black border-b border-black pb-0.5">Ver Relatório Completo</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Produto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shadow-inner">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ShoppingBag size={32} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-gray-400 font-mono text-xs">{selectedProduct.sku} • {selectedProduct.category}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                        selectedProduct.status === 'high' ? "bg-green-100 text-green-700" :
                        selectedProduct.status === 'medium' ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {selectedProduct.status === 'high' ? 'Alta Saída' : selectedProduct.status === 'medium' ? 'Médio Giro' : 'Baixa Saída'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAdjustmentModal(true)}
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
                    title="Ajuste Manual"
                  >
                    <Settings2 size={20} />
                  </button>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>
              </div>

              <div className="flex gap-6 mt-8">
                <button 
                  onClick={() => setActiveModalTab('info')}
                  className={cn("text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all", activeModalTab === 'info' ? "border-black text-black" : "border-transparent text-gray-400")}
                >
                  Informações
                </button>
                <button 
                  onClick={() => setActiveModalTab('history')}
                  className={cn("text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all", activeModalTab === 'history' ? "border-black text-black" : "border-transparent text-gray-400")}
                >
                  Histórico
                </button>
                <button 
                  onClick={() => setActiveModalTab('evolution')}
                  className={cn("text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all", activeModalTab === 'evolution' ? "border-black text-black" : "border-transparent text-gray-400")}
                >
                  Evolução
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {activeModalTab === 'info' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Custo Unitário</p>
                      <p className="text-lg font-black">{formatCurrency(selectedProduct.cost)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Preço de Venda</p>
                      <p className="text-lg font-black text-green-600">{formatCurrency(selectedProduct.price)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Margem de Lucro</p>
                      <p className="text-lg font-black text-blue-600">{selectedProduct.margin}%</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Estoque Atual</p>
                      <p className="text-lg font-black">{selectedProduct.stock} un</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reservado</p>
                      <p className="text-lg font-black text-amber-600">{selectedProduct.reserved} un</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Estoque Mínimo</p>
                        <button className="text-gray-400 hover:text-black"><Edit3 size={12} /></button>
                      </div>
                      <input 
                        type="number" 
                        value={selectedProduct.minStock}
                        onChange={(e) => updateMinStock(selectedProduct.id, parseInt(e.target.value))}
                        className="text-lg font-black bg-transparent border-none p-0 w-full focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Logística</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-xs text-gray-500">Fornecedor</span>
                          <span className="text-xs font-bold">{selectedProduct.supplier}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-xs text-gray-500">Última Reposição</span>
                          <span className="text-xs font-bold">{selectedProduct.lastRestockDate}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-xs text-gray-500">Lote / Validade</span>
                          <span className="text-xs font-bold">{selectedProduct.batch || 'N/A'} • {selectedProduct.expiryDate || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-xs text-gray-500">Previsão de Ruptura</span>
                          <span className="text-xs font-bold text-red-600">{selectedProduct.daysUntilZero === Infinity ? 'Sem previsão' : `~${selectedProduct.daysUntilZero} dias`}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Variações (Aro/Tamanho)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedProduct.variations?.map((v: any) => (
                          <div key={v.name} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                            <span className="text-xs font-bold">{v.name}</span>
                            <span className={cn("text-xs font-black", v.stock <= 2 ? "text-red-600" : "text-black")}>{v.stock} un</span>
                          </div>
                        )) || <p className="text-xs text-gray-400 italic">Nenhuma variação cadastrada.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'history' && (
                <div className="space-y-4">
                  {selectedProduct.movements?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.movements.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-2 rounded-xl",
                              m.type === 'entrada' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                            )}>
                              {m.type === 'entrada' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold capitalize">{m.reason}</p>
                              <p className="text-[10px] text-gray-400">{m.date} • {m.note || 'Sem observações'}</p>
                            </div>
                          </div>
                          <p className={cn("font-black", m.type === 'entrada' ? "text-green-600" : "text-red-600")}>
                            {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <History size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-gray-400 text-sm">Nenhuma movimentação registrada.</p>
                    </div>
                  )}
                </div>
              )}

              {activeModalTab === 'evolution' && (
                <div style={{ width: "100%", height: 300, paddingTop: '1rem' }}>
                  {selectedProduct.stockEvolution?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={selectedProduct.stockEvolution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Line type="monotone" dataKey="stock" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#000' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-gray-400 text-sm">Dados insuficientes para gerar o gráfico.</p>
                    </div>
                  )}
                </div>
              )}
            </div>


          </div>
        </div>
      )}

      {/* Modal de Registro de Venda/Reserva */}
      {showSaleModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <h3 className="text-xl font-black mb-6">Registrar Movimentação</h3>
              <div className="space-y-6">
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button 
                    onClick={() => setSaleData({ ...saleData, type: 'venda' })}
                    className={cn("flex-1 py-2 rounded-xl text-sm font-bold transition-all", saleData.type === 'venda' ? "bg-white shadow-sm text-black" : "text-gray-500")}
                  >
                    Venda Direta
                  </button>
                  <button 
                    onClick={() => setSaleData({ ...saleData, type: 'reserva' })}
                    className={cn("flex-1 py-2 rounded-xl text-sm font-bold transition-all", saleData.type === 'reserva' ? "bg-white shadow-sm text-black" : "text-gray-500")}
                  >
                    Reserva
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Quantidade</label>
                  <input 
                    type="number" 
                    min="1"
                    max={selectedProduct.stock}
                    value={saleData.quantity}
                    onChange={(e) => setSaleData({ ...saleData, quantity: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-black transition-all font-bold"
                  />
                  <p className="text-[10px] text-gray-400 mt-2">Disponível em estoque: {selectedProduct.stock} un</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowSaleModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-black rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleSaleOrReservation(selectedProduct.id, saleData.quantity, saleData.type)}
                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                  >
                    Confirmar {saleData.type === 'venda' ? 'Venda' : 'Reserva'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuste Manual */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <h3 className="text-xl font-black mb-6">Ajuste de Estoque</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Quantidade (Use negativo para saída)</label>
                  <input 
                    type="number" 
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-black transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Motivo</label>
                  <select 
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-black transition-all font-bold"
                  >
                    <option value="ajuste manual">Ajuste Manual</option>
                    <option value="quebra">Quebra</option>
                    <option value="perda">Perda</option>
                    <option value="devolução">Devolução</option>
                    <option value="reposição">Reposição</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Observação</label>
                  <textarea 
                    value={adjustmentData.note}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, note: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-black transition-all text-sm h-24 resize-none"
                    placeholder="Descreva o motivo do ajuste..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowAdjustmentModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-black rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleAdjustment(selectedProduct.id, adjustmentData.quantity, adjustmentData.reason, adjustmentData.note)}
                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const calculateProductPricing = (p: any) => {
  const totalCost = (p.cost || 0) + (p.tag || 0) + (p.plastic || 0) + (p.gift || 0) + (p.cert || 0) + (p.box || 0) + (p.shipping || 0);
  const markup = 1 + ((p.profitPercent || 0) / 100);
  const fees = ((p.mercadoPago || 0) + (p.site || 0) + (p.coupon || 0)) / 100;
  const resalePrice = (totalCost * markup) / (1 - (fees >= 1 ? 0.99 : fees));
  const deductionsVal = resalePrice * fees;
  const profitVal = resalePrice - totalCost - deductionsVal;
  return { totalCost, resalePrice, deductionsVal, profitVal };
};

const LabelModal = ({ isOpen, onClose, initialProducts }: { isOpen: boolean, onClose: () => void, initialProducts: any[] }) => {
  const [selectedProducts, setSelectedProducts] = useState(
    initialProducts.map(p => ({ ...p, copies: 1, selected: true }))
  );

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const updateCopies = (id: string, copies: number) => {
    setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, copies: Math.max(1, isNaN(copies) ? 1 : copies) } : p));
  };

  const selectAll = () => {
    const allSelected = selectedProducts.every(p => p.selected);
    setSelectedProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const activeLabels = selectedProducts.filter(p => p.selected);
  const totalLabels = activeLabels.reduce((acc, p) => acc + p.copies, 0);

  const generatePDF = (shouldPrint = false) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [216, 356]
    });

    const labelWidth = 40;
    const labelHeight = 25;
    const marginX = 10;
    const marginY = 10;
    const gapX = 5;
    const gapY = 5;
    const cols = 4;

    let currentLabel = 0;
    const canvas = document.createElement('canvas');

    activeLabels.forEach(product => {
      for (let i = 0; i < product.copies; i++) {
        const labelInPage = currentLabel % (cols * 13); 
        
        if (currentLabel > 0 && labelInPage === 0) {
          doc.addPage();
        }

        const col = labelInPage % cols;
        const row = Math.floor(labelInPage / cols);

        const x = marginX + col * (labelWidth + gapX);
        const y = marginY + row * (labelHeight + gapY);

        // Name
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const nameText = product.description.length > 25 ? product.description.substring(0, 22) + '...' : product.description;
        doc.text(nameText, x + labelWidth / 2, y + 5, { align: 'center' });

        // Barcode Image
        try {
          JsBarcode(canvas, product.internalCode, { 
            format: "CODE128", 
            displayValue: false,
            margin: 0,
            height: 40,
            width: 2
          });
          const barcodeData = canvas.toDataURL('image/png');
          doc.addImage(barcodeData, 'PNG', x + 5, y + 7, 30, 7);
        } catch (e) {
          console.error("Error generating barcode for PDF", e);
        }

        // Barcode text
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(product.internalCode, x + labelWidth / 2, y + 16, { align: 'center' });

        // Divider
        doc.setLineWidth(0.1);
        doc.line(x + 2, y + 18, x + labelWidth - 2, y + 18);

        // Price
        const { resalePrice } = calculateProductPricing(product);
        const displayPrice = product.psychologicalPrice && product.psychologicalPrice > 0 ? product.psychologicalPrice : resalePrice;
        
        doc.setFontSize(7);
        doc.text('Valor', x + labelWidth / 2, y + 21, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(displayPrice), x + labelWidth / 2, y + 24, { align: 'center' });

        currentLabel++;
      }
    });

    if (shouldPrint) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`etiquetas_${new Date().getTime()}.pdf`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-900">Gerador de Etiquetas</h3>
            <p className="text-xs text-gray-500 font-medium">Configure e visualize suas etiquetas antes de imprimir.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/3 border-r border-gray-100 flex flex-col bg-white">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeLabels.length} Produtos Selecionados</span>
              <button onClick={selectAll} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">
                {selectedProducts.every(p => p.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedProducts.map(product => (
                <div key={product.id} className={cn(
                  "p-3 rounded-2xl border transition-all flex items-center gap-3",
                  product.selected ? "border-black bg-gray-50" : "border-gray-100 bg-white"
                )}>
                  <button 
                    onClick={() => toggleProduct(product.id)}
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      product.selected ? "bg-black border-black text-white" : "border-gray-300"
                    )}
                  >
                    {product.selected && <Check size={14} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{product.description}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{product.internalCode}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg p-1">
                    <span className="text-[10px] font-bold text-gray-400 px-1">Qtd:</span>
                    <input 
                      type="number" 
                      min="1"
                      value={product.copies}
                      onChange={(e) => updateCopies(product.id, parseInt(e.target.value))}
                      className="w-10 text-center text-xs font-bold border-none p-0 focus:ring-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex justify-center">
            <div className="bg-white shadow-2xl w-[216mm] min-h-[356mm] p-[10mm] relative origin-top scale-[0.6] md:scale-[0.8] lg:scale-100">
              <div className="absolute top-2 right-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Preview Ofício (216x356mm)</div>
              
              <div className="grid grid-cols-4 gap-[5mm]">
                {activeLabels.flatMap(product => 
                  Array.from({ length: product.copies }).map((_, i) => (
                    <div key={`${product.id}-${i}`} className="w-[40mm] h-[25mm] border border-gray-200 rounded-sm p-2 flex flex-col items-center justify-between bg-white">
                      <p className="text-[7px] font-bold text-center leading-tight truncate w-full">{product.description}</p>
                      <div className="flex-1 flex items-center justify-center scale-75">
                        <Barcode 
                          value={product.internalCode} 
                          width={1} 
                          height={20} 
                          fontSize={8} 
                          margin={0}
                          background="transparent"
                        />
                      </div>
                      <div className="w-full border-t border-gray-100 pt-1 flex flex-col items-center">
                        <span className="text-[6px] text-gray-400 uppercase font-bold">Valor</span>
                        <span className="text-[9px] font-black">
                          {(() => {
                            const { resalePrice } = calculateProductPricing(product);
                            return formatCurrency(product.psychologicalPrice && product.psychologicalPrice > 0 ? product.psychologicalPrice : resalePrice);
                          })()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total de Etiquetas</span>
              <span className="text-lg font-black">{totalLabels}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => generatePDF(false)}
              className="flex items-center gap-2 px-8 py-4 bg-gray-100 text-black rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              <Download size={20} /> Baixar PDF
            </button>
            <button 
              onClick={() => generatePDF(true)}
              className="flex items-center gap-2 px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
            >
              <Printer size={20} /> Imprimir Etiquetas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PricingView = ({ products, setProducts, onUpdateProduct }: { 
  products: any[], 
  setProducts: React.Dispatch<React.SetStateAction<any[]>>,
  onUpdateProduct: (id: string, data: Partial<Product>) => Promise<void>
}) => {
  const [activePricingTab, setActivePricingTab] = useState<'simulator' | 'table'>('table');
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [newProduct, setNewProduct] = useState({
    id: '',
    internalCode: '',
    description: '',
    category: '',
    stock: 0,
    supplier: '',
    image: '',
    cost: 0,
    tag: 0.40,
    plastic: 0.56,
    gift: 4.00,
    cert: 0.66,
    box: 2.12,
    shipping: 2.20,
    profitPercent: 120,
    mercadoPago: 9.60,
    site: 2.50,
    coupon: 5.00,
    psychologicalPrice: 0,
    status: 'Venda Ativa'
  });

  const [calc, setCalc] = useState({
    cost: 30.00,
    tag: 0.40,
    plastic: 0.56,
    gift: 4.00,
    cert: 0.66,
    box: 2.12,
    shipping: 2.20,
    profitPercent: 120,
    mercadoPago: 9.60,
    site: 2.50,
    coupon: 5.00
  });

  // Update newProduct defaults when calc changes
  useEffect(() => {
    setNewProduct(prev => ({
      ...prev,
      tag: calc.tag,
      plastic: calc.plastic,
      gift: calc.gift,
      cert: calc.cert,
      box: calc.box,
      shipping: calc.shipping,
      profitPercent: calc.profitPercent,
      mercadoPago: calc.mercadoPago,
      site: calc.site,
      coupon: calc.coupon
    }));
  }, [calc]);

  const updateInStockProducts = async () => {
    const productsToUpdate = products.filter(p => p.stock > 0);
    for (const p of productsToUpdate) {
      await onUpdateProduct(p.id, {
        tag: calc.tag,
        plastic: calc.plastic,
        gift: calc.gift,
        cert: calc.cert,
        box: calc.box,
        shipping: calc.shipping,
        profitPercent: calc.profitPercent,
        mercadoPago: calc.mercadoPago,
        site: calc.site,
        coupon: calc.coupon
      });
    }
  };

  const [scenarios, setScenarios] = useState([
    { name: 'Atual', price: 124.30, margin: 120 },
    { name: 'Promoção', price: 101.70, margin: 80 },
  ]);

  const baseCost = calc.cost + calc.tag + calc.plastic + calc.gift + calc.cert + calc.box + calc.shipping;
  const variableCosts = 0; // Handled in baseCost now
  const totalDirectCosts = baseCost;
  
  const marginMultiplier = 1 + (calc.profitPercent / 100);
  const deductions = (calc.mercadoPago + calc.site + calc.coupon) / 100;
  const finalPrice = (totalDirectCosts * marginMultiplier) / (1 - deductions);
  
  const profitValue = finalPrice - totalDirectCosts - (finalPrice * deductions);

  const handleSaveScenario = () => {
    const name = prompt('Nome do cenário:');
    if (name) {
      setScenarios([...scenarios, { name, margin: calc.profitPercent, price: finalPrice }]);
    }
  };

  const PricingResult = ({ 
    title, 
    productionCost, 
    variableCosts, 
    taxes, 
    netProfit, 
    suggestedPrice, 
    margin 
  }: { 
    title: string, 
    productionCost: number, 
    variableCosts: number, 
    taxes: number, 
    netProfit: number, 
    suggestedPrice: number, 
    margin: number 
  }) => (
    <div className="premium-card p-8 bg-white border border-gray-100 shadow-sm">
      <h3 className="text-xl font-bold mb-8 text-gray-900">{title}</h3>
      <div className="space-y-5">
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-500 text-sm">Custo de Produção</span>
          <span className="font-bold text-gray-900">{formatCurrency(productionCost)}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-500 text-sm">Custos Variáveis</span>
          <span className="font-bold text-gray-900">{formatCurrency(variableCosts)}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-500 text-sm">Taxas sobre Venda</span>
          <span className="font-bold text-red-500">-{formatCurrency(taxes)}</span>
        </div>
        
        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-gray-900 font-bold">Lucro Líquido Real</span>
          <span className="font-bold text-green-600 text-lg">+{formatCurrency(netProfit)}</span>
        </div>

        <div className="pt-8 mt-4">
          <div className="flex justify-between items-end mb-2">
            <span className="font-bold text-gray-900 text-lg">Preço Sugerido</span>
            <span className="text-4xl font-black text-gray-900">{formatCurrency(suggestedPrice)}</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed max-w-md">
            Preço calculado para garantir {margin}% de margem sobre o custo total, já descontando as taxas de marketplace e impostos.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Precificação Inteligente</h2>
          <p className="text-gray-500">Simule cenários ou gerencie sua tabela oficial de produtos.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActivePricingTab('table')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activePricingTab === 'table' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"
            )}
          >
            Tabela de Preços
          </button>
          <button 
            onClick={() => setActivePricingTab('simulator')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activePricingTab === 'simulator' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"
            )}
          >
            Simulador
          </button>
        </div>
      </div>

      {activePricingTab === 'table' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por código ou descrição..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
              >
                <option value="Todas">Todas Categorias</option>
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
              >
                <option value="Todos">Todos Status</option>
                <option value="Venda Ativa">Venda Ativa</option>
                <option value="Fora de Estoque">Fora de Estoque</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <button 
              onClick={() => setShowProductForm(true)}
              className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg"
            >
              <Plus size={18} /> Adicionar Produto
            </button>
          </div>

          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10 w-10">
                      <button 
                        onClick={() => {
                          if (selectedProductIds.length === products.length) {
                            setSelectedProductIds([]);
                          } else {
                            setSelectedProductIds(products.map(p => p.id));
                          }
                        }}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all",
                          selectedProductIds.length === products.length ? "bg-white border-white text-black" : "border-white/30"
                        )}
                      >
                        {selectedProductIds.length === products.length && <Check size={12} />}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10">Imagem</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10">Situação</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10">Cód. Interno</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10">Descrição</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10">Categoria</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10">Estoque</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold border-r border-white/10">Preço Psicológico</th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold">Preço Revenda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products
                    .filter(p => {
                      const matchesSearch = p.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                          p.internalCode.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesCategory = filterCategory === 'Todas' || p.category === filterCategory;
                      const matchesStatus = filterStatus === 'Todos' || p.status === filterStatus;
                      return matchesSearch && matchesCategory && matchesStatus;
                    })
                    .map((p, idx) => {
                      const { resalePrice } = calculateProductPricing(p);
                      const statusColor = p.status === 'Venda Ativa' ? 'bg-green-100 text-green-700' : 
                                        p.status === 'Fora de Estoque' ? 'bg-orange-100 text-orange-700' : 
                                        'bg-red-100 text-red-700';
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => {
                            setSelectedProduct(p);
                            setEditingProduct({ ...p });
                          }}
                          className={cn(
                            "hover:bg-gray-50 transition-colors text-xs cursor-pointer group",
                            selectedProductIds.includes(p.id) && "bg-gray-50"
                          )}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setSelectedProductIds(prev => 
                                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                );
                              }}
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                selectedProductIds.includes(p.id) ? "bg-black border-black text-white" : "border-gray-300"
                              )}
                            >
                              {selectedProductIds.includes(p.id) && <Check size={12} />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                              {p.image ? (
                                <img src={p.image} alt={p.description} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ShoppingBag size={16} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn("px-2 py-1 rounded-lg font-bold text-[10px] uppercase", statusColor)}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-bold">{p.internalCode}</td>
                          <td className="px-4 py-4 font-medium group-hover:text-black transition-colors">{p.description}</td>
                          <td className="px-4 py-4"><span className="px-2 py-1 bg-gray-100 rounded-lg">{p.category}</span></td>
                          <td className="px-4 py-4 font-bold">{p.stock}</td>
                          <td className="px-4 py-4 font-bold text-blue-600">{formatCurrency(p.psychologicalPrice || 0)}</td>
                          <td className="px-4 py-4 bg-green-50 font-black text-green-700">{formatCurrency(resalePrice)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 premium-card p-8 space-y-10">
            <div className="space-y-8">
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 border-b pb-4">Composição de Custos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Custo Produto</label>
                    <input 
                      type="number" 
                      value={calc.cost} 
                      onChange={e => setCalc({...calc, cost: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tag</label>
                    <input 
                      type="number" 
                      value={calc.tag} 
                      onChange={e => setCalc({...calc, tag: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Plástico</label>
                    <input 
                      type="number" 
                      value={calc.plastic} 
                      onChange={e => setCalc({...calc, plastic: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Brinde</label>
                    <input 
                      type="number" 
                      value={calc.gift} 
                      onChange={e => setCalc({...calc, gift: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Certificado</label>
                    <input 
                      type="number" 
                      value={calc.cert} 
                      onChange={e => setCalc({...calc, cert: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Caixa</label>
                    <input 
                      type="number" 
                      value={calc.box} 
                      onChange={e => setCalc({...calc, box: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Frete</label>
                    <input 
                      type="number" 
                      value={calc.shipping} 
                      onChange={e => setCalc({...calc, shipping: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 border-b pb-4">Venda e Lucro</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">% Lucro</label>
                    <input 
                      type="number" 
                      value={calc.profitPercent} 
                      onChange={e => setCalc({...calc, profitPercent: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mercado Pago (%)</label>
                    <input 
                      type="number" 
                      value={calc.mercadoPago} 
                      onChange={e => setCalc({...calc, mercadoPago: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Site (%)</label>
                    <input 
                      type="number" 
                      value={calc.site} 
                      onChange={e => setCalc({...calc, site: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Cupom (%)</label>
                    <input 
                      type="number" 
                      value={calc.coupon} 
                      onChange={e => setCalc({...calc, coupon: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={updateInStockProducts}
                  className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
                >
                  <RefreshCcw size={14} /> Aplicar Novos Custos aos Produtos em Estoque
                </button>
              </div>
            </div>

            <div className="pt-10 border-t border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">Cenários Salvos</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {scenarios.map((s, i) => (
                  <div key={i} className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 hover:border-black transition-all cursor-pointer group relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setScenarios(scenarios.filter((_, idx) => idx !== i));
                      }} 
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-900">{s.name}</p>
                      <p className="text-2xl font-black text-gray-900">{formatCurrency(s.price)}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Margem: {s.margin}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <PricingResult 
              title="Resultado da Simulação"
              productionCost={baseCost}
              variableCosts={variableCosts}
              taxes={finalPrice * deductions}
              netProfit={profitValue}
              suggestedPrice={finalPrice}
              margin={calc.profitPercent}
            />
            <button 
              onClick={handleSaveScenario}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Salvar Cenário
            </button>
          </div>
        </div>
      )}

      {showProductForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">Novo Produto na Tabela</h3>
              <button onClick={() => setShowProductForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {(() => {
              const { totalCost: formTotalCost, resalePrice: formResalePrice, deductionsVal, profitVal } = calculateProductPricing(newProduct);
              return (
                <div className="mb-10">
                  <PricingResult 
                    title="Prévia de Precificação"
                    productionCost={newProduct.cost}
                    variableCosts={formTotalCost - newProduct.cost}
                    taxes={deductionsVal}
                    netProfit={profitVal}
                    suggestedPrice={formResalePrice}
                    margin={newProduct.profitPercent}
                  />
                </div>
              );
            })()}

            <form className="space-y-8" onSubmit={(e) => { 
              e.preventDefault(); 
              setProducts([...products, { ...newProduct, id: newProduct.id || `PR${Math.floor(Math.random() * 10000)}` }]);
              setShowProductForm(false);
              // Reset form
              setNewProduct({
                id: '', internalCode: '', description: '', category: '', stock: 0, supplier: '',
                image: '',
                cost: 0, tag: calc.tag, plastic: calc.plastic, gift: calc.gift, cert: calc.cert, box: calc.box, shipping: calc.shipping,
                profitPercent: calc.profitPercent, mercadoPago: calc.mercadoPago, site: calc.site, coupon: calc.coupon,
                psychologicalPrice: 0,
                status: 'Venda Ativa'
              });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cód. Interno (Minha Loja)</label>
                  <input 
                    type="text" 
                    value={newProduct.internalCode}
                    onChange={e => setNewProduct({...newProduct, internalCode: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">URL da Imagem</label>
                  <input 
                    type="text" 
                    value={newProduct.image}
                    onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                  <input 
                    type="text" 
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                  <input 
                    type="text" 
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Estoque Inicial</label>
                  <input 
                    type="number" 
                    value={newProduct.stock}
                    onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Fornecedor</label>
                  <input 
                    type="text" 
                    value={newProduct.supplier}
                    onChange={e => setNewProduct({...newProduct, supplier: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b pb-4">Composição de Custos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Custo Produto</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={newProduct.cost}
                      onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold" 
                    />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tag (Simulador)</label>
                    <input type="number" readOnly value={newProduct.tag} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Plástico (Simulador)</label>
                    <input type="number" readOnly value={newProduct.plastic} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Brinde (Simulador)</label>
                    <input type="number" readOnly value={newProduct.gift} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Certificado (Simulador)</label>
                    <input type="number" readOnly value={newProduct.cert} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Caixa (Simulador)</label>
                    <input type="number" readOnly value={newProduct.box} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Frete (Simulador)</label>
                    <input type="number" readOnly value={newProduct.shipping} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b pb-4">Venda e Lucro</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">% Lucro (Simulador)</label>
                    <input type="number" readOnly value={newProduct.profitPercent} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-bold" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Mercado Pago (Simulador)</label>
                    <input type="number" readOnly value={newProduct.mercadoPago} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Site (Simulador)</label>
                    <input type="number" readOnly value={newProduct.site} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Cupom (Simulador)</label>
                    <input type="number" readOnly value={newProduct.coupon} className="w-full bg-gray-100 border-none rounded-xl p-4 cursor-not-allowed font-medium" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic">* Estes valores são predefinidos no Simulador. Altere lá para mudar o padrão de novos cadastros.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Preço Psicológico (Etiquetas)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newProduct.psychologicalPrice}
                    onChange={e => setNewProduct({...newProduct, psychologicalPrice: Number(e.target.value)})}
                    className="w-full bg-blue-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-bold text-blue-700" 
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-blue-400 italic">Valor que sairá na etiqueta. Se 0, usa o custo.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Situação do Produto</label>
                  <select 
                    value={newProduct.status}
                    onChange={e => setNewProduct({...newProduct, status: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                  >
                    <option value="Venda Ativa">Venda Ativa</option>
                    <option value="Fora de Estoque">Fora de Estoque</option>
                    <option value="Cancelado">Cancelado (Descontinuado)</option>
                  </select>
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                <button type="button" onClick={() => setShowProductForm(false)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold shadow-xl hover:bg-gray-800 transition-all">Salvar Produto na Tabela</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Floating Bar for Selected Products */}
      <AnimatePresence>
        {selectedProductIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-4 rounded-3xl shadow-2xl z-50 flex items-center gap-8 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center font-black text-sm">
                {selectedProductIds.length}
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Produtos Selecionados</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex gap-4">
              <button 
                onClick={() => setShowLabelModal(true)}
                className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-xl text-sm font-black hover:bg-gray-200 transition-all shadow-lg"
              >
                <Tag size={18} /> Gerar Etiquetas
              </button>
              <button 
                onClick={() => setSelectedProductIds([])}
                className="text-white/60 hover:text-white text-sm font-bold transition-colors"
              >
                Limpar Seleção
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label Generation Modal */}
      {showLabelModal && (
        <LabelModal 
          isOpen={showLabelModal} 
          onClose={() => setShowLabelModal(false)} 
          initialProducts={products.filter(p => selectedProductIds.includes(p.id))}
        />
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedProduct(null);
                setEditingProduct(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{editingProduct.description}</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{editingProduct.internalCode}</p>
                  </div>
                </div>
                <button onClick={() => {
                  setSelectedProduct(null);
                  setEditingProduct(null);
                }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                      <div className="w-full sm:w-48 h-48 rounded-3xl bg-gray-100 overflow-hidden border border-gray-100 shadow-inner flex-shrink-0">
                        {editingProduct.image ? (
                          <img src={editingProduct.image} alt={editingProduct.description} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ShoppingBag size={48} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 gap-4 w-full">
                        <div className="p-4 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Categoria</p>
                          <p className="font-bold">{editingProduct.category}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Estoque</p>
                          <p className="font-bold">{editingProduct.stock} unidades</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fornecedor</p>
                          <p className="font-bold">{editingProduct.supplier}</p>
                        </div>
                      </div>
                    </div>

                    <div className="premium-card p-6 bg-blue-50 border-blue-100 border">
                      <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-blue-600">Preço Psicológico (Etiquetas)</h4>
                      <div className="space-y-4">
                        <p className="text-[10px] text-blue-500 font-medium leading-relaxed">
                          Este valor será utilizado exclusivamente na geração de etiquetas. 
                          Se deixado em zero, o sistema utilizará o preço de custo.
                        </p>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-blue-400">R$</span>
                          <input 
                            type="number" 
                            value={editingProduct.psychologicalPrice || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, psychologicalPrice: Number(e.target.value) })}
                            className="w-full bg-white border-blue-200 rounded-xl p-4 pl-10 focus:ring-2 focus:ring-blue-500 font-black text-blue-700 transition-all"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="premium-card p-6 bg-gray-50 border-none">
                      <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-400">Composição de Custos Detalhada</h4>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <span className="text-gray-500">Tag:</span>
                        <span className="text-right font-medium">{formatCurrency(editingProduct.tag)}</span>
                        <span className="text-gray-500">Plástico:</span>
                        <span className="text-right font-medium">{formatCurrency(editingProduct.plastic)}</span>
                        <span className="text-gray-500">Brinde:</span>
                        <span className="text-right font-medium">{formatCurrency(editingProduct.gift)}</span>
                        <span className="text-gray-500">Certificado:</span>
                        <span className="text-right font-medium">{formatCurrency(editingProduct.cert)}</span>
                        <span className="text-gray-500">Caixa:</span>
                        <span className="text-right font-medium">{formatCurrency(editingProduct.box)}</span>
                        <span className="text-gray-500">Frete:</span>
                        <span className="text-right font-medium">{formatCurrency(editingProduct.shipping)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {(() => {
                      const pricing = calculateProductPricing(editingProduct);
                      return (
                        <div className="space-y-6">
                          <PricingResult 
                            title="Detalhamento Financeiro"
                            productionCost={editingProduct.cost}
                            variableCosts={pricing.totalCost - editingProduct.cost}
                            taxes={pricing.deductionsVal}
                            netProfit={pricing.profitVal}
                            suggestedPrice={pricing.resalePrice}
                            margin={editingProduct.profitPercent}
                          />

                          <div className="premium-card p-6 bg-gray-50 border-none">
                            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-400">Taxas de Venda</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                              <span className="text-gray-500">Mercado Pago:</span>
                              <span className="text-right font-medium">{editingProduct.mercadoPago}%</span>
                              <span className="text-gray-500">Site:</span>
                              <span className="text-right font-medium">{editingProduct.site}%</span>
                              <span className="text-gray-500">Cupom:</span>
                              <span className="text-right font-medium">{editingProduct.coupon}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t flex gap-4">
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Fechar
                </button>
                <button 
                  onClick={async () => {
                    await onUpdateProduct(editingProduct.id, editingProduct);
                    setSelectedProduct(null);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-2xl font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrderForm = ({ onClose, products, clients, onAddOrder }: { onClose: () => void, products: any[], clients: Client[], onAddOrder: (order: Order) => void }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    productId: '',
    internalCode: '',
    productDescription: '',
    measurements: '',
    totalValue: 0,
    downPayment: 0,
    balanceDue: 0,
    paymentMethod: 'pix' as 'pix' | 'debito' | 'credito',
    installments: 1,
    dueDate: '',
    status: 'Aberto' as OrderStatus,
    notes: ''
  });

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === formData.productId);
  }, [formData.productId, products]);

  useEffect(() => {
    if (selectedProduct) {
      const { resalePrice } = calculateProductPricing(selectedProduct);
      const price = selectedProduct.psychologicalPrice && selectedProduct.psychologicalPrice > 0 
        ? selectedProduct.psychologicalPrice 
        : resalePrice;
      
      setFormData(prev => ({
        ...prev,
        productDescription: selectedProduct.description,
        internalCode: selectedProduct.internalCode,
        totalValue: price
      }));
    }
  }, [selectedProduct]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      balanceDue: Math.max(0, prev.totalValue - prev.downPayment)
    }));
  }, [formData.totalValue, formData.downPayment]);

  const installmentValue = useMemo(() => {
    if (formData.paymentMethod === 'credito' && formData.installments > 0) {
      return formData.balanceDue / formData.installments;
    }
    return 0;
  }, [formData.paymentMethod, formData.installments, formData.balanceDue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder: Order = {
      id: `ORD${Math.floor(Math.random() * 10000)}`,
      clientId: formData.clientId,
      clientName: clients.find(c => c.id === formData.clientId)?.name || 'Cliente Desconhecido',
      productId: formData.productId,
      internalCode: formData.internalCode,
      productDescription: formData.productDescription,
      measurements: formData.measurements,
      totalValue: formData.totalValue,
      downPayment: formData.downPayment,
      balanceDue: formData.balanceDue,
      paymentMethod: formData.paymentMethod,
      installments: formData.installments,
      installmentValue: installmentValue,
      dueDate: formData.dueDate,
      status: formData.status,
      notes: formData.notes,
      createdAt: new Date().toISOString()
    };
    onAddOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold">Nova Ordem</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                <select 
                  value={formData.clientId}
                  onChange={e => setFormData(prev => ({...prev, clientId: e.target.value}))}
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Produto (Catálogo)</label>
                <select 
                  value={formData.productId}
                  onChange={e => setFormData(prev => ({...prev, productId: e.target.value}))}
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.internalCode} - {p.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Medidas</label>
                <input 
                  type="text" 
                  value={formData.measurements}
                  onChange={e => setFormData(prev => ({...prev, measurements: e.target.value}))}
                  placeholder="Ex: Aro 16" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Valor Total</label>
                <input 
                  type="number" 
                  value={formData.totalValue}
                  onChange={e => setFormData(prev => ({...prev, totalValue: Number(e.target.value)}))}
                  placeholder="0.00" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Sinal Recebido</label>
                <input 
                  type="number" 
                  value={formData.downPayment}
                  onChange={e => setFormData(prev => ({...prev, downPayment: Number(e.target.value)}))}
                  placeholder="0.00" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold text-green-600" 
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor Restante a Receber</p>
                <p className="text-2xl font-black text-red-600">{formatCurrency(formData.balanceDue)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status do Pagamento</p>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  formData.balanceDue === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                )}>
                  {formData.balanceDue === 0 ? 'Pago Total' : 'Pendente'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'pix', label: 'PIX' },
                  { id: 'debito', label: 'Débito' },
                  { id: 'credito', label: 'Crédito' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, paymentMethod: method.id as any}))}
                    className={cn(
                      "py-3 rounded-xl font-bold text-sm transition-all border-2",
                      formData.paymentMethod === method.id 
                        ? "bg-black text-white border-black shadow-md" 
                        : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.paymentMethod === 'credito' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Parcelas</label>
                    <select 
                      value={formData.installments}
                      onChange={e => setFormData(prev => ({...prev, installments: Number(e.target.value)}))}
                      className="w-full bg-white border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,12].map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Valor da Parcela</label>
                    <div className="w-full bg-white rounded-xl p-4 font-black text-lg">
                      {formatCurrency(installmentValue)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <Clock size={16} />
                  <span className="text-xs font-bold">Recebimento total em aproximadamente {formData.installments * 30} dias</span>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Data de Vencimento</label>
                <input 
                  type="date" 
                  value={formData.dueDate}
                  onChange={e => setFormData(prev => ({...prev, dueDate: e.target.value}))}
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Status Inicial</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData(prev => ({...prev, status: e.target.value as OrderStatus}))}
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all font-bold"
                >
                  <option value="Aberto">Aberto</option>
                  <option value="Pago">Pago</option>
                  <option value="Reservado">Reservado</option>
                  <option value="Atrasado">Atrasado</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Observações Especiais</label>
              <textarea 
                rows={3} 
                value={formData.notes}
                onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                placeholder="Detalhes da gravação, embalagem, etc..."
              ></textarea>
            </div>

            <div className="pt-4 flex gap-4">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold transition-all">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold shadow-xl hover:bg-gray-800 transition-all">Cadastrar Ordem</button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const OrdersView = ({ products, clients, orders, setOrders, onAddOrder, onDeleteOrder }: { products: any[], clients: Client[], orders: Order[], setOrders: React.Dispatch<React.SetStateAction<Order[]>>, onAddOrder: (order: Order) => void, onDeleteOrder: (id: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.productDescription.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, orders]);

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case 'Pago': return 'bg-green-100 text-green-700';
      case 'Aberto': return 'bg-blue-100 text-blue-700';
      case 'Reservado': return 'bg-amber-100 text-amber-700';
      case 'Atrasado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const generateOrderPDF = (order: Order) => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === order.clientId);
    
    // Header
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DA ORDEM', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${order.id}`, 160, 25);
    
    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA CLIENTE', 20, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${order.clientName}`, 20, 65);
    if (client) {
      doc.text(`WhatsApp: ${client.whatsapp}`, 20, 72);
      doc.text(`E-mail: ${client.email}`, 20, 79);
      if (client.instagram) doc.text(`Instagram: ${client.instagram}`, 20, 86);
    }
    
    // Order Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA COMPRA', 20, 105);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Produto: ${order.productDescription}`, 20, 115);
    doc.text(`Código: ${order.internalCode || 'N/A'}`, 20, 122);
    doc.text(`Medidas: ${order.measurements}`, 20, 129);
    doc.text(`Data da Ordem: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`, 20, 136);
    
    // Payment Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAGAMENTO', 20, 155);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Valor Total: ${formatCurrency(order.totalValue)}`, 20, 165);
    doc.text(`Sinal Recebido: ${formatCurrency(order.downPayment)}`, 20, 172);
    doc.text(`Saldo Restante: ${formatCurrency(order.balanceDue)}`, 20, 179);
    doc.text(`Forma de Pagamento: ${order.paymentMethod?.toUpperCase() || 'N/A'}`, 20, 186);
    
    if (order.paymentMethod === 'credito' && order.installments) {
      doc.text(`Parcelamento: ${order.installments}x de ${formatCurrency(order.installmentValue || 0)}`, 20, 193);
    }
    
    if (order.dueDate) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`VENCIMENTO DO SALDO: ${order.dueDate}`, 20, 205);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    }
    
    // Status
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS ATUAL', 20, 225);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(order.status, 20, 235);
    
    // Footer
    doc.setDrawColor(240, 240, 240);
    doc.line(20, 260, 190, 260);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Obrigado pela preferência! Este documento serve como comprovante de ordem.', 20, 270);
    
    doc.save(`ordem_${order.id}_${order.clientName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Gestão de Ordem</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar ordem..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black transition-all text-sm"
            />
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-gray-800 transition-all"
          >
            <Plus size={18} /> Nova Ordem
          </button>
        </div>
      </div>

      {isFormOpen && (
        <OrderForm 
          onClose={() => setIsFormOpen(false)} 
          products={products} 
          clients={clients}
          onAddOrder={onAddOrder}
        />
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Cliente</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Produto</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Pagamento</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Valor</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{order.clientName}</p>
                    <p className="text-[10px] text-gray-400">ID: {order.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{order.productDescription}</p>
                    <p className="text-[10px] text-gray-400 italic">{order.measurements}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 rounded-md">
                          {order.paymentMethod || 'N/A'}
                        </span>
                        {order.installments && order.installments > 1 && (
                          <span className="text-[10px] font-bold text-blue-600">
                            {order.installments}x
                          </span>
                        )}
                      </div>
                      {order.installmentValue && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatCurrency(order.installmentValue)}/mês
                        </p>
                      )}
                      {order.dueDate && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-red-500">
                          <Calendar size={10} />
                          Vence: {order.dueDate}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold">{formatCurrency(order.totalValue)}</p>
                    <p className="text-[10px] text-amber-600 font-medium">Restam {formatCurrency(order.balanceDue)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusColor(order.status))}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => generateOrderPDF(order)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                        title="Gerar PDF da Ordem"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta ordem?')) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                        title="Excluir Ordem"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-black">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ClientForm = ({ onClose, onAddClient }: { onClose: () => void, onAddClient?: (client: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    email: '',
    birthday: '',
    instagram: '',
    tag: 'Ativo' as Client['tag'],
    preferences: '',
    notes: '',
    avatar: ''
  });

  const [isFetching, setIsFetching] = useState(false);

  const fetchInstagramAvatar = () => {
    if (!formData.instagram) return;
    setIsFetching(true);
    const username = formData.instagram.replace('@', '').trim();
    // Using unavatar.io as a reliable proxy for social media avatars
    const avatarUrl = `https://unavatar.io/instagram/${username}`;
    setFormData(prev => ({ ...prev, avatar: avatarUrl }));
    setTimeout(() => setIsFetching(false), 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold">Novo Cliente</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onAddClient?.(formData); onClose(); }}>
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="relative group">
                <div className="w-24 h-24 bg-gray-100 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center relative">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Users className="text-gray-300" size={32} />
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[10px] font-bold uppercase">
                    Alterar
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
                {formData.avatar && (
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Foto do Perfil</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Maria Oliveira" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                <input 
                  type="text" 
                  value={formData.whatsapp}
                  onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">E-mail</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="maria@email.com" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Data de Aniversário</label>
                <input 
                  type="date" 
                  value={formData.birthday}
                  onChange={e => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase">Instagram</label>
                  <button 
                    type="button"
                    onClick={fetchInstagramAvatar}
                    disabled={!formData.instagram || isFetching}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-300 flex items-center gap-1"
                  >
                    {isFetching ? <RefreshCcw size={10} className="animate-spin" /> : <Instagram size={10} />}
                    Puxar Foto
                  </button>
                </div>
                <input 
                  type="text" 
                  value={formData.instagram}
                  onChange={e => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@usuario" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Classificação</label>
                <select 
                  value={formData.tag}
                  onChange={e => setFormData(prev => ({ ...prev, tag: e.target.value as Client['tag'] }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="VIP">VIP</option>
                  <option value="Atacado">Atacado</option>
                  <option value="Consignado">Consignado</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Preferências Pessoais</label>
              <textarea 
                rows={2} 
                value={formData.preferences}
                onChange={e => setFormData(prev => ({ ...prev, preferences: e.target.value }))}
                className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                placeholder="Ex: Prefere prata fosca, tamanho de anel 16..."
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Observações Gerais</label>
              <textarea 
                rows={2} 
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
              ></textarea>
            </div>

            <div className="pt-4 flex gap-4">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold transition-all">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold shadow-xl hover:bg-gray-800 transition-all">Cadastrar Cliente</button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const ClientDetailsModal = ({ client, orders, ordensServico, onClose }: { client: Client, orders: Order[], ordensServico: OrdemServico[], onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'repairs'>('orders');

  const clientOrders = useMemo(() => {
    return orders.filter(o => o.clientId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [client.id, orders]);

  const clientOS = useMemo(() => {
    return ordensServico.filter(os => os.clientId === client.id).sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));
  }, [client.id, ordensServico]);

  const averageTicket = useMemo(() => {
    return clientOrders.length > 0 ? client.totalSpent / clientOrders.length : 0;
  }, [client.totalSpent, clientOrders.length]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold text-gray-400">
              {client.avatar ? (
                <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                client.name.charAt(0)
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{client.name}</h3>
              <p className="text-sm text-gray-400">{client.email} • {client.whatsapp}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Gasto</p>
              <p className="text-xl font-black">{formatCurrency(client.totalSpent)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Ticket Médio</p>
              <p className="text-xl font-black text-green-600">{formatCurrency(averageTicket)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Pedidos</p>
              <p className="text-xl font-black">{clientOrders.length}</p>
            </div>
          </div>

          <div className="flex gap-4 border-b border-gray-100">
            <button 
              onClick={() => setActiveTab('orders')}
              className={cn(
                "pb-4 text-sm font-bold transition-all relative",
                activeTab === 'orders' ? "text-black" : "text-gray-400"
              )}
            >
              Histórico de Compras
              {activeTab === 'orders' && <motion.div layoutId="clientTab" className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('repairs')}
              className={cn(
                "pb-4 text-sm font-bold transition-all relative",
                activeTab === 'repairs' ? "text-black" : "text-gray-400"
              )}
            >
              Consertos / OS
              {activeTab === 'repairs' && <motion.div layoutId="clientTab" className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-full" />}
            </button>
          </div>

          {activeTab === 'orders' ? (
            <div>
              {clientOrders.length > 0 ? (
                <div className="space-y-4">
                  {clientOrders.map(order => (
                    <div key={order.id} className="p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold">{order.productDescription}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')} • ID: {order.id}
                          </p>
                        </div>
                        <p className="text-sm font-black">{formatCurrency(order.totalValue)}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          order.status === 'Pago' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {order.status}
                        </span>
                        <p className="text-[10px] text-gray-400 italic">{order.measurements}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <ShoppingBag className="mx-auto text-gray-300 mb-3" size={32} />
                  <p className="text-sm text-gray-400 font-medium">Nenhuma compra registrada ainda.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {clientOS.length > 0 ? (
                <div className="space-y-4">
                  {clientOS.map(os => (
                    <div key={os.id} className="p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold">{os.pecaDescricao}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">
                            Entrada: {new Date(os.dataEntrada).toLocaleDateString('pt-BR')} • OS: {os.id.substring(0, 8)}
                          </p>
                        </div>
                        <p className="text-sm font-black">{formatCurrency(os.valorConserto || 0)}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          os.status === 'concluida' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {os.status.replace('_', ' ')}
                        </span>
                        <p className="text-[10px] text-gray-400 italic">{os.tipoDano.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <Wrench className="mx-auto text-gray-300 mb-3" size={32} />
                  <p className="text-sm text-gray-400 font-medium">Nenhum conserto registrado ainda.</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-widest">Preferências</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl italic">
                {client.preferences || "Nenhuma preferência registrada."}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-widest">Observações</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl">
                {client.notes || "Nenhuma observação registrada."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CRMView = ({ clients, setClients, orders, ordensServico, onAddClient, onUpdateClient, onDeleteClient }: { 
  clients: Client[], 
  setClients: React.Dispatch<React.SetStateAction<Client[]>>, 
  orders: Order[],
  ordensServico: OrdemServico[],
  onAddClient: (data: any) => Promise<void>,
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<void>,
  onDeleteClient: (id: string) => Promise<void>
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {isFormOpen && <ClientForm onClose={() => setIsFormOpen(false)} onAddClient={onAddClient} />}
      
      {selectedClient && (
        <ClientDetailsModal 
          client={selectedClient} 
          orders={orders} 
          ordensServico={ordensServico}
          onClose={() => setSelectedClient(null)} 
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => {
          const clientOrders = orders.filter(o => o.clientId === client.id);
          const avgTicket = clientOrders.length > 0 ? client.totalSpent / clientOrders.length : 0;

          return (
            <div key={client.id} className="premium-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-bold text-gray-400">
                    {client.avatar ? (
                      <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      client.name.charAt(0)
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onDeleteClient(client.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      client.tag === 'VIP' ? "bg-black text-white" : 
                      client.tag === 'Inativo' ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {client.tag}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-1">{client.name}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-4">
                  <Phone size={12} /> {client.whatsapp}
                  {client.instagram && <><span className="w-1 h-1 bg-gray-300 rounded-full"></span> <Instagram size={12} /> {client.instagram}</>}
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Ticket Médio</span>
                    <span className="font-bold">{formatCurrency(avgTicket)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Total Gasto</span>
                    <span className="font-bold">{formatCurrency(client.totalSpent)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                  <MessageSquare size={14} /> WhatsApp
                </button>
                <button 
                  onClick={() => setSelectedClient(client)}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <History size={14} /> Histórico
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SupplierForm = ({ onClose, onAddSupplier }: { onClose: () => void, onAddSupplier?: (supplier: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    whatsapp: '',
    email: '',
    material: '',
    deliveryTime: 7,
    googleMapsUrl: '',
    minPurchase: 0,
    paymentTerms: '',
    notes: '',
    qualityRating: 5
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold">Novo Fornecedor</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onAddSupplier?.(formData); onClose(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nome ou Razão Social</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Pratas do Sul" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Contato (Pessoa)</label>
                <input 
                  type="text" 
                  value={formData.contact}
                  onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="Nome do vendedor" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                <input 
                  type="text" 
                  value={formData.whatsapp}
                  onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">E-mail de Contato</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@fornecedor.com" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Material Fornecido</label>
                <input 
                  type="text" 
                  value={formData.material}
                  onChange={e => setFormData(prev => ({ ...prev, material: e.target.value }))}
                  placeholder="Ex: Correntes, Pedras..." 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Prazo Médio (Dias)</label>
                <input 
                  type="number" 
                  value={formData.deliveryTime}
                  onChange={e => setFormData(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) }))}
                  placeholder="7" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Endereço (Google Maps)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="url" 
                    value={formData.googleMapsUrl}
                    onChange={e => setFormData(prev => ({ ...prev, googleMapsUrl: e.target.value }))}
                    placeholder="Link do Google Maps" 
                    className="w-full bg-gray-50 border-none rounded-xl p-4 pl-12 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Compra Mínima (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="number" 
                    value={formData.minPurchase}
                    onChange={e => setFormData(prev => ({ ...prev, minPurchase: parseFloat(e.target.value) }))}
                    placeholder="1000" 
                    className="w-full bg-gray-50 border-none rounded-xl p-4 pl-12 focus:ring-2 focus:ring-black transition-all" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Condições de Pagamento</label>
                <input 
                  type="text" 
                  value={formData.paymentTerms}
                  onChange={e => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  placeholder="Ex: 30/60 dias" 
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Avaliação Inicial (1-5)</label>
                <select 
                  value={formData.qualityRating}
                  onChange={e => setFormData(prev => ({ ...prev, qualityRating: parseInt(e.target.value) }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Estrelas</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Observações</label>
              <textarea 
                rows={3} 
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-black transition-all"
              ></textarea>
            </div>

            <div className="pt-4 flex gap-4">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold transition-all">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold shadow-xl hover:bg-gray-800 transition-all">Cadastrar Fornecedor</button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const SuppliersView = ({ suppliers, setSuppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }: { 
  suppliers: Supplier[], 
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>,
  onAddSupplier: (data: any) => Promise<void>,
  onUpdateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>,
  onDeleteSupplier: (id: string) => Promise<void>
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const getSupplierPerformance = (supplierName: string) => {
    // We'll use the products from props if available, but for now we'll use MOCK_PRODUCTS as fallback
    // Actually, it's better to pass products to SuppliersView if we want real data.
    // For now, let's keep it simple.
    return {
      totalRevenue: 0,
      topProducts: []
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fornecedores</h2>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold"
        >
          <Plus size={18} /> Novo Fornecedor
        </button>
      </div>

      {isFormOpen && <SupplierForm onClose={() => setIsFormOpen(false)} onAddSupplier={onAddSupplier} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {suppliers.map(supplier => {
          const performance = getSupplierPerformance(supplier.name);
          
          return (
            <div key={supplier.id} className="premium-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{supplier.name}</h3>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">{supplier.material}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onDeleteSupplier(supplier.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[10px] font-bold">
                    ★ {supplier.qualityRating}.0
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Prazo Médio</p>
                  <p className="text-sm font-bold">{supplier.deliveryTime} dias</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Compra Mínima</p>
                  <p className="text-sm font-bold">{formatCurrency(supplier.minPurchase || 0)}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-black text-white rounded-2xl">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] uppercase font-bold opacity-60">Faturamento Gerado</p>
                    <TrendingUp size={14} className="opacity-60" />
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(performance.totalRevenue)}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Produtos Mais Vendidos</p>
                  <div className="space-y-1">
                    {performance.topProducts.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded-lg">
                        <span className="font-medium truncate mr-2">{p.name}</span>
                        <span className="font-bold whitespace-nowrap">{p.salesCount} vendas</span>
                      </div>
                    ))}
                    {performance.topProducts.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Sem dados de vendas</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {supplier.googleMapsUrl && (
                  <a 
                    href={supplier.googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin size={14} /> Ver no Maps
                  </a>
                )}
                <button className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                  <MessageSquare size={14} /> WhatsApp
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


const CalendarView = () => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const events = [
    { day: 5, title: 'Entrega #o2', type: 'delivery' },
    { day: 10, title: 'Entrega #o1', type: 'delivery' },
    { day: 15, title: 'Niver Ana Silva', type: 'birthday' },
    { day: 20, title: 'Pagamento Fornecedor', type: 'payment' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Calendário Inteligente</h2>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} className="rotate-180" /></button>
          <span className="text-lg font-bold">Abril 2024</span>
          <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="premium-card p-8">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const dayEvents = events.filter(e => e.day === day);
            return (
              <div key={day} className="aspect-square border border-gray-50 rounded-xl p-2 hover:bg-gray-50 transition-colors group relative">
                <span className="text-xs font-bold text-gray-400 group-hover:text-black">{day}</span>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((e, i) => (
                    <div key={i} className={cn(
                      "h-1.5 w-full rounded-full",
                      e.type === 'delivery' ? "bg-blue-400" : 
                      e.type === 'birthday' ? "bg-pink-400" : "bg-amber-400"
                    )} />
                  ))}
                </div>
                {dayEvents.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-xl p-2">
                    <p className="text-[8px] font-bold text-center leading-tight">{dayEvents[0].title}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-xs font-bold text-blue-900">Entregas Programadas</span>
        </div>
        <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-xl">
          <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
          <span className="text-xs font-bold text-pink-900">Aniversários de Clientes</span>
        </div>
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
          <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
          <span className="text-xs font-bold text-amber-900">Pagamentos / Compras</span>
        </div>
      </div>
    </div>
  );
};

const AIAssistantView = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, type?: 'text' | 'image' | 'map' }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'normal' | 'thinking' | 'low-latency'>('normal');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [showImageGen, setShowImageGen] = useState(false);

  const generateResponse = async (prompt: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setInput('');

    let modelName = 'gemini-3-flash-preview';
    let config: any = {};

    if (mode === 'thinking') {
      modelName = 'gemini-3.1-pro-preview';
      config = { thinkingConfig: { thinkingLevel: 'HIGH' } };
    } else if (mode === 'low-latency') {
      modelName = 'gemini-3.1-flash-lite-preview';
    }

    // Check if it's a map request
    const isMapRequest = prompt.toLowerCase().includes('onde') || prompt.toLowerCase().includes('mapa') || prompt.toLowerCase().includes('perto');
    if (isMapRequest) {
      modelName = 'gemini-3-flash-preview';
      config.tools = [{ googleMaps: {} }];
    }

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: modelName,
          config
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.text || 'Não consegui processar sua solicitação.', type: isMapRequest ? 'map' : 'text' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA. Verifique sua chave de API.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async (prompt: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: `Gerar imagem (${aspectRatio}): ${prompt}` }]);
    setShowImageGen(false);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: { parts: [{ text: prompt }] },
          model: 'gemini-3.1-flash-image-preview',
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: '1K'
            }
          }
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      if (data.imageData) {
        setMessages(prev => [...prev, { role: 'assistant', content: `data:image/png;base64,${data.imageData}`, type: 'image' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Não foi possível gerar a imagem.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao gerar imagem.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">IA Assistente</h2>
          <p className="text-sm text-gray-400 font-medium">Sua inteligência artificial para gestão e criação.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setMode('normal')}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", mode === 'normal' ? "bg-white shadow-sm text-black" : "text-gray-400")}
          >
            Padrão
          </button>
          <button 
            onClick={() => setMode('thinking')}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", mode === 'thinking' ? "bg-white shadow-sm text-black" : "text-gray-400")}
          >
            <BrainCircuit size={14} /> Alta Reflexão
          </button>
          <button 
            onClick={() => setMode('low-latency')}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", mode === 'low-latency' ? "bg-white shadow-sm text-black" : "text-gray-400")}
          >
            <Zap size={14} /> Baixa Latência
          </button>
        </div>
      </div>

      <div className="flex-1 premium-card flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-black">
                <Sparkles size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Como posso ajudar hoje?</h3>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">Posso analisar dados, gerar imagens de coleções ou encontrar fornecedores próximos.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                <button onClick={() => generateResponse("Quais são meus produtos mais lucrativos?")} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-bold text-left transition-all">
                  Analisar Lucratividade
                </button>
                <button onClick={() => setShowImageGen(true)} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-bold text-left transition-all">
                  Gerar Imagem de Coleção
                </button>
                <button onClick={() => generateResponse("Onde encontrar fornecedores de prata 925 em São Paulo?")} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-bold text-left transition-all">
                  Buscar Fornecedores (Mapa)
                </button>
                <button onClick={() => generateResponse("Resumo financeiro do mês")} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-bold text-left transition-all">
                  Resumo Financeiro
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl shadow-sm",
                msg.role === 'user' ? "bg-black text-white" : "bg-gray-50 text-gray-800"
              )}>
                {msg.type === 'image' ? (
                  <div className="space-y-3">
                    <img src={msg.content} alt="AI Generated" className="rounded-xl w-full" referrerPolicy="no-referrer" />
                    <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                      Download Imagem
                    </button>
                  </div>
                ) : msg.type === 'map' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MapIcon size={16} className="text-blue-600" />
                      <span className="text-xs font-bold">Resultados do Google Maps</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="h-32 bg-gray-200 rounded-xl flex items-center justify-center">
                      <MapPin size={24} className="text-gray-400" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 p-4 rounded-2xl flex gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>

        {showImageGen && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Configuração de Imagem</h4>
              <button onClick={() => setShowImageGen(false)} className="text-gray-400 hover:text-black"><X size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(ratio => (
                <button 
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all",
                    aspectRatio === ratio ? "bg-black border-black text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-t border-gray-100">
          <form 
            onSubmit={e => {
              e.preventDefault();
              if (showImageGen) generateImage(input);
              else generateResponse(input);
            }}
            className="flex gap-3"
          >
            <button 
              type="button"
              onClick={() => setShowImageGen(!showImageGen)}
              className={cn(
                "p-4 rounded-2xl transition-all",
                showImageGen ? "bg-black text-white" : "bg-gray-100 text-gray-400 hover:text-black"
              )}
            >
              <ImageIcon size={20} />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={showImageGen ? "Descreva a imagem que deseja gerar..." : "Pergunte qualquer coisa sobre seu negócio..."}
              className="flex-1 bg-gray-50 border-none rounded-2xl px-6 focus:ring-2 focus:ring-black transition-all text-sm"
            />
            <button 
              disabled={!input || isLoading}
              className="bg-black text-white p-4 rounded-2xl disabled:bg-gray-200 transition-all shadow-lg"
            >
              <ArrowUpRight size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const AutomationsView = () => {
  const automations = [
    { id: 1, name: 'Reposição Automática', description: 'Sugere compras quando o estoque atinge o nível mínimo.', status: 'Ativo', icon: TrendingUp },
    { id: 2, name: 'Alerta de Prejuízo', description: 'Notifica se a margem de um produto cair abaixo de 20%.', status: 'Ativo', icon: AlertCircle },
    { id: 3, name: 'Oportunidade de Venda', description: 'Identifica clientes VIP que não compram há mais de 30 dias.', status: 'Ativo', icon: Users },
    { id: 4, name: 'Etiquetas Inteligentes', description: 'Classifica clientes automaticamente (VIP, Ativo, Inativo).', status: 'Ativo', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Centro de Automações</h2>
          <p className="text-sm text-gray-500">Configure as regras inteligentes do seu negócio.</p>
        </div>
        <button className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold">
          Nova Regra
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automations.map(auto => (
          <div key={auto.id} className="premium-card p-6 flex gap-4 hover:border-black transition-all group">
            <div className="p-3 bg-gray-50 rounded-2xl h-fit group-hover:bg-black group-hover:text-white transition-all">
              <auto.icon size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{auto.name}</h3>
                <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {auto.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{auto.description}</p>
              <div className="flex items-center justify-between">
                <button className="text-xs font-bold text-black flex items-center gap-1 hover:gap-2 transition-all">
                  Configurar Parâmetros <ChevronRight size={14} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 bg-black rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card p-8 bg-black text-white overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">IA de Sugestão de Vendas</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md">
            Nossa inteligência identificou 12 clientes com alta probabilidade de compra para a nova coleção de colares.
          </p>
          <button className="px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
            Ver Oportunidades
          </button>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const alerts = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const ordensAtrasadas = orders.filter(o => {
      if (!o.dueDate || o.status === 'Pago') return false;
      return new Date(o.dueDate) < now;
    });

    const ordensVencendo = orders.filter(o => {
      if (!o.dueDate || o.status === 'Pago') return false;
      const d = new Date(o.dueDate);
      return d >= now && d <= threeDaysFromNow;
    });

    const contasAtrasadas = transactions.filter(t => 
      t.status === 'pendente' && new Date(t.date) < now
    );

    const estoqueCritico = products.filter(p => p.stock <= p.minStock);

    return { ordensAtrasadas, ordensVencendo, contasAtrasadas, estoqueCritico };
  }, [orders, transactions, products]);

  const totalAlerts = alerts.ordensAtrasadas.length + alerts.ordensVencendo.length + alerts.contasAtrasadas.length + alerts.estoqueCritico.length;

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Check for placeholder credentials
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      console.error('Supabase credentials are placeholders. Please set them in the environment variables.');
      setError('Erro de Configuração: As credenciais do banco de dados não foram configuradas nos Secrets.');
      setIsAuthReady(true);
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch(err => {
        console.error('Error getting session:', err);
        if (err.message === 'Failed to fetch') {
          setError('Erro de conexão com o banco de dados. Verifique se a URL e a Key estão corretas nos Secrets.');
        }
      })
      .finally(() => {
        setIsAuthReady(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session?.user) return;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setError('Configuração do Supabase ausente. Por favor, adicione as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nos Secrets.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [
        { data: clientsData, error: clientsError },
        { data: suppliersData, error: suppliersError },
        { data: productsData, error: productsError },
        { data: ordersData, error: ordersError },
        { data: transactionsData, error: transactionsError },
        { data: osData, error: osError }
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', session.user.id),
        supabase.from('suppliers').select('*').eq('user_id', session.user.id),
        supabase.from('products').select('*').eq('user_id', session.user.id),
        supabase.from('orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
        supabase.from('ordens_servico').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
      ]);

      if (clientsError || suppliersError || productsError || ordersError || transactionsError || osError) {
        throw new Error('Erro ao carregar dados do servidor.');
      }

      if (clientsData) setClients(clientsData as Client[]);
      if (suppliersData) setSuppliers(suppliersData as Supplier[]);
      if (productsData) setProducts(productsData as Product[]);
      if (ordersData) {
        const fetchedOrders = ordersData as Order[];
        setOrders(fetchedOrders);
        
        // Automatic Overdue Status Update
        const today = new Date();
        const overdueOrders = fetchedOrders.filter(o => 
          o.status === 'Aberto' && o.dueDate && new Date(o.dueDate) < today
        );
        
        if (overdueOrders.length > 0) {
          for (const order of overdueOrders) {
            await supabase
              .from('orders')
              .update({ status: 'Atrasado' })
              .eq('id', order.id);
          }
          // Re-fetch orders to get updated status
          const { data: updatedOrders } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
          if (updatedOrders) setOrders(updatedOrders as Order[]);
        }
      }
      if (transactionsData) setTransactions(transactionsData as Transaction[]);
      if (osData) setOrdensServico(osData as OrdemServico[]);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      setError(err.message || 'Ocorreu um erro ao carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && session) {
      fetchData();
      
      // Set up real-time subscriptions
      const clientsChannel = supabase.channel('clients-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${session.user.id}` }, fetchData)
        .subscribe();
      
      const productsChannel = supabase.channel('products-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${session.user.id}` }, fetchData)
        .subscribe();

      const ordersChannel = supabase.channel('orders-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${session.user.id}` }, fetchData)
        .subscribe();

      const transactionsChannel = supabase.channel('transactions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, fetchData)
        .subscribe();

      const osChannel = supabase.channel('os-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico', filter: `user_id=eq.${session.user.id}` }, fetchData)
        .subscribe();

      return () => {
        supabase.removeChannel(clientsChannel);
        supabase.removeChannel(productsChannel);
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(osChannel);
      };
    }
  }, [isAuthReady, session]);

  const handleAddOrder = async (order: Order) => {
    if (!session?.user) return;
    try {
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([{ ...order, user_id: session.user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Interlink with clients
      const client = clients.find(c => c.id === order.clientId);
      if (client) {
        await supabase
          .from('clients')
          .update({
            purchaseHistory: [...(client.purchaseHistory || []), newOrder.id],
            totalSpent: (client.totalSpent || 0) + order.totalValue,
            lastPurchaseDate: order.createdAt
          })
          .eq('id', order.clientId);
      }

      // Interlink with stock
      if (order.productId) {
        const product = products.find(p => p.id === order.productId);
        if (product) {
          const newStock = Math.max(0, product.stock - 1);
          const newReserved = order.status === 'Reservado' ? (product.reserved || 0) + 1 : (product.reserved || 0);
          const newSalesCount = (order.status === 'Pago' || order.status === 'Aberto') ? (product.salesCount || 0) + 1 : (product.salesCount || 0);
          
          await supabase
            .from('products')
            .update({
              stock: newStock,
              reserved: newReserved,
              salesCount: newSalesCount,
              movements: [
                ...(product.movements || []),
                {
                  id: `m${Date.now()}`,
                  type: 'saída',
                  reason: 'venda',
                  quantity: 1,
                  date: new Date().toISOString().split('T')[0],
                  note: `Pedido ${order.id} - Status: ${order.status}`
                }
              ]
            })
            .eq('id', order.productId);
        }
      }
    } catch (error) {
      console.error("Error adding order:", error);
    }
  };

  const handleAddClient = async (clientData: any) => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...clientData, purchaseHistory: [], totalSpent: 0, user_id: session.user.id }])
        .select();
      
      if (error) throw error;
      if (data) setClients(prev => [...prev, ...data]);
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

  const handleUpdateClient = async (clientId: string, clientData: Partial<Client>) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', clientId)
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...clientData } : c));
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!session?.user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cliente',
      message: 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId)
            .eq('user_id', session.user.id);
          
          if (error) throw error;
          setClients(prev => prev.filter(c => c.id !== clientId));
          showToast('Cliente excluído com sucesso');
        } catch (error) {
          console.error("Error deleting client:", error);
          showToast('Erro ao excluir cliente', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddSupplier = async (supplierData: any) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('suppliers')
        .insert([{ ...supplierData, user_id: session.user.id }]);
      if (error) throw error;
      showToast('Fornecedor adicionado com sucesso');
    } catch (error) {
      console.error("Error adding supplier:", error);
      showToast('Erro ao adicionar fornecedor', 'error');
    }
  };

  const handleUpdateSupplier = async (supplierId: string, supplierData: Partial<Supplier>) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('suppliers')
        .update(supplierData)
        .eq('id', supplierId);
      if (error) throw error;
      showToast('Fornecedor atualizado com sucesso');
    } catch (error) {
      console.error("Error updating supplier:", error);
      showToast('Erro ao atualizar fornecedor', 'error');
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!session?.user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Fornecedor',
      message: 'Tem certeza que deseja excluir este fornecedor?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', supplierId)
            .eq('user_id', session.user.id);
          
          if (error) throw error;
          setSuppliers(prev => prev.filter(s => s.id !== supplierId));
          showToast('Fornecedor excluído com sucesso');
        } catch (error) {
          console.error("Error deleting supplier:", error);
          showToast('Erro ao excluir fornecedor', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddProduct = async (productData: any) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('products')
        .insert([{ ...productData, user_id: session.user.id }]);
      if (error) throw error;
      showToast('Produto adicionado com sucesso');
    } catch (error) {
      console.error("Error adding product:", error);
      showToast('Erro ao adicionar produto', 'error');
    }
  };

  const handleUpdateProduct = async (productId: string, productData: Partial<Product>) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId);
      if (error) throw error;
      showToast('Produto atualizado com sucesso');
    } catch (error) {
      console.error("Error updating product:", error);
      showToast('Erro ao atualizar produto', 'error');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!session?.user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: 'Tem certeza que deseja excluir este produto?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
            .eq('user_id', session.user.id);
          
          if (error) throw error;
          setProducts(prev => prev.filter(p => p.id !== productId));
          showToast('Produto excluído com sucesso');
        } catch (error) {
          console.error("Error deleting product:", error);
          showToast('Erro ao excluir produto', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!session?.user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Pedido',
      message: 'Tem certeza que deseja excluir este pedido?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)
            .eq('user_id', session.user.id);
          
          if (error) throw error;
          setOrders(prev => prev.filter(o => o.id !== orderId));
          showToast('Pedido excluído com sucesso');
        } catch (error) {
          console.error("Error deleting order:", error);
          showToast('Erro ao excluir pedido', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddOS = async (osData: any) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .insert([{ ...osData, user_id: session.user.id }]);
      if (error) throw error;
      showToast('Ordem de Serviço aberta com sucesso');
    } catch (error) {
      console.error("Error adding OS:", error);
      showToast('Erro ao abrir OS', 'error');
    }
  };

  const handleUpdateOS = async (osId: string, osData: any) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update(osData)
        .eq('id', osId);
      if (error) throw error;
      showToast('Ordem de Serviço atualizada');
    } catch (error) {
      console.error("Error updating OS:", error);
      showToast('Erro ao atualizar OS', 'error');
    }
  };

  const handleDeleteOS = async (osId: string) => {
    if (!session?.user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir OS',
      message: 'Tem certeza que deseja excluir esta Ordem de Serviço?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('ordens_servico')
            .delete()
            .eq('id', osId)
            .eq('user_id', session.user.id);
          
          if (error) throw error;
          setOrdensServico(prev => prev.filter(os => os.id !== osId));
          showToast('OS excluída com sucesso');
        } catch (error) {
          console.error("Error deleting OS:", error);
          showToast('Erro ao excluir OS', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardView products={products} transactions={transactions} clients={clients} alerts={alerts} />;
      case 'pricing': return <PricingView products={products} setProducts={setProducts} onUpdateProduct={handleUpdateProduct} />;
      case 'orders': return <OrdersView products={products} clients={clients} orders={orders} setOrders={setOrders} onAddOrder={handleAddOrder} onDeleteOrder={handleDeleteOrder} />;
      case 'crm': return <CRMView clients={clients} setClients={setClients} orders={orders} ordensServico={ordensServico} onAddClient={handleAddClient} onUpdateClient={handleUpdateClient} onDeleteClient={handleDeleteClient} />;
      case 'suppliers': return <SuppliersView suppliers={suppliers} setSuppliers={setSuppliers} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} />;
      case 'financial': return <FinancialView products={products} orders={orders} clients={clients} suppliers={suppliers} transactions={transactions} ordensServico={ordensServico} user={session.user} />;
      case 'os': return <OrdemServicoView ordensServico={ordensServico} orders={orders} clients={clients} onAddOS={handleAddOS} onUpdateOS={handleUpdateOS} onDeleteOS={handleDeleteOS} />;
      case 'ai': return <AIAssistantView />;
      case 'calendar': return <CalendarView />;
      case 'stock': return <StockView products={products} setProducts={setProducts} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} />;
      case 'automations': return <AutomationsView />;
      case 'admin': return <AdminView />;
      case 'profile': return <ProfileView user={session?.user} />;
      default: return <DashboardView products={products} transactions={transactions} clients={clients} alerts={alerts} />;
    }
  };

  return (
    <ErrorBoundary>
      {/* Error Banner */}
      {error && (
        <div className="fixed top-4 right-4 z-[100] max-w-md animate-in fade-in slide-in-from-top-4">
          <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold shadow-xl">
            <AlertCircle size={18} />
            <div className="flex-1">
              <p>{error}</p>
              <button onClick={() => fetchData()} className="mt-1 underline hover:text-red-800 transition-colors">Tentar novamente</button>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[90] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sincronizando Dados...</p>
          </div>
        </div>
      )}

      <div className="min-h-screen flex bg-[#fcfcfc] text-gray-900">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden p-8 shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white rounded-full"></div>
                  </div>
                  <h1 className="text-lg font-black tracking-tighter">PRATA 925</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Tag} label="Precificação" active={activeTab === 'pricing'} onClick={() => { setActiveTab('pricing'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={TrendingUp} label="Controle de estoque" active={activeTab === 'stock'} onClick={() => { setActiveTab('stock'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={ShoppingBag} label="Ordem" active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Users} label="Cadastro de clientes" active={activeTab === 'crm'} onClick={() => { setActiveTab('crm'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Wrench} label="Ordens de Serviço" active={activeTab === 'os'} onClick={() => { setActiveTab('os'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Truck} label="Fornecedores" active={activeTab === 'suppliers'} onClick={() => { setActiveTab('suppliers'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={DollarSign} label="Financeiro" active={activeTab === 'financial'} onClick={() => { setActiveTab('financial'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Sparkles} label="IA Assistente" active={activeTab === 'ai'} onClick={() => { setActiveTab('ai'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Calendar} label="Calendário" active={activeTab === 'calendar'} onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Bell} label="Automações" active={activeTab === 'automations'} onClick={() => { setActiveTab('automations'); setIsMobileMenuOpen(false); }} />
                {session?.user?.email === (import.meta.env.VITE_ADMIN_EMAIL || (typeof process !== 'undefined' ? process.env.VITE_ADMIN_EMAIL : '')) && (
                  <SidebarItem icon={Shield} label="Administração" active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }} />
                )}
              </nav>

              <div className="mt-8 p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Suporte</p>
                <button className="text-xs font-bold flex items-center gap-2">
                  Falar com Consultor <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-gray-100 overflow-hidden hidden lg:block"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">PRATA 925</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestão Premium</p>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={Tag} label="Precificação" active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} />
            <SidebarItem icon={TrendingUp} label="Controle de estoque" active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
            <SidebarItem icon={ShoppingBag} label="Ordem" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
            <SidebarItem icon={Users} label="Cadastro de clientes" active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} />
            <SidebarItem icon={Wrench} label="Ordens de Serviço" active={activeTab === 'os'} onClick={() => setActiveTab('os')} />
            <SidebarItem icon={Truck} label="Fornecedores" active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} />
            <SidebarItem icon={DollarSign} label="Financeiro" active={activeTab === 'financial'} onClick={() => setActiveTab('financial')} />
            <SidebarItem icon={Sparkles} label="IA Assistente" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
            <SidebarItem icon={Calendar} label="Calendário" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <SidebarItem icon={Bell} label="Automações" active={activeTab === 'automations'} onClick={() => setActiveTab('automations')} />
            {session?.user?.email === (import.meta.env.VITE_ADMIN_EMAIL || (typeof process !== 'undefined' ? process.env.VITE_ADMIN_EMAIL : '')) && (
              <SidebarItem icon={Shield} label="Administração" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            )}
          </nav>

          <div className="mt-20 p-6 bg-gray-50 rounded-2xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Suporte Premium</p>
            <button className="text-sm font-bold flex items-center gap-2 hover:translate-x-1 transition-transform">
              Falar com Consultor <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:block hidden"
            >
              <Menu size={20} />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold capitalize">
              {activeTab === 'dashboard' ? 'Dashboard' : 
               activeTab === 'pricing' ? 'Precificação' :
               activeTab === 'stock' ? 'Controle de estoque' :
               activeTab === 'orders' ? 'Ordem' :
               activeTab === 'crm' ? 'Cadastro de clientes' :
               activeTab === 'suppliers' ? 'Fornecedores' :
               activeTab === 'financial' ? 'Financeiro' :
               activeTab === 'ai' ? 'IA Assistente' :
               activeTab === 'profile' ? 'Meu Perfil' :
               activeTab === 'calendar' ? 'Agenda' : 'Automações'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisa global..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black transition-all text-sm w-64"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={20} />
                {totalAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {totalAlerts}
                  </span>
                )}
              </button>
              <div className="pl-4 border-l border-gray-100">
                <UserPanel user={session?.user} onProfileClick={() => setActiveTab('profile')} />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 font-bold text-sm",
              toast.type === 'success' ? "bg-white border-green-100 text-green-600" : "bg-white border-red-100 text-red-600"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2">{confirmModal.title}</h3>
              <p className="text-gray-500 text-sm mb-8">{confirmModal.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
