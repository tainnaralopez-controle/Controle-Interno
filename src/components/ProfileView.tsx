import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "motion/react";
import { User, Camera, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface ProfileViewProps {
  user: any;
}

export function ProfileView({ user }: ProfileViewProps) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [role, setRole] = useState(user?.user_metadata?.role || "Proprietária");
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user?.user_metadata) {
      setName(user.user_metadata.full_name || "");
      setRole(user.user_metadata.role || "Proprietária");
      setAvatar(user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`);
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress as JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setAvatar(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          role: role,
          avatar_url: avatar
        }
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: "Perfil atualizado com sucesso!" });
      // Reload the session to reflect changes globally
      await supabase.auth.refreshSession();
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setMessage({ type: 'error', text: err.message || "Erro ao atualizar perfil." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className="h-32 bg-gradient-to-r from-gray-900 to-gray-700 relative">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-gray-100">
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                <Camera className="text-white" size={24} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-1">{name || "Seu Nome"}</h2>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{role}</p>
        </div>

        <div className="px-8 pb-8 space-y-6">
          {message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-3 text-sm font-bold",
                message.type === 'success' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              )}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cargo / Função</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Proprietária, Gerente"
                className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail (Não editável)</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="w-full px-4 py-4 bg-gray-100 border-none rounded-2xl text-gray-400 cursor-not-allowed font-medium"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-gray-200"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            Salvar Alterações
          </button>
        </div>
      </motion.div>
    </div>
  );
}
