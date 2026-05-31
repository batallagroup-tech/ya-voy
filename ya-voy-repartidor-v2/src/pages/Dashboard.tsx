import { useState, useEffect, useRef, useMemo } from "react"
import { useClerk } from "@clerk/clerk-react"
import { motion, AnimatePresence } from "motion/react"
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Bike, Navigation, Clock, User, LogOut, MapPin, CheckCircle, Package, ChevronRight, TrendingUp, Loader2, X, ChevronLeft, MessageSquare, Send, Camera, Wallet } from "lucide-react"
import { AdMob, BannerAdSize, BannerAdPosition } from "@capacitor-community/admob"
import { Toaster, toast } from "sonner"
import { getPedidosDisponibles, aceptarPedido, actualizarEstadoPedido, getPedidosRepartidor, toggleStatusRepartidor } from "../lib/api"

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

const GRAD = "linear-gradient(135deg, #7B2FF7 0%, #F107A3 50%, #FF6B00 100%)"
const TEAL = "#F107A3"
const API = import.meta.env.VITE_API_URL || "http://localhost:3001"

const statusColor: Record<string, string> = {
  nuevo: "bg-blue-500", preparando: "bg-orange-500", listo: "bg-yellow-500",
  en_camino: "bg-teal-500", entregado: "bg-green-500", cancelado: "bg-red-500",
}
const statusLabel: Record<string, string> = {
  nuevo: "Nuevo", preparando: "Preparando", listo: "Listo",
  en_camino: "En camino", entregado: "Entregado", cancelado: "Cancelado",
}

function RouteMap({ restLat, restLng, entregaLat, entregaLng }: { restLat: number; restLng: number; entregaLat: number; entregaLng: number }) {
  const [coords, setCoords] = useState<[number,number][]>([])
  const [info, setInfo] = useState<{ dist: string; time: string } | null>(null)
  const compact = false
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const r = await fetch(`http://router.project-osrm.org/route/v1/driving/${restLng},${restLat};${entregaLng},${entregaLat}?overview=full&geometries=geojson`)
        const d = await r.json()
        if (d.routes?.[0]) {
          setCoords(d.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number,number]))
          setInfo({ dist: (d.routes[0].distance / 1000).toFixed(1) + " km", time: "~" + Math.ceil(d.routes[0].duration / 60) + " min" })
        }
      } catch { setCoords([[restLat, restLng], [entregaLat, entregaLng]]) }
    }
    fetchRoute()
  }, [restLat, restLng, entregaLat, entregaLng])
  const restauranteIcon = L.divIcon({ html: '<div style="background:#FF6B00;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>', iconSize: [14,14], iconAnchor: [7,7], className: "" })
  const clienteIcon = L.divIcon({ html: '<div style="background:#7B2FF7;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>', iconSize: [14,14], iconAnchor: [7,7], className: "" })
  const center: [number,number] = [(restLat + entregaLat) / 2, (restLng + entregaLng) / 2]
  return (
    <div>
      <div style={{ height: 180 }}>
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[restLat, restLng]} icon={restauranteIcon} />
          <Marker position={[entregaLat, entregaLng]} icon={clienteIcon} />
          {coords.length > 0 && <Polyline positions={coords} color="#F107A3" weight={5} opacity={0.85} />}
        </MapContainer>
      </div>
      {info && (
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100 text-sm">
          <div className="flex items-center gap-1.5"><span className="text-slate-400 text-xs uppercase font-bold">Dist.</span><span className="font-black text-slate-900">{info.dist}</span></div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5"><span className="text-slate-400 text-xs uppercase font-bold">Tiempo</span><span className="font-black text-slate-900">{info.time}</span></div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /><span className="text-xs text-slate-500">Restaurante</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-600" /><span className="text-xs text-slate-500">Cliente</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

function calcDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

interface EstadoPedido {
  deliveryStep: string
  restOk: boolean
  clienteOk: boolean
  intentosFallidos: number
}

function FotoEntregaBtn({ pedidoId, apiUrl, cloudName, uploadPreset }: { pedidoId: string; apiUrl: string; cloudName: string; uploadPreset: string }) {
  const [subiendo, setSubiendo] = useState(false)
  const [fotoOk, setFotoOk] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("upload_preset", uploadPreset)
      const r = await fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (!d.secure_url) throw new Error("Sin URL")
      await fetch(apiUrl + "/api/negocios/pedidos/" + pedidoId + "/foto-entrega", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoUrl: d.secure_url })
      })
      setFotoOk(true)
      toast.success("Foto de entrega guardada")
    } catch { toast.error("Error al subir foto") }
    finally { setSubiendo(false) }
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
      <button onClick={() => inputRef.current?.click()} disabled={subiendo || fotoOk}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all disabled:opacity-50"
        style={{ borderColor: fotoOk ? "#22c55e" : "rgba(241,7,163,0.3)", color: fotoOk ? "#22c55e" : "#F107A3", background: fotoOk ? "#f0fdf4" : "white" }}>
        {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {fotoOk ? "Foto guardada" : subiendo ? "Subiendo..." : "Tomar foto de entrega"}
      </button>
      <span className="text-[10px] text-slate-400 font-medium">Opcional — se borra en 24h</span>
    </div>
  )
}

