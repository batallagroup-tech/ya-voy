import React, { useState } from 'react';
import { ArrowLeft, Loader2, ShieldCheck, Home, Briefcase, CheckCircle2, Banknote, CreditCard as CardIcon, Lock } from 'lucide-react';
import { CartItem, Address, Card, Store } from '../types';
import { FEES } from '../constants';

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const CheckoutScreen = ({ cart, userData, isFirstOrder, promoApplied, stores, userLocation, onClose, onConfirm }: { cart: CartItem[]; userData: any; isFirstOrder: boolean; promoApplied: boolean; stores: Store[]; userLocation: [number, number] | null; onClose: () => void; onConfirm: (d: any) => void }) => {
  const [selectedAddr, setSelectedAddr] = useState<Address>(userData.direcciones.find((d: any) => d.primary) || userData.direcciones[0]);
  const [selectedMethod, setSelectedMethod] = useState({ type: 'card', id: userData.tarjetas[0]?.id });
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.finalPrice, 0);
  const shippingFee = isFirstOrder ? 0 : FEES.SHIPPING; 
  const appFee = FEES.SERVICE; 
  const total = subtotal + shippingFee + appFee;

  const store = stores.find(s => s.id === cart[0]?.storeId);
  const userToAddressDist = userLocation && selectedAddr.location 
    ? getDistance(userLocation[0], userLocation[1], selectedAddr.location.lat, selectedAddr.location.lng)
    : 0;
  const storeToAddressDist = store && selectedAddr.location
    ? getDistance(store.location.lat, store.location.lng, selectedAddr.location.lat, selectedAddr.location.lng)
    : 0;

  const isTooFar = storeToAddressDist > 15; // 15km limit for delivery
  const isUserFar = userToAddressDist > 50; // 50km warning for user

  const handlePay = () => {
    if (isTooFar) return;
    setIsProcessing(true);
    setTimeout(() => {
      onConfirm({ total, address: selectedAddr, method: selectedMethod });
    }, 2000);
  };

  return (
    <div className="absolute inset-0 z-[150] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300">
      <header className="p-6 bg-white border-b flex items-center justify-between">
        <button onClick={onClose} className="p-2 bg-slate-50 rounded-full"><ArrowLeft size={20}/></button>
        <h2 className="text-xl font-black italic uppercase tracking-tighter">Finalizar Pedido</h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Entregar en</h3>
          <div className="space-y-2">
            {userData.direcciones.map((addr: Address) => (
              <div 
                key={addr.id} 
                onClick={() => setSelectedAddr(addr)}
                className={`p-4 rounded-[25px] border-2 transition-all cursor-pointer flex items-center space-x-3 ${selectedAddr.id === addr.id ? 'bg-purple-50 border-purple-600' : 'bg-white border-transparent shadow-sm'}`}
              >
                <div className={`p-2 rounded-xl ${selectedAddr.id === addr.id ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {addr.type === 'home' ? <Home size={18}/> : <Briefcase size={18}/>}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{addr.label}</p>
                  <p className="text-[10px] text-slate-400 font-bold truncate">{addr.address}</p>
                </div>
                {selectedAddr.id === addr.id && <CheckCircle2 className="text-purple-600" size={20}/>}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Método de Pago</h3>
          <div className="grid grid-cols-1 gap-4">
            <div 
              onClick={() => userData.verificado && setSelectedMethod({ type: 'cash', id: 'cash' })}
              className={`relative p-6 rounded-[35px] border-2 transition-all overflow-hidden ${
                selectedMethod.type === 'cash' 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-transparent shadow-lg scale-[1.02]' 
                  : 'bg-white border-slate-50 text-slate-400 shadow-sm'
              } ${!userData.verificado ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 scale-150">
                <Banknote size={80} />
              </div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className={`p-3 rounded-2xl ${selectedMethod.type === 'cash' ? 'bg-white/20 backdrop-blur-xl' : 'bg-slate-50'}`}>
                  <Banknote size={24}/>
                </div>
                <div className="flex-1">
                  <p className={`font-black text-base italic uppercase tracking-tight ${selectedMethod.type === 'cash' ? 'text-white' : 'text-slate-800'}`}>Efectivo</p>
                  <p className={`text-[9px] font-bold uppercase tracking-tight ${selectedMethod.type === 'cash' ? 'text-white/70' : 'text-slate-400'}`}>
                    {userData.verificado ? 'Paga al recibir' : 'Verifica tu cuenta'}
                  </p>
                </div>
                {selectedMethod.type === 'cash' && <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-emerald-600"><CheckCircle2 size={16}/></div>}
              </div>
              {!userData.verificado && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-100 rounded-full text-slate-400">
                  <Lock size={14} />
                </div>
              )}
            </div>

            {userData.tarjetas.map((card: Card) => (
              <div 
                key={card.id} 
                onClick={() => setSelectedMethod({ type: 'card', id: card.id })}
                className={`relative p-6 rounded-[35px] border-2 transition-all overflow-hidden ${
                  selectedMethod.id === card.id 
                    ? `bg-gradient-to-br ${card.color} text-white border-transparent shadow-lg scale-[1.02]` 
                    : 'bg-white border-slate-50 text-slate-400 shadow-sm'
                } cursor-pointer`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 scale-150">
                  <CardIcon size={80} />
                </div>
                <div className="flex items-center space-x-4 relative z-10">
                  <div className={`p-3 rounded-2xl ${selectedMethod.id === card.id ? 'bg-white/20 backdrop-blur-xl' : 'bg-slate-50'}`}>
                    <CardIcon size={24}/>
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-base tracking-widest ${selectedMethod.id === card.id ? 'text-white' : 'text-slate-800'}`}>•••• {card.last4}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedMethod.id === card.id ? 'text-white/70' : 'text-slate-400'}`}>{card.brand}</p>
                  </div>
                  {selectedMethod.id === card.id && <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-purple-600"><CheckCircle2 size={16}/></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[35px] shadow-sm space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Resumen de cobro</h3>
          <div className="flex justify-between text-sm font-bold text-slate-600"><span>Productos</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm font-bold text-slate-600"><span>Envío</span><span>{isFirstOrder ? 'GRATIS' : `$${shippingFee.toFixed(2)}`}</span></div>
          <div className="flex justify-between text-sm font-bold text-slate-600"><span>Tarifa Servicio</span><span>${appFee.toFixed(2)}</span></div>
          <div className="pt-4 border-t border-dashed flex justify-between items-end">
            <span className="text-lg font-black italic">Total Final</span>
            <span className="text-2xl font-black text-purple-600">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="p-8 bg-white border-t border-slate-100">
        {isTooFar && (
          <div className="mb-4 p-4 bg-red-50 rounded-2xl flex items-center space-x-3 text-red-600">
            <CheckCircle2 className="shrink-0" size={20}/>
            <p className="text-xs font-bold">La ubicación de entrega está muy lejos del comercio ({storeToAddressDist.toFixed(1)}km). Por favor selecciona otra dirección.</p>
          </div>
        )}
        {isUserFar && !isTooFar && (
          <div className="mb-4 p-4 bg-amber-50 rounded-2xl flex items-center space-x-3 text-amber-600">
            <CheckCircle2 className="shrink-0" size={20}/>
            <p className="text-xs font-bold">Estás lejos de la ubicación de entrega ({userToAddressDist.toFixed(0)}km). ¿Es para un amigo o familiar?</p>
          </div>
        )}
        <button 
          onClick={handlePay}
          disabled={isProcessing || isTooFar}
          className="w-full py-5 bg-purple-600 text-white rounded-[28px] font-black text-lg shadow-xl shadow-purple-100 flex items-center justify-center space-x-3 active:scale-95 transition-all disabled:opacity-70"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={24}/>
              <span>Procesando...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={24}/>
              <span>Confirmar Pedido</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
