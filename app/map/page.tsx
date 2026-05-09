"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

import "leaflet/dist/leaflet.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);

export default function MapPage() {
  const [position, setPosition] = useState<[number, number] | null>(
    null
  );

  useEffect(() => {
    navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setPosition([lat, lng]);

        await supabase.from("driver_locations").insert({
          driver_id: 1,
          lat,
          lng,
        });
      },
      (err) => {
        console.error(err);
      },
      {
        enableHighAccuracy: true,
      }
    );
  }, []);

  if (!position) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Caricamento mappa...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <MapContainer
        center={position}
        zoom={15}
        style={{
          height: "100vh",
          width: "100%",
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position} />
      </MapContainer>
    </main>
  );
}
