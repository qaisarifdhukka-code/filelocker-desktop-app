import React from 'react';
import { Loader2 } from 'lucide-react';
import heroBg from './assets/hero.png';
import './App.css';

import { useAppContext } from './AppContext';
import AppShell from './components/layout/AppShell';
import OverviewPage from './components/pages/OverviewPage';
import NewDeliveryPage from './components/pages/NewDeliveryPage';
import DeliveriesPage from './components/pages/DeliveriesPage';
import SettingsPage from './components/pages/SettingsPage';
import HelpPage from './components/pages/HelpPage';

export default function App() {
  const { storeCheckDone, licenseTier, activeTab } = useAppContext();

  if (!storeCheckDone) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
          <p className="text-gray-500 font-medium">Checking license...</p>
        </div>
      </div>
    );
  }

  if (licenseTier !== 'PRO') {
    return (
      <div className="flex min-h-screen bg-white font-sans text-gray-900 overflow-hidden w-full">
        <div className="hidden md:flex flex-col justify-between w-5/12 p-12 lg:p-16 relative overflow-hidden bg-[#0F1629]">
          <div className="absolute inset-0 z-0">
            <img src={heroBg} alt="" className="w-full h-full object-cover opacity-80" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1629] via-transparent to-transparent z-0 opacity-80"></div>
          <div className="relative z-10 flex items-center gap-3">
            <img src="./AUROQITRANSPARENT LOGO.png" alt="AUROQI Logo" className="h-[36px] w-auto max-w-[200px] object-contain shrink-0" />
            <span className="font-['Outfit'] text-[28px] font-bold tracking-tight text-white mt-1">AUROQI</span>
          </div>
        </div>
        <div className="w-full md:w-7/12 flex items-center justify-center p-8 relative">
          <div className="w-full max-w-[400px]">
            <div className="mb-10 text-center md:text-left">
              <h2 className="font-['Space_Grotesk'] text-[32px] font-bold text-gray-900 mb-2 tracking-tight">AUROQI Subscription Required</h2>
              <p className="text-[15px] text-gray-500">Purchase or renew your AUROQI subscription from the Microsoft Store to secure your files.</p>
            </div>
            <button
              onClick={() => window.electronAPI.openExternal('ms-windows-store://pdp/?productid=9PLJMC3BRK3L')}
              className="w-full py-3.5 rounded-[8px] bg-[#2563EB] text-white text-[15px] font-semibold hover:bg-[#1D4ED8] transition-all shadow-sm active:scale-[0.99] mt-2"
            >
              Get AUROQI from Microsoft Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div key={activeTab} className="animate-fade-slide-up h-full w-full">
        {activeTab === 'overview' && <OverviewPage />}
        {activeTab === 'new_delivery' && <NewDeliveryPage />}
        {activeTab === 'deliveries' && <DeliveriesPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'help' && <HelpPage />}
      </div>
    </AppShell>
  );
}
