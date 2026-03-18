import React from 'react';

export const AccountBusinessProfileView: React.FC<{ data: any }> = ({ data }) => (
  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
    <h3 className="font-bold text-lg">AccountBusinessProfile</h3>
    <pre className="text-xs text-zinc-400">{JSON.stringify(data, null, 2)}</pre>
  </div>
);
