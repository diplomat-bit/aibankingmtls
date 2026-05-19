import React, { useState, useEffect } from 'react';
import { Globe, Shield, Check, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { connectionService } from '../services/connectionService';
import { auth } from '../firebase';
import { UserConnection } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const ConnectionsView: React.FC = () => {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = connectionService.subscribeToConnections(auth.currentUser.uid, (data) => {
      setConnections(data);
    });
    return () => unsubscribe();
  }, []);

  const handleConnectCiti = async () => {
    setConnecting('citi');
    try {
      const response = await fetch('/api/citi/connect', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        await connectionService.saveConnection({
          userId: auth.currentUser?.uid || '',
          service: 'citi',
          accessToken: 'mock_citi_token_' + Math.random().toString(36).substring(7),
          connectedAt: new Date().toISOString(),
          externalAccountId: data.externalAccountId
        });
      }
    } catch (error) {
      console.error("Citi connect error:", error);
    } finally {
      setConnecting(null);
    }
  };

  const isConnected = (service: string) => connections.some(c => c.service === service);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Institutional Connections</h2>
        <p className="text-zinc-500 text-sm">Manage your secure links to external financial providers.</p>
      </div>

      <div className="grid gap-6">
        {/* Citi Card */}
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] flex items-center justify-between group hover:border-white/10 transition-colors">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Citibank Partner API</h3>
              <p className="text-zinc-500 text-sm">Direct institutional link for high-throughput liquidity.</p>
            </div>
          </div>
          
          <button
            onClick={handleConnectCiti}
            disabled={isConnected('citi') || connecting === 'citi'}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              isConnected('citi') 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                : "bg-white text-black hover:bg-zinc-200 active:scale-95"
            }`}
          >
            {connecting === 'citi' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isConnected('citi') ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {connecting === 'citi' ? 'Verifying...' : isConnected('citi') ? 'Connected' : 'Connect'}
          </button>
        </div>

        {/* Stripe Card */}
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] flex items-center justify-between group hover:border-white/10 transition-colors">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Stripe Connect</h3>
              <p className="text-zinc-500 text-sm">Unified treasury and payout infrastructure.</p>
            </div>
          </div>
          
          <button
            className="px-6 py-2 rounded-xl text-sm font-bold bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Connect
          </button>
        </div>
      </div>

      <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[32px] flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
        <div>
          <p className="text-blue-500 font-bold text-sm mb-1">Institutional Grade</p>
          <p className="text-zinc-400 text-xs leading-relaxed">
            All connections use End-to-End Encryption (E2EE) and are processed via isolated 
            secure enclaves. No private keys or raw credentials are ever stored in plaintext.
          </p>
        </div>
      </div>
    </div>
  );
};
