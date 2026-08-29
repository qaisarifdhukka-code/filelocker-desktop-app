import React from 'react';
import { PanelLeft } from 'lucide-react';
import { useAppContext } from '../../AppContext';

export default function TopBar() {
  const { activeTab, firmName, logoBase64 } = useAppContext();

  let pageTitle = 'Overview';
  if (activeTab === 'new_delivery') pageTitle = 'New Delivery';
  if (activeTab === 'deliveries') pageTitle = 'Deliveries';
  if (activeTab === 'settings') pageTitle = 'Brand Settings';

  return (
    <header className="h-12 w-full bg-white px-4 flex justify-between items-center z-10 shrink-0 border-b border-[#EAEAEA]" style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center gap-4">
        <span className="font-semibold text-[13px] text-gray-900">
          AUROQI / {pageTitle}
        </span>
      </div>

      <div className="flex items-center gap-6">

        
        {firmName && (
          <div className="flex items-center gap-2 border-l border-[#EAEAEA] pl-4">
            <span className="text-[12px] font-bold text-gray-700">{firmName}</span>
            {logoBase64 ? (
              <img src={logoBase64} alt={firmName} className="h-6 w-auto object-contain" />
            ) : (
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                {firmName.charAt(0)}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
