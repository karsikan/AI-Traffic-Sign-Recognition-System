import { MapPin, Navigation, Compass, Star, Phone } from "lucide-react";

interface NearbyServiceCardProps {
  name: string;
  address: string;
  distance_km: number;
  latitude: number;
  longitude: number;
  rating?: number;
  phone?: string;
  open_now?: boolean;
}

export default function NearbyServiceCard({
  name,
  address,
  distance_km,
  latitude,
  longitude,
  rating,
  phone,
  open_now,
}: NearbyServiceCardProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="card hover:shadow-md transition bg-white dark:bg-asphalt-800 border border-slate-200 dark:border-asphalt-700 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug text-sm">{name}</h4>
          {rating !== undefined && (
            <div className="flex items-center gap-0.5 text-xs text-signal shrink-0 ml-2">
              <Star size={13} className="fill-signal" />
              <span className="font-semibold">{rating}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <MapPin size={11} />
          <span className="line-clamp-1">{address}</span>
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-asphalt-700 flex justify-between items-center">
        <span className="text-xs text-go font-semibold flex items-center gap-1">
          <Compass size={12} />
          {distance_km.toFixed(1)} km away
        </span>
        {open_now !== undefined && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
            open_now ? "bg-go/10 text-go" : "bg-alert/10 text-alert"
          }`}>
            {open_now ? "Open" : "Closed"}
          </span>
        )}
      </div>

      {/* Quick-action shortcuts */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-go hover:bg-go/85 rounded-lg py-2 transition"
          >
            <Phone size={12} /> Call Now
          </a>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-asphalt-700 rounded-lg py-2">
            <Phone size={12} /> No number
          </div>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-signal hover:bg-signal/85 rounded-lg py-2 transition"
        >
          <Navigation size={12} /> Directions
        </a>
      </div>
    </div>
  );
}
