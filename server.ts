import express from "express";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { 
  db,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc,
  query,
  orderBy
} from "./src/lib/firebase";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Body parser
app.use(express.json());

// Set up default settings config helper
async function getStoreSettings() {
  try {
    const docRef = doc(db, "settings", "store_config");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      const defaultSettings = {
        storeName: "My Graphic Pack Store",
        adminPasscode: "admin123",
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
        paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
        paypalMode: process.env.PAYPAL_MODE || "sandbox",
        smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
        smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
        smtpUser: process.env.SMTP_USER || "",
        smtpPass: process.env.SMTP_PASS || "",
        smtpFrom: process.env.SMTP_FROM || "",
        senderName: process.env.SENDER_NAME || "Graphics Store"
      };
      await setDoc(docRef, defaultSettings);
      return defaultSettings;
    }
  } catch (err) {
    console.error("Error reading/writing store settings:", err);
    return {
      storeName: "My Graphic Pack Store",
      adminPasscode: "admin123",
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
      paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
      paypalMode: process.env.PAYPAL_MODE || "sandbox",
      smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
      smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
      smtpUser: process.env.SMTP_USER || "",
      smtpPass: process.env.SMTP_PASS || "",
      smtpFrom: process.env.SMTP_FROM || "",
      senderName: process.env.SENDER_NAME || "Graphics Store"
    };
  }
}

// Ensure default products exist on boot
async function initializeDefaultProducts() {
  try {
    const prodCol = collection(db, "products");
    const prodSnap = await getDocs(prodCol);
    if (prodSnap.empty) {
      const defaults = [
        {
          name: "Abstract Neon Gradient Pack",
          description: "A collection of 25 vibrant, high-resolution abstract neon gradients perfect for banners, posters, cover art, and UI backgrounds. Includes raw vector formats and high-quality PNGs.",
          price: 12.99,
          currency: "USD",
          imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          fileUrl: "https://example.com/downloads/abstract-neon-gradients-pack.zip",
          emailSubject: "Your Abstract Neon Gradient Pack Download!",
          emailBody: "Hi {customer_name},\n\nThank you for purchasing the Abstract Neon Gradient Pack!\n\nYou can download your graphics file directly using this secure link:\n{download_link}\n\nIf you have any questions or feedback, please hit reply. We'd love to hear from you!\n\nBest regards,\nYour Design Store Team",
          createdAt: Date.now()
        },
        {
          name: "Minimalist Vector Icon Set",
          description: "Over 150 cleanly designed, fully editable premium minimalist vector line icons for modern web apps, mobile apps, and graphic layout. SVG and EPS formats.",
          price: 19.99,
          currency: "USD",
          imageUrl: "https://images.unsplash.com/photo-1541462608141-2f528de88c55?auto=format&fit=crop&w=800&q=80",
          fileUrl: "https://example.com/downloads/minimalist-vector-icons-v1.zip",
          emailSubject: "Your Minimalist Vector Icon Set is Ready!",
          emailBody: "Hi {customer_name},\n\nYour Minimalist Vector Icon Set order is successfully processed!\n\nGet your graphic assets immediately via this download link:\n{download_link}\n\nThank you for supporting our creative catalog!\n\nBest regards,\nIcon Craft Team",
          createdAt: Date.now() - 864 * 1000 * 100
        }
      ];
      for (const item of defaults) {
        await addDoc(prodCol, item);
      }
    }
  } catch (error) {
    console.error("Failed to seed default products:", error);
  }
}

// Boot setup
initializeDefaultProducts()
  .then(() => getStoreSettings())
  .catch((err) => {
    console.error("Failed startup database routines gracefully:", err);
  });

// --- API ROUTES ---

// 1. Get products (public)
app.get("/api/products", async (req, res) => {
  try {
    const prodCol = collection(db, "products");
    const qSnap = await getDocs(prodCol);
    const products: any[] = [];
    qSnap.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() });
    });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get single product (public)
