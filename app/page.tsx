"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Driver = {
  id: number;
  name: string;
  phone?: string | null;
  email: string;
  status?: string | null;
  user_id?: string | null;
};

type OrderItem = {
  id?: number;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  status: string;
  driver_id: number | null;
  assigned_at: string | null;
  created_at: string;
  items: OrderItem[];
};

export default function DashboardPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAndLoadData();

    const channel = supabase
      .channel("restaurant-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            playBeep();
          }

          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function checkAdminAndLoadData() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    if (data.user.email !== "admin@gustami.it") {
      await supabase.auth.signOut();
      router.push("/login");
      return;
    }

    await Promise.all([loadOrders(), loadDrivers()]);

    setLoading(false);
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Errore caricamento ordini");
      return;
    }

    setOrders((data || []) as Order[]);
  }

  async function loadDrivers() {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      alert("Errore caricamento rider");
      return;
    }

    setDrivers((data || []) as Driver[]);
  }

  async function updateStatus(orderId: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Errore aggiornamento stato");
      return;
    }

    await loadOrders();
  }

  async function assignDriver(orderId: string, driverId: number) {
    const { error } = await supabase
      .from("orders")
      .update({
        driver_id: driverId,
        assigned_at: new Date().toISOString(),
        status: "assegnato al rider",
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Errore assegnazione rider");
      return;
    }

    alert("Rider assegnato correttamente");

    await loadOrders();
  }

  async function deleteOrder(orderId: string) {
    const confirmed = confirm("Vuoi davvero cancellare questo ordine?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Errore cancellazione ordine");
      return;
    }

    await loadOrders();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getDriverName(driverId: number | null) {
    if (!driverId) return "Nessun rider assegnato";

    const driver = drivers.find((driver) => driver.id === driverId);

    if (!driver) return "Rider non trovato";

    return driver.name;
  }

  function statusLabel(status: string) {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === "pending") return "Ordine ricevuto";
    if (normalizedStatus === "accettato") return "Ordine accettato";
    if (normalizedStatus === "assegnato al rider") return "Rider assegnato";
    if (normalizedStatus === "in preparazione") return "In preparazione";
    if (normalizedStatus === "ritirato") return "Ordine ritirato";
    if (normalizedStatus === "in consegna") return "In consegna";
    if (normalizedStatus === "completato") return "Completato";
    if (normalizedStatus === "annullato") return "Annullato";

    return status;
  }

  function statusColor(status: string) {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === "pending") return "text-yellow-400";
    if (normalizedStatus === "accettato") return "text-blue-400";
    if (normalizedStatus === "assegnato al rider") return "text-purple-400";
    if (normalizedStatus === "in preparazione") return "text-orange-400";
    if (normalizedStatus === "ritirato") return "text-cyan-400";
    if (normalizedStatus === "in consegna") return "text-purple-400";
    if (normalizedStatus === "completato") return "text-green-400";
    if (normalizedStatus === "annullato") return "text-red-400";

    return "text-zinc-300";
  }

  function playBeep() {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 900;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.4
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Caricamento dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <header className="mb-10">
        <h1 className="text-5xl md:text-6xl font-bold mb-2">
          Dashboard Ristorante
        </h1>

        <p className="text-zinc-400 mb-6">
          Gestione ordini Gustami Delivery
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-bold"
          >
            Logout Admin
          </button>

          <button
            onClick={playBeep}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl font-bold"
          >
            Test suono
          </button>

          <a
            href="/"
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
          >
            Home cliente
          </a>

          <a
            href="/dashboard/riders"
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
          >
            Dashboard rider
          </a>
        </div>
      </header>

      <section className="mb-10 bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
        <h2 className="text-3xl font-bold mb-4">
          Rider disponibili
        </h2>

        {drivers.length === 0 ? (
          <p className="text-zinc-400">
            Nessun rider presente
          </p>
        ) : (
          <div className="space-y-3">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-3"
              >
                <div>
                  <p className="font-bold">
                    {driver.name}
                  </p>

                  <p className="text-zinc-400 text-sm">
                    {driver.email}
                  </p>

                  {driver.phone && (
                    <p className="text-zinc-500 text-sm">
                      {driver.phone}
                    </p>
                  )}
                </div>

                <span className="text-green-400 font-bold">
                  {driver.status || "offline"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold">
          Ordini
        </h2>

        {orders.length === 0 ? (
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
            <p className="text-zinc-400">
              Nessun ordine presente
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <article
              key={order.id}
              className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold break-all">
                    Ordine #{order.id}
                  </h3>

                  <p className="text-zinc-400 mt-2">
                    Cliente: {order.customer_name || "Cliente"}
                  </p>

                  <p className="text-zinc-500 text-sm">
                    {order.customer_email || "Email non disponibile"}
                  </p>

                  <p className="text-purple-400 mt-3 font-bold">
                    Rider: {getDriverName(order.driver_id)}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="text-3xl font-bold">
                    €{order.total}
                  </p>

                  <p
                    className={`font-bold capitalize ${statusColor(
                      order.status
                    )}`}
                  >
                    {statusLabel(order.status)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {order.items?.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-zinc-300 border-b border-zinc-800 pb-2"
                  >
                    <span>
                      {item.name} x {item.quantity || 1}
                    </span>

                    <span>
                      €{item.price * (item.quantity || 1)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <p className="font-bold mb-2">
                  Assegna rider
                </p>

                {drivers.length === 0 ? (
                  <p className="text-zinc-400">
                    Nessun rider disponibile
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {drivers.map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => assignDriver(order.id, driver.id)}
                        className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-bold"
                      >
                        Assegna {driver.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => updateStatus(order.id, "accettato")}
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl font-bold"
                >
                  Accetta ordine
                </button>

                <button
                  onClick={() => updateStatus(order.id, "in preparazione")}
                  className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-xl font-bold"
                >
                  In preparazione
                </button>

                <button
                  onClick={() => updateStatus(order.id, "in consegna")}
                  className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-bold"
                >
                  In consegna
                </button>

                <button
                  onClick={() => updateStatus(order.id, "completato")}
                  className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-bold"
                >
                  Completato
                </button>

                <button
                  onClick={() => updateStatus(order.id, "annullato")}
                  className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl font-bold"
                >
                  Annulla
                </button>

                <button
                  onClick={() => deleteOrder(order.id)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-bold"
                >
                  Cancella ordine
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}