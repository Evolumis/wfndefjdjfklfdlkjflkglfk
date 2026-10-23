import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, Check, X, BellRing, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA, hide or show "Installé" indicator
  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        <span>App Installée</span>
      </div>
    );
  }

  const handleAndroidInstall = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleAndroidInstall}
        disabled={isInstalling}
        className={`flex items-center gap-2 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white font-bold shadow-md transition cursor-pointer active:scale-95 ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-xs sm:text-sm'
        }`}
        title="Installer l'application mobile Évasion Soleil sur votre appareil"
      >
        <Smartphone className="w-4 h-4 animate-bounce" />
        <span>{isInstalling ? 'Installation...' : 'Installer l\'App Mobile'}</span>
      </button>
    );
  }

  // iOS Safari flow or fallback
  return (
    <>
      <button
        onClick={() => setShowIOSGuide(true)}
        className={`flex items-center gap-1.5 rounded-xl border border-[#b5e1dc] bg-[#f0f8f7] text-[#143734] font-bold hover:bg-[#daf0ed] transition cursor-pointer active:scale-95 ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
        }`}
        title="Installer sur iPhone / iPad ou Android"
      >
        <Smartphone className="w-4 h-4 text-[#338b84]" />
        <span>{isIOS ? 'Installer sur iPhone' : 'Installer l\'App Mobile'}</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-900 relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#338b84] to-[#205753] flex items-center justify-center text-white shadow-md">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Installer Évasion Soleil Pro
                </h3>
                <p className="text-xs text-slate-500">
                  Pour recevoir vos notifications directement sur votre téléphone
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-5 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="p-2 bg-[#daf0ed] text-[#143734] rounded-lg shrink-0 font-bold">
                  1
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                    <span>Ouvrir dans le navigateur Safari (iOS) ou Chrome (Android)</span>
                  </div>
                  <p className="text-slate-500">
                    Assurez-vous d'être dans votre navigateur principal pour autoriser l'installation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="p-2 bg-[#daf0ed] text-[#143734] rounded-lg shrink-0 font-bold">
                  2
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-sky-600" />
                    <span>Appuyez sur le bouton de Partage</span>
                  </div>
                  <p className="text-slate-500">
                    Sur iPhone : l'icône de carré avec une flèche vers le haut dans la barre Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="p-2 bg-[#daf0ed] text-[#143734] rounded-lg shrink-0 font-bold">
                  3
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                    <PlusSquare className="h-4 w-4 text-emerald-600" />
                    <span>« Sur l'écran d'accueil »</span>
                  </div>
                  <p className="text-slate-500">
                    Sélectionnez « Sur l'écran d'accueil » ou « Installer l'application », puis validez.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-start gap-2">
                <BellRing className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">
                  <strong>Notifications automatiques :</strong> Une fois installée sur votre écran d'accueil, vous recevrez une alerte sonore et vibration à chaque nouvelle soumission de devis et rappel client !
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              Compris, fermer le guide
            </button>
          </div>
        </div>
      )}
    </>
  );
};
