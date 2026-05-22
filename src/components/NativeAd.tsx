import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

// Define the interface for the ad data from Start.io
interface StartIoAd {
  title: string;
  description: string;
  imageUrl: string;
  callToAction: string;
  clickUrl: string;
}

export const NativeAd = () => {
  const [ad, setAd] = useState<StartIoAd | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAd = () => {
      // @ts-ignore - startapp is added globally in index.html
      if (window.startapp && typeof window.startapp.loadNativeAd === 'function') {
        // @ts-ignore
        window.startapp.loadNativeAd({
          adTag: 'home_list_native',
          onAdLoaded: (adData: StartIoAd) => {
            setAd(adData);
            setLoading(false);
          },
          onAdFailed: () => {
            setLoading(false);
          }
        });
      } else {
        // Retry after a short delay if the SDK isn't loaded yet
        setTimeout(loadAd, 500);
      }
    };

    loadAd();
  }, []);

  // Use placeholder data if the ad fails to load or is still loading
  const displayAd = ad || {
    title: "Nike Air Max 270",
    description: "Siente la comodidad definitiva con la tecnología Air Max. Diseño icónico para tu día a día. ¡Consíguelos hoy con envío gratis!",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    callToAction: "Ver más",
    clickUrl: "#"
  };

  if (loading && !ad) {
    return (
      <div className="relative group animate-pulse">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800 h-[300px]">
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700"
      onClick={() => window.open(displayAd.clickUrl, '_blank')}
    >
      <div className="bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-all hover:shadow-2xl hover:shadow-purple-100 dark:hover:border-purple-900/50">
        {/* Ad Label */}
        <div className="absolute top-6 right-8 z-10">
          <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
            Patrocinado
          </span>
        </div>

        {/* Ad Image */}
        <div className="aspect-[21/9] w-full overflow-hidden relative">
          <img 
            src={displayAd.imageUrl} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
            alt="Anuncio" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent" />
        </div>

        {/* Ad Content */}
        <div className="p-8 pt-2">
          <div className="flex justify-between items-end gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Oferta Exclusiva</span>
              </div>
              <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none mb-3 truncate">
                {displayAd.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                {displayAd.description}
              </p>
            </div>
            
            <button className="flex-shrink-0 px-8 py-4 bg-purple-600 text-white rounded-[25px] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-purple-200 dark:shadow-none active:scale-95 transition-all flex items-center space-x-2 group/btn">
              <span>{displayAd.callToAction}</span>
              <ExternalLink size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
