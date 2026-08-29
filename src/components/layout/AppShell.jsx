import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppContext } from '../../AppContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function AppShell({ children }) {
  const { toast } = useAppContext();

  return (
    <div className="bg-[#FAFAFA] min-h-screen flex flex-row antialiased text-gray-900 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5 md:p-8 relative">
          {children}
        </main>
      </div>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl px-4 py-3 flex items-center gap-3 min-w-[280px]">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span className="text-[13px] font-medium text-gray-800">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
