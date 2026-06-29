import React, { useState, useEffect } from "react";
import { Product, Transaction, StoreSettings } from "../types";

export const PRESET_CATEGORIES: Record<string, string[]> = {
  "Canva Templates": ["Book Templates", "Birthday Party Invites", "Baby shower", "Wedding Shower", "Thank you Cards"],
  "eBooks": ["Kid's Books", "Teen Books", "Adult stories", "Coloring Books", "Journals", "Cookbooks"],
  "Graphic Sets": ["Animals", "Holiday", "Floral"],
  "Procreate Brushes": ["Brush sets", "single brushes", "Textures"]
};

export const PRESET_MICRO_CATEGORIES: Record<string, Record<string, string[]>> = {
  "eBooks": {
    "Coloring Books": ["Adult coloring books", "Children's coloring books", "Holiday coloring books"]
  },
  "Canva Templates": {
    "Book Templates": ["Planners & Trackers", "Recipe Books", "Notebook Layouts"]
  }
};
import { 
  Key, 
  Settings, 
  Settings2, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Mail, 
  Send, 
  Code, 
  Copy, 
  FileText, 
  FileSpreadsheet, 
  DollarSign, 
  RefreshCw, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Eye,
  Lock,
  EyeOff
} from "lucide-react";
import { motion } from "motion/react";
import { getDirectDriveUrl } from "../lib/drive";

interface AdminDashboardProps {
  products: Product[];
  onRefreshProducts: () => void;
}

