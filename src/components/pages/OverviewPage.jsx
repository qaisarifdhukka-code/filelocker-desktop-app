import React, { useState, useEffect } from 'react';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../../AppContext';

function getFormattedSizeParts(bytes) {
  if (!bytes) return { value: '0', unit: 'B' };
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return { value: parseFloat((bytes / Math.pow(k, i)).toFixed(1)), unit: sizes[i] };
}

export default function OverviewPage() {
  const { setActiveTab, hardwareId, timeZone } = useAppContext();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLinks = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (hardwareId) headers['x-creator-id'] = hardwareId;

        const res = await fetch('https://api.filelocker.online/api/links/dashboard', { headers });
        const data = await res.json();

        if (res.ok) {
          setLinks(data.links || []);
        } else {
          setError(data.error || 'Failed to fetch links');
        }
      } catch (err) {
        setError('Network error connecting to the secure link server.');
      } finally {
        setLoading(false);
      }
    };
    
    if (hardwareId) {
        fetchLinks();
    }
  }, [hardwareId]);

  const totalDeliveries = links.length;
  const activeVaults = links.filter(l => l.status === 'active').length;
  const revokedVaults = links.filter(l => l.status === 'revoked').length;
  const totalSizeBytes = links.reduce((sum, l) => sum + (l.file_size || 0), 0);
  const formattedSize = getFormattedSizeParts(totalSizeBytes);
  
  const recentLinks = links.slice(0, 5); // Show top 5

  return (
    <div className="flex flex-col max-w-6xl w-full mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[28px] font-medium text-gray-900 mb-1">Welcome Back!</h1>
          <p className="text-[15px] text-gray-500">Secure your files and manage encrypted offline vaults.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 shadow-sm flex items-center gap-2 hidden sm:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button 
            onClick={() => setActiveTab('new_delivery')}
            className="flex items-center justify-center gap-2 py-2 px-5 rounded-lg bg-[#18181B] font-medium text-white text-[13px] hover:bg-black focus:outline-none shadow-sm transition-colors"
          >
            <Plus size={16} />
            Create Delivery
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-gray-50 rounded-md">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-900"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
            </div>
            <span className="text-[13px] font-medium text-gray-500">Total Deliveries</span>
          </div>
          <div className="text-[32px] font-medium text-gray-900 leading-none mb-4">
            {loading ? <Loader2 className="animate-spin w-6 h-6 text-gray-300" /> : totalDeliveries}
          </div>
          <div className="flex items-center gap-1 text-[12px] font-medium text-gray-400">
            Based on available data
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-gray-50 rounded-md">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-900"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <span className="text-[13px] font-medium text-gray-500">Active Vaults</span>
          </div>
          <div className="text-[32px] font-medium text-gray-900 leading-none mb-4">
            {loading ? <Loader2 className="animate-spin w-6 h-6 text-gray-300" /> : activeVaults}
          </div>
          <div className="flex items-center gap-1 text-[12px] font-medium text-gray-400">
            Currently accessible
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-gray-50 rounded-md">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-900"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <span className="text-[13px] font-medium text-gray-500">Total Size</span>
          </div>
          <div className="text-[32px] font-medium text-gray-900 leading-none mb-4">
            {loading ? <Loader2 className="animate-spin w-6 h-6 text-gray-300" /> : (
              <>{formattedSize.value} <span className="text-[20px] text-gray-500">{formattedSize.unit}</span></>
            )}
          </div>
          <div className="flex items-center gap-1 text-[12px] font-medium text-gray-400">
            Total transfer volume
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-gray-50 rounded-md">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-900"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="text-[13px] font-medium text-gray-500">Revoked</span>
          </div>
          <div className="text-[32px] font-medium text-gray-900 leading-none mb-4">
            {loading ? <Loader2 className="animate-spin w-6 h-6 text-gray-300" /> : revokedVaults}
          </div>
          <div className="flex items-center gap-1 text-[12px] font-medium text-gray-400">
            Permanently deleted
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-medium text-gray-900">Recent Deliveries</h2>
        <button 
          onClick={() => setActiveTab('deliveries')}
          className="text-[13px] font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2"
        >
          View All
        </button>
      </div>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-xl">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : recentLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-xl">
          <p className="font-medium text-gray-900">No recent deliveries</p>
          <p className="text-sm mt-1">Create a delivery to see it here.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead className="border-b border-gray-100 text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">ID</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Vault Name</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Created</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Last Accessed</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentLinks.map(link => {
                const msg = link.recipient_message || 'Secure Delivery';
                const abbr = msg.substring(0, 2).toUpperCase();
                return (
                  <tr key={link.link_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-[12px]">#{link.link_id.substring(0, 8)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-600 text-[10px] font-bold">{abbr}</div>
                      <span className="max-w-[200px] truncate" title={msg}>{msg}</span>
                    </td>
                    <td className="px-6 py-4">
                      {link.status === 'active' ? (
                        <span className="text-emerald-500 font-medium">Active</span>
                      ) : (
                        <span className="text-rose-500 font-medium">Revoked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(link.created_at).toLocaleDateString([], { timeZone })}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {link.last_accessed_at ? new Date(link.last_accessed_at).toLocaleString([], { timeZone, dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setActiveTab('deliveries')} className="text-gray-500 font-medium hover:text-gray-900">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
