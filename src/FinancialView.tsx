import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingBag,
  AlertCircle, CheckCircle2, Clock, Plus, X, Download, Trash2,
  Zap, Users, Package, Truck, BarChart3, Target,
  ArrowUpRight, ArrowDownRight, Calendar, Filter, FileText
} from 'lucide-react';
import { Client, Order, Product, Supplier, Transaction, TxType, TxCategory, TxStatus, TxPayment, OrdemServico } from './types';
import { formatCurrency, formatPercent, cn } from './lib/utils';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CATEGORY_LABELS: Record<TxCategory, string> = {
  venda: 'Venda',
  compra_fornecedor: 'Compra Fornecedor',
  impostos: 'Impostos',
  materiais: 'Materiais',
  pro_labore: 'Pró-labore',
  marketing: 'Marketing',
  aluguel: 'Aluguel',
  despesas_fixas: 'Despesas Fixas (Luz, Água, Internet)',
  funcionario: 'Funcionário',
  taxa: 'Taxa',
  despesa_operacional: 'Despesa Operacional',
  outro: 'Outro',
};

const PAYMENT_LABELS: Record<TxPayment, string> = {
  pix: 'Pix',
  'cartão_débito': 'Débito',
  'cartão_crédito': 'Crédito',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
  outro: 'Outro',
};

