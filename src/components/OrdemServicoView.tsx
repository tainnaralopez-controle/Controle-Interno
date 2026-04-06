import React, { useState, useMemo } from 'react';
import { 
  Wrench, Search, Plus, Filter, Clock, AlertCircle, 
  CheckCircle2, Trash2, Edit3, ChevronRight, ArrowRight,
  User, Phone, Package, Hammer, X, Info, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrdemServico, OSDanoTipo, OSAvaliacao, OSLocalizacao, OSStatus, Order, Client } from '../types';

interface OrdemServicoViewProps {
  ordensServico: OrdemServico[];
  orders: Order[];
  clients: Client[];
  onAddOS: (osData: any) => Promise<void>;
  onUpdateOS: (osId: string, osData: any) => Promise<void>;
  onDeleteOS: (osId: string) => Promise<void>;
}

const DANO_LABELS: Record<OSDanoTipo, string> = {
  pedra_solta: 'Pedra Solta',
  pedra_perdida: 'Pedra Perdida',
  fecho_quebrado: 'Fecho Quebrado',
  corrente_arrebentada: 'Corrente Arrebentada',
  amassado: 'Amassado',
  arranhado: 'Arranhado',
  solda_solta: 'Solda Solta',
  outro: 'Outro'
};

const AVALIACAO_LABELS: Record<OSAvaliacao, string> = {
  aguardando_avaliacao: 'Aguardando Avaliação',
  reembolso_cliente: 'Reembolso p/ Cliente',
  pagamento_conserto_loja: 'Loja Paga Conserto',
  pagamento_por_conta_cliente: 'Cliente Paga Conserto'
};

const LOCALIZACAO_LABELS: Record<OSLocalizacao, string> = {
  na_loja: 'Na Loja',
  no_ourives: 'No Ourives',
  resolvido: 'Resolvido'
};

const STATUS_LABELS: Record<OSStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  aguardando_peca: 'Aguardando Peça',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

