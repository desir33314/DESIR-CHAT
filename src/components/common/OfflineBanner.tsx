import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

export const OfflineBanner: React.FC = () => {
  const { t } = useLanguage();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await fetch('/api/health');
      setIsOffline(false);
      api.processOfflineQueue();
    } catch {
      setIsOffline(true);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-2 flex items-center justify-between text-xs text-amber-200">
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span className="font-medium">{t('offlineAlert')}</span>
      </div>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="ml-2 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg flex items-center space-x-1 shrink-0 transition"
      >
        <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{t('retry')}</span>
      </button>
    </div>
  );
};
