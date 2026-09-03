import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Link as LinkIcon, Trash2, Clock, AlertTriangle, ExternalLink, Check, Copy, Activity, X, Edit2, Search, RefreshCw, ChevronUp, ChevronDown, Plus, Download, Share2, ShieldCheck, Database, FileDigit, History } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { APP_CONFIG } from '../config';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const SortHeader = ({ label, sortKey, currentSort, onSort, rightAlign = false }) => (
  <th 
    onClick={() => onSort(sortKey)}
    className={`px-6 py-4 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-gray-100/50 transition-colors group select-none ${rightAlign ? 'text-right' : 'text-left'}`}
  >
    <div className={`flex items-center gap-1 ${rightAlign ? 'justify-end' : ''}`}>
      {label}
      <div className="flex flex-col text-gray-300 group-hover:text-gray-400">
        <ChevronUp size={10} className={`-mb-[3px] ${currentSort.key === sortKey && currentSort.direction === 'asc' ? 'text-gray-800' : ''}`} />
        <ChevronDown size={10} className={`-mt-[3px] ${currentSort.key === sortKey && currentSort.direction === 'desc' ? 'text-gray-800' : ''}`} />
      </div>
    </div>
  </th>
);

export default function DeliveryDashboard({ hardwareId, firmName }) {
  const { showToast, timeZone, setActiveTab } = useAppContext();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals
  const [activityModal, setActivityModal] = useState({ open: false, linkId: null, events: [], loading: false, error: null });
  const [editModal, setEditModal] = useState({ open: false, linkId: null, loading: false });
  const [shareModal, setShareModal] = useState({ open: false, linkId: null, url: '' });
  const [bulkExtendModal, setBulkExtendModal] = useState({ open: false, days: 7, loading: false });
  
  const [editForm, setEditForm] = useState({
    recipient_message: '',
    hint: '',
    expires_in_days: 7,
    max_views: 0,
    viewer_config: { mode: 'download', allowDownload: true, allowPrint: false, allowCopy: false, customWatermark: '' }
  });

  // Filters & Sorting & Bulk
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hardwareId) headers['x-creator-id'] = hardwareId;

      const res = await fetch(`${APP_CONFIG.API_URL}/api/links/dashboard`, { headers });
      const data = await res.json();

      if (res.ok) {
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

  useEffect(() => {
    setIsFiltering(true);
    setCurrentPage(1);
    const timer = setTimeout(() => setIsFiltering(false), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, dateRange, sortConfig]);

  const handleRevoke = async (linkId) => {
    if (!confirm('Are you sure you want to instantly revoke this link? The encrypted file will be permanently deleted from the cloud. This cannot be undone.')) return;
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hardwareId) headers['x-creator-id'] = hardwareId;

      const res = await fetch(`${APP_CONFIG.API_URL}/api/links/${linkId}/revoke`, {
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

  const handleBulkRevoke = async () => {
    if (!confirm(`Are you sure you want to revoke ${selectedLinks.length} deliveries? This cannot be undone.`)) return;
    let successCount = 0;
    for (const linkId of selectedLinks) {
       try {
         const headers = { 'Content-Type': 'application/json' };
         if (hardwareId) headers['x-creator-id'] = hardwareId;
         const res = await fetch(`${APP_CONFIG.API_URL}/api/links/${linkId}/revoke`, { method: 'POST', headers });
         if (res.ok) successCount++;
       } catch(e) {}
    }
    if (successCount > 0) {
      showToast(`Successfully revoked ${successCount} deliveries.`, 'success');
      fetchLinks();
      setSelectedLinks([]);
    }
  };

  const handleBulkExtendClick = () => {
    setBulkExtendModal({ open: true, days: 7, loading: false });
  };

  const handleBulkExtendConfirm = async () => {
    const days = bulkExtendModal.days;
    if (!days || isNaN(days) || days <= 0) {
      showToast('Please enter a valid number of days.', 'error');
      return;
    }
    
    setBulkExtendModal(prev => ({ ...prev, loading: true }));
    let successCount = 0;
    for (const linkId of selectedLinks) {
       try {
         const headers = { 'Content-Type': 'application/json' };
         if (hardwareId) headers['x-creator-id'] = hardwareId;
         const res = await fetch(`${APP_CONFIG.API_URL}/api/links/${linkId}/extend`, { 
           method: 'POST', headers, body: JSON.stringify({ expires_in_days: parseInt(days, 10) }) 
         });
         if (res.ok) successCount++;
       } catch(e) {}
    }
    
    setBulkExtendModal({ open: false, days: 7, loading: false });
    
    if (successCount > 0) {
      showToast(`Successfully extended ${successCount} deliveries.`, 'success');
      fetchLinks();
      setSelectedLinks([]);
    } else {
      showToast('Failed to extend deliveries.', 'error');
    }
  };

  const handleEditClick = (link) => {
    let expDays = 7;
    if (link.expires_at) {
      const diffTime = new Date(link.expires_at).getTime() - new Date().getTime();
      expDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      if (expDays > 100) expDays = 3650;
    }
    
    setEditForm({
      recipient_message: link.recipient_message || '',
      hint: link.hint || '',
      expires_in_days: expDays,
      max_views: link.max_views !== undefined ? link.max_views : 0,
      viewer_config: link.viewer_config || { mode: 'download', allowDownload: true, allowPrint: false, allowCopy: false, customWatermark: '' }
    });
    setEditModal({ open: true, linkId: link.link_id, loading: false });
  };

  const handleUpdateSettings = async () => {
    setEditModal(prev => ({ ...prev, loading: true }));
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hardwareId) headers['x-creator-id'] = hardwareId;

      const res = await fetch(`${APP_CONFIG.API_URL}/api/links/${editModal.linkId}/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        showToast('Delivery settings updated successfully.', 'success');
        setEditModal({ open: false, linkId: null, loading: false });
        fetchLinks();
      } else {
        const data = await res.json();
        showToast('Failed to update: ' + (data.error || 'Unknown error'), 'error');
        setEditModal(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      showToast('Network error while updating delivery.', 'error');
      setEditModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleShareClick = (linkId) => {
    const slug = (firmName || 'v').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const url = `${APP_CONFIG.UNLOCK_URL}/${slug}/${linkId}`;
    setShareModal({ open: true, linkId, url });
  };

  const handleCopyOnly = (url) => {
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 'success');
  };

  const handleViewActivity = async (linkId) => {
    setActivityModal({ open: true, linkId, events: [], loading: true, error: null });
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hardwareId) headers['x-creator-id'] = hardwareId;

      const res = await fetch(`${APP_CONFIG.API_URL}/api/links/events/${linkId}`, { headers });
      const data = await res.json();
      
      if (res.ok) {
        setActivityModal({ open: true, linkId, events: data.events || [], loading: false, error: null });
      } else {
        setActivityModal(prev => ({ ...prev, loading: false, error: data.error || 'Failed to load events' }));
      }
    } catch (err) {
      setActivityModal(prev => ({ ...prev, loading: false, error: 'Network error' }));
    }
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedLinks = useMemo(() => {
    let result = [...links];

    // Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(l => l.status && l.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Date Filter
    if (dateRange.start || dateRange.end) {
      result = result.filter(l => {
        if (!l.created_at) return false;
        const d = new Date(l.created_at);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const localDateString = `${year}-${month}-${day}`;
        
        if (dateRange.start && dateRange.end) {
          return localDateString >= dateRange.start && localDateString <= dateRange.end;
        } else if (dateRange.start) {
          return localDateString >= dateRange.start;
        } else if (dateRange.end) {
          return localDateString <= dateRange.end;
        }
        return true;
      });
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        (l.recipient_message && l.recipient_message.toLowerCase().includes(q)) || 
        (l.link_id && l.link_id.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'last_accessed_at') {
         aVal = aVal ? new Date(aVal).getTime() : 0;
         bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortConfig.key === 'created_at' || sortConfig.key === 'expires_at') {
         aVal = aVal ? new Date(aVal).getTime() : 0;
         bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [links, searchQuery, statusFilter, dateRange, sortConfig]);

  // Pagination
  const totalItems = filteredAndSortedLinks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedLinks = filteredAndSortedLinks.slice(startIndex, endIndex);

  const exportCSV = () => {
    if (filteredAndSortedLinks.length === 0) return;
    
    const headers = ['Delivery ID', 'Delivery Name', 'Status', 'Size (Bytes)', 'Created Date', 'Expires Date', 'Last Accessed Date'];
    const rows = filteredAndSortedLinks.map(l => [
      l.link_id,
      `"${(l.recipient_message || '').replace(/"/g, '""')}"`,
      l.status,
      l.file_size || 0,
      new Date(l.created_at).toISOString(),
      new Date(l.expires_at).toISOString(),
      l.last_accessed_at ? new Date(l.last_accessed_at).toISOString() : 'Never'
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Auroqi_Deliveries_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    if (status === 'active') return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Active</span>;
    if (status === 'consumed') return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Consumed</span>;
    if (status === 'expired') return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Expired</span>;
    if (status === 'revoked') return <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Revoked</span>;
    return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-[10px] font-bold rounded-full uppercase tracking-wider">{status}</span>;
  };

  const toggleAll = (e) => {
    if (e.target.checked) setSelectedLinks(filteredAndSortedLinks.map(l => l.link_id));
    else setSelectedLinks([]);
  };

  const toggleOne = (id) => {
    if (selectedLinks.includes(id)) setSelectedLinks(selectedLinks.filter(i => i !== id));
    else setSelectedLinks([...selectedLinks, id]);
  };

  // Analytics Calcs
  const totalDeliveries = links.length;
  const activeDeliveries = links.filter(l => l.status === 'active').length;
  const totalBytes = links.reduce((acc, l) => acc + (l.file_size || 0), 0);

  const inputClass = "w-full px-3 py-1.5 text-[13px] bg-white border border-gray-300 rounded-[4px] focus:outline-none focus:border-gray-900 transition-colors";
  const labelClass = "block text-[13px] font-bold text-[#1E293B] mb-1.5";

  return (
    <div className="flex flex-col h-full -mt-2">

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
            <span className="text-[13px] font-medium text-gray-500">Active Links</span>
          </div>
          <div className="text-[32px] font-medium text-gray-900 leading-none mb-4">
            {loading ? <Loader2 className="animate-spin w-6 h-6 text-gray-300" /> : activeDeliveries}
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
            <span className="text-[13px] font-medium text-gray-500">Data Secured</span>
          </div>
          <div className="text-[32px] font-medium text-gray-900 leading-none mb-4">
            {loading ? <Loader2 className="animate-spin w-6 h-6 text-gray-300" /> : (
              <>{formatBytes(totalBytes).split(' ')[0]} <span className="text-[20px] text-gray-500">{formatBytes(totalBytes).split(' ')[1] || 'B'}</span></>
            )}
          </div>
          <div className="flex items-center gap-1 text-[12px] font-medium text-gray-400">
            Total transfer volume
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        
        {/* Status Filters & Bulk Actions */}
        <div className="flex items-center gap-3">
          {selectedLinks.length > 0 ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-1 pl-4 shadow-sm">
              <span className="text-[12px] font-bold text-indigo-900 mr-2">{selectedLinks.length} Selected</span>
              <button onClick={handleBulkExtendClick} className="px-3 py-1 bg-white text-indigo-700 rounded-full text-[11px] font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors">
                Extend
              </button>
              <button onClick={handleBulkRevoke} className="px-3 py-1 bg-white text-red-600 rounded-full text-[11px] font-bold border border-red-200 hover:bg-red-50 transition-colors">
                Revoke
              </button>
              <button onClick={() => setSelectedLinks([])} className="p-1 ml-1 text-gray-400 hover:text-gray-700 rounded-full">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {['All', 'Active', 'Consumed', 'Expired', 'Revoked'].map(status => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors ${statusFilter === status ? 'bg-[#18181B] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-[4px] px-1 py-1" title="Filter by Creation Date">
            <input 
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-[12px] bg-transparent focus:outline-none text-gray-500 w-[100px]"
            />
            <span className="text-gray-300 text-[10px] font-bold mx-0.5">TO</span>
            <input 
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-[12px] bg-transparent focus:outline-none text-gray-500 w-[100px]"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-[7px] w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search deliveries..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-white border border-gray-300 rounded-[4px] focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>
          <button 
            onClick={exportCSV}
            className="flex items-center justify-center p-1.5 bg-white border border-gray-300 rounded-[4px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none shrink-0"
            title="Export CSV"
          >
            <Download size={15} />
          </button>
          <button 
            onClick={fetchLinks}
            className="flex items-center justify-center p-1.5 bg-white border border-gray-300 rounded-[4px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none shrink-0"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table & States */}
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
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 p-8 shadow-sm">
          <LinkIcon size={48} className="mb-4 text-gray-300" />
          <p className="text-[18px] font-bold text-gray-900 mb-1">No secure links yet</p>
          <p className="text-[13px] mb-5">Create your first secure delivery to see it tracked here.</p>
          <button 
            onClick={() => setActiveTab('new_delivery')} 
            className="flex items-center gap-2 px-5 py-2.5 bg-[#18181B] text-white text-[13px] font-bold rounded-[4px] hover:bg-black transition-colors shadow-sm"
          >
            <Plus size={16} />
            Create New Delivery
          </button>
        </div>
      ) : filteredAndSortedLinks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 p-8">
          <Search size={32} className="mb-3 text-gray-400" />
          <p className="font-bold text-gray-900 mb-1 text-[15px]">No matches found</p>
          <p className="text-[13px]">Try adjusting your search or filters.</p>
          <button 
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateRange({ start: '', end: '' }); }} 
            className="mt-3 text-blue-600 hover:underline text-[12px] font-bold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col mt-1 relative">
          {isFiltering && (
            <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl pointer-events-none transition-all">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          )}
          <div className={`bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-xl overflow-x-auto min-h-[300px] transition-opacity duration-200 ${isFiltering ? 'opacity-60' : 'opacity-100'}`}>
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="border-b border-gray-100 text-gray-400 font-medium">
                <tr>
                  <th className="px-4 py-4 w-[40px]">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-[#18181B] rounded-[2px] cursor-pointer" 
                      checked={selectedLinks.length > 0 && selectedLinks.length === filteredAndSortedLinks.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <SortHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Delivery Details" sortKey="recipient_message" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Size" sortKey="file_size" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Created" sortKey="created_at" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Last Accessed" sortKey="last_accessed_at" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Expires" sortKey="expires_at" currentSort={sortConfig} onSort={handleSort} />
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {paginatedLinks.map(link => {
                  const msg = link.recipient_message || 'Secure Delivery';
                  return (
                    <tr key={link.link_id} className={`hover:bg-gray-50/50 transition-colors group ${selectedLinks.includes(link.link_id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-[#18181B] rounded-[2px] cursor-pointer" 
                          checked={selectedLinks.includes(link.link_id)}
                          onChange={() => toggleOne(link.link_id)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        {getStatusBadge(link.status)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 mb-0.5 max-w-[200px] truncate" title={msg}>
                            {msg}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px] mt-0.5">#{link.link_id.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-[12px]">
                        {link.file_size ? formatBytes(link.file_size) : 'Unknown'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(link.created_at).toLocaleDateString([], { timeZone })}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {link.last_accessed_at ? new Date(link.last_accessed_at).toLocaleString([], { timeZone, dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(link.expires_at).toLocaleDateString([], { timeZone })}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          <button 
                            onClick={() => handleViewActivity(link.link_id)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[4px] transition-colors"
                            title="Activity Log"
                          >
                            <History size={15} />
                          </button>

                          {link.status === 'active' && (
                            <>
                              <button 
                                onClick={() => handleShareClick(link.link_id)}
                                className="p-1.5 text-gray-500 hover:text-[#0073bb] hover:bg-[#0073bb]/10 rounded-[4px] transition-colors"
                                title="Share Link"
                              >
                                <Share2 size={15} />
                              </button>
                              <button 
                                onClick={() => handleEditClick(link)}
                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-[4px] transition-colors"
                                title="Edit Delivery Settings"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => handleRevoke(link.link_id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors"
                                title="Revoke Delivery"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                          
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="px-6 py-3 border border-t-0 border-gray-100 bg-gray-50/50 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center text-[12px] text-gray-500">
                Showing <span className="font-bold text-gray-900 mx-1">{startIndex + 1}</span> to <span className="font-bold text-gray-900 mx-1">{endIndex}</span> of <span className="font-bold text-gray-900 mx-1">{totalItems}</span> results
                <select 
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="ml-3 bg-transparent border border-gray-300 rounded-[4px] px-1 py-0.5 font-bold text-gray-700 focus:outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-[4px] text-[12px] font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <div className="text-[12px] font-bold text-gray-600 px-2">
                  {currentPage} / {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-[4px] text-[12px] font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share / QR Modal */}
      {shareModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                <Share2 size={16} className="text-[#0073bb]" />
                Share Secure Delivery
              </h3>
              <button 
                onClick={() => setShareModal({ open: false, linkId: null, url: '' })}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-5">
              
              <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                 {/* QR Code fetched dynamically from qrserver API */}
                 <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareModal.url)}`} 
                    alt="QR Code" 
                    className="w-40 h-40"
                 />
              </div>

              <div className="w-full">
                <label className="block text-[12px] font-bold text-gray-400 tracking-wider mb-1.5 uppercase text-center">Secure Link URL</label>
                <div className="flex items-center shadow-sm rounded-[4px]">
                  <input type="text" readOnly value={shareModal.url} className={`${inputClass} shadow-none rounded-r-none border-r-0 text-center font-mono text-[12px] text-gray-500 bg-gray-50`} />
                  <button onClick={() => handleCopyOnly(shareModal.url)}
                    className="px-4 py-1.5 text-[13px] font-bold text-white bg-[#18181B] hover:bg-black rounded-r-[4px] transition-colors border border-[#18181B] shrink-0"
                  >Copy</button>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Extend Modal */}
      {bulkExtendModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                <Clock size={16} className="text-indigo-600" />
                Extend Deliveries
              </h3>
              <button 
                onClick={() => !bulkExtendModal.loading && setBulkExtendModal({ open: false, days: 7, loading: false })}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-[13px] text-gray-600">
                How many days from today would you like to extend the expiration for the <strong>{selectedLinks.length}</strong> selected deliveries?
              </p>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Days to extend</label>
                <input 
                  type="number" 
                  min="1"
                  value={bulkExtendModal.days}
                  onChange={(e) => setBulkExtendModal(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-[14px] bg-white border border-gray-300 rounded-[4px] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
              <button 
                disabled={bulkExtendModal.loading}
                onClick={() => setBulkExtendModal({ open: false, days: 7, loading: false })}
                className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-[4px] text-[12px] font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                disabled={bulkExtendModal.loading}
                onClick={handleBulkExtendConfirm}
                className="flex items-center justify-center min-w-[90px] px-4 py-1.5 bg-indigo-600 text-white rounded-[4px] text-[12px] font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {bulkExtendModal.loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Delivery Modal */}
      {editModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-[500px] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                <Edit2 size={16} className="text-amber-600" />
                Edit Delivery Settings
              </h3>
              <button 
                onClick={() => !editModal.loading && setEditModal({ open: false, linkId: null, loading: false })}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 text-[#1E293B]">
              
              {/* General Settings */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 tracking-wider mb-3 uppercase">General</h4>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={labelClass}>Delivery Name (Message)</label>
                    <input 
                      type="text" 
                      value={editForm.recipient_message} 
                      onChange={(e) => setEditForm({...editForm, recipient_message: e.target.value})} 
                      className={inputClass} 
                      placeholder="e.g. Q3 Financial Report"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password Hint</label>
                    <input 
                      type="text" 
                      value={editForm.hint} 
                      onChange={(e) => setEditForm({...editForm, hint: e.target.value})} 
                      className={inputClass} 
                      placeholder="e.g. Your phone number"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Security & Access */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 tracking-wider mb-3 uppercase">Security & Access</h4>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className={labelClass}>Link Expiration</label>
                    <select value={editForm.expires_in_days} onChange={(e) => setEditForm({...editForm, expires_in_days: Number(e.target.value)})} className={inputClass}>
                      <option value={1}>24 hours</option>
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={3650}>Never</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Max Accesses</label>
                    <select value={editForm.max_views} onChange={(e) => setEditForm({...editForm, max_views: Number(e.target.value)})} className={inputClass}>
                      <option value={0}>Unlimited</option>
                      <option value={1}>1 access</option>
                      <option value={2}>2 accesses</option>
                      <option value={3}>3 accesses</option>
                      <option value={5}>5 accesses</option>
                      <option value={10}>10 accesses</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className={labelClass}>Viewer Mode</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="editViewerMode" 
                        checked={editForm.viewer_config.mode === 'download'} 
                        onChange={() => setEditForm(prev => ({ ...prev, viewer_config: { ...prev.viewer_config, mode: 'download', allowDownload: true } }))} 
                        className="w-3.5 h-3.5 accent-[#18181B]" 
                      />
                      <span className="text-[13px] text-gray-800">Download</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="editViewerMode" 
                        checked={editForm.viewer_config.mode === 'secure_view'} 
                        onChange={() => setEditForm(prev => ({ ...prev, viewer_config: { ...prev.viewer_config, mode: 'secure_view', allowDownload: false } }))} 
                        className="w-3.5 h-3.5 accent-[#18181B]" 
                      />
                      <span className="text-[13px] text-gray-800">Secure Viewer</span>
                    </label>
                  </div>
                  
                  {editForm.viewer_config.mode === 'secure_view' && (
                    <div className="flex flex-col gap-2 mt-1 p-3 bg-gray-50 border border-gray-200 rounded-[4px]">
                      {[['allowDownload', 'Allow Download'], ['allowPrint', 'Allow Print'], ['allowCopy', 'Allow Copy / Select']].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={editForm.viewer_config[key]} 
                            onChange={() => setEditForm(prev => ({ ...prev, viewer_config: { ...prev.viewer_config, [key]: !prev.viewer_config[key] } }))} 
                            className="w-3.5 h-3.5 accent-[#18181B] rounded-[2px]" 
                          />
                          <span className="text-[12px] text-gray-700">{label}</span>
                        </label>
                      ))}
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <label className="block text-[12px] font-bold text-gray-700 mb-1">Custom Watermark <span className="font-normal text-gray-500">(Optional)</span></label>
                        <input 
                          type="text" 
                          value={editForm.viewer_config.customWatermark || ''} 
                          onChange={e => setEditForm(prev => ({ ...prev, viewer_config: { ...prev.viewer_config, customWatermark: e.target.value } }))} 
                          placeholder="Confidential" 
                          className={inputClass} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
              <button 
                disabled={editModal.loading}
                onClick={() => setEditModal({ open: false, linkId: null, loading: false })}
                className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-[4px] text-[12px] font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                disabled={editModal.loading}
                onClick={handleUpdateSettings}
                className="flex items-center justify-center min-w-[100px] px-4 py-1.5 bg-[#18181B] text-white rounded-[4px] text-[12px] font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-sm"
              >
                {editModal.loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Activity Modal */}
      {activityModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[80vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                <History size={16} className="text-indigo-600" />
                Delivery Activity Log
              </h3>
              <button 
                onClick={() => setActivityModal({ open: false, linkId: null, events: [], loading: false, error: null })}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {activityModal.loading ? (
                <div className="flex justify-center items-center py-8 text-gray-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : activityModal.error ? (
                <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
                  {activityModal.error}
                </div>
              ) : activityModal.events.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-[13px]">
                  No activity recorded for this delivery yet.
                </div>
              ) : (
                <div className="relative ml-4 mt-2">
                  {activityModal.events.map((event, i) => {
                    let Icon = Activity;
                    let color = "bg-gray-100 text-gray-500 border-gray-200";
                    
                    if (event.event_type === 'Created' || event.event_type === 'Uploaded') {
                      Icon = event.event_type === 'Created' ? ExternalLink : Activity; 
                      color = "bg-indigo-50 text-indigo-600 border-indigo-200";
                    } else if (event.event_type === 'Accessed') {
                      Icon = Activity;
                      color = "bg-blue-50 text-blue-600 border-blue-200";
                    } else if (event.event_type === 'Downloaded') {
                      Icon = Check;
                      color = "bg-emerald-50 text-emerald-600 border-emerald-200";
                    } else if (event.event_type === 'Revoked' || event.event_type === 'Expired') {
                      Icon = event.event_type === 'Revoked' ? Trash2 : Clock;
                      color = "bg-rose-50 text-rose-600 border-rose-200";
                    }

                    return (
                      <div key={i} className="relative pl-8 pb-6 last:pb-0">
                        {i !== activityModal.events.length - 1 && (
                          <div className="absolute left-[11px] top-7 -bottom-2 w-[2px] bg-gray-100" />
                        )}
                        <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center bg-white z-10 ${color}`}>
                          <Icon size={12} className="currentColor" />
                        </div>
                        <div className="font-bold text-gray-900 text-[12px] pt-0.5 uppercase tracking-wide">{event.event_type}</div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          {new Date(event.created_at).toLocaleString([], { timeZone })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setActivityModal({ open: false, linkId: null, events: [], loading: false, error: null })}
                className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-[4px] text-[12px] font-bold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
