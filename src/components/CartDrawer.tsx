import React from 'react';
import { X, Trash } from 'lucide-react';
import { CartItem } from '../types';
import { FEES } from '../constants';

export const CartDrawer = ({ showCart, setShowCart, cart, removeFromCart, isFirstOrder, onCheckout }: { showCart: boolean; setShowCart: (s: boolean) => void; cart: CartItem[]; removeFromCart: (i: number) => void; isFirstOrder: boolean; onCheckout: () => void }) => {
  const subtotal = cart.reduce((s, i) => s + i.finalPrice, 0);
  const shippingFee = isFirstOrder ? 0 : FEES.SHIPPING; 
  const appFee = subtotal > 0 ? FEES.SERVICE : 0; 
  const total = subtotal + shippingFee + appFee;

  return (
    <div className={`absolute inset-0 z-[100] transition-all ${showCart ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${showCart ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowCart(false)} />
        <div className={`absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform ${showCart ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full p-8">
                <header className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black italic tracking-tighter">Mi Carrito</h2><button onClick={() => setShowCart(false)} className="p-2 bg-slate-50 rounded-full"><X/></button></header>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-10">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex flex-col bg-slate-50 p-5 rounded-[30px] space-y-2 animate-in slide-in-from-right duration-200" style={{animationDelay: `${idx * 50}ms`}}>
                            <div className="flex justify-between items-start">
                              <p className="font-black text-sm">{item.qty}x {item.name}</p>
                              <div className="flex items-center space-x-3">
                                <p className="text-sm font-black text-purple-600">${item.finalPrice.toFixed(2)}</p>
                                <button onClick={() => removeFromCart(idx)} className="p-2 bg-red-50 text-red-500 rounded-xl active:scale-90 transition-transform"><Trash size={14}/></button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.selectedOptions && item.selectedOptions.length > 0 && item.selectedOptions.map(opt => (
                                <div key={opt.optionId} className="flex flex-wrap gap-1">
                                  {opt.choices.map(choice => (
                                    <span key={choice.id} className="text-[8px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                      {opt.optionName}: {choice.name}
                                    </span>
                                  ))}
                                </div>
                              ))}
                              {item.selectedExtras && item.selectedExtras.length > 0 && item.selectedExtras.map(e => <span key={e.id} className="text-[8px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">+{e.name}</span>)}
                              {item.customChoices && item.customChoices.length > 0 && item.customChoices.map((c, ci) => <span key={`${c}-${ci}`} className="text-[8px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">{c}</span>)}
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && <div className="text-center py-20 text-slate-300 font-black text-sm uppercase tracking-widest italic">Carrito vacío</div>}
                </div>
                
                {cart.length > 0 && (
                  <div className="pt-6 border-t border-dashed space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 italic uppercase tracking-wider">
                      <span>Subtotal Productos</span><span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 italic uppercase tracking-wider">
                      <span>Envío (Repartidor)</span>
                      <span className={isFirstOrder ? 'text-green-500' : ''}>{isFirstOrder ? 'GRATIS' : `$${shippingFee.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 italic uppercase tracking-wider">
                      <span>Comisión Ya Voy!</span><span>${appFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4 border-t">
                      <span className="text-slate-900 font-black uppercase tracking-widest text-xs">Total a Pagar</span>
                      <span className="text-3xl font-black text-purple-600">${total.toFixed(2)}</span>
                    </div>
                    <button onClick={onCheckout} className="w-full mt-4 py-5 bg-purple-600 text-white rounded-[28px] font-black shadow-xl shadow-purple-50 active:scale-95 transition-all">Pagar Pedido</button>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
};
