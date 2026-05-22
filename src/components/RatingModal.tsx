import React, { useState } from 'react';
import { Star, X, Check, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RatingModalProps {
  orderId: string;
  driverName: string;
  storeName: string;
  onClose: () => void;
  onSubmit: (restaurantRating: number, restaurantReview: string, driverRating: number, driverReview: string[]) => void;
}

const FEEDBACK_OPTIONS = [
  { id: 'fast', label: 'Entrega Rápida', icon: <ThumbsUp size={14}/>, type: 'good' },
  { id: 'polite', label: 'Muy Amable', icon: <ThumbsUp size={14}/>, type: 'good' },
  { id: 'hot', label: 'Comida Caliente', icon: <ThumbsUp size={14}/>, type: 'good' },
  { id: 'careful', label: 'Buen Trato', icon: <ThumbsUp size={14}/>, type: 'good' },
  { id: 'slow', label: 'Demora en Entrega', icon: <ThumbsDown size={14}/>, type: 'bad' },
  { id: 'cold', label: 'Comida Fría', icon: <ThumbsDown size={14}/>, type: 'bad' },
  { id: 'rude', label: 'Trato Poco Amable', icon: <ThumbsDown size={14}/>, type: 'bad' },
  { id: 'damaged', label: 'Empaque Dañado', icon: <ThumbsDown size={14}/>, type: 'bad' },
];

export const RatingModal: React.FC<RatingModalProps> = ({ orderId, driverName, storeName, onClose, onSubmit }) => {
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [restaurantReview, setRestaurantReview] = useState('');
  const [driverRating, setDriverRating] = useState(0);
  const [selectedDriverFeedback, setSelectedDriverFeedback] = useState<string[]>([]);
  
  const [hoveredRating, setHoveredRating] = useState(0);
  const [step, setStep] = useState(1); // 1: Restaurant, 2: Driver, 3: Success

  const toggleDriverFeedback = (id: string) => {
    setSelectedDriverFeedback(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    if (step === 1 && restaurantRating > 0) {
      setStep(2);
      setHoveredRating(0);
    } else if (step === 2 && driverRating > 0) {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    onSubmit(restaurantRating, restaurantReview, driverRating, selectedDriverFeedback);
    setStep(3);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-[45px] overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="restaurant-rating"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-orange-100 rounded-[30px] flex items-center justify-center text-orange-600 mx-auto mb-4">
                  <Star size={40} fill={restaurantRating > 0 ? "currentColor" : "none"} />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Califica el Restaurante</h2>
                <p className="text-slate-400 font-bold text-sm">¿Qué tal estuvo la comida de <span className="text-slate-800">{storeName}</span>?</p>
              </div>

              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRestaurantRating(star)}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Star 
                      size={42} 
                      className={`transition-colors duration-200 ${
                        (hoveredRating || restaurantRating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
                      }`} 
                    />
                  </button>
                ))}
              </div>

              {restaurantRating > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 border-t border-slate-50"
                >
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Cuéntanos tu experiencia</p>
                  <div className="relative">
                    <textarea 
                      value={restaurantReview}
                      onChange={(e) => setRestaurantReview(e.target.value)}
                      placeholder="Escribe un comentario opcional..."
                      className="w-full p-4 bg-slate-50 rounded-3xl text-sm font-bold border-none focus:ring-2 focus:ring-orange-500 min-h-[100px] resize-none"
                    />
                    <MessageSquare size={16} className="absolute bottom-4 right-4 text-slate-300" />
                  </div>
                </motion.div>
              )}

              <button
                disabled={restaurantRating === 0}
                onClick={handleNextStep}
                className="w-full py-5 bg-orange-600 text-white rounded-[25px] font-black uppercase tracking-tighter text-lg shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Siguiente
              </button>
            </motion.div>
          ) : step === 2 ? (
            <motion.div 
              key="driver-rating"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-purple-100 rounded-[30px] flex items-center justify-center text-purple-600 mx-auto mb-4">
                  <Star size={40} fill={driverRating > 0 ? "currentColor" : "none"} />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Califica la Entrega</h2>
                <p className="text-slate-400 font-bold text-sm">¿Cómo fue tu experiencia con <span className="text-slate-800">{driverName}</span>?</p>
              </div>

              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setDriverRating(star)}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Star 
                      size={42} 
                      className={`transition-colors duration-200 ${
                        (hoveredRating || driverRating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
                      }`} 
                    />
                  </button>
                ))}
              </div>

              {driverRating > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 border-t border-slate-50"
                >
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Detalles del servicio</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {FEEDBACK_OPTIONS.filter(opt => driverRating >= 4 ? opt.type === 'good' : opt.type === 'bad').map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => toggleDriverFeedback(opt.id)}
                        className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter flex items-center space-x-2 transition-all ${
                          selectedDriverFeedback.includes(opt.id) 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-100 scale-105' 
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <button
                disabled={driverRating === 0}
                onClick={handleNextStep}
                className="w-full py-5 bg-purple-600 text-white rounded-[25px] font-black uppercase tracking-tighter text-lg shadow-xl shadow-purple-100 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Enviar Calificación
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center space-y-6"
            >
              <div className="w-24 h-24 bg-green-100 rounded-[35px] flex items-center justify-center text-green-600 mx-auto animate-bounce">
                <Check size={48} strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">¡Gracias!</h2>
                <p className="text-slate-400 font-bold">Tu opinión nos ayuda a mejorar el servicio.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
