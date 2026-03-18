import React from 'react';

export const AccountView: React.FC<{ data: any }> = ({ data }) => (
  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
    <h3 className="font-bold text-lg">Account</h3>
    <pre className="text-xs text-zinc-400">{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export const AccountBusinessProfileView: React.FC<{ data: any }> = ({ data }) => (
  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
    <h3 className="font-bold text-lg">AccountBusinessProfile</h3>
    <pre className="text-xs text-zinc-400">{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export const AddressView: React.FC<{ data: any }> = ({ data }) => (
  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
    <h3 className="font-bold text-lg">Address</h3>
    <pre className="text-xs text-zinc-400">{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export const AccountCapabilitiesView: React.FC<{ data: any }> = ({ data }) => (
  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
    <h3 className="font-bold text-lg">AccountCapabilities</h3>
    <pre className="text-xs text-zinc-400">{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export const AccountCardIssuingSettingsView: React.FC<{ data: any }> = ({ data }) => (
  <div className="p-4 border border-white/10 rounded-xl bg-white/5">
    <h3 className="font-bold text-lg">AccountCardIssuingSettings</h3>
    <pre className="text-xs text-zinc-400">{JSON.stringify(data, null, 2)}</pre>
  </div>
);
