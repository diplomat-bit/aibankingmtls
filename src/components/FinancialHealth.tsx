import React from 'react';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface InsightProps {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'neutral';
  icon: React.ReactNode;
}

const Insight: React.FC<InsightProps> = ({ title, description, type, icon }) => {
  const colors = {
    positive: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    neutral: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  };

  return (
    <div className={`p-4 rounded-2xl border ${colors[type]} flex gap-4`}>
      <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-sm mb-1">{title}</h4>
        <p className="text-xs opacity-70 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export const FinancialHealth: React.FC = () => {
  return (
    <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          Financial Health Insights
        </h3>
        <div className="text-xs font-bold px-3 py-1 bg-emerald-500 text-black rounded-full">
          SCORE: 782
        </div>
      </div>

      <div className="space-y-4">
        <Insight 
          title="Optimal Liquidity"
          description="Your current cash reserves cover 4.2 months of typical expenses, exceeding the recommended 3-month buffer."
          type="positive"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <Insight 
          title="Subscription Creep"
          description="We detected 3 new recurring charges this month. Consider reviewing your active subscriptions to optimize cash flow."
          type="warning"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <Insight 
          title="Investment Opportunity"
          description="Based on your risk profile (Moderate-Aggressive), you have $2,400 in idle cash that could be reallocated to your ETF portfolio."
          type="neutral"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500 font-medium">Risk Exposure</span>
          <span className="text-xs font-bold text-emerald-500">LOW</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '25%' }}
            className="h-full bg-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
