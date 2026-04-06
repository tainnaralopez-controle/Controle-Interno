import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface UserPanelProps {
  user: any;
  onProfileClick: () => void;
}

export function UserPanel({ user, onProfileClick }: UserPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleProfileClick = () => {
    onProfileClick();
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const role = user?.user_metadata?.role || "Proprietária";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all duration-300 group",
          isOpen ? "bg-gray-100 shadow-inner" : "bg-white shadow-sm hover:shadow-md hover:bg-gray-50 border border-gray-100"
        )}
      >
        <div className="relative">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        
        <div className="text-left hidden sm:block">
          <p className="text-sm font-black text-gray-900 leading-tight">{fullName}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role}</p>
        </div>

        <ChevronDown 
          size={16} 
          className={cn(
            "text-gray-400 transition-transform duration-300",
            isOpen ? "rotate-180" : ""
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-50 mb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Conta</p>
              <p className="text-xs font-medium text-gray-600 truncate">{user?.email}</p>
            </div>

            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors group"
              onClick={handleProfileClick}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <UserIcon size={18} />
              </div>
              Meu Perfil
            </button>

            <div className="h-px bg-gray-50 my-1 mx-2" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <LogOut size={18} />
              </div>
              Sair da Conta
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