export function OrdemServicoView({ 
  ordensServico, 
  orders, 
  clients, 
  onAddOS, 
  onUpdateOS, 
  onDeleteOS 
}: OrdemServicoViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return {
      totalAbertas: ordensServico.filter(os => os.status === 'aberta').length,
      aguardandoAvaliacao: ordensServico.filter(os => os.avaliacao === 'aguardando_avaliacao').length,
      noOurives: ordensServico.filter(os => os.localizacao === 'no_ourives').length,
      concluidasMes: ordensServico.filter(os => {
        const d = new Date(os.dataRetorno || os.createdAt);
        return os.status === 'concluida' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length
    };
  }, [ordensServico]);

  const filteredOS = useMemo(() => {
    return ordensServico.filter(os => {
      const matchesSearch = 
        os.clientName.toLowerCase().includes(search.toLowerCase()) ||
        os.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        os.internalCode?.toLowerCase().includes(search.toLowerCase()) ||
        os.pecaDescricao.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || os.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ordensServico, search, statusFilter]);

  const getAvaliacaoColor = (a: OSAvaliacao) => {
    switch(a) {
      case 'aguardando_avaliacao': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'reembolso_cliente': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'pagamento_conserto_loja': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pagamento_por_conta_cliente': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLocalizacaoColor = (l: OSLocalizacao) => {
    switch(l) {
      case 'na_loja': return 'bg-green-100 text-green-700 border-green-200';
      case 'no_ourives': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'resolvido': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Ordens de Serviço</h2>
          <p className="text-sm text-gray-500 font-medium">Gestão de consertos e reparos de joias</p>
        </div>
        <button 
          onClick={() => { setSelectedOS(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10 active:scale-95"
        >
          <Plus size={18} />
          Nova OS
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Abertas" value={stats.totalAbertas} icon={Wrench} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Aguardando Avaliação" value={stats.aguardandoAvaliacao} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <StatCard label="No Ourives" value={stats.noOurives} icon={Hammer} color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="Concluídas (Mês)" value={stats.concluidasMes} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por cliente, pedido ou código..."
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm focus:border-black transition-all outline-none font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {['all', 'aberta', 'em_andamento', 'aguardando_peca', 'concluida'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                statusFilter === status 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
              }`}
            >
              {status === 'all' ? 'Todos' : STATUS_LABELS[status as OSStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* OS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOS.map((os) => (
          <motion.div
            layout
            key={os.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { setSelectedOS(os); setIsDetailOpen(true); }}
            className="premium-card p-5 cursor-pointer hover:shadow-xl transition-all group border-2 border-transparent hover:border-black/5"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Wrench size={16} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OS #{os.id.slice(0, 5)}</p>
                  <h4 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{os.clientName}</h4>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getAvaliacaoColor(os.avaliacao)}`}>
                {AVALIACAO_LABELS[os.avaliacao]}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Package size={14} />
                <span className="text-xs font-medium truncate">{os.pecaDescricao}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <AlertCircle size={14} />
                <span className="text-xs font-medium">{DANO_LABELS[os.tipoDano]}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Previsão</span>
                <span className="text-xs font-bold text-gray-700">{os.dataPrevisaoRetorno ? new Date(os.dataPrevisaoRetorno).toLocaleDateString() : 'Não definida'}</span>
              </div>
              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getLocalizacaoColor(os.localizacao)}`}>
                {LOCALIZACAO_LABELS[os.localizacao]}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOS.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
            <Wrench size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold">Nenhuma ordem de serviço encontrada.</p>
          <p className="text-gray-400 text-xs mt-1">Tente ajustar seus filtros ou busca.</p>
        </div>
      )}

      {/* Modal Nova OS */}
      <AnimatePresence>
        {isModalOpen && (
          <OSModal 
            onClose={() => setIsModalOpen(false)} 
            onSave={onAddOS}
            orders={orders}
            clients={clients}
          />
        )}
      </AnimatePresence>

      {/* Modal Detalhe OS */}
      <AnimatePresence>
        {isDetailOpen && selectedOS && (
          <OSDetailModal 
            os={selectedOS}
            onClose={() => setIsDetailOpen(false)}
            onUpdate={onUpdateOS}
            onDelete={onDeleteOS}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="premium-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function OSModal({ onClose, onSave, orders, clients }: any) {
  const [formData, setFormData] = useState({
    orderNumber: '',
    orderId: '',
    clientId: '',
    clientName: '',
    clientWhatsapp: '',
    pecaDescricao: '',
    internalCode: '',
    tipoDano: 'outro' as OSDanoTipo,
    tipoDanoDescricao: '',
    avaliacao: 'aguardando_avaliacao' as OSAvaliacao,
    valorConserto: 0,
    localizacao: 'na_loja' as OSLocalizacao,
    nomeOurives: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    dataPrevisaoRetorno: '',
    status: 'aberta' as OSStatus,
    observacoes: ''
  });

  const handleSearchOrder = () => {
    const order = orders.find((o: Order) => o.id.includes(formData.orderNumber) || o.internalCode === formData.orderNumber);
    if (order) {
      setFormData(prev => ({
        ...prev,
        orderId: order.id,
        clientId: order.clientId,
        clientName: order.clientName,
        pecaDescricao: order.productDescription,
        internalCode: order.internalCode || ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black tracking-tight">Nova Ordem de Serviço</h3>
              <p className="text-sm text-gray-500 font-medium">Preencha os dados do conserto</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Busca de Pedido */}
            <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-100">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Vincular Pedido (Opcional)</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Número do pedido ou código..."
                  className="flex-1 px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                />
                <button 
                  onClick={handleSearchOrder}
                  className="bg-black text-white px-4 py-3 rounded-2xl font-bold text-xs hover:bg-gray-800 transition-all"
                >
                  Buscar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.clientName}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição da Peça</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.pecaDescricao}
                  onChange={(e) => setFormData({...formData, pecaDescricao: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Dano</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.tipoDano}
                  onChange={(e) => setFormData({...formData, tipoDano: e.target.value as OSDanoTipo})}
                >
                  {Object.entries(DANO_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Avaliação</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.avaliacao}
                  onChange={(e) => setFormData({...formData, avaliacao: e.target.value as OSAvaliacao})}
                >
                  {Object.entries(AVALIACAO_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.avaliacao !== 'reembolso_cliente' && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor do Conserto (R$)</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.valorConserto}
                  onChange={(e) => setFormData({...formData, valorConserto: Number(e.target.value)})}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Localização</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({...formData, localizacao: e.target.value as OSLocalizacao})}
                >
                  {Object.entries(LOCALIZACAO_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              {formData.localizacao === 'no_ourives' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome do Ourives</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                    value={formData.nomeOurives}
                    onChange={(e) => setFormData({...formData, nomeOurives: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data Entrada</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.dataEntrada}
                  onChange={(e) => setFormData({...formData, dataEntrada: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Previsão Retorno</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium"
                  value={formData.dataPrevisaoRetorno}
                  onChange={(e) => setFormData({...formData, dataPrevisaoRetorno: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição Detalhada do Dano</label>
              <textarea 
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-black outline-none font-medium min-h-[100px]"
                value={formData.tipoDanoDescricao}
                onChange={(e) => setFormData({...formData, tipoDanoDescricao: e.target.value})}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { onSave(formData); onClose(); }}
                className="flex-1 py-4 bg-black text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
              >
                Salvar OS
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function OSDetailModal({ os, onClose, onUpdate, onDelete }: any) {
  const handleStatusChange = (newStatus: OSStatus) => {
    onUpdate(os.id, { status: newStatus });
  };

  const handleLocalChange = (newLocal: OSLocalizacao) => {
    onUpdate(os.id, { localizacao: newLocal });
  };

  const handleReturnToClient = () => {
    onUpdate(os.id, { 
      status: 'concluida', 
      localizacao: 'resolvido',
      dataRetorno: new Date().toISOString().split('T')[0]
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Wrench size={28} className="text-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordem de Serviço</p>
                <h3 className="text-2xl font-black tracking-tight">#{os.id.slice(0, 8)}</h3>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { if(confirm('Excluir esta OS?')) { onDelete(os.id); onClose(); } }}
                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
              >
                <Trash2 size={20} />
              </button>
              <button onClick={onClose} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <section>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Informações do Cliente</h5>
                <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{os.clientName}</span>
                  </div>
                  {os.clientWhatsapp && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">{os.clientWhatsapp}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Detalhes da Peça</h5>
                <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{os.pecaDescricao}</span>
                  </div>
                  {os.internalCode && (
                    <div className="flex items-center gap-3">
                      <Info size={16} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Cód: {os.internalCode}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Status e Localização</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Status</span>
                    <select 
                      className="text-xs font-black uppercase tracking-wider bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
                      value={os.status}
                      onChange={(e) => handleStatusChange(e.target.value as OSStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-500">Localização</span>
                    <select 
                      className="text-xs font-black uppercase tracking-wider bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
                      value={os.localizacao}
                      onChange={(e) => handleLocalChange(e.target.value as OSLocalizacao)}
                    >
                      {Object.entries(LOCALIZACAO_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Datas Importantes</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Entrada</p>
                    <p className="text-xs font-bold">{new Date(os.dataEntrada).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Previsão</p>
                    <p className="text-xs font-bold">{os.dataPrevisaoRetorno ? new Date(os.dataPrevisaoRetorno).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section className="mb-8">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Timeline do Conserto</h5>
            <div className="flex items-center justify-between px-4">
              <TimelineStep label="Entrada" active={true} done={true} />
              <div className="flex-1 h-1 bg-gray-100 mx-2 rounded-full overflow-hidden">
                <div className="h-full bg-black w-full" />
              </div>
              <TimelineStep label="Avaliação" active={os.avaliacao !== 'aguardando_avaliacao'} done={os.avaliacao !== 'aguardando_avaliacao'} />
              <div className="flex-1 h-1 bg-gray-100 mx-2 rounded-full overflow-hidden">
                <div className={`h-full bg-black ${os.localizacao === 'no_ourives' ? 'w-full' : 'w-0'}`} />
              </div>
              <TimelineStep label="Conserto" active={os.localizacao === 'no_ourives'} done={os.localizacao === 'resolvido'} />
              <div className="flex-1 h-1 bg-gray-100 mx-2 rounded-full overflow-hidden">
                <div className={`h-full bg-black ${os.status === 'concluida' ? 'w-full' : 'w-0'}`} />
              </div>
              <TimelineStep label="Retorno" active={os.status === 'concluida'} done={os.status === 'concluida'} />
            </div>
          </section>

          <div className="flex gap-4">
            <button 
              onClick={handleReturnToClient}
              className="flex-1 py-4 bg-black text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Devolver à Cliente
            </button>
            {os.localizacao === 'na_loja' && (
              <button 
                onClick={() => handleLocalChange('no_ourives')}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <Hammer size={18} />
                Enviar p/ Ourives
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TimelineStep({ label, active, done }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
        done ? 'bg-black border-black text-white' : 
        active ? 'bg-white border-black text-black' : 
        'bg-white border-gray-100 text-gray-300'
      }`}>
        {done ? <CheckCircle2 size={14} /> : <Clock size={14} />}
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-black' : 'text-gray-300'}`}>{label}</span>
    </div>
  );
}
