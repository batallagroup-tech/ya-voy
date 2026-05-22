import React from 'react';
import { motion } from 'motion/react';
import { Utensils } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#9333ea] via-[#ef4444] to-[#f97316]">
      <div className="flex flex-col items-center">
        <motion.div
           initial={{ scale: 0.5, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ 
             duration: 0.5,
             ease: "easeOut"
           }}
           className="bg-white p-6 rounded-3xl shadow-2xl mb-6 relative overflow-hidden"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Utensils size={64} className="text-[#FF6B00]" />
          </motion.div>
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: 0.5
            }}
            className="absolute top-0 left-0 w-1/2 h-full bg-white/30 skew-x-12"
          />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-black text-white tracking-tighter mb-2"
        >
          Ya Voy
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/80 font-bold uppercase tracking-widest text-sm"
        >
          Cargando tu experiencia...
        </motion.p>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-white/60 text-[10px] font-black uppercase tracking-[0.3em] flex flex-col items-center"
      >
        <span className="mb-1 opacity-50 font-medium">Desarrollado por</span>
        <span className="text-white brightness-125">Batalla Group</span>
      </motion.div>
    </div>
  );
}
