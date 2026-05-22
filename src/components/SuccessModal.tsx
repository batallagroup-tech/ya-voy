import React from 'react';
import { CheckCircle } from 'lucide-react';

export const SuccessModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[300] bg-purple-600 flex items-center justify-center p-8">
    <div className="flex flex-col items-center text-center text-white space-y-6 animate-in zoom-in duration-300">
      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
        <CheckCircle size={60} className="text-white"/>
      </div>
      <h2 className="text-4xl font-black italic uppercase tracking-tighter">¡Listo, Ya Vamos!</h2>
      <p className="text-white/70 font-bold max-w-xs">Tu pedido ha sido procesado con éxito. El repartidor llegará pronto.</p>
      <button 
        onClick={onClose}
        className="px-10 py-4 bg-white text-purple-600 rounded-full font-black uppercase text-sm shadow-2xl active:scale-95 transition-all"
      >
        Seguir mi pedido
      </button>
    </div>
  </div>
);
