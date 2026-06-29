export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  fileUrl: string; // Secret delivery file URL
  emailSubject: string; // Delivery email subject
  emailBody: string; // Delivery email body template
  createdAt: number;
  category?: string;
  subcategory?: string;
  microcategory?: string;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  paymentMethod: "stripe" | "test_checkout" | "paypal";
  createdAt: number;
  emailSent: boolean;
  emailSentAt?: number;
  emailError?: string;
}

export interface StoreSettings {
  storeName: string;
  adminPasscode: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  paypalClientId?: string;
  paypalMode?: "sandbox" | "live";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  senderName: string;
}
