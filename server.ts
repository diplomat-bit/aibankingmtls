import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Gemini Advisor Endpoint
  app.post('/api/gemini/advisor', async (req, res) => {
    try {
      const { userMessage, transactions, accounts } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are Aura, an intelligent financial advisor for Aura AI Bank. 
          You have access to the user's accounts and recent transactions.
          Provide concise, helpful, and personalized financial advice.
          Be professional yet approachable.
          
          Current Accounts: ${JSON.stringify(accounts)}
          Recent Transactions: ${JSON.stringify(transactions)}
          
          Note: You are part of a sophisticated banking platform that supports over 2,200 financial data models, including integrations with Plaid, Stripe, Modern Treasury, and Citi.`,
        },
        contents: userMessage,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Advisor Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Gemini Categorization Endpoint
  app.post('/api/gemini/categorize', async (req, res) => {
    try {
      const { description } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "Categorize the following bank transaction description into one of these categories: Food, Transport, Utilities, Entertainment, Shopping, Health, Income, Other. Return only the category name.",
        },
        contents: description,
      });

      res.json({ category: response.text?.trim() || "Other" });
    } catch (error: any) {
      console.error("Gemini Categorization Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Citibank OAuth URL (Real integration)
  app.get('/api/auth/citi/url', (req, res) => {
    const clientId = process.env.CITI_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'CITI_CLIENT_ID not configured in environment variables.' });
    }

    const appUrl = process.env.APP_URL || `https://${process.env.AIS_PROJECT_ID}-22946357919.us-west1.run.app`;
    const redirectUri = `${appUrl}/auth/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'accounts_details',
      state: 'citi_auth_state'
    });

    const authUrl = `https://sandbox.developer.citi.com/citidirect/v1/auth/oauth/authorize?${params}`;
    res.json({ url: authUrl });
  });

  // OAuth Callback (shared handler)
  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('No code provided by OAuth provider.');
    }

    try {
      const clientId = process.env.CITI_CLIENT_ID;
      const clientSecret = process.env.CITI_CLIENT_SECRET;
      
      const appUrl = process.env.APP_URL || `https://${process.env.AIS_PROJECT_ID}-22946357919.us-west1.run.app`;
      const redirectUri = `${appUrl}/auth/callback`;

      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenResponse = await axios.post('https://sandbox.developer.citi.com/citidirect/v1/auth/oauth/token', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body style="background: #0A0A0A; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="text-align: center;">
              <h2 style="color: #10B981;">Connection Successful</h2>
              <p>Your Citibank account has been linked. Closing window...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    service: 'citi',
                    tokens: ${JSON.stringify(tokenResponse.data)}
                  }, '*');
                  setTimeout(() => window.close(), 1500);
                } else {
                  window.location.href = '/?citi_success=true';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Citi OAuth Error:', error.response?.data || error.message);
      res.status(500).send(`
        <html>
          <body style="background: #0A0A0A; color: white; font-family: sans-serif; padding: 2rem;">
            <h1 style="color: #EF4444;">Authentication Failed</h1>
            <p>${error.response?.data?.error_description || error.message}</p>
            <p>Please check your CITI_CLIENT_SECRET and configuration.</p>
            <button onclick="window.close()" style="background: white; color: black; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer;">Close Window</button>
          </body>
        </html>
      `);
    }
  });

  // Citibank Connect Mock Endpoint (legacy)
  app.post('/api/citi/connect', async (req, res) => {
    res.json({ 
      success: true, 
      message: "Successfully connected to Citibank Partner APIs.",
      externalAccountId: "citi_" + Math.random().toString(36).substring(7)
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aura Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start Aura server:", err);
});
