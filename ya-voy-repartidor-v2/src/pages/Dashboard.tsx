import { useState, useEffect, useRef } from "react"
import { useClerk } from "@clerk/clerk-react"
import { motion, AnimatePresence } from "motion/react"
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Bike, Navigation, Clock, User, LogOut, MapPin, CheckCircle, Lock, Package, ChevronRight, TrendingUp, Loader2, X } from "lucide-react"
import { Toaster, toast } from "sonner"
import { getPedidosDisponibles, aceptarPedido, actualizarEstadoPedido, getPedidosRepartidor, toggleStatusRepartidor } from "../lib/api"

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

const GRAD = "linear-gradient(135deg, #7B2FF7 0%, #F107A3 50%, #FF6B00 100%)"
const TEAL = "#F107A3"

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
      <div style={{ height: 220 }}>
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[restLat, restLng]} icon={restauranteIcon} />
          <Marker position={[entregaLat, entregaLng]} icon={clienteIcon} />
          {coords.length > 0 && <Polyline positions={coords} color="#F107A3" weight={5} opacity={0.85} />}
        </MapContainer>
      </div>
      {info && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs uppercase font-bold">Dist.</span>
            <span className="font-black text-slate-900">{info.dist}</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs uppercase font-bold">Tiempo</span>
            <span className="font-black text-slate-900">{info.time}</span>
          </div>
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
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function Dashboard({ repartidor, userId, user }: { repartidor: any; userId: string; user: any }) {
  const { signOut } = useClerk()
  const [tab, setTab] = useState<"pedidos" | "activo" | "historial" | "perfil">("pedidos")
  const [disponibles, setDisponibles] = useState<any[]>([])
  const [pedidoActivo, setPedidoActivo] = useState<any>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [online, setOnline] = useState(() => localStorage.getItem('rep_online') === 'true' || (repartidor?.en_linea ?? false))
  const [codRest, setCodRest] = useState("")
  const [radioKm, setRadioKm] = useState(10)
  const [pedidoDetalle, setPedidoDetalle] = useState<any>(null)
  const [confirmando, setConfirmando] = useState<any>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [opcionesCliente, setOpcionesCliente] = useState<string[]>([])
  const [codCliente, setCodCliente] = useState("")
  const [restOk, setRestOk] = useState(false)
  const [clienteOk, setClienteOk] = useState(false)
  const pollRef = useRef<any>(null)

  const cargarDisponibles = async () => {
    if (!online) { setDisponibles([]); return }
    try {
      const todos = (await getPedidosDisponibles() as any[]) || []
      const filtrados = todos.filter((p: any) => {
        if (!p.lat_restaurante || !userLat || !userLng) return true
        return calcDist(userLat, userLng, p.lat_restaurante, p.lng_restaurante) <= radioKm
      })
      setDisponibles(filtrados)
    } catch {}
  }

  const cargarHistorial = async () => {
    try {
      const data = (await getPedidosRepartidor(userId) as any[]) || []
      const activo = data.find((p: any) => p.status === "en_camino" && p.repartidor_id === userId)
      if (activo && !pedidoActivo) { setPedidoActivo(activo); setTab("activo") }
      setHistorial(data)
    } catch {}
  }

  useEffect(() => {
    cargarHistorial()
    navigator.geolocation.getCurrentPosition(pos => {
      setUserLat(pos.coords.latitude)
      setUserLng(pos.coords.longitude)
    }, () => {})
  }, [])
  useEffect(() => {
    cargarDisponibles()
    clearInterval(pollRef.current)
    pollRef.current = setInterval(cargarDisponibles, 2000)
    return () => clearInterval(pollRef.current)
  }, [online])
  useEffect(() => { if (tab === "historial") cargarHistorial() }, [tab])

  const handleToggleOnline = async () => {
    try {
      await toggleStatusRepartidor(userId, !online)
      setOnline(!online)
      localStorage.setItem('rep_online', String(!online))
      toast.success(!online ? "Ahora estás en línea" : "Ahora estás desconectado")
    } catch { toast.error("Error al cambiar estado") }
  }

  const handleAceptar = async (pedido: any) => {
    setLoading(true)
    try {
      await aceptarPedido(pedido.id, userId)
      setPedidoActivo(pedido); setRestOk(false); setClienteOk(false)
      setCodRest(""); setCodCliente(""); setTab("activo")
      // Generar 3 opciones para el codigo del cliente
      if (pedido.codigo_entrega) {
        const PALS = ["TIGRE","LUNA","SOL","PUMA","RAYO","NUBE","MAR","RIO","VIENTO","FUEGO","TIERRA","AGUILA","LOBO","OSO","ZORRO","LEON","TORO","COBRA","FLOR","ROCA","PIEDRA","AGUA","BRISA","MONTE","CIELO"]
        const falsas = PALS.filter((w: string) => w !== pedido.codigo_entrega).sort(() => Math.random()-0.5).slice(0,2)
        setOpcionesCliente([pedido.codigo_entrega, ...falsas].sort(() => Math.random()-0.5))
      }
      toast.success("¡Pedido aceptado!")
      setDisponibles(prev => prev.filter(p => p.id !== pedido.id))
      clearInterval(pollRef.current)
    } catch (e: any) {
      if (e.message?.includes("409") || e.message?.includes("tomado")) {
        toast.error("⚡ Este pedido ya fue tomado por otro repartidor");
        cargarDisponibles();
      } else {
        toast.error(e.message || "Error");
      }
    }
    finally { setLoading(false) }
  }

  const verificarRest = async () => {
    const codigo = (pedidoActivo?.codigo_restaurante || "1234").toUpperCase()
    if (codRest.trim().toUpperCase() === codigo) {
      setRestOk(true); setCodRest(""); toast.success("✅ Recolección verificada")
      try { await actualizarEstadoPedido(pedidoActivo.id, "en_camino") } catch {}
    } else { toast.error("Código incorrecto") }
  }

  const verificarClienteDirecto = (codigo: string) => {
    const correcto = (pedidoActivo?.codigo_entrega || "LUNA").toUpperCase()
    if (codigo.toUpperCase() === correcto) {
      setClienteOk(true); toast.success("✅ Entrega verificada")
    } else { toast.error("Código incorrecto — el cliente dijo otro") }
  }

  const verificarCliente = () => {
    const codigo = (pedidoActivo?.codigo_entrega || "LUNA").toUpperCase()
    if (codCliente.trim().toUpperCase() === codigo) {
      setClienteOk(true); setCodCliente(""); toast.success("✅ Entrega verificada")
    } else { toast.error("Código incorrecto") }
  }

  const finalizarEntrega = async () => {
    if (!restOk || !clienteOk) { toast.error("Completa las verificaciones primero"); return }
    setLoading(true)
    try {
      await actualizarEstadoPedido(pedidoActivo.id, "entregado")
      toast.success("¡Entrega completada! 🎉")
      setPedidoActivo(null); setTab("historial"); cargarHistorial()
      pollRef.current = setInterval(cargarDisponibles, 2000)
    } catch (e: any) { toast.error(e.message || "Error") }
    finally { setLoading(false) }
  }

  const gananciasHoy = historial
    .filter(p => new Date(p.creado_en).toDateString() === new Date().toDateString() && p.status === "entregado")
    .reduce((a, p) => a + (p.comision || 0), 0)

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
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{online ? "En línea" : "Desconectado"}</p>
            </div>
          </div>
        </div>
        <button onClick={handleToggleOnline}
          className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${online ? "bg-white/20 text-white border border-white/30" : "bg-white"}`}
          style={online ? {} : { color: TEAL }}>
          {online ? "DESCONECTAR" : "CONECTAR"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {tab === "pedidos" && (
            <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Pedidos disponibles</h2>
                {loading && <Loader2 className="animate-spin" size={18} style={{ color: TEAL }} />}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-3">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 font-bold">Radio:</span>
                <input type="range" min={1} max={30} value={radioKm}
                  onChange={e => setRadioKm(Number(e.target.value))}
                  className="flex-1 accent-pink-500" />
                <span className="font-black text-sm min-w-[40px] text-right" style={{ color: TEAL }}>{radioKm} km</span>
              </div>
              {!online ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Bike size={36} className="text-slate-300" />
                  </div>
                  <p className="font-black text-slate-500 mb-1">Estás desconectado</p>
                  <p className="text-sm text-slate-400 mb-6">Conéctate para recibir pedidos</p>
                  <button onClick={handleToggleOnline} className="px-8 py-3 rounded-2xl text-white font-black" style={{ background: GRAD }}>Conectarme</button>
                </div>
              ) : disponibles.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Clock size={36} className="text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-400">Esperando pedidos...</p>
                  <p className="text-xs text-slate-300 mt-1">Se actualizan cada 5 segundos</p>
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
                      <p className="font-black text-lg" style={{ color: TEAL }}>${Number(p.comision || 15).toFixed(2)}</p>
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

          {tab === "activo" && (
            <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!pedidoActivo ? (
                <div className="p-4 text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Package size={36} className="text-slate-300" />
                  </div>
                  <p className="font-black text-slate-500 mb-1">Sin entrega activa</p>
                  <button onClick={() => setTab("pedidos")} className="mt-4 px-8 py-3 rounded-2xl text-white font-black" style={{ background: GRAD }}>Ver pedidos</button>
                </div>
              ) : (
                <div>
                  {pedidoActivo.lat_restaurante && pedidoActivo.lat_entrega && (
                    <RouteMap
                      restLat={pedidoActivo.lat_restaurante}
                      restLng={pedidoActivo.lng_restaurante}
                      entregaLat={pedidoActivo.lat_entrega}
                      entregaLng={pedidoActivo.lng_entrega}
                    />
                  )}
                  <div className="p-4 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: TEAL }}>Entrega activa</p>
                      <h3 className="font-black text-slate-900 text-lg">{pedidoActivo.negocio_nombre || "Restaurante"}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <MapPin size={14} className="text-orange-400" />
                        <span>{pedidoActivo.direccion_entrega}</span>
                      </div>
                    </div>

                    {!restOk && (
                      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lock size={16} className="text-orange-500" />
                          <p className="text-sm font-black text-orange-600">Fase 1: Recolección en restaurante</p>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">Pide el código al restaurante al recoger</p>
                        <div className="flex gap-2">
                          <input value={codRest} onChange={e => setCodRest(e.target.value)}
                            placeholder="Código restaurante"
                            className="flex-1 px-3 py-2.5 bg-white border border-orange-200 rounded-xl text-sm outline-none" />
                          <button onClick={verificarRest} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-black text-xs">OK</button>
                        </div>
                      </div>
                    )}

                    {restOk && !clienteOk && (
                      <div className="rounded-2xl p-4 border" style={{ background: "rgba(0,150,136,0.05)", borderColor: "rgba(0,150,136,0.2)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle size={16} style={{ color: TEAL }} />
                          <p className="text-sm font-black" style={{ color: TEAL }}>Recolección ✓ · Fase 2: Entrega al cliente</p>
                        </div>
                        {pedidoActivo?.status !== "esperando_cliente" && (
                          <button onClick={() => {
                            navigator.geolocation.getCurrentPosition(async pos => {
                              try {
                                const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/repartidor/pedidos/${pedidoActivo.id}/esperando`,
                                  { method: "PATCH", headers: {"Content-Type":"application/json"},
                                    body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }) });
                                const d = await r.json();
                                if (!r.ok) { toast.error(d.error || "Debes estar en la ubicación"); return; }
                                setPedidoActivo((p: any) => ({...p, status: "esperando_cliente"}));
                                toast("⏱️ Cliente notificado — 10 min", { duration: 2000 });
                              } catch { toast.error("Error de conexión"); }
                            }, () => toast.error("Activa tu GPS"));
                          }} className="w-full py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-bold text-sm mb-3 flex items-center justify-center gap-2">
                            📍 Cliente no está — Marcar en espera
                          </button>
                        )}
                        {pedidoActivo?.status === "esperando_cliente" && (
                          <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 mb-3 text-center">
                            <p className="font-black text-amber-700 text-sm">⏱️ En espera del cliente</p>
                            <p className="text-xs text-amber-600 mt-0.5">Si no llega en 10 min el pedido se cierra automáticamente</p>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mb-3">Pide el código de confirmación al cliente</p>
                        <div className="flex gap-2">
                          <input value={codCliente} onChange={e => setCodCliente(e.target.value)}
                            placeholder="Código del cliente"
                            className="flex-1 px-3 py-2.5 bg-white border rounded-xl text-sm outline-none"
                            style={{ borderColor: "rgba(0,150,136,0.3)" }} />
                          <button onClick={verificarCliente} className="px-4 py-2.5 text-white rounded-xl font-black text-xs" style={{ background: TEAL }}>OK</button>
                        </div>
                      </div>
                    )}

                    {restOk && clienteOk && (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                        <CheckCircle className="text-green-500" size={24} />
                        <div>
                          <p className="font-black text-green-700 text-sm">Ambas verificaciones completas</p>
                          <p className="text-xs text-green-600">Ya puedes finalizar la entrega</p>
                        </div>
                      </div>
                    )}

                    <button onClick={finalizarEntrega} disabled={loading || !restOk || !clienteOk}
                      className="w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                      style={{ background: GRAD }}>
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                      Finalizar entrega
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === "historial" && (
            <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
              <h2 className="text-xl font-black text-slate-900">Historial</h2>
              {historial.filter(p => p.status !== "en_camino").length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin entregas aún</p>
                </div>
              ) : historial.filter(p => p.status !== "en_camino").map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shrink-0" style={{ background: GRAD }}>🛵</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 truncate">{p.negocio_nombre || "Restaurante"}</p>
                    <p className="text-xs text-slate-500">{new Date(p.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black" style={{ color: TEAL }}>${Number(p.comision || 0).toFixed(2)}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${statusColor[p.status] || "bg-slate-400"}`}>
                      {statusLabel[p.status] || p.status}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "perfil" && (
            <motion.div key="pf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-4" style={{ borderColor: "rgba(0,150,136,0.2)" }}>
                  {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: GRAD }}><User size={36} className="text-white" /></div>}
                </div>
                <p className="font-black text-slate-900 text-xl">{user?.fullName || "Repartidor"}</p>
                <p className="text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p>
                <div className="grid grid-cols-3 gap-3 mt-5 w-full">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="font-black text-xl text-slate-900">{historial.filter(p => p.status === "entregado").length}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Entregas</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="font-black text-xl" style={{ color: TEAL }}>${Number(gananciasHoy).toFixed(0)}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Hoy</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="font-black text-xl text-yellow-500">⭐ 5.0</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Rating</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Estado</p>
                  <p className="text-xs text-slate-500">{online ? "Recibiendo pedidos" : "No recibo pedidos"}</p>
                </div>
                <button onClick={handleToggleOnline} className="w-14 h-7 rounded-full relative transition-all"
                  style={{ background: online ? GRAD : "#e2e8f0" }}>
                  <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${online ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>

              <button onClick={() => signOut()}
                className="w-full py-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-bold hover:bg-slate-50">
                <LogOut size={18} /> Cerrar sesión
              </button>

              <p className="text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
                Desarrollado por <span className="text-slate-400">Batalla Group</span>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 z-40">
        <div className="flex justify-around">
          {[
            { id: "pedidos", label: "Pedidos", icon: Package },
            { id: "activo", label: "Activo", icon: Navigation },
            { id: "historial", label: "Historial", icon: Clock },
            { id: "perfil", label: "Perfil", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all relative"
              style={{ color: tab === id ? TEAL : "#94a3b8" }}>
              {id === "activo" && pedidoActivo && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
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



