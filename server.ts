import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";
import ModernTreasury from "modern-treasury";
import axios from "axios";
import https from "https";
import { ensureCertsExist } from "./scripts/generate-certs.js";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };
import { plaidService } from "./services/plaidService";
import { blockchainService } from "./services/blockchainService";
import { ledgerService } from "./services/ledgerService";
import webpush from "web-push";
import { createClient } from 'redis';
import { decodeJwt } from 'jose';
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
          port: 16615 // Matching the port from the error message
        }
      }
);

redisClient.on('error', err => console.log('Redis Client Error', err));

async function startRedis() {
  try {
    await redisClient.connect();
    console.log('Redis Connected');
    await redisClient.set('foo', 'bar');
    const result = await redisClient.get('foo');
    console.log('Redis Test Result:', result);
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
      console.log('Connected to AstraDB collections:', colls.length);
      
      // Ensure application_credentials collection exists
      const hasCreds = colls.some((c: any) => c.name === 'application_credentials');
      if (!hasCreds) {
        try {
          await astraDb.createCollection('application_credentials');
          console.log('Created application_credentials collection');
        } catch (createErr: any) {
          if (createErr.message?.includes('already exists')) {
            console.warn('application_credentials collection already exists (skipping creation)');
          } else {
            console.error('Error creating application_credentials collection:', createErr);
          }
        }
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
  try {
    webpush.setVapidDetails(
      'mailto:sovereignties3@gmail.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.error('Error setting VAPID details:', err);
  }
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
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure mTLS certificates exist
  const { cert, key } = ensureCertsExist();
  const httpsAgent = new https.Agent({ cert, key });

  // Webhooks
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      return res.status(400).send('Webhook secret not configured');
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
      const event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
      
      console.log('Stripe webhook received:', event.type);
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('PaymentIntent was successful!');
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Stripe Webhook Error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Stripe Checkout Session
  app.post("/api/checkout/create-session", async (req, res) => {
    try {
      const { priceId, quantity } = req.body;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: quantity || 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/success`,
        cancel_url: `${process.env.APP_URL}/cancel`,
      });

      res.json({ id: session.id });
    } catch (error) {
      console.error("Stripe Checkout Session Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/webhooks/modern-treasury', express.json(), async (req, res) => {
    try {
      const event = req.body;
      console.log('Modern Treasury webhook received:', event.event);
      
      // Handle the event
      switch (event.event) {
        case 'payment_order.completed':
          console.log('Payment Order completed!');
          break;
        case 'expected_payment.reconciled':
          console.log('Expected Payment reconciled!');
          break;
        default:
          console.log(`Unhandled MT event type ${event.event}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Modern Treasury Webhook Error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  app.use(express.json());

  // Protect API routes with Firebase Auth
  app.use('/api', firebaseAuthCheck);

  // API routes
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok" });
  });

  // Push Notification Routes
  app.post('/api/notifications/subscribe', express.json(), async (req, res) => {
    const subscription = req.body;
    // Store subscription in database
    console.log('Received subscription:', subscription);
    res.status(201).json({ success: true });
  });

  app.post('/api/notifications/send', express.json(), async (req, res) => {
    const { subscription, payload } = req.body;
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error sending push notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // GraphQL Implementation
  app.post("/api/graphql/upload-queries", async (req, res) => {
    try {
      const { operations } = req.body;
      if (Array.isArray(operations)) {
        for (const op of operations) {
          if (op.id && op.body) {
            await redisClient.hSet('graphql:queries', op.id, op.body);
          }
        }
        res.json({ success: true, count: operations.length });
      } else {
        res.status(400).json({ error: "Invalid format. Expected 'operations' array." });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/graphql", async (req, res) => {
    try {
      const { query, operationName, variables, extensions } = req.body;
      let graphqlQuery = query;

      if (!graphqlQuery && extensions?.persistedQuery?.sha256Hash) {
        const hash = extensions.persistedQuery.sha256Hash;
        graphqlQuery = await redisClient.hGet('graphql:queries', hash);
        if (!graphqlQuery) {
          return res.status(400).json({ errors: [{ message: "PersistedQueryNotFound" }] });
        }
      }

      if (!graphqlQuery) {
        return res.status(400).json({ error: "Query is required" });
      }

      console.log(`Executing GraphQL operation: ${operationName || 'Anonymous'}`);
      
      // For real implementation, this would forward to a GraphQL engine
      // Here we'll store the execution log in Redis
      const logKey = `graphql:logs:${Date.now()}`;
      await redisClient.set(logKey, JSON.stringify({ operationName, variables, timestamp: new Date().toISOString() }));
      await redisClient.expire(logKey, 3600); // Expire after 1 hour

      res.json({
        data: {
          message: `Successfully executed ${operationName || 'query'}`,
          query: graphqlQuery.substring(0, 100) + '...',
          variables,
          executionId: logKey
        }
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Plaid API Integration
  app.post("/api/plaid/create-link-token", async (req, res) => {
    try {
      const { userId } = req.body;
      const response = await plaidService.createLinkToken(userId);
      res.json(response);
    } catch (error) {
      console.error("Plaid Link Token Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/plaid/exchange-public-token", async (req, res) => {
    try {
      const { publicToken } = req.body;
      const response = await plaidService.exchangePublicToken(publicToken);
      res.json(response);
    } catch (error) {
      console.error("Plaid Exchange Token Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/plaid/create-processor-token", async (req, res) => {
    try {
      const { accessToken, accountId } = req.body;
      const response = await plaidService.createProcessorToken(accessToken, accountId, 'modern_treasury');
      res.json(response);
    } catch (error) {
      console.error("Plaid Processor Token Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Bridging API
  app.post("/api/bridge/token", async (req, res) => {
    try {
      const { uuid, amount, destinationChain } = req.body;
      const tx = await blockchainService.bridgeToken(uuid, amount, destinationChain);
      res.json({ success: true, tx });
    } catch (error) {
      console.error("Bridging Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Plaid Webhook
  app.post('/api/webhooks/plaid', express.json(), async (req, res) => {
    try {
      const event = req.body;
      console.log('Plaid webhook received:', event.webhook_type);
      res.json({ received: true });
    } catch (err: any) {
      console.error('Plaid Webhook Error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Modern Treasury API Helper
  async function getMTClient(userId: string) {
    if (userId && astraDb) {
      try {
        const coll = astraDb.collection('application_credentials');
        const creds = await coll.findOne({ _id: `mt:${userId}` });
        if (creds && creds.apiKey && creds.organizationId) {
          console.log(`[MT] Using credentials from AstraDB for user ${userId}`);
          return new ModernTreasury({
            apiKey: creds.apiKey,
            organizationID: creds.organizationId,
          });
        }
      } catch (err) {
        console.error('[MT] Error fetching credentials from AstraDB:', err);
      }
    }

    if (process.env.MODERN_TREASURY_API_KEY && process.env.MODERN_TREASURY_ORGANIZATION_ID) {
      console.log('[MT] Using credentials from environment variables');
      return new ModernTreasury({
        apiKey: process.env.MODERN_TREASURY_API_KEY,
        organizationID: process.env.MODERN_TREASURY_ORGANIZATION_ID,
      });
    }

    throw new Error("Modern Treasury credentials not found. Please provide Org ID and API Key in Connections tab.");
  }

  // Modern Treasury Credentials Bootstrap
  app.post("/api/modern_treasury/credentials", firebaseAuthCheck, async (req, res) => {
    try {
      const { apiKey, organizationId } = req.body;
      const userId = (req as any).user.uid;
      
      if (!apiKey || !organizationId) {
        return res.status(400).json({ error: "API Key and Organization ID are required" });
      }

      if (!astraDb) return res.status(500).json({ error: "Astra DB not initialized" });
      const coll = astraDb.collection('application_credentials');
      
      await coll.updateOne(
        { _id: `mt:${userId}` },
        { 
          $set: { 
            apiKey, 
            organizationId,
            userId,
            updatedAt: new Date().toISOString()
          } 
        },
        { upsert: true }
      );
      
      res.json({ success: true, message: "Modern Treasury credentials saved" });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Modern Treasury API Integration
  app.get("/api/modern_treasury/accounts", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const accounts = [];
      for await (const account of mt.internalAccounts.list()) {
        accounts.push(account);
      }
      res.json(accounts);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ 
          error: error.message,
          code: error.name,
          status: error.status 
        });
      }
      console.error("Modern Treasury API Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/modern_treasury/counterparties", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const counterparties = [];
      for await (const cp of mt.counterparties.list()) {
        counterparties.push(cp);
      }
      res.json(counterparties);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/modern_treasury/internal_accounts", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const accounts = [];
      for await (const account of mt.internalAccounts.list()) {
        accounts.push(account);
      }
      res.json(accounts);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/modern_treasury/virtual_accounts", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const accounts = [];
      for await (const account of mt.virtualAccounts.list()) {
        accounts.push(account);
      }
      res.json(accounts);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/modern_treasury/transactions", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const txs = [];
      for await (const tx of mt.transactions.list()) {
        txs.push(tx);
      }
      res.json(txs);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/modern_treasury/ledger_accounts", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const accounts = [];
      for await (const account of mt.ledgerAccounts.list()) {
        accounts.push(account);
      }
      res.json(accounts);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/modern_treasury/account_collection_flows", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const flow = await mt.accountCollectionFlows.create(req.body);
      res.json(flow);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/modern_treasury/payment_flows", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const flow = await mt.paymentFlows.create(req.body);
      res.json(flow);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/modern_treasury/payment_orders", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const { amount, currency, direction, originating_account_id, receiving_account_id, type, description } = req.body;
      
      if (!amount || !currency || !direction || !originating_account_id) {
        return res.status(400).json({ error: "Missing required payment fields" });
      }

      console.log(`[MT] Creating payment order for user ${userId}: ${amount} ${currency} ${direction}`);
      const paymentOrder = await mt.paymentOrders.create({
        type: type || 'ach',
        amount: Math.round(parseFloat(amount) * 100),
        currency,
        direction,
        originating_account_id,
        receiving_account_id: receiving_account_id || undefined,
        description: description || 'Transfer',
      });
      res.json(paymentOrder);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message, details: (error as any).body?.errors });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  // Ledger API Integration
  app.post("/api/ledger/entry", async (req, res) => {
    try {
      const { computeEventId, amount, currency, type } = req.body;
      if (!computeEventId || !amount || !currency || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const entry = await ledgerService.createLedgerEntry(computeEventId, amount, currency, type);
      res.json(entry);
    } catch (error) {
      console.error("Ledger Service Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/citi/accept-offer", async (req, res) => {
    try {
      const { applicationId, productCode } = req.body;
      const appKey = `citi:application:${applicationId}`;
      const appData = {
        status: "00 OK",
        applicationStage: "APPROVAL",
        ipaExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        kbaRequiredFlag: "true",
        bureauPullExpiredFlag: "true",
        requestedProductDecision: [{ productCode, decision: "APPROVED" }],
        updatedAt: new Date().toISOString()
      };
      await redisClient.set(appKey, JSON.stringify(appData));
      res.json(appData);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/citi/add-product", async (req, res) => {
    try {
      const { applicationId, productCode } = req.body;
      const appKey = `citi:application:${applicationId}`;
      const existingApp = await redisClient.get(appKey);
      const appData = existingApp ? JSON.parse(existingApp) : { applicationId };
      
      const productDetails = {
        productCode: productCode,
        addProductStatusDescription: "Success",
        addedAt: new Date().toISOString()
      };
      
      appData.productDetails = [...(appData.productDetails || []), productDetails];
      await redisClient.set(appKey, JSON.stringify(appData));
      
      res.json({
        status: "00 OK",
        applicationId: applicationId,
        productDetails: [productDetails]
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Modern Treasury Ledgers Integration
  app.get("/api/modern_treasury/ledgers", firebaseAuthCheck, async (req, res) => {
    try {
      const userId = (req as any).user.uid;
      const mt = await getMTClient(userId);
      const ledgers = [];
      for await (const ledger of mt.ledgers.list()) {
        ledgers.push(ledger);
      }
      res.json(ledgers);
    } catch (error) {
      if (error instanceof ModernTreasury.APIError) {
        return res.status(error.status || 500).json({ error: error.message });
      }
      res.status(500).json({ error: String(error) });
    }
  });

  // OAuth Login Redirect (to avoid popup blocking)
  app.get("/api/auth/login", async (req, res) => {
    const { service, userId } = req.query;
    const appUrl = process.env.APP_URL || `https://${req.get('host')}`;
    const redirectUri = `${appUrl}/auth/callback`;
    const clientId = process.env.AIBANKING_CLIENT_ID || 'zt6OsWvRgUtQsISRILfGFr7XhxwC6JgY';

    if (service === 'stripe') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.STRIPE_CLIENT_ID!,
        scope: 'read_write',
        redirect_uri: redirectUri,
        state: JSON.stringify({ service, userId })
      });
      return res.redirect(`https://connect.stripe.com/oauth/authorize?${params}`);
    }

    if (service === 'citi') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.CITI_CLIENT_ID!,
        redirect_uri: redirectUri,
        scope: 'accounts_transaction',
        state: JSON.stringify({ service, userId })
      });
      return res.redirect(`https://partner.citi.com/gcgapi/sandbox/prod/openapi/iam/tokenManagement/partner/authCode/oauth2/cgw/v1/authorize?${params}`);
    }

    if (service === 'aibanking') {
      const loginUrl = 'https://auth.aibanking.dev/samlp/zt6OsWvRgUtQsISRILfGFr7XhxwC6JgY?connection=aibanking';
      return res.redirect(loginUrl);
    }

    res.status(400).send('Invalid service');
  });

  // Redis Test Endpoint
  app.get("/api/redis/test", async (req, res) => {
    try {
      await redisClient.set('foo', 'bar');
      const result = await redisClient.get('foo');
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Astra DB Test Endpoint
  app.get("/api/astra/test", async (req, res) => {
    try {
      if (!astraDb) {
        return res.status(500).json({ error: "Astra DB not initialized. Check ASTRA_DB_APPLICATION_TOKEN." });
      }
      const colls = await astraDb.listCollections();
      res.json({ success: true, collections: colls });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Bootstrap credentials to Astra DB
  app.post("/api/astra/bootstrap-creds", async (req, res) => {
    try {
      if (!astraDb) return res.status(500).json({ error: "Astra DB not initialized" });
      const { app_id, client_id, client_secret, private_key_pem, key_id, scim_token, login_url, redirect_uri } = req.body;
      const coll = astraDb.collection('application_credentials');
      
      await coll.updateOne(
        { _id: app_id },
        { 
          $set: { 
            client_id, 
            client_secret, 
            private_key_pem, 
            key_id,
            scim_token,
            login_url,
            redirect_uri,
            last_updated: new Date().toISOString()
          } 
        },
        { upsert: true }
      );
      
      res.json({ success: true, message: `Credentials for ${app_id} saved to Astra DB` });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ============================================================================
  // FDX Money Movement Implementation (Astra DB)
  // ============================================================================
  
  const INITIAL_PAYEES = [
    {
      _id: "payee-1",
      payeeId: "payee-1",
      merchant: {
        displayName: "Verizon Wireless",
        name: { company: "Verizon" },
        address: { line1: "123 Main St", city: "New York", region: "NY", postalCode: "10001" },
        phone: { type: "BUSINESS", country: "1", number: "8009220204" }
      },
      merchantAccountIds: ["88888"],
      status: "ACTIVE"
    },
    {
      _id: "payee-2",
      payeeId: "payee-2",
      merchant: {
        displayName: "Con Edison",
        name: { company: "ConEd" },
        address: { line1: "4 Irving Pl", city: "New York", region: "NY", postalCode: "10003" }
      },
      merchantAccountIds: ["99999"],
      status: "ACTIVE"
    }
  ];

  async function initAstraFDX() {
    if (!astraDb) return;
    try {
      const colls = await astraDb.listCollections();
      if (!colls.some((c: any) => c.name === 'fdx_payees')) {
        try {
          const coll = await astraDb.createCollection('fdx_payees');
          await coll.insertMany(INITIAL_PAYEES);
          console.log('Initialized FDX payees in Astra DB');
        } catch (createErr: any) {
          if (!createErr.message?.includes('already exists')) {
             console.error('Error creating fdx_payees collection:', createErr);
          }
        }
      }
      if (!colls.some((c: any) => c.name === 'fdx_payments')) {
        try {
          await astraDb.createCollection('fdx_payments');
        } catch (createErr: any) {
          if (!createErr.message?.includes('already exists')) {
             console.error('Error creating fdx_payments collection:', createErr);
          }
        }
      }
    } catch (err) {
      console.error('Astra FDX Init Error:', err);
    }
  }
  initAstraFDX();

  app.get("/api/billmgmt/billpay/v2/fdx/v6/payees", async (req, res) => {
    try {
      if (!astraDb) return res.json({ payees: INITIAL_PAYEES });
      const coll = astraDb.collection('fdx_payees');
      const payees = await coll.find({}).toArray();
      res.json({ payees });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/billmgmt/billpay/v2/fdx/v6/payments", async (req, res) => {
    try {
      if (!astraDb) return res.json({ payments: [] });
      const coll = astraDb.collection('fdx_payments');
      const payments = await coll.find({}).toArray();
      res.json({ payments });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // OAuth Callback
  app.get("/auth/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      console.error('OAuth Error:', error, error_description);
      return res.status(400).send(`Authentication failed: ${error_description || error}`);
    }

    if (!code || !state) {
      return res.status(400).send("Missing code or state");
    }

    try {
      // Ensure state is a string before parsing
      const stateStr = typeof state === 'string' ? state : JSON.stringify(state);
      const { service, userId } = JSON.parse(stateStr);
      
      let accessToken = '';
      let refreshToken = '';
      let externalAccountId = '';

      const appUrl = process.env.APP_URL || `https://${req.get('host')}`;
      const redirectUri = `${appUrl}/auth/callback`;

      if (service === 'stripe') {
        const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: process.env.STRIPE_CLIENT_ID || '',
            client_secret: process.env.STRIPE_SECRET_KEY || '',
            code: code as string
          })
        });
        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          accessToken = data.access_token;
          refreshToken = data.refresh_token;
          externalAccountId = data.stripe_user_id || '';
        } else {
          const errorText = await tokenResponse.text();
          console.error('Stripe Token Exchange Failed:', errorText);
          return res.status(400).send(`Stripe authentication failed: ${errorText}`);
        }
      } else if (service === 'citi') {
        const tokenResponse = await axios.post('https://partner.citi.com/gcgapi/sandbox/prod/openapi/iam/tokenManagement/partner/authCode/oauth2/cgw/v1/token/us/cgw',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: redirectUri
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(`${process.env.CITI_CLIENT_ID}:${process.env.CITI_CLIENT_SECRET}`).toString('base64')}`
            }
          }
        );
        const data = tokenResponse.data;
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
      } else if (service === 'aibanking') {
        const creds = await getAppCredentials('aibanking');
        const tokenParams: any = {
          grant_type: 'authorization_code',
          client_id: creds?.client_id || 'zt6OsWvRgUtQsISRILfGFr7XhxwC6JgY',
          code: code,
          redirect_uri: redirectUri
        };

        if (creds?.key_id) {
          tokenParams.key_id = creds.key_id;
        }

        const tokenResponse = await axios.post('https://mtls.auth.aibanking.dev/oauth/token', 
          new URLSearchParams(tokenParams),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent
          }
        );

        if (tokenResponse.status === 200) {
          const data = tokenResponse.data;
          accessToken = data.access_token;
          refreshToken = data.refresh_token;
        } else {
          throw new Error(`AI Banking token exchange failed with status ${tokenResponse.status}`);
        }
      }

      if (!accessToken) {
        throw new Error(`Failed to obtain access token for ${service}`);
      }
      
      // Store tokens in Redis for the user
      await redisClient.hSet(`user:${userId}:tokens`, service, JSON.stringify({ accessToken, refreshToken, externalAccountId, linkedAt: new Date().toISOString() }));
      
      res.send(`
        <html>
          <body style="background: #0A0A0A; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h2 style="color: #10b981;">Connection Successful!</h2>
              <p>Syncing your ${service} data...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    service: '${service}',
                    userId: '${userId}',
                    accessToken: '${accessToken}',
                    refreshToken: '${refreshToken}',
                    externalAccountId: '${externalAccountId}'
                  }, '*');
                  setTimeout(() => window.close(), 2000);
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send("Authentication failed");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server failed to start!", err);
  process.exit(1);
});
