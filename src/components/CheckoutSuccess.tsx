import { useState, useEffect } from "react";
import { Transaction, Product } from "../types";
import { Download, CheckCircle, Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface CheckoutSuccessProps {
  transactionId: string;
  stripeSessionId: string | null;
  onRestartCatalog: () => void;
}

export default function CheckoutSuccess({ transactionId, stripeSessionId, onRestartCatalog }: CheckoutSuccessProps) {
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const runVerification = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId,
            stripeSessionId,
            isTestSuccess: false
          })
        });

        const resData = await response.json();

        if (response.ok && resData.success) {
          setTransaction(resData.transaction);
          setProduct(resData.product);
        } else {
          setError(resData.error || "Payment verification failed. Please contact support.");
        }
      } catch (err: any) {
        console.error("Verification screen error:", err);
        setError("Error contacting checkout fulfillment API: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      runVerification();
    }
  }, [transactionId, stripeSessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/60">Verifying secure credit transaction & dispatching asset email...</p>
      </div>
    );
  }

  if (error || !transaction || !product) {
    return (
      <div className="max-w-md mx-auto p-10 bg-white border border-[#E5E2DD] text-center space-y-6">
        <AlertCircle className="w-12 h-12 text-[#FF5722] mx-auto" />
        <h3 className="text-xl font-bold font-serif italic text-[#1A1A1A]">Fulfillment Error</h3>
        <p className="text-xs text-[#1A1A1A]/75 leading-relaxed">{error || "Could not reconcile order voucher. Please confirm in logs."}</p>
        <button
          onClick={onRestartCatalog}
          className="w-full py-3.5 bg-black hover:bg-[#FF5722] text-white text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-10">
      {/* Visual Success Hero Block */}
      <div className="bg-white border border-[#E5E2DD] p-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 flex items-center justify-center mx-auto text-[#FF5722]">
          <CheckCircle className="w-10 h-10 stroke-[2]" />
        </div>
        <h2 className="text-4xl font-black font-serif italic text-[#1A1A1A] tracking-tight leading-none">
          Purchase Successful
        </h2>
        <p className="text-[#1A1A1A]/70 max-w-md mx-auto text-sm leading-relaxed">
          Thank you for your order, <span className="font-bold text-[#1A1A1A]">{transaction.customerName}</span>. Your high-fidelity vector archives are verified and prepared below.
        </p>

        {/* Email Notification */}
        <div className="mt-8 p-6 text-left bg-[#F9F8F6] border border-[#E5E2DD] flex gap-4 items-start">
          <Mail className="w-5 h-5 text-[#FF5722] mt-0.5 flex-shrink-0" />
          <div className="space-y-1.5 font-sans text-xs">
            <h4 className="font-bold uppercase tracking-wider text-[10px] text-[#1A1A1A]/50">Email Delivery Log</h4>
            <p className="text-[#1A1A1A]/80 leading-normal">
              An automated delivery pipeline package with your unique access tokens has been dispatched to{" "}
              <span className="font-semibold text-[#1A1A1A] underline">{transaction.customerEmail}</span>.
            </p>
            {transaction.emailError ? (
              <span className="inline-block mt-2 text-[10px] font-mono text-[#FF5722] font-semibold bg-[#FF5722]/5 px-2.5 py-1 border border-[#FF5722]/20">
                Notice: Sandbox delivery logged to virtual developer merchant dashboard.
              </span>
            ) : (
              <span className="inline-block mt-2 text-[10px] font-mono text-green-700 font-semibold bg-green-50 px-2.5 py-1 border border-green-200">
                Status: Email pipeline success. Check spam cache if not received within 1 minute.
              </span>
            )}
          </div>
        </div>

        {/* Direct Link (UX Best Practice) */}
        <div className="py-8 border-t border-b border-dashed border-[#E5E2DD] my-8">
          <p className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest mb-4">
            Instant Client-Side download:
          </p>
          <div className="p-6 bg-black text-white flex flex-col sm:flex-row gap-5 items-center justify-between">
            <div className="text-left">
              <h4 className="text-lg font-bold font-serif italic text-white leading-snug">{product.name}</h4>
              <p className="text-[10px] text-[#FF5722] mt-1 font-mono uppercase tracking-widest">Type: 4K HIGH-RES ARCHIVE PACKAGE</p>
            </div>
            <a
              href={product.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-direct-download"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-[#FF5722] hover:text-white text-black text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Assets
            </a>
          </div>
          <p className="text-[11px] text-[#1A1A1A]/50 italic mt-3 leading-normal">
            The secured link and AES download tokens remain active on file servers perpetually.
          </p>
        </div>

        {/* Back action */}
        <button
          onClick={onRestartCatalog}
          className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/60 hover:text-[#FF5722] transition-colors cursor-pointer"
        >
          Return to Shop Catalog
          <ArrowRight className="w-4 h-4 text-[#FF5722]" />
        </button>
      </div>

      {/* Invoice Particulars Card */}
      <div className="bg-white border border-[#E5E2DD] p-8 space-y-6">
        <h4 className="font-bold text-xs uppercase tracking-widest text-[#1A1A1A]/40 border-b border-[#E5E2DD] pb-3">
          Receipt Particulars
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs text-[#1A1A1A]/70">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">Order Reference Hash:</span>
            <span className="font-semibold text-[#1A1A1A]">{transaction.id}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">Fulfillment Timestamp:</span>
            <span className="font-semibold text-[#1A1A1A]">
              {transaction.completedAt ? new Date(transaction.completedAt).toLocaleString() : new Date().toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">Authorization Clearance:</span>
            <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 border border-green-200 inline-block mt-1 uppercase tracking-wider text-[10px]">
              Paid & Dispatched
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">Billing Instrument:</span>
            <span className="font-semibold text-[#1A1A1A]/90 mt-1 uppercase">
              {transaction.paymentMethod === "stripe" ? "Debit/Credit Card (Stripe API)" : "Developer Sandbox Session Token"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
