import { useState, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import Webcam from "react-webcam"
import { ChevronRight, ChevronLeft, Loader2, Camera, Check, AlertCircle, Lock, Image as ImageIcon, RefreshCw, User, Save, XCircle } from "lucide-react"
import { enviarSolicitudRepartidor } from "../lib/api"

const ACCENT = "#F107A3"
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const OCR_KEY = "K89943602088957"

interface Props { userId: string; userEmail: string; initialData?: any; onSubmit: () => void; onCancel?: () => void }

async function uploadCloudinary(file: File | string): Promise<string> {
  const fd = new FormData()
  if (typeof file === "string") {
    const blob = await (await fetch(file)).blob()
    fd.append("file", blob, "selfie.jpg")
  } else { fd.append("file", file) }
  fd.append("upload_preset", UPLOAD_PRESET)
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error?.message || "Error subiendo imagen")
  return d.secure_url
}

async function ocrINE(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("language", "spa")
  fd.append("isOverlayRequired", "false")
  fd.append("detectOrientation", "true")
  fd.append("OCREngine", "2")
  fd.append("scale", "true")
  const r = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: OCR_KEY },
    body: fd,
  })
  const d = await r.json()
  if (d.IsErroredOnProcessing || !d.ParsedResults?.[0]) throw new Error("OCR error")
  return d.ParsedResults[0].ParsedText || ""
}

function extractNameFromINE(text: string): string {
  const lines = text.split(/[\r\n]+/).map((l) => l.trim().toUpperCase()).filter((l) => l.length > 0)
  const NOISE = /^(INSTITUTO|NACIONALE?|ELECTORAL|CREDENCIAL|VOTAR|DOMICILIO|MUNICIPIO|ESTADO|ENTIDAD|CURP|FOLIO|VIGENCIA|SECCION|CLAVE|ELECTOR|REGISTRO|FEDERAL|APARTADO|FECHA|NACIMIENTO|NAFIONAL|NUMERO|DIRECCION|PARTIDO|ORGANO|ECTOS)$/
  const isWord = (w: string) => /^[A-ZÁÉÍÓÚÑÜ]{2,20}$/.test(w) && !NOISE.test(w)

  const valAfter = (labelRe: RegExp, lines: string[], i: number): string => {
    const after = lines[i].replace(labelRe, "").replace(/\bSEXO\b.*/i, "").replace(/\b[HM]\b/g, "").replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, " ").replace(/\s+/g, " ").trim()
    const ws = after.split(" ").filter(isWord)
    if (ws.length >= 1) return ws.join(" ")
    if (i + 1 < lines.length) {
      const nws = lines[i + 1].replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, " ").trim().split(" ").filter(isWord)
      if (nws.length >= 1 && !NOISE.test(nws[0])) return nws.join(" ")
    }
    return ""
  }

  let nombres = "", ap = "", am = ""
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!nombres && /[MN][OO0][MN]?B[RB]E/.test(l))
      nombres = valAfter(/[MN][OO0][MN]?B[RB]E[S()#]*\s*/g, lines, i)
    else if (!ap && /APELLIDO\s*(PATERNO|PAT)|PRIMER\s*APELLIDO/.test(l))
      ap = valAfter(/APELLIDO\s*(PATERNO|PAT\.?)|PRIMER\s*APELLIDO\s*/g, lines, i)
    else if (!am && /APELLIDO\s*(MATERNO|MAT)|SEGUNDO\s*APELLIDO/.test(l))
      am = valAfter(/APELLIDO\s*(MATERNO|MAT\.?)|SEGUNDO\s*APELLIDO\s*/g, lines, i)
  }

  if (nombres || ap || am) return [nombres, ap, am].filter(Boolean).join(" ").trim()

  let passed = false
  for (const line of lines) {
    if (/VOTAR|ELECTORAL/.test(line)) { passed = true; continue }
    if (!passed) continue
    const ws = line.replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, " ").split(/\s+/).filter(isWord)
    if (ws.length >= 2 && ws.length <= 6) return ws.join(" ")
  }
  return ""
}

