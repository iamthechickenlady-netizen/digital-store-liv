import React, { useState } from "react";
import { Product } from "../types";
import { ShoppingCart, ArrowRight, ShieldCheck, Mail, Sparkles, Image as ImageIcon, X, Search, Tag, Filter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getDirectDriveUrl } from "../lib/drive";

interface StoreFrontProps {
  products: Product[];
  onInitiateCheckout: (productId: string, name: string, email: string) => Promise<void>;
  isCheckoutLoading: boolean;
}

const getCategoryStyle = (cat?: string) => {
  switch (cat) {
    case "Canva Templates":
      return {
        badge: "bg-[#e84e89]/10 text-[#e84e89] border-[#e84e89]/20",
        pill: "bg-[#e84e89] text-white hover:bg-[#d03d75]",
        border: "border-[#e84e89]",
        text: "text-[#e84e89]",
        glow: "hover:border-[#e84e89] hover:shadow-lg hover:shadow-[#e84e89]/5"
      };
    case "eBooks":
      return {
        badge: "bg-[#f0ab20]/10 text-[#d8930b] border-[#f0ab20]/20",
        pill: "bg-[#f0ab20] text-white hover:bg-[#d8930b]",
        border: "border-[#f0ab20]",
        text: "text-[#f0ab20]",
        glow: "hover:border-[#f0ab20] hover:shadow-lg hover:shadow-[#f0ab20]/5"
      };
    case "Graphic Sets":
      return {
        badge: "bg-[#29a5ac]/10 text-[#1e8187] border-[#29a5ac]/20",
        pill: "bg-[#29a5ac] text-white hover:bg-[#1e8187]",
        border: "border-[#29a5ac]",
        text: "text-[#29a5ac]",
        glow: "hover:border-[#29a5ac] hover:shadow-lg hover:shadow-[#29a5ac]/5"
      };
    case "Procreate Brushes":
      return {
        badge: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        pill: "bg-purple-600 text-white hover:bg-purple-700",
        border: "border-purple-500",
        text: "text-purple-600",
        glow: "hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/5"
      };
    default:
      return {
        badge: "bg-gray-100 text-gray-600 border-gray-200",
        pill: "bg-gray-800 text-white hover:bg-gray-950",
        border: "border-gray-400",
        text: "text-gray-800",
        glow: "hover:border-gray-400 hover:shadow-lg"
      };
  }
};

