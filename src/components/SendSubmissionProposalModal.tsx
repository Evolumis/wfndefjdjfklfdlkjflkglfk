import React, { useState } from 'react';
import {
  Send,
  X,
  CheckCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  Layers,
  Compass,
  PlaneLanding,
  PlaneTakeoff,
  Mail,
  ShieldCheck,
  Info
} from 'lucide-react';
import { QuoteSubmission, User, SubmissionProposalItem, SubmissionProposalsPayload } from '../types';

export interface SendSubmissionProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: QuoteSubmission;
  currentUser: User;
  onSuccess: (updatedSubmission: QuoteSubmission) => void;
}

export const SendSubmissionProposalModal: React.FC<SendSubmissionProposalModalProps> = ({
  isOpen,
  onClose,
  submission,
  currentUser,
  onSuccess,
}) => {
  if (!isOpen) return null;

  // Contrôle d'accès strict : Seul le conseiller responsable assigné au dossier peut envoyer la soumission à ce client
  const isAssignedAdvisor = Boolean(
    (submission.assignedToUserId && submission.assignedToUserId === currentUser.id) ||
      (submission.assignedToUserName &&
        submission.assignedToUserName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
  );
  const canSendThisSubmission = isAssignedAdvisor;

  // Mention légale officielle certifiée
  const officialPriceDisclaimer =
    "Les prix et disponibilités indiqués dans cette soumission sont valables uniquement au moment précis de l'envoi. Sans réservation confirmée et paiement effectué auprès des voyagistes ou transporteurs, les tarifs demeurent assujettis aux variations du marché en temps réel et peuvent augmenter ou réduire sans préavis.";

  const customerName = `${submission.customerFirstName} ${submission.customerLastName}`.trim() || 'Client';
  const customerEmail = submission.customerEmail;
  const advisorEmail = currentUser.email || 'info@evasionsoleil.com';
  const agencyArchiveEmail = 'info@evasionsoleil.com';

  const durationText = submission.duration || '7 nuits';
  const datesText = submission.departureDate
    ? `Du ${submission.departureDate}${submission.endDate ? ` au ${submission.endDate}` : ''} (${durationText})`
    : durationText;

  // Déterminer l'arrivée probable
  const isCruise = submission.serviceType === 'croisiere';
  const defaultArrival = isCruise
    ? (submission.destination ? `Port d'embarquement & escale à ${submission.destination}` : 'Port de Miami / Caraïbes')
    : (submission.destination ? `Aéroport international de ${submission.destination}` : 'Aéroport de destination');

  const clientRequestedHotel = submission.hotelName
    ? submission.hotelName
    : (isCruise
        ? (submission.cruiseCabinType ? `Croisière ${submission.cruiseCabinType}` : 'Croisière demandée par le client')
        : (submission.destination ? `Complexe hôtelier à ${submission.destination} (Choix client)` : 'Hôtel sélectionné par le client'));

  const [proposalCount, setProposalCount] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<number>(0);

  const [advisorName, setAdvisorName] = useState<string>(currentUser.name);
  const [advisorRole, setAdvisorRole] = useState<string>('Conseiller(ère) en voyages certifié(e)');
  const [advisorPhone, setAdvisorPhone] = useState<string>('438-373-7076');
  const [advisorEmailState, setAdvisorEmailState] = useState<string>(advisorEmail);

  const [proposals, setProposals] = useState<SubmissionProposalItem[]>(() => {
    if (submission.proposals && submission.proposals.length > 0) {
      return submission.proposals;
    }

    return [
      {
        id: 'prop_1',
        title: 'Option 1 : Recommandée / Coup de Cœur de l\'Agence',
        hotelOrCruiseName: isCruise ? 'Croisière Tout-Inclus Caraïbes de Rêve' : 'Complexe Recommandé Coup de Cœur 5★',
        destination: submission.destination,
        departureCity: submission.departureCity || 'Montréal (YUL)',
        arrivalAirportOrPort: defaultArrival,
        supplier: isCruise ? 'Celebrity Cruises' : 'Transat',
        airlineAndFlight: submission.cabinClass || submission.volHotelFlightClass || 'Vol direct aller-retour inclus',
        departureFlightDate: submission.departureDate ? `${submission.departureDate} vers 06h30` : 'À confirmer',
        departureFlightNumber: 'TS 182',
        returnFlightDate: submission.endDate ? `${submission.endDate} vers 14h15` : 'À confirmer',
        returnFlightNumber: 'TS 183',
        datesAndDuration: datesText,
        roomOrCabinType: isCruise ? (submission.cruiseCabinType || 'Cabine Balcon Supérieure') : 'Chambre Supérieure Vue Jardin ou Piscine',
        pricePerPerson: submission.budgetPerPerson ? `${submission.budgetPerPerson} / pers.` : '1 899 $ CAD / pers.',
        totalPrice: 'Taxes et frais inclus',
        inclusions: 'Formule tout-inclus 24h, vols réguliers directs, transferts aéroport-hôtel, 1 bagage enregistré par voyageur.',
        advisorHighlight: 'Excellente plage de sable fin, gastronomie raffinée et service chaleureux hautement recommandé par notre équipe.',
      },
      {
        id: 'prop_2',
        title: 'Option 2 : Choix Demandé par le Client (Votre sélection)',
        hotelOrCruiseName: clientRequestedHotel,
        destination: submission.destination,
        departureCity: submission.departureCity || 'Montréal (YUL)',
        arrivalAirportOrPort: defaultArrival,
        supplier: 'Vacances Air Canada',
        airlineAndFlight: 'Vols réguliers aller-retour avec bagages inclus',
        departureFlightDate: submission.departureDate ? `${submission.departureDate} vers 07h15` : 'À confirmer',
        departureFlightNumber: 'AC 1804',
        returnFlightDate: submission.endDate ? `${submission.endDate} vers 15h30` : 'À confirmer',
        returnFlightNumber: 'AC 1805',
        datesAndDuration: datesText,
        roomOrCabinType: submission.cruiseCabinType || 'Chambre selon votre sélection initiale',
        pricePerPerson: submission.budgetPerPerson ? `${submission.budgetPerPerson} / pers.` : '1 999 $ CAD / pers.',
        totalPrice: 'Taxes et frais inclus',
        inclusions: 'Formule tout-inclus conforme à votre demande initiale, transferts et assistance locale inclus.',
        advisorHighlight: 'Cette option reflète exactement les critères et l\'établissement de votre demande initiale.',
      },
      {
        id: 'prop_3',
        title: 'Option 3 : Alternative / Meilleur Rapport Qualité-Prix',
        hotelOrCruiseName: isCruise ? 'Croisière Découverte & Économie' : 'Hôtel Tout-Inclus Confort & Économie',
        destination: submission.destination,
        departureCity: submission.departureCity || 'Montréal (YUL)',
        arrivalAirportOrPort: defaultArrival,
        supplier: 'Sunwing',
        airlineAndFlight: 'Vol direct aller-retour',
        departureFlightDate: submission.departureDate ? `${submission.departureDate} vers 06h00` : 'À confirmer',
        departureFlightNumber: 'WG 642',
        returnFlightDate: submission.endDate ? `${submission.endDate} vers 12h45` : 'À confirmer',
        returnFlightNumber: 'WG 643',
        datesAndDuration: datesText,
        roomOrCabinType: 'Chambre Confort Standard',
        pricePerPerson: '1 599 $ CAD / pers.',
        totalPrice: 'Taxes et frais inclus',
        inclusions: 'Tous les repas et boissons, animations quotidiennes, transferts aéroport-hôtel inclus.',
        advisorHighlight: 'Une formule très avantageuse pour profiter pleinement du soleil tout en respectant votre budget.',
      },
    ];
  });

  const [advisorMessage, setAdvisorMessage] = useState<string>(
    `Bonjour ${submission.customerFirstName || customerName},\n\nMerci de nous faire confiance pour l'organisation de votre prochain voyage à ${submission.destination} !\n\nJ'ai minutieusement préparé pour vous cette proposition de voyage adaptée à vos souhaits. N'hésitez pas à communiquer directement avec moi pour bloquer votre réservation avant tout changement de prix des voyagistes.\n\nAu plaisir de vous faire voyager,\n${currentUser.name}\n${advisorRole} — Voyages Évasion Soleil\n${advisorPhone} | ${advisorEmail}`
  );

  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleUpdateProposal = (index: number, field: keyof SubmissionProposalItem, value: string) => {
    setProposals((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSendSubmission = async () => {
    if (!canSendThisSubmission) {
      setErrorMessage(
        `Action non autorisée : Ce dossier est attribué à ${submission.assignedToUserName || 'un autre conseiller'}. Seul le conseiller titulaire peut envoyer la soumission.`
      );
      return;
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      setErrorMessage('Courriel du client manquant ou invalide.');
      return;
    }

    const proposalsToSend = proposals.slice(0, proposalCount);

    for (let i = 0; i < proposalsToSend.length; i++) {
      if (!proposalsToSend[i]?.hotelOrCruiseName?.trim()) {
        setErrorMessage(`Veuillez renseigner le nom de l'hôtel ou du forfait pour la Proposition ${i + 1}.`);
        setActiveTab(i);
        return;
      }
      if (!proposalsToSend[i]?.pricePerPerson?.trim()) {
        setErrorMessage(`Veuillez renseigner le prix par personne pour la Proposition ${i + 1}.`);
        setActiveTab(i);
        return;
      }
    }

    setIsSending(true);
    setErrorMessage(null);
    setSuccessBanner(null);

    const payload: SubmissionProposalsPayload = {
      submissionId: submission.id,
      customerEmail: submission.customerEmail,
      agencyEmail: agencyArchiveEmail,
      advisorMessage: advisorMessage.trim(),
      advisorUserId: currentUser.id,
      advisorName: advisorName.trim() || currentUser.name,
      advisorRole: advisorRole.trim(),
      advisorEmail: advisorEmailState.trim() || advisorEmail,
      advisorPhone: advisorPhone.trim(),
      priceDisclaimer: officialPriceDisclaimer,
      proposals: proposalsToSend,
    };

    try {
      const res = await fetch(`/api/submissions/${submission.id}/send-proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-username': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          ...payload,
          callerRole: currentUser.role,
          callerUsername: currentUser.username,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Échec de l'envoi de la soumission");
      }

      setSuccessBanner(
        `✅ Soumission (${proposalCount} offre${proposalCount > 1 ? 's' : ''}) envoyée avec succès au client (${customerEmail}) !`
      );

      if (data.submission) {
        onSuccess(data.submission);
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error("Erreur envoi soumission:", err);
      setErrorMessage(err.message || "Erreur de communication avec le serveur d'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const optionColorConfigs = [
    {
      tabBadge: 'bg-[#338b84] text-white',
      border: 'border-[#338b84]',
      headerBg: 'bg-[#f0f8f7]',
      cardBg: 'bg-white',
      textColor: 'text-[#143734]',
      label: 'Option 1 (Coup de Cœur)',
    },
    {
      tabBadge: 'bg-blue-600 text-white',
      border: 'border-blue-500',
      headerBg: 'bg-blue-50',
      cardBg: 'bg-white',
      textColor: 'text-blue-950',
      label: 'Option 2 (Demandée par le client)',
    },
    {
      tabBadge: 'bg-purple-600 text-white',
      border: 'border-purple-500',
      headerBg: 'bg-purple-50',
      cardBg: 'bg-white',
      textColor: 'text-purple-950',
      label: 'Option 3 (Meilleur Prix)',
    },
  ];

  const quickSuppliers = ['Transat', 'Sunwing', 'Vacances Air Canada', 'WestJet Vacations', 'Caribe Sol', 'Celebrity Cruises', 'Royal Caribbean', 'NCL'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#1a4542] via-[#286f6a] to-[#338b84] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Send className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Envoyer une Soumission Officielle
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30">
                  {submission.referenceNumber}
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                Client : <strong>{customerName}</strong> &bull; Destination : <strong>{submission.destination}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* RECIPIENTS BANNER */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-bold text-slate-500">Destinataire (Client) :</span>
              <span className="font-extrabold text-[#338b84] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                👤 {customerEmail}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-bold text-slate-500">En CC :</span>
              <span className="font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                <span>{advisorEmailState}</span>
              </span>
              <span className="font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                <span>{agencyArchiveEmail}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="font-bold text-slate-500">Conseiller :</span>
            <span className="font-bold text-slate-900">{advisorName}</span>
          </div>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1 text-xs">
          {successBanner && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2.5 animate-fadeIn shadow-2xs">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 font-bold flex items-center gap-2.5 animate-fadeIn shadow-2xs">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!canSendThisSubmission ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 font-bold flex items-start gap-2.5 animate-fadeIn shadow-2xs">
              <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-xs block text-amber-900">Envoi réservé uniquement au responsable du dossier :</span>
                <span className="text-[11px] font-normal text-amber-800 leading-relaxed block mt-0.5">
                  Ce dossier client est sous la responsabilité de <strong>{submission.assignedToUserName || 'aucun responsable assigné'}</strong>. Seul le conseiller responsable assigné à ce dossier peut envoyer une soumission.
                </span>
              </div>
            </div>
          ) : null}

          {/* SÉLECTEUR DU NOMBRE D'OFFRES */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 text-[#1a4542] font-black text-sm">
                <Layers className="h-4 w-4 text-[#338b84]" />
                <span>Nombre d'offres incluses</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Envoyez une seule offre ciblée ou comparez jusqu'à 3 propositions personnalisées.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-teal-300 shadow-2xs shrink-0">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setProposalCount(num);
                    if (activeTab >= num) {
                      setActiveTab(0);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    proposalCount === num
                      ? 'bg-[#338b84] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{num} {num === 1 ? 'Offre unique' : `Offres`}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TABS DES OFFRES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-[#338b84]" />
                  <span>
                    {proposalCount === 1 ? 'Détails de l\'Offre Sélectionnée' : `Configuration des ${proposalCount} Offres`}
                  </span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {proposals.slice(0, proposalCount).map((prop, idx) => (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === idx
                        ? `${optionColorConfigs[idx].tabBadge} shadow-xs`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    <span className="hidden sm:inline">
                      {idx === 0 ? 'Option 1 (Coup de Cœur)' : idx === 1 ? 'Option 2 (Choix Client)' : 'Option 3 (Meilleur Prix)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* FORMULAIRE OFFRE ACTIVE */}
            {proposals.slice(0, proposalCount).map((currentProp, idx) => {
              if (activeTab !== idx) return null;
              const cfg = optionColorConfigs[idx];

              return (
                <div
                  key={currentProp.id}
                  className={`rounded-2xl border-2 ${cfg.border} bg-white shadow-xs overflow-hidden transition-all`}
                >
                  <div className={`${cfg.headerBg} px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${cfg.tabBadge}`}>
                        {idx === 1 ? 'Option 2 (Demande Client)' : `Option ${idx + 1}`}
                      </span>
                      <input
                        type="text"
                        value={currentProp.title}
                        onChange={(e) => handleUpdateProposal(idx, 'title', e.target.value)}
                        className="font-extrabold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:border-[#338b84] focus:outline-hidden px-1 py-0.5 min-w-[260px]"
                        placeholder="Titre de l'option"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500">Tarif par personne :</span>
                      <input
                        type="text"
                        value={currentProp.pricePerPerson}
                        onChange={(e) => handleUpdateProposal(idx, 'pricePerPerson', e.target.value)}
                        placeholder="Ex: 1 849 $ CAD / pers."
                        className="font-black text-sm text-emerald-800 bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-right w-36 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-7">
                        <label className="block font-bold text-slate-700 mb-1">
                          Nom de l'Hôtel, Complexe ou Navire : *
                        </label>
                        <input
                          type="text"
                          value={currentProp.hotelOrCruiseName}
                          onChange={(e) => handleUpdateProposal(idx, 'hotelOrCruiseName', e.target.value)}
                          placeholder="Ex: Riu Palace Peninsula 5★ ou Navire Symphony of the Seas"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block font-bold text-slate-700 mb-1">
                          Fournisseur / Voyagiste :
                        </label>
                        <input
                          type="text"
                          value={currentProp.supplier || ''}
                          onChange={(e) => handleUpdateProposal(idx, 'supplier', e.target.value)}
                          placeholder="Ex: Transat, Sunwing, Air Canada..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">Suggestions rapides :</span>
                      {quickSuppliers.map((sup) => (
                        <button
                          key={sup}
                          type="button"
                          onClick={() => handleUpdateProposal(idx, 'supplier', sup)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all border cursor-pointer ${
                            currentProp.supplier === sup
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {sup}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Destination :</label>
                        <input
                          type="text"
                          value={currentProp.destination}
                          onChange={(e) => handleUpdateProposal(idx, 'destination', e.target.value)}
                          placeholder="Ex: Cancún, Mexique"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Ville de Départ :</label>
                        <input
                          type="text"
                          value={currentProp.departureCity}
                          onChange={(e) => handleUpdateProposal(idx, 'departureCity', e.target.value)}
                          placeholder="Ex: Montréal (YUL)"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <PlaneLanding className="h-3.5 w-3.5 text-[#338b84]" />
                          <span>Aéroport ou Port d'arrivée : *</span>
                        </label>
                        <input
                          type="text"
                          value={currentProp.arrivalAirportOrPort || ''}
                          onChange={(e) => handleUpdateProposal(idx, 'arrivalAirportOrPort', e.target.value)}
                          placeholder={isCruise ? "Ex: Port de Miami / Caraïbes" : "Ex: Cancún (CUN)"}
                          className="w-full bg-teal-50/50 border border-teal-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* VOLS ALLER & RETOUR */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                        <PlaneTakeoff className="h-4 w-4 text-[#338b84]" />
                        <span>Itinéraire Aérien Complet :</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-700 text-[11px] block">🛫 Vol Aller (Départ) :</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block">N° Vol :</label>
                              <input
                                type="text"
                                value={currentProp.departureFlightNumber || ''}
                                onChange={(e) => handleUpdateProposal(idx, 'departureFlightNumber', e.target.value)}
                                placeholder="Ex: TS 182"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">Date & Heure :</label>
                              <input
                                type="text"
                                value={currentProp.departureFlightDate || ''}
                                onChange={(e) => handleUpdateProposal(idx, 'departureFlightDate', e.target.value)}
                                placeholder="Ex: 15 mars à 06h30"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-700 text-[11px] block">🛬 Vol Retour :</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block">N° Vol :</label>
                              <input
                                type="text"
                                value={currentProp.returnFlightNumber || ''}
                                onChange={(e) => handleUpdateProposal(idx, 'returnFlightNumber', e.target.value)}
                                placeholder="Ex: TS 183"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">Date & Heure :</label>
                              <input
                                type="text"
                                value={currentProp.returnFlightDate || ''}
                                onChange={(e) => handleUpdateProposal(idx, 'returnFlightDate', e.target.value)}
                                placeholder="Ex: 22 mars à 14h15"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Dates & Durée :</label>
                        <input
                          type="text"
                          value={currentProp.datesAndDuration}
                          onChange={(e) => handleUpdateProposal(idx, 'datesAndDuration', e.target.value)}
                          placeholder="Ex: Du 10 au 17 mars (7 nuits)"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Chambre / Cabine :
                        </label>
                        <input
                          type="text"
                          value={currentProp.roomOrCabinType}
                          onChange={(e) => handleUpdateProposal(idx, 'roomOrCabinType', e.target.value)}
                          placeholder="Ex: Junior Suite Vue Mer"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Prix Total :</label>
                        <input
                          type="text"
                          value={currentProp.totalPrice}
                          onChange={(e) => handleUpdateProposal(idx, 'totalPrice', e.target.value)}
                          placeholder="Ex: 3 698 $ CAD total (taxes inc.)"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Formule & Inclusions :
                      </label>
                      <input
                        type="text"
                        value={currentProp.inclusions}
                        onChange={(e) => handleUpdateProposal(idx, 'inclusions', e.target.value)}
                        placeholder="Ex: Formule tout-inclus 24h, vols, transferts aéroport-hôtel, taxes incluses"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        ⭐ Recommandation du Conseiller :
                      </label>
                      <textarea
                        rows={2}
                        value={currentProp.advisorHighlight || ''}
                        onChange={(e) => handleUpdateProposal(idx, 'advisorHighlight', e.target.value)}
                        placeholder="Pourquoi vous recommandez cette option..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden resize-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* INFORMATIONS DU CONSEILLER */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                <UserCheck className="h-4 w-4 text-[#338b84]" />
                <span>Conseiller Voyage Dédié :</span>
              </div>
              <span className="text-[10px] text-teal-800 bg-teal-100 font-bold px-2 py-0.5 rounded-md">
                Mis en CC automatique
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nom du Conseiller :</label>
                <input
                  type="text"
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Titre / Rôle :</label>
                <input
                  type="text"
                  value={advisorRole}
                  onChange={(e) => setAdvisorRole(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Téléphone direct :</label>
                <input
                  type="text"
                  value={advisorPhone}
                  onChange={(e) => setAdvisorPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Courriel de Suivi :</label>
              <input
                type="email"
                value={advisorEmailState}
                onChange={(e) => setAdvisorEmailState(e.target.value)}
                placeholder="Ex: conseiller@evasionsoleil.com"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* MESSAGE DU CONSEILLER */}
          <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
              <span>Message d'accompagnement :</span>
              <span className="text-[10px] text-slate-500 font-normal">En tête du courriel</span>
            </label>
            <textarea
              rows={3}
              value={advisorMessage}
              onChange={(e) => setAdvisorMessage(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* MENTION LÉGALE STRICTE */}
          <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                <Lock className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Mention Légale & Tarifaire Officielle :</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Non modifiable</span>
              </span>
            </div>

            <div className="text-[11px] text-amber-950 leading-relaxed italic bg-white/80 p-3 rounded-xl border border-amber-200 select-none">
              "{officialPriceDisclaimer}"
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
            <ShieldCheck className="h-4 w-4 text-[#338b84] shrink-0" />
            <span>
              Copie horodatée à <strong>{advisorEmailState}</strong> et <strong>{agencyArchiveEmail}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleSendSubmission}
              disabled={isSending || !canSendThisSubmission}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer ${
                !canSendThisSubmission
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed opacity-80'
                  : 'bg-gradient-to-r from-[#286f6a] to-[#338b84] hover:from-[#205753] hover:to-[#286f6a] text-white hover:shadow-lg disabled:opacity-50'
              }`}
            >
              {isSending ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Envoyer la soumission ({proposalCount} offre{proposalCount > 1 ? 's' : ''}) &rarr;</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
