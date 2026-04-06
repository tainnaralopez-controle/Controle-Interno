import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, UserPlus, AlertCircle, Eye, EyeOff, Mail, ArrowLeft, KeyRound, Send } from 'lucide-react';
import { cn } from '../lib/utils';

type AuthView = 'login' | 'request' | 'recovery' | 'signup';

export const LoginScreen = () => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requestName, setRequestName] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        if (loginError.message === 'Invalid login credentials') {
          setError('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (loginError.message.includes('Email not confirmed')) {
          setError('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.');
        } else {
          setError(loginError.message);
        }
      }
    } catch (err: any) {
      setError('Ocorreu um erro ao tentar entrar. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !requestName) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Check if email is approved in access_requests
      // BYPASS for admin email
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || (typeof process !== 'undefined' ? process.env.VITE_ADMIN_EMAIL : '');
      if (email !== adminEmail) {
        const { data: request, error: requestError } = await supabase
          .from('access_requests')
          .select('status')
          .eq('email', email)
          .single();

        if (requestError || !request || request.status !== 'approved') {
          setError('Seu acesso ainda não foi aprovado por um administrador.');
          setLoading(false);
          return;
        }
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: requestName,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Este e-mail já está cadastrado. Tente fazer login.');
        } else {
          throw signUpError;
        }
      } else {
        setSuccess('Cadastro realizado com sucesso! Verifique seu e-mail se necessário.');
        setTimeout(() => setView('login'), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!requestName || !email) {
      setError('Por favor, preencha seu nome e e-mail.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const { error: requestError } = await supabase
        .from('access_requests')
        .insert([{ name: requestName, email: email, status: 'pending' }]);

      if (requestError) {
        if (requestError.code === '23505') {
          setError('Já existe uma solicitação pendente para este e-mail.');
        } else {
          throw requestError;
        }
      } else {
        setSuccess('Solicitação enviada com sucesso! Aguarde a aprovação do administrador.');
        setTimeout(() => {
          setView('login');
          setSuccess('');
        }, 3000);
      }
    } catch (e) {
      setError('Erro ao enviar solicitação. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      
      if (recoveryError) throw recoveryError;
      
      setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => {
        setView('login');
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'signup':
        return (
          <motion.div 
            key="signup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('login')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black tracking-tighter uppercase">Criar Conta</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Portal Administrativo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={requestName}
                  onChange={e => setRequestName(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium"
                  placeholder="Seu Nome"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium"
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-3 text-green-600 text-xs font-bold">
                <Check size={16} />
                {success}
              </div>
            )}

            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={18} />}
              Criar minha conta
            </button>
          </motion.div>
        );

      case 'request':
        return (
          <motion.div 
            key="request"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('login')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black tracking-tighter uppercase">Solicitar Acesso</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Portal Administrativo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={requestName}
                  onChange={e => setRequestName(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium"
                  placeholder="Seu Nome"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-3 text-green-600 text-xs font-bold">
                <Check size={16} />
                {success}
              </div>
            )}

            <button
              onClick={handleRequestAccess}
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
              Enviar Solicitação
            </button>
          </motion.div>
        );

      case 'recovery':
        return (
          <motion.div 
            key="recovery"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('login')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black tracking-tighter uppercase">Recuperar Senha</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Portal Administrativo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">E-mail de Cadastro</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-3 text-green-600 text-xs font-bold">
                <Check size={16} />
                {success}
              </div>
            )}

            <button
              onClick={handlePasswordRecovery}
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail size={18} />}
              Enviar Link de Recuperação
            </button>
          </motion.div>
        );

      default:
        return (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                <Zap size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">PRATA 925</h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestão Premium</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium"
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Senha</label>
                  <button onClick={() => setView('recovery')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Esqueci a senha</button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all font-medium pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Entrar no Sistema'}
            </button>

            <div className="pt-4 text-center flex flex-col gap-3">
              <button 
                onClick={() => setView('signup')}
                className="text-[10px] text-black font-bold uppercase tracking-widest hover:underline transition-colors"
              >
                Já tem aprovação? Crie sua conta aqui.
              </button>
              <button 
                onClick={() => setView('request')}
                className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-black transition-colors"
              >
                Ainda não tem acesso? Solicite aqui.
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4">
      <div className="w-full max-w-md bg-white border-2 border-gray-100 shadow-xl rounded-[40px] p-10 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {renderView()}
        </AnimatePresence>
      </div>
    </div>
  );
};
