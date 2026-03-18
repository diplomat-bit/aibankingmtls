import React from 'react';

export const ConfigTab: React.FC = () => {
  const appUrl = window.location.origin;
  const callbackUrl = `${appUrl}/auth/callback`;

  return (
    <div className="p-6 bg-[#0D0D0D] border border-white/5 rounded-3xl space-y-6">
      <h2 className="text-2xl font-bold text-white">Configuration</h2>
      <p className="text-zinc-400">Configure your API credentials and webhooks in your provider dashboards.</p>
      
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-2">OAuth Callback URL</h3>
        <p className="text-zinc-500 font-mono text-sm bg-black p-2 rounded">{callbackUrl}</p>
        <p className="text-zinc-400 text-xs mt-2">Use this URL in your Stripe, Citi, and AI Banking dashboards.</p>
      </div>

      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-2">Webhook Endpoints</h3>
        <ul className="text-zinc-400 text-sm list-disc list-inside space-y-1">
          <li>Modern Treasury: <span className="font-mono text-emerald-500">{appUrl}/api/webhooks/modern-treasury</span></li>
          <li>Stripe: <span className="font-mono text-emerald-500">{appUrl}/api/webhooks/stripe</span></li>
        </ul>
      </div>
    </div>
  );
};
