import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  Search, 
  UserPlus, 
  Shield,
  Mail,
  Calendar,
  AlertCircle,
  Copy,
  ExternalLink,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';

export const AdminView = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchRequests();
    
    const channel = supabase.channel('admin-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(id);
    setError(null);
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating status:', error);
      setError('Erro ao atualizar status: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async () => {
    if (!selectedRequest || !newPassword) return;
    setCreateLoading(true);
    setError(null);
    
    try {
      // Create user in Supabase Auth
      // Note: This usually requires an edge function or admin key if you want to create users without them confirming email
      // But we can use the standard signUp if email confirmation is disabled in Supabase settings
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: selectedRequest.email,
        password: newPassword,
        options: {
          data: {
            full_name: selectedRequest.name,
          }
        }
      });

      if (signUpError) throw signUpError;

      // Update request status to approved if it wasn't already
      await supabase
        .from('access_requests')
        .update({ status: 'approved' })
        .eq('id', selectedRequest.id);

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      fetchRequests();
    } catch (err: any) {
      setError('Erro ao criar usuário: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = `Olá ${selectedRequest.name}! Seu acesso ao sistema PRATA 925 foi liberado.\n\nE-mail: ${selectedRequest.email}\nSenha: ${newPassword}\n\nAcesse aqui: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || req.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">Gestão de Acessos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie solicitações de novos usuários e permissões do sistema.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
            <Shield size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Modo Administrador</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
        >
          <AlertCircle size={18} />
          {error}
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl w-full md:w-auto">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === f ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : f === 'rejected' ? 'Recusados' : 'Todos'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-black transition-all"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Solicitante</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">E-mail</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Data</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Carregando solicitações...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                      <Users size={48} />
                      <span className="text-xs font-bold uppercase tracking-widest">Nenhuma solicitação encontrada</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-600">
                          {req.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-gray-900">{req.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail size={14} />
                        {req.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} />
                        {new Date(req.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        req.status === 'pending' ? "bg-amber-50 text-amber-600" :
                        req.status === 'approved' ? "bg-green-50 text-green-600" :
                        "bg-red-50 text-red-600"
                      )}>
                        {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Recusado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowCreateModal(true);
                              }}
                              className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                              title="Criar Acesso"
                            >
                              <UserPlus size={18} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'rejected')}
                              disabled={!!actionLoading}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                              title="Recusar"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowCreateModal(true);
                            }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                            title="Ver Detalhes / Recriar"
                          >
                            <ExternalLink size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute right-8 top-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                  <UserPlus size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Liberar Acesso</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configuração de Usuário</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Solicitante</p>
                  <p className="font-bold text-gray-900">{selectedRequest?.name}</p>
                  <p className="text-sm text-gray-500">{selectedRequest?.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">Definir Senha Provisória</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ex: Prata925@2024"
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCreateUser}
                    disabled={createLoading || !newPassword}
                    className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={18} />}
                    Criar Usuário no Sistema
                  </button>

                  <button
                    onClick={copyToClipboard}
                    disabled={!newPassword}
                    className="w-full bg-white text-black border-2 border-gray-100 py-4 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    {copySuccess ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                    {copySuccess ? 'Copiado!' : 'Copiar Dados para WhatsApp'}
                  </button>
                </div>

                <p className="text-[10px] text-center text-gray-400 font-medium leading-relaxed">
                  Ao clicar em "Criar Usuário", o acesso será liberado imediatamente.<br/>
                  Certifique-se de que a opção "Confirmar e-mail" está desativada no Supabase.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
