import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { STATUS_META } from '../statusMeta';

const CLASS = { Pending: 'adm-pin-pending', 'In Progress': 'adm-pin-progress', Resolved: 'adm-pin-resolved' };

function FitToPoints({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [28, 28], maxZoom: 13 });
  }, [map, points]);
  return null;
}

// Complaint pins coloured by status (the same hues as every other chart). Colours come from CSS classes so the
// pins follow the light/dark theme. The table view of the card lists the same points as text.
export default function ComplaintMap({ points, height = 320 }) {
  return (
    <div style={{ height }} aria-label="Map of complaint locations" role="group">
      <MapContainer center={[31.7131, 73.9783]} zoom={9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={points} />
        {points.map((p) => (
          <CircleMarker key={p.id} center={[p.latitude, p.longitude]} radius={7} className={CLASS[p.status]} pathOptions={{ weight: 2 }}>
            <Tooltip>{`${p.shop_name} · ${STATUS_META[p.status] ? p.status : ''}`}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