export default function Dashboard({ repartidor, userId, user }: { repartidor: any; userId: string; user: any }) {
  const { signOut } = useClerk()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ya_voy_dark") === "1")
  const [appConfig, setAppConfig] = useState<Record<string,string>>({})
  const [tab, setTab] = useState<"pedidos" | "activo" | "historial" | "ganancias" | "perfil">("pedidos")
  const [disponibles, setDisponibles] = useState<any[]>([])
  const [pedidosActivos, setPedidosActivos] = useState<any[]>([])
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null)
  const [estadosPedidos, setEstadosPedidos] = useState<Record<string, EstadoPedido>>({})
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [online, setOnline] = useState(() => localStorage.getItem('rep_online') === 'true' || (repartidor?.en_linea ?? false))
  const [radioKm, setRadioKm] = useState(10)
  const [confirmando, setConfirmando] = useState<any>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const pollRef = useRef<any>(null)
  const [esperandoTimers, setEsperandoTimers] = useState<Record<string, number>>({})
  const [showChat, setShowChat] = useState<string | null>(null) // pedidoId
  const [mensajes, setMensajes] = useState<any[]>([])
  const [mensajeTexto, setMensajeTexto] = useState("")
  const [enviandoMensaje, setEnviandoMensaje] = useState(false)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState<Record<string, number>>({})
  const chatPollRef = useRef<any>(null)
  const [showContingencia, setShowContingencia] = useState<{ pedido: any; tipo: 'no_pago' | 'accidente' } | null>(null)
  const [retiros, setRetiros] = useState<any[]>([])
  const [retirosLoading, setRetirosLoading] = useState(false)
  const [solicitandoRetiro, setSolicitandoRetiro] = useState(false)
  const [retiroMinimo, setRetiroMinimo] = useState(50)
  const [contingenciaDesc, setContingenciaDesc] = useState('')
  const [contingenciaFoto, setContingenciaFoto] = useState('')
  const [enviandoContingencia, setEnviandoContingencia] = useState(false)
  const timerRefs = useRef<Record<string, any>>({})

  const getEstado = (id: string): EstadoPedido => {
    if (estadosPedidos[id]) return estadosPedidos[id]
    try {
      const saved = localStorage.getItem(`rep_step_${id}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { deliveryStep: "heading_restaurant", restOk: false, clienteOk: false, intentosFallidos: 0 }
  }

  const setEstado = (id: string, partial: Partial<EstadoPedido>) => {
    setEstadosPedidos(prev => {
      const next = { ...prev, [id]: { ...getEstado(id), ...partial } }
      try { localStorage.setItem(`rep_step_${id}`, JSON.stringify(next[id])) } catch {}
      return next
    })
  }

  const opcionesRestaurante = useMemo(() => {
    if (!pedidoSeleccionado) return []
    const pv = pedidoSeleccionado.palabras_verificacion
    if (pv && pv.restaurante && pv.restaurante.length === 3) return pv.restaurante
    const PALS = ["TIGRE","LUNA","SOL","PUMA","RAYO","NUBE","MAR","RIO","VIENTO","FUEGO","TIERRA","AGUILA","LOBO","OSO","ZORRO","LEON","TORO","COBRA","FLOR","ROCA","PIEDRA","AGUA","BRISA","MONTE","CIELO"]
    const cod = String(pedidoSeleccionado.codigo_restaurante || "")
    if (!cod) return []
    const otros = PALS.filter((w:string) => w !== cod).sort(() => Math.random() - 0.5)
    return [cod, otros[0], otros[1]].sort(() => Math.random() - 0.5)
  }, [pedidoSeleccionado?.id, pedidoSeleccionado?.codigo_restaurante])

  const opcionesCliente = useMemo(() => {
    if (!pedidoSeleccionado) return []
    const pv = pedidoSeleccionado.palabras_verificacion
    if (pv && pv.entrega && pv.entrega.length === 3) return pv.entrega
    const PALS = ["TIGRE","LUNA","SOL","PUMA","RAYO","NUBE","MAR","RIO","VIENTO","FUEGO","TIERRA","AGUILA","LOBO","OSO","ZORRO","LEON","TORO","COBRA","FLOR","ROCA","PIEDRA","AGUA","BRISA","MONTE","CIELO"]
    const cod = pedidoSeleccionado?.codigo_entrega
    if (!cod) return []
    const otros = PALS.filter(w => w !== cod).sort(() => Math.random() - 0.5)
    return [cod, otros[0], otros[1]].sort(() => Math.random() - 0.5)
  }, [pedidoSeleccionado?.id, pedidoSeleccionado?.codigo_entrega])

  useEffect(() => {
    Object.entries(esperandoTimers).forEach(([pedidoId, secs]) => {
      if (secs <= 0 && timerRefs.current[pedidoId]) {
        clearInterval(timerRefs.current[pedidoId])
        delete timerRefs.current[pedidoId]
        fetch(`${API}/api/repartidor/pedidos/${pedidoId}/expirar-espera`, { method: "PATCH" })
          .then(() => {
            setPedidosActivos(prev => prev.filter(p => p.id !== pedidoId))
            setEstadosPedidos(prev => { const n = { ...prev }; delete n[pedidoId]; return n })
            try { localStorage.removeItem(`rep_step_${pedidoId}`) } catch {}
            if (pedidoSeleccionado?.id === pedidoId) setPedidoSeleccionado(null)
            toast.success("Tiempo agotado — entrega completada automaticamente")
            cargarHistorial()
          }).catch(() => {})
      }
    })
  }, [esperandoTimers])

  const iniciarTimerEspera = (pedidoId: string) => {
    setEsperandoTimers(prev => ({ ...prev, [pedidoId]: 600 }))
    timerRefs.current[pedidoId] = setInterval(() => {
      setEsperandoTimers(prev => {
        const curr = prev[pedidoId] ?? 0
        if (curr <= 1) {
          clearInterval(timerRefs.current[pedidoId])
          delete timerRefs.current[pedidoId]
          return { ...prev, [pedidoId]: 0 }
        }
        return { ...prev, [pedidoId]: curr - 1 }
      })
    }, 1000)
  }

  const prevDisponiblesRef = useRef(0)
  const playNuevoPedido = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const note = (freq: number, time: number, dur: number) => {
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = "triangle"; o.frequency.value = freq
        g.gain.setValueAtTime(0, time)
        g.gain.linearRampToValueAtTime(0.3, time + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, time + dur)
        o.start(time); o.stop(time + dur)
      }
      note(523, ctx.currentTime, 0.3)
      note(659, ctx.currentTime + 0.15, 0.3)
      note(784, ctx.currentTime + 0.3, 0.5)
    } catch {}
  }

  const cargarDisponibles = async () => {
    if (!online) { setDisponibles([]); return }
    try {
      const todos = (await getPedidosDisponibles() as any[]) || []
      const filtrados = todos.filter((p: any) => {
        if (!p.lat_restaurante || !userLat || !userLng) return true
        return calcDist(userLat, userLng, p.lat_restaurante, p.lng_restaurante) <= radioKm
      })
      if (filtrados.length > prevDisponiblesRef.current) playNuevoPedido()
      prevDisponiblesRef.current = filtrados.length
      setDisponibles(filtrados)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error al cargar pedidos") }
  }

  const cargarHistorial = async () => {
    try {
      const data = (await getPedidosRepartidor(userId) as any[]) || []
      const activos = data.filter((p: any) => p.status === "en_camino" && p.repartidor_id === userId)
      if (activos.length > 0) {
        setPedidosActivos(activos)
        activos.forEach((p: any) => {
          setEstadosPedidos(prev => {
            if (prev[p.id]) return prev
            return { ...prev, [p.id]: { deliveryStep: "heading_restaurant", restOk: false, clienteOk: false, intentosFallidos: 0 } }
          })
        })
      }
      setHistorial(data)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error al cargar historial") }
  }

  useEffect(() => {
    cargarHistorial()
    navigator.geolocation.getCurrentPosition(pos => {
      setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude)
    }, () => {})
    // Cargar retiro minimo desde config
    fetch(API + "/api/config").then(r => r.json()).then(d => {
      if (d.retiro_minimo) setRetiroMinimo(Number(d.retiro_minimo))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    cargarDisponibles()
    clearInterval(pollRef.current)
    pollRef.current = setInterval(cargarDisponibles, 2000)
    return () => clearInterval(pollRef.current)
  }, [online])

  useEffect(() => { if (tab === "historial") cargarHistorial() }, [tab])
  useEffect(() => { if (tab === "ganancias") { cargarHistorial(); cargarRetiros() } }, [tab])
  useEffect(() => { fetch(import.meta.env.VITE_API_URL + "/api/config").then(r=>r.json()).then(d=>setAppConfig(d)).catch(()=>{}) }, [])

  const ADMOB_BANNER_ID = "ca-app-pub-3849768825456219/4691773250"
  useEffect(() => { AdMob.initialize().catch(() => {}) }, [])
  useEffect(() => {
    if (tab === "historial" && pedidosActivos.length === 0) {
      AdMob.showBanner({ adId: ADMOB_BANNER_ID, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 56 }).catch(() => {})
    } else { AdMob.hideBanner().catch(() => {}) }
    return () => { AdMob.hideBanner().catch(() => {}) }
  }, [tab, pedidosActivos.length])

  const handleToggleOnline = async () => {
    try {
      await toggleStatusRepartidor(userId, !online)
      setOnline(!online)
      localStorage.setItem('rep_online', String(!online))
      toast.success(!online ? "Ahora estas en linea" : "Ahora estas desconectado")
    } catch { toast.error("Error al cambiar estado") }
  }

  const handleAceptar = async (pedido: any) => {
    setLoading(true)
    try {
      const updated = await aceptarPedido(pedido.id, userId)
      const pedidoFinal = { ...pedido, ...updated }
      setPedidosActivos(prev => [...prev, pedidoFinal])
      setEstado(pedidoFinal.id, { deliveryStep: "heading_restaurant", restOk: false, clienteOk: false, intentosFallidos: 0 })
      setConfirmando(null)
      setTab("activo")
      setPedidoSeleccionado(pedidoFinal)
      toast.success("Pedido aceptado!")
      setDisponibles(prev => prev.filter(p => p.id !== pedido.id))
      // Iniciar update de ubicación cada 5s
      const locIv = setInterval(() => actualizarUbicacion(pedido.id), 5000)
      ;(window as any)[`loc_iv_${pedido.id}`] = locIv
    } catch (e: any) {
      if (e.message?.includes("409") || e.message?.includes("tomado")) {
        toast.error("Este pedido ya fue tomado"); cargarDisponibles()
      } else { toast.error(e.message || "Error") }
    } finally { setLoading(false) }
  }

  const finalizarEntrega = async (pedido: any) => {
    setLoading(true)
    try {
      await actualizarEstadoPedido(pedido.id, "entregado")
      toast.success("Entrega completada!")
      clearInterval((window as any)[`loc_iv_${pedido.id}`])
      setPedidosActivos(prev => prev.filter(p => p.id !== pedido.id))
      setEstadosPedidos(prev => { const n = { ...prev }; delete n[pedido.id]; return n })
      try { localStorage.removeItem(`rep_step_${pedido.id}`) } catch {}
      if (pedidoSeleccionado?.id === pedido.id) setPedidoSeleccionado(null)
      cargarHistorial()
      if (pedidosActivos.length <= 1) {
        setTab("historial")
        clearInterval(pollRef.current)
        pollRef.current = setInterval(cargarDisponibles, 2000)
      }
    } catch (e: any) { toast.error(e.message || "Error") }
    finally { setLoading(false) }
  }

  const handleContingencia = async () => {
    if (!showContingencia) return
    setEnviandoContingencia(true)
    try {
      const endpoint = showContingencia.tipo === 'no_pago' ? 'no-pago' : 'accidente'
      const body: any = { pedidoId: showContingencia.pedido.id, repartidorId: userId, descripcion: contingenciaDesc }
      if (showContingencia.tipo === 'accidente') body.fotoUrl = contingenciaFoto
      const res = await fetch(API + '/api/contingencias/' + endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Error al enviar reporte')
      toast.success(showContingencia.tipo === 'no_pago' ? 'Reporte enviado. El cliente fue bloqueado.' : 'Accidente reportado. Reembolso al cliente procesado.')
      setShowContingencia(null); setContingenciaDesc(''); setContingenciaFoto('')
      setPedidosActivos(prev => prev.filter(p => p.id !== showContingencia.pedido.id))
      cargarHistorial()
    } catch (e: any) { toast.error(e.message) }
    finally { setEnviandoContingencia(false) }
  }

  const abrirChat = async (pedidoId: string) => {
    setShowChat(pedidoId)
    await cargarMensajes(pedidoId)
    chatPollRef.current = setInterval(() => cargarMensajes(pedidoId), 3000)
    // marcar leidos
    fetch(API + "/api/mensajes/" + pedidoId + "/leidos", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lectorTipo: "repartidor" })
    }).catch(() => {})
    setMensajesNoLeidos(prev => ({ ...prev, [pedidoId]: 0 }))
  }

  const cerrarChat = () => {
    setShowChat(null)
    clearInterval(chatPollRef.current)
    setMensajes([])
  }

  const cargarMensajes = async (pedidoId: string) => {
    try {
      const res = await fetch(API + "/api/mensajes/" + pedidoId)
      const data = await res.json()
      if (Array.isArray(data)) {
        setMensajes(data)
        const noLeidos = data.filter((m: any) => m.remitente_tipo === "usuario" && !m.leido).length
        setMensajesNoLeidos(prev => ({ ...prev, [pedidoId]: noLeidos }))
      }
    } catch {}
  }

  const actualizarUbicacion = async (pedidoId: string) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        await fetch(API + "/api/repartidor/" + userId + "/ubicacion", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, pedidoId })
        })
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
      } catch {}
    }, () => {})
  }

  const enviarMensaje = async () => {
    if (!showChat || !mensajeTexto.trim()) return
    setEnviandoMensaje(true)
    try {
      await fetch(API + "/api/mensajes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: showChat, remitenteId: userId, remitenteTipo: "repartidor", texto: mensajeTexto })
      })
      setMensajeTexto("")
      await cargarMensajes(showChat)
    } catch { toast.error("Error al enviar") }
    finally { setEnviandoMensaje(false) }
  }

  const gananciasHoy = historial
    .filter(p => new Date(p.creado_en).toDateString() === new Date().toDateString() && p.status === "entregado")
    .reduce((a, p) => a + Number(p.costo_envio || 0), 0)

  const gananciasMes = historial
    .filter(p => {
      const d = new Date(p.creado_en)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.status === "entregado"
    })
    .reduce((a, p) => a + Number(p.costo_envio || 0), 0)

  const gananciasTotal = historial
    .filter(p => p.status === "entregado")
    .reduce((a, p) => a + Number(p.costo_envio || 0), 0)

  const cargarRetiros = async () => {
    setRetirosLoading(true)
    try {
      const r = await fetch(API + "/api/retiros/repartidor/" + userId)
      const d = await r.json()
      setRetiros(Array.isArray(d) ? d : [])
    } catch {} finally { setRetirosLoading(false) }
  }

  const handleSolicitarRetiro = async () => {
    const retirado = retiros.filter(r => r.status !== "rechazado").reduce((a, r) => a + Number(r.monto), 0)
    const disponible = Math.max(0, gananciasTotal - retirado)
    if (disponible < retiroMinimo) { toast.error("Saldo minimo para retiro: $" + retiroMinimo + " MXN"); return }
    setSolicitandoRetiro(true)
    try {
      const res = await fetch(API + "/api/retiros", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_actor: "repartidor", actor_id: userId, monto: disponible })
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "Error al solicitar retiro"); return }
      toast.success("Solicitud enviada. Ramses la revisara pronto.")
      await cargarRetiros()
    } catch { toast.error("Error de conexion") }
    finally { setSolicitandoRetiro(false) }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <Toaster position="top-center" />
      <div className="sticky top-0 z-40 text-white px-4 py-3 flex items-center justify-between" style={{ background: GRAD }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center">
            {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <User size={20} className="text-white" />}
          </div>
          <div>
            <p className="font-black text-sm">{user?.firstName || "Repartidor"}</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${online ? "bg-green-300" : "bg-white/40"}`} />
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{online ? "En linea" : "Desconectado"}</p>
            </div>
          </div>
        </div>
        <button onClick={handleToggleOnline}
          className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${online ? "bg-white/20 text-white border border-white/30" : "bg-white"}`}
          style={online ? {} : { color: TEAL }}>
          {online ? "DESCONECTAR" : "CONECTAR"}
        </button>
      </div>

      {/* MODAL DETALLE PEDIDO DISPONIBLE */}
      <AnimatePresence>
        {confirmando && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-lg">Detalles del pedido</h3>
                <button onClick={() => setConfirmando(null)} className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              {confirmando.lat_restaurante && confirmando.lat_entrega && (
                <RouteMap restLat={confirmando.lat_restaurante} restLng={confirmando.lng_restaurante}
                  entregaLat={confirmando.lat_entrega} entregaLng={confirmando.lng_entrega} />
              )}
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#FF6B00" }} />
                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Recoger en</p><p className="font-bold text-slate-800">{confirmando.negocio_nombre}</p></div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={12} className="text-purple-500 shrink-0" />
                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Entregar en</p><p className="font-bold text-slate-800">{confirmando.direccion_entrega}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${confirmando.lat_restaurante},${confirmando.lng_restaurante}`} target="_blank"
                    className="flex items-center justify-center gap-2 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 font-bold text-xs">
                    🗺️ Ir al restaurante
                  </a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${confirmando.lat_entrega},${confirmando.lng_entrega}`} target="_blank"
                    className="flex items-center justify-center gap-2 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 font-bold text-xs">
                    🗺️ Ir al cliente
                  </a>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  {(Array.isArray(confirmando.items) ? confirmando.items : []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.cantidad}x {item.nombre}</span>
                      <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900">
                    <span>Total pedido</span><span>${Number(confirmando.total).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div>
                    <p className="text-xs text-green-600 font-bold uppercase">Tu ganancia (envio)</p>
                    <p className="font-black text-2xl text-green-700">${Number(confirmando.costo_envio || 35).toFixed(2)}</p>
                  </div>
                  <TrendingUp size={32} className="text-green-400" />
                </div>
                <button onClick={() => handleAceptar(confirmando)} disabled={loading}
                  className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: GRAD }}>
                  {loading ? <Loader2 className="animate-spin" size={22} /> : <Navigation size={22} />}
                  Aceptar esta ruta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">

          {/* TAB PEDIDOS */}
          {tab === "pedidos" && (
            <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Pedidos disponibles</h2>
                {loading && <Loader2 className="animate-spin" size={18} style={{ color: TEAL }} />}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-3">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 font-bold">Radio:</span>
                <input type="range" min={1} max={30} value={radioKm} onChange={e => setRadioKm(Number(e.target.value))} className="flex-1 accent-pink-500" />
                <span className="font-black text-sm min-w-[40px] text-right" style={{ color: TEAL }}>{radioKm} km</span>
              </div>
              {!online ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4"><Bike size={36} className="text-slate-300" /></div>
                  <p className="font-black text-slate-500 mb-1">Estas desconectado</p>
                  <p className="text-sm text-slate-400 mb-6">Conectate para recibir pedidos</p>
                  <button onClick={handleToggleOnline} className="px-8 py-3 rounded-2xl text-white font-black" style={{ background: GRAD }}>Conectarme</button>
                </div>
              ) : disponibles.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4"><Clock size={36} className="text-slate-300" /></div>
                  <p className="font-medium text-slate-400">Esperando pedidos...</p>
                  <p className="text-xs text-slate-300 mt-1">Se actualizan cada 2 segundos</p>
                </div>
              ) : disponibles.map(p => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: TEAL }}>Nuevo pedido</p>
                      <h3 className="font-black text-slate-900">{p.negocio_nombre || "Restaurante"}</h3>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg" style={{ color: TEAL }}>${Number(p.costo_envio || 35).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Ganancia</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: TEAL }} />
                      <span className="truncate">{p.negocio_direccion || "Restaurante"}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200 ml-1" />
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={12} className="text-orange-400 shrink-0" />
                      <span className="truncate">{p.direccion_entrega || "Cliente"}</span>
                    </div>
                  </div>
                  <button onClick={() => setConfirmando(p)} disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: GRAD }}>
                    Ver detalles <ChevronRight size={18} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* TAB ACTIVO */}
          {tab === "activo" && (
            <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {pedidosActivos.length === 0 ? (
                <div className="p-4 text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4"><Package size={36} className="text-slate-300" /></div>
                  <p className="font-black text-slate-500 mb-1">Sin entregas activas</p>
                  <button onClick={() => setTab("pedidos")} className="mt-4 px-8 py-3 rounded-2xl text-white font-black" style={{ background: GRAD }}>Ver pedidos</button>
                </div>
              ) : !pedidoSeleccionado ? (
                /* LISTA DE PEDIDOS ACTIVOS */
                <div className="p-4 space-y-3">
                  <h2 className="text-xl font-black text-slate-900">Entregas activas <span className="text-base font-bold text-slate-400">({pedidosActivos.length})</span></h2>
                  {pedidosActivos.map(p => {
                    const est = getEstado(p.id)
                    const pasoLabel: Record<string, string> = {
                      heading_restaurant: "Yendo al restaurante",
                      at_restaurant: "En restaurante",
                      heading_client: "Yendo al cliente",
                      at_client: "En punto de entrega",
                    }
                    return (
                      <button key={p.id} onClick={() => setPedidoSeleccionado(p)}
                        className="w-full bg-white rounded-2xl border border-slate-100 p-4 text-left shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-black text-slate-900">{p.negocio_nombre || "Restaurante"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{p.direccion_entrega}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="font-black text-green-600">${Number(p.costo_envio || 35).toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400">ganancia</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold px-3 py-1 rounded-full text-white bg-teal-500">{pasoLabel[est.deliveryStep] || "En progreso"}</span>
                          <ChevronRight size={18} className="text-slate-300" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                /* FLUJO DE ENTREGA DE UN PEDIDO */
                <div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
                    <button onClick={() => setPedidoSeleccionado(null)} className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                      <ChevronLeft size={18} className="text-slate-600" />
                    </button>
                    <div className="flex-1">
                      <p className="font-black text-slate-900 text-sm">{pedidoSeleccionado.negocio_nombre}</p>
                      <p className="text-xs text-slate-500">{pedidoSeleccionado.direccion_entrega}</p>
                    </div>
                    {pedidosActivos.length > 1 && (
                      <span className="text-xs font-black px-2 py-1 rounded-full text-white" style={{ background: GRAD }}>+{pedidosActivos.length - 1} mas</span>
                    )}
                  </div>

                  {(() => {
                    const est = getEstado(pedidoSeleccionado.id)
                    return (
                      <div className="p-4 space-y-4">

                        {/* PASO 1 */}
                        {est.deliveryStep === "heading_restaurant" && (
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
                            <p className="text-sm font-black text-orange-600">Paso 1 - Ir al restaurante</p>
                            {pedidoSeleccionado.lat_restaurante && pedidoSeleccionado.lat_entrega && (
                              <div className="rounded-xl overflow-hidden border border-slate-200">
                                <RouteMap restLat={pedidoSeleccionado.lat_restaurante} restLng={pedidoSeleccionado.lng_restaurante}
                                  entregaLat={pedidoSeleccionado.lat_entrega} entregaLng={pedidoSeleccionado.lng_entrega} />
                              </div>
                            )}
                            {pedidoSeleccionado.lat_restaurante && (
                              <a href={`https://www.google.com/maps/dir/?api=1&destination=${pedidoSeleccionado.lat_restaurante},${pedidoSeleccionado.lng_restaurante}`} target="_blank"
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold text-sm">
                                Navegar al restaurante
                              </a>
                            )}
                            <button onClick={() => setEstado(pedidoSeleccionado.id, { deliveryStep: "at_restaurant" })}
                              className="w-full py-4 rounded-2xl text-white font-black text-base" style={{ background: GRAD }}>
                              ✅ Llegue al restaurante
                            </button>
                          </div>
                        )}

                        {/* PASO 2 */}
                        {est.deliveryStep === "at_restaurant" && (
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
                            <p className="text-sm font-black text-orange-600">Paso 2 - Verificacion con restaurante</p>
                            <p className="text-xs text-slate-500">Muestra tu codigo al restaurante y selecciona el que el confirma</p>
                            {est.intentosFallidos >= 2 ? (
                              <div className="bg-red-100 rounded-xl p-4 text-center">
                                <p className="font-black text-red-600">Cuenta bloqueada 24h</p>
                              </div>
                            ) : opcionesRestaurante.length === 0 ? (
                              <p className="text-xs text-red-400">Error cargando opciones. Recarga la app.</p>
                            ) : opcionesRestaurante.map((op: string) => (
                              <button key={op} onClick={() => {
                                if (op.trim().toUpperCase() === String(pedidoSeleccionado?.codigo_restaurante||"").trim().toUpperCase()) {
                                  setEstado(pedidoSeleccionado.id, { restOk: true, deliveryStep: "heading_client" })
                                  toast.success("Recoleccion verificada")
                                  actualizarEstadoPedido(pedidoSeleccionado.id, "en_camino").catch(()=>{})
                                } else {
                                  const ni = est.intentosFallidos + 1
                                  setEstado(pedidoSeleccionado.id, { intentosFallidos: ni })
                                  if (ni >= 2) {
                                    toast.error("Cuenta bloqueada por intentos incorrectos")
                                    fetch(`${API}/api/repartidor/${userId}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({en_linea:false})})
                                  } else { toast.error(`Incorrecto - ${2-ni} intento(s) restante(s)`) }
                                }
                              }}
                                className="w-full py-3 rounded-xl font-black text-base border-2 border-orange-200 bg-white text-slate-700 hover:border-orange-400 transition-all tracking-widest">
                                {op}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* PASO 3 */}
                        {est.deliveryStep === "heading_client" && (
                          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
                            <p className="text-sm font-black text-purple-600">Paso 3 - En camino al cliente</p>
                            {pedidoSeleccionado.lat_entrega && (
                              <a href={`https://www.google.com/maps/dir/?api=1&destination=${pedidoSeleccionado.lat_entrega},${pedidoSeleccionado.lng_entrega}`} target="_blank"
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold text-sm">
                                Navegar al cliente
                              </a>
                            )}
                            <button onClick={() => setEstado(pedidoSeleccionado.id, { deliveryStep: "at_client" })}
                              className="w-full py-4 rounded-2xl text-white font-black text-base" style={{ background: GRAD }}>
                              ✅ Llegue al punto de entrega
                            </button>
                          </div>
                        )}

                        {/* PASO 4 */}
                        {est.deliveryStep === "at_client" && (
                          <div className="rounded-2xl p-4 border space-y-3" style={{ background: "rgba(241,7,163,0.05)", borderColor: "rgba(241,7,163,0.2)" }}>
                            <p className="text-sm font-black" style={{ color: TEAL }}>Paso 4 - Verificacion con cliente</p>
                            {pedidoSeleccionado?.status !== "esperando_cliente" && (
                              <button onClick={() => {
                                navigator.geolocation.getCurrentPosition(async pos => {
                                  try {
                                    const r = await fetch(`${API}/api/repartidor/pedidos/${pedidoSeleccionado.id}/esperando`,
                                      { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude}) })
                                    const d = await r.json()
                                    if (!r.ok) { toast.error(d.error||"Error"); return }
                                    setPedidosActivos(prev => prev.map(p => p.id === pedidoSeleccionado.id ? {...p, status:"esperando_cliente"} : p))
                                    setPedidoSeleccionado((p:any) => ({...p, status:"esperando_cliente"}))
                                    iniciarTimerEspera(pedidoSeleccionado.id)
                                    toast("Cliente notificado - tienes 10 min")
                                  } catch { toast.error("Error de conexion") }
                                }, () => toast.error("Activa tu GPS"))
                              }} className="w-full py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-bold text-sm flex items-center justify-center gap-2">
                                Cliente no esta - Marcar en espera
                              </button>
                            )}
                            {pedidoSeleccionado?.status === "esperando_cliente" && (
                              <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 text-center">
                                <p className="font-black text-amber-700 text-sm">En espera del cliente</p>
                                {esperandoTimers[pedidoSeleccionado.id] !== undefined && (
                                  <p className="text-amber-600 text-xl font-black mt-1 tabular-nums">
                                    {Math.floor((esperandoTimers[pedidoSeleccionado.id] || 0) / 60)}:{String((esperandoTimers[pedidoSeleccionado.id] || 0) % 60).padStart(2, "0")}
                                  </p>
                                )}
                                <p className="text-xs text-amber-500 mt-1">Si expira, entrega completada automaticamente</p>
                              </div>
                            )}
                            <FotoEntregaBtn pedidoId={pedidoSeleccionado.id} apiUrl={API} cloudName={import.meta.env.VITE_CLOUDINARY_CLOUD_NAME} uploadPreset={import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET} />
                            <p className="text-xs text-slate-500">El cliente te mostrara una palabra — seleccionala aqui</p>
                            {est.intentosFallidos >= 2 ? (
                              <div className="bg-red-100 rounded-xl p-4 text-center"><p className="font-black text-red-600">Cuenta bloqueada 24h</p></div>
                            ) : opcionesCliente.map((op: string) => (
                              <button key={op} onClick={() => {
                                if (op.trim().toUpperCase() === String(pedidoSeleccionado?.codigo_entrega||"").trim().toUpperCase()) {
                                  setEstado(pedidoSeleccionado.id, { clienteOk: true })
                                  toast.success("Entrega verificada")
                                  finalizarEntrega(pedidoSeleccionado)
                                } else {
                                  const ni = est.intentosFallidos + 1
                                  setEstado(pedidoSeleccionado.id, { intentosFallidos: ni })
                                  if (ni >= 2) {
                                    toast.error("Cuenta bloqueada por intentos incorrectos")
                                    fetch(`${API}/api/repartidor/${userId}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({en_linea:false})})
                                  } else { toast.error(`Incorrecto - ${2-ni} intento(s) restante(s)`) }
                                }
                              }}
                                className="w-full py-3 rounded-xl font-black text-base border-2 bg-white text-slate-700 hover:opacity-80 transition-all tracking-widest"
                                style={{ borderColor: "rgba(241,7,163,0.3)" }}>
                                {op}
                              </button>
                            ))}
                          </div>
                        )}

                        {est.restOk && est.clienteOk && (
                          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                            <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                            <p className="font-black text-green-700">Entrega completada</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB HISTORIAL */}
          {tab === "historial" && (
            <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
              <h2 className="text-xl font-black text-slate-900">Historial</h2>
              {historial.filter(p => p.status !== "en_camino").length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin entregas aun</p>
                  <p className="text-xs text-slate-300 mt-2">El historial se elimina automaticamente despues de 90 dias</p>
                </div>
              ) : historial.filter(p => p.status !== "en_camino").map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shrink-0" style={{ background: GRAD }}>🛵</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 truncate">{p.negocio_nombre || "Restaurante"}</p>
                    <p className="text-xs text-slate-500">{new Date(p.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black" style={{ color: TEAL }}>${Number(p.costo_envio || 0).toFixed(2)}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${statusColor[p.status] || "bg-slate-400"}`}>{statusLabel[p.status] || p.status}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* TAB GANANCIAS */}
          {tab === "ganancias" && (
            <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Mis ganancias</h2>

              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
                  <p className="font-black text-lg text-slate-900">${Number(gananciasHoy).toFixed(0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Hoy</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
                  <p className="font-black text-lg text-slate-900">${Number(gananciasMes).toFixed(0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Este mes</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
                  <p className="font-black text-lg text-slate-900">${Number(gananciasTotal).toFixed(0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total</p>
                </div>
              </div>

              {/* Saldo disponible para retiro */}
              {(() => {
                const retirado = retiros.filter(r => r.status !== "rechazado").reduce((a: number, r: any) => a + Number(r.monto), 0)
                const disponible = Math.max(0, gananciasTotal - retirado)
                return (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo disponible</p>
                    <p className="font-black text-4xl mb-1" style={{ color: TEAL }}>${disponible.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mb-4">Minimo para retiro: ${retiroMinimo} MXN</p>
                    {disponible < retiroMinimo ? (
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-sm text-slate-500 font-medium">Necesitas ${(retiroMinimo - disponible).toFixed(2)} MXN mas para solicitar un retiro</p>
                      </div>
                    ) : (
                      <button onClick={handleSolicitarRetiro} disabled={solicitandoRetiro}
                        className="w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ background: GRAD }}>
                        {solicitandoRetiro ? <Loader2 className="animate-spin" size={20} /> : null}
                        Solicitar retiro de ${disponible.toFixed(2)}
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Historial retiros */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Historial de retiros</p>
                {retirosLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin" size={24} style={{ color: TEAL }} /></div>
                ) : retiros.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">Sin retiros aun</p>
                ) : (
                  <div className="space-y-3">
                    {retiros.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">${Number(r.monto).toFixed(2)} MXN</p>
                          <p className="text-xs text-slate-400">{new Date(r.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full text-white ${r.status === "pagado" ? "bg-green-500" : r.status === "rechazado" ? "bg-red-500" : "bg-amber-400"}`}>
                          {r.status === "pagado" ? "Pagado" : r.status === "rechazado" ? "Rechazado" : "Pendiente"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB PERFIL */}
          {tab === "perfil" && (
            <motion.div key="pf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-4" style={{ borderColor: "rgba(0,150,136,0.2)" }}>
                  {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: GRAD }}><User size={36} className="text-white" /></div>}
                </div>
                <p className="font-black text-slate-900 text-xl">{user?.fullName || "Repartidor"}</p>
                <p className="text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p>
                <div className="grid grid-cols-2 gap-3 mt-5 w-full">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="font-black text-xl text-slate-900">{historial.filter(p => p.status === "entregado").length}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Entregas</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="font-black text-xl text-yellow-500">{historial.filter(p => p.status === "entregado").length === 0 ? "⭐ Nuevo" : "⭐ " + (repartidor?.rating ? Number(repartidor.rating).toFixed(1) : "5.0")}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Rating</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="font-black text-xl" style={{ color: TEAL }}>${Number(gananciasHoy).toFixed(0)}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Hoy</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="font-black text-xl text-green-600">${Number(gananciasMes).toFixed(0)}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Este mes</p>
                  </div>
                </div>
              </div>

              {/* VEHICULO */}
              {(repartidor?.vehiculo || repartidor?.placa) && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Vehiculo registrado</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "rgba(123,47,247,0.1)" }}>
                      {repartidor?.vehiculo === "bici" ? "🚲" : repartidor?.vehiculo === "moto" ? "🏍️" : "🚗"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm capitalize">{repartidor?.vehiculo || "—"}</p>
                      <p className="text-xs text-slate-500">Placas: <span className="font-black tracking-widest">{repartidor?.placa || "Sin placas"}</span></p>
                    </div>
                    <div className="ml-auto">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full text-white ${repartidor?.verificado ? "bg-green-500" : "bg-amber-500"}`}>
                        {repartidor?.verificado ? "✓ Verificado" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTOS */}
              {repartidor?.documentos && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Documentos entregados</p>
                  <div className="space-y-2">
                    {[["INE", repartidor.documentos.ine_frente], ["Selfie", repartidor.documentos.selfie], ["Tarjeta circulacion", repartidor.documentos.tarjeta_url]].map(([label, url]) => (
                      <div key={label as string} className="flex items-center justify-between py-1">
                        <span className="text-sm text-slate-600 font-medium">{label as string}</span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${url ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                          {url ? "✓ Entregado" : "Sin documento"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Estado</p>
                  <p className="text-xs text-slate-500">{online ? "Recibiendo pedidos" : "No recibo pedidos"}</p>
                </div>
                <button onClick={handleToggleOnline} className="w-14 h-7 rounded-full relative transition-all" style={{ background: online ? GRAD : "#e2e8f0" }}>
                  <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${online ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 px-4 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(123,47,247,0.1)" }}>
                  <span className="text-lg">🌙</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">Modo oscuro</p>
                  <p className="text-xs text-slate-500">Cambia la apariencia de la app</p>
                </div>
                <button onClick={() => {
                  const next = !darkMode
                  setDarkMode(next)
                  localStorage.setItem("ya_voy_dark", next ? "1" : "0")
                  document.documentElement.classList.toggle("dark", next)
                }} className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? "" : "bg-slate-200"}`}
                  style={darkMode ? { background: GRAD } : {}}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${darkMode ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
              {appConfig.whatsapp && (
                <a href={appConfig.whatsapp} target="_blank" rel="noreferrer"
                  className="w-full py-4 bg-green-50 text-green-700 font-bold rounded-2xl flex items-center justify-center gap-2">
                  💬 Contactar soporte por WhatsApp
                </a>
              )}
              <button onClick={() => signOut()}
                className="w-full py-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-bold hover:bg-slate-50">
                <LogOut size={18} /> Cerrar sesion
              </button>
              <p className="text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">Desarrollado por <span className="text-slate-400">Batalla Group</span></p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL CHAT */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[85] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl flex flex-col" style={{ maxHeight: "80vh" }}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-500" /> Chat con el cliente
                </h3>
                <button onClick={cerrarChat}><X size={22} className="text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {mensajes.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">Sin mensajes aún</p>
                )}
                {mensajes.map(m => (
                  <div key={m.id} className={`flex ${m.remitente_tipo === "repartidor" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm font-medium ${m.remitente_tipo === "repartidor" ? "text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"}`}
                      style={m.remitente_tipo === "repartidor" ? { background: GRAD } : {}}>
                      {m.texto}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100 shrink-0 flex gap-2">
                <input value={mensajeTexto} onChange={e => setMensajeTexto(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarMensaje()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-sm border border-slate-200 outline-none focus:border-purple-400" />
                <button onClick={enviarMensaje} disabled={enviandoMensaje || !mensajeTexto.trim()}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
                  style={{ background: GRAD }}>
                  {enviandoMensaje ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CONTINGENCIA */}
      <AnimatePresence>
        {showContingencia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-lg">
                  {showContingencia.tipo === 'no_pago' ? '⚠️ Cliente no pago' : '🚨 Reportar accidente'}
                </h3>
                <button onClick={() => { setShowContingencia(null); setContingenciaDesc(''); setContingenciaFoto(''); }}>
                  <X size={22} className="text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-500">
                {showContingencia.tipo === 'no_pago'
                  ? 'El cliente sera bloqueado temporalmente y recibiras el pago del envio desde el fondo de recuperacion.'
                  : 'El pedido sera cancelado y el cliente recibira un reembolso desde el fondo de recuperacion.'}
              </p>
              {showContingencia.tipo === 'accidente' && (
                <input value={contingenciaFoto} onChange={e => setContingenciaFoto(e.target.value)}
                  placeholder="URL de foto (opcional)..."
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none" />
              )}
              <textarea value={contingenciaDesc} onChange={e => setContingenciaDesc(e.target.value)}
                placeholder="Describe brevemente lo que paso..."
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none resize-none h-24" />
              <button onClick={handleContingencia} disabled={enviandoContingencia}
                className="w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: showContingencia.tipo === 'no_pago' ? '#f59e0b' : '#ef4444' }}>
                {enviandoContingencia ? <Loader2 className="animate-spin" size={20} /> : null}
                {showContingencia.tipo === 'no_pago' ? 'Confirmar reporte' : 'Reportar accidente'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pt-2 z-40" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex justify-around">
          {[
            { id: "pedidos", label: "Pedidos", icon: Package },
            { id: "activo", label: "Activo", icon: Navigation },
            { id: "historial", label: "Historial", icon: Clock },
            { id: "ganancias", label: "Ganancias", icon: Wallet },
            { id: "perfil", label: "Perfil", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id as any); if (id !== "activo") setPedidoSeleccionado(null) }}
              className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all relative"
              style={{ color: tab === id ? TEAL : "#94a3b8" }}>
              {id === "activo" && pedidosActivos.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white">
                  {pedidosActivos.length}
                </span>
              )}
              <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
              <span className={`text-[9px] font-black uppercase tracking-tight ${tab === id ? "opacity-100" : "opacity-60"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

