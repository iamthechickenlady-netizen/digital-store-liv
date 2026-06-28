import { useState, useEffect } from "react";
import { Product } from "./types";
import StoreFront from "./components/StoreFront";
import SandboxPayment from "./components/SandboxPayment";
import CheckoutSuccess from "./components/CheckoutSuccess";
import AdminDashboard from "./components/AdminDashboard";
import { ShieldCheck, Mail, ShoppingBag, LayoutDashboard, Loader2, Sparkles } from "lucide-react";

type RouteView = "home" | "product-checkout" | "test-payment" | "success" | "admin";

export default function App() {
  const [view, setView] = useState<RouteView>("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Route Params
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [activeTransactionId, setActiveTransactionId] = useState<string>("");
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);

  // Router Parser
  const parseRoutes = () => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    if (path === "/admin") {
      setView("admin");
    } else if (path.startsWith("/purchase/") || path.startsWith("/product/")) {
      const parts = path.split("/");
      const id = parts[parts.length - 1];
      if (id) {
        setSelectedProductId(id);
        setView("product-checkout");
      } else {
        setView("home");
      }
    } else if (path === "/test-payment") {
      const tx = searchParams.get("tx");
      if (tx) {
        setActiveTransactionId(tx);
        setView("test-payment");
      } else {
        setView("home");
      }
    } else if (path === "/success") {
      const tx = searchParams.get("tx");
      const session = searchParams.get("session_id");
      if (tx) {
        setActiveTransactionId(tx);
        setStripeSessionId(session);
        setView("success");
      } else {
        setView("home");
      }
    } else {
      setView("home");
    }
  };

  const navigateTo = (newPath: string) => {
    window.history.pushState({}, "", newPath);
    parseRoutes();
  };

  useEffect(() => {
    // Initial Route parsing
    parseRoutes();

    // Listen to back/forward browser buttons
    const handlePopState = () => parseRoutes();
    window.addEventListener("popstate", handlePopState);

    // Load available graphics catalog
    fetchProducts();

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch graphics catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateCheckout = async (productId: string, name: string, email: string) => {
    try {
      setCheckoutLoading(true);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, customerName: name, customerEmail: email })
      });
      const data = await res.json();
      if (res.ok) {
        // Redirect client to checkout url (Stripe or Sandbox Payment)
        if (data.checkoutUrl.startsWith("http")) {
          // External Stripe link redirect
          window.location.href = data.checkoutUrl;
        } else {
          // Internal test payment page redirect
          navigateTo(data.checkoutUrl);
        }
      } else {
        alert(data.error || "Failed to initialize secure checkout session.");
      }
    } catch (error: any) {
      console.error("Checkout submission failed:", error);
      alert("Checkout communication error: " + error.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSandboxPaymentSuccess = (txId: string, emailSent: boolean, productUrl: string) => {
    // Redirect to direct checkout success route
    navigateTo(`/success?tx=${txId}`);
  };

  const currentProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex flex-col justify-between selection:bg-[#e84e89] selection:text-white">
      {/* Top Header Navigation Rail */}
      <header className="sticky top-0 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#eadecc] z-20 transition-all">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <button
            onClick={() => navigateTo("/")}
            id="logo-home-link"
            className="flex items-center gap-3 group cursor-pointer focus:outline-hidden"
          >
            <div className="text-xl font-black tracking-tighter uppercase font-sans">
              RLB<span className="text-[#e84e89]">.</span>Designs
            </div>
            <div className="flex items-center gap-1.5 bg-[#29a5ac]/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-[#29a5ac]">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Digital Store
            </div>
          </button>

          <nav className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest">
            <button
              onClick={() => navigateTo("/")}
              className={`pb-1 transition-all border-b-2 cursor-pointer ${
                view === "home" || view === "product-checkout"
                  ? "border-[#e84e89] text-[#e84e89]"
                  : "border-transparent text-gray-400 hover:text-[#e84e89] hover:border-[#e84e89]/40"
              }`}
            >
              Catalog
            </button>
            {view === "admin" && (
              <button
                onClick={() => navigateTo("/admin")}
                className="pb-1 transition-all border-b-2 cursor-pointer inline-flex items-center gap-1.5 border-[#29a5ac] text-[#29a5ac]"
              >
                <LayoutDashboard className="w-3.5 h-3.5 stroke-[2]" />
                Store Admin
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
            <p className="text-[#1A1A1A]/60 text-xs font-semibold uppercase tracking-widest">Accessing Graphics Secure Vault...</p>
          </div>
        ) : (
          <>
            {view === "home" && (
              <StoreFront
                products={products}
                onInitiateCheckout={handleInitiateCheckout}
                isCheckoutLoading={checkoutLoading}
              />
            )}

            {view === "product-checkout" && currentProduct && (
              <div className="max-w-xl mx-auto">
                <StoreFront
                  products={[currentProduct]}
                  onInitiateCheckout={handleInitiateCheckout}
                  isCheckoutLoading={checkoutLoading}
                />
              </div>
            )}

            {view === "test-payment" && (
              <SandboxPayment
                transactionId={activeTransactionId}
                onPaymentSuccess={handleSandboxPaymentSuccess}
              />
            )}

            {view === "success" && (
              <CheckoutSuccess
                transactionId={activeTransactionId}
                stripeSessionId={stripeSessionId}
                onRestartCatalog={() => navigateTo("/")}
              />
            )}

            {view === "admin" && (
              <AdminDashboard
                products={products}
                onRefreshProducts={fetchProducts}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Branding Bar */}
      <footer className="bg-[#FDFBF7] border-t border-[#eadecc] py-10 text-center text-xs text-[#1A1A1A]/40 font-sans">
        <div className="max-w-6xl mx-auto px-6 space-y-3">
          <div className="flex justify-center items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/70">
            <ShieldCheck className="w-4 h-4 text-[#e84e89]" />
            <span>Secure SSL Integration</span>
          </div>
          <p className="text-[11px] opacity-80">
            &copy; 2026 rlbdesigns.com Digital Store. All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );

}
