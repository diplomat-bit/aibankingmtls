import React, { useState, useEffect } from 'react';
import { FdxMoneyMovementApi } from '../../api/FdxMoneyMovementApi';
import { FdxPayee, FdxPayment, FdxRecurringPayment } from '../types';
import { 
  Users, 
  CreditCard, 
  Repeat, 
  Search, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  Phone,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const api = new FdxMoneyMovementApi();

export const FdxView: React.FC = () => {
  const [payees, setPayees] = useState<FdxPayee[]>([]);
  const [payments, setPayments] = useState<FdxPayment[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<FdxRecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payees' | 'payments' | 'recurring'>('payees');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [payeesRes, paymentsRes, recurringRes] = await Promise.all([
          api.searchForPayees(),
          api.searchForPayments(),
          api.searchForRecurringPayments()
        ]);
        setPayees(payeesRes.payees);
        setPayments(paymentsRes.payments);
        setRecurringPayments(recurringRes.recurringPayments);
      } catch (error) {
        console.error("Error fetching FDX data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'PROCESSED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'FAILED':
      case 'REJECTED':
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'PENDING':
      case 'PROCESSING':
      case 'SCHEDULED':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-zinc-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('payees')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'payees' ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-white"
          )}
        >
          <Users className="w-4 h-4" />
          Payees
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'payments' ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-white"
          )}
        >
          <CreditCard className="w-4 h-4" />
          Payments
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'recurring' ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-white"
          )}
        >
          <Repeat className="w-4 h-4" />
          Recurring
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'payees' && (
          <motion.div
            key="payees"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {payees.map(payee => (
              <div key={payee.payeeId} className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">{payee.merchant.displayName}</h4>
                      <p className="text-sm text-zinc-500">{payee.merchant.name.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg">
                    {getStatusIcon(payee.status)}
                    <span className="text-xs font-bold uppercase tracking-wider">{payee.status}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {payee.merchant.address && (
                    <div className="flex items-start gap-3 text-sm text-zinc-400">
                      <MapPin className="w-4 h-4 mt-0.5 text-zinc-500" />
                      <div>
                        <p>{payee.merchant.address.line1}</p>
                        <p>{payee.merchant.address.city}, {payee.merchant.address.region} {payee.merchant.address.postalCode}</p>
                      </div>
                    </div>
                  )}
                  {payee.merchant.phone && (
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <Phone className="w-4 h-4 text-zinc-500" />
                      <p>+{payee.merchant.phone.country} {payee.merchant.phone.number}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Account IDs</p>
                    <div className="flex flex-wrap gap-2">
                      {payee.merchantAccountIds.map(id => (
                        <span key={id} className="px-2 py-1 bg-white/5 rounded text-xs font-mono">{id}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-bottom border-white/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500 tracking-wider">Payment ID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500 tracking-wider">Payee</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500 tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500 tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500 tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map(pmt => (
                  <tr key={pmt.paymentId} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">{pmt.paymentId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-zinc-400">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{payees.find(p => p.payeeId === pmt.toPayeeId)?.merchant.displayName || pmt.toPayeeId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-500">${pmt.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{format(new Date(pmt.dueDate), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pmt.status)}
                        <span className="text-xs font-bold uppercase tracking-wider">{pmt.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'recurring' && (
          <motion.div
            key="recurring"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {recurringPayments.map(rec => (
              <div key={rec.recurringPaymentId} className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                        <Repeat className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold">{payees.find(p => p.payeeId === rec.toPayeeId)?.merchant.displayName || rec.toPayeeId}</h4>
                        <p className="text-sm text-zinc-500">{rec.frequency} Payment</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg">
                      {getStatusIcon(rec.status)}
                      <span className="text-xs font-bold uppercase tracking-wider">{rec.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Amount</p>
                      <p className="text-2xl font-bold text-emerald-500">${rec.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Next Due Date</p>
                      <p className="text-lg font-medium">{format(new Date(rec.dueDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span>{rec.duration.type === 'NOEND' ? 'Ongoing' : `${rec.duration.numberOfTimes} times`}</span>
                    </div>
                    <button className="text-sm font-bold text-emerald-500 hover:text-emerald-400 transition-colors">Edit Schedule</button>
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
