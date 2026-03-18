import React, { useState } from 'react';
import { Loader2, Plus, Database } from 'lucide-react';

export const LedgerDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const mineEntry = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ledger/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          computeEventId: `comp_${Math.random().toString(36).substring(7)}`,
          amount: Math.floor(Math.random() * 1000),
          currency: 'USD',
          type: 'credit'
        })
      });
      
      if (!response.ok) throw new Error('Failed to mine ledger entry');
      
      const data = await response.json();
      setEntry(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Sovereign Ledger</h3>
          <p className="text-zinc-500 text-sm">Mining compute-to-financial events</p>
        </div>
        <button 
          onClick={mineEntry}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Mine Entry
        </button>
      </div>

      {error && <div className="text-rose-500 text-sm">{error}</div>}

      {entry && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-xs space-y-2">
          <div className="text-emerald-500">ENTRY MINED SUCCESSFULLY</div>
          <div><span className="text-zinc-500">ID:</span> {entry.ledgerId}</div>
          <div><span className="text-zinc-500">COMPUTE:</span> {entry.computeEventId}</div>
          <div><span className="text-zinc-500">AMOUNT:</span> {entry.amount} {entry.currency}</div>
          <div><span className="text-zinc-500">TIMESTAMP:</span> {entry.timestamp}</div>
        </div>
      )}
    </div>
  );
};
