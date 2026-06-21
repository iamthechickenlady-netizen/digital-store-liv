import { useState, useEffect } from "react";
import { Transaction, Product } from "../types";
import { CreditCard, AlertTriangle, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { getDirectDriveUrl } from "../lib/drive";

interface SandboxPaymentProps {
  transactionId: string;
  onPaymentSuccess: (txId: string, emailSent: boolean, productUrl: string) => void;
}

export default function SandboxPayment({ transactionId, onPaymentSuccess }: SandboxPaymentProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalMode, setPaypalMode] = useState("sandbox");
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Card details mock inputs
  const [cardNumber] = useState("4242 •••• •••• 4242");
  const [expiry] = useState("12/28");
  const [cvc] = useState("•••");

  useEffect(() => {
    // Find transaction and corresponding product securely via the API
    const fetchCheckoutMeta = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/checkout/details/${transactionId}`);
        const data = await response.json();
        
        if (response.ok && data.transaction && data.product) {
          setTransaction(data.transaction);
          setProduct(data.product);
          if (data.paypalClientId) {
            setPaypalClientId(data.paypalClientId);
          }
          if (data.paypalMode) {
            setPaypalMode(data.paypalMode);
          }
        } else {
          setError(data.error || "Transaction reference not found in store.");
        }
      } catch (err: any) {
        console.error("Error reading sandbox state:", err);
        setError("Unable to read purchase data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchCheckoutMeta();
    }
  }, [transactionId]);

  // Load PayPal SDK script dynamically
  useEffect(() => {
    if (paypalClientId) {
      // Avoid duplicated scripts
      const existingScript = document.getElementById("paypal-sdk-script");
      if (existingScript) {
        setIsScriptLoaded(true);
        return;
      }

      console.log(`Loading PayPal SDK with client-id: ${paypalClientId}, mode: ${paypalMode}`);
      const script = document.createElement("script");
      script.id = "paypal-sdk-script";
      // PayPal environment is controlled by the loaded Client ID.
      // We can append environment parameter for debugging if needed, but client-id dictates the sandbox/production boundary on PayPal.
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=capture`;
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = (err) => {
        console.error("PayPal script loading failed:", err);
        setError("Unable to load PayPal's interactive checkout buttons. Please check your client-id.");
      };
      document.body.appendChild(script);

      return () => {
        // Leave the script loaded to avoid resetting state on fast tab changes
      };
    }
  }, [paypalClientId, paypalMode]);

  // Instantiate PayPal Smart Buttons on element container
  useEffect(() => {
    if (isScriptLoaded && product && transaction && paypalClientId) {
      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = ""; // Clean double render

        // @ts-ignore
        if (window.paypal) {
          // @ts-ignore
          window.paypal.Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal"
            },
            createOrder: (data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    currency_code: product.currency || "USD",
                    value: product.price.toFixed(2)
                  },
                  description: `${product.name} - Pack Download ID: ${transactionId}`
                }]
              });
            },
            onApprove: async (data: any, actions: any) => {
              setProcessing(true);
              setError("");
              try {
                // Settle and verify on our safe express server
                const response = await fetch("/api/checkout/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    transactionId: transactionId,
                    isPayPalSuccess: true,
                    paypalOrderId: data.orderID
                  })
                });

                const resData = await response.json();
                if (response.ok && resData.success) {
                  onPaymentSuccess(
                    transactionId,
                    resData.transaction.emailSent,
                    resData.productDownloadUrl
                  );
                } else {
                  setError(resData.error || "Payment succeeded on PayPal, but delivery failed.");
                }
              } catch (err: any) {
                console.error("PayPal verify error:", err);
                setError("Payment was completed. However, we failed to communicate with the delivery dispatcher: " + err.message);
              } finally {
                setProcessing(false);
              }
            },
            onError: (err: any) => {
              console.error("PayPal Smart Button error:", err);
              setError("PayPal transaction failed or was cancelled. Details: " + (err.message || "Session ended, please try again."));
            }
          }).render("#paypal-button-container");
        }
      }
    }
  }, [isScriptLoaded, product, transaction, paypalClientId]);

  const handleCompletePayment = async () => {
    try {
      setProcessing(true);
      setError("");

      const response = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transactionId,
          isTestSuccess: true
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        // Trigger parent callback
        onPaymentSuccess(
          transactionId,
          resData.transaction.emailSent,
          resData.productDownloadUrl
        );
      } else {
        setError(resData.error || "Simulated authorization failure. Please reload.");
      }
    } catch (err: any) {
      console.error("sandbox processing err:", err);
      setError("Communication failed with delivery server: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/60">Secure Sandboxed Portal Loading...</p>
      </div>
    );
  }

  if (error || !transaction || !product) {
    return (
      <div className="max-w-md mx-auto p-10 bg-white border border-[#E5E2DD] text-center space-y-6">
        <AlertTriangle className="w-12 h-12 text-[#FF5722] mx-auto" />
        <h3 className="text-xl font-bold font-serif italic text-[#1A1A1A]">Sandbox Reference Error</h3>
        <p className="text-xs text-[#1A1A1A]/75 leading-relaxed">{error || "The checkout reference number is expired or invalid."}</p>
        <button
          onClick={() => window.location.href = "/"}
          className="w-full py-3.5 bg-[#4e3629] hover:bg-[#3d271d] text-white text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-start py-4">
      {/* Checkout Sidebar Detail */}
      <div className="md:col-span-5 space-y-6">
        <div className="bg-white border border-[#E5E2DD] p-8 space-y-6">
          <h3 className="font-bold text-sm uppercase tracking-widest text-[#1A1A1A]/40 pb-4 border-b border-[#E5E2DD]">
            Order Invoice Review
          </h3>

          <div className="space-y-6">
            <div className="flex gap-4">
              {product.imageUrl && (
                <img
                  src={getDirectDriveUrl(product.imageUrl)}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover border border-[#E5E2DD] bg-white flex-shrink-0"
                />
              )}
              <div>
                <h4 className="font-bold text-base text-[#1A1A1A] font-serif italic leading-snug">{product.name}</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF5722] mt-1">Instant Graphics Access</p>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-[#E5E2DD] space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#1A1A1A]/60">Subtotal</span>
                <span className="font-medium text-[#1A1A1A]">${product.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1A1A1A]/60">VAT / Delivery processing</span>
                <span className="font-medium text-[#1A1A1A]">$0.00</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#E5E2DD] font-bold text-[#1A1A1A]">
                <span>Total Due</span>
                <span className="font-mono text-base">${product.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#F9F8F6] border border-[#E5E2DD] space-y-1.5 text-xs text-[#1A1A1A]/80">
            <div className="font-bold uppercase tracking-wider text-[10px] text-[#1A1A1A]/50">Fulfillment Details</div>
            <div>Name: <span className="text-black font-semibold">{transaction.customerName}</span></div>
            <div>Email: <span className="text-[#FF5722] font-semibold">{transaction.customerEmail}</span></div>
          </div>
        </div>
      </div>

      {/* Payment Processing Form */}
      <div className="md:col-span-7 bg-white border border-[#E5E2DD] overflow-hidden">
        {/* Banner header to match template */}
        <div className="bg-black text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[#FF5722]" />
            <h3 className="font-black text-xs uppercase tracking-widest">
              {paypalClientId ? "Secure Payment Gateway" : "Test Sandbox Checkout Gateway"}
            </h3>
          </div>
          <span className="bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/30 font-mono text-[9px] px-2.5 py-1 font-bold">
            {paypalClientId ? `PAYPAL ACTIVE (${paypalMode.toUpperCase()})` : "TEST MODE"}
          </span>
        </div>

        <div className="p-8 space-y-8">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold uppercase tracking-wider">
              {error}
            </div>
          )}

          {/* Option A: PayPal payment buttons */}
          {paypalClientId ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-sm text-[#1A1A1A]/85 text-xs font-sans leading-relaxed">
                <p className="font-bold uppercase text-[10px] text-amber-700 tracking-wider mb-0.5">Secure PayPal Checkout</p>
                Click the yellow <strong>PayPal</strong> button below to authorize a direct test transaction of <strong>${product.price.toFixed(2)}</strong>. This will test the live PayPal gateway and instantly execute the automated SMTP email file delivery!
              </div>

              <div className="py-2">
                {isScriptLoaded ? (
                  <div id="paypal-button-container" className="w-full relative z-10" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#F9F8F6] border border-[#E5E2DD] space-y-2">
                    <Loader2 className="w-5 h-5 text-[#FF5722] animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">Loading PayPal buttons...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#F9F8F6] text-[#1A1A1A]/80 font-sans border border-[#E5E2DD] text-xs leading-relaxed">
              <p className="font-bold uppercase tracking-wider text-[10px] text-[#FF5722] mb-1">Interactive PayPal is Unconfigured</p>
              To test real transactions, navigate to <strong>Store Admin &gt; SMTP &amp; API Config</strong> and save your <strong>PayPal Client ID</strong>. In the meantime, you can log transactions instantly using the offline simulator below.
            </div>
          )}

          {/* Option B: Offline Sandbox Backup */}
          <div className={`space-y-5 pt-6 ${paypalClientId ? "border-t border-[#E5E2DD]" : ""}`}>
            {paypalClientId && (
              <h4 className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-widest">
                Developer Tool: Offline Sandbox Bypass
              </h4>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">
                  Synthetic Credit Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={cardNumber}
                    className="w-full pl-12 pr-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] text-[#1A1A1A]/70 font-mono text-sm tracking-widest outline-hidden"
                  />
                  <CreditCard className="absolute left-4 top-3.5 w-4.5 h-4.5 text-[#1A1A1A]/40" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">
                    Valid Thru
                  </label>
                  <input
                    type="text"
                    disabled
                    value={expiry}
                    className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] text-[#1A1A1A]/70 font-mono text-sm outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5">
                    CVV Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={cvc}
                    className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] text-[#1A1A1A]/70 font-mono text-sm outline-hidden"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleCompletePayment}
              disabled={processing}
              className="w-full py-4 px-6 bg-[#4e3629] hover:bg-[#3d271d] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              id="btn-complete-sandbox-payment"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Processing payment session...
                </>
              ) : (
                <>
                  Bypass with Offline Payment (${product.price.toFixed(2)})
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] text-[#1A1A1A]/50 leading-relaxed border-t border-[#E5E2DD] pt-6">
            <ShieldCheck className="w-4.5 h-4.5 text-[#FF5722] flex-shrink-0" />
            <span>SSL Secured Checkout pipeline. Deliveries correspond directly with the SMTP transport mail configs.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
