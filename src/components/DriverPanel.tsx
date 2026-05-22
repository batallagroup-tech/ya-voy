import React from 'react';
import { Bike, X } from 'lucide-react';
import { motion } from 'motion/react';

export const DriverPanel = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="absolute inset-0 z-[300] bg-white flex flex-col items-center justify-center p-8 text-center space-y-8">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-32 h-32 bg-emerald-100 rounded-[45px] flex items-center justify-center text-emerald-600 shadow-xl shadow-emerald-50"
      >
        <Bike size={64} />
      </motion.div>
      
      <div className="space-y-4 max-w-sm">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
          ¡Próximamente!
        </h1>
        <p className="text-slate-500 font-bold">
          Estamos construyendo esta sección para ti. Vuelve pronto para unirte a nuestro equipo de repartidores.
        </p>
      </div>

      <button 
        onClick={onClose}
        className="px-8 py-4 bg-emerald-600 text-white rounded-[25px] font-black uppercase text-xs shadow-xl shadow-emerald-100 active:scale-95 transition-all"
      >
        Volver
      </button>
    </div>
  );
};
