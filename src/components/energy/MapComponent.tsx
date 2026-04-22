"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Device type
export interface Device {
  id: number;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "offline";
}

interface MapComponentProps {
  devices: Device[];
}

// Custom marker icons
const onlineIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const offlineIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to fit map bounds to markers
function FitBounds({ devices }: { devices: Device[] }) {
  const map = useMap();

  useEffect(() => {
    if (devices.length > 0) {
      const bounds = L.latLngBounds(devices.map((d) => [d.lat, d.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [devices, map]);

  return null;
}

export default function MapComponent({ devices }: MapComponentProps) {
  // Calculate center based on devices
  const center: [number, number] =
    devices.length > 0
      ? [devices[0].lat, devices[0].lng]
      : [13.7563, 100.5018]; // Default to Bangkok

  return (
    <MapContainer
      center={center}
      zoom={6}
      className="w-full h-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <FitBounds devices={devices} />

      {devices.map((device) => (
        <Marker
          key={device.id}
          position={[device.lat, device.lng]}
          icon={device.status === "online" ? onlineIcon : offlineIcon}
        >
          <Popup>
            <div className="text-center">
              <h3 className="font-semibold text-gray-800">{device.name}</h3>
              <p className="text-sm text-gray-600">
                Status:{" "}
                <span
                  className={
                    device.status === "online"
                      ? "text-green-600 font-medium"
                      : "text-gray-500 font-medium"
                  }
                >
                  {device.status === "online" ? "Online" : "Offline"}
                </span>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Status Legend */}
      <div className="leaflet-bottom leaflet-right">
        <div className="leaflet-control bg-white rounded-lg shadow-lg p-4 m-4">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">Status</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Offline</span>
            </div>
          </div>
        </div>
      </div>
    </MapContainer>
  );
}
