import React, { useState } from 'react';
import { ArrowLeft, Bike, Phone, MessageCircle, AlertCircle, Map as MapIcon, Check, Star } from 'lucide-react';
import { Order } from '../types';
import { DeliveryTrackingMap } from './DeliveryTrackingMap';
import { FEES } from '../constants';

export const OrderDetailModal = ({ order, onClose, onOpenChat, onCancel, onComplete, onRate }: { order: Order; onClose: () => void; onOpenChat: () => void; onCancel: (id: string) => void; onComplete: (id: string) => void; onRate: (order: Order) => void }) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  return (
    <div className="absolute inset-0 z-[150] bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom">
      <header className="p-6 flex items-center justify-between border-b">
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
        <h2 className="text-lg font-black italic tracking-tighter">{order.id}</h2>
        <div className="w-10"/>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        <div className={`relative transition-all duration-500 ease-in-out ${isMapExpanded ? 'h-[60vh]' : 'h-64'}`}>
          <DeliveryTrackingMap status={order.status} />
          {['pending', 'processing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && (
            <button 
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="absolute bottom-6 right-6 p-4 bg-white text-purple-600 rounded-2xl shadow-xl border border-purple-100 active:scale-90 transition-all z-20"
            >
              <MapIcon size={24} />
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Estado del Pedido</p>
              <h3 className={`text-2xl font-black italic uppercase leading-none ${order.status === 'cancelled' ? 'text-red-600' : ''}`}>
                {order.status === 'pending' ? 'Pendiente' : 
                 order.status === 'processing' ? 'Preparando' :
                 order.status === 'ready_for_pickup' ? 'Listo' :
                 order.status === 'out_for_delivery' ? 'En camino' :
                 order.status === 'delivered' ? 'Entregado' :
                 order.status === 'cancelled' ? 'Cancelado' : order.status}
              </h3>
              {order.status !== 'cancelled' && order.status !== 'delivered' && <p className="text-xs font-bold text-slate-400 mt-2">Llegada estimada: 20:45 PM</p>}
            </div>
            <div className={`p-4 rounded-3xl shadow-lg ${order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-purple-600 text-white animate-pulse'}`}>
              <Bike size={28}/>
            </div>
          </div>

          {/* Progress Visualizer */}
          {order.status !== 'cancelled' && (
            <div className="flex justify-between items-center px-2 relative">
               <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
               <div 
                 className="absolute top-1/2 left-0 h-[3px] bg-purple-600 -translate-y-1/2 z-0 transition-all duration-1000"
                 style={{ 
                   width: order.status === 'pending' ? '0%' : 
                          order.status === 'processing' ? '33%' : 
                          order.status === 'ready_for_pickup' ? '66%' : 
                          order.status === 'out_for_delivery' ? '85%' : '100%' 
                 }}
               ></div>
               
               {[
                 { id: 'pending', icon: '🕒' },
                 { id: 'processing', icon: '🍳' },
                 { id: 'ready_for_pickup', icon: '🥡' },
                 { id: 'out_for_delivery', icon: '🛵' },
                 { id: 'delivered', icon: '🏁' }
               ].map((step, idx) => {
                 const isCompleted = ['pending', 'processing', 'ready_for_pickup', 'out_for_delivery', 'delivered'].indexOf(order.status) >= idx;
                 const isActive = order.status === step.id;

                 return (
                   <div key={step.id} className="relative z-10 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-sm transition-all duration-500 ${
                        isActive ? 'bg-purple-600 ring-4 ring-purple-100 scale-125' : 
                        isCompleted ? 'bg-purple-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-300 border border-slate-100 dark:border-slate-800'
                      }`}>
                        {step.icon}
                      </div>
                   </div>
                 );
               })}
            </div>
          )}

          {['pending', 'processing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && order.deliveryKeyword && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800/50 rounded-[35px] p-6 space-y-4 animate-in zoom-in slide-in-from-top-4 duration-500">
              <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
                <AlertCircle size={20} />
                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Seguridad de Entrega</p>
              </div>
              <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-800/30 shadow-inner">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">Tu clave de entrega es:</p>
                <h4 className="text-4xl font-black italic tracking-tighter text-amber-600 dark:text-amber-400 uppercase">
                  {order.deliveryKeyword}
                </h4>
              </div>
              <p className="text-[10px] font-bold text-amber-700/70 dark:text-amber-400/70 text-center leading-relaxed">
                IMPORTANTE: No entregues esta clave al repartidor hasta que tengas el pedido físicamente en tus manos.
              </p>
            </div>
          )}

          {order.status === 'out_for_delivery' && (
            <button 
              onClick={() => onComplete(order.id)}
              className="w-full py-5 bg-green-600 text-white rounded-[25px] font-black uppercase tracking-tighter text-lg shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center space-x-3"
            >
              <Check size={24} />
              <span>Confirmar Entrega</span>
            </button>
          )}

          {order.status !== 'cancelled' && (order.driver || order.driverId) && (
            <div className="bg-slate-900 rounded-[35px] p-6 text-white flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-black italic">
                {order.driver?.name?.substring(0, 2).toUpperCase() || 'RP'}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest italic">Tu Repartidor</p>
                <p className="font-bold">{order.driver?.name || 'Asignado'}</p>
              </div>
              <div className="flex space-x-2">
                <button className="p-3 bg-white/10 rounded-2xl"><Phone size={20}/></button>
                <button onClick={onOpenChat} className="p-3 bg-white/10 rounded-2xl text-purple-400 active:scale-90 transition-transform"><MessageCircle size={20}/></button>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen del Pedido</h4>
            {order.details.map((d, i) => <p key={i} className="text-sm font-bold flex items-center space-x-2"><span>•</span> <span>{d}</span></p>)}
            
            {order.penalty && order.penalty > 0 && (
              <div className="p-4 bg-red-50 rounded-2xl flex justify-between items-center text-red-600">
                <span className="text-[10px] font-black uppercase tracking-widest italic">Cargo por cancelación</span>
                <span className="font-black">${order.penalty.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-4 flex justify-between items-end border-t border-dashed">
              <span className="text-2xl font-black italic">Total</span>
              <span className="text-2xl font-black text-purple-600">${(order.total || order.price).toFixed(2)}</span>
            </div>
          </div>

          {order.status === 'delivered' && !order.restaurantRating && (
            <button 
              onClick={() => onRate(order)}
              className="w-full py-5 bg-orange-600 text-white rounded-[25px] font-black uppercase tracking-tighter text-lg shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center space-x-3"
            >
              <Star size={24} />
              <span>Calificar Pedido</span>
            </button>
          )}

          {['pending', 'processing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && (
            <button 
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-4 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all"
            >
              ¿Deseas cancelar el pedido?
            </button>
          )}
        </div>
      </div>

      {showCancelConfirm && (
        <div className="absolute inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-xs text-center space-y-6 animate-in zoom-in duration-200">
            <div className="p-6 bg-red-50 text-red-600 rounded-full w-max mx-auto"><AlertCircle size={40}/></div>
            <h3 className="text-xl font-black italic uppercase">¿Cancelar pedido?</h3>
            <p className="text-xs font-bold text-slate-400">
              {order.step >= 2 
                ? `El repartidor ya está en camino. Se aplicará un cargo de $${FEES.CANCELLATION.toFixed(2)} por el tiempo transcurrido.` 
                : "Aún estamos preparando tu pedido. ¿Estás seguro?"}
            </p>
            <div className="flex flex-col space-y-3">
              <button onClick={() => onCancel(order.id)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px]">Sí, cancelar</button>
              <button onClick={() => setShowCancelConfirm(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px]">No, esperar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
