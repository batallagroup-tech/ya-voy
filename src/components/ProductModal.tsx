import React, { useState, useMemo } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';
import { Product, CartItem } from '../types';

export const ProductModal = ({ product, onClose, onAdd, isStoreOpen = true }: { product: Product; onClose: () => void; onAdd: (p: CartItem) => void; isStoreOpen?: boolean }) => {
  const [qty, setQty] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<{ id: string; name: string; price: number }[]>([]);
  const [customChoices, setCustomChoices] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');

  const optionsTotal = useMemo(() => {
    let total = 0;
    if (!product.options) return 0;
    
    (Object.entries(selectedOptions) as [string, string[]][]).forEach(([optionId, choiceIds]) => {
      const option = product.options?.find(o => o.id === optionId);
      if (option) {
        choiceIds.forEach(choiceId => {
          const choice = option.choices.find(c => c.id === choiceId);
          if (choice) total += choice.price;
        });
      }
    });
    return total;
  }, [product.options, selectedOptions]);

  const total = useMemo(() => {
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
    return (product.price + extrasTotal + optionsTotal) * qty;
  }, [product.price, selectedExtras, optionsTotal, qty]);

  const toggleExtra = (extra: { id: string; name: string; price: number }) => {
    setSelectedExtras(prev => prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]);
  };

  const toggleCustom = (choice: string) => {
    setCustomChoices(prev => prev.includes(choice) ? prev.filter(c => c !== choice) : [...prev, choice]);
  };

  const handleOptionSelect = (optionId: string, choiceId: string, type: 'single' | 'multiple') => {
    setSelectedOptions(prev => {
      const current = prev[optionId] || [];
      if (type === 'single') {
        return { ...prev, [optionId]: [choiceId] };
      } else {
        const exists = current.includes(choiceId);
        const next = exists ? current.filter(id => id !== choiceId) : [...current, choiceId];
        return { ...prev, [optionId]: next };
      }
    });
  };

  const handleAdd = () => {
    const formattedOptions = (Object.entries(selectedOptions) as [string, string[]][]).map(([optionId, choiceIds]) => {
      const option = product.options?.find(o => o.id === optionId);
      return {
        optionId,
        optionName: option?.name || '',
        choices: choiceIds.map(choiceId => {
          const choice = option?.choices.find(c => c.id === choiceId);
          return {
            id: choiceId,
            name: choice?.name || '',
            price: choice?.price || 0
          };
        })
      };
    });

    onAdd({
      ...product,
      finalPrice: total,
      qty,
      selectedExtras,
      customChoices,
      selectedOptions: formattedOptions,
      note
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[150] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-[45px] animate-in slide-in-from-bottom flex flex-col max-h-[92vh] shadow-2xl">
        <div className="relative h-64 flex-shrink-0">
          <img src={product.img} className={`w-full h-full object-cover ${!isStoreOpen ? 'grayscale opacity-50' : ''}`} alt="" referrerPolicy="no-referrer" />
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors"><X/></button>
          {!isStoreOpen && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest shadow-xl">
                Negocio Cerrado
              </div>
            </div>
          )}
        </div>
        
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{product.name}</h2>
              <span className="text-2xl font-black text-purple-600">${product.price.toFixed(2)}</span>
            </div>
            <p className="text-slate-500 font-bold text-sm leading-relaxed">{product.desc}</p>
          </div>
          
          {/* Menu Options */}
          {product.options && product.options.map(option => (
            <div key={option.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{option.name}</h3>
                {option.required && (
                  <span className="text-[9px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Obligatorio</span>
                )}
              </div>
              <div className="space-y-2">
                {option.choices.map(choice => {
                  const isSelected = (selectedOptions[option.id] || []).includes(choice.id);
                  return (
                    <button 
                      key={choice.id}
                      onClick={() => handleOptionSelect(option.id, choice.id, option.type)}
                      className={`w-full flex items-center justify-between p-5 rounded-[28px] border-2 transition-all active:scale-[0.98] ${isSelected ? 'bg-purple-50 border-purple-600' : 'bg-white border-slate-100'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-200'}`}>
                          {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                        </div>
                        <span className={`font-bold text-sm ${isSelected ? 'text-purple-900' : 'text-slate-600'}`}>{choice.name}</span>
                      </div>
                      {choice.price > 0 && (
                        <span className={`text-xs font-black ${isSelected ? 'text-purple-600' : 'text-slate-400'}`}>+${choice.price.toFixed(2)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {product.extras && product.extras.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Agrega extras (Costo adicional)</h3>
              <div className="space-y-2">
                {product.extras.map(e => {
                  const isSelected = selectedExtras.some(ex => ex.id === e.id);
                  return (
                    <button 
                      key={e.id}
                      onClick={() => toggleExtra(e)}
                      className={`w-full flex items-center justify-between p-5 rounded-[28px] border-2 transition-all active:scale-[0.98] ${isSelected ? 'bg-purple-50 border-purple-600' : 'bg-white border-slate-100'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-200'}`}>
                          {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                        </div>
                        <span className={`font-bold text-sm ${isSelected ? 'text-purple-900' : 'text-slate-600'}`}>{e.name}</span>
                      </div>
                      <span className={`text-xs font-black ${isSelected ? 'text-purple-600' : 'text-slate-400'}`}>+${e.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.personalizar && product.personalizar.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Personaliza tu pedido (Gratis)</h3>
              <div className="grid grid-cols-2 gap-3">
                {product.personalizar.map(choice => (
                  <button 
                    key={choice} 
                    onClick={() => toggleCustom(choice)}
                    className={`p-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${customChoices.includes(choice) ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Instrucciones Especiales</h3>
             <textarea 
               placeholder="Ej. Sin cebolla, extra salsa roja..." 
               className="w-full p-6 bg-slate-50 rounded-[30px] text-sm font-bold min-h-[120px] outline-none border-2 border-transparent focus:border-purple-100 transition-all resize-none" 
               value={note} 
               onChange={e => setNote(e.target.value)} 
             />
          </div>

          <div className="flex items-center justify-center space-x-10 bg-slate-50 p-6 rounded-[35px] w-max mx-auto shadow-inner">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 bg-white rounded-2xl shadow-sm text-purple-600 flex items-center justify-center active:scale-90 transition-all"><Minus size={24}/></button>
            <span className="text-3xl font-black italic tracking-tighter">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-12 h-12 bg-white rounded-2xl shadow-sm text-purple-600 flex items-center justify-center active:scale-90 transition-all"><Plus size={24}/></button>
          </div>
        </div>

        <div className="p-8 bg-white border-t border-slate-50">
          <button 
            disabled={!isStoreOpen}
            onClick={handleAdd} 
            className={`w-full py-6 rounded-[32px] font-black italic uppercase tracking-tighter text-xl shadow-2xl flex justify-between px-10 active:scale-95 transition-all ${isStoreOpen ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
          >
            <span>{isStoreOpen ? 'Agregar al Carrito' : 'Negocio Cerrado'}</span>
            <span>${total.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
