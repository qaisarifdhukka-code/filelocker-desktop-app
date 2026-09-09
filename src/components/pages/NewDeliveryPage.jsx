import React from 'react';
import { ShieldAlert, Fingerprint, Lock, CheckCircle2, ChevronRight, X, AlertTriangle, Clock3, Circle, Settings, Loader2, AlertCircle, Link, HardDrive, Copy, Mail, FileText, Folder, Eye, EyeOff } from 'lucide-react';
import { useAppContext, STEPS } from '../../AppContext';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Formats supported by the Secure Viewer (must match unlock-app/src/App.jsx getViewerType)
const SECURE_VIEWER_SUPPORTED_EXTS = new Set([
  '.pdf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.mp4', '.webm', '.mov', '.mkv',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.txt', '.md', '.csv', '.json', '.xml', '.log',
]);

export default function NewDeliveryPage() {
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
    deliveryMethod, setDeliveryMethod,
    linkExpiration, setLinkExpiration,
    maxViews, setMaxViews,
    recipientEmail, setRecipientEmail,
    verificationMode, setVerificationMode,
    recipientMessage, setRecipientMessage,
    viewerConfig, setViewerConfig,
    emailSubject, emailTemplate,
    progress, progressLabel, error, setError,
    savedPath, secureLinkUrl,
    hardwareId, firmName, primaryColor, logoBase64,
    defaultSaveLocation,
    isElectron, pwdStrength, pwdColor,
    minPasswordLength, requireSpecialChars,
    handleSelectFile, handleSelectFolder, generateStrongPassword,
    handleValidatePassword, simulateProvisioning, reset
  } = state;

  const stepsLayout = [
    { label: 'CONTENT', stepValue: STEPS.SELECT_SOURCE },
    { label: 'SECURITY & ACCESS', stepValue: STEPS.SET_PASSWORD },
    { label: 'RECIPIENT', stepValue: STEPS.DELIVERY_METHOD },
    { label: 'DONE', stepValue: STEPS.DONE }
  ];

  const currentLogicalStep =
    step === STEPS.SELECT_SOURCE ? 0 :
      step === STEPS.SET_PASSWORD ? 1 :
        step === STEPS.DONE ? 3 : 2;

  let pageTitle = '';
  let pageDesc = '';
  if (step === STEPS.SELECT_SOURCE) {
    pageTitle = 'Content Selection';
    pageDesc = 'Select a file or folder to protect.';
  } else if (step === STEPS.SET_PASSWORD) {
    pageTitle = 'Security & Access';
    pageDesc = 'Configure encryption and link rules.';
  } else if (step === STEPS.DELIVERY_METHOD) {
    pageTitle = 'Recipient Details';
    pageDesc = 'Configure who receives this secure link.';
  } else if (step === STEPS.PROVISION) {
    pageTitle = 'Securing Files...';
    pageDesc = 'Please do not close the app.';
  } else if (step === STEPS.DONE) {
    pageTitle = 'Delivery Ready';
    pageDesc = 'Your files are secured and the link is live.';
  }

  // Prevent accidental close during provisioning
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
      // OTP-only mode: password is auto-generated, skip all password validation
      if (verificationMode !== 'otp_only') {
        if (password.length < minPasswordLength) {
          setPasswordError(`Password must be at least ${minPasswordLength} characters.`);
          return;
        }
        if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]+/.test(password)) {
          setPasswordError('Password must contain at least one special character.');
          return;
        }
        if (password !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
      }
      setPasswordError('');
      setStep(STEPS.DELIVERY_METHOD);
    } else if (step === STEPS.DELIVERY_METHOD) {
      const requiresEmail = verificationMode === 'otp_only' || verificationMode === 'otp_and_password';
      if (requiresEmail && !recipientEmail.trim()) {
        setError('Recipient Email is required when Email Verification is enabled.');
        return;
      }
      setError('');
      setStep(STEPS.PROVISION);
      const branding = { firmName, primaryColor, logoBase64 };

      const secureParams = {
        firmSlug: firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        expiresInDays: linkExpiration,
        creatorId: hardwareId,
        recipientMessage: recipientMessage,
        maxViews: maxViews || null,
        verificationMode: verificationMode,
        recipientEmail: recipientEmail
      };

      if (isElectron && window.electronAPI) {
        const passwordBytes = verificationMode === 'otp_only'
          ? null
          : new TextEncoder().encode(password);
        window.electronAPI.provisionDrive(
          null,
          selectedSource.path,
          passwordBytes,
          selectedSource.isFolder,
          false, // autoDelete is always false for online (main.js ignores it anyway)
          hideFileName,
          hint,
          branding,
          secureParams,
          viewerConfig
        );
      } else {
        simulateProvisioning();
      }
    }
  };

  // Shared input class for the settings-like compact look
  const inputClass = "w-full px-4 py-2.5 text-[14px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-all";
  const labelClass = "block text-[14px] font-medium text-gray-700 mb-2";

  // True when Secure Viewer is selected but the file format is not supported
  const selectedExt = selectedSource && !selectedSource.isFolder
    ? ('.' + selectedSource.name.split('.').pop()).toLowerCase()
    : null;
  const isSecureViewerUnsupported =
    viewerConfig.mode === 'secure_view' &&
    selectedExt !== null &&
    !SECURE_VIEWER_SUPPORTED_EXTS.has(selectedExt);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl text-[#1E293B]">

      {/* Header & Step Indicator */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-4 shrink-0 border-b border-gray-200">
        <div>
          <h1 className="text-[24px] font-medium text-gray-900 mb-1">{pageTitle}</h1>
          {pageDesc && <p className="text-[14px] text-gray-500 mb-0">{pageDesc}</p>}
        </div>

        <div className="flex items-center gap-2 mb-1">
          {stepsLayout.map((s, idx) => {
            const isActive = currentLogicalStep === idx;
            const isDone = currentLogicalStep > idx;

            return (
              <React.Fragment key={s.label}>
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-300
                    ${isActive ? 'bg-indigo-600 text-white shadow-md' :
                      isDone ? 'bg-emerald-500 text-white shadow-md' :
                        'bg-gray-100 text-gray-400'}`}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span 
                    className={`text-[12px] font-medium tracking-wide ${isActive ? 'text-indigo-600' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
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
          <div className="flex flex-col h-full max-w-[500px]">
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
              <div className="flex flex-col gap-6">
                <div>
                  <label className={labelClass}>Selected Content</label>
                  <div className="flex items-center justify-between px-4 py-3 border border-gray-200 shadow-sm rounded-xl bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedSource.isFolder ? <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                      <span className="text-[14px] font-medium text-gray-900 truncate">{selectedSource.name}</span>
                      <span className="text-[13px] text-gray-500 ml-1">({formatBytes(selectedSource.size)})</span>
                    </div>
                    <button onClick={() => setSelectedSource(null)} className="text-[13px] font-medium text-blue-600 hover:underline ml-4 flex-shrink-0">Change</button>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={hideFileName} onChange={(e) => setHideFileName(e.target.checked)} className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 transition-all accent-indigo-600" />
                    <span className="text-[14px] text-gray-800 group-hover:text-gray-900 transition-colors">Hide original file name <span className="text-gray-500">("Secure Data")</span></span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: SECURITY & ACCESS ── */}
        {step === STEPS.SET_PASSWORD && (
          <div className="flex flex-col gap-6 max-w-[600px]">
            
            {/* PASSWORD — hidden for otp_only */}
            {verificationMode === 'otp_only' ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-semibold text-blue-800">Auto-Key Mode</p>
                  <p className="text-[13px] text-blue-600 mt-0.5">A cryptographically secure key will be automatically generated and embedded in the secure link. The recipient does not need to enter a password — they only need to verify their email.</p>
                  <p className="text-[12px] text-blue-500 mt-1.5">⚠️ Share the full link including the <code className="font-mono bg-blue-100 px-1 rounded">#key=…</code> portion. If it is stripped, the recipient will not be able to open the file.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-[14px] font-medium text-gray-700">Password</label>
                      <button onClick={generateStrongPassword} className="text-[13px] font-medium text-blue-600 hover:underline focus:outline-none">Auto-Generate</button>
                    </div>
                    <div className="relative">
                      <input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`Min ${minPasswordLength} chars`} className={`${inputClass} pr-10 ${passwordError ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[11px] text-gray-500 hover:text-gray-900 focus:outline-none">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex gap-1.5 items-center mt-2.5">
                      {[0, 1, 2, 3].map((i) => {
                        const lit = password.length >= (i + 1) * 2;
                        const pwdColorClass = pwdStrength === 'Strong' ? 'bg-emerald-500' : pwdStrength === 'Good' ? 'bg-amber-500' : 'bg-red-500';
                        return <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${lit && password.length > 0 ? pwdColorClass : 'bg-gray-200'}`} />;
                      })}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Confirm Password</label>
                    <input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Type password again" className={`${inputClass} ${passwordError ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                  </div>
                </div>

                <div className="w-1/2 pr-2.5">
                   <label className={labelClass}>Password Hint <span className="text-gray-400 font-normal">(Optional)</span></label>
                   <input type="text" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. My childhood pet" maxLength={50} className={inputClass} />
                </div>
              </>
            )}

            {(passwordError || error) && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[14px] text-red-600 font-medium flex items-center shadow-sm">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {passwordError || error}
              </div>
            )}

            <hr className="border-gray-100 my-2" />


            {/* RECIPIENT VERIFICATION */}
            <div>
              <label className={labelClass}>Recipient Verification</label>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="recipientVerification" checked={verificationMode === 'password_only'} onChange={() => setVerificationMode('password_only')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 accent-indigo-600" />
                  <div>
                    <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors font-medium">Password only</span>
                    <p className="text-[12px] text-gray-400">Recipient enters the file password to unlock.</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="recipientVerification" checked={verificationMode === 'otp_only'} onChange={() => setVerificationMode('otp_only')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 accent-indigo-600" />
                  <div>
                    <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors font-medium">Email verification only</span>
                    <p className="text-[12px] text-gray-400">Recipient verifies email via OTP. No password needed. A secure key is embedded in the link.</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="recipientVerification" checked={verificationMode === 'otp_and_password'} onChange={() => setVerificationMode('otp_and_password')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 accent-indigo-600" />
                  <div>
                    <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors font-medium">Email verification + password</span>
                    <p className="text-[12px] text-gray-400">Strongest option: recipient must verify email AND enter the correct password.</p>
                  </div>
                </label>
              </div>
            </div>

            <hr className="border-gray-100 my-2" />

            {/* ACCESS & VIEWER */}
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-5">
                <div>
                  <label className={labelClass}>Link Expiration</label>
                  <select value={linkExpiration} onChange={(e) => setLinkExpiration(Number(e.target.value))} className={inputClass}>
                    <option value={1}>24 hours</option>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Max Accesses</label>
                  <select value={maxViews} onChange={(e) => setMaxViews(Number(e.target.value))} className={inputClass}>
                    <option value={0}>Unlimited</option>
                    <option value={1}>1 access</option>
                    <option value={2}>2 accesses</option>
                    <option value={3}>3 accesses</option>
                    <option value={5}>5 accesses</option>
                    <option value={10}>10 accesses</option>
                  </select>
                </div>
              </div>

              {!selectedSource?.isFolder ? (
                <div className="flex flex-col gap-4">
                  <label className={labelClass}>Viewer Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="viewerMode" checked={viewerConfig.mode === 'download'} onChange={() => setViewerConfig(v => ({ ...v, mode: 'download', allowDownload: true }))} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 accent-indigo-600" />
                      <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors">Download</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="viewerMode" checked={viewerConfig.mode === 'secure_view'} onChange={() => setViewerConfig(v => ({ ...v, mode: 'secure_view', allowDownload: false }))} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 accent-indigo-600" />
                      <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors">Secure Viewer</span>
                    </label>
                  </div>

                  {/* Warning: unsupported format for Secure Viewer */}
                  {viewerConfig.mode === 'secure_view' && selectedSource && !SECURE_VIEWER_SUPPORTED_EXTS.has(('.' + selectedSource.name.split('.').pop()).toLowerCase()) && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Unsupported format for Secure Viewer.</span> The file type <span className="font-mono font-semibold">.{selectedSource.name.split('.').pop().toUpperCase()}</span> cannot be previewed in the browser. Please go back and select a supported format (PDF, JPG, PNG, MP4, MOV, MKV, MP3, WAV, TXT, CSV, etc.), or switch to <strong>Download</strong> mode instead.
                      </div>
                    </div>
                  )}

                  {viewerConfig.mode === 'secure_view' && selectedSource && SECURE_VIEWER_SUPPORTED_EXTS.has(('.' + selectedSource.name.split('.').pop()).toLowerCase()) && (
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

          </div>
        )}

        {/* ── Step 3: DELIVERY ── */}
        {step === STEPS.DELIVERY_METHOD && (
          <div className="flex flex-col gap-7 max-w-[600px]">
            {selectedSource && selectedSource.size > 5 * 1024 * 1024 * 1024 && (
              <div className="text-[12.5px] text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200/60 flex items-start gap-2 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p><strong>Large File Notice:</strong> You are securing a {formatBytes(selectedSource.size)} file for cloud delivery. Upload speed will depend on your internet connection. For instant local delivery, use <strong>Create Offline Package</strong> instead.</p>
              </div>
            )}

            <div className="flex flex-col gap-5">
              <div>
                <label className={labelClass}>Recipient Email {verificationMode === 'otp_only' || verificationMode === 'otp_and_password' ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-400">(Optional)</span>}</label>
                <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className={inputClass} required={verificationMode === 'otp_only' || verificationMode === 'otp_and_password'} />
              </div>
              <div>
                <label className={labelClass}>Message <span className="font-normal text-gray-400">(Optional)</span></label>
                <textarea value={recipientMessage} onChange={(e) => setRecipientMessage(e.target.value)} className={`${inputClass} h-24 resize-none`} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step Provisioning ── */}
        {step === STEPS.PROVISION && (
          <div className="flex flex-col h-full max-w-[500px] mt-4">
            <div className="flex flex-col gap-8">
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
                  <span className="font-medium text-[15px] text-gray-900 block mb-0.5">Military-Grade Encryption</span>
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
                  <span className="font-medium text-[15px] text-gray-900 block mb-0.5">Finalizing Delivery</span>
                  <span className="text-gray-500">{progress >= 100 ? 'Delivery created successfully' : progress >= 93 ? progressLabel : 'Waiting for encryption'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === STEPS.DONE && (
          <div className="flex flex-col gap-6 max-w-[500px]">
            {secureLinkUrl && (
              <>
                <div>
                  <label className={labelClass}>Secure Link</label>
                  <div className="flex items-center shadow-sm rounded-lg">
                    <input type="text" readOnly value={secureLinkUrl} className={`${inputClass} shadow-none rounded-r-none border-r-0`} />
                    <button onClick={() => {
                        navigator.clipboard.writeText(secureLinkUrl);
                        const btn = document.getElementById('copy-btn');
                        if (btn) { const original = btn.innerText; btn.innerText = 'Copied'; setTimeout(() => btn.innerText = original, 2000); }
                      }} id="copy-btn"
                      className="px-5 py-2.5 text-[14px] font-medium text-white bg-gray-900 hover:bg-black rounded-r-lg transition-all border border-gray-900 shrink-0"
                    >Copy</button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div><span className="font-medium text-gray-900">Expires:</span> {linkExpiration} days</div>
                  <div><span className="font-medium text-gray-900">Accesses:</span> {maxViews === 0 ? 'Unlimited' : maxViews}</div>
                  <div><span className="font-medium text-gray-900">Mode:</span> {viewerConfig.mode === 'secure_view' ? 'Secure Viewer' : 'Download'}</div>
                </div>

                <button
                  onClick={() => {
                    let parsedSubject = emailSubject || 'Secure Document Delivery';
                    let parsedBody = emailTemplate || '';
                    const parsedFirm = firmName || 'Auroqi User';
                    parsedSubject = parsedSubject.replace(/{{FIRM_NAME}}/g, parsedFirm);
                    parsedBody = parsedBody.replace(/{{FIRM_NAME}}/g, parsedFirm);
                    if (recipientMessage) { parsedBody = parsedBody.replace(/{{MESSAGE}}/g, recipientMessage); } else { parsedBody = parsedBody.replace(/[^\n]*{{MESSAGE}}[^\n]*\n?/g, ''); }
                    const htmlBody = `<div style="font-family: sans-serif; font-size: 14px; color: #333;">${parsedBody.replace(/{{SECURE_LINK}}/g, `<a href="${secureLinkUrl}">${secureLinkUrl}</a>`).replace(/{{EXPIRATION}}/g, `${linkExpiration}`).replace(/\n/g, '<br/>')}</div>`;
                    if (isElectron && window.electronAPI && window.electronAPI.openEmailDraft) { window.electronAPI.openEmailDraft({ to: recipientEmail, subject: parsedSubject, htmlBody }); } else { window.open(`mailto:${recipientEmail}?subject=${encodeURIComponent(parsedSubject)}&body=${encodeURIComponent(htmlBody.replace(/<[^>]+>/g, ''))}`, '_blank'); }
                  }}
                  className="flex items-center justify-center gap-2 py-3 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                ><Mail className="w-4 h-4" /> Open Email Draft</button>
              </>
            )}

            <button onClick={reset} className="mt-4 w-auto self-start px-6 py-2.5 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all">
              Start New Delivery
            </button>
          </div>
        )}

      </div>

      {/* Footer Actions */}
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
              (step === STEPS.SET_PASSWORD && verificationMode !== 'otp_only' && (!password || !confirmPassword)) ||
              (step === STEPS.SET_PASSWORD && isSecureViewerUnsupported)
            }
            title={step === STEPS.SET_PASSWORD && isSecureViewerUnsupported ? 'Selected file format is not supported by Secure Viewer. Switch to Download mode or select a supported file.' : undefined}
            className="flex items-center justify-center min-w-[120px] py-2.5 px-6 rounded-lg font-medium text-white text-[14px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all bg-indigo-600 hover:bg-indigo-700"
          >
            {step === STEPS.DELIVERY_METHOD ? 'Secure & Send' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
