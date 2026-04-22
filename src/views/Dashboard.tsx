import React, { useEffect, useState } from 'react';
import { LayoutDashboard, CreditCard, Landmark, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ModernTreasuryApi } from '@/src/api/ModernTreasuryApi';
import { auth } from '../firebase';

interface Account {
  id: string;
  name: string;
  balance: number;
}

export const Dashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Wait for auth to be ready
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('Dashboard: Waiting for authentication...');
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        const mtApi = new ModernTreasuryApi({ accessToken: token });
        const data = await mtApi.getAccounts();
        
        if (Array.isArray(data)) {
          setAccounts(data.map((acc: any) => ({
              id: acc.id,
              name: acc.name,
              balance: acc.balances?.current_balance || 0
          })));
        } else {
          console.error('Expected array of accounts, got:', data);
          setAccounts([]); 
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <LayoutDashboard /> Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => (
          <div key={account.id} className="bg-[#0D0D0D] p-6 rounded-3xl border border-white/5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <Landmark className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-white">{account.name}</h2>
            </div>
            <p className="text-3xl font-bold text-white">${(account.balance / 100).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0D0D0D] p-6 rounded-3xl border border-white/5 shadow-xl">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
            <Activity className="text-emerald-500" /> MT Account Balances
        </h2>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Bar dataKey="balance" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
