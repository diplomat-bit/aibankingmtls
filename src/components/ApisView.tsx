import React from 'react';

const apis = [
  'AiApi',
  'AuthApi'
];

export const ApisView: React.FC = () => {
  return (
    <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8">
      <h2 className="text-xl font-bold mb-6">Available APIs</h2>
      <ul className="space-y-2">
        {apis.map(api => (
          <li key={api} className="text-zinc-400 font-mono text-sm bg-white/5 p-2 rounded-lg">{api}</li>
        ))}
      </ul>
    </div>
  );
};
