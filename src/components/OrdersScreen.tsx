import React from 'react';
import { History } from 'lucide-react';
import { Order } from '../types';
import { NativeAd } from './NativeAd';

export const OrdersScreen = ({ orders, setSelectedOrder }: { orders: Order[]; setSelectedOrder: (o: Order) => void }) => (
    <div className="p-6 animate-in fade-in">
        <h1 className="text-2xl font-black mb-6 italic tracking-tighter uppercase dark:text-white">Tus Pedidos</h1>
        <div className="space-y-4">
            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-[40px] text-slate-400">
                        <History size={48} />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase italic tracking-tighter text-slate-800 dark:text-slate-200">No tienes pedidos aún</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">¡Haz tu primer pedido hoy!</p>
                    </div>
                </div>
            ) : (
                orders.map((order, idx) => (
                    <React.Fragment key={order.id}>
                        {idx > 0 && idx % 3 === 0 && <div className="py-2"><NativeAd /></div>}
                        <div onClick={() => setSelectedOrder(order)} className="bg-white dark:bg-slate-900 p-5 rounded-[35px] border border-gray-100 dark:border-slate-800 shadow-sm flex items-center space-x-4 cursor-pointer active:scale-95 transition-all">
                            <img src={order.img} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                            <div className="flex-1">
                                <h3 className="font-bold text-sm dark:text-white">{order.name}</h3>
                                <div className="flex items-center space-x-2">
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">{order.date}</p>
                                    <span className="text-[10px] font-black text-purple-600 italic">${(order.total || order.price).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase ${
                                ['pending', 'processing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) 
                                ? 'bg-purple-100 text-purple-600' 
                                : order.status === 'cancelled' 
                                ? 'bg-red-50 text-red-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                                {order.status === 'pending' ? 'Pendiente' : 
                                order.status === 'processing' ? 'Preparando' :
                                order.status === 'ready_for_pickup' ? 'Listo' :
                                order.status === 'out_for_delivery' ? 'En camino' :
                                order.status === 'delivered' ? 'Entregado' :
                                order.status === 'cancelled' ? 'Cancelado' : order.status}
                            </div>
                        </div>
                    </React.Fragment>
                ))
            )}
        </div>
    </div>
);
