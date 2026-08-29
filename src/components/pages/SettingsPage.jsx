import React from 'react';
import { Settings, Brush, Shield, Send, Lock, RefreshCw, Key, Info, X, Loader2, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../AppContext';

export default function SettingsPage() {
  const { 
    activeSettingsTab, setActiveSettingsTab,
    firmName, setFirmName,
    primaryColor, setPrimaryColor,
    logoBase64, setLogoBase64, handleLogoUpload, saveSettings,
    timeZone, setTimeZone,
    defaultSaveLocation, handleChangeDefaultSaveLocation,
    minPasswordLength, setMinPasswordLength,
    requireSpecialChars, setRequireSpecialChars,
    defaultLinkExpiration, setDefaultLinkExpiration,
    defaultRecipientMessage, setDefaultRecipientMessage,
    defaultAutoDelete, setDefaultAutoDelete,
    defaultHideFileName, setDefaultHideFileName,
    appVersion, updateStatus, updatePercent, isElectron, licenseTier, hardwareId
  } = useAppContext();

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'branding', label: 'Branding', icon: Brush },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'delivery', label: 'Delivery Defaults', icon: Send },
    { id: 'privacy', label: 'Privacy & Data', icon: Lock },
    { id: 'updates', label: 'Updates', icon: RefreshCw },
    { id: 'license', label: 'License & Subscription', icon: Key },
    { id: 'about', label: 'About AUROQI', icon: Info },
  ];

  const renderContent = () => {
    switch (activeSettingsTab) {
      case 'branding':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Brand Settings</h2>
              <p className="text-[13px] text-gray-500">Configure your firm branding for all future vaults.</p>
            </div>
            
            <div className="max-w-2xl flex flex-col gap-6">
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-2">Firm Name</label>
                <input type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="e.g. Smith & Associates" className="w-full px-3 py-2 text-[14px] bg-white border border-[#EAEAEA] rounded-[4px] focus:outline-none focus:border-[#0073bb] focus:ring-1 focus:ring-[#0073bb] transition-all" />
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-[13px] font-bold text-gray-900 mb-2">
                    Firm Logo <span className="text-gray-500 font-normal ml-1">(Max 2MB)</span>
                  </label>
                  <div className="relative">
                    <input type="file" id="logoUpload" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} className="sr-only" />
                    <label htmlFor="logoUpload" className="flex items-center justify-center w-full px-4 py-2 bg-[#f8f8f8] border border-[#EAEAEA] border-dashed rounded-[4px] cursor-pointer hover:border-[#545b64] hover:bg-white transition-all group">
                      <span className="text-[13px] font-medium text-[#16191f]">Choose Image</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-2">Brand Color</label>
                  <div className="flex items-center gap-3 h-[38px] bg-white px-2 py-1 border border-[#EAEAEA] rounded-[4px]">
                    <div className="relative w-6 h-6 rounded-[2px] overflow-hidden border border-[#EAEAEA] shrink-0">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer border-0 p-0" />
                    </div>
                    <span className="text-[13px] font-mono text-gray-900 uppercase pr-1">{primaryColor}</span>
                  </div>
                </div>
              </div>

              {logoBase64 && (
                <div className="p-4 border border-[#EAEAEA] rounded-[4px] bg-[#f8f8f8] flex flex-col items-center justify-center relative group">
                  <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-2">Logo Preview</span>
                  <img src={logoBase64} alt="Preview" className="max-h-12 object-contain" />
                  <button onClick={() => setLogoBase64('')} className="absolute top-2 right-2 text-gray-400 hover:text-[#d13212] transition-colors focus:outline-none">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-100 mt-2">
                <button onClick={saveSettings} className="px-5 py-2 rounded-[4px] bg-[#0073bb] text-white text-[13px] font-bold hover:bg-[#00609a] transition-colors shadow-sm focus:outline-none">Save Brand Settings</button>
              </div>
            </div>
          </div>
        );

      case 'updates':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Software Updates</h2>
              <p className="text-[13px] text-gray-500">Keep AUROQI up to date for the latest security features.</p>
            </div>
            
            <div className="max-w-xl flex flex-col gap-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">Current Version</h3>
                    <p className="text-[13px] text-gray-500">v{appVersion || 'Unknown'}</p>
                  </div>
                  <span className="px-3 py-1 bg-[#f2f8f3] text-[#1d8102] border border-[#b2d8b2] rounded-full text-[12px] font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Managed by Microsoft Store
                  </span>
                </div>
                
                <div className="mt-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    Because AUROQI is distributed securely via the Microsoft Store, all software updates are downloaded and installed automatically by Windows in the background. 
                  </p>
                  <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
                    You do not need to manually check for updates. The next time you open AUROQI after an update is released, you will automatically be on the latest version.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'general':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">General Settings</h2>
              <p className="text-[13px] text-gray-500">Configure global application behavior.</p>
            </div>
            
            <div className="max-w-2xl flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-900">Default Save Location</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={defaultSaveLocation || 'Documents\\AUROQI'} className="flex-1 px-3 py-2 text-[14px] bg-gray-50 text-gray-500 border border-[#EAEAEA] rounded-[4px]" />
                  <button onClick={handleChangeDefaultSaveLocation} className="px-4 py-2 bg-white border border-[#EAEAEA] rounded-[4px] text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">Change</button>
                </div>
                <p className="text-[12px] text-gray-500">Where offline HTML vaults are saved by default.</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-900">Time Zone</label>
                <select 
                  value={timeZone} 
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="px-3 py-2 text-[14px] bg-white border border-[#EAEAEA] rounded-[4px] text-gray-900 focus:outline-none focus:border-[#0073bb]"
                >
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="America/Anchorage">Alaska</option>
                  <option value="Pacific/Honolulu">Hawaii</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Dubai">Dubai</option>
                  <option value="Australia/Sydney">Sydney</option>
                  <option value="UTC">UTC</option>
                </select>
                <p className="text-[12px] text-gray-500">Dates and times will be displayed in this time zone.</p>
              </div>

              <div className="pt-4 border-t border-gray-100 mt-2">
                <button onClick={saveSettings} className="px-5 py-2 rounded-[4px] bg-[#0073bb] text-white text-[13px] font-bold hover:bg-[#00609a] transition-colors shadow-sm focus:outline-none">Save General Settings</button>
              </div>
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Security Preferences</h2>
              <p className="text-[13px] text-gray-500">Manage encryption standards and password rules.</p>
            </div>
            <div className="max-w-2xl flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-900">Encryption Algorithm</label>
                <select disabled className="px-3 py-2 text-[14px] bg-gray-50 border border-[#EAEAEA] rounded-[4px] text-gray-500">
                  <option>AES-256-GCM (Standard)</option>
                </select>
                <p className="text-[12px] text-gray-500">Fixed to military standard AES-256-GCM.</p>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm mt-2">
                <h3 className="font-bold text-gray-900 text-[14px] mb-4">Password Requirements</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-700">Minimum Length</span>
                    <select value={minPasswordLength} onChange={(e) => setMinPasswordLength(Number(e.target.value))} className="px-3 py-1.5 text-[13px] bg-white border border-[#EAEAEA] rounded-[4px] text-gray-900 focus:outline-none focus:border-[#0073bb]">
                      <option value={8}>8 Characters</option>
                      <option value={12}>12 Characters</option>
                      <option value={16}>16 Characters</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-700">Require Special Characters</span>
                    <input type="checkbox" checked={requireSpecialChars} onChange={(e) => setRequireSpecialChars(e.target.checked)} className="w-4 h-4 text-[#0073bb] border-gray-300 rounded focus:ring-[#0073bb]" />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 mt-2">
                <button onClick={saveSettings} className="px-5 py-2 rounded-[4px] bg-[#0073bb] text-white text-[13px] font-bold hover:bg-[#00609a] transition-colors shadow-sm focus:outline-none">Save Security Preferences</button>
              </div>
            </div>
          </div>
        );

      case 'delivery':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Delivery Defaults</h2>
              <p className="text-[13px] text-gray-500">Set default options for your Secure Links.</p>
            </div>
            <div className="max-w-2xl flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-900">Default Link Expiration</label>
                <select value={defaultLinkExpiration} onChange={(e) => setDefaultLinkExpiration(e.target.value)} className="px-3 py-2 text-[14px] bg-white border border-[#EAEAEA] rounded-[4px] text-gray-900 focus:outline-none focus:border-[#0073bb]">
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-900">Default Recipient Message</label>
                <textarea rows={3} value={defaultRecipientMessage} onChange={(e) => setDefaultRecipientMessage(e.target.value)} placeholder="Here is the secure document you requested..." className="px-3 py-2 text-[14px] bg-white border border-[#EAEAEA] rounded-[4px] text-gray-900 focus:outline-none focus:border-[#0073bb]" />
              </div>
              
              <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-bold text-gray-900 text-[13px] mb-1">Privacy & Data Defaults</h3>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="defAutoDelete" checked={defaultAutoDelete} onChange={(e) => setDefaultAutoDelete(e.target.checked)} className="w-4 h-4 mt-0.5 text-[#0073bb] border-gray-300 rounded focus:ring-[#0073bb]" />
                  <div>
                    <label htmlFor="defAutoDelete" className="text-[13px] font-bold text-gray-900 cursor-pointer">Delete original file after locking</label>
                    <p className="text-[12px] text-gray-500">Only the encrypted vault will remain. (Applies to both Secure Links & Offline Vaults)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 mt-1">
                  <input type="checkbox" id="defHideName" checked={defaultHideFileName} onChange={(e) => setDefaultHideFileName(e.target.checked)} className="w-4 h-4 mt-0.5 text-[#0073bb] border-gray-300 rounded focus:ring-[#0073bb]" />
                  <div>
                    <label htmlFor="defHideName" className="text-[13px] font-bold text-gray-900 cursor-pointer">Hide original file name</label>
                    <p className="text-[12px] text-gray-500">Renames the vault to "Secure Data". (Applies to both Secure Links & Offline Vaults)</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 mt-2">
                <button onClick={saveSettings} className="px-5 py-2 rounded-[4px] bg-[#0073bb] text-white text-[13px] font-bold hover:bg-[#00609a] transition-colors shadow-sm focus:outline-none">Save Delivery Defaults</button>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Privacy & Data</h2>
              <p className="text-[13px] text-gray-500">Understand how your data is handled.</p>
            </div>
            <div className="max-w-2xl">
              <div className="prose prose-sm text-gray-600">
                <p>AUROQI is built on a zero-knowledge architecture. Your files are encrypted locally on your device before they ever leave it.</p>
                <h4 className="text-gray-900 font-bold mt-4">Local Storage</h4>
                <p>Offline HTML vaults are saved directly to your local file system and never transmitted.</p>
                <h4 className="text-gray-900 font-bold mt-4">Cloud Staging (Secure Links)</h4>
                <p>When you generate a Secure Link, an AES-256 encrypted blob is staged in our secure cloud bucket for delivery. We do not have the decryption key and cannot read your files.</p>
              </div>
            </div>
          </div>
        );

      case 'license':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">License & Subscription</h2>
              <p className="text-[13px] text-gray-500">Manage your AUROQI Pro plan.</p>
            </div>
            <div className="max-w-xl flex flex-col gap-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider mb-1">Current Plan</p>
                    <h3 className="font-bold text-gray-900 text-lg">AUROQI {licenseTier}</h3>
                  </div>
                  {licenseTier === 'PRO' ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[12px] font-bold">Active</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-[12px] font-bold">Free</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 pt-2">
                  <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider mb-1">Hardware ID</p>
                  <p className="text-[13px] font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 select-all">{hardwareId || 'Unknown'}</p>
                </div>
                
                <button onClick={() => window.electronAPI.openExternal('https://account.microsoft.com/services')} className="mt-4 w-full py-2 bg-[#f8f8f8] border border-gray-200 rounded-[4px] text-gray-700 hover:bg-white hover:text-[#0073bb] transition-colors text-[13px] font-bold">
                  Manage Subscription
                </button>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">About AUROQI</h2>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-2">
                  <img src="./AUROQI ICON.png" alt="AUROQI" className="h-8 w-auto shrink-0" />
                  <span className="font-['Outfit'] text-[24px] font-bold tracking-tight text-gray-900 mt-0.5">AUROQI</span>
                </div>
                <p className="text-[14px] text-gray-900 font-bold">AUROQI v{appVersion || '1.0.0'}</p>
                <p className="text-[13px] text-gray-500">© 2026 AUROQI. All rights reserved.</p>
                <div className="flex gap-4 mt-4">
                  <a href="#" className="text-[13px] text-[#0073bb] hover:underline">Terms of Service</a>
                  <a href="#" className="text-[13px] text-[#0073bb] hover:underline">Privacy Policy</a>
                  <a href="#" className="text-[13px] text-[#0073bb] hover:underline">Third-Party Notices</a>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full max-w-6xl mx-auto gap-8">
      {/* Settings Inner Sidebar */}
      <div className="w-56 flex flex-col pt-2 shrink-0 overflow-y-auto">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Preferences</h2>
        <div className="flex flex-col gap-1 mb-6">
          {tabs.slice(0, 5).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeSettingsTab === tab.id ? 'bg-white shadow-sm border border-gray-200 text-[#0073bb]' : 'text-gray-600 hover:bg-gray-100/80 border border-transparent'}`}
            >
              <tab.icon size={16} className={activeSettingsTab === tab.id ? 'text-[#0073bb]' : 'text-gray-400'} />
              {tab.label}
            </button>
          ))}
        </div>
        
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">System</h2>
        <div className="flex flex-col gap-1">
          {tabs.slice(5).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeSettingsTab === tab.id ? 'bg-white shadow-sm border border-gray-200 text-[#0073bb]' : 'text-gray-600 hover:bg-gray-100/80 border border-transparent'}`}
            >
              <tab.icon size={16} className={activeSettingsTab === tab.id ? 'text-[#0073bb]' : 'text-gray-400'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Settings Content Area */}
      <div className="flex-1 overflow-y-auto pt-2 pb-10">
        {renderContent()}
      </div>
    </div>
  );
}
