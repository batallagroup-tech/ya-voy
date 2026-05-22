import React, { useState } from 'react';
import { useAuth } from './FirebaseProvider';
import { db, storage, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { X, Plus, Trash2, Image as ImageIcon, Loader2, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

interface Modifier {
  id: string;
  name: string;
  type: 'boolean' | 'selection' | 'extra';
  required: boolean;
  options: ModifierOption[];
}

export const ProductCreator = ({ storeId, onComplete }: { storeId: string, onComplete: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    available: true
  });

  const [modifiers, setModifiers] = useState<Modifier[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addModifier = () => {
    const newModifier: Modifier = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'extra',
      required: false,
      options: []
    };
    setModifiers([...modifiers, newModifier]);
  };

  const removeModifier = (id: string) => {
    setModifiers(modifiers.filter(m => m.id !== id));
  };

  const updateModifier = (id: string, updates: Partial<Modifier>) => {
    setModifiers(modifiers.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const addOption = (modifierId: string) => {
    setModifiers(modifiers.map(m => {
      if (m.id === modifierId) {
        return {
          ...m,
          options: [...m.options, { id: Math.random().toString(36).substr(2, 9), name: '', price: 0 }]
        };
      }
      return m;
    }));
  };

  const removeOption = (modifierId: string, optionId: string) => {
    setModifiers(modifiers.map(m => {
      if (m.id === modifierId) {
        return {
          ...m,
          options: m.options.filter(o => o.id !== optionId)
        };
      }
      return m;
    }));
  };

  const updateOption = (modifierId: string, optionId: string, updates: Partial<ModifierOption>) => {
    setModifiers(modifiers.map(m => {
      if (m.id === modifierId) {
        return {
          ...m,
          options: m.options.map(o => o.id === optionId ? { ...o, ...updates } : o)
        };
      }
      return m;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const storageRef = ref(storage, `products/${storeId}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        imageUrl,
        modifiers,
        storeId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'products'), productData);
      toast.success('¡Producto creado con éxito!');
      onComplete();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onComplete} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800">Nuevo Producto</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configura tu menú</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-3 bg-[#FF5722] text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-orange-100 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
          Guardar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {/* Image Upload */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto del Producto</label>
          <div 
            onClick={() => document.getElementById('product-image')?.click()}
            className="aspect-video w-full bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-all overflow-hidden relative"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <ImageIcon size={24} className="text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-400">Toca para subir una foto</p>
              </>
            )}
            <input id="product-image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
            <input 
              type="text" 
              placeholder="Ej. Hamburguesa Especial"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
            <input 
              type="number" 
              placeholder="0.00"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
          <textarea 
            placeholder="Describe los ingredientes y detalles..."
            rows={3}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 resize-none"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 appearance-none"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          >
            <option value="">Selecciona una categoría</option>
            <option value="Entradas">Entradas</option>
            <option value="Platos Fuertes">Platos Fuertes</option>
            <option value="Postres">Postres</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Extras">Extras</option>
          </select>
        </div>

        {/* Modifiers Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800">Modificadores y Extras</h3>
            <button 
              onClick={addModifier}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
            >
              <Plus size={16} />
              Agregar Grupo
            </button>
          </div>

          <div className="space-y-4">
            {modifiers.map((mod, idx) => (
              <motion.div 
                key={mod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Nombre del grupo (Ej. Elige tu término)"
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 text-sm"
                        value={mod.name}
                        onChange={(e) => updateModifier(mod.id, { name: e.target.value })}
                      />
                      <select 
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 text-sm appearance-none"
                        value={mod.type}
                        onChange={(e) => updateModifier(mod.id, { type: e.target.value as any })}
                      >
                        <option value="selection">Selección Única (Radio)</option>
                        <option value="extra">Múltiple Selección (Checkbox)</option>
                        <option value="boolean">Sí / No (Switch)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-[#FF5722]"
                          checked={mod.required}
                          onChange={(e) => updateModifier(mod.id, { required: e.target.checked })}
                        />
                        <span className="text-xs font-bold text-slate-500">¿Es obligatorio?</span>
                      </label>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeModifier(mod.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Options List */}
                {mod.type !== 'boolean' && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-50">
                    {mod.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          placeholder="Opción (Ej. Término Medio)"
                          className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 text-xs"
                          value={opt.name}
                          onChange={(e) => updateOption(mod.id, opt.id, { name: e.target.value })}
                        />
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">$</span>
                          <input 
                            type="number" 
                            placeholder="0"
                            className="w-full p-2 pl-5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 text-xs"
                            value={opt.price}
                            onChange={(e) => updateOption(mod.id, opt.id, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <button 
                          onClick={() => removeOption(mod.id, opt.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => addOption(mod.id)}
                      className="flex items-center gap-2 text-[#FF5722] font-black text-[10px] uppercase tracking-wider mt-2 hover:opacity-80 transition-all"
                    >
                      <Plus size={14} />
                      Agregar Opción
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
