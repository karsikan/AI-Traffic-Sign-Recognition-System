import { MapPin, Target } from "lucide-react";

interface MapPlace {
  name: string;
  latitude: number;
  longitude: number;
}

interface MapPlaceholderProps {
  latitude: number;
  longitude: number;
  places: MapPlace[];
}

export default function MapPlaceholder({
  latitude,
  longitude,
  places,
}: MapPlaceholderProps) {
  return (
    <div className="card h-[350px] relative overflow-hidden bg-slate-100 dark:bg-asphalt-700/30 border border-slate-200 dark:border-asphalt-700 p-0">
      {/* Grid background simulation */}
      <div className="absolute inset-0 bg-[radial-gradient(#ddd_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] z-0" />
      
      {/* Map center (User position) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-signal/30 rounded-full animate-ping scale-150" />
          <div className="h-4 w-4 bg-signal rounded-full border-2 border-white flex items-center justify-center shadow-lg">
            <Target size={8} className="text-asphalt-900" />
          </div>
        </div>
        <span className="text-[10px] font-bold bg-asphalt-900 text-white px-1.5 py-0.5 rounded shadow mt-1">You</span>
      </div>

      {/* Places mapping (relative coordinates mock) */}
      {places.map((p, idx) => {
        // Calculate offset multiplier
        const latDiff = p.latitude - latitude;
        const lonDiff = p.longitude - longitude;
        
        // Scale differences to fit container bounds (e.g. 5000 units max)
        const scale = 3000; 
        const topPercent = 50 - (latDiff * scale);
        const leftPercent = 50 + (lonDiff * scale);
        
        // Ensure values remain within bounds [10, 90]
        const top = Math.min(Math.max(topPercent, 10), 90);
        const left = Math.min(Math.max(leftPercent, 10), 90);

        return (
          <div
            key={idx}
            className="absolute z-10 flex flex-col items-center"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <MapPin size={20} className="text-go filter drop-shadow-md animate-bounce" />
            <span className="text-[9px] font-bold bg-white dark:bg-asphalt-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-asphalt-700 px-1.5 py-0.5 rounded shadow whitespace-nowrap max-w-[100px] truncate">
              {p.name}
            </span>
          </div>
        );
      })}

      {/* Map interface UI panels overlay */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-asphalt-800/95 border border-slate-200 dark:border-asphalt-700 px-3 py-1.5 rounded-xl text-[10px] text-slate-500 shadow-sm flex items-center gap-2">
        <span className="font-bold text-slate-700 dark:text-slate-200">GPS Status:</span>
        <span className="text-go">● Live Tracking</span>
        <span>Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}</span>
      </div>
    </div>
  );
}
