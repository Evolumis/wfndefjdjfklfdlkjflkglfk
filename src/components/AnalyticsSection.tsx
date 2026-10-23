import React from 'react';
import {
  BarChart3,
  TrendingUp,
  PhoneCall,
  CheckCircle2,
  Users,
  Compass,
  Ship,
  Palmtree,
  Plane,
  Flame,
  Clock
} from 'lucide-react';
import { DashboardStats, QuoteSubmission } from '../types';

interface AnalyticsSectionProps {
  stats: DashboardStats;
  submissions: QuoteSubmission[];
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  stats,
  submissions,
}) => {
  // Service calculations
  const total = submissions.length || 1;
  const croisiereCount = submissions.filter((s) => s.serviceType === 'croisiere').length;
  const forfaitCount = submissions.filter((s) => s.serviceType === 'forfait_tout_inclus').length;
  const volHotelCount = submissions.filter((s) => s.serviceType === 'vol_hotel').length;
  const battrePrixCount = submissions.filter((s) => s.serviceType === 'battre_prix').length;

  // Status breakdown
  const aAppelerCount = submissions.filter((s) => s.callStatus === 'a_appeler').length;
  const contactEtabliCount = submissions.filter((s) => s.callStatus === 'appele_contact_etabli').length;
  const reserveCount = submissions.filter((s) => s.callStatus === 'reserve').length;

  return (
    <div className="space-y-6">
      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Devis */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Total Demandes Devis
            </span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalSubmissions}</div>
          <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <span>+24%</span>
            <span className="text-slate-400 font-normal">vs mois précédent</span>
          </p>
        </div>

        {/* À Appeler */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              À Appeler en Priorité
            </span>
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <PhoneCall className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{stats.pendingCalls}</div>
          <p className="text-xs text-slate-500 mt-1">
            Prospects en attente d'un premier contact
          </p>
        </div>

        {/* Taux de Conversion */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Taux de Réservation
            </span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.conversionRate} %</div>
          <p className="text-xs text-slate-500 mt-1">
            {stats.completedReservations} voyage(s) finalisé(s)
          </p>
        </div>

        {/* Discussions Martine */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Interactions Martine V.
            </span>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.activeChatConversations}</div>
          <p className="text-xs text-indigo-600 font-medium mt-1">
            Réponses automatiques et qualification
          </p>
        </div>
      </div>

      {/* Grid: Formules demandées & Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par Formule de Voyage */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-base mb-1">
            Répartition par Formule de Voyage
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Intérêt exprimé par les visiteurs sur le formulaire interactif
          </p>

          <div className="space-y-4">
            {/* Croisière */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-sky-700">
                  <Ship className="h-4 w-4" /> Croisières Caraïbes & Monde
                </span>
                <span className="text-slate-800">{croisiereCount} ({Math.round((croisiereCount / total) * 100)}%)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all"
                  style={{ width: `${(croisiereCount / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Tout-Inclus */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <Palmtree className="h-4 w-4" /> Forfaits Tout-Inclus Sud
                </span>
                <span className="text-slate-800">{forfaitCount} ({Math.round((forfaitCount / total) * 100)}%)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${(forfaitCount / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Vol + Hôtel */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <Plane className="h-4 w-4" /> Vol + Hôtel sur-mesure
                </span>
                <span className="text-slate-800">{volHotelCount} ({Math.round((volHotelCount / total) * 100)}%)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${(volHotelCount / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Battre un prix */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <Flame className="h-4 w-4" /> Garantie Battre un prix
                </span>
                <span className="text-slate-800">{battrePrixCount} ({Math.round((battrePrixCount / total) * 100)}%)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${(battrePrixCount / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Destinations */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-base mb-1">
            Top Destinations Préférées
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Classement des destinations les plus sélectionnées
          </p>

          <div className="space-y-3">
            {stats.topDestinations.map((dest, idx) => (
              <div
                key={dest.name}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 text-sm">{dest.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-amber-600">{dest.count}</span>
                  <span className="text-slate-400 text-[11px] ml-1">demandes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
