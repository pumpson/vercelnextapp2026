"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Navigation } from 'lucide-react';

// === Type Definitions ===
interface ObjectType {
  id: string;
  icon: string;
  names: string[];
}

interface GeoObject {
  id: string;
  lat: number;
  lng: number;
  typeId: string;
  visits: number;
  lastVisitDate: string;
}

// === Constants ===
const OBJECT_TYPES: ObjectType[] = [
  { id: 'tree', icon: '🌳', names: ['小さな苗木', '立派な木', '世界樹'] },
  { id: 'house', icon: '🏠', names: ['小さな小屋', '立派な家', '大豪邸'] },
  { id: 'statue', icon: '🗽', names: ['石の像', 'ブロンズ像', '黄金の像'] },
  { id: 'flower', icon: '🌷', names: ['一輪の花', '美しい花壇', '天空の庭園'] },
  { id: 'crystal', icon: '💎', names: ['小さな結晶', '輝くクリスタル', '星のコア'] },
];
const SEARCH_RADIUS_M = 50;
const STORAGE_KEY = 'geo_objects_data';

// === Helper Functions ===
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function getObjectType(typeId: string) {
  return OBJECT_TYPES.find(t => t.id === typeId) || OBJECT_TYPES[0];
}

function getObjectName(obj: GeoObject) {
  const typeDef = getObjectType(obj.typeId);
  let nameIndex = 0;
  if (obj.visits >= 5) nameIndex = 1;
  if (obj.visits >= 10) nameIndex = 2;
  return typeDef.names[nameIndex];
}

// === Map Components ===
function MapController({ center, isAutoTracking, onDrag }: { center: L.LatLngExpression | null, isAutoTracking: boolean, onDrag: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (center && isAutoTracking) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, isAutoTracking, map]);

  useEffect(() => {
    map.on('dragstart', onDrag);
    return () => {
      map.off('dragstart', onDrag);
    };
  }, [map, onDrag]);

  return null;
}

