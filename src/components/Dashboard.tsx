import React, { useEffect, useState } from 'react';
import { LayoutDashboard, CreditCard, Landmark, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      try {
        const response = await fetch('/api/modern_treasury/accounts');
        const data = await response.json();
        // Assuming data is an array of accounts, mapping to our interface
        setAccounts(data.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            balance: acc.balances?.current_balance || 0
        })));
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <LayoutDashboard /> Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => (
          <div key={account.id} className="bg-white p-6 rounded-xl shadow-md border border-zinc-200">
            <div className="flex items-center gap-3 mb-4">
              <Landmark className="text-indigo-600" />
              <h2 className="font-semibold">{account.name}</h2>
            </div>
            <p className="text-3xl font-bold">${(account.balance / 100).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-zinc-200">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity /> Account Balances
        </h2>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="balance" fill="#4f46e5" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
