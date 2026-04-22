import React, { useState, useEffect } from 'react';
import { Activity, Users, CreditCard, ArrowRightLeft, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ModernTreasuryApi, ModernTreasuryResource } from '@/src/api/ModernTreasuryApi';
import { auth } from '../firebase';

export const ApisView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'counterparties' | 'internal_accounts' | 'virtual_accounts' | 'flows' | 'payment_orders'>('counterparties');
  const [data, setData] = useState<ModernTreasuryResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [flowToken, setFlowToken] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<'account_collection' | 'payment'>('account_collection');
  const [flowCounterparties, setFlowCounterparties] = useState<ModernTreasuryResource[]>([]);
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const [paymentOrder, setPaymentOrder] = useState({
    amount: '',
    currency: 'USD',
    direction: 'credit',
    originating_account_id: '',
    receiving_account_id: '',
    type: 'ach',
    description: 'Money movement via Aura'
  });

  const publishableKey = localStorage.getItem('mt_publishable_key') || '';

  const getMtApi = async () => {
    if (!user) throw new Error("Not authenticated");
    const token = await user.getIdToken();
    return new ModernTreasuryApi({
      accessToken: token
    });
  };

  const fetchData = async (resource: string) => {
    setLoading(true);
    setError(null);
    try {
      const mtApi = await getMtApi();
      let result: ModernTreasuryResource[] = [];
      if (resource === 'counterparties') {
        result = await mtApi.getCounterparties();
      } else if (resource === 'internal_accounts') {
        result = await mtApi.getInternalAccounts();
      } else if (resource === 'virtual_accounts') {
        result = await mtApi.getVirtualAccounts();
      }
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounterpartiesForFlow = async () => {
    try {
      const mtApi = await getMtApi();
      const result = await mtApi.getCounterparties();
      setFlowCounterparties(result);
      if (result.length > 0) {
        setSelectedCounterpartyId(result[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch counterparties for flow", err);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab !== 'flows') {
      fetchData(activeTab);
    } else {
      fetchCounterpartiesForFlow();
    }
  }, [activeTab, user]);

  const createFlow = async () => {
    if (!selectedCounterpartyId) {
      setError('Please select a counterparty first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const mtApi = await getMtApi();
      let result;
      if (flowType === 'account_collection') {
        result = await mtApi.createAccountCollectionFlow({
          counterparty_id: selectedCounterpartyId,
          payment_types: ['ach', 'wire', 'check'],
          receiving_countries: ['USA']
        });
      } else {
        const accounts = await mtApi.getInternalAccounts();
        if (!accounts[0]?.id) throw new Error('No internal accounts found');
        
        result = await mtApi.createPaymentFlow({
          counterparty_id: selectedCounterpartyId,
          amount: 1000,
          currency: 'USD',
          direction: 'debit',
          originating_account_id: accounts[0].id
        });
      }

      setFlowToken(result.client_token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const mtApi = await getMtApi();
      const res = await mtApi.createPaymentOrder({
        amount: parseFloat(paymentOrder.amount),
        currency: paymentOrder.currency,
        direction: paymentOrder.direction,
        originating_account_id: paymentOrder.originating_account_id,
        receiving_account_id: paymentOrder.receiving_account_id || undefined,
        type: paymentOrder.type,
        description: paymentOrder.description
      });
      setSuccess(`Payment order ${res.id} created successfully!`);
      setPaymentOrder({
        amount: '',
        currency: 'USD',
        direction: 'credit',
        originating_account_id: '',
        receiving_account_id: '',
        type: 'ach',
        description: 'Money movement via Aura'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Modern Treasury API</h2>
          <p className="text-zinc-500">Manage your treasury operations and payment flows</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          {[
            { id: 'counterparties', label: 'Counterparties', icon: Users },
            { id: 'internal_accounts', label: 'Internal', icon: Activity },
            { id: 'virtual_accounts', label: 'Virtual', icon: CreditCard },
            { id: 'flows', label: 'Flows', icon: ArrowRightLeft },
            { id: 'payment_orders', label: 'Payment Orders', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden">
        {activeTab === 'payment_orders' ? (
          <div className="p-8 max-w-2xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Move Money</h3>
                <p className="text-zinc-500 text-sm">Create a payment order to transfer funds between accounts.</p>
              </div>

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <p className="text-emerald-500 text-sm font-medium">{success}</p>
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  <p className="text-rose-500 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleCreatePaymentOrder} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentOrder.amount}
                      onChange={(e) => setPaymentOrder({...paymentOrder, amount: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Currency</label>
                    <select
                      value={paymentOrder.currency}
                      onChange={(e) => setPaymentOrder({...paymentOrder, currency: e.target.value})}
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Direction</label>
                    <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                      {['credit', 'debit'].map(dir => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => setPaymentOrder({...paymentOrder, direction: dir})}
                          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                            paymentOrder.direction === dir ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Type</label>
                    <select
                      value={paymentOrder.type}
                      onChange={(e) => setPaymentOrder({...paymentOrder, type: e.target.value})}
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="ach">ACH</option>
                      <option value="wire">Wire</option>
                      <option value="check">Check</option>
                      <option value="rtp">RTP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Originating Account ID</label>
                  <input
                    type="text"
                    required
                    value={paymentOrder.originating_account_id}
                    onChange={(e) => setPaymentOrder({...paymentOrder, originating_account_id: e.target.value })}
                    placeholder="acc_..."
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Found in 'Internal Accounts' tab</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Receiving Account ID (Optional)</label>
                  <input
                    type="text"
                    value={paymentOrder.receiving_account_id}
                    onChange={(e) => setPaymentOrder({...paymentOrder, receiving_account_id: e.target.value })}
                    placeholder="acc_..."
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Description</label>
                  <input
                    type="text"
                    value={paymentOrder.description}
                    onChange={(e) => setPaymentOrder({...paymentOrder, description: e.target.value })}
                    placeholder="Payment for..."
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Execute Payment Order
                </button>
              </form>
            </div>
          </div>
        ) : activeTab === 'flows' ? (
          <div className="p-8">
            {!flowToken ? (
              <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
                <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 mx-auto">
                    <ArrowRightLeft className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Create Modern Treasury Flow</h3>
                  <p className="text-zinc-500 text-sm">Select a counterparty and flow type to embed the UI.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Select Counterparty</label>
                    <select
                      value={selectedCounterpartyId}
                      onChange={(e) => setSelectedCounterpartyId(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="" disabled>Select a counterparty</option>
                      {flowCounterparties.map(cp => (
                        <option key={cp.id} value={cp.id}>{cp.name || cp.id}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Flow Type</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setFlowType('account_collection')}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                          flowType === 'account_collection'
                            ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                            : 'bg-[#0D0D0D] border-white/10 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        Account Collection
                      </button>
                      <button
                        onClick={() => setFlowType('payment')}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                          flowType === 'payment'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                            : 'bg-[#0D0D0D] border-white/10 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        Payment Flow
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={createFlow}
                    disabled={loading || !selectedCounterpartyId}
                    className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Create Flow
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Embeddable Flow</h3>
                    <p className="text-zinc-500 text-sm">Type: {flowType?.replace('_', ' ')}</p>
                  </div>
                  <button 
                    onClick={() => setFlowToken(null)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
                  >
                    Cancel Flow
                  </button>
                </div>
                
                {publishableKey && flowToken ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-blue-500 mb-2">Flow Created</h4>
                    <p className="text-zinc-400 text-sm mb-6">Flow token: {flowToken}</p>
                  </div>
                ) : (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-rose-500 mb-2">Publishable Key or Flow Token Missing</h4>
                    <p className="text-zinc-400 text-sm mb-6">You need to provide your Modern Treasury publishable key and create a flow first.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-bottom border-white/5">
                  <th className="px-8 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">ID</th>
                  <th className="px-8 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Name / Details</th>
                  <th className="px-8 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status</th>
                  <th className="px-8 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-rose-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-zinc-500">
                      No {activeTab.replace('_', ' ')} found.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-4">
                        <span className="font-mono text-xs text-zinc-500">{item.id}</span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="font-medium">{item.name || item.email || item.description || 'N/A'}</div>
                        <div className="text-xs text-zinc-500">{item.type || item.currency || ''}</div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                          Active
                        </span>
                      </td>
                      <td className="px-8 py-4 text-sm text-zinc-500">
                        {new Date(item.created_at || Date.now()).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