// === Main Component ===
export default function GeoCollectorGame() {
  const [objects, setObjects] = useState<GeoObject[]>([]);
  const [currentPos, setCurrentPos] = useState<{lat: number, lng: number} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAutoTracking, setIsAutoTracking] = useState(true);

  // Initialize and load data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setObjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved objects", e);
      }
    }
  }, []);

  // Save data when objects change
  useEffect(() => {
    if (objects.length > 0) { // prevent overwrite with empty on first mount
      localStorage.setItem(STORAGE_KEY, JSON.stringify(objects));
    }
  }, [objects]);

  // Watch position
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      showToast("お使いのブラウザは位置情報に対応していません");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        if(error.code === 1) {
          showToast("位置情報の利用が許可されていません");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const showToast = (msg: string, duration = 3500) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  };

  const handleSearch = () => {
    if (!currentPos) {
      showToast("現在地を取得中です。少しお待ちください。");
      return;
    }

    setIsSearching(true);
    setTimeout(() => {
      performSearchAction();
      setIsSearching(false);
    }, 800);
  };

  const performSearchAction = () => {
    if (!currentPos) return;

    let closestObj: GeoObject | null = null;
    let minDistance = Infinity;

    objects.forEach(obj => {
      const dist = getDistance(currentPos.lat, currentPos.lng, obj.lat, obj.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestObj = obj;
      }
    });

    const today = getTodayString();

    if (closestObj && minDistance <= SEARCH_RADIUS_M) {
      const targetObj = closestObj as GeoObject;
      if (targetObj.lastVisitDate === today) {
        showToast(`「${getObjectName(targetObj)}」は今日は訪問済みです。明日また来ましょう！`);
      } else {
        const updatedObj = { ...targetObj, visits: targetObj.visits + 1, lastVisitDate: today };
        setObjects(prev => prev.map(o => o.id === updatedObj.id ? updatedObj : o));

        let levelUpMsg = "";
        if (updatedObj.visits === 5) levelUpMsg = " (レベル2に成長しました！)";
        if (updatedObj.visits === 10) levelUpMsg = " (レベルMAXに成長しました！)";
        showToast(`✨「${getObjectName(updatedObj)}」に訪問しました！${levelUpMsg}`);
      }
    } else {
      const offsetLat = (Math.random() - 0.5) * 0.0002;
      const offsetLng = (Math.random() - 0.5) * 0.0002;
      const randomType = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];

      const newObj: GeoObject = {
        id: Date.now().toString(),
        lat: currentPos.lat + offsetLat,
        lng: currentPos.lng + offsetLng,
        typeId: randomType.id,
        visits: 1,
        lastVisitDate: today
      };

      setObjects(prev => [...prev, newObj]);
      showToast(`🎉 新しい「${getObjectName(newObj)}」を設置しました！`);
    }
  };

  const mapCenter: L.LatLngExpression = currentPos ? [currentPos.lat, currentPos.lng] : [35.6812, 139.7671];

  // Creates custom DivIcons
  const createUserIcon = () => {
    return L.divIcon({
      html: `<div style="display:flex;justify-content:center;align-items:center;background:rgba(59,130,246,0.5);border:2px solid #2563eb;border-radius:50%;font-size:18px;width:40px;height:40px;">🚶</div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  const createObjectIcon = (obj: GeoObject) => {
    const typeDef = getObjectType(obj.typeId);
    let bgStyle = 'background: rgba(255, 255, 255, 0.9);';
    if (obj.visits >= 5) bgStyle = 'background: rgba(255, 223, 186, 0.9); border: 2px solid #f97316;';
    if (obj.visits >= 10) bgStyle = 'background: rgba(255, 215, 0, 0.9); border: 3px solid #eab308; box-shadow: 0 0 10px gold;';

    return L.divIcon({
      html: `<div style="display:flex;justify-content:center;align-items:center;border-radius:50%;font-size:20px;width:40px;height:40px;${bgStyle}">${typeDef.icon}</div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  return (
    <div className="relative w-full h-full font-sans select-none">
      <MapContainer
        center={mapCenter}
        zoom={16}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={currentPos ? [currentPos.lat, currentPos.lng] : null} isAutoTracking={isAutoTracking} onDrag={() => setIsAutoTracking(false)} />

        {currentPos && (
          <Marker position={[currentPos.lat, currentPos.lng]} icon={createUserIcon()} zIndexOffset={1000} />
        )}

        {objects.map(obj => (
          <Marker key={obj.id} position={[obj.lat, obj.lng]} icon={createObjectIcon(obj)}>
            <Popup>
              <div className="text-center p-1 min-w-[120px]">
                <div className="text-3xl mb-1">{getObjectType(obj.typeId).icon}</div>
                <div className="font-bold text-gray-800 text-base">{getObjectName(obj)}</div>
                <div className="text-xs text-blue-600 font-bold mt-1">訪問回数: {obj.visits}回</div>
                <div className="text-xs text-gray-500 mt-1">最終訪問: {obj.lastVisitDate}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Stats UI */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg border border-gray-200 z-[1000] flex flex-col items-center">
        <div className="text-xs text-gray-500 font-bold mb-1">コレクション</div>
        <div className="text-2xl font-black text-blue-600 flex items-center gap-1">
          <span>{objects.length}</span>
          <span className="text-sm text-gray-400">個</span>
        </div>
      </div>

      {/* Recenter Button */}
      <button
        onClick={() => setIsAutoTracking(true)}
        className="absolute bottom-28 right-4 bg-white p-3 rounded-full shadow-lg border border-gray-200 z-[1000] text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
      >
        <Navigation size={24} className={isAutoTracking ? "text-blue-500" : "text-gray-500"} />
      </button>

      {/* Action Button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[300px] px-4">
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-full shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {isSearching ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              探索中...
            </>
          ) : (
            <>
              <Search size={24} />
              周囲を探索する
            </>
          )}
        </button>
      </div>

      {/* Toast Notification */}
      <div
        className={`absolute top-20 left-1/2 -translate-x-1/2 z-[1100] w-full max-w-xs transition-all duration-300 pointer-events-none
          ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 hidden'}`}
      >
        <div className="bg-gray-800/90 backdrop-blur text-white text-sm font-medium py-3 px-4 rounded-xl shadow-2xl text-center border border-gray-700">
          {toastMessage}
        </div>
      </div>
    </div>
  );
}
