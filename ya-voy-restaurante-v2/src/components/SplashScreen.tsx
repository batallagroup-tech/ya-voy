import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Utensils } from 'lucide-react';

interface Props { onDone: () => void }

export default function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #E65F00 50%, #cc4400 100%)' }}
      className="fixed inset-0 flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl">
          <Utensils size={48} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-black text-white tracking-widest">YA VOY</h1>
          <p className="text-white/80 text-sm font-bold tracking-[0.4em] uppercase mt-1">Restaurante</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="absolute bottom-10 flex flex-col items-center gap-1"
      >
        <p className="text-white/50 text-xs font-medium tracking-widest uppercase">Desarrollado por</p>
        <p className="text-white/90 text-sm font-black tracking-[0.3em] uppercase">Batalla Group</p>
      </motion.div>
    </motion.div>
  );
}