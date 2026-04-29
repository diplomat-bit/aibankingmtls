import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";
import ModernTreasury from "modern-treasury";
import axios from "axios";
import https from "https";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };
import { plaidService } from "./services/plaidService";
import { blockchainService } from "./services/blockchainService";
import { ledgerService } from "./services/ledgerService";
import webpush from "web-push";
import { createClient } from 'redis';
import { DataAPIClient } from "@datastax/astra-db-ts";

dotenv.config();

// Redis Setup
const redisHost = process.env.REDIS_HOST;
const redisPassword = process.env.REDIS_PASSWORD;
const redisUrl = (redisHost && redisHost.startsWith('redis://')) 
  ? redisHost 
  : undefined;

const redisClient = createClient(
  redisUrl 
    ? { url: redisUrl }
    : {
        username: 'default',
        password: redisPassword || 'REDIS_PASSWORD',
        socket: {
          host: redisHost || 'REDIS_HOST',
          port: 16615
        }
      }
);

redisClient.on('error', err => console.log('Redis Client Error', err));

async function startRedis() {
  try {
    await redisClient.connect();
    console.log('Redis Connected');
  } catch (err) {
    console.error('Redis Connection Error:', err);
  }
}

startRedis();

// Astra DB Setup
const astraToken = process.env.ASTRA_DB_APPLICATION_TOKEN;
const astraEndpoint = process.env.ASTRA_DB_ENDPOINT || 'https://77baf575-a343-4100-a319-14042f368fb6-us-east1.apps.astra.datastax.com';

let astraDb: any = null;

if (astraToken) {
  const astraClient = new DataAPIClient();
  astraDb = astraClient.db(astraEndpoint, { token: astraToken });
  
  (async () => {
    try {
      const colls = await astraDb.listCollections();
      const hasCreds = colls.some((c: any) => c.name === 'application_credentials');
      if (!hasCreds) {
        await astraDb.createCollection('application_credentials');
      }
    } catch (err) {
      console.error('AstraDB Connection Error:', err);
    }
  })();
}

async function getAppCredentials(appId: string) {
  if (!astraDb) return null;
  const coll = astraDb.collection('application_credentials');
  return await coll.findOne({ _id: appId });
}

// Push Notification Setup
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:sovereignties3@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Initialize Firebase Admin
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Auth Middleware
const firebaseAuthCheck = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Stripe Webhook
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    res.json({ received: true });
  });

  // Stripe Checkout Session
  app.post("/api/checkout/create-session", async (req, res) => {
    try {
      const { priceId, quantity } = req.body;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: quantity || 1 }],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/success`,
        cancel_url: `${process.env.APP_URL}/cancel`,
      });
      res.json({ id: session.id });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Modern Treasury API Integration
  async function getMTClient(userId: string) {
    if (userId && astraDb) {
      const coll = astraDb.collection('application_credentials');
      const creds = await coll.findOne({ _id: `mt:${userId}` });
      if (creds && creds.apiKey && creds.organizationId) {
        return new ModernTreasury({ apiKey: creds.apiKey, organizationID: creds.organizationId });
      }
    }
    if (process.env.MODERN_TREASURY_API_KEY && process.env.MODERN_TREASURY_ORGANIZATION_ID) {
      return new ModernTreasury({ apiKey: process.env.MODERN_TREASURY_API_KEY, organizationID: process.env.MODERN_TREASURY_ORGANIZATION_ID });
    }
    throw new Error("Modern Treasury credentials not found.");
  }

  app.get("/api/modern_treasury/accounts", firebaseAuthCheck, async (req, res) => {
    try {
      const mt = await getMTClient((req as any).user.uid);
      const accounts = [];
      for await (const account of mt.internalAccounts.list()) accounts.push(account);
      res.json(accounts);
    } catch (error) { res.status(500).json({ error: String(error) }); }
  });

  app.get("/api/modern_treasury/ledgers", firebaseAuthCheck, async (req, res) => {
    try {
      const mt = await getMTClient((req as any).user.uid);
      const ledgers = [];
      for await (const ledger of mt.ledgers.list()) ledgers.push(ledger);
      res.json(ledgers);
    } catch (error) { res.status(500).json({ error: String(error) }); }
  });

  // Plaid API
  app.post("/api/plaid/create-link-token", async (req, res) => {
    try {
      const response = await plaidService.createLinkToken(req.body.userId);
      res.json(response);
    } catch (error) { res.status(500).json({ error: String(error) }); }
  });

  // FDX Payees
  const INITIAL_PAYEES = [
    { _id: "payee-1", payeeId: "payee-1", merchant: { displayName: "Verizon", name: { company: "Verizon" } }, status: "ACTIVE" },
    { _id: "payee-2", payeeId: "payee-2", merchant: { displayName: "Con Edison", name: { company: "ConEd" } }, status: "ACTIVE" }
  ];

  app.get("/api/billmgmt/billpay/v2/fdx/v6/payees", async (req, res) => {
    res.json({ payees: INITIAL_PAYEES });
  });

  // OAuth Callback
  app.get("/auth/callback", async (req, res) => {
      const { code, state } = req.query;
      res.send("Authentication Successful! You can close this window.");
  });

  // Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
