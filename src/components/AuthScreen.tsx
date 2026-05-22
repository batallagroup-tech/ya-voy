import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const AuthScreen = ({ onLogin }: { onLogin: () => void }) => (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-8 bg-purple-700 text-white overflow-hidden">
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-white/20 backdrop-blur-2xl rounded-[35px] border border-white/30 flex items-center justify-center text-4xl font-black italic mb-10 shadow-2xl transform -rotate-12">YV!</div>
        <h1 className="text-6xl font-black italic mb-4 tracking-tighter leading-none">Ya Voy!</h1>
        <p className="text-white/60 font-bold uppercase tracking-[0.3em] text-xs mb-16">Delivery Express</p>
        <button onClick={onLogin} className="w-full max-w-xs py-5 bg-white text-purple-700 rounded-[30px] font-black shadow-xl active:scale-95 transition-all text-lg">Comenzar ahora</button>
      </div>
    </div>
);
