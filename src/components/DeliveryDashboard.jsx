import { useState, useEffect } from 'react';
import { Loader2, Link as LinkIcon, Trash2, Clock, AlertTriangle, ExternalLink, Check, Copy } from 'lucide-react';
import { useAppContext } from '../AppContext';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DeliveryDashboard({ hardwareId, firmName }) {
  const { showToast, timeZone } = useAppContext();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hardwareId) headers['x-creator-id'] = hardwareId;

      const res = await fetch('https://api.filelocker.online/api/links/dashboard', { headers });
      const data = await res.json();

      if (res.ok) {
        // Cap the frontend display to the latest 50 deliveries for optimal performance
        setLinks((data.links || []).slice(0, 50));
      } else {
        setError(data.error || 'Failed to fetch links');
      }
    } catch (err) {
      setError('Network error connecting to the secure link server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [hardwareId]);

  const handleRevoke = async (linkId) => {
    if (!confirm('Are you sure you want to instantly revoke this link? The encrypted file will be permanently deleted from the cloud. This cannot be undone.')) return;
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hardwareId) headers['x-creator-id'] = hardwareId;

      const res = await fetch(`https://api.filelocker.online/api/links/${linkId}/revoke`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        setLinks(prev => prev.map(l => l.link_id === linkId ? { ...l, status: 'revoked' } : l));
        showToast('Delivery revoked successfully.', 'success');
      } else {
        const data = await res.json();
        showToast('Failed to revoke: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Network error while revoking delivery.', 'error');
    }
  };

  const handleExtend = async (linkId) => {
    const days = prompt('Enter the number of days to extend this link from today:', '7');
    if (!days || isNaN(days)) return;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hardwareId) headers['x-creator-id'] = hardwareId;

      const res = await fetch(`https://api.filelocker.online/api/links/${linkId}/extend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ expires_in_days: parseInt(days, 10) })
      });

      if (res.ok) {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + parseInt(days, 10));
        setLinks(prev => prev.map(l => l.link_id === linkId ? { ...l, expires_at: newDate.toISOString() } : l));
        showToast('Delivery extended successfully.', 'success');
      } else {
        const data = await res.json();
        showToast('Failed to extend: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Network error while extending delivery.', 'error');
    }
  };

  const handleCopy = (linkId) => {
    const slug = (firmName || 'v').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const url = `https://unlock.filelocker.online/${slug}/${linkId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status) => {
    if (status === 'active') return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full uppercase tracking-wider">Active</span>;
    if (status === 'expired') return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full uppercase tracking-wider">Expired</span>;
    if (status === 'revoked') return <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[11px] font-bold rounded-full uppercase tracking-wider">Revoked</span>;
    return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-[11px] font-bold rounded-full uppercase tracking-wider">{status}</span>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end items-center mb-3 mt-[-16px]">
        <button 
          onClick={fetchLinks}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none"
          title="Refresh"
        >
          <Clock size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      ) : loading && links.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={32} className="animate-spin mb-4" />
          <p>Loading your deliveries...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <LinkIcon size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-900 mb-1">No secure links yet</p>
          <p className="text-sm">Create a secure link delivery to see it here.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col mt-2">
          <div className="bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-xl overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="border-b border-gray-100 text-gray-400 font-medium">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Delivery details</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Size</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Created</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Last Accessed</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Expires</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {links.map(link => (
                  <tr key={link.link_id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      {link.status === 'active' ? (
                        <span className="text-emerald-500 font-medium">Active</span>
                      ) : (
                        <span className="text-rose-500 font-medium">Revoked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 mb-0.5 max-w-[200px] truncate" title={link.recipient_message || 'No message'}>
                          {link.recipient_message ? `"${link.recipient_message}"` : 'Secure Delivery'}
                        </span>
                        <span className="text-gray-400 font-mono text-[11px] mt-0.5">#{link.link_id.substring(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-[12px]">
                      {link.file_size ? formatBytes(link.file_size) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(link.created_at).toLocaleDateString([], { timeZone })}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {link.last_accessed_at ? new Date(link.last_accessed_at).toLocaleString([], { timeZone, dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(link.expires_at).toLocaleDateString([], { timeZone })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {link.status === 'active' && (
                          <>
                            <button 
                              onClick={() => handleCopy(link.link_id)}
                              className="p-1.5 text-gray-500 hover:text-[#0073bb] hover:bg-[#0073bb]/10 rounded-md transition-colors"
                              title="Copy URL"
                            >
                              {copiedId === link.link_id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                            </button>
                            <button 
                              onClick={() => handleExtend(link.link_id)}
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                              title="Extend Expiration"
                            >
                              <Clock size={16} />
                            </button>
                            <button 
                              onClick={() => handleRevoke(link.link_id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Revoke Delivery"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
