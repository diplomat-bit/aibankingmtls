import React from 'react';
import { Transaction, Account } from '../types';

export const Dashboard: React.FC<{ accounts: Account[], transactions: Transaction[] }> = ({ accounts, transactions }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-[#0D0D0D] border border-white/5 p-6 rounded-3xl">
            <p className="text-zinc-500 text-sm">{acc.type.toUpperCase()}</p>
            <h3 className="text-3xl font-bold">${acc.balance.toLocaleString()}</h3>
            <p className="text-zinc-600 text-xs mt-2">{acc.accountNumber}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-white/5">
          {transactions.map(tx => (
            <div key={tx.id} className="p-4 flex justify-between items-center bg-white/0 hover:bg-white/5 transition-colors">
              <div>
                <p className="font-semibold">{tx.description}</p>
                <p className="text-zinc-500 text-xs">{tx.category}</p>
              </div>
              <p className={tx.amount < 0 ? "text-white" : "text-emerald-500"}>
                {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
