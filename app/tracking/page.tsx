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

type DriverLocation = {
  id: number;
  driver_id: number;
  lat: number;
  lng: number;
  updated_at: string;
};

export default function TrackingPage() {
  const [position, setPosition] = useState<[number, number] | null>(
    null
  );

  useEffect(() => {
    loadLastLocation();

    const channel = supabase
      .channel("driver-location-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
        },
        (payload) => {
          const location = payload.new as DriverLocation;

          setPosition([location.lat, location.lng]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadLastLocation() {
    const { data, error } = await supabase
      .from("driver_locations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setPosition([data.lat, data.lng]);
    }
  }

  if (!position) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>In attesa della posizione rider...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="absolute z-[1000] top-6 left-6 bg-black/80 text-white p-4 rounded-2xl">
        <h1 className="text-2xl font-bold">Tracking Rider</h1>
        <p className="text-zinc-400">Posizione aggiornata live</p>
      </div>

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