export default function AdminDashboard({ products, onRefreshProducts }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"products" | "orders" | "settings" | "embed">("products");

  // Loaded Settings
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: "My Graphic Pack Store",
    adminPasscode: "admin123",
    stripePublishableKey: "",
    stripeSecretKey: "",
    paypalClientId: "",
    paypalMode: "sandbox",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    senderName: "Graphics Store"
  });

  // UI state for item customizers
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product> | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // States for dynamic category/subcategory creation
  const [isCreatingCustomCategory, setIsCreatingCustomCategory] = useState(false);
  const [isCreatingCustomSubcategory, setIsCreatingCustomSubcategory] = useState(false);
  const [isCreatingCustomMicrocategory, setIsCreatingCustomMicrocategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [customMicrocategory, setCustomMicrocategory] = useState("");

  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const allCategories = Array.from(new Set([...Object.keys(PRESET_CATEGORIES), ...existingCategories]));

  const currentCategory = selectedProduct?.category || "";
  const presetSubs = PRESET_CATEGORIES[currentCategory] || [];
  const existingSubs = Array.from(new Set(
    products
      .filter(p => p.category === currentCategory && p.subcategory)
      .map(p => p.subcategory as string)
  ));
  const allSubcategories = Array.from(new Set([...presetSubs, ...existingSubs]));

  const currentSubcategory = selectedProduct?.subcategory || "";
  const presetMicros = PRESET_MICRO_CATEGORIES[currentCategory]?.[currentSubcategory] || [];
  const existingMicros = Array.from(new Set(
    products
      .filter(p => p.category === currentCategory && p.subcategory === currentSubcategory && p.microcategory)
      .map(p => p.microcategory as string)
  ));
  const allMicrocategories = Array.from(new Set([...presetMicros, ...existingMicros]));

  // Test send SMTP state
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  // Embed Selector State
  const [selectedEmbedProduct, setSelectedEmbedProduct] = useState<string>("");
  const [embedStyle, setEmbedStyle] = useState<"dark" | "light" | "minimal">("dark");
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Active review email modal
  const [activeReviewEmail, setActiveReviewEmail] = useState<{ subject: string; body: string; to: string } | null>(null);

  useEffect(() => {
    // Check local session storage for passcode cached sign-in
    const cachedPass = sessionStorage.getItem("admin_passcode");
    if (cachedPass) {
      validatePasscode(cachedPass);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminSettings();
      fetchAdminTransactions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (products.length > 0 && !selectedEmbedProduct) {
      setSelectedEmbedProduct(products[0].id);
    }
  }, [products]);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const validatePasscode = async (typedPass: string) => {
    try {
      setLoading(true);
      setLoginError("");
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: typedPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_passcode", typedPass);
      } else {
        setLoginError(data.error || "Incorrect admin passcode entered.");
        sessionStorage.removeItem("admin_passcode");
      }
    } catch (err: any) {
      setLoginError("Could not compile authentication: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validatePasscode(passcode);
  };

  const fetchAdminSettings = async () => {
    try {
      const activePass = sessionStorage.getItem("admin_passcode");
      const res = await fetch("/api/admin/settings", {
        headers: { "x-admin-passcode": activePass || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("error fetching setting", err);
    }
  };

  const fetchAdminTransactions = async () => {
    try {
      const activePass = sessionStorage.getItem("admin_passcode");
      const res = await fetch("/api/admin/transactions", {
        headers: { "x-admin-passcode": activePass || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("error fetching tx", err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activePass = sessionStorage.getItem("admin_passcode");
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-passcode": activePass || ""
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification("Settings and API credentials updated successfully!");
        // Update session passcode in case passcode changed
        sessionStorage.setItem("admin_passcode", settings.adminPasscode);
      } else {
        showNotification(data.error || "Save settings failed", "error");
      }
    } catch (err: any) {
      showNotification("Communication with Express failed: " + err.message, "error");
    }
  };

  const handleTestMailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) return;
    try {
      setTestingEmail(true);
      const activePass = sessionStorage.getItem("admin_passcode");
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": activePass || ""
        },
        body: JSON.stringify({
          testEmail: testEmailAddress,
          settings: settings
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Success! Test delivery email queued to ${testEmailAddress}`);
        setTestEmailAddress("");
      } else {
        showNotification(data.error || "SMTP send test failed", "error");
      }
    } catch (err: any) {
      showNotification("Error testing email: " + err.message, "error");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const activePass = sessionStorage.getItem("admin_passcode");
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": activePass || ""
        },
        body: JSON.stringify(selectedProduct)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(selectedProduct.id ? "Graphic product updated!" : "New Graphics pack created!");
        setIsEditingProduct(false);
        setSelectedProduct(null);
        onRefreshProducts();
      } else {
        showNotification(data.error || "Save product failed", "error");
      }
    } catch (err: any) {
      showNotification("Product save communication error: " + err.message, "error");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this Graphics Pack? Buyers will no longer be able to check out.")) return;
    try {
      const activePass = sessionStorage.getItem("admin_passcode");
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { "x-admin-passcode": activePass || "" }
      });
      if (res.ok) {
        showNotification("Graphics pack removed from store.");
        onRefreshProducts();
      } else {
        showNotification("Delete operation aborted", "error");
      }
    } catch (error: any) {
      showNotification("Failed to transmit delete signal: " + error.message, "error");
    }
  };

  const getEmbedSnippet = () => {
    if (!selectedEmbedProduct) return "";
    const activeProduct = products.find(p => p.id === selectedEmbedProduct);
    if (!activeProduct) return "";

    const checkoutUrl = `${window.location.origin}/purchase/${activeProduct.id}`;

    // Elegant Button embed using iframe
    if (embedStyle === "minimal") {
      return `<a href="${checkoutUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; background-color: #171717; color: #ffffff; text-decoration: none; border-radius: 8px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">Buy ${activeProduct.name} - $${activeProduct.price.toFixed(2)}</a>`;
    }

    const darkThemeStyle = `
      background-color: #111827; 
      color: #ffffff; 
      border: 1px solid #374151;
    `;
    const lightThemeStyle = `
      background-color: #ffffff; 
      color: #111817; 
      border: 1px solid #e5e7eb;
    `;
    const theme = embedStyle === "dark" ? darkThemeStyle : lightThemeStyle;

    return `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 320px; border-radius: 16px; padding: 20px; box-sizing: border-box; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); ${theme}">
  <img src="${getDirectDriveUrl(activeProduct.imageUrl)}" alt="${activeProduct.name}" style="width: 100%; aspect-ratio: 16/9; object-cover: cover; border-radius: 10px; margin-bottom: 14px;" />
  <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${activeProduct.name}</h4>
  <p style="margin: 0 0 16px 0; font-size: 11px; opacity: 0.7; height: 32px; overflow: hidden; line-height: 1.4;">${activeProduct.description}</p>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px;">
    <span style="font-size: 18px; font-weight: 800; font-family: monospace;">$${activeProduct.price.toFixed(2)}</span>
    <a href="${checkoutUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: ${embedStyle === "dark" ? "#ffffff" : "#111827"}; color: ${embedStyle === "dark" ? "#111827" : "#ffffff"}; font-size: 12px; font-weight: 600; border-radius: 8px; text-decoration: none; transition: transform 0.2s;">Buy Pack</a>
  </div>
</div>
`.trim();
  };

  const copyEmbedSnippet = () => {
    const code = getEmbedSnippet();
    navigator.clipboard.writeText(code);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_passcode");
  };

  const formatReviewEmail = (txn: Transaction) => {
    const matchingProduct = products.find(p => p.id === txn.productId);
    const bodyTemplate = matchingProduct ? matchingProduct.emailBody : "Here is your file download link: {download_link}";
    const subjectTemplate = matchingProduct ? matchingProduct.emailSubject : "Your graphics purchase";

    const subject = subjectTemplate
      .replace(/{customer_name}/g, txn.customerName)
      .replace(/{product_name}/g, txn.productName);

    const body = bodyTemplate
      .replace(/{customer_name}/g, txn.customerName)
      .replace(/{product_name}/g, txn.productName)
      .replace(/{download_link}/g, matchingProduct ? matchingProduct.fileUrl : "https://example.com/download-url");

    setActiveReviewEmail({
      subject,
      body,
      to: txn.customerEmail
    });
  };

  // --- PASSCODE GATE SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white border border-[#E5E2DD] overflow-hidden">
          <div className="bg-black text-white p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-[#FF5722]">
              <Lock className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="font-bold text-2xl font-serif italic text-white leading-none">Merchant Administration Suite</h3>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Configure graphics catalog & SMPT dispatch pipeline</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-8 space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">
                Dashboard Entry Passcode
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? "text" : "password"}
                  required
                  placeholder="Enter passcode (Default: admin123)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 border border-[#E5E2DD] bg-[#F9F8F6] font-sans text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-hidden focus:border-black text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-black cursor-pointer"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20 text-[11px] font-bold uppercase tracking-wider">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-black hover:bg-[#FF5722] text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
            >
              {loading ? "Authenticating Session..." : "Access Control Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header and statistics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white border border-[#E5E2DD] gap-6">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-[#FF5722] bg-[#FF5722]/10 border border-[#FF5722]/20 px-3 py-1 font-mono uppercase tracking-widest block w-fit">
            AUTHENTICATED SECURE SUITE
          </span>
          <h2 className="text-3xl font-black font-serif italic text-[#1A1A1A] leading-none">
            {settings.storeName} Vault Controller
          </h2>
          <p className="text-xs text-[#1A1A1A]/70 max-w-xl font-sans">
            Configure secure payment hooks, preset delivery templates, and generate HTML block embeds.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              fetchAdminTransactions();
              onRefreshProducts();
              showNotification("Store details re-cached.");
            }}
            className="p-3 bg-[#F9F8F6] border border-[#E5E2DD] text-black hover:bg-[#E5E2DD] cursor-pointer transition-colors"
            title="Refresh logs & catalog"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="px-5 py-3 border border-black hover:bg-[#FF5722] hover:border-[#FF5722] hover:text-white text-black text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Floating Alert System */}
      {notification && (
        <div className="fixed bottom-6 right-6 p-4 bg-white border border-[#E5E2DD] text-xs font-semibold z-50 flex items-center gap-2 max-w-sm shadow-md transition-all duration-300">
          <CheckCircle className="w-4 h-4 text-[#FF5722] flex-shrink-0" />
          <span className="text-[#1A1A1A]">{notification.text}</span>
        </div>
      )}

      {/* Grid Stats Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-[#E5E2DD]">
          <span className="text-[#1A1A1A]/50 font-mono text-[9px] font-bold block uppercase tracking-widest mb-2">Graphics Offered</span>
          <span className="text-3xl font-black text-black leading-none font-serif italic">{products.length} kits</span>
        </div>
        <div className="p-6 bg-white border border-[#E5E2DD]">
          <span className="text-[#1A1A1A]/50 font-mono text-[9px] font-bold block uppercase tracking-widest mb-2">Total Sales Record</span>
          <span className="text-3xl font-black text-black leading-none font-serif italic">
            {transactions.filter(t => t.status === "completed").length} orders
          </span>
        </div>
        <div className="p-6 bg-white border border-[#E5E2DD]">
          <span className="text-[#1A1A1A]/50 font-mono text-[9px] font-bold block uppercase tracking-widest mb-2">Revenue Generated</span>
          <span className="text-3xl font-black text-black font-mono leading-none">
            ${transactions.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
          </span>
        </div>
        <div className="p-6 bg-white border border-[#E5E2DD]">
          <span className="text-[#1A1A1A]/50 font-mono text-[9px] font-bold block uppercase tracking-widest mb-2">Gateway Status</span>
          <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider leading-none mt-1 ${settings.stripeSecretKey ? "text-green-600" : "text-[#FF5722]"}`}>
            {settings.stripeSecretKey ? "Active (Live)" : "Sandbox"}
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#E5E2DD] overflow-x-auto gap-8">
        {[
          { id: "products", label: "Graphics Kits Manager", icon: FileText },
          { id: "orders", label: "Delivery Pipeline Logs", icon: Mail },
          { id: "settings", label: "SMTP & API Config", icon: Settings },
          { id: "embed", label: "Google Sites Embed Codes", icon: Code }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsEditingProduct(false);
                setSelectedProduct(null);
              }}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 text-xs font-bold uppercase tracking-widest transition-all focus:outline-hidden whitespace-nowrap cursor-pointer -mb-0.5 ${
                isActive 
                  ? "border-black text-black font-extrabold" 
                  : "border-transparent text-[#1A1A1A]/40 hover:text-black"
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2]" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: Gaphics Pack manager */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {!isEditingProduct ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white px-6 py-4 border border-[#E5E2DD]">
                <span className="text-xs text-[#1A1A1A]/60 font-semibold uppercase tracking-wider">Catalog Configuration Entries</span>
                <button
                  onClick={() => {
                    setSelectedProduct({
                      name: "",
                      description: "",
                      price: 9.99,
                      currency: "USD",
                      imageUrl: "",
                      fileUrl: "",
                      emailSubject: "Your purchase is ready for download!",
                      emailBody: "Hi {customer_name},\n\nThank you for purchasing {product_name}!\n\nHere is your custom product file download url link:\n{download_link}\n\nBest,\nThe Store",
                      category: "",
                      subcategory: "",
                      microcategory: ""
                    });
                    setIsCreatingCustomCategory(false);
                    setIsCreatingCustomSubcategory(false);
                    setIsCreatingCustomMicrocategory(false);
                    setCustomCategory("");
                    setCustomSubcategory("");
                    setCustomMicrocategory("");
                    setIsEditingProduct(true);
                  }}
                  id="btn-add-product"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#e84e89] hover:bg-black text-white text-xs font-bold uppercase tracking-widest cursor-pointer transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  New product
                </button>
              </div>

              {products.length === 0 ? (
                <div className="p-12 text-center text-[#1A1A1A]/40 font-mono border-2 border-dashed border-[#E5E2DD] bg-white text-xs uppercase tracking-wider">
                  No products added yet. Click 'New product' to begin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {products.map((p) => (
                    <div key={p.id} className="bg-white p-6 border border-[#E5E2DD] space-y-4 flex flex-col justify-between hover:border-[#1A1A1A]/40 transition-colors">
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          {p.imageUrl && (
                            <img
                              src={getDirectDriveUrl(p.imageUrl)}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 object-cover border border-[#E5E2DD] bg-[#F9F8F6] flex-shrink-0"
                            />
                          )}
                          <div className="overflow-hidden">
                            <span className="text-[10px] uppercase font-mono tracking-widest font-black text-[#FF5722] block">${p.price.toFixed(2)} USD</span>
                            <h4 className="font-extrabold text-[#1A1A1A] text-base font-serif italic truncate">{p.name}</h4>
                            <p className="text-xs text-[#1A1A1A]/60 line-clamp-1 mt-0.5">{p.description}</p>
                            {(p.category || p.subcategory || p.microcategory) && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {p.category && (
                                  <span className="inline-block text-[9px] bg-[#e84e89]/10 text-[#e84e89] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    {p.category}
                                  </span>
                                )}
                                {p.subcategory && (
                                  <span className="inline-block text-[9px] bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    {p.subcategory}
                                  </span>
                                )}
                                {p.microcategory && (
                                  <span className="inline-block text-[9px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    {p.microcategory}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
 
                        <div className="p-4 bg-[#F9F8F6] border border-[#E5E2DD] font-mono text-[10px] space-y-1.5 block text-[#1A1A1A]/80 overflow-hidden leading-relaxed">
                          <div><span className="text-[#1A1A1A]/40 font-bold uppercase tracking-wider">Secure url:</span> <span className="text-[#1A1A1A] truncate inline-block max-w-[200px]">{p.fileUrl}</span></div>
                          <div><span className="text-[#1A1A1A]/40 font-bold uppercase tracking-wider">Email subject:</span> <span className="text-[#1A1A1A] truncate inline-block max-w-[150px]">{p.emailSubject}</span></div>
                        </div>
                      </div>
 
                      <div className="flex justify-end gap-3 border-t border-[#E5E2DD] pt-4">
                        <button
                          onClick={() => {
                            const isPresetCat = p.category ? Object.keys(PRESET_CATEGORIES).includes(p.category) : false;
                            const isPresetSub = p.category && p.subcategory ? PRESET_CATEGORIES[p.category]?.includes(p.subcategory) : false;
                            const isPresetMicro = p.category && p.subcategory && p.microcategory ? PRESET_MICRO_CATEGORIES[p.category]?.[p.subcategory]?.includes(p.microcategory) : false;

                            setSelectedProduct(p);
                            setIsCreatingCustomCategory(p.category ? !isPresetCat : false);
                            setIsCreatingCustomSubcategory(p.subcategory ? !isPresetSub : false);
                            setIsCreatingCustomMicrocategory(p.microcategory ? !isPresetMicro : false);
                            setCustomCategory(p.category || "");
                            setCustomSubcategory(p.subcategory || "");
                            setCustomMicrocategory(p.microcategory || "");
                            setIsEditingProduct(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-black py-2 px-4 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer uppercase tracking-wider font-bold text-[10px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Properties
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-[#FF5722] py-2 px-4 border border-[#FF5722]/30 hover:bg-[#FF5722]/10 transition-colors cursor-pointer uppercase tracking-wider font-bold text-[10px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Product
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            selectedProduct && (
              <form onSubmit={handleSaveProduct} className="bg-white border border-[#E5E2DD] p-8 space-y-8">
                <div className="pb-4 border-b border-[#E5E2DD] flex items-center justify-between">
                  <h3 className="font-bold text-2xl font-serif italic text-[#1A1A1A] leading-none">
                    {selectedProduct.id ? "Edit Product Properties" : "Provision New Product"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProduct(false);
                      setSelectedProduct(null);
                    }}
                    className="text-xs text-[#1A1A1A]/40 hover:text-black font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-sm">
                  {/* Left col */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Product name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Backyard Buff Orpingtons Icon Set"
                        value={selectedProduct.name || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                        className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Category</label>
                        {isCreatingCustomCategory ? (
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Type custom category name..."
                              value={customCategory}
                              onChange={(e) => {
                                setCustomCategory(e.target.value);
                                setSelectedProduct({ ...selectedProduct, category: e.target.value });
                              }}
                              className="w-full px-3 py-2.5 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingCustomCategory(false);
                                setCustomCategory("");
                                setSelectedProduct({ ...selectedProduct, category: "", subcategory: "", microcategory: "" });
                              }}
                              className="text-[9px] font-bold text-left text-gray-500 hover:text-black uppercase tracking-wider underline cursor-pointer"
                            >
                              Choose Preset
                            </button>
                          </div>
                        ) : (
                          <select
                            value={selectedProduct.category || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new__") {
                                setIsCreatingCustomCategory(true);
                                setCustomCategory("");
                                setSelectedProduct({ ...selectedProduct, category: "", subcategory: "", microcategory: "" });
                              } else {
                                setSelectedProduct({ ...selectedProduct, category: val, subcategory: "", microcategory: "" });
                              }
                            }}
                            className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs h-[46px]"
                          >
                            <option value="">No Category</option>
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__new__" className="text-[#e84e89] font-bold">+ Add Custom Category...</option>
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Subcategory</label>
                        {isCreatingCustomSubcategory ? (
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Type custom subcategory..."
                              value={customSubcategory}
                              onChange={(e) => {
                                setCustomSubcategory(e.target.value);
                                setSelectedProduct({ ...selectedProduct, subcategory: e.target.value });
                              }}
                              className="w-full px-3 py-2.5 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingCustomSubcategory(false);
                                setCustomSubcategory("");
                                setSelectedProduct({ ...selectedProduct, subcategory: "", microcategory: "" });
                              }}
                              className="text-[9px] font-bold text-left text-gray-500 hover:text-black uppercase tracking-wider underline cursor-pointer"
                            >
                              Choose Preset
                            </button>
                          </div>
                        ) : (
                          <select
                            value={selectedProduct.subcategory || ""}
                            disabled={!selectedProduct.category}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new__") {
                                setIsCreatingCustomSubcategory(true);
                                setCustomSubcategory("");
                                setSelectedProduct({ ...selectedProduct, subcategory: "", microcategory: "" });
                              } else {
                                setSelectedProduct({ ...selectedProduct, subcategory: val, microcategory: "" });
                              }
                            }}
                            className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">No Subcategory</option>
                            {allSubcategories.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                            <option value="__new__" className="text-[#e84e89] font-bold">+ Add Custom Subcategory...</option>
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Micro-category (optional)</label>
                        {isCreatingCustomMicrocategory ? (
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="text"
                              placeholder="Type custom micro-category..."
                              value={customMicrocategory}
                              onChange={(e) => {
                                setCustomMicrocategory(e.target.value);
                                setSelectedProduct({ ...selectedProduct, microcategory: e.target.value });
                              }}
                              className="w-full px-3 py-2.5 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingCustomMicrocategory(false);
                                setCustomMicrocategory("");
                                setSelectedProduct({ ...selectedProduct, microcategory: "" });
                              }}
                              className="text-[9px] font-bold text-left text-gray-500 hover:text-black uppercase tracking-wider underline cursor-pointer"
                            >
                              Choose Preset
                            </button>
                          </div>
                        ) : (
                          <select
                            value={selectedProduct.microcategory || ""}
                            disabled={!selectedProduct.subcategory}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new__") {
                                setIsCreatingCustomMicrocategory(true);
                                setCustomMicrocategory("");
                                setSelectedProduct({ ...selectedProduct, microcategory: "" });
                              } else {
                                setSelectedProduct({ ...selectedProduct, microcategory: val });
                              }
                            }}
                            className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">No Micro-category</option>
                            {allMicrocategories.map(mic => (
                              <option key={mic} value={mic}>{mic}</option>
                            ))}
                            <option value="__new__" className="text-[#e84e89] font-bold">+ Add Custom Micro-category...</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Price (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="9.99"
                          value={selectedProduct.price || 0}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, price: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Currency</label>
                        <input
                          type="text"
                          disabled
                          value="USD"
                          className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#E5E2DD]/30 text-[#1A1A1A]/50 font-mono text-sm outline-hidden cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Pack Cover preview Image URL</label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={selectedProduct.imageUrl || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, imageUrl: e.target.value })}
                        className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Secret Delivery File URL (Pre-set download)</label>
                      <input
                        type="url"
                        required
                        placeholder="https://googlecloudstorage.com/bucket/files.zip"
                        value={selectedProduct.fileUrl || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, fileUrl: e.target.value })}
                        className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs font-mono"
                      />
                      <p className="text-[10px] text-[#1A1A1A]/50 mt-2 leading-relaxed">This secure zip file of graphics will be sent instantly upon purchase confirmation.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Brief Description</label>
                      <textarea
                        rows={3}
                        placeholder="Describe format resolutions, sizes, licensing, etc."
                        value={selectedProduct.description || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                        className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Right col: PRE-SET EMAIL TEMPLATE */}
                  <div className="bg-[#F9F8F6] border border-[#E5E2DD] p-6 space-y-5">
                    <span className="text-[9px] font-bold text-[#FF5722] bg-[#FF5722]/10 border border-[#FF5722]/20 px-3 py-1 uppercase tracking-widest block w-fit font-mono">
                      Automated Email Dispatch Copy
                    </span>

                    <div>
                      <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Email subject line template</label>
                      <input
                        type="text"
                        required
                        placeholder="Your Graphics Pack download is ready!"
                        value={selectedProduct.emailSubject || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, emailSubject: e.target.value })}
                        className="w-full px-4 py-3 border border-[#E5E2DD] bg-white focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Email message body template</label>
                      <textarea
                        rows={7}
                        required
                        placeholder="Write your beautiful email text..."
                        value={selectedProduct.emailBody || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, emailBody: e.target.value })}
                        className="w-full px-4 py-3 border border-[#E5E2DD] bg-white focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs font-sans leading-relaxed"
                      />
                      <div className="mt-4 p-4 bg-white border border-[#E5E2DD] text-[10px] text-[#1A1A1A]/60 space-y-1.5 leading-relaxed">
                        <span className="font-bold text-[#1A1A1A] uppercase tracking-wider block mb-1 text-[9px]">Dynamic placeholders:</span>
                        You can paste these in your subject or body to substitute values:
                        <div>• <code className="bg-[#F9F8F6] px-1 font-bold text-[#FF5722] font-mono">{`{customer_name}`}</code> - Shopper Full Name</div>
                        <div>• <code className="bg-[#F9F8F6] px-1 font-bold text-[#FF5722] font-mono">{`{product_name}`}</code> - Pack Name</div>
                        <div>• <code className="bg-[#F9F8F6] px-1 font-bold text-[#FF5722] font-mono">{`{download_link}`}</code> - Download URL Link</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end border-t border-[#E5E2DD] pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProduct(false);
                      setSelectedProduct(null);
                    }}
                    className="px-6 py-3.5 border border-[#E5E2DD] text-[#1A1A1A]/60 hover:text-black hover:border-black text-xs font-bold uppercase tracking-widest cursor-pointer transition-all duration-200"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-black hover:bg-[#FF5722] text-white text-xs font-bold uppercase tracking-widest cursor-pointer transition-all duration-200"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      )}

      {/* TAB CONTENT 2: Automated Deliveries Logs */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="bg-[#F9F8F6] px-6 py-4 border border-[#E5E2DD] flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/65">
            <span>Fulfillment logs of secure graphics deliveries</span>
            <span className="font-bold text-black font-mono">{transactions.length} orders total</span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center text-[#1A1A1A]/40 font-mono border border-dashed border-[#E5E2DD] bg-white">
              No graphics pack checkouts completed yet.
            </div>
          ) : (
            <div className="bg-white border border-[#E5E2DD] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-[#F9F8F6] text-[#1A1A1A]/50 font-bold border-b border-[#E5E2DD] uppercase tracking-widest text-[9px]">
                      <th className="p-5">Customer Info</th>
                      <th className="p-5">Graphic Pack</th>
                      <th className="p-5">Revenue</th>
                      <th className="p-5">Payment Method</th>
                      <th className="p-5">Email Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2DD]">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F9F8F6]/40 transition-colors">
                        <td className="p-5">
                          <div className="space-y-1">
                            <span className="font-bold text-black block text-sm font-serif italic">{tx.customerName}</span>
                            <span className="text-[#1A1A1A]/60 block font-mono text-[10px]">{tx.customerEmail}</span>
                            <span className="text-[#1A1A1A]/35 font-mono text-[9px] block">REF: {tx.id}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-black text-sm leading-snug">{tx.productName}</span>
                            <span className="text-[#1A1A1A]/40 font-mono text-[9px] block">{new Date(tx.createdAt).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-mono font-bold text-black text-sm">${tx.amount.toFixed(2)}</span>
                        </td>
                        <td className="p-5">
                          <span className={`inline-block font-mono text-[9px] font-bold px-2 py-0.5 border uppercase tracking-wider ${
                            tx.paymentMethod === "stripe" 
                              ? "bg-black text-white border-black" 
                              : "bg-[#FF5722]/10 text-[#FF5722] border-[#FF5722]/20"
                          }`}>
                            {tx.paymentMethod === "stripe" ? "CREDIT CARD" : "SANDBOX"}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="space-y-1.5 flex flex-col items-start">
                            {tx.status === "completed" ? (
                              tx.emailSent ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 border border-green-200">
                                  <CheckCircle className="w-3 h-3" />
                                  Delivered
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#FF5722] bg-[#FF5722]/10 px-2 py-0.5 border border-[#FF5722]/20" title={tx.emailError}>
                                  <XCircle className="w-3 h-3" />
                                  Failed
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 bg-[#F9F8F6] px-2 py-0.5 border border-[#E5E2DD]">
                                {tx.status}
                              </span>
                            )}

                            {tx.status === "completed" && (
                              <button
                                onClick={() => formatReviewEmail(tx)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold bg-white border border-[#E5E2DD] text-[#1A1A1A] hover:bg-black hover:text-white hover:border-black cursor-pointer transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                Inspect Email
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Review Email Overlay Modal */}
          {activeReviewEmail && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-xl bg-white border border-[#E5E2DD] overflow-hidden space-y-4 shadow-xl">
                <div className="p-5 bg-[#F9F8F6] border-b border-[#E5E2DD] flex justify-between items-center">
                  <h4 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider font-mono flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FF5722]" />
                    Invoice Email Payload
                  </h4>
                  <button onClick={() => setActiveReviewEmail(null)} className="text-xs text-[#1A1A1A]/40 hover:text-black font-bold uppercase tracking-widest cursor-pointer">
                    Close
                  </button>
                </div>
                <div className="p-6 space-y-4 text-xs font-sans">
                  <div className="space-y-1.5 pb-4 border-b border-[#E5E2DD]">
                    <div><span className="font-bold text-[#1A1A1A]/50 uppercase tracking-wider text-[9px]">Recipient (To):</span> <span className="text-[#1A1A1A] font-semibold">{activeReviewEmail.to}</span></div>
                    <div><span className="font-bold text-[#1A1A1A]/50 uppercase tracking-wider text-[9px]">Subject:</span> <span className="text-[#1A1A1A] font-bold">{activeReviewEmail.subject}</span></div>
                  </div>
                  <div className="p-4 bg-[#F9F8F6] border border-[#E5E2DD] whitespace-pre-line font-mono text-[11px] text-[#1A1A1A] leading-relaxed max-h-[300px] overflow-y-auto">
                    {activeReviewEmail.body}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: Stripe & SMTP settings integration config */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings form */}
          <form onSubmit={handleSaveSettings} className="bg-white border border-[#E5E2DD] p-8 space-y-8">
            <h3 className="font-bold text-2xl font-serif italic text-black border-b border-[#E5E2DD] pb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#FF5722] stroke-[2]" />
              Secure Storefront Configuration
            </h3>

            <div className="space-y-6 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Global Store Name</label>
                  <input
                    type="text"
                    required
                    value={settings.storeName}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                    className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2">Admin Security Passcode</label>
                  <input
                    type="text"
                    required
                    value={settings.adminPasscode}
                    onChange={(e) => setSettings({ ...settings, adminPasscode: e.target.value })}
                    className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                  />
                </div>
              </div>

              {/* Stripe configurations section */}
              <div className="pt-6 border-t border-dashed border-[#E5E2DD] space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-black text-[10px] uppercase tracking-widest">Stripe Gateway (Optional Integration)</h4>
                  <span className="text-[9px] bg-black text-white px-2 py-0.5 font-mono font-bold uppercase tracking-wider">SSL Hooked</span>
                </div>
                <p className="text-[11px] text-[#1A1A1A]/60 leading-relaxed">
                  Provide your Stripe keys to clear live customer credit card transactions. Leave empty to run securely in Sandbox offline test mode. Since credentials reside server-side on your container, they are fully hidden.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/50 mb-1.5 font-mono uppercase tracking-wider">Stripe Publishable Key</label>
                    <input
                      type="text"
                      placeholder="pk_test_..."
                      value={settings.stripePublishableKey}
                      onChange={(e) => setSettings({ ...settings, stripePublishableKey: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/50 mb-1.5 font-mono uppercase tracking-wider">Stripe Secret Key</label>
                    <input
                      type="password"
                      placeholder="sk_test_..."
                      value={settings.stripeSecretKey}
                      onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* PayPal configurations section */}
              <div className="pt-6 border-t border-dashed border-[#E5E2DD] space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-black text-[10px] uppercase tracking-widest">PayPal Gateway (Optional Integration)</h4>
                  <span className="text-[9px] bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20 px-2 py-0.5 font-mono font-bold uppercase tracking-wider">PayPal SDK</span>
                </div>
                <p className="text-[11px] text-[#1A1A1A]/60 leading-relaxed">
                  Provide your PayPal Client ID to display interactive checkout buttons. If left empty, clients will fall back to using Sandbox transaction testing.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/50 mb-1.5 font-mono uppercase tracking-wider">PayPal Client ID</label>
                    <input
                      type="text"
                      placeholder="A_sb_... or Client ID key"
                      value={settings.paypalClientId || ""}
                      onChange={(e) => setSettings({ ...settings, paypalClientId: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/50 mb-1.5 font-mono uppercase tracking-wider">PayPal environment</label>
                    <select
                      value={settings.paypalMode || "sandbox"}
                      onChange={(e) => setSettings({ ...settings, paypalMode: e.target.value as "sandbox" | "live" })}
                      className="w-full px-3 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="live">Live / Production</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SMTP credentials configuration section */}
              <div className="pt-6 border-t border-dashed border-[#E5E2DD] space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-black text-[10px] uppercase tracking-widest">Email Delivery Dispatch Pipeline</h4>
                  <span className="text-[9px] bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20 px-2 py-0.5 font-mono font-bold uppercase tracking-wider">SMTP SECURE</span>
                </div>
                <p className="text-[11px] text-[#1A1A1A]/60 leading-relaxed">
                  Fill in SMTP server hosts (Gmail SMTP, SendGrid, etc.) to trigger real deliveries on purchase checkout. Leave blank to write letters to your admin dashboard mail logs only.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/55 mb-1.5 uppercase tracking-wider">SMTP server Host</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={settings.smtpHost}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/55 mb-1.5 uppercase tracking-wider">SMTP Port</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={settings.smtpPort}
                      onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value || "587", 10) })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/55 mb-1.5 uppercase tracking-wider">SMTP Authenticated User</label>
                    <input
                      type="text"
                      placeholder="me@gmail.com"
                      value={settings.smtpUser}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/55 mb-1.5 uppercase tracking-wider">SMTP Password / App Secret</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={settings.smtpPass}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-black text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/55 mb-1.5 uppercase tracking-wider">Sender Envelope Email (From)</label>
                    <input
                      type="email"
                      placeholder="noreply@mystore.com"
                      value={settings.smtpFrom}
                      onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#1A1A1A]/55 mb-1.5 uppercase tracking-wider">Sender Display Name</label>
                    <input
                      type="text"
                      placeholder="Graphics Delivery Store"
                      value={settings.senderName}
                      onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                      className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] focus:outline-hidden focus:border-black text-[#1A1A1A] text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-[#E5E2DD]">
              <button
                type="submit"
                className="px-6 py-4 bg-black hover:bg-[#FF5722] text-white text-xs font-bold uppercase tracking-widest cursor-pointer flex items-center gap-2 transition-all duration-200"
              >
                <Check className="w-4 h-4 stroke-[2]" />
                Save Store Secrets
              </button>
            </div>
          </form>

          {/* Mail Server Testing Suite */}
          <div className="space-y-8">
            <div className="bg-white border border-[#E5E2DD] p-8 space-y-4">
              <h3 className="font-bold text-2xl font-serif italic text-black border-b border-[#E5E2DD] pb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-[#FF5722] stroke-[2]" />
                SMTP Mailer Testing Suite
              </h3>

              <p className="text-xs text-[#1A1A1A]/60 leading-relaxed font-sans">
                Verify SMTP credentials work before deploying. Input an email address below, and our express server will immediately dispatch a verified test email.
              </p>

              <form onSubmit={handleTestMailSubmit} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-1.5 font-mono">Destination test email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="buyer@example.com"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="flex-1 px-4 py-3 border border-[#E5E2DD] bg-white text-[#1A1A1A] text-xs focus:outline-hidden focus:border-black font-sans"
                    />
                    <button
                      type="submit"
                      disabled={testingEmail || !settings.smtpUser || !settings.smtpPass}
                      className="px-5 py-3.5 bg-black hover:bg-[#FF5722] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-200"
                    >
                      {testingEmail ? "Transmitting..." : "Send Test Mail"}
                    </button>
                  </div>
                  {(!settings.smtpUser || !settings.smtpPass) && (
                    <p className="text-[10px] text-[#FF5722] mt-2 font-mono font-bold uppercase tracking-wider bg-[#FF5722]/5 p-3.5 border border-[#FF5722]/20 leading-relaxed">
                      Credentials Missing: You must fill in SMTP authenticated User & Password fields and save them before testing.
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* Hosting guide instructions */}
            <div className="bg-white border border-[#E5E2DD] p-8 space-y-4 text-xs font-sans">
              <h4 className="font-bold text-black text-[11px] uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF5722]" />
                Integration Architecture Checklist
              </h4>
              <ul className="space-y-3 list-disc pl-4 text-[#1A1A1A]/70 leading-relaxed">
                <li>
                  <strong className="text-black font-semibold font-serif">Instant Email Delivery:</strong> On successful purchase, the backend pulls product metadata from Firestore, binds the SMTP configuration, and generates the file dispatch email copy with unique download links.
                </li>
                <li>
                  <strong className="text-black font-semibold font-serif">Asset Security:</strong> Raw product ZIP URLs are stored securely within Firestore on the backend, hidden from client-side inspectors until purchase confirmation.
                </li>
                <li>
                  <strong className="text-black font-semibold font-serif">Google Sites Ready:</strong> Embed buttons and showcase banners seamlessly using responsive HTML frames that adjust to mobile viewport ratios.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: Google Sites Integration Guide */}
      {activeTab === "embed" && (
        <div className="bg-white border border-[#E5E2DD] p-8 space-y-8">
          <div className="space-y-2 border-b border-[#E5E2DD] pb-4">
            <h3 className="font-bold text-2xl font-serif italic text-black flex items-center gap-2">
              <Code className="w-5 h-5 text-[#FF5722] stroke-[2]" />
              Google Sites Instant Embed Builder
            </h3>
            <p className="text-xs text-[#1A1A1A]/60 font-sans">
              Google Sites allows embedding raw HTML directly. Customize your showcase elements below to blend into your rlbdesigns.com subdomain perfectly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans text-xs">
            {/* Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2 font-mono">Select Graphics Pack</label>
                <select
                  value={selectedEmbedProduct}
                  onChange={(e) => setSelectedEmbedProduct(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E5E2DD] bg-[#F9F8F6] text-black text-xs font-semibold focus:outline-hidden focus:border-black cursor-pointer rounded-none appearance-none"
                >
                  <option value="" disabled>-- Select Graphic Pack --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2 font-mono">Visual Layout Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dark", label: "Dark Panel" },
                    { id: "light", label: "Light Panel" },
                    { id: "minimal", label: "Button/Link Only" }
                  ].map(style => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setEmbedStyle(style.id as any)}
                      className={`py-3 px-1 border uppercase tracking-widest text-[9px] font-bold transition-all text-center cursor-pointer ${
                        embedStyle === style.id 
                          ? "bg-black text-white border-black font-extrabold" 
                          : "bg-white text-[#1A1A1A]/70 border-[#E5E2DD] hover:bg-[#F9F8F6]"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[#E5E2DD]">
                <span className="font-bold text-black uppercase tracking-wider block mb-2 text-[10px] font-mono">Google Sites Integration Steps:</span>
                <ol className="list-decimal pl-4 space-y-2 text-[#1A1A1A]/75 leading-relaxed text-[11px]">
                  <li>Open your <strong className="text-black font-semibold font-serif italic">Google Sites</strong> block editor.</li>
                  <li>In the visual additions grid, select the <strong className="text-black font-semibold font-serif italic">Embed (🔗)</strong> tool card.</li>
                  <li>Select the <strong className="text-black font-semibold font-serif italic">'Embed code'</strong> tab.</li>
                  <li>Copy and paste the HTML snippet shown on the right, and insert the card.</li>
                </ol>
              </div>
            </div>

            {/* Snippet Block Display */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex justify-between items-center bg-[#F9F8F6] px-5 py-3 border border-[#E5E2DD]">
                <span className="font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-[9px] font-mono">Code Snippet block</span>
                <button
                  type="button"
                  onClick={copyEmbedSnippet}
                  disabled={!selectedEmbedProduct}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white hover:bg-[#FF5722] text-[10px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-30 transition-all duration-200"
                >
                  {copiedEmbed ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Snippet
                    </>
                  )}
                </button>
              </div>

              {selectedEmbedProduct ? (
                <div className="space-y-6">
                  <pre className="p-5 bg-neutral-900 text-neutral-250 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[180px] border border-neutral-800 shadow-inner select-all whitespace-pre-wrap">
                    {getEmbedSnippet()}
                  </pre>

                  {/* Instant Direct Checkout Link Option */}
                  <div className="p-6 bg-[#F9F8F6] border border-[#E5E2DD] space-y-3">
                    <span className="font-bold text-black text-[10px] uppercase tracking-widest block font-mono">Direct Browser Redirect Hyperlink</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/purchase/${selectedEmbedProduct}`}
                        className="flex-grow px-4 py-2.5 border border-[#E5E2DD] text-[#1A1A1A] bg-white font-mono text-[10px] select-all focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/purchase/${selectedEmbedProduct}`;
                          navigator.clipboard.writeText(link);
                          showNotification("Direct Purchase Link copied!");
                        }}
                        className="p-3 border border-[#E5E2DD] hover:bg-black hover:text-white hover:border-black bg-white cursor-pointer transition-all"
                        title="Copy direct checkout link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-[#1A1A1A]/40 font-mono border border-dashed border-[#E5E2DD] bg-white">
                  Please select a Graphics Pack from the left dropdown menu to auto-generate HTML embed blocks.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
