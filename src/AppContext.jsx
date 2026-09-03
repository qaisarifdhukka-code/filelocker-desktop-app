import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';

const AppContext = createContext();

export const STEPS = { SELECT_SOURCE: 0, SET_PASSWORD: 1, DELIVERY_METHOD: 2, PROVISION: 3, DONE: 4 };

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'new_delivery' | 'deliveries'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);

  const [step, setStep] = useState(STEPS.SELECT_SOURCE);
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null); // { path, name, size, isFolder }
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hint, setHint] = useState('');
  const [autoDelete, setAutoDelete] = useState(localStorage.getItem('wl_defaultAutoDelete') === 'true');
  const [hideFileName, setHideFileName] = useState(localStorage.getItem('wl_defaultHideFileName') === 'true');
  const [passwordError, setPasswordError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const [secureLinkUrl, setSecureLinkUrl] = useState('');

  // Delivery State
  const [deliveryMethod, setDeliveryMethod] = useState('secure_link'); // 'secure_link' | 'offline'
  const [linkExpiration, setLinkExpiration] = useState(Number(localStorage.getItem('wl_defaultLinkExpiration') || '7'));
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientMessage, setRecipientMessage] = useState(localStorage.getItem('wl_defaultRecipientMessage') || '');
  const [maxViews, setMaxViews] = useState(0); // 0 = unlimited
  const [viewerConfig, setViewerConfig] = useState({ mode: 'download', allowDownload: true, allowPrint: false, allowCopy: false, customWatermark: '' });


  // White Label State (Persisted)
  const [firmName, setFirmName] = useState(localStorage.getItem('wl_firmName') || '');
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('wl_primaryColor') || '#18181B');
  const [logoBase64, setLogoBase64] = useState(localStorage.getItem('wl_logoBase64') || '');
  const [timeZone, setTimeZone] = useState(localStorage.getItem('wl_timeZone') || 'America/New_York');
  const [defaultSaveLocation, setDefaultSaveLocation] = useState(localStorage.getItem('wl_defaultSaveLocation') || '');
  
  // Security Preferences
  const [minPasswordLength, setMinPasswordLength] = useState(parseInt(localStorage.getItem('wl_minPasswordLength') || '8', 10));
  const [requireSpecialChars, setRequireSpecialChars] = useState(localStorage.getItem('wl_requireSpecialChars') === 'true');
  
  // Delivery Defaults
  const [defaultLinkExpiration, setDefaultLinkExpiration] = useState(localStorage.getItem('wl_defaultLinkExpiration') || '7');
  const [defaultRecipientMessage, setDefaultRecipientMessage] = useState(localStorage.getItem('wl_defaultRecipientMessage') || '');
  const [defaultAutoDelete, setDefaultAutoDelete] = useState(localStorage.getItem('wl_defaultAutoDelete') === 'true');
  const [defaultHideFileName, setDefaultHideFileName] = useState(localStorage.getItem('wl_defaultHideFileName') === 'true');
  const [emailSubject, setEmailSubject] = useState(localStorage.getItem('wl_emailSubject') || 'Secure File Delivery from {{FIRM_NAME}}');
  const [emailTemplate, setEmailTemplate] = useState(localStorage.getItem('wl_emailTemplate') || 
`Dear Client,

{{FIRM_NAME}} has securely delivered a document to you.

{{MESSAGE}}

Please click the secure link below to access your files:
{{SECURE_LINK}}

For your security, this link will automatically expire in {{EXPIRATION}} days.

Thank you,
{{FIRM_NAME}}`);
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  // Licensing State
  const [licenseTier, setLicenseTier] = useState(localStorage.getItem('licenseTier') || 'FREE');
  const [hardwareId, setHardwareId] = useState('');

  const [storeCheckDone, setStoreCheckDone] = useState(false);
  const [storeStatus, setStoreStatus] = useState(null);

  const [updateStatus, setUpdateStatus] = useState(null);
  const [updatePercent, setUpdatePercent] = useState(0);
  const [appVersion, setAppVersion] = useState('');

  const [error, setError] = useState('');
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [dragging, setDragging] = useState(false);

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
      window.electronAPI.checkStoreLicense().then((result) => {
        if (result.isStoreBuild) {
          if (result.isActive) {
            setLicenseTier('PRO');
            localStorage.setItem('licenseTier', 'PRO');
          } else {
            setStoreStatus('inactive');
          }
        }
        setStoreCheckDone(true);
      });

      window.electronAPI.getHardwareId()
        .then(setHardwareId)
        .catch(() => setHardwareId('ERROR-LOADING-ID'));
      window.electronAPI.getVersion()
        .then(setAppVersion)
        .catch(() => setAppVersion('0.0.0'));
      loadDrives();
      
      const onProgressHandler = (data) => {
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
          if (data.done) {
            if (data.savedPath) setSavedPath(data.savedPath);
            if (data.secureLinkUrl) setSecureLinkUrl(data.secureLinkUrl);
            setStep(STEPS.DONE);
          }
        }
      };

      if (window.electronAPI.onProvisionProgress) {
        window.electronAPI.onProvisionProgress(onProgressHandler);
      }

      if (window.electronAPI.updater) {
        window.electronAPI.updater.onUpdaterEvent((event) => {
          if (event.type === 'download-progress') {
            setUpdateStatus('downloading');
            setUpdatePercent(Math.round(event.percent));
          } else if (event.type === 'update-downloaded') {
            setUpdateStatus('ready');
          }
        });
      }
    } else {
      setStoreCheckDone(true);
    }
  }, [loadDrives, isElectron]);

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let p = "";
    for (let i = 0; i < 16; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(p);
    setConfirmPassword(p);
    setShowPassword(true);
  };

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

  const handleSelectDestFolder = async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.selectDestFolder();
    if (result) {
      setSelectedDrive({ isCustom: true, path: result, name: 'Custom Folder', letter: '', size: '', free: '' });
    }
  };

  const handleChangeDefaultSaveLocation = async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.selectDestFolder();
    if (result) {
      setDefaultSaveLocation(result);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    
    // Increase limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo must be under 2MB', 'error');
      e.target.value = ''; // clear input
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoBase64(event.target.result);
      showToast('Logo uploaded temporarily. Click Save to apply.', 'success');
    };
    reader.onerror = () => {
      showToast('Failed to read file', 'error');
    };
    reader.readAsDataURL(file);
    
    // Clear input so selecting the same file again works
    e.target.value = '';
  };

  const saveSettings = () => {
    localStorage.setItem('wl_firmName', firmName);
    localStorage.setItem('wl_primaryColor', primaryColor);
    localStorage.setItem('wl_logoBase64', logoBase64);
    localStorage.setItem('wl_timeZone', timeZone);
    localStorage.setItem('wl_defaultSaveLocation', defaultSaveLocation);
    localStorage.setItem('wl_minPasswordLength', minPasswordLength.toString());
    localStorage.setItem('wl_requireSpecialChars', requireSpecialChars.toString());
    localStorage.setItem('wl_defaultLinkExpiration', defaultLinkExpiration);
    localStorage.setItem('wl_defaultRecipientMessage', defaultRecipientMessage);
    localStorage.setItem('wl_defaultAutoDelete', defaultAutoDelete.toString());
    localStorage.setItem('wl_defaultHideFileName', defaultHideFileName.toString());
    localStorage.setItem('wl_emailSubject', emailSubject);
    localStorage.setItem('wl_emailTemplate', emailTemplate);
    
    showToast('Settings saved successfully', 'success');
  };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const simulateProvisioning = () => {
    setStep(STEPS.PROVISION);
    setProgress(0);
    setProgressLabel('Starting...');
    setError('');
    let p = 0;
    const labels = ['Generating key...', 'Encrypting...', 'Writing vault...', 'Copying unlock app...', 'Finalizing...'];
    const iv = setInterval(() => {
      p += Math.floor(Math.random() * 8) + 2;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setStep(STEPS.DONE), 500); }
      setProgress(p);
      setProgressLabel(labels[Math.min(Math.floor(p / 22), labels.length - 1)]);
    }, 200);
  };

  const handleValidatePassword = () => {
    if (password.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    setPasswordError('');
    setDeliveryMethod('secure_link'); // Always secure link
    setStep(STEPS.DELIVERY_METHOD);
  };

  const reset = async () => {
    if (isElectron && window.electronAPI) {
      await window.electronAPI.cleanupTempVault().catch(console.error);
    }
    setStep(STEPS.SELECT_SOURCE);
    setSelectedDrive(null);
    setSelectedSource(null);
    setPassword('');
    setConfirmPassword('');
    setHint('');
    setAutoDelete(defaultAutoDelete);
    setHideFileName(defaultHideFileName);
    setLinkExpiration(Number(defaultLinkExpiration));
    setRecipientEmail('');
    setRecipientMessage(defaultRecipientMessage);
    setViewerConfig({ mode: 'download', allowDownload: true, allowPrint: false, allowCopy: false });
    setProgress(0);
    setProgressLabel('');
    setSavedPath('');
    setSecureLinkUrl('');
    setError('');
    setPasswordError('');
    loadDrives();
  };

  const pwdStrength = password.length === 0 ? '' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong';
  const pwdColor = pwdStrength === 'Strong' ? 'var(--color-vault-success)' : pwdStrength === 'Good' ? '#ffb300' : 'var(--color-vault-danger)';

  const state = {
    activeTab, setActiveTab,
    step, setStep,
    drives, setDrives,
    selectedDrive, setSelectedDrive,
    selectedSource, setSelectedSource,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    hint, setHint,
    autoDelete, setAutoDelete,
    hideFileName, setHideFileName,
    passwordError, setPasswordError,
    progress, setProgress,
    progressLabel, setProgressLabel,
    savedPath, setSavedPath,
    secureLinkUrl, setSecureLinkUrl,
    deliveryMethod, setDeliveryMethod,
    linkExpiration, setLinkExpiration,
    recipientEmail, setRecipientEmail,
    recipientMessage, setRecipientMessage,
    maxViews, setMaxViews,
    viewerConfig, setViewerConfig,
    firmName, setFirmName,
    primaryColor, setPrimaryColor,
    logoBase64, setLogoBase64,
    timeZone, setTimeZone,
    defaultSaveLocation, setDefaultSaveLocation,
    minPasswordLength, setMinPasswordLength,
    requireSpecialChars, setRequireSpecialChars,
    defaultLinkExpiration, setDefaultLinkExpiration,
    defaultRecipientMessage, setDefaultRecipientMessage,
    defaultAutoDelete, setDefaultAutoDelete,
    defaultHideFileName, setDefaultHideFileName,
    emailSubject, setEmailSubject,
    emailTemplate, setEmailTemplate,
    activeSettingsTab, setActiveSettingsTab,
    licenseTier, setLicenseTier,
    hardwareId, setHardwareId,
    storeCheckDone, setStoreCheckDone,
    storeStatus, setStoreStatus,
    updateStatus, setUpdateStatus,
    updatePercent, setUpdatePercent,
    appVersion, setAppVersion,
    error, setError,
    loadingDrives, setLoadingDrives,
    dragging, setDragging,
    isElectron,
    pwdStrength,
    pwdColor,
    isSidebarCollapsed, setIsSidebarCollapsed,
    toast
  };

  const actions = {
    generateStrongPassword,
    handleSelectFile,
    handleSelectFolder,
    handleSelectDestFolder,
    handleChangeDefaultSaveLocation,
    handleLogoUpload,
    saveSettings,
    simulateProvisioning,
    handleValidatePassword,
    reset,
    showToast
  };

  return (
    <AppContext.Provider value={{ ...state, ...actions }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
