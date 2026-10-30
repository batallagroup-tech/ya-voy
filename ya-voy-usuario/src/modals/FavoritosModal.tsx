import { motion } from "motion/react";
import { X, Heart, Star, MapPin, ChevronRight, ShoppingBag } from "lucide-react";
import { imgUrl } from "../lib/cloudinary";
import { GRAD } from "../lib/constants";
import type { Negocio } from "../types";

interface Props {
  favoritos: Negocio[];
  onToggleFavorito: (n: Negocio) => void;
  onOpenNegocio: (n: Negocio) => void;
  onClose: () => void;
}

export default function FavoritosModal({ favoritos, onToggleFavorito, onOpenNegocio, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-600">
              <Heart size={20} className="fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">Mis Favoritos</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {favoritos.length} {favoritos.length === 1 ? "lugar guardado" : "lugares guardados"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        {/* Lista de Favoritos */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {favoritos.length === 0 ? (
            <div className="text-center py-14 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Heart size={32} className="stroke-[1.5]" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Aún no tienes favoritos</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Toca el corazón <span className="text-rose-500 font-bold">❤️</span> en cualquier restaurante para guardarlo aquí y ordenar en un solo toque.
              </p>
            </div>
          ) : (
            favoritos.map(n => {
              const pausado = n.aceptando_pedidos === false || n.esta_abierto === false;
              return (
                <div 
                  key={n.id}
                  className="w-full bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-100 dark:border-slate-700/60 p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-all group">
                  
                  {/* Foto del Negocio */}
                  <div 
                    onClick={() => { onClose(); onOpenNegocio(n); }}
                    className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 relative bg-slate-100 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center cursor-pointer">
                    {n.imagen_url ? (
                      <img src={imgUrl(n.imagen_url, 160)} alt={n.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <span className="text-2xl">🏪</span>
                    )}
                    {pausado && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-[8px] font-black uppercase tracking-wider">Cerrado</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div 
                    onClick={() => { onClose(); onOpenNegocio(n); }}
                    className="flex-1 min-w-0 cursor-pointer">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm truncate group-hover:text-rose-600 transition-colors">
                      {n.nombre}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                      <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/30 px-1.5 py-0.5 rounded-lg border border-yellow-200/50">
                        <Star size={11} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                          {Number(n.rating || 0).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {n.tipo || "Restaurante"}
                      </span>
                      {pausado ? (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          No disponible ahora
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Envío ${n.costo_envio ?? n.costo_envio_base ?? Number(localStorage.getItem("ya_voy_envio_minimo") || 20)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botón Quitar Favorito */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleFavorito(n); }}
                    title="Quitar de favoritos"
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:bg-rose-100 active:scale-90 transition-all">
                    <Heart size={18} className="fill-rose-500 text-rose-500" />
                  </button>

                  {/* Flecha para entrar */}
                  <button
                    onClick={() => { onClose(); onOpenNegocio(n); }}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-600 dark:hover:text-white">
                    <ChevronRight size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {favoritos.length > 0 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center">
            <p className="text-[11px] text-slate-400">
              Toca cualquier restaurante para ver su menú y ordenar
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
