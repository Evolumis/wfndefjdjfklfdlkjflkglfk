import React, { useState, useEffect } from 'react';
import {
  Sun,
  Lock,
  User as UserIcon,
  Key,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Globe,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  KeyRound,
  Send,
} from 'lucide-react';
import { User } from '../types';

interface EmployeePortalLoginProps {
  onLoginSuccess: (user: User) => void;
  allUsers: User[];
}

export const EmployeePortalLogin: React.FC<EmployeePortalLoginProps> = ({
  onLoginSuccess,
  allUsers,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot / Reset Password state with email verification code
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState<'request_code' | 'enter_code' | 'new_password' | 'success'>('request_code');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [validatedToken, setValidatedToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);

  // Two-Factor Authentication (A2F) state
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email' | 'both'>('both');
  const [twoFactorEmailHint, setTwoFactorEmailHint] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorNotice, setTwoFactorNotice] = useState('');

  // Check URL query parameters for reset token on load
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const resetToken = urlParams.get('reset_token');
      const emailParam = urlParams.get('email');
      if (resetToken) {
        if (emailParam) setResetIdentifier(emailParam);
        setValidatedToken(resetToken);
        setResetStep('new_password');
        setShowForgotModal(true);
        setResetSuccess(true);
        setResetMessage('Lien de réinitialisation sécurisé validé. Définissez votre nouveau mot de passe.');
        fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(resetToken)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d && d.valid && d.email) {
              setResetIdentifier(d.email);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const performLogin = async (userToAuth: string, passToAuth: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setTwoFactorNotice('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userToAuth.trim(), password: passToAuth }),
      });

      const data = await res.json();
      if (res.ok && data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorChallengeToken(data.challengeToken || '');
        setTwoFactorMethod(data.method || 'both');
        setTwoFactorEmailHint(data.emailHint || '');
        setTwoFactorCode('');
        return;
      }

      if (res.ok && data.user) {
        try {
          sessionStorage.setItem('evasion_employee_session', JSON.stringify(data.user));
          localStorage.setItem('evasion_employee_session', JSON.stringify(data.user));
          sessionStorage.setItem('evasion_active_tab', 'submissions');
        } catch {}
        onLoginSuccess(data.user);
        return;
      } else {
        // Strict verification: only allow local fallback if password explicitly matches
        const cleanU = userToAuth.trim().toLowerCase();
        const matched = allUsers.find(
          (u) =>
            ((u.username && u.username.toLowerCase() === cleanU) ||
              u.email.toLowerCase() === cleanU) &&
            u.password === passToAuth
        );
        if (matched) {
          try {
            sessionStorage.setItem('evasion_employee_session', JSON.stringify(matched));
            localStorage.setItem('evasion_employee_session', JSON.stringify(matched));
            sessionStorage.setItem('evasion_active_tab', 'submissions');
          } catch {}
          onLoginSuccess(matched);
          return;
        } else {
          setErrorMsg(data.error || 'Nom d\'utilisateur ou mot de passe incorrect.');
        }
      }
    } catch {
      // Local fallback with strict password matching
      const cleanU = userToAuth.trim().toLowerCase();
      const matched = allUsers.find(
        (u) =>
          ((u.username && u.username.toLowerCase() === cleanU) ||
            u.email.toLowerCase() === cleanU) &&
          u.password === passToAuth
      );
      if (matched) {
        try {
          sessionStorage.setItem('evasion_employee_session', JSON.stringify(matched));
          localStorage.setItem('evasion_employee_session', JSON.stringify(matched));
          sessionStorage.setItem('evasion_active_tab', 'submissions');
        } catch {}
        onLoginSuccess(matched);
        return;
      } else {
        setErrorMsg('Nom d\'utilisateur ou mot de passe invalide. Veuillez vérifier vos identifiants.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = twoFactorCode.replace(/\s+/g, '');
    if (cleanCode.length !== 6) {
      setErrorMsg('Veuillez saisir le code A2F complet à 6 chiffres.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setTwoFactorNotice('');

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken: twoFactorChallengeToken,
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        try {
          sessionStorage.setItem('evasion_employee_session', JSON.stringify(data.user));
          localStorage.setItem('evasion_employee_session', JSON.stringify(data.user));
          sessionStorage.setItem('evasion_active_tab', 'submissions');
        } catch {}
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || 'Code A2F invalide ou expiré.');
      }
    } catch {
      setErrorMsg('Erreur réseau lors de la vérification A2F.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendTwoFactor = async () => {
    if (!twoFactorChallengeToken) return;
    setIsLoading(true);
    setErrorMsg('');
    setTwoFactorNotice('');
    try {
      const res = await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken: twoFactorChallengeToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTwoFactorNotice(data.message || 'Un nouveau code A2F vous a été envoyé par courriel.');
      } else {
        setErrorMsg(data.error || 'Impossible de renvoyer le code.');
      }
    } catch {
      setErrorMsg('Erreur lors du renvoi du code A2F.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Veuillez saisir votre nom d\'utilisateur ou courriel');
      return;
    }
    await performLogin(username, password);
  };

  // Étape 1 : Demande du code de vérification par courriel
  const handleSendVerificationCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = resetIdentifier.trim();
    if (!cleanId) {
      setResetSuccess(false);
      setResetMessage('Veuillez saisir le courriel ou nom d\'utilisateur de votre compte.');
      return;
    }

    setIsResetting(true);
    setResetMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(true);
        if (data.email) setResetIdentifier(data.email);
        if (data.resetToken) setValidatedToken(data.resetToken);
        if (data.fallbackCode) {
          setVerificationCode(String(data.fallbackCode));
        }
        setResetStep('enter_code');
        setResetMessage(
          data.message ||
            `Un code de vérification à 6 chiffres a été généré et envoyé à ${data.email || cleanId}. Veuillez l'écrire ci-dessous.`
        );
      } else {
        setResetSuccess(false);
        setResetMessage(data.error || 'Aucun compte trouvé avec ce courriel ou identifiant.');
      }
    } catch {
      setResetSuccess(false);
      setResetMessage('Erreur de connexion lors de l\'envoi du code. Veuillez réessayer.');
    } finally {
      setIsResetting(false);
    }
  };

  // Étape 2 : Vérification du code à 6 chiffres saisi par l'utilisateur
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setResetSuccess(false);
      setResetMessage('Veuillez écrire le code de vérification complet à 6 chiffres.');
      return;
    }

    setIsResetting(true);
    setResetMessage('');

    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(true);
        if (data.token) setValidatedToken(data.token);
        setResetStep('new_password');
        setResetMessage('Code vérifié avec succès ! Vous pouvez maintenant saisir votre nouveau mot de passe.');
      } else {
        setResetSuccess(false);
        setResetMessage(data.error || 'Code de vérification invalide ou expiré.');
      }
    } catch {
      setResetSuccess(false);
      setResetMessage('Erreur lors de la validation du code.');
    } finally {
      setIsResetting(false);
    }
  };

  // Étape 3 : Définition et enregistrement final du nouveau mot de passe
  const handleFinalResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = resetIdentifier.trim();
    if (!cleanId && !validatedToken && !verificationCode.trim()) {
      setResetSuccess(false);
      setResetMessage('Identifiant ou code de vérification manquant.');
      return;
    }
    if (!newPassword) {
      setResetSuccess(false);
      setResetMessage('Veuillez saisir un nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 4) {
      setResetSuccess(false);
      setResetMessage('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetSuccess(false);
      setResetMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsResetting(true);
    setResetMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          newPassword: newPassword.trim(),
          code: verificationCode.trim(),
          token: validatedToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(true);
        setResetStep('success');
        setResetMessage(data.message || 'Votre mot de passe a été mis à jour avec succès dans la base de données !');
        if (data.user) {
          setResetUser(data.user);
          setUsername(data.user.username || data.user.email || cleanId);
        } else {
          setUsername(cleanId);
        }
        setPassword(newPassword.trim());
      } else {
        setResetSuccess(false);
        setResetMessage(data.error || 'Erreur lors de la réinitialisation du mot de passe.');
      }
    } catch {
      setResetSuccess(false);
      setResetMessage('Erreur de connexion avec le serveur.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-[#143734] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-[#338b84] selection:text-white">
      {/* Top domain banner */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-[#338b84] text-xs font-semibold backdrop-blur-xs shadow-inner">
          <Globe className="h-3.5 w-3.5 text-[#338b84]" />
          <span>intranet.evasionsoleil.com</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[11px]">Intranet Collaborateur Sécurisé</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-[#338b84] to-[#205753] flex items-center justify-center text-white shadow-xl ring-4 ring-[#338b84]/20">
            <Sun className="h-10 w-10 animate-spin-slow" />
          </div>
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-black text-white tracking-tight">
          Évasion Soleil
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-400">
          Portail Interne des Conseillers & Administrateurs
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-slate-200/50">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {twoFactorNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{twoFactorNotice}</div>
            </div>
          )}

          {requiresTwoFactor ? (
            <form className="space-y-4 animate-in fade-in duration-200" onSubmit={handleVerifyTwoFactor}>
              <div className="p-3.5 rounded-2xl bg-[#daf0ed]/50 border border-[#338b84]/30 flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#338b84] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-black text-slate-900 block mb-0.5">
                    Double Authentification (A2F) Requise
                  </span>
                  {twoFactorMethod === 'totp'
                    ? 'Ouvrez votre application Authenticator (Google Authenticator, Authy) et entrez le code à 6 chiffres.'
                    : `Saisissez le code à 6 chiffres de votre application Authenticator ou celui envoyé à ${twoFactorEmailHint || 'votre courriel'}.`}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Code de sécurité A2F (6 chiffres)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="block w-full py-3 px-4 text-center font-mono font-black text-xl tracking-[0.35em] bg-slate-50 border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-300 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#338b84] focus:border-[#338b84] transition-all"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || twoFactorCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-xs sm:text-sm font-bold text-white bg-[#338b84] hover:bg-[#286f6a] transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Validation A2F...</span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Vérifier le code & Se connecter</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRequiresTwoFactor(false);
                    setTwoFactorCode('');
                    setErrorMsg('');
                    setTwoFactorNotice('');
                  }}
                  className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  &larr; Retour aux identifiants
                </button>
                <button
                  type="button"
                  onClick={handleResendTwoFactor}
                  disabled={isLoading}
                  className="font-bold text-[#338b84] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Renvoyer par courriel</span>
                </button>
              </div>
            </form>
          ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom d'utilisateur ou Courriel
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: prenom.nom ou courriel"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#338b84] focus:border-[#338b84] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setResetIdentifier(username || '');
                    setResetMessage('');
                    setResetSuccess(false);
                  }}
                  className="text-[11px] font-semibold text-[#338b84] hover:text-[#286f6a] hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#338b84] focus:border-[#338b84] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-xs sm:text-sm font-bold text-white bg-[#338b84] hover:bg-[#286f6a] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#338b84] transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Vérification...</span>
                ) : (
                  <>
                    <span>Accéder à l'Espace Employé</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
          )}

          {/* Security & Access Information */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px] uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Sécurité & Base de Données</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Accès sécurisé pour l'ensemble des conseillers et de la direction. Tous les comptes utilisateurs sont sauvegardés de manière permanente.
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-200/60">
                <span>Stockage : Persistant Hybride (JSON/MySQL)</span>
                <span className="text-emerald-700 font-bold">● Synchronisé</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Évasion Soleil &copy; 2026 &bull; Domaine officiel : intranet.evasionsoleil.com</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Les rangs et tags spéciaux sont strictement gérés par le département IT.
          </p>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#338b84]" />
                <span>Réinitialisation Sécurisée du Mot de Passe</span>
              </h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setResetMessage('');
                  setResetSuccess(false);
                  setResetStep('request_code');
                  setVerificationCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Stepper Progress */}
            {resetStep !== 'success' && (
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      resetStep === 'request_code'
                        ? 'bg-[#338b84] text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    1
                  </span>
                  <span className={`text-[11px] font-semibold ${resetStep === 'request_code' ? 'text-slate-900' : 'text-slate-400'}`}>
                    Courriel
                  </span>
                </div>
                <div className="h-0.5 flex-1 mx-2 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      resetStep === 'enter_code'
                        ? 'bg-[#338b84] text-white'
                        : resetStep === 'new_password'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    2
                  </span>
                  <span className={`text-[11px] font-semibold ${resetStep === 'enter_code' ? 'text-slate-900' : 'text-slate-400'}`}>
                    Code de vérification
                  </span>
                </div>
                <div className="h-0.5 flex-1 mx-2 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      resetStep === 'new_password'
                        ? 'bg-[#338b84] text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    3
                  </span>
                  <span className={`text-[11px] font-semibold ${resetStep === 'new_password' ? 'text-slate-900' : 'text-slate-400'}`}>
                    Nouveau mot de passe
                  </span>
                </div>
              </div>
            )}

            {/* Message Alert */}
            {resetMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                  resetSuccess
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {resetSuccess ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">{resetMessage}</div>
              </div>
            )}

            {/* STEP 1: REQUEST CODE VIA EMAIL */}
            {resetStep === 'request_code' && (
              <form onSubmit={handleSendVerificationCode} className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Entrez l'adresse courriel ou le nom d'utilisateur associé à votre compte. Un <strong>code de vérification à 6 chiffres</strong> vous sera envoyé pour confirmer votre identité.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Courriel ou identifiant de votre compte *
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="ex: prenom.nom@evasionsoleil.com ou admin"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetMessage('');
                    }}
                    className="px-3.5 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !resetIdentifier.trim()}
                    className="px-4 py-2.5 rounded-xl font-bold bg-[#338b84] hover:bg-[#286f6a] text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isResetting ? 'Envoi en cours...' : 'M\'envoyer le code de vérification'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: ENTER 6-DIGIT VERIFICATION CODE */}
            {resetStep === 'enter_code' && (
              <form onSubmit={handleVerifyCodeSubmit} className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Veuillez écrire le code de vérification à 6 chiffres que vous avez reçu par courriel :
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Code de vérification (6 chiffres) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="ex: 123456"
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl py-3 px-4 text-center font-mono font-black text-lg tracking-[0.3em] text-slate-900 focus:bg-white focus:border-[#338b84] focus:ring-2 focus:ring-[#338b84]/20 focus:outline-hidden"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSendVerificationCode()}
                    disabled={isResetting}
                    className="text-xs font-semibold text-[#338b84] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Renvoyer un nouveau code</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep('request_code');
                        setVerificationCode('');
                      }}
                      className="px-3 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting || verificationCode.length < 6}
                      className="px-4 py-2.5 rounded-xl font-bold bg-[#338b84] hover:bg-[#286f6a] text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{isResetting ? 'Vérification...' : 'Valider le code'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: DEFINE NEW PASSWORD */}
            {resetStep === 'new_password' && (
              <form onSubmit={handleFinalResetPasswordSubmit} className="space-y-3.5 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Votre identité est confirmée. Saisissez votre nouveau mot de passe pour le compte <strong>{resetIdentifier}</strong>.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nouveau mot de passe *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Définir votre nouveau mot de passe..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pr-10 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Confirmer le nouveau mot de passe *
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez le nouveau mot de passe..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetMessage('');
                    }}
                    className="px-3.5 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !newPassword || newPassword !== confirmPassword}
                    className="px-4 py-2.5 rounded-xl font-bold bg-[#338b84] hover:bg-[#286f6a] text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>{isResetting ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {resetStep === 'success' && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="font-black text-emerald-900 text-sm">
                    Mot de passe modifié avec succès !
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    Votre nouveau mot de passe a été immédiatement enregistré dans la base de données et synchronisé.
                  </p>
                </div>

                <div className="space-y-2">
                  {resetUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        onLoginSuccess(resetUser);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Se connecter immédiatement avec ce compte</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        setUsername(resetIdentifier);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white font-bold text-xs shadow-md cursor-pointer transition-all"
                    >
                      <span>Retourner à la page de connexion</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