export default function StoreFront({ products, onInitiateCheckout, isCheckoutLoading }: StoreFrontProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [formError, setFormError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Extract categories present on current active products
  const categoriesInStore = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const presetCategories = ["Canva Templates", "eBooks", "Graphic Sets", "Procreate Brushes"];
  const displayCategories = Array.from(new Set([...presetCategories, ...categoriesInStore]));

  const presetSubs: Record<string, string[]> = {
    "Canva Templates": ["Book Templates", "Birthday Party Invites", "Baby shower", "Wedding Shower", "Thank you Cards"],
    "eBooks": ["Kid's Books", "Teen Books", "Adult stories", "Coloring Books", "Journals", "Cookbooks"],
    "Graphic Sets": ["Animals", "Holiday", "Floral"],
    "Procreate Brushes": ["Brush sets", "single brushes", "Textures"]
  };

  const displaySubcategories = selectedCategory 
    ? Array.from(new Set([
        ...(presetSubs[selectedCategory] || []),
        ...products.filter(p => p.category === selectedCategory && p.subcategory).map(p => p.subcategory as string)
      ]))
    : [];

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

  // Filter products by category, subcategory, and search term
  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || p.subcategory === selectedSubcategory;
    const matchesSearch = !searchQuery.trim() || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  return (
    <div className="space-y-12 py-4">
      {/* Playful & Warm Hero Header */}
      <div className="relative text-center max-w-3xl mx-auto space-y-6 py-10 px-6 rounded-3xl bg-[#fdfaf5] border border-[#eadecc] shadow-xs overflow-hidden">
        {/* Playful Decorative Accents */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#e84e89]/5 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-[#29a5ac]/5 rounded-full blur-xl" />

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#eadecc] rounded-full text-[10px] font-bold uppercase tracking-widest text-[#e84e89]">
          <Sparkles className="w-3.5 h-3.5 text-[#e84e89] fill-[#e84e89]/10" />
          Handcrafted Design Assets for You
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold font-serif italic tracking-tight text-[#1A1A1A] leading-tight">
          RLB Designs <span className="text-[#e84e89] font-sans not-italic">Shop</span>
        </h1>
        
        <p className="text-sm md:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
          手作り, original design downloads, Procreate brushes, and Canva template packs. Pay securely and download instantly directly to your email inbox!
        </p>

        {/* Playful search bar */}
        <div className="max-w-md mx-auto pt-2">
          <div className="relative flex items-center bg-white border-2 border-gray-200 focus-within:border-[#29a5ac] transition-all rounded-full p-1.5 shadow-xs">
            <Search className="w-4 h-4 text-gray-400 ml-3" />
            <input
              type="text"
              placeholder="Search templates, books, sets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1 text-sm bg-transparent border-0 outline-hidden focus:ring-0 placeholder:text-gray-400 font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="p-1 text-gray-400 hover:text-black mr-2 text-xs font-bold font-sans"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER HUB */}
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 px-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Explore Categories</span>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setSelectedCategory("");
              setSelectedSubcategory("");
            }}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
              !selectedCategory
                ? "bg-[#29a5ac] text-white border-[#29a5ac] shadow-md shadow-[#29a5ac]/10 scale-103"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            All Collections
          </button>

          {displayCategories.map((cat) => {
            const hasProducts = products.some(p => p.category === cat);
            // We still show the button so the store is beautifully complete as requested, but we highlight active ones
            const styles = getCategoryStyle(cat);
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubcategory("");
                }}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border relative ${
                  isSelected
                    ? `${styles.pill} border-transparent shadow-md shadow-black/5 scale-103`
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                {cat}
                {hasProducts && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#e84e89] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Subcategories Bar (only shown if a category is selected) */}
        <AnimatePresence>
          {selectedCategory && displaySubcategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap gap-2 p-4 bg-[#fdfaf5] border border-[#eadecc]/60 rounded-2xl"
            >
              <button
                onClick={() => setSelectedSubcategory("")}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  !selectedSubcategory
                    ? "bg-[#29a5ac]/15 text-[#1e8187] border border-[#29a5ac]/35"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                All {selectedCategory}
              </button>

              {displaySubcategories.map((sub) => {
                const isSelected = selectedSubcategory === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubcategory(sub)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-[#29a5ac]/15 text-[#1e8187] border border-[#29a5ac]/35"
                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Catalog Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-16 text-center max-w-md mx-auto bg-[#fdfaf5] border-2 border-dashed border-[#eadecc] rounded-3xl space-y-3">
          <Tag className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-lg text-gray-700">No matching items found</h3>
          <p className="text-xs text-gray-500 font-sans">We couldn't find any creative resources matching your search or filters. Try adjusting your query!</p>
          <button
            onClick={() => {
              setSelectedCategory("");
              setSelectedSubcategory("");
              setSearchQuery("");
            }}
            className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full uppercase tracking-wider hover:bg-[#e84e89]"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {filteredProducts.map((product) => {
            const styles = getCategoryStyle(product.category);
            return (
              <motion.div
                key={product.id}
                layoutId={`card-${product.id}`}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 280, damping: 25 }}
                className={`group flex flex-col justify-between bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 ${styles.glow}`}
              >
                <div>
                  {/* Image Preview Container */}
                  <div className="relative aspect-video w-full bg-gray-50 overflow-hidden border-b border-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={getDirectDriveUrl(product.imageUrl)}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-104 transition-all duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-14 h-14 stroke-1" />
                      </div>
                    )}
                    {/* Float Badge Price */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-gray-150 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider shadow-xs">
                      ${product.price.toFixed(2)} USD
                    </div>

                    {/* Category Label Overlay */}
                    {product.category && (
                      <div className="absolute bottom-4 left-4">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-xs ${styles.badge} bg-white`}>
                          {product.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-8 space-y-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 font-mono">
                      <span>•</span>
                      <span>{product.subcategory || "Digital Download"}</span>
                    </div>

                    <h3 className="text-2xl font-extrabold font-serif text-[#1A1A1A] tracking-tight leading-tight group-hover:text-[#e84e89] transition-colors">
                      {product.name}
                    </h3>
                    
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 font-sans">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="px-8 pb-8 pt-0">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setBuyerName("");
                      setBuyerEmail("");
                    }}
                    id={`btn-purchase-${product.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#29a5ac] hover:bg-[#e84e89] text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-200 cursor-pointer shadow-sm shadow-[#29a5ac]/10 hover:shadow-[#e84e89]/10"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Buy Now & Download
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Trust Banner with brand colors */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 pt-10 border-t border-gray-200">
        <div className="flex gap-4 items-start p-5 rounded-2xl bg-[#faf8f5]">
          <div className="w-10 h-10 rounded-full bg-[#29a5ac] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
            ✓
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#29a5ac] mb-0.5">
              Secure payments
            </div>
            <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wider font-sans">
              Verified Checkout Engine
            </h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed font-sans">
              Payment is cleared safely using Stripe or PayPal secure gateways. No sensitive credit card details are ever stored.
            </p>
          </div>
        </div>
        <div className="flex gap-4 items-start p-5 rounded-2xl bg-[#faf8f5]">
          <div className="w-10 h-10 rounded-full bg-[#e84e89] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
            ✦
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#e84e89] mb-0.5">
              Post-payment delivery
            </div>
            <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wider font-sans">
              Instant Download to Email
            </h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed font-sans">
              Your secret download links will be generated automatically and dispatched right to your inbox the moment payment clears.
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
              className="relative w-full max-w-lg bg-[#faf8f5] border border-[#eadecc] rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              {/* Header Box */}
              <div className="flex items-center justify-between p-6 border-b border-[#eadecc] bg-[#fbf9f6]">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-black text-white text-[9px] font-extrabold rounded-full uppercase tracking-widest">
                    SECURE ENGINE CHECKOUT
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 px-3 bg-[#e84e89] hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors cursor-pointer"
                  id="btn-close-modal"
                >
                  Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white font-sans">
                {/* Graphic Preview & Price */}
                <div className="flex gap-4 items-start bg-[#faf8f5] p-5 border border-[#eadecc]/60 rounded-2xl">
                  {selectedProduct.imageUrl && (
                    <img
                      src={getDirectDriveUrl(selectedProduct.imageUrl)}
                      alt={selectedProduct.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-cover border border-[#eadecc] rounded-xl flex-shrink-0 bg-white"
                    />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-gray-800 text-base leading-tight font-serif italic">{selectedProduct.name}</h4>
                    <span className="font-sans text-xl font-extrabold text-[#e84e89] block">
                      ${selectedProduct.price.toFixed(2)} USD
                    </span>
                    {selectedProduct.category && (
                      <span className="inline-block text-[9px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 border border-gray-200">
                        {selectedProduct.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Checkout Submission Form */}
                <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={buyerName}
                      disabled={isCheckoutLoading}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 focus:border-[#29a5ac] focus:ring-0 focus:outline-hidden rounded-xl font-sans text-sm text-gray-800 placeholder:text-gray-300 bg-[#faf8f5] disabled:opacity-50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Delivery Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane.doe@example.com"
                      value={buyerEmail}
                      disabled={isCheckoutLoading}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 focus:border-[#29a5ac] focus:ring-0 focus:outline-hidden rounded-xl font-sans text-sm text-gray-800 placeholder:text-gray-300 bg-[#faf8f5] disabled:opacity-50 transition-colors"
                    />
                    <p className="text-[10px] text-gray-400 italic leading-relaxed">
                      Your high-resolution original asset download link will be automatically generated and dispatched here.
                    </p>
                  </div>

                  {formError && (
                    <div className="p-3 bg-[#e84e89]/10 text-[#e84e89] border border-[#e84e89]/20 text-xs font-semibold rounded-xl uppercase tracking-wider">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    id="btn-confirm-checkout"
                    disabled={isCheckoutLoading}
                    className="w-full py-3.5 px-6 bg-black hover:bg-[#e84e89] text-white text-xs font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer mt-4"
                  >
                    {isCheckoutLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating secure session...
                      </>
                    ) : (
                      <>
                        Proceed to Payment
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
