import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, MapPin, Search, Loader2, Home, Briefcase, LocateFixed, AlertCircle, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Address } from '../types';

// Fix for default marker icon in Leaflet + Vite
import 'leaflet/dist/leaflet.css';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const PurpleIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #9333ea; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;">
          <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
        </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map center and zoom updates
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Component to handle map clicks
const MapClickHandler = ({ onClick }: { onClick: (latlng: L.LatLng) => void }) => {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    },
  });
  return null;
};

export const AddressEditor = ({ address, onClose, onSave }: { address?: Address | null; onClose: () => void; onSave: (d: any) => void }) => {
  const [search, setSearch] = useState(address?.address || '');
  const [label, setLabel] = useState(address?.label || '');
  const [references, setReferences] = useState(address?.references || '');
  const [type, setType] = useState(address?.type || 'home');
  
  // Structured fields
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [colony, setColony] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapType, setMapType] = useState<'normal' | 'satellite'>('normal');

  const [position, setPosition] = useState<[number, number]>(
    address?.location ? [address.location.lat, address.location.lng] : [19.4326, -99.1332] // CDMX
  );

  // Helper to extract address components from Nominatim
  const extractAddressComponents = (data: any) => {
    const addr = data.address;
    if (!addr) return;

    setStreet(addr.road || addr.pedestrian || addr.suburb || '');
    setNumber(addr.house_number || '');
    setColony(addr.neighbourhood || addr.suburb || addr.city_district || '');
    setCity(addr.city || addr.town || addr.village || '');
    setState(addr.state || '');
    
    // Update the search string with the full formatted address
    setSearch(data.display_name || '');
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsSearching(true);
    setMapError(null);
    try {
      // Adding email parameter for Nominatim as per usage policy
      const email = '2430936@upt.edu.mx';
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&email=${email}`, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (data) {
        extractAddressComponents(data);
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      setMapError('No se pudo obtener la dirección automáticamente. Intenta buscarla manualmente.');
    } finally {
      setIsSearching(false);
    }
  };

  const geocode = async (query: string) => {
    setIsSearching(true);
    setMapError(null);
    try {
      const email = '2430936@upt.edu.mx';
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&email=${email}`, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPos);
        extractAddressComponents(data[0]);
      } else {
        setMapError('No se encontraron resultados para esta búsqueda.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setMapError('Error al buscar la dirección. Verifica tu conexión.');
    } finally {
      setIsSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        reverseGeocode(newPos[0], newPos[1]);
      }, (err) => {
        console.warn('Geolocation error:', err);
      });
    }
  };

  useEffect(() => {
    // Initial load
    if (address?.address && !address.location) {
      geocode(address.address);
    } else if (!address) {
      getCurrentLocation();
    }
    setIsMapLoading(false);
  }, []);

  const handleManualSearch = () => {
    if (search) {
      geocode(search);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSearch();
    }
  };

  const isFormValid = street && colony && city && state && label;

  return (
    <div className="fixed inset-0 z-[130] bg-white flex flex-col animate-in slide-in-from-bottom">
      <div className="relative h-1/3 bg-slate-200 overflow-hidden">
        {isMapLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <Loader2 className="animate-spin text-purple-600" size={32} />
          </div>
        )}
        
        {mapError ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-slate-100">
            <div className="space-y-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-full w-max mx-auto"><AlertCircle size={32}/></div>
              <p className="text-sm font-bold text-slate-500">{mapError}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <MapContainer 
              center={position} 
              zoom={15} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              {mapType === 'normal' ? (
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
              ) : (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                />
              )}
              <MapUpdater center={position} />
              <MapClickHandler onClick={(latlng) => {
                const newPos: [number, number] = [latlng.lat, latlng.lng];
                setPosition(newPos);
                reverseGeocode(newPos[0], newPos[1]);
              }} />
              <Marker 
                position={position} 
                icon={PurpleIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    const newPos: [number, number] = [pos.lat, pos.lng];
                    setPosition(newPos);
                    reverseGeocode(newPos[0], newPos[1]);
                  },
                }}
              />
            </MapContainer>
            
            {/* Minimalist Purple Overlay Filter */}
            <div className="absolute inset-0 pointer-events-none bg-purple-600/5 mix-blend-multiply" />
          </div>
        )}
        
        <button onClick={onClose} className="absolute top-6 left-6 p-3 bg-white rounded-2xl shadow-xl text-slate-800 z-[1000]"><ArrowLeft size={20}/></button>
        
        <div className="absolute top-6 right-6 flex flex-col space-y-3 z-[1000]">
          <button 
            onClick={() => setMapType(prev => prev === 'normal' ? 'satellite' : 'normal')} 
            className={`p-3 rounded-2xl shadow-xl transition-all active:scale-90 ${mapType === 'satellite' ? 'bg-purple-600 text-white' : 'bg-white text-slate-800'}`}
          >
            {mapType === 'normal' ? <Sparkles size={20}/> : <MapPin size={20}/>}
          </button>
        </div>

        {!mapError && !isMapLoading && (
          <div className="absolute bottom-6 right-6 flex flex-col space-y-3 z-[1000]">
            <button onClick={getCurrentLocation} className="p-3 bg-white rounded-2xl shadow-xl text-purple-600 active:scale-90 transition-all"><LocateFixed size={20}/></button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-t-[45px] -mt-10 relative z-20 p-8 space-y-6 overflow-y-auto pb-32">
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">{address ? 'Editar Ubicación' : 'Nueva Ubicación'}</h2>
          
          <div className="space-y-4 bg-slate-50 p-6 rounded-3xl">
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Detalles de la dirección</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Calle</label>
                <input type="text" className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-100" value={street} onChange={e => setStreet(e.target.value)} placeholder="Calle" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Número</label>
                <input type="text" className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-100" value={number} onChange={e => setNumber(e.target.value)} placeholder="Ext/Int" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Colonia / Localidad</label>
              <input type="text" className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-100" value={colony} onChange={e => setColony(e.target.value)} placeholder="Colonia" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Ciudad</label>
                <input type="text" className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-100" value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Estado</label>
                <input type="text" className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-100" value={state} onChange={e => setState(e.target.value)} placeholder="Estado" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre (Ej. Casa)</label>
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={label} onChange={e => setLabel(e.target.value)} placeholder="Nombre" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tipo</label>
              <div className="flex bg-slate-50 p-1 rounded-2xl">
                <button onClick={() => setType('home')} className={`flex-1 py-3 rounded-xl flex justify-center ${type === 'home' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400'}`}><Home size={18}/></button>
                <button onClick={() => setType('work')} className={`flex-1 py-3 rounded-xl flex justify-center ${type === 'work' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400'}`}><Briefcase size={18}/></button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Referencias</label>
            <textarea 
              placeholder="Ej. Casa azul, portón negro..." 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm min-h-[80px] outline-none border-2 border-transparent focus:border-purple-100"
              value={references}
              onChange={e => setReferences(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white border-t border-slate-100 z-30">
        <button 
          onClick={() => {
            const fullAddress = `${street} ${number}, ${colony}, ${city}, ${state}`;
            onSave({ 
              id: address?.id, 
              label, 
              address: fullAddress, 
              references, 
              type, 
              primary: address?.primary || false,
              location: { lat: position[0], lng: position[1] },
              lat: position[0],
              lng: position[1]
            });
          }}
          disabled={!isFormValid}
          className="w-full py-5 bg-purple-600 text-white rounded-[28px] font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-50 active:scale-95 transition-all"
        >
          Guardar Ubicación
        </button>
      </div>
    </div>
  );
};
