import React, { useState } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  Calendar,
  Plane,
  Building,
  DollarSign,
  UserCheck,
  Lock,
  Clock,
  Sparkles,
  AlertCircle,
  Ship,
  Palmtree,
  Check,
  Tag,
  MessageSquare
} from 'lucide-react';
import { QuoteSubmission, SubmissionProposalItem, User } from '../types';

export interface SubmissionProposalViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: QuoteSubmission;
  currentUser: User;
  onSelectProposal: (
    submissionId: string,
    proposalId: string | null,
    notes?: string,
    autoSetReserved?: boolean
  ) => Promise<{ success: boolean; submission?: QuoteSubmission }>;
  onOpenSendModal?: (submission: QuoteSubmission) => void;
  readOnly?: boolean;
}

export const SubmissionProposalViewerModal: React.FC<SubmissionProposalViewerModalProps> = ({
  isOpen,
  onClose,
  submission,
  currentUser,
  onSelectProposal,
  onOpenSendModal,
  readOnly = false,
}) => {
  const [selectedProposalForConfirm, setSelectedProposalForConfirm] = useState<SubmissionProposalItem | null>(null);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [autoSetReserved, setAutoSetReserved] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const proposals = submission.proposals || [];
  const hasProposals = proposals.length > 0;
  const isAssignedAdvisor = Boolean(
    (submission.assignedToUserId && submission.assignedToUserId === currentUser.id) ||
      (submission.assignedToUserName &&
        submission.assignedToUserName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
  );
  // Restreint strictement l'envoi au conseiller responsable en charge du dossier client
  const canSendProposals = !readOnly && isAssignedAdvisor;

  const handleQuickSelect = async (prop: SubmissionProposalItem) => {
    if (readOnly) return;
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const res = await onSelectProposal(
        submission.id,
        prop.id,
        `Option validée par le conseiller (${currentUser.name})`,
        true
      );
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `🎯 L'option "${prop.title || prop.hotelOrCruiseName}" a été validée avec succès pour ce client !`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: "Une erreur est survenue lors de l'enregistrement du choix.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || "Erreur lors de l'enregistrement",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedProposalForConfirm || readOnly) return;

    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const res = await onSelectProposal(
        submission.id,
        selectedProposalForConfirm.id,
        confirmationNotes.trim() || undefined,
        autoSetReserved
      );
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `🎯 L'option "${selectedProposalForConfirm.title}" a été validée avec succès pour ce client !`,
        });
        setSelectedProposalForConfirm(null);
        setConfirmationNotes('');
      } else {
        setActionFeedback({
          type: 'error',
          message: "Une erreur est survenue lors de l'enregistrement du choix.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || "Erreur lors de l'enregistrement",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSelection = async () => {
    if (!window.confirm("Êtes-vous certain de vouloir annuler le choix d'option pour ce client ?")) return;

    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const res = await onSelectProposal(submission.id, null);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: "Le choix d'option a été annulé. Le dossier est de nouveau en attente de décision.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || "Erreur lors de l'annulation",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#1d524e] to-[#286f6a] text-white p-5 sm:p-6 flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-bold">
                {submission.referenceNumber}
              </span>
              <span className="text-xs text-white/80 font-medium">
                {submission.serviceType === 'croisiere' ? '🚢 Croisière' : '🌴 Séjour Sud & Forfaits'} &bull; {submission.destination}
              </span>
              {submission.selectedProposalTitle && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-400 text-slate-950 shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Option Client Choisie
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Soumission & Propositions du Client : {submission.customerFirstName} {submission.customerLastName}
            </h2>
            <p className="text-xs text-teal-100 flex items-center gap-3 flex-wrap pt-0.5">
              <span>📧 {submission.customerEmail}</span>
              <span>📞 {submission.customerPhone}</span>
              <span>👤 Dossier assigné à : <strong>{submission.assignedToUserName || 'Non assigné'}</strong></span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Action feedback message */}
        {actionFeedback && (
          <div
            className={`p-3.5 text-xs font-semibold flex items-center justify-between border-b ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-xs underline cursor-pointer ml-4"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin bg-slate-50/50">
          {/* Read-Only Consultation Banner */}
          {readOnly && (
            <div className="bg-slate-100 border border-slate-300 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-slate-700 shadow-2xs">
              <Lock className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                <strong>Mode Consultation Sécurisée (Lecture Seule) :</strong> Vous consultez les propositions transmises au client. Les modifications, sélections et renvois sont gérés depuis le Pipeline de devis par le conseiller attitré.
              </span>
            </div>
          )}

          {/* Status banner & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status box */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                État de la soumission
              </div>
              <div className="flex items-center gap-2 pt-1">
                {submission.selectedProposalTitle ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Option client retenue !
                  </div>
                ) : hasProposals ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="h-4 w-4 text-amber-600" />
                    En attente de la décision du client
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700">
                    Aucune proposition envoyée
                  </div>
                )}
              </div>
            </div>

            {/* Envoi info */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Dernier envoi officiel
              </div>
              <div className="text-xs font-semibold text-slate-800 pt-1">
                {submission.proposalsSentAt ? (
                  <>
                    <span className="font-bold text-slate-900">
                      {new Date(submission.proposalsSentAt).toLocaleString('fr-CA', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Par : <strong>{submission.proposalsSentBy || 'Conseiller'}</strong>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400 italic">Pas encore transmise</span>
                )}
              </div>
            </div>

            {/* Conseiller responsable & autorisation */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Conseiller habilité à l'envoi
              </div>
              <div className="pt-1 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[#338b84]" />
                  <span>{submission.assignedToUserName || 'Non assigné'}</span>
                </div>
                {canSendProposals ? (
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                    Autorisé
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" />
                    Exclusif
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Active selection spotlight if chosen */}
          {submission.selectedProposalTitle && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/40 border-2 border-emerald-500 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                      Choix validé par le voyageur
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-950">
                      {submission.selectedProposalTitle}
                    </h3>
                  </div>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    disabled={isSubmitting}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-300 shadow-2xs cursor-pointer transition-colors"
                  >
                    Annuler / Changer ce choix
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/90 p-3.5 rounded-2xl border border-emerald-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Hôtel / Navire retenu</span>
                  <span className="font-extrabold text-slate-900">{submission.selectedProposalHotel || 'Non spécifié'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Tarif convenu</span>
                  <span className="font-black text-emerald-700">{submission.selectedProposalPrice || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Consigné le</span>
                  <span className="font-medium text-slate-700">
                    {submission.selectedProposalChosenAt
                      ? new Date(submission.selectedProposalChosenAt).toLocaleDateString('fr-CA')
                      : 'Récemment'}{' '}
                    par {submission.selectedProposalChosenBy || 'Conseiller'}
                  </span>
                </div>
              </div>

              {submission.selectedProposalNotes && (
                <div className="bg-white/90 p-3 rounded-2xl border border-emerald-200 text-xs text-slate-700 flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">Notes du client :</span> {submission.selectedProposalNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal / Card to confirm a selected proposal */}
          {selectedProposalForConfirm && (
            <div className="bg-white border-2 border-teal-500 rounded-3xl p-5 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#338b84]" />
                  <h4 className="text-sm font-black text-slate-900">
                    Confirmer le choix du client pour : <span className="text-[#338b84]">{selectedProposalForConfirm.title}</span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProposalForConfirm(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-teal-50/50 p-3.5 rounded-2xl border border-teal-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Complexe / Navire</span>
                  <span className="font-extrabold text-slate-900">{selectedProposalForConfirm.hotelOrCruiseName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Prix par personne</span>
                  <span className="font-black text-emerald-700">{selectedProposalForConfirm.pricePerPerson}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Fournisseur & Vols</span>
                  <span className="font-bold text-slate-800">
                    {selectedProposalForConfirm.supplier || 'Voyagiste'} &bull; {selectedProposalForConfirm.airlineAndFlight}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Précisions ou commentaires du client (optionnel) :
                </label>
                <input
                  type="text"
                  value={confirmationNotes}
                  onChange={(e) => setConfirmationNotes(e.target.value)}
                  placeholder="Ex: Client a confirmé l'option 2 au téléphone avec la chambre vue mer. Dépôt de 500 $ en cours."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#338b84] bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_set_reserved_check"
                  checked={autoSetReserved}
                  onChange={(e) => setAutoSetReserved(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#338b84] focus:ring-[#338b84] cursor-pointer"
                />
                <label htmlFor="auto_set_reserved_check" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Mettre à jour automatiquement le statut d'appel en <strong>🎉 Voyage Réservé (A voyagé / Confirmé)</strong>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProposalForConfirm(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#286f6a] to-[#338b84] hover:from-[#205753] hover:to-[#286f6a] text-white shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Enregistrement...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Valider le choix du client</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quick Selection Banner - 1 Clic pour sélectionner facilement la soumission */}
          {!readOnly && hasProposals && (
            <div className="bg-gradient-to-r from-teal-800 via-[#338b84] to-emerald-700 p-4 rounded-2xl text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-200 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Sélection Rapide en 1 Clic</span>
                </div>
                <p className="text-xs text-teal-50 mt-0.5">
                  Le client a fait son choix ? Validez directement son option en un clic ci-contre :
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {proposals.map((prop, idx) => {
                  const isSelected = submission.selectedProposalId === prop.id || submission.selectedProposalTitle === prop.title;
                  return (
                    <button
                      key={prop.id || idx}
                      type="button"
                      onClick={() => handleQuickSelect(prop)}
                      disabled={isSubmitting}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-white text-emerald-900 ring-2 ring-amber-300 shadow-md font-extrabold scale-105'
                          : 'bg-white/20 hover:bg-white hover:text-emerald-900 text-white border border-white/30'
                      }`}
                      title={`Sélectionner instantanément ${prop.title || `Option ${idx + 1}`}`}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-600" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Option {idx + 1} ({prop.pricePerPerson})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proposals Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Offres transmises au voyageur ({proposals.length})</span>
              </h3>

              {!readOnly && onOpenSendModal && (
                canSendProposals ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSendModal(submission);
                    }}
                    className="text-xs font-bold text-[#338b84] hover:text-[#205753] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Modifier ou renvoyer la soumission</span>
                  </button>
                ) : (
                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Renvoyer réservé à {submission.assignedToUserName}</span>
                  </div>
                )
              )}
            </div>

            {!hasProposals ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Send className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Aucune proposition n'a encore été envoyée</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Préparez 1, 2 ou 3 propositions pour ce voyageur afin de lui soumettre les meilleures options du marché.
                </p>
                {canSendProposals ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenSendModal) onOpenSendModal(submission);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white font-extrabold text-xs shadow-xs cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>Préparer la soumission maintenant</span>
                  </button>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 font-semibold max-w-md mx-auto border border-amber-200">
                    🔒 Ce dossier est assigné à {submission.assignedToUserName}. Seul ce conseiller peut préparer la soumission.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {proposals.map((prop, idx) => {
                  const isSelected = submission.selectedProposalId === prop.id;

                  return (
                    <div
                      key={prop.id || idx}
                      className={`bg-white rounded-3xl border-2 flex flex-col justify-between overflow-hidden transition-all shadow-sm ${
                        isSelected
                          ? 'border-emerald-500 ring-4 ring-emerald-100'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {/* Card Header */}
                      <div
                        className={`p-4 border-b flex items-start justify-between ${
                          isSelected ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div>
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              idx === 1
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : idx === 0
                                ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {prop.title || `Option ${idx + 1}`}
                          </span>
                          <h4 className="font-black text-slate-900 text-sm mt-1">
                            {prop.hotelOrCruiseName}
                          </h4>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            {prop.supplier ? `Voyagiste : ${prop.supplier}` : 'Prestataire certifié'}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs" title="Option sélectionnée">
                            <Check className="h-4 w-4 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3 text-xs flex-1">
                        {/* Price highlight */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="text-slate-500 font-bold text-[11px]">Tarif par personne :</span>
                          <span className="text-base font-black text-emerald-700">{prop.pricePerPerson}</span>
                        </div>

                        {/* Itinerary & Flights */}
                        <div className="space-y-1 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Plane className="h-3 w-3 text-slate-400 shrink-0" />
                            <span><strong>Départ :</strong> {prop.departureCity} &rarr; {prop.arrivalAirportOrPort || prop.destination}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span><strong>Durée :</strong> {prop.datesAndDuration}</span>
                          </div>
                          {prop.departureFlightNumber && (
                            <div className="text-[10px] text-slate-500 pl-4.5">
                              Vol aller : {prop.departureFlightNumber} ({prop.departureFlightDate})
                            </div>
                          )}
                          {prop.returnFlightNumber && (
                            <div className="text-[10px] text-slate-500 pl-4.5">
                              Vol retour : {prop.returnFlightNumber} ({prop.returnFlightDate})
                            </div>
                          )}
                        </div>

                        {/* Room type & inclusions */}
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">Chambre / Cabine :</span>{' '}
                            <span className="text-slate-600">{prop.roomOrCabinType}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Inclusions :</span>{' '}
                            <span className="text-slate-600">{prop.inclusions}</span>
                          </div>
                          {prop.advisorHighlight && (
                            <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-100 text-[11px] text-teal-900">
                              <strong>Coup de cœur :</strong> {prop.advisorHighlight}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Action */}
                      <div className="p-4 pt-2 border-t border-slate-100 bg-white">
                        {readOnly ? (
                          isSelected ? (
                            <div className="w-full py-2 px-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold text-xs flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Option Retenue par le Client</span>
                            </div>
                          ) : (
                            <div className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 font-semibold text-xs text-center">
                              Option non retenue
                            </div>
                          )
                        ) : isSelected ? (
                          <div className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Option Retenue par le Client</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickSelect(prop)}
                              disabled={isSubmitting}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                              title="Valider immédiatement cette option pour le client"
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                              <span>Sélectionner en 1 Clic</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProposalForConfirm(prop);
                                setConfirmationNotes('');
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <span>Ajouter une précision / note...</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legal and price disclaimer */}
          <div className="text-[11px] text-slate-500 bg-white p-3.5 rounded-2xl border border-slate-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Mention légale officielle :</strong> Les prix et disponibilités indiqués dans cette soumission sont valables uniquement au moment précis de l'envoi. Sans réservation confirmée et paiement effectué, les tarifs demeurent assujettis aux variations du marché et peuvent fluctuer sans préavis.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Dossier archivé et répertorié dans le CRM client.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
