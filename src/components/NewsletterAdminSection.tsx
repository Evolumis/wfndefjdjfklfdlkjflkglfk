import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Clock,
  Filter,
  Eye,
  Calendar,
  Layers,
  Search,
  Check,
  RefreshCw,
  ExternalLink,
  Shield,
  FileText,
  UserCheck,
  UserX,
  Code,
  Copy,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  User,
  NewsletterSubscriber,
  NewsletterCampaign,
  QuoteSubmission,
} from '../types';

interface NewsletterAdminSectionProps {
  currentUser: User;
  allSubmissions: QuoteSubmission[];
}

export const NewsletterAdminSection: React.FC<NewsletterAdminSectionProps> = ({
  currentUser,
  allSubmissions,
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'subscribers' | 'history' | 'embed_code'>('compose');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [copiedCodeType, setCopiedCodeType] = useState<string | null>(null);

  // Compose State
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [category, setCategory] = useState<'all' | 'last_minute' | 'croisiere' | 'forfait_sud' | 'vip_exclusive'>('all');
  const [targetAudience, setTargetAudience] = useState<'subscribers_only' | 'all_clients_and_subscribers'>('all_clients_and_subscribers');
  const [contentHtml, setContentHtml] = useState(
    `<h2 style="color: #0e7068; margin-top: 0;">🌴 Spéciaux Évasion Soleil de la Semaine !</h2>
<p>Chers voyageurs passionnés,</p>
<p>Cette semaine, nos conseillers ont déniché pour vous des rabais exceptionnels vers les plus belles plages du Sud et des forfaits croisières tout-inclus incontournables :</p>

<div style="background-color: #f8fafc; border-left: 4px solid #0e7068; padding: 14px 18px; margin: 16px 0; border-radius: 8px;">
  <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px;">☀️ Cancún & Riviera Maya - 5 Étoiles Tout-Inclus</h3>
  <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">Départ de Montréal | 7 nuits | Vols directs et transferts inclus</p>
  <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0e7068;">À partir de 1 199 $ / personne (Économisez 350 $)</p>
</div>

<div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; margin: 16px 0; border-radius: 8px;">
  <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px;">🚢 Croisière Caraïbes de l'Est - Cabine avec Balcon</h3>
  <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">7 nuits | Boissons illimitées & Pourboires inclus</p>
  <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0284c7;">À partir de 1 450 $ / personne</p>
</div>

<p>Besoin d'un devis sur mesure ou de bloquer ces tarifs avant écoulement des places ?</p>
<div style="text-align: center; margin: 24px 0;">
  <a href="https://evasionsoleil.com/devis" style="background-color: #0e7068; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; display: inline-block;">
    Demander mon devis personnalisé en 2 min
  </a>
</div>`
  );

  // Status banners
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Filter subscribers
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');

  useEffect(() => {
    fetchSubscribers();
    fetchCampaigns();
  }, []);

  const fetchSubscribers = async () => {
    setSubscribersLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter/subscribers');
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    } finally {
      setSubscribersLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/newsletter/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setFeedback({ type: 'error', message: 'Veuillez définir un objet pour votre infolettre.' });
      return;
    }
    if (!contentHtml.trim()) {
      setFeedback({ type: 'error', message: 'Le contenu du message ne peut pas être vide.' });
      return;
    }

    const recipientEstimatedCount = targetAudience === 'all_clients_and_subscribers'
      ? subscribers.filter((s) => s.status === 'active').length + allSubmissions.length
      : subscribers.filter((s) => s.status === 'active').length;

    const confirmMsg = `Êtes-vous sûr de vouloir diffuser cette offre par courriel à environ ${recipientEstimatedCount} client(s) et abonné(s) ?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          previewText: previewText.trim(),
          content: contentHtml,
          category,
          targetAudience,
          sentByUserId: currentUser.id,
          sentByUserName: currentUser.name || currentUser.username,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la diffusion de la campagne.');
      }

      setFeedback({
        type: 'success',
        message: `${data.message} (${data.sentCount} courriels expédiés)`,
      });

      fetchCampaigns();
      fetchSubscribers();
      setActiveTab('history');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Échec de l\'envoi.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!window.confirm(`Supprimer définitivement l'abonné ${email} ?`)) return;
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Error deleting subscriber:', err);
    }
  };

  const activeSubscribersCount = subscribers.filter((s) => s.status === 'active').length;
  const unsubscribedCount = subscribers.filter((s) => s.status === 'unsubscribed').length;

  // Filter subscribers list
  const filteredSubscribers = subscribers.filter((s) => {
    if (subscriberStatusFilter !== 'all' && s.status !== subscriberStatusFilter) {
      return false;
    }
    if (subscriberSearch.trim()) {
      const q = subscriberSearch.toLowerCase();
      return (
        s.email.toLowerCase().includes(q) ||
        (s.firstName && s.firstName.toLowerCase().includes(q)) ||
        (s.lastName && s.lastName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#338b84] to-[#143734] flex items-center justify-center text-white shadow-sm shrink-0">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Diffusion Infolettres & Offres
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#338b84]/15 text-[#236862] text-[11px] font-black uppercase">
                  Marketing Client
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Rédigez et diffusez des offres de voyage exclusives à l'ensemble de vos clients et abonnés avec gestion automatique du désabonnement.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Abonnés Actifs</span>
              <span className="text-lg font-black text-[#338b84]">{activeSubscribersCount}</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Clients Soumissions</span>
              <span className="text-lg font-black text-slate-900">{allSubmissions.length}</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Campagnes</span>
              <span className="text-lg font-black text-slate-900">{campaigns.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'compose'
                ? 'bg-[#338b84] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>Rédiger une Offre / Campagne</span>
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'subscribers'
                ? 'bg-[#338b84] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Liste des Abonnés ({subscribers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#338b84] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Historique des Envois ({campaigns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('embed_code')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'embed_code'
                ? 'bg-[#338b84] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>Code HTML & Intégration Footer</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-2.5 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-bold">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* TAB 1: COMPOSE */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#338b84]" />
                  <span>Nouvelle Offre Promotionnelle</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#338b84]" />
                    <span>{previewMode ? 'Mode Édition' : 'Aperçu Direct'}</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendCampaign} className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Objet de l'envoi (Sujet visible dans la boîte de réception) *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: 🌴 Vente Flash : Rabais jusqu'à 400 $ sur vos vacances au Mexique & Caraïbes !"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#338b84] focus:ring-1 focus:ring-[#338b84]"
                  />
                </div>

                {/* Preview text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texte de prévisualisation (Court aperçu sous l'objet)
                  </label>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Ex: Réservez avant vendredi pour profiter des transferts et boissons incluses."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-[#338b84] focus:ring-1 focus:ring-[#338b84]"
                  />
                </div>

                {/* Targeting and Category Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Audience Cible
                    </label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#338b84] focus:ring-1 focus:ring-[#338b84] cursor-pointer"
                    >
                      <option value="all_clients_and_subscribers">
                        Tous nos clients CRM + Abonnés Infolettre (Recommandé)
                      </option>
                      <option value="subscribers_only">
                        Uniquement les abonnés au formulaire infolettre
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thématique / Catégorie d'offre
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#338b84] focus:ring-1 focus:ring-[#338b84] cursor-pointer"
                    >
                      <option value="all">Toutes offres confondues (Générale)</option>
                      <option value="forfait_sud">Forfaits Sud & Tout-Inclus</option>
                      <option value="croisiere">Spécial Croisières</option>
                      <option value="last_minute">Dernière Minute & Ventes Flash</option>
                      <option value="vip_exclusive">Offre VIP Exclusive</option>
                    </select>
                  </div>
                </div>

                {/* Body Content / HTML Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Corps du Message (HTML & Formatage) *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Les liens de désabonnement et de préférences sont insérés automatiquement en pied de page.
                    </span>
                  </div>

                  {previewMode ? (
                    <div className="p-4 sm:p-6 rounded-2xl border border-slate-300 bg-slate-50 min-h-[350px] overflow-y-auto">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-xl mx-auto">
                        <div
                          className="prose prose-sm max-w-none text-slate-800"
                          dangerouslySetInnerHTML={{ __html: contentHtml }}
                        />
                        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
                          <p>Lien direct vers les préférences & bouton de désabonnement en 1 clic inclus automatiquement.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      rows={14}
                      required
                      value={contentHtml}
                      onChange={(e) => setContentHtml(e.target.value)}
                      className="w-full font-mono text-xs p-4 rounded-2xl border border-slate-300 text-slate-800 focus:outline-none focus:border-[#338b84] focus:ring-1 focus:ring-[#338b84] leading-relaxed"
                    />
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    <span>Conforme aux normes canadiennes anti-pourriel (Loi C-28 / CASL).</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-3 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSending ? 'Diffusion en cours...' : 'Diffuser l\'offre aux clients'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Side Info & Tips (1 Col) */}
          <div className="space-y-6">
            {/* Regulatory compliance info */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Règles de diffusion & Sécurité</span>
              </h3>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="block text-slate-900 mb-0.5">Désabonnement en 1 clic :</strong>
                  Chaque courriel envoyé comporte un lien unique permettant au client de se désinscrire immédiatement sans mot de passe.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="block text-slate-900 mb-0.5">Préférences personnalisées :</strong>
                  Le client peut choisir de ne recevoir que les offres qui correspondent à ses destinations favorites.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="block text-slate-900 mb-0.5">Expéditeur certifié :</strong>
                  Envois signés par Voyages Évasion Soleil Inc. (noreply@evasionsoleil.com).
                </div>
              </div>
            </div>

            {/* Quick Template Buttons */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#338b84]" />
                <span>Modèles Rapides d'Offres</span>
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubject('🚢 Spécial Croisières : Cabine balcon avec crédit à bord offert !');
                    setCategory('croisiere');
                    setContentHtml(
                      `<h2 style="color: #0284c7;">🚢 Offre Exclusive Croisières Maritimes</h2>
<p>Chers voyageurs,</p>
<p>Cette semaine, profitez de notre entente spéciale avec Royal Caribbean et Celebrity Cruises : pour toute réservation avant la fin du mois, recevez <strong>200 $ US de crédit à dépenser à bord</strong> ainsi que le forfait boissons illimitées inclus.</p>
<ul>
  <li>Caraïbes de l'Ouest (7 nuits) au départ de Miami : dès 1 149 $</li>
  <li>Bahamas & Île privée Perfect Day at CocoCay : dès 899 $</li>
</ul>
<p>Contactez nos conseillers experts croisières pour réserver la cabine de votre choix !</p>`
                    );
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-[#338b84] text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Modèle : Spécial Croisières
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubject('⚡ Vente Flash 48H : Départs de Dernière Minute à Cancún & Varadero');
                    setCategory('last_minute');
                    setContentHtml(
                      `<h2 style="color: #dc2626;">⚡ ALERTE DERNIÈRE MINUTE : Vente Flash 48H</h2>
<p>Besoin de soleil immédiat ? Des sièges et des chambres 4 étoiles viennent de se libérer à prix coûtant pour des départs dans les 14 prochains jours :</p>
<div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 12px 0;">
  <strong>Varadero - Grand Memories (Tout-inclus) : 799 $</strong><br>
  <strong>Cancún - Riu Caribe (5 Étoiles) : 1 120 $</strong>
</div>
<p>Offres valables selon disponibilité des stocks.</p>`
                    );
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-[#338b84] text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Modèle : Vente Flash 48H
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIBERS LIST */}
      {activeTab === 'subscribers' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Liste des Abonnés ({filteredSubscribers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Abonnés inscrits via le site web, le formulaire de devis ou le CRM
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchSubscribers}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Actualiser"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Graphique de distribution Recharts (Actifs vs Inactifs) */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                  <PieChartIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Distribution des Abonnés Infolettre (Actifs vs Inactifs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Répartition en temps réel des contacts enregistrés dans la base de données
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Actifs : {activeSubscribersCount}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Inactifs : {unsubscribedCount}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                  Rétention : {subscribers.length > 0 ? Math.round((activeSubscribersCount / subscribers.length) * 100) : 100}%
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Donut Chart (Pure SVG, zero dependencies) */}
              <div className="md:col-span-5 h-48 w-full flex items-center justify-center">
                {subscribers.length > 0 ? (
                  (() => {
                    const total = subscribers.length;
                    const activeRatio = total > 0 ? activeSubscribersCount / total : 0;
                    const inactiveRatio = total > 0 ? unsubscribedCount / total : 0;
                    const radius = 56;
                    const strokeWidth = 18;
                    const circumference = 2 * Math.PI * radius;
                    const activeDash = activeRatio * circumference;
                    const inactiveDash = inactiveRatio * circumference;
                    const activePercent = Math.round(activeRatio * 100);

                    return (
                      <div className="relative flex items-center justify-center">
                        <svg width="180" height="180" viewBox="0 0 160 160" className="transform -rotate-90">
                          {/* Background Track */}
                          <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke="#f1f5f9"
                            strokeWidth={strokeWidth}
                          />
                          {/* Active Subscribers Arc */}
                          {activeSubscribersCount > 0 && (
                            <circle
                              cx="80"
                              cy="80"
                              r={radius}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${activeDash} ${circumference}`}
                              strokeDashoffset={0}
                              strokeLinecap={inactiveRatio > 0 ? 'butt' : 'round'}
                              className="transition-all duration-500 ease-out"
                            />
                          )}
                          {/* Inactive Subscribers Arc */}
                          {unsubscribedCount > 0 && (
                            <circle
                              cx="80"
                              cy="80"
                              r={radius}
                              fill="none"
                              stroke="#f43f5e"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${inactiveDash} ${circumference}`}
                              strokeDashoffset={-activeDash}
                              strokeLinecap="butt"
                              className="transition-all duration-500 ease-out"
                            />
                          )}
                        </svg>

                        {/* Center Metric */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="font-mono font-black text-2xl text-slate-900 leading-none">
                            {activePercent}%
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">
                            Actifs
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {total} total
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center text-xs text-slate-400 py-6">
                    Aucun abonné enregistré pour le moment.
                  </div>
                )}
              </div>

              {/* Insights */}
              <div className="md:col-span-7 space-y-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-md bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700">Abonnés Actifs (recevant les offres)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">
                    {activeSubscribersCount} ({subscribers.length > 0 ? Math.round((activeSubscribersCount / subscribers.length) * 100) : 0}%)
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-md bg-rose-500 shrink-0" />
                    <span className="font-semibold text-slate-700">Désabonnés (exclus automatiquement)</span>
                  </div>
                  <span className="font-mono font-bold text-rose-700">
                    {unsubscribedCount} ({subscribers.length > 0 ? Math.round((unsubscribedCount / subscribers.length) * 100) : 0}%)
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                  Conformément aux normes LCAP, les destinataires inactifs ne recevront plus d'infolettres jusqu'à réactivation explicite.
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                placeholder="Rechercher par courriel ou nom..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#338b84]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'active', 'unsubscribed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSubscriberStatusFilter(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    subscriberStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all' && 'Tous'}
                  {st === 'active' && 'Actifs'}
                  {st === 'unsubscribed' && 'Désabonnés'}
                </button>
              ))}
            </div>
          </div>

          {/* Subscribers Table */}
          {subscribersLoading ? (
            <div className="text-center py-12">
              <div className="h-7 w-7 border-2 border-[#338b84] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Chargement de la base d'abonnés...</p>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Aucun abonné ne correspond à votre recherche.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Abonné</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5">Origine</th>
                    <th className="p-3.5">Préférences d'offres</th>
                    <th className="p-3.5">Date d'inscription</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{sub.email}</p>
                        {(sub.firstName || sub.lastName) && (
                          <p className="text-[11px] text-slate-500">
                            {[sub.firstName, sub.lastName].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </td>
                      <td className="p-3.5">
                        {sub.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            <UserCheck className="h-3 w-3" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                            <UserX className="h-3 w-3" />
                            Désabonné
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {sub.source === 'website_footer' && 'Bas de page web'}
                        {sub.source === 'quote_form' && 'Formulaire Devis'}
                        {sub.source === 'admin_import' && 'Import CRM'}
                        {sub.source === 'manual' && 'Manuel'}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {sub.preferences?.sunDestinations && (
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold">
                              Sud
                            </span>
                          )}
                          {sub.preferences?.cruisesSpecials && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold">
                              Croisières
                            </span>
                          )}
                          {sub.preferences?.lastMinuteAlerts && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                              Flash
                            </span>
                          )}
                          {sub.preferences?.offersExclusive && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                              VIP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(sub.subscribedAt).toLocaleDateString('fr-CA')}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/?newsletter_token=${sub.token}&view=newsletter_preferences`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#338b84] hover:bg-slate-100 transition-colors"
                            title="Tester le lien préférences"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CAMPAIGNS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Historique des Envois ({campaigns.length})
              </h2>
              <p className="text-xs text-slate-500">
                Archive complète des offres et communications diffusées
              </p>
            </div>
            <button
              onClick={fetchCampaigns}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Aucune campagne d'offres n'a encore été diffusée.
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{camp.subject}</h3>
                      <p className="text-xs text-slate-500">
                        Envoyé par <span className="font-semibold text-slate-700">{camp.sentByUserName}</span> le {new Date(camp.sentAt).toLocaleString('fr-CA')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#338b84]/15 text-[#236862] text-xs font-black">
                        {camp.recipientsCount} destinataires
                      </span>
                    </div>
                  </div>

                  {camp.previewText && (
                    <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                      « {camp.previewText} »
                    </p>
                  )}

                  <details className="text-xs text-slate-700">
                    <summary className="font-bold text-[#338b84] cursor-pointer hover:underline">
                      Afficher le contenu diffusé
                    </summary>
                    <div
                      className="mt-3 p-4 rounded-xl bg-white border border-slate-200 max-h-60 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: camp.content }}
                    />
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CODE HTML & INTÉGRATION FOOTER */}
      {activeTab === 'embed_code' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#338b84]/15 text-[#236862] text-xs font-black uppercase mb-2">
                <Code className="h-3.5 w-3.5" />
                <span>Code d'Intégration Footer (Format Horizontal Compact)</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Code HTML Horizontal pour le Footer de votre Site Web
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Format ultra-compact priorisant l'horizontal (<strong>Nom, Prénom, Courriel et bouton S'abonner</strong> sur une seule ligne) sans barre de défilement verticale.
              </p>
            </div>

            {/* Live Preview of the Compact Horizontal Bar */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Aperçu en direct du rendu horizontal dans votre footer :
              </span>
              <div className="bg-[#0f172a] text-slate-100 px-4 py-3.5 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-[#14b8a6]">
                      Infolettre Privilège
                    </span>
                    <span className="text-xs text-white/75">
                      Ventes flash & aubaines voyage Évasion Soleil
                    </span>
                  </div>
                </div>
                <div className="flex flex-nowrap items-center gap-1.5">
                  <input
                    type="text"
                    disabled
                    placeholder="Nom"
                    className="w-[21%] bg-white/8 border border-white/20 text-white px-2.5 py-2 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    disabled
                    placeholder="Prénom"
                    className="w-[21%] bg-white/8 border border-white/20 text-white px-2.5 py-2 rounded-lg text-xs"
                  />
                  <input
                    type="email"
                    disabled
                    placeholder="Courriel *"
                    className="flex-1 bg-white/8 border border-white/20 text-white px-2.5 py-2 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    disabled
                    className="shrink-0 bg-[#338b84] text-white font-bold px-3.5 py-2 rounded-lg text-xs whitespace-nowrap"
                  >
                    S'abonner
                  </button>
                </div>
              </div>
            </div>

            {/* Option 1: Code HTML Direct Horizontal (Fond 100% Transparent - Recommandé pour Footer) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-[#338b84] text-white flex items-center justify-center text-xs font-bold">1</span>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Option A : Code HTML Direct (Fond 100% Transparent — Aucun Clash Visuel)
                  </h3>
                </div>
                <button
                  onClick={() => {
                    const htmlCode = `<!-- ==========================================================
     INFOLETTRE PRIVILÈGE ÉVASION SOLEIL (FOND TRANSPARENT & HORIZONTAL)
     S'adapte automatiquement à la couleur de votre footer sans cadre
     ========================================================== -->
<div id="evasion-newsletter-footer" style="background:transparent; color:#f8fafc; padding:0; margin:0; font-family:system-ui,-apple-system,sans-serif; width:100%; box-sizing:border-box;">
  <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
    <span style="color:#14b8a6; font-size:15px; font-weight:700;">Infolettre Privilège</span>
    <span style="font-size:12px; color:rgba(255,255,255,0.75);">Ventes flash & aubaines voyage Évasion Soleil</span>
  </div>

  <form id="evasion-nl-form" onsubmit="return submitEvasionNewsletter(event)" style="margin:0;">
    <div style="display:flex; flex-direction:row; flex-wrap:nowrap; align-items:center; gap:6px; width:100%;">
      <input type="text" id="ev_nl_lastname" placeholder="Nom" style="width:21%; min-width:64px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#ffffff; padding:8px 10px; border-radius:8px; font-size:12px; outline:none; box-sizing:border-box;" />
      <input type="text" id="ev_nl_firstname" placeholder="Prénom" style="width:21%; min-width:64px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#ffffff; padding:8px 10px; border-radius:8px; font-size:12px; outline:none; box-sizing:border-box;" />
      <input type="email" id="ev_nl_email" required placeholder="Courriel *" style="flex:1 1 auto; min-width:105px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#ffffff; padding:8px 10px; border-radius:8px; font-size:12px; outline:none; box-sizing:border-box;" />
      <button type="submit" id="ev_nl_submit_btn" style="flex:0 0 auto; background:#338b84; color:#ffffff; font-weight:700; border:none; padding:8px 14px; border-radius:8px; font-size:12px; cursor:pointer; white-space:nowrap;">
        S'abonner
      </button>
    </div>
    <div id="ev_nl_msg" style="display:none; margin-top:6px; padding:5px 8px; border-radius:6px; font-size:11px; font-weight:600;"></div>
  </form>

  <script>
    function submitEvasionNewsletter(e) {
      e.preventDefault();
      var btn = document.getElementById('ev_nl_submit_btn');
      var msg = document.getElementById('ev_nl_msg');
      var email = document.getElementById('ev_nl_email').value.trim();
      var firstName = document.getElementById('ev_nl_firstname').value.trim();
      var lastName = document.getElementById('ev_nl_lastname').value.trim();

      if (!email) return false;
      btn.disabled = true;
      btn.innerText = '...';

      var apiUrl = '${window.location.origin}/api/newsletter/subscribe';

      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, firstName: firstName, lastName: lastName, source: 'website_footer' })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        msg.style.display = 'block';
        if (data.success) {
          msg.style.background = 'rgba(16,185,129,0.18)';
          msg.style.color = '#34d399';
          msg.innerText = '✅ ' + (data.message || 'Merci ! Vous êtes bien inscrit(e).');
          document.getElementById('evasion-nl-form').reset();
        } else {
          msg.style.background = 'rgba(239,68,68,0.18)';
          msg.style.color = '#f87171';
          msg.innerText = '⚠️ ' + (data.error || 'Erreur lors de l inscription.');
        }
      })
      .catch(function() {
        msg.style.display = 'block';
        msg.style.background = 'rgba(239,68,68,0.18)';
        msg.style.color = '#f87171';
        msg.innerText = '⚠️ Erreur de communication avec le serveur.';
      })
      .finally(function() {
        btn.disabled = false;
        btn.innerText = 'S\\\'abonner';
      });
      return false;
    }
  <\\/script>
</div>`.replace('<\\/script>', '</' + 'script>');
                    navigator.clipboard.writeText(htmlCode);
                    setCopiedCodeType('html');
                    setTimeout(() => setCopiedCodeType(null), 3000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#338b84] hover:bg-[#286f6a] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {copiedCodeType === 'html' ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Code HTML Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copier le Code HTML Transparent</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-56 border border-slate-800">
                <pre>{`<!-- INFOLETTRE PRIVILÈGE ÉVASION SOLEIL (Fond Transparent & Horizontal) -->
<div id="evasion-newsletter-footer" style="background:transparent; padding:0; margin:0; width:100%;">
  <div style="margin-bottom:8px;">
    <span style="color:#14b8a6; font-size:15px; font-weight:700;">Infolettre Privilège</span>
  </div>
  <form id="evasion-nl-form" onsubmit="return submitEvasionNewsletter(event)">
    <div style="display:flex; flex-wrap:nowrap; align-items:center; gap:6px;">
      <input type="text" id="ev_nl_lastname" placeholder="Nom" />
      <input type="text" id="ev_nl_firstname" placeholder="Prénom" />
      <input type="email" id="ev_nl_email" required placeholder="Courriel *" />
      <button type="submit">S'abonner</button>
    </div>
  </form>
</div>`}</pre>
              </div>
            </div>

            {/* Option 2: Iframe Embed Horizontal */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Option B : Intégration Iframe Fond Transparent (Sans bordure ni ascenseur)
                  </h3>
                </div>
                <button
                  onClick={() => {
                    const iframeCode = `<iframe id="evasion-nl-iframe" src="${window.location.origin}/embed/newsletter" width="100%" height="80" allowtransparency="true" scrolling="no" frameborder="0" style="border:none; background:transparent; overflow:hidden; display:block;" title="Infolettre Privilège Évasion Soleil"></iframe>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'EVASION_NEWSLETTER_RESIZE' && e.data.height) {
      var f = document.getElementById('evasion-nl-iframe');
      if (f) f.style.height = (e.data.height + 2) + 'px';
    }
  });
</script>`;
                    navigator.clipboard.writeText(iframeCode);
                    setCopiedCodeType('iframe');
                    setTimeout(() => setCopiedCodeType(null), 3000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {copiedCodeType === 'iframe' ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Code Iframe Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copier le Code Iframe Transparent</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 text-slate-300 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800">
                <code>{`<iframe id="evasion-nl-iframe" src="${window.location.origin}/embed/newsletter" width="100%" height="80" allowtransparency="true" scrolling="no" frameborder="0" style="border:none; background:transparent; overflow:hidden; display:block;" title="Infolettre Privilège Évasion Soleil"></iframe>`}</code>
              </div>
            </div>

            {/* Guide & CRM Integration Note */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Synchronisation Automatique avec le CRM</span>
              </div>
              <p>
                Toute personne s'inscrivant via ce formulaire horizontal (Nom, Prénom, Courriel) apparaît instantanément dans :
              </p>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>L'onglet <strong>CRM / Répertoire Clients</strong> avec le badge vert <strong>« Abonné(e) Infolettre »</strong>.</li>
                <li>Le filtre rapide <strong>« Abonnés Infolettre »</strong> pour isoler les membres du Club Privilège.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
