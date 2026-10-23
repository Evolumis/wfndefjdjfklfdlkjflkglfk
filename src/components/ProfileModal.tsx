import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Check,
  Lock,
  Sparkles,
  Shield,
  User as UserIcon,
  UploadCloud,
  Paperclip,
  FileImage,
  Link2,
  Palette,
  RotateCcw
} from 'lucide-react';
import { User } from '../types';
import {
  getUserInitials,
  getInitialsAvatarUrl,
  AVATAR_COLOR_PALETTES,
  getSafeAvatar
} from '../utils/avatarUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const [avatarUrl, setAvatarUrl] = useState(getSafeAvatar(currentUser.avatar, currentUser.name));
  const [selectedPalette, setSelectedPalette] = useState('teal');
  const [activeTab, setActiveTab] = useState<'avatar' | 'security'>('avatar');
  const [activeMode, setActiveMode] = useState<'initials' | 'upload' | 'url'>('initials');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Two-Factor Authentication (A2F) setup state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(currentUser.twoFactorEnabled));
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email' | 'both'>(
    currentUser.twoFactorMethod || 'both'
  );
  const [totpSecret, setTotpSecret] = useState(currentUser.twoFactorSecret || '');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [isLoading2FA, setIsLoading2FA] = useState(false);
  const [twoFactorSuccessMsg, setTwoFactorSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTwoFactorSetup = async () => {
    setIsLoading2FA(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (res.ok && data.secret) {
        setTotpSecret(data.secret);
        setQrCodeDataUrl(data.qrCodeDataUrl || '');
      }
    } catch (err: any) {
      setErrorMsg('Impossible de charger le QR Code A2F.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleEnable2FA = async () => {
    setIsLoading2FA(true);
    setErrorMsg(null);
    setTwoFactorSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          secret: totpSecret,
          code: totpVerifyCode,
          method: twoFactorMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Code A2F invalide.');
      }
      setTwoFactorEnabled(true);
      setTotpVerifyCode('');
      setTwoFactorSuccessMsg(data.message || 'Protection A2F activée avec succès !');
      await onUpdateUser(currentUser.id, {
        twoFactorEnabled: true,
        twoFactorMethod,
        twoFactorSecret: totpSecret || undefined,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'activation de l\'A2F.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsLoading2FA(true);
    setErrorMsg(null);
    setTwoFactorSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de désactiver l\'A2F.');
      }
      setTwoFactorEnabled(false);
      setTwoFactorSuccessMsg('La double authentification (A2F) a été désactivée.');
      await onUpdateUser(currentUser.id, { twoFactorEnabled: false });
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la désactivation de l\'A2F.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  if (!isOpen) return null;

  // Process File into lightweight base64 Data URL
  const processImageFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
      return;
    }

    // Limit to 10MB raw file
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Le fichier est trop volumineux (maximum 10 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const maxWidth = 500;
        const maxHeight = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressed);
          setUploadedFileName(file.name);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleApplyInitials = (paletteId = selectedPalette) => {
    setSelectedPalette(paletteId);
    const newInitialsUrl = getInitialsAvatarUrl(currentUser.name, paletteId);
    setAvatarUrl(newInitialsUrl);
    setUploadedFileName(null);
  };

  const handleSave = async () => {
    if (!avatarUrl || !avatarUrl.trim()) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onUpdateUser(currentUser.id, { avatar: avatarUrl });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde de la photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = getUserInitials(currentUser.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#143734] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#338b84] flex items-center justify-center text-white shadow-inner">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Photo de Profil Collaborateur
              </h2>
              <p className="text-xs text-slate-300">
                Initiales officielles par défaut ou photo personnalisée au choix
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Current user badge & live preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={avatarUrl || getInitialsAvatarUrl(currentUser.name)}
                alt={currentUser.name}
                className="h-20 w-20 rounded-2xl object-cover ring-4 ring-[#338b84] shadow-md bg-white"
                onError={(e) => {
                  e.currentTarget.src = getInitialsAvatarUrl(currentUser.name);
                }}
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-slate-900 text-white shadow-xs">
                {initials}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-slate-900">{currentUser.name}</span>
                {currentUser.specialTagEnabled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#338b84] text-white">
                    {currentUser.specialTags?.[0] || currentUser.specialTag}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">{currentUser.grade}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    twoFactorEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {twoFactorEnabled ? '🔒 A2F Activée' : 'A2F Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Section Selector: Photo de Profil vs Sécurité & A2F */}
          <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-2xl text-xs font-black gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('avatar');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'avatar'
                  ? 'bg-[#338b84] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="h-4 w-4" />
              <span>Photo de Profil</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('security');
                setErrorMsg(null);
                if (!qrCodeDataUrl) {
                  loadTwoFactorSetup();
                }
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-[#338b84] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Sécurité & A2F</span>
            </button>
          </div>

          {activeTab === 'security' ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${twoFactorEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900">
                        Authentification à Deux Facteurs (A2F)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Protégez votre accès employé avec un code à 6 chiffres à chaque connexion
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      twoFactorEnabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {twoFactorEnabled ? 'Activée' : 'Désactivée'}
                  </span>
                </div>

                {/* Method selector */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-2">
                    Mode de double authentification souhaité :
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFactorMethod('both')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        twoFactorMethod === 'both' || twoFactorMethod === 'totp'
                          ? 'border-[#338b84] bg-[#daf0ed]/40 font-black text-slate-900 ring-1 ring-[#338b84]'
                          : 'border-slate-200 bg-white text-slate-600 font-semibold'
                      }`}
                    >
                      📱 App Authenticator + Courriel
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                        Google Authenticator / Authy ou code envoyé par courriel
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoFactorMethod('email')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        twoFactorMethod === 'email'
                          ? 'border-[#338b84] bg-[#daf0ed]/40 font-black text-slate-900 ring-1 ring-[#338b84]'
                          : 'border-slate-200 bg-white text-slate-600 font-semibold'
                      }`}
                    >
                      ✉️ Code par Courriel (6 chiffres)
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                        Envoi automatique à {currentUser.email}
                      </span>
                    </button>
                  </div>
                </div>

                {(twoFactorMethod === 'both' || twoFactorMethod === 'totp') && (
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="QR Code A2F"
                          className="h-32 w-32 rounded-xl border border-slate-200 p-1 bg-white shrink-0"
                        />
                      ) : (
                        <div className="h-32 w-32 rounded-xl border border-slate-200 flex items-center justify-center text-[11px] text-slate-400 shrink-0">
                          {isLoading2FA ? 'Chargement QR...' : 'QR Code A2F'}
                        </div>
                      )}
                      <div className="space-y-1.5 text-xs">
                        <p className="font-bold text-slate-800">
                          1. Scannez ce QR Code avec votre application A2F
                        </p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Compatible avec Google Authenticator, Microsoft Authenticator, Authy ou Mots de passe Apple.
                        </p>
                        {totpSecret && (
                          <div className="pt-1">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Clé manuelle :
                            </span>
                            <code className="text-[11px] font-mono font-black text-[#0e7068] bg-slate-100 px-2 py-0.5 rounded select-all">
                              {totpSecret}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        2. Entrez le code à 6 chiffres affiché dans l'application pour valider :
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={totpVerifyCode}
                        onChange={(e) => setTotpVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="000000"
                        className="w-full bg-white border-2 border-slate-300 rounded-xl py-2.5 px-4 text-center font-mono font-black text-base tracking-[0.3em] text-slate-900 focus:border-[#338b84] focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {twoFactorSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    ✓ {twoFactorSuccessMsg}
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  {twoFactorEnabled && (
                    <button
                      type="button"
                      onClick={handleDisable2FA}
                      disabled={isLoading2FA}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer disabled:opacity-50"
                    >
                      Désactiver l'A2F
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleEnable2FA}
                    disabled={
                      isLoading2FA ||
                      ((twoFactorMethod === 'both' || twoFactorMethod === 'totp') &&
                        totpVerifyCode.length !== 6)
                    }
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#338b84] hover:bg-[#286f6a] shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isLoading2FA
                      ? 'Validation...'
                      : twoFactorEnabled
                      ? 'Mettre à jour la protection A2F'
                      : 'Activer la protection A2F'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* Mode Selector Tabs: Initials vs File Upload vs URL */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveMode('initials');
                handleApplyInitials(selectedPalette);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeMode === 'initials'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#338b84]" />
              <span>Initiales (Défaut)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('upload')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeMode === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5 text-indigo-600" />
              <span>Importer Fichier</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('url')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeMode === 'url'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="h-3.5 w-3.5 text-amber-600" />
              <span>Lien Web</span>
            </button>
          </div>

          {/* 1. INITIALS MODE (DEFAULT) */}
          {activeMode === 'initials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800">
                    Badge d'initiales officiel ({initials})
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Génère instantanément votre photo de profil nette aux initiales d'Évasion Soleil.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyInitials('teal')}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#338b84] hover:underline cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Réinitialiser</span>
                </button>
              </div>

              {/* Color themes for initials */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVATAR_COLOR_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => handleApplyInitials(pal.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                      selectedPalette === pal.id
                        ? 'border-[#338b84] bg-[#daf0ed]/40 ring-1 ring-[#338b84]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="h-6 w-6 rounded-lg shrink-0 shadow-2xs flex items-center justify-center text-[10px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${pal.from}, ${pal.to})`,
                      }}
                    >
                      {initials}
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate">{pal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. UPLOAD FILE MODE */}
          {activeMode === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#338b84] bg-[#daf0ed]/40 scale-[0.99]'
                    : 'border-slate-300 hover:border-[#338b84] hover:bg-slate-50'
                }`}
              >
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-2 shadow-2xs">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Glissez-déposez votre photo ici ou{' '}
                  <span className="text-[#338b84] underline">parcourez vos fichiers</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  JPG, PNG ou WEBP &bull; Optimisé automatiquement en haute résolution
                </p>
              </div>

              {uploadedFileName && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <div className="flex items-center gap-2 truncate">
                    <FileImage className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{uploadedFileName}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase">
                    Prêt
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. URL MODE */}
          {activeMode === 'url' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Adresse web directe (URL) de votre photo :
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setUploadedFileName(null);
                }}
                placeholder="https://..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500">
                Vous pouvez coller le lien direct d'une photo hébergée sur le web.
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {errorMsg}
            </p>
          )}

          {/* Security & Ranks notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-black block text-amber-950">RÈGLE STRICTE ÉVASION SOLEIL :</span>
              Chaque collaborateur peut choisir librement sa photo de profil personnelle ou utiliser ses initiales officielles par défaut. Les noms, grades et tags d'agence restent gérés par la direction et le département IT.
            </div>
          </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !avatarUrl.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#338b84] hover:bg-[#286f6a] text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>Photo mise à jour !</span>
              </>
            ) : isSaving ? (
              <span>Sauvegarde...</span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Enregistrer ma photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
