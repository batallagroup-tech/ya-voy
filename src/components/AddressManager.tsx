import React, { useState } from 'react';
import { ArrowLeft, Home, Briefcase, Edit2, Trash2, Plus } from 'lucide-react';
import { AddressEditor } from './AddressEditor';
import { Address } from '../types';

export const AddressManager = ({ userData, onClose, onSaveAddress, onRemoveAddress, onSetPrimary }: { userData: any; onClose: () => void; onSaveAddress: (a: Address) => void; onRemoveAddress: (id: string) => void; onSetPrimary: (id: string) => void }) => {
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="absolute inset-0 z-[120] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-200">
        <header className="p-6 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-full dark:text-white"><ArrowLeft size={20}/></button>
            <h2 className="text-xl font-black dark:text-white">Mis Direcciones</h2>
          </div>
        </header>
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1 pb-32">
            {userData.direcciones.map((addr: Address) => (
                <div 
                  key={addr.id} 
                  onClick={() => onSetPrimary(addr.id)}
                  className={`p-6 bg-white dark:bg-slate-900 rounded-[35px] shadow-sm flex items-center space-x-4 cursor-pointer border-2 transition-all ${addr.primary ? 'border-purple-600 ring-4 ring-purple-50 dark:ring-purple-900/20' : 'border-transparent'}`}
                >
                    <div className={`p-3 rounded-2xl ${addr.primary ? 'bg-purple-600 text-white' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600'}`}>
                      {addr.type === 'home' ? <Home size={20}/> : <Briefcase size={20}/>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-black text-sm dark:text-white">{addr.label}</p>
                        {addr.primary && <span className="text-[8px] font-black uppercase bg-purple-600 text-white px-2 py-0.5 rounded-full">Principal</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold">{addr.address}</p>
                    </div>
                    <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                       <button onClick={() => { setEditingAddress(addr); setShowEditor(true); }} className="p-2 text-slate-300 hover:text-purple-600"><Edit2 size={16}/></button>
                       <button onClick={() => onRemoveAddress(addr.id)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            <button 
              onClick={() => { setEditingAddress(null); setShowEditor(true); }}
              className="w-full p-6 bg-white dark:bg-slate-900 rounded-[35px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-black text-sm flex items-center justify-center space-x-2 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
            >
              <Plus size={20}/> <span>Nueva dirección</span>
            </button>
        </div>

        {showEditor && (
          <AddressEditor 
            address={editingAddress} 
            onClose={() => setShowEditor(false)} 
            onSave={(data) => { onSaveAddress(data); setShowEditor(false); }} 
          />
        )}
    </div>
  );
};
