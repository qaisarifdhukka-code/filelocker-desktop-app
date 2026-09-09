import React from 'react';
import { CheckCircle2, AlertTriangle, Circle, Loader2, AlertCircle, HardDrive, FileText, Folder, Eye, EyeOff, Info } from 'lucide-react';
import { useAppContext, STEPS } from '../../AppContext';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// The threshold at which main.js switches from single-HTML to two-file package (main.js L22 + L499)
const SINGLE_FILE_THRESHOLD_MB = 50;
const SINGLE_FILE_THRESHOLD_BYTES = SINGLE_FILE_THRESHOLD_MB * 1024 * 1024;

const SECURE_VIEWER_SUPPORTED_EXTS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.mp4', '.webm', '.mov', '.mkv',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.txt', '.md', '.csv', '.json', '.xml', '.log'
]);

export default function NewOfflineDeliveryPage() {
  const state = useAppContext();
  const {
    step, setStep,
    selectedSource, setSelectedSource,
    autoDelete, setAutoDelete,
    hideFileName, setHideFileName,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    passwordError, setPasswordError,
    hint, setHint,
    progress, progressLabel, error,
    savedPath, setSavedPath,
    hardwareId, firmName, primaryColor, logoBase64,
    defaultSaveLocation,
    isElectron, pwdStrength,
    minPasswordLength, requireSpecialChars,
    viewerConfig, setViewerConfig,
    handleSelectFile, handleSelectFolder, generateStrongPassword,
    simulateProvisioning, reset, showToast
  } = state;

  // Determine output format based on real 50MB threshold from main.js
  const estimatedSizeBytes = selectedSource?.size || 0;
  const willBeTwoFilePackage = estimatedSizeBytes > SINGLE_FILE_THRESHOLD_BYTES;

  // Ensure Viewer Mode falls back to 'download' if file is large
  React.useEffect(() => {
    if (willBeTwoFilePackage && viewerConfig.mode === 'secure_view') {
      setViewerConfig(v => ({ ...v, mode: 'download', allowDownload: true }));
    }
  }, [willBeTwoFilePackage, viewerConfig.mode, setViewerConfig]);

  // 3-step flow: CONTENT -> SECURITY -> DONE (skip DELIVERY_METHOD entirely)
  const stepsLayout = [
    { label: 'CONTENT', stepValue: STEPS.SELECT_SOURCE },
    { label: 'SECURITY', stepValue: STEPS.SET_PASSWORD },
    { label: 'DONE', stepValue: STEPS.DONE }
  ];

  // Map actual STEPS values to visual step index (0, 1, 2)
  const currentLogicalStep =
    step === STEPS.SELECT_SOURCE ? 0 :
      step === STEPS.SET_PASSWORD ? 1 :
        2; // PROVISION and DONE both show as final step

  let pageTitle = '';
  let pageDesc = '';
  if (step === STEPS.SELECT_SOURCE) {
    pageTitle = 'Content Selection';
    pageDesc = 'Select a file or folder to encrypt.';
  } else if (step === STEPS.SET_PASSWORD) {
    pageTitle = 'Password & Security';
    pageDesc = 'Set the encryption password for the package.';
  } else if (step === STEPS.PROVISION) {
    pageTitle = 'Encrypting...';
    pageDesc = 'Please do not close the app.';
  } else if (step === STEPS.DONE) {
    pageTitle = 'Package Ready';
    pageDesc = 'Your encrypted offline package is ready to save.';
  }

  // Guard against accidental close during provisioning
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (step === STEPS.PROVISION) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  const handleContinue = () => {
    if (step === STEPS.SELECT_SOURCE) {
      setStep(STEPS.SET_PASSWORD);
    } else if (step === STEPS.SET_PASSWORD) {
      if (password.length < minPasswordLength) {
        setPasswordError(`Password must be at least ${minPasswordLength} characters.`);
        return;
      }
      if (requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(password)) {
        setPasswordError('Password must contain at least one special character.');
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match.');
        return;
      }
      setPasswordError('');
      setStep(STEPS.PROVISION);

      const branding = { firmName, primaryColor, logoBase64 };

      // Offline mode: secureParams MUST be null — this is how main.js detects offline routing (L507)
      if (isElectron && window.electronAPI) {
        window.electronAPI.provisionDrive(
          null,                                     // destination: null = use temp dir
          selectedSource.path,
          new TextEncoder().encode(password),
          selectedSource.isFolder,
          autoDelete,                               // only fires for offline per main.js L692
          hideFileName,
          hint,
          branding,
          null,                                     // secureParams = null -> offline path in main.js
          willBeTwoFilePackage ? { mode: 'download', allowDownload: true, enableWatermark: false } : viewerConfig
        );
      } else {
        simulateProvisioning();
      }
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-[14px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-all";
  const labelClass = "block text-[14px] font-medium text-gray-700 mb-2";

  const pwdColorClass = pwdStrength === 'Strong' ? 'bg-emerald-500' : pwdStrength === 'Good' ? 'bg-amber-500' : 'bg-red-500';

  const selectedExt = selectedSource && !selectedSource.isFolder 
    ? ('.' + selectedSource.name.split('.').pop()).toLowerCase() 
    : '';
  const isSecureViewerUnsupported = viewerConfig.mode === 'secure_view' && 
    selectedExt && 
    !SECURE_VIEWER_SUPPORTED_EXTS.has(selectedExt);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl text-[#1E293B]">

      {/* Header & Step Indicator */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-4 shrink-0 border-b border-gray-200">
        <div>
          <h1 className="text-[24px] font-medium text-gray-900 mb-1">{pageTitle}</h1>
          {pageDesc && <p className="text-[14px] text-gray-500">{pageDesc}</p>}
        </div>

        <div className="flex items-center gap-2 mb-1">
          {stepsLayout.map((s, idx) => {
            const isActive = currentLogicalStep === idx;
            const isDone = currentLogicalStep > idx;
            return (
              <React.Fragment key={s.label}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-md' : isDone ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[12px] font-medium tracking-wide ${isActive ? 'text-indigo-600' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < stepsLayout.length - 1 && (
                  <div className={`w-6 h-px ${isDone ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-1">

        {/* ── Step 1: CONTENT ── */}
        {step === STEPS.SELECT_SOURCE && (
          <div className="flex flex-col max-w-[500px] gap-6">
            {!selectedSource ? (
              <div className="flex gap-4">
                <button onClick={handleSelectFile} className="flex-1 flex items-center justify-center gap-2 py-5 px-4 bg-white border border-gray-200 shadow-sm rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-all text-[14px] font-medium text-gray-900">
                  <FileText className="w-5 h-5 text-gray-500" /> Select File
                </button>
                <button onClick={handleSelectFolder} className="flex-1 flex items-center justify-center gap-2 py-5 px-4 bg-white border border-gray-200 shadow-sm rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-all text-[14px] font-medium text-gray-900">
                  <Folder className="w-5 h-5 text-gray-500" /> Select Folder
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className={labelClass}>Selected Content</label>
                  <div className="flex items-center justify-between px-4 py-3 border border-gray-200 shadow-sm rounded-xl bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedSource.isFolder
                        ? <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        : <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                      <span className="text-[14px] font-medium text-gray-900 truncate">{selectedSource.name}</span>
                      <span className="text-[13px] text-gray-500 ml-1 shrink-0">({formatBytes(selectedSource.size)})</span>
                    </div>
                    <button onClick={() => setSelectedSource(null)} className="text-[13px] font-medium text-blue-600 hover:underline ml-4 flex-shrink-0">Change</button>
                  </div>
                </div>

                {/* Dynamic output format indicator — uses the real 50MB threshold from main.js */}
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-[13px] ${willBeTwoFilePackage ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50/60 border-blue-100 text-blue-700'}`}>
                  {willBeTwoFilePackage
                    ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    : <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />}
                  <div>
                    {willBeTwoFilePackage ? (
                      <>
                        <p className="font-semibold mb-0.5">Two-File Package (file &gt; {SINGLE_FILE_THRESHOLD_MB}MB)</p>
                        <p>The package will include a <strong>.vault</strong> data file and a separate <strong>Unlock_Vault.html</strong>. Both files must stay in the same folder for the recipient to unlock it.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold mb-0.5">Single HTML File (file &le; {SINGLE_FILE_THRESHOLD_MB}MB)</p>
                        <p>The package will be a single portable <strong>.html</strong> file. The recipient double-clicks it and enters the password — no installation needed.</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={hideFileName} onChange={(e) => setHideFileName(e.target.checked)} className="w-4 h-4 accent-indigo-600 rounded" />
                    <span className="text-[14px] text-gray-800 group-hover:text-gray-900">Hide original file name <span className="text-gray-500">("Secure Data")</span></span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={autoDelete} onChange={(e) => setAutoDelete(e.target.checked)} className="w-4 h-4 accent-indigo-600 rounded" />
                    <span className="text-[14px] text-gray-800 group-hover:text-gray-900">Auto-delete original file after encrypting</span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: SECURITY ── */}
        {step === STEPS.SET_PASSWORD && (
          <div className="flex flex-col gap-6 max-w-[600px]">

            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-[14px] font-medium text-gray-700">Password</label>
                  <button onClick={generateStrongPassword} className="text-[13px] font-medium text-blue-600 hover:underline focus:outline-none">Auto-Generate</button>
                </div>
                <div className="relative">
                  <input
                    autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`Min ${minPasswordLength} chars`}
                    className={`${inputClass} pr-10 ${passwordError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[11px] text-gray-500 hover:text-gray-900 focus:outline-none">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex gap-1.5 items-center mt-2.5">
                  {[0, 1, 2, 3].map((i) => {
                    const lit = password.length >= (i + 1) * 2;
                    return <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${lit && password.length > 0 ? pwdColorClass : 'bg-gray-200'}`} />;
                  })}
                </div>
              </div>

              <div>
                <label className={labelClass}>Confirm Password</label>
                <input
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => state.setConfirmPassword(e.target.value)}
                  placeholder="Type password again"
                  className={`${inputClass} ${passwordError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                />
              </div>
            </div>

            <div className="w-1/2 pr-2.5">
              <label className={labelClass}>Password Hint <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. My childhood pet" maxLength={50} className={inputClass} />
            </div>

            <div className="pt-4 border-t border-gray-200">
              {!selectedSource?.isFolder ? (
                <div className="flex flex-col gap-4">
                  <label className={labelClass}>Viewer Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="viewerMode" checked={viewerConfig.mode === 'download'} onChange={() => setViewerConfig(v => ({ ...v, mode: 'download', allowDownload: true }))} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 accent-indigo-600" />
                      <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors">Download</span>
                    </label>
                    <label className={`flex items-center gap-2 ${willBeTwoFilePackage ? 'cursor-not-allowed opacity-50' : 'cursor-pointer group'}`} title={willBeTwoFilePackage ? "Secure Viewer is disabled for large offline packages (>50MB)." : ""}>
                      <input type="radio" name="viewerMode" checked={viewerConfig.mode === 'secure_view'} disabled={willBeTwoFilePackage} onChange={() => setViewerConfig(v => ({ ...v, mode: 'secure_view', allowDownload: false }))} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 accent-indigo-600 disabled:cursor-not-allowed" />
                      <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors">Secure Viewer</span>
                    </label>
                  </div>

                  {willBeTwoFilePackage && (
                    <div className="text-[13px] text-gray-500 italic mt-1">
                      Note: Secure Viewer is disabled for offline packages over 50MB.
                    </div>
                  )}

                  {viewerConfig.mode === 'secure_view' && selectedSource && !SECURE_VIEWER_SUPPORTED_EXTS.has(selectedExt) && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Unsupported format for Secure Viewer.</span> The file type <span className="font-mono font-semibold">.{selectedExt.toUpperCase()}</span> cannot be previewed in the browser. Please go back and select a supported format or switch to <strong>Download</strong> mode.
                      </div>
                    </div>
                  )}

                  {viewerConfig.mode === 'secure_view' && selectedSource && SECURE_VIEWER_SUPPORTED_EXTS.has(selectedExt) && (
                    <div className="flex flex-col gap-3 mt-2">
                      {[['allowDownload', 'Allow Download'], ['allowPrint', 'Allow Print'], ['allowCopy', 'Allow Copy / Select']].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={viewerConfig[key]} onChange={() => setViewerConfig(v => ({ ...v, [key]: !v[key] }))} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 accent-indigo-600" />
                          <span className="text-[14px] text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
                        </label>
                      ))}
                      <div className="mt-2">
                        <label className="block text-[13px] font-medium text-gray-600 mb-1.5">Custom Watermark <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input type="text" value={viewerConfig.customWatermark || ''} onChange={e => setViewerConfig(v => ({ ...v, customWatermark: e.target.value }))} placeholder="Confidential" className={inputClass} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center text-[14px] text-gray-500 italic p-4 bg-gray-50 rounded-xl border border-gray-100">
                  Viewer Mode is not available for folders (Standard Download applied).
                </div>
              )}
            </div>

            {(passwordError || error) && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[14px] text-red-600 font-medium flex items-center shadow-sm">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {passwordError || error}
              </div>
            )}

            {/* Offline-specific limitation reminders */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-600">
              <p className="font-semibold text-gray-800 mb-2">Offline Package — What's not included</p>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li>No link expiration — valid until the recipient unlocks it</li>
                <li>No access limits — password is the only access control</li>
                <li>No activity tracking — you won't know who opened it or when</li>
                <li>No email OTP verification — password only</li>
              </ul>
            </div>

          </div>
        )}

        {/* ── PROVISION: Progress ── */}
        {step === STEPS.PROVISION && (
          <div className="flex flex-col max-w-[500px] mt-4 gap-8">
            <div className="flex items-center gap-4">
              {progress >= 10 ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> : <Loader2 className="w-6 h-6 text-blue-600 animate-spin shrink-0" />}
              <div className="text-[14px]">
                <span className="font-medium text-[15px] text-gray-900 block mb-0.5">Secure Key Derivation</span>
                <span className="text-gray-500">Generating cryptographic key using Argon2id</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              {progress >= 93 ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> : progress >= 10 ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin shrink-0" /> : <Circle className="w-6 h-6 text-gray-200 shrink-0" />}
              <div className="flex-1 text-[14px]">
                <span className="font-medium text-[15px] text-gray-900 block mb-0.5">Encrypting File</span>
                <span className="text-gray-500">{progress >= 93 ? 'Encryption complete' : progress >= 10 ? progressLabel : 'Waiting for key derivation'}</span>
                {progress >= 10 && progress < 93 && (
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {progress >= 100 ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> : progress >= 93 ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin shrink-0" /> : <Circle className="w-6 h-6 text-gray-200 shrink-0" />}
              <div className="text-[14px]">
                <span className="font-medium text-[15px] text-gray-900 block mb-0.5">Building Package</span>
                <span className="text-gray-500">{progress >= 100 ? 'Package ready to save' : progress >= 93 ? progressLabel : 'Waiting for encryption'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === STEPS.DONE && (
          <div className="flex flex-col gap-6 max-w-[500px]">
            <div>
              <label className={labelClass}>Offline Package</label>
              <div className="text-[12.5px] text-gray-500 mb-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  {willBeTwoFilePackage ? (
                    <><strong>Two-file package:</strong> A <strong>.vault</strong> data file and an <strong>Unlock_Vault.html</strong> opener are ready. Keep both files in the same folder — the recipient opens the HTML file to unlock.</>
                  ) : (
                    <><strong>Single HTML file:</strong> A portable <strong>.html</strong> file is ready. The recipient double-clicks it and enters the password — no installation needed.</>
                  )}
                </p>
              </div>
              {savedPath && !savedPath.includes('FileLocker_Temp') && !savedPath.includes('Temp') && (
                <p className="text-[13px] font-mono break-all text-gray-600 mb-3 select-all bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">{savedPath}</p>
              )}
              {isElectron && savedPath && savedPath.includes('FileLocker_Temp') && (
                <button
                  onClick={async () => {
                    try {
                      const destPath = await window.electronAPI.saveOfflineHtml(savedPath, selectedSource.name, hideFileName, defaultSaveLocation);
                      if (destPath) {
                        setSavedPath(destPath);
                        showToast('Offline package saved successfully!', 'success');
                      }
                    } catch (err) {
                      showToast('Failed to save offline package.', 'error');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-medium text-white bg-[#18181B] hover:bg-black rounded-lg shadow-sm transition-all"
                >
                  <HardDrive className="w-4 h-4" /> Save Offline Package
                </button>
              )}
            </div>

            <button onClick={reset} className="mt-2 w-auto self-start px-6 py-2.5 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all">
              Encrypt Another File
            </button>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      {step < STEPS.PROVISION && (
        <div className="pt-4 mt-auto border-t border-gray-200 flex justify-between shrink-0 bg-white">
          {step > STEPS.SELECT_SOURCE ? (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
              ← Back
            </button>
          ) : <div></div>}
          <button
            onClick={handleContinue}
            disabled={
              (step === STEPS.SELECT_SOURCE && !selectedSource) ||
              (step === STEPS.SET_PASSWORD && (!password || !confirmPassword)) ||
              (step === STEPS.SET_PASSWORD && isSecureViewerUnsupported)
            }
            title={step === STEPS.SET_PASSWORD && isSecureViewerUnsupported ? 'Selected file format is not supported by Secure Viewer. Switch to Download mode or select a supported file.' : undefined}
            className="flex items-center justify-center min-w-[120px] py-2.5 px-6 rounded-lg font-medium text-white text-[14px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all bg-indigo-600 hover:bg-indigo-700"
          >
            {step === STEPS.SET_PASSWORD ? 'Encrypt & Package' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
