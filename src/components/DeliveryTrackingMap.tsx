import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, MapPin, Navigation } from 'lucide-react';

interface DeliveryTrackingMapProps {
  status: string;
}

export const DeliveryTrackingMap: React.FC<DeliveryTrackingMapProps> = ({ status }) => {
  const [progress, setProgress] = useState(0);
  const isMoving = status === 'En curso' || status === 'En camino';

  useEffect(() => {
    if (!isMoving) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0; // Loop for demo
        return prev + 0.2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isMoving]);

  // Define a path for the motorcycle
  // This is a simple curved path for the demo
  const pathPoints = [
    { x: 10, y: 80 },
    { x: 30, y: 70 },
    { x: 50, y: 40 },
    { x: 70, y: 50 },
    { x: 90, y: 20 },
  ];

  // Calculate current position based on progress
  const getPosition = (p: number) => {
    const segmentCount = pathPoints.length - 1;
    const segmentIndex = Math.min(Math.floor((p / 100) * segmentCount), segmentCount - 1);
    const segmentProgress = ((p / 100) * segmentCount) - segmentIndex;

    const start = pathPoints[segmentIndex];
    const end = pathPoints[segmentIndex + 1];

    return {
      x: start.x + (end.x - start.x) * segmentProgress,
      y: start.y + (end.y - start.y) * segmentProgress,
    };
  };

  const currentPos = getPosition(progress);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden rounded-b-[40px]">
      {/* Stylized Map Background */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0,20 L100,20 M0,50 L100,50 M0,80 L100,80 M20,0 L20,100 M50,0 L50,100 M80,0 L80,100" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <circle cx="20" cy="20" r="2" fill="currentColor" />
        <circle cx="80" cy="80" r="2" fill="currentColor" />
        <path d="M10,80 Q30,70 50,40 T90,20" stroke="purple" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.5" />
      </svg>

      {/* Destination Pin */}
      <div className="absolute top-[20%] right-[10%] -translate-x-1/2 -translate-y-1/2 text-red-500">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <MapPin size={32} fill="currentColor" fillOpacity={0.2} />
        </motion.div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/10 rounded-full blur-[1px]" />
      </div>

      {/* Restaurant Pin */}
      <div className="absolute bottom-[20%] left-[10%] -translate-x-1/2 -translate-y-1/2 text-purple-600">
        <div className="p-2 bg-white rounded-xl shadow-lg border border-purple-100">
          <Navigation size={16} className="rotate-45" />
        </div>
      </div>

      {/* Moving Motorcycle (Motito Morada) */}
      <AnimatePresence>
        {isMoving && (
          <motion.div
            className="absolute z-10"
            style={{
              left: `${currentPos.x}%`,
              top: `${currentPos.y}%`,
              translateX: '-50%',
              translateY: '-50%',
            }}
          >
            <div className="relative group">
              {/* Pulse effect */}
              <motion.div
                animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-purple-500 rounded-full blur-xl"
              />
              
              <div className="relative bg-purple-600 text-white p-4 rounded-3xl shadow-2xl border-4 border-white transform -rotate-12 hover:scale-110 transition-transform">
                <Bike size={24} strokeWidth={3} />
              </div>
              
              {/* Label */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-2xl border border-slate-800 whitespace-nowrap flex items-center space-x-2"
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-tighter italic">Repartidor en camino</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Overlay Info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-white flex items-center space-x-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest italic">
          {status === 'Cancelado' ? 'Entrega cancelada' : 'Siguiendo repartidor en tiempo real'}
        </p>
      </div>
    </div>
  );
};
