import React, { useState } from "react";
import { Product } from "../types";
import { ShoppingCart, ArrowRight, ShieldCheck, Mail, Sparkles, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getDirectDriveUrl } from "../lib/drive";

interface StoreFrontProps {
  products: Product[];
  onInitiateCheckout: (productId: string, name: string, email: string) => Promise<void>;
  isCheckoutLoading: boolean;
}

export default function StoreFront({ products, onInitiateCheckout, isCheckoutLoading }: StoreFrontProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [formError, setFormError] = useState("");

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!buyerName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!buyerEmail.trim() || !/\S+@\S+\.\S+/.test(buyerEmail)) {
      setFormError("Please enter a valid email address for asset delivery.");
      return;
    }

    if (selectedProduct) {
      await onInitiateCheckout(selectedProduct.id, buyerName, buyerEmail);
    }
  };

  return (
    <div className="space-y-16 py-4">
      {/* Editorial Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-6 py-8 border-b border-[#E5E2DD] mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E5E2DD] rounded-full text-[10px] font-bold uppercase tracking-widest text-[#FF5722]">
          <Sparkles className="w-3.5 h-3.5 text-[#FF5722] fill-[#FF5722]/10" />
          Instant Download upon payment success
        </div>
        <h1 className="text-5xl md:text-6xl font-black font-serif italic tracking-tight text-[#1A1A1A] leading-[1.05]">
          RLB Designs Digital products
        </h1>
        <p className="text-base text-[#1A1A1A]/70 font-sans max-w-2xl mx-auto leading-relaxed">
          Explore a premium collection of handcrafted digital designs, custom SVGs, high-quality graphics packages, and creative template resources. Built for easy integration, with automated direct-to-inbox file delivery as soon as your payment succeeds.
        </p>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
        {products.map((product) => (
          <motion.div
            key={product.id}
            layoutId={`card-${product.id}`}
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="group flex flex-col justify-between bg-white border border-[#E5E2DD] overflow-hidden shadow-xs hover:shadow-lg hover:border-[#1A1A1A]/40 transition-all duration-300"
          >
            <div>
              {/* Image Preview Container */}
              <div className="relative aspect-video w-full bg-[#E5E2DD] overflow-hidden border-b border-[#E5E2DD]">
                {product.imageUrl ? (
                  <img
                    src={getDirectDriveUrl(product.imageUrl)}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale-20 group-hover:grayscale-0 transition-all duration-500 group-hover:scale-103"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/30">
                    <ImageIcon className="w-16 h-16 stroke-1" />
                  </div>
                )}
                {/* Float Badge Price */}
                <div className="absolute top-4 right-4 bg-white border border-[#E5E2DD] px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-black">
                  ${product.price.toFixed(2)}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-8 space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#FF5722]">
                  Premium Kit
                </div>
                <h3 className="text-3xl font-black font-serif text-[#1A1A1A] tracking-tight italic group-hover:text-[#FF5722] transition-colors">
                  {product.name}
                </h3>
                <p className="text-[#1A1A1A]/70 text-sm leading-relaxed line-clamp-3">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Actions Footer - Grid line styled */}
            <div className="px-8 pb-8 pt-0">
              <button
                onClick={() => setSelectedProduct(product)}
                id={`btn-purchase-${product.id}`}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-[#4e3629] hover:bg-[#3d271d] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                Proceed to Secure Order
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Editorial Trust Pipeline */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 pt-12 border-t border-[#E5E2DD]">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-[#4e3629] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            01
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-1">
              Secure Payment via paypal
            </div>
            <h4 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">
              Verified PayPal Gateway
            </h4>
            <p className="text-xs text-[#1A1A1A]/70 mt-1 leading-relaxed font-sans">
              Your transactions are fully encrypted and processed securely via PayPal. Check out safely with your PayPal account or dynamic card clearance.
            </p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-[#FF5722] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            02
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#FF5722] mb-1">
              Product delivery: Automated Email
            </div>
            <h4 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">
              Instant Direct Download Links
            </h4>
            <p className="text-xs text-[#1A1A1A]/70 mt-1 leading-relaxed font-sans">
              As soon as payment succeeds, a Custom Email with your purchase information as well as the Custom URL for instant download will land in your inbox shortly.
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg bg-[#F9F8F6] border border-[#E5E2DD] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Box */}
              <div className="flex items-center justify-between p-6 border-b border-[#E5E2DD] bg-[#F9F8F6]">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-widest">
                    SECURE ENGINE CHECKOUT
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1 px-2.5 bg-[#4e3629] hover:bg-[#3d271d] text-white text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                  id="btn-close-modal"
                >
                  Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white">
                {/* Graphic Preview & Price */}
                <div className="flex gap-5 items-start bg-[#F9F8F6] p-5 border border-[#E5E2DD]">
                  {selectedProduct.imageUrl && (
                    <img
                      src={getDirectDriveUrl(selectedProduct.imageUrl)}
                      alt={selectedProduct.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 object-cover border border-[#E5E2DD] flex-shrink-0 bg-white"
                    />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#1A1A1A] text-lg font-serif italic">{selectedProduct.name}</h4>
                    <span className="font-mono text-xl font-black text-[#1A1A1A] block">
                      ${selectedProduct.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#FF5722] font-semibold uppercase tracking-wider block">
                      Direct download via secure email key
                    </span>
                  </div>
                </div>

                {/* Checkout Submission Form */}
                <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={buyerName}
                      disabled={isCheckoutLoading}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E5E2DD] focus:border-black focus:ring-0 focus:outline-hidden font-sans text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 bg-[#F9F8F6] disabled:opacity-50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                      Delivery Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane.doe@example.com"
                      value={buyerEmail}
                      disabled={isCheckoutLoading}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E5E2DD] focus:border-black focus:ring-0 focus:outline-hidden font-sans text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 bg-[#F9F8F6] disabled:opacity-50 transition-colors"
                    />
                    <p className="text-[11px] text-[#1A1A1A]/50 italic leading-relaxed">
                      Files are transferred using high-grade secure links automatically sent post-checkout.
                    </p>
                  </div>

                  {formError && (
                    <div className="p-3 bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20 text-xs font-semibold uppercase tracking-wider">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    id="btn-confirm-checkout"
                    disabled={isCheckoutLoading}
                    className="w-full py-4 px-6 bg-[#4e3629] hover:bg-[#3d271d] text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer mt-4"
                  >
                    {isCheckoutLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating secure session...
                      </>
                    ) : (
                      <>
                        Initiate Secure Checkout
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
