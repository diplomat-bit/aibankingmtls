import React from 'react';
import { LiFiWidget, WidgetConfig } from '@lifi/widget';

export default function Web3View() {
  const widgetConfig: WidgetConfig = {
    integrator: 'Aura AI Bank',
    theme: {
      palette: {
        primary: { main: '#10b981' },
        secondary: { main: '#3f3f46' },
        background: {
          default: '#09090b',
          paper: '#18181b',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a1a1aa',
        },
      },
      shape: {
        borderRadius: 16,
        borderRadiusSecondary: 16,
      },
    },
    appearance: 'dark',
    hiddenUI: ['appearance', 'language', 'poweredBy'],
    variant: 'expandable' as any,
    subvariant: 'split' as any,
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-[#0D0D0D] border border-white/5 rounded-3xl p-8">
        <div>
          <h3 className="text-2xl font-bold mb-2">Web3 Wallet</h3>
          <p className="text-zinc-500">Wallet connection is currently disabled.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Li.Fi Widget for Swaps & Bridges */}
        <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[600px]">
          <LiFiWidget config={widgetConfig} integrator="Aura AI Bank" />
        </div>

        {/* Placeholder for Portfolio/NFTs if needed, or just info */}
        <div className="space-y-8">
          <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-4">Portfolio Overview</h3>
            <p className="text-zinc-500 mb-6">Wallet connection is currently disabled.</p>
            <div className="p-6 border border-white/10 rounded-2xl bg-white/5 text-center">
              <p className="text-sm text-zinc-400">Token balances and NFTs will appear here once enabled.</p>
            </div>
          </div>

          <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
            <div className="p-6 border border-white/10 rounded-2xl bg-white/5 text-center">
              <p className="text-sm text-zinc-400">Transaction history will appear here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