const COLORS = ['#1a1a1a', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5'];

const TABS = [
  { key: 'lancamentos', label: 'Lançamentos' },
  { key: 'resumo',      label: 'Resumo'      },
  { key: 'analise',     label: 'Análise Inteligente' },
] as const;

export const FinancialView = ({
  products, orders, clients, suppliers, transactions, ordensServico, user
}: {
  products: Product[];
  orders: Order[];
  clients: Client[];
  suppliers: Supplier[];
  transactions: Transaction[];
  ordensServico: OrdemServico[];
  user: User;
}) => {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('lancamentos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [revenueGoal, setRevenueGoal] = useState(20000);
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    status: 'all',
  });

  const automaticTransactions = useMemo<Transaction[]>(() => {
    const list: Transaction[] = [];

    // Pedidos com status 'Pago' → entrada automática
    orders
      .filter(o => o.status === 'Pago')
      .forEach(o => {
        list.push({
          id: `auto-order-${o.id}`,
          date: o.createdAt,
          type: 'entrada',
          category: 'venda',
          description: `Pedido #${o.id} — ${o.clientName}`,
          value: o.totalValue,
          status: 'pago',
          paymentMethod: 'pix', // Defaulting to pix if not specified
          clientId: o.clientId,
          orderId: o.id,
          isAutomatic: true,
        });
      });

    // Produtos com custo e estoque → saída automática de compra
    products
      .filter(p => p.cost > 0 && p.stock > 0)
      .forEach(p => {
        const sup = suppliers.find(s => s.name === p.supplier);
        list.push({
          id: `auto-product-${p.id}`,
          date: p.lastRestockDate || new Date().toISOString().split('T')[0],
          type: 'saída',
          category: 'compra_fornecedor',
          description: `Reposição: ${p.name} (${p.stock} un.)`,
          value: p.cost * p.stock,
          status: 'pago',
          paymentMethod: 'outro',
          supplierId: sup?.id,
          productId: p.id,
          isAutomatic: true,
        });
      });

    return list;
  }, [orders, products, suppliers]);

  const allTransactions = useMemo(() => {
    return [...transactions, ...automaticTransactions].sort((a, b) => {
      const dateA = a.date || '1970-01-01';
      const dateB = b.date || '1970-01-01';
      return dateB.localeCompare(dateA);
    });
  }, [transactions, automaticTransactions]);

  const handleAddTransaction = async (txData: any) => {
    try {
      if (editingTx) {
        const { error } = await supabase
          .from('transactions')
          .update(txData)
          .eq('id', editingTx.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([{
            ...txData,
            user_id: user.id,
            is_automatic: false
          }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingTx(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      return true;
    });
  }, [allTransactions, filters]);

  const totals = useMemo(() => {
    const entradas = allTransactions.filter(t => t.type === 'entrada' && t.status !== 'cancelado').reduce((s, t) => s + t.value, 0);
    const saidas = allTransactions.filter(t => t.type === 'saída' && t.status !== 'cancelado').reduce((s, t) => s + t.value, 0);
    const pendente = allTransactions.filter(t => t.status === 'pendente').reduce((s, t) => s + t.value, 0);
    const lucro = entradas - saidas;
    const margem = entradas > 0 ? (lucro / entradas) * 100 : 0;
    const vendasCount = allTransactions.filter(t => t.category === 'venda' && t.status === 'pago').length;
    const ticketMedio = vendasCount > 0 ? entradas / vendasCount : 0;

    return { entradas, saidas, lucro, margem, pendente, ticketMedio, vendasCount };
  }, [allTransactions]);

  const pieChartData = useMemo(() => {
    const categories = allTransactions
      .filter(t => t.type === 'saída' && t.status !== 'cancelado')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.value;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(categories).map(([name, value]) => ({
      name: CATEGORY_LABELS[name as TxCategory],
      value
    })).sort((a, b) => (b.value as number) - (a.value as number));
  }, [allTransactions]);

  const handleExport = () => {
    const report = [
      '=== RELATÓRIO FINANCEIRO — PRATA 925 ===',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      '',
      `Total Entradas:    ${formatCurrency(totals.entradas)}`,
      `Total Saídas:      ${formatCurrency(totals.saidas)}`,
      `Lucro Líquido:     ${formatCurrency(totals.lucro)}`,
      `Margem Geral:      ${totals.margem.toFixed(1)}%`,
      '',
      `Total lançamentos: ${allTransactions.length}`,
      `Automáticos:       ${allTransactions.filter(t => t.isAutomatic).length}`,
      `Manuais:           ${allTransactions.filter(t => !t.isAutomatic).length}`,
    ].join('\n');
    alert(report);
  };

  const generateMonthlyReport = () => {
    const doc = new jsPDF();
    const now = new Date();
    const monthName = now.toLocaleString('pt-BR', { month: 'long' });
    const year = now.getFullYear();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Relatório Mensal — ${monthName} / ${year}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${now.toLocaleString('pt-BR')}`, 105, 28, { align: 'center' });

    // Financial Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total de Entradas', formatCurrency(totals.entradas)],
        ['Total de Saídas', formatCurrency(totals.saidas)],
        ['Lucro Líquido', formatCurrency(totals.lucro)],
        ['Margem Geral', `${totals.margem.toFixed(1)}%`],
        ['Ticket Médio', formatCurrency(totals.ticketMedio)],
        ['Total de Vendas', totals.vendasCount.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] }
    });

    // Best Selling Products
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Produtos mais Vendidos', 14, (doc as any).lastAutoTable.finalY + 15);

    const topProducts = [...products]
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 5);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Produto', 'Qtd Vendida', 'Custo Total', 'Preço Médio']],
      body: topProducts.map(p => [
        p.description || p.name || 'N/A',
        p.salesCount || 0,
        formatCurrency(p.cost || 0),
        formatCurrency(p.price || 0)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] }
    });

    // Recent Orders
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Últimos Pedidos', 14, 20);

    autoTable(doc, {
      startY: 25,
      head: [['ID', 'Cliente', 'Data', 'Valor', 'Status']],
      body: orders.slice(0, 15).map(o => [
        `#${o.id.substring(0, 8)}`,
        o.clientName,
        new Date(o.createdAt).toLocaleDateString('pt-BR'),
        formatCurrency(o.totalValue),
        o.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] }
    });

    // Recent OS
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ordens de Serviço Recentes', 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['ID', 'Cliente', 'Peça', 'Dano', 'Status']],
      body: ordensServico.slice(0, 10).map(os => [
        `#${os.id.substring(0, 8)}`,
        os.clientName,
        os.pecaDescricao,
        os.tipoDano,
        os.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] }
    });

    doc.save(`relatorio_mensal_${monthName}_${year}.pdf`);
  };

  const urgencyBadge = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (date < today)
      return { label: 'Vencido', cls: 'bg-red-50 text-red-700' };
    if (date === today)
      return { label: 'Hoje', cls: 'bg-orange-50 text-orange-700' };
    const diffDays = Math.floor(
      (new Date(date).getTime() - new Date(today).getTime()) / 86400000
    );
    if (diffDays <= 7)
      return { label: 'Esta semana', cls: 'bg-amber-50 text-amber-700' };
    return { label: 'Em breve', cls: 'bg-gray-50 text-gray-500' };
  };

  const upcomingPayments = useMemo(() => {
    return allTransactions
      .filter(t => t.status === 'pendente')
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);
  }, [allTransactions]);

  const analysisData = useMemo(() => {
    const topProducts = [...products]
      .map(p => ({
        ...p,
        totalProfit: (p.price - p.cost) * (p.salesCount || 0)
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);

    const topClients = [...clients]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5);

    const supplierCosts = (() => {
      const map: Record<string, { name: string; cost: number; qty: number }> = {};
      products.forEach(p => {
        const key = p.supplier || 'Desconhecido';
        if (!map[key]) map[key] = { name: key, cost: 0, qty: 0 };
        map[key].cost += p.cost * (p.stock || 0);
        map[key].qty += 1;
      });
      return Object.values(map).sort((a, b) => b.cost - a.cost);
    })();

    const totalSupCost = supplierCosts.reduce((s, x) => s + x.cost, 0);

    const categoryPerf = (() => {
      const map: Record<string, { receita: number; custo: number; qty: number }> = {};
      products.forEach(p => {
        if (!map[p.category]) map[p.category] = { receita: 0, custo: 0, qty: 0 };
        map[p.category].receita += p.price * (p.salesCount || 0);
        map[p.category].custo += p.cost * (p.salesCount || 0);
        map[p.category].qty += p.salesCount || 0;
      });
      return Object.entries(map)
        .map(([cat, d]) => ({
          category: cat,
          receita: d.receita,
          custo: d.custo,
          lucro: d.receita - d.custo,
          margem: d.receita > 0 ? ((d.receita - d.custo) / d.receita) * 100 : 0,
        }))
        .sort((a, b) => b.lucro - a.lucro);
    })();

    return { topProducts, topClients, supplierCosts, totalSupCost, categoryPerf };
  }, [products, clients]);

  const alerts = useMemo(() => {
    const list: {
      type: 'warning' | 'info' | 'success' | 'danger';
      message: string;
      action: string;
    }[] = [];

    products
      .filter(p => p.margin < 20)
      .forEach(p => list.push({
        type: 'warning',
        message: `⚠️ "${p.name}" tem margem baixa de ${p.margin.toFixed(0)}% — considere reajustar o preço`,
        action: 'Ver produto',
      }));

    const today = new Date();
    clients
      .filter(c => c.lastPurchaseDate)
      .forEach(c => {
        const diff = Math.floor(
          (today.getTime() - new Date(c.lastPurchaseDate!).getTime()) / 86400000
        );
        if (diff >= 30) list.push({
          type: 'info',
          message: `👤 ${c.name} não compra há ${diff} dias — boa hora para entrar em contato`,
          action: 'Contatar cliente',
        });
      });

    if (analysisData.supplierCosts.length > 0) {
      const top = analysisData.supplierCosts[0];
      const pct = analysisData.totalSupCost > 0
        ? ((top.cost / analysisData.totalSupCost) * 100).toFixed(0)
        : '0';
      list.push({
        type: 'info',
        message: `🏭 "${top.name}" representa ${pct}% dos seus custos totais`,
        action: 'Ver fornecedor',
      });
    }

    if (totals.margem < 30 && totals.entradas > 0) list.push({
      type: 'danger',
      message: `📉 Sua margem geral está em ${totals.margem.toFixed(1)}% — abaixo do recomendado (30%)`,
      action: 'Ver resumo',
    });

    const champ = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))[0];
    if (champ?.salesCount > 0) list.push({
      type: 'success',
      message: `🔥 "${champ.name}" é seu campeão de vendas com ${champ.salesCount} unidades`,
      action: 'Ver produto',
    });

    products
      .filter(p => (p.salesCount || 0) > 20 && p.margin < 50)
      .forEach(p => list.push({
        type: 'warning',
        message: `💡 "${p.name}" vende muito (${p.salesCount} un.) mas margem é baixa (${p.margin.toFixed(0)}%) — oportunidade de ajuste`,
        action: 'Ver produto',
      }));

    return list;
  }, [products, clients, analysisData, totals]);

  const monthlyData = useMemo(() => {
    const months = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'];
    const now = new Date();
    const result = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthName = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      return {
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        entradas: 0,
        saidas: 0
      };
    });

    allTransactions.forEach(t => {
      const d = new Date(t.date);
      const month = result.find(m => m.monthIdx === d.getMonth() && m.year === d.getFullYear());
      if (month) {
        if (t.type === 'entrada') month.entradas += t.value;
        else if (t.type === 'saída') month.saidas += t.value;
      }
    });

    return result;
  }, [allTransactions]);

  const projections = useMemo(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentMonthData = monthlyData[monthlyData.length - 1];
    const currentRevenue = currentMonthData.entradas;
    const projectedRevenue = (currentRevenue / dayOfMonth) * daysInMonth;
    const currentMargin = currentMonthData.entradas > 0
      ? (currentMonthData.entradas - currentMonthData.saidas) / currentMonthData.entradas
      : 0;
    const projectedProfit = projectedRevenue * currentMargin;

    return { dayOfMonth, daysInMonth, projectedRevenue, projectedProfit, currentRevenue };
  }, [monthlyData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-2.5 rounded-xl text-sm font-bold transition',
                activeTab === tab.key
                  ? 'bg-white shadow text-black'
                  : 'text-gray-500 hover:text-black'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateMonthlyReport}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition shadow-lg"
          >
            <FileText size={16} /> Relatório PDF
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border-2 border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-black transition"
          >
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      {activeTab === 'lancamentos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <select 
                value={filters.type}
                onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="all">Todos os Tipos</option>
                <option value="entrada">Entradas</option>
                <option value="saída">Saídas</option>
              </select>
              <select 
                value={filters.category}
                onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="all">Todas as Categorias</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select 
                value={filters.status}
                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="all">Todos os Status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-gray-800 transition"
            >
              <Plus size={18} /> Novo Lançamento
            </button>
          </div>

          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Data</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tipo</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Categoria</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Descrição</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Valor</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Pagamento</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Origem</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-gray-600">
                        {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          t.type === 'entrada' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        )}>
                          {t.type === 'entrada' ? "↑ Entrada" : "↓ Saída"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {CATEGORY_LABELS[t.category]}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900">{t.description}</span>
                          {t.isAutomatic && (
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                              <Zap size={10} /> Automático
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-xs font-bold",
                          t.type === 'entrada' ? "text-green-600" : "text-red-600"
                        )}>
                          {t.type === 'entrada' ? '+' : '-'}{formatCurrency(t.value)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          t.status === 'pago' ? "bg-green-50 text-green-700" : 
                          t.status === 'pendente' ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-400"
                        )}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {PAYMENT_LABELS[t.paymentMethod]}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          {t.clientId && <><Users size={11}/> {clients.find(c => c.id === t.clientId)?.name}</>}
                          {t.supplierId && <><Truck size={11}/> {suppliers.find(s => s.id === t.supplierId)?.name}</>}
                          {t.orderId && <><Package size={11}/> #{t.orderId}</>}
                          {!t.clientId && !t.supplierId && !t.orderId && <span className="text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!t.isAutomatic && (
                            <button 
                              onClick={() => { setEditingTx(t); setIsModalOpen(true); }}
                              className="p-1.5 text-gray-400 hover:text-black transition-colors"
                              title="Editar"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Entradas</p>
                  <p className="text-lg font-black text-green-600">+{formatCurrency(totals.entradas)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Saídas</p>
                  <p className="text-lg font-black text-red-600">-{formatCurrency(totals.saidas)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Período</p>
                  <p className={cn("text-lg font-black", totals.lucro >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(totals.lucro)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 font-medium">{filteredTransactions.length} lançamentos encontrados</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resumo' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="premium-card p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Faturamento Total</p>
                <ArrowUpRight size={16} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">{formatCurrency(totals.entradas)}</h3>
            </div>
            <div className="premium-card p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Total Despesas</p>
                <ArrowDownRight size={16} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-red-600">{formatCurrency(totals.saidas)}</h3>
            </div>
            <div className="premium-card p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Lucro Líquido</p>
                <BarChart3 size={16} className={totals.lucro >= 0 ? "text-green-500" : "text-red-500"} />
              </div>
              <h3 className={cn("text-2xl font-black", totals.lucro >= 0 ? "text-green-600" : "text-red-600")}>
                {formatCurrency(totals.lucro)}
              </h3>
            </div>
            <div className="premium-card p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Margem Geral</p>
                <Target size={16} className={totals.margem >= 30 ? "text-green-500" : "text-amber-500"} />
              </div>
              <h3 className={cn("text-2xl font-black", totals.margem >= 30 ? "text-green-600" : "text-amber-600")}>
                {totals.margem.toFixed(1)}%
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="premium-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Ticket Médio</p>
                <p className="text-lg font-bold">{formatCurrency(totals.ticketMedio)}</p>
              </div>
            </div>
            <div className="premium-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Pedidos Pagos</p>
                <p className="text-lg font-bold">{totals.vendasCount}</p>
              </div>
            </div>
            <div className="premium-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Pendências</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(totals.pendente)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="premium-card p-6">
              <h3 className="font-bold mb-6">Entradas vs Saídas por Mês</h3>
              <div style={{ width: "100%", height: 320 }} className="min-h-[320px]">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="entradas" fill="#16a34a" radius={[6, 6, 0, 0]} barSize={20} />
                    <Bar dataKey="saidas" fill="#dc2626" radius={[6, 6, 0, 0]} barSize={20} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="premium-card p-6">
              <h3 className="font-bold mb-6">Evolução do Lucro Líquido</h3>
              <div style={{ width: "100%", height: 300 }} className="min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData.map(d => ({ ...d, lucro: d.entradas - d.saidas }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="lucro" stroke="#1a1a1a" strokeWidth={3} dot={{ r: 4, fill: '#1a1a1a' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="premium-card p-6 lg:col-span-1">
              <h3 className="font-bold mb-6">Despesas por Categoria</h3>
              <div className="flex flex-col items-center gap-6">
                <div style={{ width: '100%', height: 220 }} className="min-h-[220px]">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie 
                        data={pieChartData} 
                        cx="50%" 
                        cy="50%"
                        innerRadius={55} 
                        outerRadius={80}
                        paddingAngle={4} 
                        dataKey="value"
                      >
                        {pieChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2.5">
                  {pieChartData.map((item, i) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold">{formatCurrency(item.value as number)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="premium-card p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold">Próximos Vencimentos</h3>
                <button className="text-xs font-bold text-gray-400 hover:text-black transition">Ver todos</button>
              </div>
              <div className="space-y-4">
                {upcomingPayments.map(t => {
                  const urgency = urgencyBadge(t.date);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                          <TrendingDown size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{t.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-medium">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", urgency.cls)}>
                              {urgency.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-black text-red-600">{formatCurrency(t.value)}</p>
                    </div>
                  );
                })}
                {upcomingPayments.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Nenhum pagamento pendente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analise' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="premium-card p-6">
              <h3 className="font-bold mb-6">Produtos mais Lucrativos</h3>
              <div className="space-y-6">
                {analysisData.topProducts.map((p, idx) => {
                  const maxProfit = analysisData.topProducts[0].totalProfit || 1;
                  return (
                    <div key={p.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold">#{idx + 1}</span>
                          <span className="font-bold text-gray-900 truncate max-w-[180px]">{p.name}</span>
                        </div>
                        <span className="font-black text-green-600">{formatCurrency(p.totalProfit)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black transition-all duration-1000" 
                          style={{ width: `${(p.totalProfit / maxProfit) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="premium-card p-6">
              <h3 className="font-bold mb-6">Clientes mais Lucrativos</h3>
              <div className="space-y-6">
                {analysisData.topClients.map((c, idx) => {
                  const maxSpent = analysisData.topClients[0].totalSpent || 1;
                  return (
                    <div key={c.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400">
                            {c.name.charAt(0)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{c.name}</span>
                            {c.tag === 'VIP' && <span className="bg-black text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-black">VIP</span>}
                          </div>
                        </div>
                        <span className="font-black text-gray-900">{formatCurrency(c.totalSpent)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black transition-all duration-1000" 
                          style={{ width: `${(c.totalSpent / maxSpent) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="premium-card p-6">
              <h3 className="font-bold mb-6">Fornecedores — Análise de Custo</h3>
              <div className="space-y-4">
                {analysisData.supplierCosts.map(s => {
                  const pct = analysisData.totalSupCost > 0 ? (s.cost / analysisData.totalSupCost) * 100 : 0;
                  return (
                    <div key={s.name} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{s.qty} produtos em estoque</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{formatCurrency(s.cost)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{pct.toFixed(0)}% do total</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="premium-card p-6">
              <h3 className="font-bold mb-6">Categorias — Performance</h3>
              <div className="space-y-4">
                {analysisData.categoryPerf.map(c => (
                  <div key={c.category} className="p-4 border border-gray-100 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold">{c.category}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        c.margem >= 30 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {c.margem.toFixed(0)}% Margem
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Receita</p>
                        <p className="text-xs font-bold">{formatCurrency(c.receita)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Custo</p>
                        <p className="text-xs font-bold text-red-600">{formatCurrency(c.custo)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Lucro</p>
                        <p className="text-xs font-bold text-green-600">{formatCurrency(c.lucro)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <AlertCircle size={18} /> Alertas Automáticos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert, idx) => (
                <div key={idx} className={cn(
                  "p-4 rounded-2xl flex items-center justify-between gap-4",
                  alert.type === 'warning' ? "bg-amber-50 border border-amber-100" :
                  alert.type === 'danger' ? "bg-red-50 border border-red-100" :
                  alert.type === 'success' ? "bg-green-50 border border-green-100" :
                  "bg-blue-50 border border-blue-100"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      alert.type === 'warning' ? "text-amber-600" :
                      alert.type === 'danger' ? "text-red-600" :
                      alert.type === 'success' ? "text-green-600" :
                      "text-blue-600"
                    )}>
                      {alert.type === 'warning' || alert.type === 'danger' ? <AlertCircle size={20} /> :
                       alert.type === 'success' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <p className={cn(
                      "text-xs font-medium",
                      alert.type === 'warning' ? "text-amber-800" :
                      alert.type === 'danger' ? "text-red-800" :
                      alert.type === 'success' ? "text-green-800" :
                      "text-blue-800"
                    )}>
                      {alert.message}
                    </p>
                  </div>
                  <button className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap",
                    alert.type === 'warning' ? "bg-amber-100 text-amber-700" :
                    alert.type === 'danger' ? "bg-red-100 text-red-700" :
                    alert.type === 'success' ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {alert.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="premium-card p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] uppercase font-bold text-gray-400">Faturamento Projetado</p>
                <TrendingUp size={16} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">{formatCurrency(projections.projectedRevenue)}</h3>
              <p className="text-[10px] text-gray-400 font-medium mt-2">Base: {projections.dayOfMonth}/{projections.daysInMonth} dias do mês</p>
            </div>

            <div className="premium-card p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] uppercase font-bold text-gray-400">Lucro Projetado</p>
                <BarChart3 size={16} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-green-600">{formatCurrency(projections.projectedProfit)}</h3>
              <p className="text-[10px] text-gray-400 font-medium mt-2">Mantendo margem de {(projections.projectedProfit/projections.projectedRevenue*100).toFixed(1)}%</p>
            </div>

            <div className="premium-card p-6">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] uppercase font-bold text-gray-400">Meta do Mês</p>
                <input 
                  type="number" 
                  value={revenueGoal}
                  onChange={e => setRevenueGoal(Number(e.target.value))}
                  className="w-20 text-right text-xs font-bold bg-gray-50 border-none rounded-lg p-1 focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-2xl font-black text-gray-900">
                  {((projections.currentRevenue / revenueGoal) * 100).toFixed(0)}%
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">{formatCurrency(projections.currentRevenue)} / {formatCurrency(revenueGoal)}</p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    (projections.currentRevenue / revenueGoal) >= 1 ? "bg-green-500" : "bg-black"
                  )}
                  style={{ width: `${Math.min(100, (projections.currentRevenue / revenueGoal) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <TransactionModal 
          onClose={() => { setIsModalOpen(false); setEditingTx(null); }} 
          onSave={handleAddTransaction} 
          clients={clients}
          suppliers={suppliers}
          orders={orders}
          initialData={editingTx}
        />
      )}
    </div>
  );
};

const TransactionModal = ({ onClose, onSave, clients, suppliers, orders, initialData }: { 
  onClose: () => void, 
  onSave: (tx: any) => void,
  clients: Client[],
  suppliers: Supplier[],
  orders: Order[],
  initialData?: Transaction | null
}) => {
  const [formData, setFormData] = useState<Partial<Transaction>>(initialData || {
    type: 'entrada',
    date: new Date().toISOString().split('T')[0],
    value: 0,
    category: 'venda',
    status: 'pago',
    paymentMethod: 'pix',
    description: '',
    isAutomatic: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.value || formData.value <= 0) newErrors.value = "Valor deve ser maior que 0";
    if (!formData.date) newErrors.date = "Obrigatório";
    if (!formData.description) newErrors.description = "Obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold">{initialData ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>
        
        <form className="flex flex-col flex-1 overflow-hidden" onSubmit={e => {
          e.preventDefault();
          if (validate()) {
            onSave(formData);
          }
        }}>
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'entrada' }))}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-bold border-2 transition",
                  formData.type === 'entrada' 
                    ? "bg-green-50 border-green-500 text-green-700" 
                    : "bg-gray-50 border-transparent text-gray-400"
                )}
              >
                ↑ Entrada
              </button>
              <button 
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'saída' }))}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-bold border-2 transition",
                  formData.type === 'saída' 
                    ? "bg-red-50 border-red-500 text-red-700" 
                    : "bg-gray-50 border-transparent text-gray-400"
                )}
              >
                ↓ Saída
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Data</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={cn(
                    "w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-black",
                    errors.date && "ring-1 ring-red-500"
                  )}
                />
                {errors.date && <p className="text-[10px] text-red-500 font-bold">{errors.date}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Valor R$</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.value}
                  onChange={e => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                  className={cn(
                    "w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-black",
                    errors.value && "ring-1 ring-red-500"
                  )}
                />
                {errors.value && <p className="text-[10px] text-red-500 font-bold">{errors.value}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Categoria</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as TxCategory }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-black"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as TxStatus }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-black"
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Descrição</label>
              <input 
                type="text" 
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Pagamento fornecedor X"
                className={cn(
                  "w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-black",
                  errors.description && "ring-1 ring-red-500"
                )}
              />
              {errors.description && <p className="text-[10px] text-red-500 font-bold">{errors.description}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Forma de Pagamento</label>
              <select 
                value={formData.paymentMethod}
                onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as TxPayment }))}
                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-black"
              >
                {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <p className="text-[10px] uppercase font-black text-gray-400">Vincular (opcional)</p>
              <div className="grid grid-cols-1 gap-4">
                <select 
                  value={formData.clientId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value || undefined }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs focus:ring-1 focus:ring-black"
                >
                  <option value="">Vincular Cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select 
                  value={formData.supplierId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, supplierId: e.target.value || undefined }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs focus:ring-1 focus:ring-black"
                >
                  <option value="">Vincular Fornecedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select 
                  value={formData.orderId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, orderId: e.target.value || undefined }))}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs focus:ring-1 focus:ring-black"
                >
                  <option value="">Vincular Pedido...</option>
                  {orders.map(o => <option key={o.id} value={o.id}>#{o.id} — {o.clientName}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 flex gap-4 shrink-0 bg-gray-50/50">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-bold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 bg-black text-white rounded-2xl font-bold shadow-xl hover:bg-gray-800 transition"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
