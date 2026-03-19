import React, { useState } from 'react';
import { PlaidCredentials, MarqetaCredentials, ModernTreasuryCredentials } from '../types';

interface CredentialsFormProps {
  onSubmit: (plaid: PlaidCredentials, marqeta: MarqetaCredentials, mt: ModernTreasuryCredentials) => void;
}

export const CredentialsForm: React.FC<CredentialsFormProps> = ({ onSubmit }) => {
  const [plaid, setPlaid] = useState<PlaidCredentials>({ clientId: '', secret: '', environment: 'sandbox' });
  const [marqeta, setMarqeta] = useState<MarqetaCredentials>({ token: '', secret: '' });
  const [mt, setMt] = useState<ModernTreasuryCredentials>({ apiKey: '', organizationId: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(plaid, marqeta, mt);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 space-y-6">
      <h2 className="text-2xl font-bold text-white">Initialize Stack Credentials</h2>
      
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase">Plaid</h3>
        <input type="text" placeholder="Client ID" className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm" onChange={e => setPlaid({...plaid, clientId: e.target.value})} />
        <input type="password" placeholder="Secret" className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm" onChange={e => setPlaid({...plaid, secret: e.target.value})} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase">Marqeta</h3>
        <input type="text" placeholder="Token" className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm" onChange={e => setMarqeta({...marqeta, token: e.target.value})} />
        <input type="password" placeholder="Secret" className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm" onChange={e => setMarqeta({...marqeta, secret: e.target.value})} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase">Modern Treasury</h3>
        <input type="text" placeholder="API Key" className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm" onChange={e => setMt({...mt, apiKey: e.target.value})} />
        <input type="text" placeholder="Organization ID" className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm" onChange={e => setMt({...mt, organizationId: e.target.value})} />
      </div>

      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-colors">
        Initialize Stack
      </button>
    </form>
  );
};