app.get("/api/products/:id", async (req, res) => {
  try {
    const docRef = doc(db, "products", req.params.id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Initiate checkout session
app.post("/api/checkout", async (req, res) => {
  try {
    const { productId, customerName, customerEmail } = req.body;
    if (!productId || !customerEmail || !customerName) {
      return res.status(400).json({ error: "Missing required checkout parameters" });
    }

    const prodRef = doc(db, "products", productId);
    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) {
      return res.status(404).json({ error: "Product not found" });
    }
    const product = prodSnap.data();
    const settings = await getStoreSettings();

    const transactionId = "tx_" + Math.random().toString(36).substring(2, 15);
    const useStripe = !!settings.stripeSecretKey;

    const txnRef = doc(db, "transactions", transactionId);
    await setDoc(txnRef, {
      id: transactionId,
      productId: productId,
      productName: product.name,
      customerEmail: customerEmail,
      customerName: customerName,
      amount: product.price,
      currency: product.currency || "USD",
      status: "pending",
      paymentMethod: useStripe ? "stripe" : "test_checkout",
      createdAt: Date.now(),
      emailSent: false
    });

    if (useStripe) {
      try {
        const stripe = new Stripe(settings.stripeSecretKey);
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: (product.currency || "usd").toLowerCase(),
                product_data: {
                  name: product.name,
                  description: product.description.substring(0, 150),
                  images: product.imageUrl ? [product.imageUrl] : []
                },
                unit_amount: Math.round(product.price * 100)
              },
              quantity: 1
            }
          ],
          mode: "payment",
          success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}&tx=${transactionId}`,
          cancel_url: `${req.headers.origin}/product/${productId}`,
          customer_email: customerEmail,
          metadata: {
            transactionId: transactionId,
            productId: productId
          }
        });

        await updateDoc(txnRef, { stripeSessionId: session.id });

        return res.json({ checkoutUrl: session.url, stripeSessionId: session.id, transactionId });
      } catch (stErr: any) {
        console.error("Stripe failure on generation checkout, fallback to sandbox:", stErr);
        return res.json({
          checkoutUrl: `/test-payment?tx=${transactionId}`,
          transactionId,
          error: "Stripe connection failed: " + stErr.message + ". Entered Sandbox Mode."
        });
      }
    } else {
      return res.json({ checkoutUrl: `/test-payment?tx=${transactionId}`, transactionId });
    }
  } catch (error: any) {
    console.error("Checkout creation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3.5 Get checkout and product details securely
app.get("/api/checkout/details/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ error: "Missing transaction ID" });
    }

    const txnRef = doc(db, "transactions", transactionId);
    const txnSnap = await getDoc(txnRef);
    if (!txnSnap.exists()) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    const transaction = txnSnap.data();

    const productRef = doc(db, "products", transaction.productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      return res.status(404).json({ error: "Product metadata lost" });
    }
    const product = productSnap.data();
    const settings = await getStoreSettings();

    res.json({
      transaction: { id: txnSnap.id, ...transaction },
      product: { id: productSnap.id, ...product },
      paypalClientId: settings.paypalClientId || "",
      paypalMode: settings.paypalMode || "sandbox"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Verify checkout payment status
app.post("/api/checkout/verify", async (req, res) => {
  try {
    const { transactionId, stripeSessionId, isTestSuccess, isPayPalSuccess, paypalOrderId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "Missing transaction ID" });
    }

    const txnRef = doc(db, "transactions", transactionId);
    const txnSnap = await getDoc(txnRef);
    if (!txnSnap.exists()) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    const transaction = txnSnap.data();

    if (transaction.status === "completed") {
      // Already completed, so reply success and product url helper
      const productRef = doc(db, "products", transaction.productId);
      const productSnap = await getDoc(productRef);
      const fileUrl = productSnap.exists() ? productSnap.data().fileUrl : "";
      return res.json({ 
        success: true, 
        transaction, 
        product: productSnap.exists() ? { id: productSnap.id, ...productSnap.data() } : null,
        productDownloadUrl: fileUrl 
      });
    }

    const productRef = doc(db, "products", transaction.productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      return res.status(404).json({ error: "Purchase pack metadata lost" });
    }
    const product = productSnap.data();
    const settings = await getStoreSettings();

    let paymentValid = false;

    if (transaction.paymentMethod === "stripe" && stripeSessionId) {
      try {
        const stripe = new Stripe(settings.stripeSecretKey);
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        if (session.payment_status === "paid") {
          paymentValid = true;
        }
      } catch (stripeErr) {
        console.error("Failed to authenticate Stripe checkout status:", stripeErr);
      }
    } else if (transaction.paymentMethod === "test_checkout" && isTestSuccess) {
      paymentValid = true;
    } else if (isPayPalSuccess || paypalOrderId) {
      paymentValid = true;
      // Mark transaction paymentMethod as paypal of record since it succeeded
      await updateDoc(txnRef, {
        paymentMethod: "paypal",
        paypalOrderId: paypalOrderId || "paypal_checkout_verified"
      });
    }

    if (paymentValid) {
      await updateDoc(txnRef, {
        status: "completed",
        completedAt: Date.now()
      });

      let emailSent = false;
      let emailError = "";

      try {
        const formattedSubject = (product.emailSubject || "Your design download link")
          .replace(/{customer_name}/g, transaction.customerName)
          .replace(/{product_name}/g, product.name);

        const formattedBody = (product.emailBody || "Here is your link: {download_link}")
          .replace(/{customer_name}/g, transaction.customerName)
          .replace(/{product_name}/g, product.name)
          .replace(/{download_link}/g, product.fileUrl);

        if (settings.smtpUser && settings.smtpPass) {
          let cleanPass = settings.smtpPass ? settings.smtpPass.trim() : "";
          if (settings.smtpHost?.includes("gmail.com") || settings.smtpUser?.includes("gmail.com")) {
            // Strip ALL spaces/whitespace anyway (Google App Passwords never contain actual spaces)
            cleanPass = cleanPass.replace(/\s+/g, "");
          }

          const transporter = nodemailer.createTransport({
            host: settings.smtpHost || "smtp.gmail.com",
            port: parseInt(settings.smtpPort.toString() || "587", 10),
            secure: parseInt(settings.smtpPort.toString() || "587", 10) === 465,
            auth: {
              user: settings.smtpUser.trim(),
              pass: cleanPass
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          await transporter.sendMail({
            from: `"${settings.senderName || settings.storeName}" <${settings.smtpFrom || settings.smtpUser}>`,
            to: transaction.customerEmail,
            subject: formattedSubject,
            text: formattedBody,
            html: formattedBody.replace(/\n/g, "<br>")
          });

          emailSent = true;
        } else {
          emailError = "SMTP mail transport not configured. Deliverable simulated and logged to Dashboard.";
          emailSent = true; // Complete so shopper download flow is undisturbed
        }
      } catch (mErr: any) {
        console.error("SMTP sending err:", mErr);
        let errorMsg = mErr.message || "Failed during SMTP communication.";
        if (errorMsg.includes("535") || errorMsg.toLowerCase().includes("invalid login")) {
          errorMsg = "Google SMTP Invalid Login (535). Please verify:\n1. Your App Password is exactly 16 characters. We automatically strip any spaces if entered.\n2. Ensure your SMTP user is exactly 'ogrlbdesigns@gmail.com'.\n3. Check your Google Account security alerts or incoming emails. Google sometimes blocks server sign-ins until you click 'Yes, it was me' to approve the new workspace connection.";
        }
        emailError = errorMsg;
        emailSent = false;
      }

      await updateDoc(txnRef, {
        emailSent,
        emailSentAt: emailSent ? Date.now() : null,
        emailError: emailError || null
      });

      return res.json({
        success: true,
        transaction: {
          ...transaction,
          status: "completed",
          completedAt: Date.now(),
          emailSent,
          emailError: emailError || undefined
        },
        product: { id: productSnap.id, ...product },
        productDownloadUrl: product.fileUrl
      });
    } else {
      await updateDoc(txnRef, { status: "failed" });
      return res.status(400).json({ error: "Payment checkout validation failed" });
    }
  } catch (error: any) {
    console.error("Verification endpoint failure:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Passcode Middleware Helper
async function checkAdminPasscode(req: express.Request, res: express.Response, next: express.NextFunction) {
  const passcode = req.headers["x-admin-passcode"];
  if (!passcode) {
    return res.status(401).json({ error: "No administrator passcode session provided" });
  }
  const settings = await getStoreSettings();
  if (passcode !== settings.adminPasscode) {
    return res.status(403).json({ error: "Unauthorized admin access passcode" });
  }
  next();
}

// 5. Admin Sign-In/Login Verification
app.post("/api/admin/login", async (req, res) => {
  const { passcode } = req.body;
  const settings = await getStoreSettings();
  if (passcode === settings.adminPasscode) {
    return res.json({ success: true, storeName: settings.storeName });
  }
  res.status(401).json({ error: "Invalid admin passcode" });
});

// 6. Admin settings GET
app.get("/api/admin/settings", checkAdminPasscode, async (req, res) => {
  const settings = await getStoreSettings();
  res.json(settings);
});

// 7. Admin settings SAVE
app.post("/api/admin/settings", checkAdminPasscode, async (req, res) => {
  try {
    const updatedSettings = req.body;
    console.log("Saving store settings request received:", updatedSettings);
    if (!updatedSettings.adminPasscode || updatedSettings.adminPasscode.trim() === "") {
      return res.status(400).json({ error: "Passcode cannot be set empty" });
    }
    const docRef = doc(db, "settings", "store_config");
    await setDoc(docRef, updatedSettings);
    console.log("Store settings saved successfully!");
    res.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error("CRITICAL ERROR SAVING STORE SETTINGS:", error);
    res.status(500).json({ error: error.message || "Failed to write settings to the persistent database" });
  }
});

// 8. Admin products SAVE/UPDATE
app.post("/api/admin/products", checkAdminPasscode, async (req, res) => {
  try {
    const product = req.body;
    if (!product.name || product.price === undefined || product.price === null || product.price === "" || !product.fileUrl) {
      return res.status(400).json({ error: "Required: Name, price, fileUrl" });
    }

    const item = {
      name: product.name,
      description: product.description || "",
      price: parseFloat(product.price.toString()),
      currency: product.currency || "USD",
      imageUrl: product.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      fileUrl: product.fileUrl,
      emailSubject: product.emailSubject || "Your design download link is here!",
      emailBody: product.emailBody || "Hi {customer_name},\n\nHere is your graphic download: {download_link}",
      createdAt: product.createdAt || Date.now(),
      category: product.category || "",
      subcategory: product.subcategory || "",
      microcategory: product.microcategory || ""
    };

    if (product.id) {
      const docRef = doc(db, "products", product.id);
      await setDoc(docRef, item, { merge: true });
      res.json({ success: true, id: product.id });
    } else {
      const colRef = collection(db, "products");
      const docRef = await addDoc(colRef, item);
      res.json({ success: true, id: docRef.id });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Admin product DELETE
app.delete("/api/admin/products/:id", checkAdminPasscode, async (req, res) => {
  try {
    const docRef = doc(db, "products", req.params.id);
    await deleteDoc(docRef);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Admin transactions query
app.get("/api/admin/transactions", checkAdminPasscode, async (req, res) => {
  try {
    const txnCol = collection(db, "transactions");
    const qSnap = await getDocs(txnCol);
    const transactions: any[] = [];
    qSnap.forEach((docSnap) => {
      transactions.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Sort reverse chronological
    transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Admin test email sending
app.post("/api/admin/test-email", checkAdminPasscode, async (req, res) => {
  try {
    const { testEmail, settings } = req.body;
    if (!testEmail || !settings) {
      return res.status(400).json({ error: "Missing destination test email or settings object" });
    }

    if (!settings.smtpUser || !settings.smtpPass) {
      return res.status(400).json({ error: "SMTP credentials must be provided to test delivery" });
    }

    let cleanPass = settings.smtpPass ? settings.smtpPass.trim() : "";
    if (settings.smtpHost?.includes("gmail.com") || settings.smtpUser?.includes("gmail.com")) {
      // Strip ALL spaces/whitespace anyway (Google App Passwords never contain actual spaces)
      cleanPass = cleanPass.replace(/\s+/g, "");
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost || "smtp.gmail.com",
      port: parseInt(settings.smtpPort.toString() || "587", 10),
      secure: parseInt(settings.smtpPort.toString() || "587", 10) === 465,
      auth: {
        user: settings.smtpUser.trim(),
        pass: cleanPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `"${settings.senderName || settings.storeName}" <${settings.smtpFrom || settings.smtpUser}>`,
      to: testEmail,
      subject: `Test Delivery Email - ${settings.storeName}`,
      text: "Hello! This is a test email sent from your Graphics Pack Checkout Server. Your SMTP configuration is verified and fully functional!",
      html: "<h3>Hello!</h3><p>This is a test email sent from your <strong>Graphics Pack Checkout Server</strong>. Your SMTP configuration is verified and fully functional!</p>"
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("SMTP Test failed:", error);
    let errorMsg = error.message || "Failed to send SMTP test mail";
    if (errorMsg.includes("535") || errorMsg.toLowerCase().includes("invalid login")) {
      errorMsg = "Google SMTP Invalid Login (535). Please double check:\n\n" +
                 "1. USERNAME: Make sure this is exactly your Gmail address (e.g. 'ogrlbdesigns@gmail.com'). Do not leave out '@gmail.com'.\n" +
                 "2. APP PASSWORD: Make sure you copied the full 16-character code (represented as 4 blocks of 4 keys). We stripped any spaces for you, but be sure it's correct.\n" +
                 "3. SECURITY ALERT: Google might have blocked the first sign-in attempt from our server workspace location. Check your Gmail inbox or visit https://myaccount.google.com/notifications for a 'Critical security alert' or 'Suspicious sign-in'. Open it and select 'Yes, it was me' to allow the connection, then try again!\n" +
                 "4. TWO-FACTOR: Double check that '2-Step Verification' is turned ON in your Google Account security settings. App Passwords will NOT work if 2-Step Verification is disabled.";
    }
    res.status(500).json({ error: errorMsg });
  }
});

// 12. Robots.txt for search engines
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\n");
});

// Mounting Vite middleware to serve client SPA in development, static hosting in production.
async function resolveAndRun() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Fallback to index.html for react routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Graphics Packs Checkout Delivery Server is running on port ${PORT}`);
  });
}

resolveAndRun();
