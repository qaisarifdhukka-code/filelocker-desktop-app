import React from 'react';
import { Lock, LayoutDashboard, Settings, Loader2, AlertCircle, HardDrive, Brush, LifeBuoy, PanelLeft } from 'lucide-react';
import { useAppContext } from '../../AppContext';

export default function Sidebar() {
  const { 
    activeTab, 
    setActiveTab, 
    setShowSettings, 
    updateStatus, 
    updatePercent, 
    activeSettingsTab,
    setActiveSettingsTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    firmName,
    logoBase64
  } = useAppContext();

  return (
    <aside className={`transition-all duration-300 ease-in-out border-r border-gray-100/80 p-6 flex flex-col shrink-0 h-screen bg-white ${isSidebarCollapsed ? 'w-[88px] items-center px-4' : 'w-full md:w-64'}`}>
      <div className={`flex items-center mb-8 h-[28px] ${isSidebarCollapsed ? 'justify-center w-full' : 'justify-between'}`}>
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <img src="./AUROQI ICON.png" alt="AUROQI" className="h-[28px] w-auto object-contain shrink-0" />
            <span className="font-['Outfit'] text-[21px] font-bold tracking-tight text-gray-900 mt-0.5">
              AUROQI
            </span>
          </div>
        )}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="flex items-center justify-center p-1.5 rounded-lg transition-colors text-gray-400 hover:text-gray-900 hover:bg-gray-50"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <PanelLeft className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </button>
      </div>

      {/* Navigation Tabs */}
      {!isSidebarCollapsed && <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Workspaces</h2>}
      <div className="flex flex-col gap-1 mb-10 w-full">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex items-center w-full py-2 rounded-lg font-medium text-[13px] transition-colors ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} ${activeTab === 'overview' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          title={isSidebarCollapsed ? 'Overview' : undefined}
        >
          <LayoutDashboard size={16} />
          {!isSidebarCollapsed && <span>Overview</span>}
        </button>
        <button 
          onClick={() => setActiveTab('new_delivery')}
          className={`flex items-center w-full py-2 rounded-lg font-medium text-[13px] transition-colors ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} ${activeTab === 'new_delivery' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          title={isSidebarCollapsed ? 'New Delivery' : undefined}
        >
          <Lock size={16} />
          {!isSidebarCollapsed && <span>New Delivery</span>}
        </button>
        <button 
          onClick={() => setActiveTab('deliveries')}
          className={`flex items-center w-full py-2 rounded-lg font-medium text-[13px] transition-colors ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} ${activeTab === 'deliveries' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          title={isSidebarCollapsed ? 'Deliveries' : undefined}
        >
          <HardDrive size={16} />
          {!isSidebarCollapsed && <span>Deliveries</span>}
        </button>
        {(!firmName && !logoBase64) && (
          <button 
            onClick={() => {
              setActiveTab('settings');
              setActiveSettingsTab('branding');
            }}
            className={`flex items-center w-full py-2 rounded-lg font-medium text-[13px] transition-colors ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} ${activeTab === 'settings' && activeSettingsTab === 'branding' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            title={isSidebarCollapsed ? 'Branding' : undefined}
          >
            <Brush size={16} />
            {!isSidebarCollapsed && <span>Branding</span>}
          </button>
        )}
      </div>

      <div className="flex-1"></div>

      {/* Settings & Help at Bottom */}
      {!isSidebarCollapsed && <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 mt-auto">System</h2>}
      <div className={`flex flex-col gap-1 pb-4 w-full ${isSidebarCollapsed ? 'mt-auto' : ''}`}>
        <button 
          onClick={() => {
            setActiveTab('settings');
            setActiveSettingsTab('general');
          }} 
          className={`flex items-center w-full py-2 rounded-lg transition-colors font-medium text-[13px] group ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} ${activeTab === 'settings' && activeSettingsTab !== 'branding' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          title={isSidebarCollapsed ? 'Settings' : undefined}
        >
          <Settings className={`w-4 h-4 transition-colors ${activeTab === 'settings' && activeSettingsTab !== 'branding' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-900'}`} />
          {!isSidebarCollapsed && <span>Settings</span>}
        </button>
        <button 
          onClick={() => setActiveTab('help')} 
          className={`flex items-center w-full py-2 rounded-lg transition-colors font-medium text-[13px] group ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} ${activeTab === 'help' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          title={isSidebarCollapsed ? 'Help & Support' : undefined}
        >
          <LifeBuoy className={`w-4 h-4 transition-colors ${activeTab === 'help' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-900'}`} />
          {!isSidebarCollapsed && <span>Help & Support</span>}
        </button>
      </div>

      {/* User / Firm Profile */}
      <div className={`mt-2 pt-4 border-t border-gray-100/80 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
        {logoBase64 ? (
          <img src={logoBase64} alt={firmName || 'Profile'} className="w-8 h-8 rounded-md object-contain shrink-0 bg-gray-50 border border-gray-200" />
        ) : (
          <div className="w-8 h-8 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 text-[12px] font-bold text-gray-500 uppercase">
            {(firmName || 'U').charAt(0)}
          </div>
        )}
        {!isSidebarCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate leading-tight">{firmName || 'USER'}</p>
            <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">Workspace Owner</p>
          </div>
        )}
      </div>
    </aside>
  );
}
