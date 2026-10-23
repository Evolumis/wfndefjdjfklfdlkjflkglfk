import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  UserX,
  Palmtree,
  Ship,
  Sparkles,
  Clock,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { NewsletterSubscriber, NewsletterPreferences } from '../types';

interface SubscriberPreferencesPageProps {
  token: string;
  onGoBack?: () => void;
  defaultAction?: 'preferences' | 'unsubscribe';
}

export const SubscriberPreferencesPage: React.FC<SubscriberPreferencesPageProps> = ({
  token,
  onGoBack,
  defaultAction = 'preferences',
}) => {
  const [subscriber, setSubscriber] = useState<NewsletterSubscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferences, setPreferences] = useState<NewsletterPreferences>({
    offersExclusive: true,
    lastMinuteAlerts: true,
    cruisesSpecials: true,
    sunDestinations: true,
    frequency: 'weekly',
  });
  const [status, setStatus] = useState<'active' | 'unsubscribed'>('active');

  useEffect(() => {
    fetchSubscriber();
  }, [token]);

  const fetchSubscriber = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/newsletter/subscriber/${token}`);
      if (!res.ok) {
        throw new Error('Lien invalide ou abonné introuvable.');
      }
      const data: NewsletterSubscriber = await res.json();
      setSubscriber(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      if (data.preferences) {
        setPreferences(data.preferences);
      }
      setStatus(data.status);

      if (defaultAction === 'unsubscribe' && data.status === 'active') {
        // Will offer instant 1-click unsubscribe option
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos informations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/newsletter/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          preferences,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde.');
      }
      setSubscriber(data.subscriber);
      setSuccessMsg('Vos préférences de communication ont été mises à jour avec succès !');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickUnsubscribe = async () => {
    if (!window.confirm('Êtes-vous certain(e) de vouloir vous désabonner de toutes les communications par courriel d\'Évasion Soleil ?')) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du désabonnement.');
      }
      setStatus('unsubscribed');
      setSuccessMsg('Vous avez bien été désabonné(e). Vous ne recevrez plus nos courriels promotionnels.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors du désabonnement.');
    } finally {
      setSaving(false);
    }
  };

  const handleResubscribe = () => {
    setStatus('active');
    setSuccessMsg('Cliquez sur « Enregistrer mes préférences » pour réactiver votre abonnement.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-md">
          <div className="h-8 w-8 border-3 border-[#338b84] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-600 font-bold">Chargement de votre profil d'abonné...</p>
        </div>
      </div>
    );
  }

  if (error && !subscriber) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-lg">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">Lien introuvable</h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-6">{error}</p>
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Retour à l'accueil
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#338b84] to-[#143734] flex items-center justify-center text-white shadow-xs">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Préférences de Communication
                </h1>
                <p className="text-xs text-slate-500">
                  Voyages Évasion Soleil &bull; Gestion de votre abonnement
                </p>
              </div>
            </div>

            {onGoBack && (
              <button
                onClick={onGoBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Adresse courriel associée :</span>
              <p className="font-bold text-slate-900">{subscriber?.email}</p>
            </div>
            <div>
              <span className="text-slate-500">Statut actuel :</span>
              <div>
                {status === 'active' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Abonné actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                    <UserX className="h-3 w-3" />
                    Désabonné
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{successMsg}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSavePreferences} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Personal Info */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">
              1. Vos Informations Personnelles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Jean"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#338b84] focus:ring-1 focus:ring-[#338b84]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom de famille
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Tremblay"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#338b84] focus:ring-1 focus:ring-[#338b84]"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Topics of Interest */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-1">
              2. Types d'offres que vous désirez recevoir
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Cochez les catégories de vacances qui vous intéressent pour recevoir des courriels sur mesure :
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.sunDestinations}
                  onChange={(e) =>
                    setPreferences({ ...preferences, sunDestinations: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#338b84] focus:ring-[#338b84] mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Palmtree className="h-4 w-4 text-[#338b84]" />
                    <span>Forfaits Sud & Tout-Inclus Caraïbes / Mexique</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Spéciaux au départ de Montréal/Québec pour Cancún, Punta Cana, Cuba, Jamaïque...
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.cruisesSpecials}
                  onChange={(e) =>
                    setPreferences({ ...preferences, cruisesSpecials: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#338b84] focus:ring-[#338b84] mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Ship className="h-4 w-4 text-sky-600" />
                    <span>Spéciaux Croisières Maritimes & Cabines avec balcon</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Promotions exclusives Royal Caribbean, NCL, Celebrity, MSC et croisières en Europe.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.lastMinuteAlerts}
                  onChange={(e) =>
                    setPreferences({ ...preferences, lastMinuteAlerts: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#338b84] focus:ring-[#338b84] mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Alertes Ventes Flash & Départs Dernière Minute</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Rabais massifs sur les départs dans les 14 à 30 prochains jours.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.offersExclusive}
                  onChange={(e) =>
                    setPreferences({ ...preferences, offersExclusive: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[#338b84] focus:ring-[#338b84] mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Offres VIP & Concours Réservés aux Abonnés</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Crédits d'excursion offerts, surclassements et invitations exclusives.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Frequency */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-2">
              3. Fréquence souhaitée
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'all', label: 'Toutes les aubaines', desc: 'Au fil des annonces (1 à 2 fois / sem)' },
                { id: 'weekly', label: 'Hebdomadaire', desc: 'Une sélection le mardi (Recommandé)' },
                { id: 'monthly', label: 'Mensuelle', desc: 'Le récapitulatif du mois uniquement' },
              ].map((freq) => (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, frequency: freq.id as any })}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    preferences.frequency === freq.id
                      ? 'bg-[#338b84]/10 border-[#338b84] ring-1 ring-[#338b84]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-xs text-slate-900">{freq.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{freq.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Actions: Save or Unsubscribe */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div>
              {status === 'active' ? (
                <button
                  type="button"
                  onClick={handleQuickUnsubscribe}
                  disabled={saving}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer disabled:opacity-50"
                >
                  Me désabonner de toutes les communications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResubscribe}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  Je souhaite réactiver mon abonnement
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer mes préférences'}</span>
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            <span>Vos informations ne sont jamais partagées ni revendues. Agence certifiée Évasion Soleil.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
