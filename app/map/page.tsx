"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const Map = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
) as any;

const Tile = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
) as any;

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
) as any;

export default function MapPage() {
  const router = useRouter();

  const [position, setPosition] = useState<[number, number]>([
    45.4642,
    9.19,
  ]);

  useEffect(() => {
    async function checkRiderAndTrack() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/rider-login");
        return;
      }

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
    }

    checkRiderAndTrack();
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute z-[1000] top-6 left-6 bg-black/80 text-white p-4 rounded-2xl">
        <h1 className="text-2xl font-bold">Mappa Rider</h1>
        <p className="text-zinc-400">Posizione condivisa live</p>
      </div>

      <Map
        center={position}
        zoom={15}
        style={{
          height: "100vh",
          width: "100%",
        }}
      >
        <Tile
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position} />
      </Map>
    </main>
  );
}