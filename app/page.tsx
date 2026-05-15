"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Product = {
  id: number;
  name: string;
  price: number;
};

type CartItem = Product & {
  quantity: number;
};

type CurrentOrder = {
  id: string;
  status: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [sendingOrder, setSendingOrder] = useState(false);

  useEffect(() => {
    loadProducts();
    restoreCurrentOrder();

    const productsChannel = supabase
      .channel("products-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, []);

  useEffect(() => {
    if (!currentOrder?.id) return;

    loadCurrentOrder(currentOrder.id);

    const orderChannel = supabase
      .channel(`customer-order-${currentOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${currentOrder.id}`,
        },
        (payload) => {
          const updatedOrder = payload.new as CurrentOrder;

          const nextOrder = {
            id: updatedOrder.id,
            status: updatedOrder.status,
          };

          setCurrentOrder(nextOrder);

          localStorage.setItem(
            "gustami_current_order",
            JSON.stringify(nextOrder)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [currentOrder?.id]);

  async function loadProducts() {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, price")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      alert("Errore caricamento prodotti");
      setLoadingProducts(false);
      return;
    }

    setProducts(data || []);
    setLoadingProducts(false);
  }

  async function loadCurrentOrder(orderId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      const nextOrder = {
        id: data.id,
        status: data.status,
      };

      setCurrentOrder(nextOrder);

      localStorage.setItem(
        "gustami_current_order",
        JSON.stringify(nextOrder)
      );
    }
  }

  function restoreCurrentOrder() {
    const savedOrder = localStorage.getItem("gustami_current_order");

    if (!savedOrder) return;

    try {
      const parsedOrder = JSON.parse(savedOrder) as CurrentOrder;

      if (parsedOrder?.id) {
        setCurrentOrder(parsedOrder);
      }
    } catch {
      localStorage.removeItem("gustami_current_order");
    }
  }

  function addToCart(product: Product) {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
        },
      ]);
    }
  }

  function increaseQuantity(productId: number) {
    setCart(
      cart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseQuantity(productId: number) {
    setCart(
      cart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function clearCurrentOrder() {
    localStorage.removeItem("gustami_current_order");
    setCurrentOrder(null);
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function confirmOrder() {
    if (cart.length === 0) {
      alert("Il carrello è vuoto");
      return;
    }

    if (!customerName.trim()) {
      alert("Inserisci il nome cliente");
      return;
    }

    if (!customerEmail.trim()) {
      alert("Inserisci l'email cliente");
      return;
    }

    setSendingOrder(true);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        items: cart,
        total: total,
        status: "pending",
      })
      .select("id, status")
      .single();

    setSendingOrder(false);

    if (error) {
      console.error(error);
      alert("Errore invio ordine");
      return;
    }

    const nextOrder = {
      id: data.id,
      status: data.status,
    };

    setCurrentOrder(nextOrder);

    localStorage.setItem(
      "gustami_current_order",
      JSON.stringify(nextOrder)
    );

    setCart([]);

    alert("Ordine inviato con successo!");
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

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <header className="mb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-2">
              GUSTAMI DELIVERY
            </h1>

            <p className="text-zinc-400">
              Piattaforma delivery indipendente
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/tracking"
              className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
            >
              Tracking Rider
            </a>

            <a
              href="/login"
              className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
            >
              Admin
            </a>

            <a
              href="/rider-login"
              className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
            >
              Rider
            </a>
          </div>
        </div>
      </header>

      {currentOrder && (
        <section className="mb-10 bg-green-950/40 border border-green-500 p-6 rounded-3xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Stato ordine
              </h2>

              <p
                className={`text-2xl font-bold ${statusColor(
                  currentOrder.status
                )}`}
              >
                {statusLabel(currentOrder.status)}
              </p>

              <p className="text-zinc-400 mt-2 break-all">
                Ordine #{currentOrder.id}
              </p>
            </div>

            <button
              onClick={clearCurrentOrder}
              className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
            >
              Nuovo ordine
            </button>
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-3xl font-bold mb-6">
          Menu
        </h2>

        {loadingProducts ? (
          <div className="bg-zinc-900 p-6 rounded-3xl">
            <p className="text-zinc-400">
              Caricamento prodotti...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-zinc-900 p-6 rounded-3xl">
            <p className="text-zinc-400">
              Nessun prodotto disponibile
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900 p-6 rounded-3xl flex items-center justify-between border border-zinc-800"
              >
                <div>
                  <h3 className="text-3xl font-bold">
                    {product.name}
                  </h3>

                  <p className="text-zinc-400">
                    €{product.price}
                  </p>
                </div>

                <button
                  onClick={() => addToCart(product)}
                  className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-2xl font-bold"
                >
                  Aggiungi
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
        <h2 className="text-3xl font-bold mb-4">
          Carrello
        </h2>

        <div className="grid gap-4 mb-6 md:grid-cols-2">
          <input
            type="text"
            placeholder="Nome cliente"
            className="w-full p-4 rounded-xl bg-black border border-zinc-700 text-white"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />

          <input
            type="email"
            placeholder="Email cliente"
            className="w-full p-4 rounded-xl bg-black border border-zinc-700 text-white"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
          />
        </div>

        {cart.length === 0 ? (
          <p className="text-zinc-400">
            Carrello vuoto
          </p>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-zinc-800 pb-4"
              >
                <div>
                  <p className="font-bold">
                    {item.name}
                  </p>

                  <p className="text-zinc-400">
                    €{item.price} x {item.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => decreaseQuantity(item.id)}
                    className="bg-zinc-700 hover:bg-zinc-600 w-10 h-10 rounded-xl text-xl"
                  >
                    -
                  </button>

                  <span className="text-xl font-bold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => increaseQuantity(item.id)}
                    className="bg-green-500 hover:bg-green-600 w-10 h-10 rounded-xl text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-between text-2xl font-bold">
              <span>Totale</span>
              <span>€{total}</span>
            </div>

            <button
              onClick={confirmOrder}
              disabled={sendingOrder}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 disabled:cursor-not-allowed py-4 rounded-2xl text-xl font-bold"
            >
              {sendingOrder ? "Invio ordine..." : "Conferma Ordine"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}