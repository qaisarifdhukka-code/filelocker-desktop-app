import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, Fingerprint, Lock, CheckCircle2, ChevronRight, X, AlertTriangle, Clock3, Circle, Settings, Loader2, AlertCircle } from 'lucide-react';
import heroBg from './assets/hero.png';
import './App.css';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function StepBadge({ number, active, done }) {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300"
      style={{
        background: done ? 'var(--color-vault-success)' : active ? 'var(--color-vault-accent)' : 'var(--color-vault-border)',
        color: done || active ? '#fff' : 'var(--color-vault-muted)',
        boxShadow: active ? '0 0 16px var(--color-vault-accent-glow)' : 'none',
      }}>
      {done ? '✓' : number}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border p-6 ${className}`}
      style={{ background: 'var(--color-vault-card)', borderColor: 'var(--color-vault-border)' }}>
      {children}
    </div>
  );
}

function PageHeader({ title, description }) {
  return (
    <div className="mb-8 shrink-0 pb-6 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
      <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ color: 'var(--color-deep-navy)' }}>
        {title}
      </h1>
      <p className="text-base leading-relaxed max-w-3xl" style={{ color: 'var(--color-on-surface-variant)' }}>
        {description}
      </p>
    </div>
  );
}

// Progress UI elements removed (ProgressRing not needed anymore)

const STEPS = { SELECT_DRIVE: 0, SELECT_SOURCE: 1, SET_PASSWORD: 2, PROVISION: 3, DONE: 4 };

export default function App() {
  const [step, setStep] = useState(STEPS.SELECT_DRIVE);
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null); // { path, name, size, isFolder }
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hint, setHint] = useState('');
  const [autoDelete, setAutoDelete] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  
  // White Label State (Persisted)
  const [firmName, setFirmName] = useState(localStorage.getItem('wl_firmName') || '');
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('wl_primaryColor') || '#2563EB');
  const [logoBase64, setLogoBase64] = useState(localStorage.getItem('wl_logoBase64') || '');
  const [showSettings, setShowSettings] = useState(false);
  
  // Licensing State
  const [licenseTier, setLicenseTier] = useState(localStorage.getItem('licenseTier') || 'FREE');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activating, setActivating] = useState(false);
  const [hardwareId, setHardwareId] = useState('');
  
  const [error, setError] = useState('');
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef(null);

  const isElectron = typeof window.electronAPI !== 'undefined';

  const loadDrives = useCallback(async () => {
    if (!isElectron) return;
    setLoadingDrives(true);
    try {
      const found = await window.electronAPI.getDrives();
      setDrives(found);
      if (found.length === 1) setSelectedDrive(found[0]);
    } catch (e) {
      setError('Could not read drives: ' + e.message);
    } finally {
      setLoadingDrives(false);
    }
  }, [isElectron]);

  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getHardwareId()
        .then(setHardwareId)
        .catch(() => setHardwareId('ERROR-LOADING-ID'));
      loadDrives();
      window.electronAPI.onProvisionProgress((data) => {
        if (data.error) {
          let friendlyError = data.error;
          if (friendlyError.includes('EPERM') || friendlyError.includes('permission denied')) {
            friendlyError = "Permission Denied: The app does not have permission to write to this drive. Please run as Administrator or select a different drive.";
          }
          setError(friendlyError);
          setStep(STEPS.SET_PASSWORD);
        } else {
          setProgress(data.percent);
          setProgressLabel(data.label);
          if (data.done) setStep(STEPS.DONE);
        }
      });
    }
  }, [loadDrives, isElectron]);

  const handleSelectFile = async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.selectFile();
    if (result) setSelectedSource(result);
  };

  const handleSelectFolder = async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.selectFolder();
    if (result) setSelectedSource(result);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setLogoBase64('');
      return;
    }
    if (file.size > 500 * 1024) {
      setError('Logo must be less than 500KB.');
      e.target.value = '';
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (event) => setLogoBase64(event.target.result);
    reader.readAsDataURL(file);
  };

  const saveSettings = () => {
    localStorage.setItem('wl_firmName', firmName);
    localStorage.setItem('wl_primaryColor', primaryColor);
    localStorage.setItem('wl_logoBase64', logoBase64);
    setShowSettings(false);
  };

  const handleActivate = async () => {
    if (!licenseKeyInput) return;
    setActivating(true);
    setActivationError('');
    try {
      const res = await fetch('https://filelocker-license-server.onrender.com/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKeyInput, hardwareId })
      });
      const data = await res.json();
      if (data.success) {
        setLicenseTier('PRO');
        localStorage.setItem('licenseTier', 'PRO');
      } else {
        setActivationError(data.message);
      }
    } catch (err) {
      setActivationError('Could not connect to activation server.');
    } finally {
      setActivating(false);
    }
  };

  const handleValidatePassword = () => {
    if (password.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    setPasswordError('');
    setStep(STEPS.PROVISION);
    setProgress(0);
    setProgressLabel('Starting...');
    setError('');
    if (isElectron) {
      // If FREE, force default branding to null
      const activeBranding = licenseTier === 'PRO' && (firmName || logoBase64) ? { firmName, primaryColor, logoBase64 } : null;
      window.electronAPI.provisionDrive(selectedDrive.letter, selectedSource.path, password, selectedSource.isFolder, autoDelete, hint, activeBranding)
        .catch(e => setError(e.message));
    } else {
      // Browser demo simulation
      let p = 0;
      const labels = ['Generating key...', 'Encrypting...', 'Writing vault...', 'Copying unlock app...', 'Finalizing...'];
      const iv = setInterval(() => {
        p += Math.floor(Math.random() * 8) + 2;
        if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setStep(STEPS.DONE), 500); }
        setProgress(p);
        setProgressLabel(labels[Math.min(Math.floor(p / 22), labels.length - 1)]);
      }, 200);
    }
  };

  const reset = () => {
    setStep(STEPS.SELECT_DRIVE);
    setSelectedDrive(null);
    setSelectedSource(null);
    setPassword('');
    setConfirmPassword('');
    setHint('');
    setAutoDelete(false);
    setProgress(0);
    setProgressLabel('');
    setError('');
    setPasswordError('');
    loadDrives();
  };

  const pwdStrength = password.length === 0 ? '' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong';
  const pwdColor = pwdStrength === 'Strong' ? 'var(--color-vault-success)' : pwdStrength === 'Good' ? '#ffb300' : 'var(--color-vault-danger)';

  if (licenseTier !== 'PRO') {
    return (
      <div className="flex min-h-screen bg-white font-sans text-gray-900 overflow-hidden w-full">
        {/* Left Side: Brand Panel */}
        <div className="hidden md:flex flex-col justify-between w-5/12 p-12 lg:p-16 relative overflow-hidden bg-[#0F1629]">
          
          {/* Global Hero Image Background */}
          <div className="absolute inset-0 z-0">
            <img src={heroBg} alt="" className="w-full h-full object-cover opacity-80" />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1629] via-transparent to-transparent z-0 opacity-80"></div>
          
          <div className="relative z-10">
            <img src="./filelocker-logo-main-dark.svg" alt="FileLocker Logo" className="h-[36px] w-auto max-w-[200px] object-contain" />
          </div>

          <div className="relative z-10 mt-16 max-w-md">
            <p className="text-[13px] font-bold text-[#2563EB] tracking-wider uppercase mb-4">Enterprise Grade Security</p>
            <h2 className="text-[32px] lg:text-[40px] font-bold text-white leading-tight mb-6">Secure offline file delivery for professionals.</h2>
            <p className="text-[#94A3B8] text-[16px] lg:text-[18px] leading-relaxed">
              Your sensitive files, encrypted to military standards and protected completely offline.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Panel */}
        <div className="w-full md:w-7/12 flex items-center justify-center p-8 relative">
          <div className="w-full max-w-[400px]">
            <div className="mb-10 text-center md:text-left">
              <h2 className="font-['Space_Grotesk'] text-[32px] font-bold text-gray-900 mb-2 tracking-tight">Software Activation</h2>
              <p className="text-[15px] text-gray-500">Enter your License Key to unlock the application for this machine.</p>
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-bold text-gray-700 mb-2">License Key</label>
              <input 
                type="text" 
                value={licenseKeyInput} 
                onChange={(e) => setLicenseKeyInput(e.target.value)} 
                placeholder="e.g. PRO-KEY-123" 
                className="w-full px-4 py-3.5 text-[15px] bg-white border border-gray-300 rounded-[8px] text-gray-900 focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all placeholder-gray-400 font-mono tracking-wide" 
              />
            </div>
            
            {activationError && (
              <div className="w-full p-3 bg-[#FEF2F2] text-[#991B1B] text-[14px] font-medium rounded-[8px] border border-[#FCA5A5] mb-5 flex items-start shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 mr-3 mt-[1px]"><path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {activationError}
              </div>
            )}
            
            <button 
              onClick={handleActivate} 
              disabled={activating || !licenseKeyInput || !hardwareId} 
              className="w-full py-3.5 rounded-[8px] bg-[#2563EB] text-white text-[15px] font-semibold hover:bg-[#1D4ED8] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] mt-2"
            >
              {activating ? 'Activating...' : !hardwareId ? 'Loading Hardware ID...' : 'Activate License'}
            </button>
            
            <div className="mt-6 text-center text-[14px] text-gray-500">
              Don't have a license?{' '}
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); window.electronAPI.openExternal('https://filelockerfolder.netlify.app/register'); }} 
                className="text-[#2563EB] hover:underline font-semibold"
              >
                Get FileLocker Pro
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col md:flex-row antialiased text-on-background overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-full md:w-80 border-r border-[#EAEAEA] p-10 flex flex-col shrink-0 h-screen bg-[#FBFBFC]">
        <div className="flex items-center mb-16">
          <img src="./filelocker-logo-main.svg" alt="FileLocker" className="h-[34px] w-auto object-contain" />
        </div>
        
        <div className="text-[11px] uppercase font-bold text-[#A1A1AA] tracking-[0.2em] mb-10">Deployment Pipeline</div>
        <ul className="flex flex-col gap-8 relative">
          {/* Connecting Line */}
          <div className="absolute top-[12px] bottom-[12px] w-px bg-[#EAEAEA] z-0" style={{ left: '15.5px' }}></div>
          {[
            { label: 'SELECT DRIVE', desc: 'Choose a destination USB', step: STEPS.SELECT_DRIVE },
            { label: 'SELECT FILES', desc: 'Files from your computer', step: STEPS.SELECT_SOURCE },
            { label: 'SET PASSWORD', desc: 'Create vault password', step: STEPS.SET_PASSWORD },
            { label: 'ENCRYPT', desc: 'Secure the payload', step: STEPS.PROVISION },
            { label: 'DONE', desc: 'Ready to distribute', step: STEPS.DONE },
          ].map((s, i) => {
            const isActive = step === s.step;
            const isDone = step > s.step;
            return (
              <li key={i} className="flex items-start group">
                
                {/* The Dot / Ring */}
                <div className="w-8 h-6 flex items-center justify-center shrink-0 mr-4">
                  {isDone ? (
                    <div className="w-[12px] h-[12px] rounded-full bg-[#0073bb] relative z-10 mt-1"></div>
                  ) : isActive ? (
                    <div className="w-[12px] h-[12px] rounded-full bg-[#0073bb] ring-[6px] ring-[#e0f0ff] relative z-10 mt-1"></div>
                  ) : (
                    <div className="w-[10px] h-[10px] rounded-full bg-[#FBFBFC] border-[2px] border-[#D4D4D8] relative z-10 mt-1"></div>
                  )}
                </div>

                {/* Title & Metadata */}
                <div className="flex flex-col mt-0.5 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[15px] font-bold tracking-wide ${isActive || isDone ? 'text-[#005a9e]' : 'text-[#52525b]'}`}>
                      {i + 1} {s.label}
                    </span>
                    {isActive ? (
                      <Clock3 className="w-3.5 h-3.5 text-[#005a9e] shrink-0" strokeWidth={2.5} />
                    ) : isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#005a9e] shrink-0" strokeWidth={2.5} />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                  <span className={`text-[12px] mt-1 ${isActive || isDone ? 'text-[#6b7280]' : 'text-[#a1a1aa]'}`}>{s.desc}</span>
                </div>
              </li>
            );
          })}
        </ul>
        
        <div className="flex-1"></div>
        <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl text-[#52525b] hover:bg-[#f2f3f5] hover:text-[#005a9e] transition-colors font-semibold text-[13px] group mt-8">
          <Settings className="w-4 h-4 text-[#a1a1aa] group-hover:text-[#005a9e] transition-colors" />
          White-Label Settings
        </button>
        <button onClick={() => { localStorage.removeItem('licenseTier'); setLicenseTier('FREE'); }} className="flex items-center gap-3 w-full py-3 px-4 rounded-xl text-[#52525b] hover:bg-[#f2f3f5] hover:text-red-600 transition-colors font-semibold text-[13px] group mt-2">
          <svg className="w-4 h-4 text-[#a1a1aa] group-hover:text-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">

        {/* Header */}
        <header className="h-12 w-full bg-white pl-12 pr-36 flex justify-end items-center z-10 shrink-0 border-b border-[#EAEAEA]" style={{ WebkitAppRegion: 'drag' }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
            <span className="font-mono text-[10px] text-gray-500 font-medium tracking-wider">
              AES-256-GCM • SECURE
            </span>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 bg-white flex flex-col relative overflow-hidden">
          <div className="flex-1 flex flex-col pl-12 pr-36 w-full max-w-5xl py-6 overflow-hidden">

            {/* ── Step 0: Select Drive ── */}
            {step === STEPS.SELECT_DRIVE && (
              <div className="flex flex-col h-full">
                <PageHeader
                  title="Select USB Drive"
                  description="Choose the destination USB drive for your secure vault. Your existing files on this drive will not be erased or formatted."
                />
                {!isElectron && (
                  <div className="mb-6 rounded-lg px-4 py-2 text-sm border" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', borderColor: 'rgba(251, 146, 60, 0.3)', color: 'rgb(124, 45, 18)' }}>
                    ⚠️ Running in browser demo mode. Open in Electron to access real drives.
                  </div>
                )}

                <div className="flex flex-wrap gap-4 flex-1 content-start overflow-y-auto pb-4">
                  {drives.map((drive) => {
                    const isSelected = selectedDrive?.letter === drive.letter;
                    const s = parseFloat(drive.size) || 0;
                    const f = parseFloat(drive.free) || 0;
                    const usedPct = s > 0 ? ((s - f) / s) * 100 : 0;
                    const isAlmostFull = usedPct > 90;

                    return (
                      <div key={drive.letter} onClick={() => setSelectedDrive(drive)}
                        className={`relative w-[260px] bg-white rounded-[2px] p-2 cursor-pointer flex items-center transition-shadow border ${isSelected ? 'border-[#0073bb] shadow-[0_0_0_1px_#0073bb] bg-[#f8f8f8]' : 'border-[#aab7b8] hover:border-[#545b64]'}`}>
                        {isSelected && (
                          <div className="absolute top-1 right-2 text-[#0073bb] font-bold text-sm">✓</div>
                        )}
                        {/* Windows 11 style drive icon */}
                        <div className="w-10 h-10 mr-3 flex-shrink-0 flex items-center justify-center">
                          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 drop-shadow-sm">
                            <rect x="8" y="24" width="48" height="18" rx="2" fill="#787878" />
                            <rect x="12" y="29" width="8" height="8" rx="1" fill="#444" />
                            <rect x="44" y="29" width="8" height="8" rx="1" fill="#fff" fillOpacity="0.3" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] text-gray-900 truncate mb-1.5">{drive.name || 'Local Disk'} ({drive.letter})</h3>
                          <div className="w-full bg-[#d9d9d9] h-[14px] border border-black/10">
                            <div className={`h-full ${isAlmostFull ? 'bg-[#da2626]' : 'bg-[#26a0da]'}`} style={{ width: `${usedPct}%` }}></div>
                          </div>
                          <p className="text-[12px] text-gray-600 truncate mt-1">{drive.free ? drive.free.replace(' free', '') : '0 GB'} free of {drive.size || '0 GB'}</p>
                        </div>
                      </div>
                    );
                  })}

                  {!isElectron && (
                    <div onClick={() => setSelectedDrive({ letter: 'E:', name: 'Demo USB Drive', size: '64 GB', free: '60 GB free' })}
                      className={`relative w-[260px] bg-white rounded-[2px] p-2 cursor-pointer flex items-center transition-shadow border ${selectedDrive?.letter === 'E:' ? 'border-[#0073bb] shadow-[0_0_0_1px_#0073bb] bg-[#f8f8f8]' : 'border-[#aab7b8] hover:border-[#545b64]'}`}>
                      {selectedDrive?.letter === 'E:' && (
                        <div className="absolute top-1 right-2 text-[#0073bb] font-bold text-sm">✓</div>
                      )}
                      <div className="w-10 h-10 mr-3 flex-shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 drop-shadow-sm">
                          <rect x="8" y="24" width="48" height="18" rx="2" fill="#787878" />
                          <rect x="12" y="29" width="8" height="8" rx="1" fill="#444" />
                          <rect x="44" y="29" width="8" height="8" rx="1" fill="#fff" fillOpacity="0.3" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] text-gray-900 truncate mb-1.5">Demo USB Drive (E:)</h3>
                        <div className="w-full bg-[#d9d9d9] h-[14px] border border-black/10">
                          <div className="h-full bg-[#26a0da]" style={{ width: '6.25%' }}></div>
                        </div>
                        <p className="text-[12px] text-gray-600 truncate mt-1">60 GB free of 64 GB</p>
                      </div>
                    </div>
                  )}

                  <div onClick={loadDrives} className={`w-[260px] bg-white rounded-[2px] p-2 border border-[#aab7b8] flex items-center cursor-pointer hover:border-[#545b64] transition-shadow ${loadingDrives ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="w-10 h-10 mr-3 flex-shrink-0 flex items-center justify-center text-gray-400">
                      <span className="text-2xl">⟳</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] text-gray-900 truncate mb-1.5">{loadingDrives ? 'Scanning...' : "Refresh Drives"}</h3>
                      <p className="text-[12px] text-gray-500">Click to rescan USB ports</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Select File or Folder ── */}
            {step === STEPS.SELECT_SOURCE && (
              <div className="flex flex-col h-full">
                <PageHeader
                  title="Select Files or Folder"
                  description={`Choose the files from your computer that you want to securely lock onto ${selectedDrive?.letter}. They will be automatically encrypted.`}
                />
                {!selectedSource ? (
                  <div className="flex flex-wrap gap-4 mb-6">
                    <button onClick={handleSelectFile} className="relative w-[260px] bg-white rounded-[2px] p-2 cursor-pointer flex items-center transition-shadow border border-[#aab7b8] hover:border-[#545b64] text-left group">
                      <div className="w-10 h-10 mr-3 flex-shrink-0 flex items-center justify-center text-gray-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-[13px] text-gray-900 truncate mb-1">Select a File</h3>
                        <p className="text-[12px] text-gray-600 truncate mt-1">Choose a single file</p>
                      </div>
                      <div className="flex-shrink-0 text-gray-300 group-hover:text-[#0066cc] pr-1 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                    </button>
                    <button onClick={handleSelectFolder} className="relative w-[260px] bg-white rounded-[2px] p-2 cursor-pointer flex items-center transition-shadow border border-[#aab7b8] hover:border-[#545b64] text-left group">
                      <div className="w-10 h-10 mr-3 flex-shrink-0 flex items-center justify-center text-gray-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-[13px] text-gray-900 truncate mb-1">Select a Folder</h3>
                        <p className="text-[12px] text-gray-600 truncate mt-1">Choose a full directory</p>
                      </div>
                      <div className="flex-shrink-0 text-gray-300 group-hover:text-[#0066cc] pr-1 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="flex mb-5">
                    <div className="relative w-[260px] bg-[#f8f8f8] rounded-[2px] p-2 flex items-center border border-[#0073bb] shadow-[0_0_0_1px_#0073bb]">
                      <div className="absolute top-1 right-2 text-[#0073bb] font-bold text-sm">✓</div>
                      <div className="w-10 h-10 mr-3 flex-shrink-0 flex items-center justify-center">
                        {selectedSource.isFolder ? (
                          <svg className="w-8 h-8 text-[#0073bb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        ) : (
                          <svg className="w-8 h-8 text-[#0073bb]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-[13px] text-gray-900 font-medium truncate mb-0.5">{selectedSource.name}</h3>
                        <p className="text-[12px] text-gray-600 truncate mb-1.5">{selectedSource.isFolder ? 'Folder' : 'File'} · {formatBytes(selectedSource.size)}</p>
                        <button onClick={() => setSelectedSource(null)} className="text-[11px] text-[#0073bb] hover:underline font-medium">Change Selection</button>
                      </div>
                    </div>
                  </div>
                )}
                {selectedSource && (
                  <label className="flex items-start gap-2.5 mb-6 cursor-pointer">
                    <div className="flex items-center h-4 mt-0.5">
                      <input type="checkbox" checked={autoDelete} onChange={(e) => setAutoDelete(e.target.checked)} className="w-4 h-4 accent-[#0073bb] cursor-pointer" />
                    </div>
                    <div>
                      <p className="text-[13px] text-gray-900 font-medium mb-0.5">Delete original file after locking</p>
                      <p className="text-[12px] text-gray-600">Only the encrypted vault will remain.</p>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* ── Step 2: Set Password ── */}
            {step === STEPS.SET_PASSWORD && (
              <div className="flex flex-col h-full">
                <PageHeader title="Set Vault Password" description="This password locks the vault. There is no recovery option." />
                <div className="w-full max-w-[340px] flex flex-col gap-5">
                  <div>
                    <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Create Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" className={`w-full px-3 py-1.5 text-[14px] bg-white border rounded-[2px] transition-shadow focus:outline-none pr-14 ${passwordError ? 'border-[#d13212] focus:border-[#d13212] focus:shadow-[0_0_0_1px_#d13212]' : 'border-[#aab7b8] focus:border-[#0073bb] focus:shadow-[0_0_0_1px_#0073bb]'}`} />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2 text-[11px] font-bold text-gray-400 hover:text-[#0073bb] uppercase tracking-wider">
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {/* Password Strength */}
                    <div className="flex gap-1 items-center mt-2">
                      {[0, 1, 2, 3].map((i) => {
                        const lit = password.length >= (i + 1) * 2;
                        const pwdColorClass = pwdStrength === 'Strong' ? 'bg-[#10B981]' : pwdStrength === 'Good' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
                        return <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${lit && password.length > 0 ? pwdColorClass : 'bg-gray-200'}`} />;
                      })}
                      <span className={`text-[11px] ml-2 font-bold w-12 text-right ${password.length === 0 ? 'text-gray-400' : pwdStrength === 'Strong' ? 'text-[#10B981]' : pwdStrength === 'Good' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                        {password.length === 0 ? 'Strength' : pwdStrength}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Confirm Password</label>
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleValidatePassword()} placeholder="Type password again" className={`w-full px-3 py-1.5 text-[14px] bg-white border rounded-[2px] transition-shadow focus:outline-none ${passwordError ? 'border-[#d13212] focus:border-[#d13212] focus:shadow-[0_0_0_1px_#d13212]' : 'border-[#aab7b8] focus:border-[#0073bb] focus:shadow-[0_0_0_1px_#0073bb]'}`} />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Password Hint <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input type="text" value={hint} onChange={(e) => setHint(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleValidatePassword()} placeholder="e.g. My childhood pet" maxLength={50} className="w-full px-3 py-1.5 text-[14px] bg-white border border-[#aab7b8] rounded-[2px] focus:outline-none focus:border-[#0073bb] focus:shadow-[0_0_0_1px_#0073bb] transition-shadow" />
                  </div>

                  {(passwordError || error) && (
                    <div className="p-3 mt-1 bg-red-50 border border-red-100 rounded text-[12px] text-red-600 font-medium flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {passwordError || error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Encrypting (Pipeline UI) ── */}
            {step === STEPS.PROVISION && (
              <div className="flex flex-col h-full max-w-2xl mx-auto w-full pt-4">
                <PageHeader title="Deploying to USB" description="Please do not remove the USB drive until all pipeline stages are complete." />

                <div className="flex flex-col relative mt-4">
                  {/* Vertical connecting line */}
                  <div className="absolute left-3 top-4 bottom-8 w-0.5 bg-gray-100 -z-10"></div>

                  {/* Stage 1: Initializing & Deriving Key */}
                  <div className="flex items-start gap-4 mb-8">
                    <div className="bg-white pt-1">
                      {progress >= 10 ? (
                        <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                      ) : (
                        <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
                      )}
                    </div>
                    <div>
                      <h3 className={`text-[15px] font-bold ${progress >= 10 ? 'text-gray-900' : 'text-[#2563EB]'}`}>
                        Secure Key Derivation
                      </h3>
                      <p className="text-[13px] text-gray-500 mt-1">
                        Generating cryptographic key using Argon2id
                      </p>
                    </div>
                  </div>

                  {/* Stage 2: Streaming & Encrypting Data */}
                  <div className="flex items-start gap-4 mb-8">
                    <div className="bg-white pt-1">
                      {progress >= 93 ? (
                        <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                      ) : progress >= 10 ? (
                        <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-[15px] font-bold ${progress >= 93 ? 'text-gray-900' : progress >= 10 ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                        Military-Grade Encryption
                      </h3>
                      <p className={`text-[13px] mt-1 ${progress >= 10 ? 'text-gray-500' : 'text-gray-400'}`}>
                        {progress >= 93 ? 'Encryption complete' : progress >= 10 ? progressLabel : 'Waiting for key derivation'}
                      </p>

                      {/* Active Progress Bar for Stage 2 */}
                      {progress >= 10 && progress < 93 && (
                        <div className="mt-4 w-full">
                          <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                            <span>Progress</span>
                            <span className="text-[#2563EB]">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#2563EB] h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stage 3: Finalizing Vault Payload */}
                  <div className="flex items-start gap-4">
                    <div className="bg-white pt-1">
                      {progress >= 100 ? (
                        <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                      ) : progress >= 93 ? (
                        <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className={`text-[15px] font-bold ${progress >= 100 ? 'text-gray-900' : progress >= 93 ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                        Finalizing Payload
                      </h3>
                      <p className={`text-[13px] mt-1 ${progress >= 93 ? 'text-gray-500' : 'text-gray-400'}`}>
                        {progress >= 100 ? 'Payload finalized' : progress >= 93 ? progressLabel : 'Waiting for encryption to complete'}
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 shrink-0" />
                    <div>
                      <h4 className="text-[13px] font-bold text-red-800">Deployment Failed</h4>
                      <p className="text-[13px] text-red-600 mt-1">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Done ── */}
            {step === STEPS.DONE && (
              <div className="flex flex-col h-full max-w-2xl mx-auto w-full pt-4 text-left">
                <h2 className="text-[20px] font-bold mb-5 pb-3 border-b border-gray-200 text-[#16191f]">
                  Locking Complete
                </h2>

                <div className="p-4 bg-[#f2f8f3] border border-[#b2d8b2] mb-6 rounded flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-[#1d8102] mr-3 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[14px] font-bold text-[#16191f] mb-1">
                      Drive Successfully Locked
                    </h3>
                    <p className="text-[13px] text-[#545b64]">
                      Hand the USB to your client. They only need to open <strong className="text-[#16191f]">Unlock_Vault.html</strong> to access the files.
                    </p>
                  </div>
                </div>

                <button onClick={reset} className="w-full max-w-[200px] py-1.5 px-4 rounded-[2px] bg-white font-bold text-[#16191f] hover:bg-[#f8f8f8] transition-colors border border-[#545b64] shadow-[0_1px_1px_rgba(0,0,0,0.1)] focus:outline-none">
                  Lock Another Drive
                </button>
              </div>
            )}

          </div>

          {/* Sticky Footer */}
          {step < STEPS.PROVISION && (
            <div className="bg-white border-t border-[#EAEAEA] pl-12 pr-12 py-3.5 w-full shrink-0 flex justify-between items-center z-10">
              {step > STEPS.SELECT_DRIVE ? (
                <button onClick={() => setStep(step - 1)} className="px-4 py-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors focus:outline-none">Cancel</button>
              ) : <div></div>}
              
              {step === STEPS.SELECT_DRIVE && (
                <button onClick={() => setStep(STEPS.SELECT_SOURCE)} disabled={!selectedDrive} className="flex items-center justify-center min-w-[120px] py-1.5 px-4 rounded-[4px] bg-[#0073bb] font-medium text-white text-[13px] hover:bg-[#00609a] focus:outline-none focus:ring-2 focus:ring-[#0073bb]/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm">
                  Continue
                </button>
              )}
              {step === STEPS.SELECT_SOURCE && (
                <button onClick={() => setStep(STEPS.SET_PASSWORD)} disabled={!selectedSource} className="flex items-center justify-center min-w-[120px] py-1.5 px-4 rounded-[4px] bg-[#0073bb] font-medium text-white text-[13px] hover:bg-[#00609a] focus:outline-none focus:ring-2 focus:ring-[#0073bb]/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm">
                  Continue
                </button>
              )}
              {step === STEPS.SET_PASSWORD && (
                <button onClick={handleValidatePassword} disabled={!password || !confirmPassword} className="flex items-center justify-center min-w-[120px] py-1.5 px-4 rounded-[4px] bg-[#0073bb] font-medium text-white text-[13px] hover:bg-[#00609a] focus:outline-none focus:ring-2 focus:ring-[#0073bb]/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm">
                  Deploy to USB
                </button>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── Settings Modal Overlay ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[8px] w-full max-w-[500px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#FBFBFC]">
              <div>
                <h2 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-[#10B981] text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Pro</span>
                  White-Label Settings
                </h2>
                <p className="text-[13px] text-gray-500 mt-1">Configure your firm branding for all future vaults.</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-2">Firm Name</label>
                <input type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="e.g. Smith & Associates" className="w-full px-3 py-2 text-[14px] bg-white border border-[#aab7b8] rounded-[6px] focus:outline-none focus:border-[#0073bb] focus:shadow-[0_0_0_2px_#0073bb33] transition-all" />
              </div>
              
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="block text-[13px] font-bold text-gray-900 mb-2">Firm Logo (Max 500KB)</label>
                  <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} className="text-[12px] w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-[4px] file:border-0 file:text-[13px] file:font-semibold file:bg-[#f2f3f3] file:text-[#52525b] hover:file:bg-[#e9eaea] cursor-pointer" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-2">Brand Color</label>
                  <div className="flex items-center gap-3 h-[36px]">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-gray-200 p-0.5 cursor-pointer bg-white" />
                    <span className="text-[13px] font-mono text-gray-600 font-medium uppercase">{primaryColor}</span>
                  </div>
                </div>
              </div>
              
              {logoBase64 && (
                <div className="p-4 border border-dashed border-gray-300 rounded-[8px] bg-[#FBFBFC] flex flex-col items-center justify-center relative group">
                   <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Logo Preview</span>
                   <img src={logoBase64} alt="Preview" className="max-h-12 object-contain" />
                   <button onClick={() => setLogoBase64('')} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                     <X className="w-4 h-4" />
                   </button>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 pt-0 flex justify-end gap-3 bg-white">
              <button onClick={() => setShowSettings(false)} className="px-5 py-2 rounded-[6px] text-[13px] font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={saveSettings} className="px-5 py-2 rounded-[6px] bg-[#0073bb] text-white text-[13px] font-bold hover:bg-[#00609a] transition-colors shadow-sm">Save Settings</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