export default function DriverSetup({ userId, userEmail, initialData, onSubmit, onCancel }: Props) {
  const [step, setStep] = useState(() => { try { return parseInt(localStorage.getItem("driver_setup_step") || "0") } catch { return 0 } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ineFrente, setIneFrente] = useState<File | null>(null)
  const [ineFrentePreview, setIneFrentePreview] = useState("")
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrFailed, setOcrFailed] = useState(false)
  const [nombre, setNombre] = useState(() => initialData?.datos?.nombre || localStorage.getItem("driver_setup_nombre") || "")
  const [nombreManual, setNombreManual] = useState("")
  const [ineReverso, setIneReverso] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const webcamRef = useRef<Webcam>(null)
  const [tarjetaCirc, setTarjetaCirc] = useState<File | null>(null)
  const [vehiculoTipo, setVehiculoTipo] = useState(() => initialData?.datos?.vehiculo_tipo || localStorage.getItem("driver_setup_vtipo") || "moto")
  const [vehiculoModelo, setVehiculoModelo] = useState(() => initialData?.datos?.vehiculo_modelo || localStorage.getItem("driver_setup_vmodelo") || "")
  const [vehiculoPlacas, setVehiculoPlacas] = useState(() => initialData?.datos?.vehiculo_placas || localStorage.getItem("driver_setup_vplacas") || "")
  const [telefono, setTelefono] = useState(() => initialData?.datos?.telefono || localStorage.getItem("driver_setup_tel") || "")
  const steps = ["INE Frente", "INE Reverso", "Selfie", "Vehículo", "Tarjeta", "Confirmar"]

  // Persistir progreso
  const saveStep = (s: number) => { setStep(s); try { localStorage.setItem("driver_setup_step", String(s)) } catch {} }
  const saveNombre = (n: string) => { setNombre(n); try { localStorage.setItem("driver_setup_nombre", n) } catch {} }
  const saveVTipo = (v: string) => { setVehiculoTipo(v); try { localStorage.setItem("driver_setup_vtipo", v) } catch {} }
  const saveVModelo = (v: string) => { setVehiculoModelo(v); try { localStorage.setItem("driver_setup_vmodelo", v) } catch {} }
  const saveVPlacas = (v: string) => { setVehiculoPlacas(v); try { localStorage.setItem("driver_setup_vplacas", v) } catch {} }
  const saveTel = (v: string) => { setTelefono(v); try { localStorage.setItem("driver_setup_tel", v) } catch {} }
  const saveNombreLocked = (v: boolean) => { setNombreLocked(v); try { localStorage.setItem("driver_setup_nombre_locked", v ? "1" : "0") } catch {} }
  const clearSetup = () => { ["driver_setup_step","driver_setup_nombre","driver_setup_vtipo","driver_setup_vmodelo","driver_setup_vplacas","driver_setup_tel","driver_setup_nombre_locked"].forEach(k => { try { localStorage.removeItem(k) } catch {} }) }

  const [nombreLocked, setNombreLocked] = useState(() => !!initialData?.datos?.nombre || localStorage.getItem("driver_setup_nombre_locked") === "1")
  const resetFrente = () => { setIneFrente(null); setIneFrentePreview(""); setNombre(""); setOcrFailed(false); setNombreLocked(false) }

  const handleIneFrente = async (file: File) => {
    resetFrente(); setIneFrente(file); setIneFrentePreview(URL.createObjectURL(file)); setOcrLoading(true)
    try {
      const text = await ocrINE(file)
      const extracted = extractNameFromINE(text)
      // Acepta cualquier extraccion (1+ palabras) y deja editar
      if (extracted && extracted.trim().length >= 3) {
        setNombre(extracted.trim()); setOcrFailed(false)
      } else {
        // OCR fallo completamente, pedir nueva foto
        setOcrFailed(true); setIneFrente(null); setIneFrentePreview("")
      }
    } catch { setOcrFailed(true); setIneFrente(null); setIneFrentePreview("") }
    finally { setOcrLoading(false) }
  }

  const handleSubmit = async () => {
    if (!ineFrente || !ineReverso || !selfie || !tarjetaCirc) { setError("Completa todos los campos."); return }
    setLoading(true); setError("")
    try {
      const [fUrl, rUrl, sUrl, tUrl] = await Promise.all([uploadCloudinary(ineFrente), uploadCloudinary(ineReverso), uploadCloudinary(selfie), uploadCloudinary(tarjetaCirc!)])
      await enviarSolicitudRepartidor({ userId, email: userEmail, nombre, telefono, vehiculo_tipo: vehiculoTipo, vehiculo_modelo: vehiculoModelo, vehiculo_placas: vehiculoPlacas, ine_frente_url: fUrl, ine_reverso_url: rUrl, selfie_url: sUrl, tarjeta_url: tUrl })
      clearSetup()
      onSubmit()
    } catch (e: any) { setError(e.message || "Error al enviar.") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full sm:h-auto max-w-md bg-white p-6 md:p-8 sm:rounded-3xl shadow-xl overflow-y-auto">
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => <div key={i} className="h-2 flex-1 rounded-full transition-all duration-500" style={{ background: step >= i ? ACCENT : "#f1f5f9" }} />)}
        </div>
        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">INE — Frente</h1>
                <p className="text-sm text-slate-500">Sube el frente de tu INE. Leemos tu nombre automáticamente.</p>
              </div>
              {ocrFailed && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
                <p className="text-sm text-yellow-800 mb-2 font-medium">
                  No se pudo leer la licencia. Escribe tu nombre manualmente:
                </p>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Nombre completo según tu licencia"
                  value={nombreManual ?? ''}
                  onChange={(e) => setNombreManual(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (nombreManual?.trim()) {
                      setNombre(nombreManual.trim());
                      setOcrFailed(false);
                    }
                  }}
                  className="mt-2 w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold"
                >
                  Continuar con este nombre
                </button>
              </div>
            )}
            {ocrFailed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center space-y-4">
                  <XCircle className="text-red-400 mx-auto" size={48} />
                  <div>
                    <p className="font-black text-red-700 text-lg">No pudimos leer tu INE</p>
                    <ul className="text-red-500 text-xs mt-3 space-y-1 text-left">
                      <li>✦ Buena iluminación, sin sombras ni reflejos</li>
                      <li>✦ INE completo y enfocado</li>
                      <li>✦ Fondo contrastante</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 py-3 bg-red-100 text-red-700 font-black rounded-2xl cursor-pointer flex items-center justify-center gap-2 text-sm hover:bg-red-200 transition-all">
                      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleIneFrente(e.target.files[0])} />
                      📷 Nueva foto
                    </label>
                    <label className="flex-1 py-3 bg-red-100 text-red-700 font-black rounded-2xl cursor-pointer flex items-center justify-center gap-2 text-sm hover:bg-red-200 transition-all">
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleIneFrente(e.target.files[0])} />
                      🖼️ Galería
                    </label>
                  </div>
                </motion.div>
              )}
              {!ocrFailed && !ineFrentePreview && (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-4">
                  <ImageIcon className="text-slate-300 mx-auto" size={48} />
                  <p className="font-bold text-slate-600">INE / Credencial para Votar</p>
                  <p className="text-xs text-slate-400">Texto legible, sin reflejos</p>
                  <div className="flex gap-3 justify-center">
                    <label className="px-5 py-2.5 bg-slate-100 rounded-2xl cursor-pointer text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
                      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleIneFrente(e.target.files[0])} />
                      📷 Cámara
                    </label>
                    <label className="px-5 py-2.5 bg-slate-100 rounded-2xl cursor-pointer text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleIneFrente(e.target.files[0])} />
                      🖼️ Galería
                    </label>
                  </div>
                </div>
              )}
              {ineFrentePreview && (
                <div className="relative border-2 rounded-3xl overflow-hidden" style={{ borderColor: nombre ? "#86efac" : "#e2e8f0" }}>
                  <img src={ineFrentePreview} className="w-full h-52 object-cover" />
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-white" size={40} />
                      <p className="text-white font-black text-lg">Leyendo INE...</p>
                    </div>
                  )}
                  {!ocrLoading && nombre && <button onClick={resetFrente} className="absolute top-3 right-3 bg-white/90 rounded-full p-2 shadow-lg"><RefreshCw size={16} className="text-slate-600" /></button>}
                </div>
              )}
              {ineFrentePreview && !ocrLoading && nombre && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                        Nombre (de tu INE)
                      </label>
                      {nombreLocked && (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-black">
                          <Lock size={12} /> Confirmado
                        </div>
                      )}
                    </div>
                    <input
                      value={nombre}
                      onChange={e => !nombreLocked && setNombre(e.target.value.toUpperCase())}
                      readOnly={nombreLocked}
                      className="w-full px-4 py-3.5 rounded-2xl text-sm font-black uppercase outline-none transition-all border-2"
                      style={{
                        background: nombreLocked ? "#f0fdf4" : "#f8fafc",
                        borderColor: nombreLocked ? "#86efac" : "#e2e8f0",
                        color: "#1e293b"
                      }}
                    />
                  </div>
                  {!nombreLocked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2">
                      <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-amber-700 text-xs font-bold leading-relaxed">
                        Verifica que sea <span className="underline">exactamente</span> como aparece en tu INE.
                        Si no coincide, tu solicitud será <strong>rechazada</strong>.
                      </p>
                    </div>
                  )}
                  {!nombreLocked ? (
                    <button onClick={() => saveNombreLocked(true)} disabled={nombre.trim().split(" ").filter(Boolean).length < 2}
                      className="w-full py-3 rounded-2xl text-white font-black flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                      style={{ background: ACCENT }}>
                      <Lock size={16} /> Confirmar nombre
                    </button>
                  ) : (
                    <p className="text-xs text-green-600 font-bold text-center">
                      ✓ Este nombre se usará en todos tus pedidos
                    </p>
                  )}
                </motion.div>
              )}
              {onCancel && !ineFrentePreview && <button onClick={onCancel} className="w-full py-3 text-slate-400 text-sm font-bold">Cancelar</button>}
              <button onClick={() => saveStep(1)} disabled={!nombre || ocrLoading || !nombreLocked}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40">
                Siguiente <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div><h1 className="text-2xl font-black text-slate-900 mb-1">INE — Reverso</h1><p className="text-sm text-slate-500">Ahora la parte trasera de tu INE.</p></div>
              <div className={`border-2 border-dashed rounded-3xl overflow-hidden transition-all ${ineReverso ? "border-green-400" : "border-slate-200"}`}>
                {ineReverso ? (
                  <div className="relative">
                    <img src={URL.createObjectURL(ineReverso)} className="w-full h-48 object-cover" />
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full"><Check size={16} /></div>
                    <button onClick={() => setIneReverso(null)} className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5 shadow"><RefreshCw size={16} className="text-slate-600" /></button>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-4">
                    <ImageIcon className="text-slate-300 mx-auto" size={40} />
                    <p className="text-slate-400 text-sm">Reverso de tu INE</p>
                    <div className="flex gap-2 justify-center">
                      <label className="px-4 py-2 bg-slate-100 rounded-xl cursor-pointer text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
                        <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => setIneReverso(e.target.files?.[0] || null)} />📷 Cámara
                      </label>
                      <label className="px-4 py-2 bg-slate-100 rounded-xl cursor-pointer text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
                        <input type="file" className="hidden" accept="image/*" onChange={e => setIneReverso(e.target.files?.[0] || null)} />🖼️ Galería
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={() => saveStep(0)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2"><ChevronLeft size={20} /> Atrás</button>
                <button onClick={() => saveStep(2)} disabled={!ineReverso} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">Siguiente <ChevronRight size={20} /></button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div><h1 className="text-2xl font-black text-slate-900 mb-1">Verificación Facial</h1><p className="text-sm text-slate-500">Tómate una selfie para confirmar tu identidad.</p></div>
              <div className="relative aspect-[3/4] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 flex items-center justify-center">
                {selfie ? (
                  <div className="relative w-full h-full">
                    <img src={selfie} className="w-full h-full object-cover" />
                    <button onClick={() => { setSelfie(null); setShowWebcam(true) }} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 shadow-lg"><RefreshCw size={14} /> Repetir</button>
                  </div>
                ) : showWebcam ? (
                  <div className="relative w-full h-full">
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" mirrored />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[80%] h-[80%] border-4 border-white/50 border-dashed rounded-[100px] flex items-center justify-center"><User size={120} className="text-white/30" /></div>
                    </div>
                    <button onClick={() => { const img = webcamRef.current?.getScreenshot(); if (img) { setSelfie(img); setShowWebcam(false) } }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-200 shadow-xl flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full" style={{ background: ACCENT }} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4"><Camera size={32} className="text-slate-400" /></div>
                    <p className="text-sm text-slate-500 mb-6">Necesitamos verificar que eres tú.</p>
                    <button onClick={() => setShowWebcam(true)} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl flex items-center gap-2 mx-auto"><Camera size={18} /> Abrir cámara</button>
                  </div>
                )}
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <p className="text-amber-700 text-xs font-bold leading-relaxed">Rostro bien iluminado, sin lentes oscuros. Se comparará con tu INE.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => saveStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2"><ChevronLeft size={20} /> Atrás</button>
                <button onClick={() => saveStep(3)} disabled={!selfie} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">Siguiente <ChevronRight size={20} /></button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div><h1 className="text-2xl font-black text-slate-900 mb-1">Tu Vehículo</h1><p className="text-sm text-slate-500">Información de transporte y contacto.</p></div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de vehículo</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ id: "moto", label: "Moto", emoji: "🏍️" }, { id: "auto", label: "Auto", emoji: "🚗" }, { id: "bici", label: "Bici", emoji: "🚲" }].map(({ id, label, emoji }) => (
                    <button key={id} onClick={() => saveVTipo(id)}
                      className="py-4 rounded-2xl flex flex-col items-center gap-1 border-2 transition-all font-black text-sm"
                      style={{ borderColor: vehiculoTipo === id ? ACCENT : "#e2e8f0", background: vehiculoTipo === id ? `${ACCENT}15` : "#f8fafc", color: vehiculoTipo === id ? ACCENT : "#64748b" }}>
                      <span className="text-2xl">{emoji}</span>{label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {[{ value: vehiculoModelo, set: setVehiculoModelo, label: "Modelo", placeholder: "Ej: Italika FT150, Tsuru...", upper: false },
                  ...(vehiculoTipo !== "bici" ? [{ value: vehiculoPlacas, set: setVehiculoPlacas, label: "Placas", placeholder: "Ej: ABC-1234", upper: true }] : []),
                  { value: telefono, set: setTelefono, label: "Teléfono de contacto", placeholder: "55 1234 5678", upper: false }
                ].map(({ value, set, label, placeholder, upper }) => (
                  <div key={label} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                    <input value={value} onChange={e => { const v = upper ? e.target.value.toUpperCase() : e.target.value; set(v); if(label==="Teléfono de contacto") saveTel(v); if(label==="Modelo") saveVModelo(v); if(label==="Placas") saveVPlacas(e.target.value.toUpperCase()) }} placeholder={placeholder}
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl outline-none text-sm font-medium focus:border-pink-300 transition-all" />
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => saveStep(2)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2"><ChevronLeft size={20} /> Atrás</button>
                <button onClick={() => saveStep(4)} disabled={!vehiculoModelo || (vehiculoTipo !== "bici" && !vehiculoPlacas) || !telefono}
                  className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">Siguiente <ChevronRight size={20} /></button>
              </div>
            </motion.div>
          )}

          
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">{vehiculoTipo === "bici" ? "Foto de tu bicicleta" : "Tarjeta de Circulacion"}</h1>
                <p className="text-sm text-slate-500">{vehiculoTipo === "bici" ? "Sube una foto clara de tu bicicleta." : "Foto de la tarjeta de circulacion de tu vehiculo."}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <p className="text-amber-700 text-xs font-bold leading-relaxed">
                  {vehiculoTipo === "bici"
                    ? "La foto debe mostrar claramente tu bicicleta completa."
                    : <>Las placas y datos del vehiculo deben coincidir <span className="underline">exactamente</span> con lo que ingresaste. De lo contrario tu solicitud sera <strong>rechazada</strong>.</>}
                </p>
              </div>

              <div className={`border-2 border-dashed rounded-3xl overflow-hidden transition-all ${tarjetaCirc ? "border-green-400" : "border-slate-200"}`}>
                {tarjetaCirc ? (
                  <div className="relative">
                    <img src={URL.createObjectURL(tarjetaCirc)} className="w-full h-52 object-cover" />
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full"><Check size={16} /></div>
                    <button onClick={() => setTarjetaCirc(null)} className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5 shadow">
                      <RefreshCw size={16} className="text-slate-600" />
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                      <span className="text-3xl">{vehiculoTipo === "bici" ? "🚲" : "🚗"}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">Tarjeta de Circulación</p>
                      <p className="text-xs text-slate-400 mt-1">Asegúrate que las placas sean legibles</p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <label className="px-4 py-2 bg-slate-100 rounded-xl cursor-pointer text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
                        <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => setTarjetaCirc(e.target.files?.[0] || null)} />
                        📷 Cámara
                      </label>
                      <label className="px-4 py-2 bg-slate-100 rounded-xl cursor-pointer text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
                        <input type="file" className="hidden" accept="image/*" onChange={e => setTarjetaCirc(e.target.files?.[0] || null)} />
                        🖼️ Galería
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => saveStep(3)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2">
                  <ChevronLeft size={20} /> Atrás
                </button>
                <button onClick={() => saveStep(5)} disabled={vehiculoTipo !== "bici" && !tarjetaCirc}
                  className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                  Siguiente <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}
{step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div><h1 className="text-2xl font-black text-slate-900 mb-1">Confirmar solicitud</h1><p className="text-sm text-slate-500">Revisa todo antes de enviar.</p></div>
              <div className="bg-slate-50 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  {selfie && <img src={selfie} className="w-14 h-14 rounded-2xl object-cover" />}
                  <div>
                    <p className="font-black text-slate-900">{nombre}</p>
                    <div className="flex items-center gap-1 mt-0.5"><Lock size={10} className="text-green-500" /><p className="text-[10px] text-green-600 font-bold">Verificado con INE</p></div>
                  </div>
                </div>
                {[["Teléfono", telefono], ["Vehículo", `${vehiculoTipo.charAt(0).toUpperCase() + vehiculoTipo.slice(1)} — ${vehiculoModelo}`], ...(vehiculoTipo !== "bici" ? [["Placas", vehiculoPlacas]] : []), ["Documentos", "✓ INE frente + reverso + selfie + " + (vehiculoTipo === "bici" ? "foto bici" : "tarjeta circulacion")]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-900">{v}</span></div>
                ))}
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-blue-700 text-xs font-bold leading-relaxed">Tu solicitud será revisada en 24–48 horas.</p>
              </div>
              {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">{error}</p>}
              <div className="flex gap-4">
                <button onClick={() => saveStep(4)} disabled={loading} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2"><ChevronLeft size={20} /> Atrás</button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-[2] py-4 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 text-lg"
                  style={{ background: loading ? "#94a3b8" : ACCENT }}>
                  {loading ? <><Loader2 className="animate-spin" size={24} /> Subiendo...</> : <><Save size={24} /> Enviar Solicitud</>}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}







