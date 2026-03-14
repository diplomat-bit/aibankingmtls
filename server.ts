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
import { auth } from "express-oauth2-jwt-bearer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT Middleware configuration
const secret = process.env.AUTH0_JWT_SECRET;
if (!secret) {
  throw new Error('AUTH0_JWT_SECRET environment variable is required');
}
const jwtCheck = auth({
  secret: secret,
  audience: 'https://auth.aibanking.dev/api',
  issuerBaseURL: 'https://auth.aibanking.dev/',
  tokenSigningAlg: 'HS256'
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure mTLS certificates exist
  const { cert, key } = ensureCertsExist();
  const httpsAgent = new https.Agent({ cert, key });

  app.use(express.json());

  // Protect API routes
  app.use('/api', jwtCheck);

  // API routes
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe API Integration
  app.get("/api/stripe/balance", async (req, res) => {
    try {
      const { stripeAccountId } = req.query;
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: "Stripe secret key not configured" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' });
      const balance = await stripe.balance.retrieve(
        stripeAccountId ? { stripeAccount: stripeAccountId as string } : undefined
      );
      res.json(balance);
    } catch (error) {
      console.error("Stripe API Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Modern Treasury API Integration
  app.get("/api/modern_treasury/accounts", async (req, res) => {
    try {
      if (!process.env.MODERN_TREASURY_API_KEY || !process.env.MODERN_TREASURY_ORGANIZATION_ID) {
        return res.status(500).json({ error: "Modern Treasury credentials not configured" });
      }

      const mt = new ModernTreasury({
        apiKey: process.env.MODERN_TREASURY_API_KEY,
        organizationID: process.env.MODERN_TREASURY_ORGANIZATION_ID,
      });
      
      const accounts = await mt.internalAccounts.list();
      res.json(accounts);
    } catch (error) {
      console.error("Modern Treasury API Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Modern Treasury Ledgers Integration
  app.get("/api/modern_treasury/ledgers", async (req, res) => {
    try {
      if (!process.env.MODERN_TREASURY_API_KEY || !process.env.MODERN_TREASURY_ORGANIZATION_ID) {
        return res.status(500).json({ error: "Modern Treasury credentials not configured" });
      }

      const mt = new ModernTreasury({
        apiKey: process.env.MODERN_TREASURY_API_KEY,
        organizationID: process.env.MODERN_TREASURY_ORGANIZATION_ID,
      });
      
      const ledgers = await mt.ledgers.list();
      res.json(ledgers);
    } catch (error) {
      console.error("Modern Treasury Ledger API Error:", error);
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

    if (service === 'modern_treasury') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.MODERN_TREASURY_CLIENT_ID!,
        redirect_uri: redirectUri,
        state: JSON.stringify({ service, userId })
      });
      return res.redirect(`https://app.moderntreasury.com/oauth/authorize?${params}`);
    }

    if (service === 'aibanking') {
      try {
        // Try PAR first with mTLS
        const parResponse = await axios.post('https://auth.aibanking.dev/oauth/par', 
          new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'openid profile email offline_access',
            audience: 'https://auth.aibanking.dev/userinfo',
            state: JSON.stringify({ service, userId })
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent
          }
        );

        if (parResponse.status === 201 || parResponse.status === 200) {
          const { request_uri } = parResponse.data;
          return res.redirect(`https://auth.aibanking.dev/authorize?request_uri=${request_uri}&client_id=${clientId}`);
        }
      } catch (error: any) {
        console.error('PAR Error, falling back:', error.response?.data || error.message);
      }

      // Fallback to standard
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email offline_access',
        audience: 'https://aibanking.us.auth0.com/userinfo',
        state: JSON.stringify({ service, userId })
      });
      return res.redirect(`https://auth.aibanking.dev/authorize?${params}`);
    }

    res.status(400).send('Invalid service');
  });

  // OAuth URL generation (keeping for backward compatibility or other uses)
  app.get("/api/auth/url", async (req, res) => {
    const { service, userId } = req.query;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/callback`;

    if (service === 'stripe') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.STRIPE_CLIENT_ID!,
        scope: 'read_write',
        redirect_uri: redirectUri,
        state: JSON.stringify({ service, userId })
      });
      return res.json({ url: `https://connect.stripe.com/oauth/authorize?${params}` });
    }

    if (service === 'modern_treasury') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.MODERN_TREASURY_CLIENT_ID!,
        redirect_uri: redirectUri,
        state: JSON.stringify({ service, userId })
      });
      return res.json({ url: `https://app.moderntreasury.com/oauth/authorize?${params}` });
    }

    if (service === 'aibanking') {
      const clientId = process.env.AIBANKING_CLIENT_ID || 'zt6OsWvRgUtQsISRILfGFr7XhxwC6JgY';
      
      try {
        // Pushed Authorization Request (PAR) with mTLS
        const parResponse = await axios.post('https://aibanking.us.auth0.com/oauth/par', 
          new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'openid profile email offline_access',
            audience: 'https://auth.aibanking.dev/userinfo',
            state: JSON.stringify({ service, userId })
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent
          }
        );

        if (parResponse.status === 201 || parResponse.status === 200) {
          const { request_uri } = parResponse.data;
          return res.json({ 
            url: `https://auth.aibanking.dev/authorize?request_uri=${request_uri}&client_id=${clientId}` 
          });
        }
      } catch (error: any) {
        console.error('PAR Error:', error.response?.data || error.message);
      }

      // Fallback to standard authorize if PAR fails or is not supported
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email offline_access',
        audience: 'https://auth.aibanking.dev/userinfo',
        state: JSON.stringify({ service, userId })
      });
      return res.json({ url: `https://auth.aibanking.dev/authorize?${params}` });
    }

    res.status(400).json({ error: 'Invalid service' });
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
      
      let accessToken = `mock_${service}_access_token_${Math.random().toString(36).substring(7)}`;
      let refreshToken = `mock_${service}_refresh_token_${Math.random().toString(36).substring(7)}`;
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
          refreshToken = data.refresh_token || refreshToken;
          externalAccountId = data.stripe_user_id || '';
        } else {
          console.error('Stripe Token Exchange Failed:', await tokenResponse.text());
        }
      } else if (service === 'modern_treasury') {
        const tokenResponse = await fetch('https://app.moderntreasury.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: process.env.MODERN_TREASURY_CLIENT_ID,
            client_secret: process.env.MODERN_TREASURY_CLIENT_SECRET,
            code: code,
            redirect_uri: redirectUri
          })
        });
        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          accessToken = data.access_token;
          refreshToken = data.refresh_token || refreshToken;
        } else {
          console.error('Modern Treasury Token Exchange Failed:', await tokenResponse.text());
        }
      } else if (service === 'aibanking') {
        try {
          const tokenResponse = await axios.post('https://auth.aibanking.dev/oauth/token', 
            {
              grant_type: 'authorization_code',
              client_id: process.env.AIBANKING_CLIENT_ID || 'zt6OsWvRgUtQsISRILfGFr7XhxwC6JgY',
              code: code,
              redirect_uri: redirectUri
            },
            {
              headers: { 'Content-Type': 'application/json' },
              httpsAgent
            }
          );

          if (tokenResponse.status === 200) {
            const data = tokenResponse.data;
            accessToken = data.access_token;
            refreshToken = data.refresh_token || refreshToken;
          }
        } catch (error: any) {
          console.error('AI Banking Token Exchange Failed:', error.response?.data || error.message);
        }
      }
      
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

  // ============================================================================
  // SCIM Provisioning Implementation
  // Maps SCIM v2 attributes to Auth0 profile attributes as requested
  // ============================================================================
  
  const AUTH0_SCIM_URL = 'https://auth.aibanking.dev/scim/v2/connections/con_KmWlzuo4fspYtX2u/Users';

  // 1. Endpoint to RECEIVE SCIM requests and map them to Auth0 format
  app.post('/api/scim/v2/Users', async (req, res) => {
    try {
      const scimUser = req.body;
      const auth0User: any = { app_metadata: {} };
      
      // Apply the exact SCIM -> Auth0 mapping
      if (scimUser.userName) auth0User.username = scimUser.userName;
      
      const primaryEmail = scimUser.emails?.find((e: any) => e.primary)?.value || scimUser.emails?.[0]?.value;
      if (primaryEmail) auth0User.email = primaryEmail;
      
      if (scimUser.externalId) auth0User.app_metadata.external_id = scimUser.externalId;
      if (scimUser.active !== undefined) auth0User.blocked = !scimUser.active;
      if (scimUser.displayName) auth0User.name = scimUser.displayName;
      if (scimUser.name?.givenName) auth0User.given_name = scimUser.name.givenName;
      if (scimUser.name?.familyName) auth0User.family_name = scimUser.name.familyName;
      if (scimUser.nickName) auth0User.nickname = scimUser.nickName;
      
      const photo = scimUser.photos?.find((p: any) => p.type === 'photo')?.value || scimUser.photos?.[0]?.value;
      if (photo) auth0User.picture = photo;
      
      const workPhone = scimUser.phoneNumbers?.find((p: any) => p.type === 'work')?.value;
      if (workPhone) auth0User.app_metadata.work_phone_number = workPhone;
      
      const homePhone = scimUser.phoneNumbers?.find((p: any) => p.type === 'home')?.value;
      if (homePhone) auth0User.app_metadata.home_phone_number = homePhone;
      
      const mobilePhone = scimUser.phoneNumbers?.find((p: any) => p.type === 'mobile')?.value;
      if (mobilePhone) auth0User.app_metadata.mobile_phone_number = mobilePhone;
      
      const workAddress = scimUser.addresses?.find((a: any) => a.type === 'work');
      if (workAddress) {
        if (workAddress.streetAddress) auth0User.app_metadata.street_address = workAddress.streetAddress;
        if (workAddress.locality) auth0User.app_metadata.city = workAddress.locality;
        if (workAddress.region) auth0User.app_metadata.state = workAddress.region;
        if (workAddress.postalCode) auth0User.app_metadata.postal_code = workAddress.postalCode;
        if (workAddress.formatted) auth0User.app_metadata.postal_address = workAddress.formatted;
        if (workAddress.country) auth0User.app_metadata.country = workAddress.country;
      }
      
      if (scimUser.profileUrl) auth0User.app_metadata.profile_url = scimUser.profileUrl;
      if (scimUser.userType) auth0User.app_metadata.user_type = scimUser.userType;
      if (scimUser.title) auth0User.app_metadata.title = scimUser.title;
      if (scimUser.preferredLanguage) auth0User.app_metadata.language = scimUser.preferredLanguage;
      if (scimUser.locale) auth0User.app_metadata.locale = scimUser.locale;
      if (scimUser.timezone) auth0User.app_metadata.timezone = scimUser.timezone;
      if (scimUser.entitlements) auth0User.app_metadata.entitlements = scimUser.entitlements;
      if (scimUser.roles) auth0User.app_metadata.roles = scimUser.roles;
      
      const enterprise = scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];
      if (enterprise) {
        if (enterprise.employeeNumber) auth0User.app_metadata.employee_id = enterprise.employeeNumber;
        if (enterprise.costCenter) auth0User.app_metadata.cost_center = enterprise.costCenter;
        if (enterprise.organization) auth0User.app_metadata.organization = enterprise.organization;
        if (enterprise.division) auth0User.app_metadata.division = enterprise.division;
        if (enterprise.department) auth0User.app_metadata.department = enterprise.department;
        if (enterprise.manager) auth0User.app_metadata.manager = enterprise.manager;
      }

      console.log("Mapped SCIM User to Auth0 format:", auth0User);
      
      // Return standard SCIM response
      res.status(201).json({
        ...scimUser,
        id: auth0User.app_metadata.external_id || `usr_${Date.now()}`,
        meta: {
          resourceType: "User",
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: String(error), status: "500" });
    }
  });

  // 2. Endpoint to PUSH a local user to the Auth0 SCIM Connection
  app.post('/api/scim/push-to-auth0', async (req, res) => {
    try {
      const { user } = req.body; // Local user object
      
      // Construct SCIM payload based on the reverse of the mapping
      const scimPayload = {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"],
        userName: user.username || user.email,
        emails: [{ primary: true, value: user.email }],
        externalId: user.uid || user.id,
        active: !user.blocked,
        displayName: user.name || user.displayName,
        name: {
          givenName: user.given_name || user.displayName?.split(' ')[0] || '',
          familyName: user.family_name || user.displayName?.split(' ').slice(1).join(' ') || ''
        }
      };

      const scimToken = process.env.AUTH0_SCIM_TOKEN;
      if (!scimToken) {
        return res.status(500).json({ error: 'AUTH0_SCIM_TOKEN environment variable is required' });
      }

      const response = await fetch(AUTH0_SCIM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/scim+json',
          'Authorization': `Bearer ${scimToken}`
        },
        body: JSON.stringify(scimPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: String(error) });
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

startServer();
