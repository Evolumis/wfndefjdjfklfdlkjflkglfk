import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Receipt,
  Send,
  Copy,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  DollarSign,
  FileText,
  X,
  Sparkles,
  ShieldCheck,
  Building,
  Check,
  Users,
  Search,
  UserCheck,
  Shield,
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceArticleCatalog, ClientProfile, User, QuoteSubmission } from '../types';

interface CRMInvoiceSectionProps {
  client?: ClientProfile | null;
  currentUser: User;
  submissions: QuoteSubmission[];
  allClients?: ClientProfile[];
  onSelectClient?: (clientId: string) => void;
}

export const CRMInvoiceSection: React.FC<CRMInvoiceSectionProps> = ({
  client,
  currentUser,
  submissions,
  allClients = [],
  onSelectClient,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [catalog, setCatalog] = useState<InvoiceArticleCatalog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Invoice Form State
  const [selectedClientIdForInvoice, setSelectedClientIdForInvoice] = useState<string>('');
  const [customClientName, setCustomClientName] = useState<string>('');
  const [customClientEmail, setCustomClientEmail] = useState<string>('');
  const [customClientPhone, setCustomClientPhone] = useState<string>('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'payee' | 'en_attente'>('all');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: `it_${Date.now()}`,
      title: '🌴 Forfait Tout-Inclus Sud - Vol + Hôtel 5★',
      description: 'Vol direct aller-retour, formule tout-inclus 24h repas & boissons, transferts aéroport-hôtel et 1 bagage enregistré inclus.',
      quantity: 2,
      unitPrice: 1850.0,
      total: 3700.0,
    },
  ]);
  const [taxExempt, setTaxExempt] = useState<boolean>(true);
  const [invoiceNotes, setInvoiceNotes] = useState<string>(
    'Merci pour votre confiance avec Voyages Évasion Soleil ! Paiement 100% sécurisé via Stripe.'
  );
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState<boolean>(false);
  const [requireIdentityVerification, setRequireIdentityVerification] = useState<boolean>(true);
  const [identityDocumentType, setIdentityDocumentType] = useState<'passeport' | 'permis_conduire' | 'carte_nationale'>('passeport');

  // Load Invoices
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const url = client
        ? `/api/invoices?clientKey=${encodeURIComponent(client.email ? `email:${client.email}` : client.phone ? `phone:${client.phone}` : client.id)}`
        : '/api/invoices';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erreur chargement factures:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Catalog Articles
  useEffect(() => {
    fetch('/api/invoices/catalog')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCatalog(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [client?.id, client?.email, client?.phone]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Calculations for current form
  const subtotal = useMemo(() => {
    return Math.round(invoiceItems.reduce((acc, it) => acc + (it.total || 0), 0) * 100) / 100;
  }, [invoiceItems]);

  const taxTPS = useMemo(() => {
    if (taxExempt) return 0;
    return Math.round(subtotal * 0.05 * 100) / 100;
  }, [subtotal, taxExempt]);

  const taxTVQ = useMemo(() => {
    if (taxExempt) return 0;
    return Math.round(subtotal * 0.09975 * 100) / 100;
  }, [subtotal, taxExempt]);

  const totalAmount = useMemo(() => {
    return Math.round((subtotal + taxTPS + taxTVQ) * 100) / 100;
  }, [subtotal, taxTPS, taxTVQ]);

  // Overall Financial Stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.status !== 'annulee' ? inv.total : 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'payee').reduce((sum, i) => sum + i.total, 0);
  const totalPending = invoices.filter((i) => i.status === 'en_attente').reduce((sum, i) => sum + i.total, 0);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== 'all' && inv.status !== invoiceStatusFilter) {
        return false;
      }
      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase();
        const matchesNum = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchesClient = inv.clientName?.toLowerCase().includes(q) || (inv.clientEmail && inv.clientEmail.toLowerCase().includes(q));
        const matchesDest = (inv.destination || '').toLowerCase().includes(q);
        return Boolean(matchesNum || matchesClient || matchesDest);
      }
      return true;
    });
  }, [invoices, invoiceStatusFilter, invoiceSearch]);

  // Add predefined article from catalog
  const handleAddCatalogArticle = (artId: string) => {
    const found = catalog.find((c) => c.id === artId);
    if (!found) return;
    const newItem: InvoiceItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      articleId: found.id,
      title: found.title,
      description: found.description,
      quantity: 1,
      unitPrice: found.defaultPrice,
      total: found.defaultPrice,
    };
    setInvoiceItems((prev) => [...prev, newItem]);
  };

  // Add custom line item
  const handleAddCustomItem = () => {
    const newItem: InvoiceItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Prestation de voyage personnalisée',
      description: '',
      quantity: 1,
      unitPrice: 100.0,
      total: 100.0,
    };
    setInvoiceItems((prev) => [...prev, newItem]);
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) || 0 : it.quantity;
          const price = field === 'unitPrice' ? Number(value) || 0 : it.unitPrice;
          updated.total = Math.round(qty * price * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    if (invoiceItems.length <= 1) {
      showToast('error', 'La facture doit contenir au moins un article ou une prestation.');
      return;
    }
    setInvoiceItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Create Invoice
  const handleCreateInvoice = async (andSendEmail: boolean = false) => {
    const selectedClientObj = allClients.find((c) => c.id === selectedClientIdForInvoice);
    const effectiveClient = client || (selectedClientObj ? {
      id: selectedClientObj.id,
      fullName: selectedClientObj.fullName,
      email: selectedClientObj.email,
      phone: selectedClientObj.phone,
      destinations: selectedClientObj.destinations,
      submissions: selectedClientObj.submissions,
    } : {
      id: `manual_${Date.now()}`,
      fullName: customClientName.trim() || 'Client Voyages Évasion Soleil',
      email: customClientEmail.trim() || '',
      phone: customClientPhone.trim() || '',
      destinations: [],
      submissions: [],
    });

    if (!effectiveClient.email && andSendEmail) {
      showToast('error', "Le client ne possède pas d'adresse courriel pour lui envoyer le lien Stripe.");
      return;
    }

    if (invoiceItems.length === 0 || totalAmount <= 0) {
      showToast('error', 'Veuillez ajouter au moins une prestation avec un montant valide.');
      return;
    }

    setIsSubmittingInvoice(true);
    try {
      const clientKey = effectiveClient.email
        ? `email:${effectiveClient.email}`
        : effectiveClient.phone
        ? `phone:${effectiveClient.phone}`
        : effectiveClient.id;
      const matchedSub = (client?.submissions || submissions).find((s) => s.id === selectedSubmissionId);

      const payload: Partial<Invoice> = {
        clientKey,
        clientName: effectiveClient.fullName,
        clientEmail: effectiveClient.email,
        clientPhone: effectiveClient.phone,
        submissionId: selectedSubmissionId || undefined,
        submissionRef: matchedSub?.referenceNumber,
        destination: matchedSub?.destination || effectiveClient.destinations?.[0] || 'Voyage au Soleil',
        items: invoiceItems,
        taxExempt,
        dueDate,
        notes: invoiceNotes,
        createdByUserId: currentUser.id,
        createdByUserName: currentUser.name,
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const newInv = await res.json();
      if (!res.ok) {
        throw new Error(newInv.error || 'Erreur lors de la création de la facture');
      }

      setInvoices((prev) => [newInv, ...prev]);
      setIsCreateModalOpen(false);

      if (andSendEmail) {
        await handleSendStripeLink(newInv);
      } else {
        showToast('success', `Facture ${newInv.invoiceNumber} générée avec succès avec son lien Stripe !`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la création');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Send Stripe Link Email
  const handleSendStripeLink = async (invoice: Invoice) => {
    if (!invoice.clientEmail) {
      showToast('error', 'Adresse courriel du client introuvable.');
      return;
    }

    setSendingEmailId(invoice.id);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send-stripe-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisorName: currentUser.name,
          advisorEmail: currentUser.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du courriel');
      }

      showToast('success', `✉️ Facture ${invoice.invoiceNumber} et lien de paiement Stripe envoyés à ${invoice.clientEmail} !`);
      fetchInvoices();
    } catch (err: any) {
      showToast('error', err.message || 'Impossible d\'envoyer le courriel');
    } finally {
      setSendingEmailId(null);
    }
  };

  // Copy Stripe Link
  const handleCopyStripeLink = (invoice: Invoice) => {
    if (!invoice.stripePaymentLink) return;
    navigator.clipboard.writeText(invoice.stripePaymentLink);
    setCopiedId(invoice.id);
    showToast('success', 'Lien de paiement Stripe copié dans le presse-papier !');
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Toggle invoice status to paid
  const handleMarkAsPaid = async (invoice: Invoice) => {
    const nextStatus = invoice.status === 'payee' ? 'en_attente' : 'payee';
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          paymentMethod: 'stripe',
          paidAt: nextStatus === 'payee' ? new Date().toISOString() : undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? updated : i)));
        showToast(
          'success',
          nextStatus === 'payee'
            ? `Paiement Stripe pour la facture ${invoice.invoiceNumber} validé et encaissé !`
            : `Statut de la facture ${invoice.invoiceNumber} remis en attente.`
        );
      }
    } catch (err) {
      showToast('error', 'Erreur lors du changement de statut');
    }
  };

  // Delete Invoice
  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Supprimer définitivement la facture ${invoice.invoiceNumber} (${invoice.total.toFixed(2)} $) ?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
        showToast('success', `Facture ${invoice.invoiceNumber} supprimée.`);
      }
    } catch {
      showToast('error', 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Facturé</div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
            {totalInvoiced.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-amber-700 uppercase">En Attente (Stripe)</div>
          <div className="text-sm sm:text-base font-black text-amber-900 mt-0.5">
            {totalPending.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Payé / Encaissé</div>
          <div className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
            {totalPaid.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={() => {
          setIsCreateModalOpen(true);
        }}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#286f6a] to-[#338b84] hover:from-[#205753] hover:to-[#286f6a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span>Créer une Nouvelle Facture & Lien Stripe</span>
      </button>

      {/* Invoices List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-[#338b84]" />
            <span>{client ? `Factures du client (${filteredInvoices.length})` : `Toutes les factures de l'agence (${filteredInvoices.length})`}</span>
          </span>

          {/* Filter Pills & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            {!client && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Rechercher facture / client..."
                  className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#338b84]"
                />
              </div>
            )}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setInvoiceStatusFilter('all')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  invoiceStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toutes ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setInvoiceStatusFilter('payee')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  invoiceStatusFilter === 'payee' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                Payées ({invoices.filter((i) => i.status === 'payee').length})
              </button>
              <button
                type="button"
                onClick={() => setInvoiceStatusFilter('en_attente')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  invoiceStatusFilter === 'en_attente' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                En attente ({invoices.filter((i) => i.status === 'en_attente').length})
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Chargement des factures...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-500 space-y-2">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">Aucune facture trouvée</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Générez une facture avec les articles du catalogue (forfait, croisière, assurances) et transmettez le lien de paiement Stripe en 1 clic.
            </p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const isPaid = inv.status === 'payee';
            return (
              <div
                key={inv.id}
                className={`p-3.5 rounded-xl border text-xs space-y-3 transition-all ${
                  isPaid
                    ? 'bg-emerald-50/40 border-emerald-300'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {/* Header: Numéro + Statut + Montant */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-sm">{inv.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        &bull; Émise le {new Date(inv.createdAt).toLocaleDateString('fr-CA')}
                      </span>
                    </div>
                    {inv.destination && (
                      <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                        Projet : {inv.destination}
                      </div>
                    )}

                    {/* Client info badge if in global view */}
                    {!client && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1c5d57] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 mt-1">
                        <Users className="h-3 w-3 text-[#338b84]" />
                        <span>Client : {inv.clientName}</span>
                        {inv.clientEmail && <span className="text-[10px] text-slate-500 font-normal">({inv.clientEmail})</span>}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">
                      {inv.total.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $ CAD
                    </div>
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Payée (Stripe)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          <Clock className="h-3 w-3" />
                          <span>En attente de paiement</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                  {inv.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between text-slate-700">
                      <span className="truncate pr-2">
                        {item.quantity}x {item.title}
                      </span>
                      <span className="font-bold shrink-0">{item.total.toFixed(2)} $</span>
                    </div>
                  ))}
                  {inv.lastEmailSentAt && (
                    <div className="text-[10px] text-teal-700 pt-1 border-t border-slate-200/60 flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      <span>Lien Stripe envoyé le {new Date(inv.lastEmailSentAt).toLocaleDateString('fr-CA')}</span>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Send Stripe Link Email */}
                    <button
                      type="button"
                      onClick={() => handleSendStripeLink(inv)}
                      disabled={sendingEmailId === inv.id}
                      className="px-2.5 py-1.5 rounded-lg bg-[#338b84] hover:bg-[#256863] text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Envoyer la facture et le bouton de paiement Stripe par courriel"
                    >
                      <Send className="h-3 w-3" />
                      <span>{sendingEmailId === inv.id ? 'Envoi...' : 'Envoyer lien Stripe'}</span>
                    </button>

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={() => handleCopyStripeLink(inv)}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copier le lien sécurisé Stripe pour l'envoyer par SMS ou clavardage"
                    >
                      {copiedId === inv.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedId === inv.id ? 'Copié !' : 'Copier lien'}</span>
                    </button>

                    {/* View / Print Invoice */}
                    <button
                      type="button"
                      onClick={() => setViewInvoice(inv)}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Consulter et imprimer la facture officielle"
                    >
                      <Printer className="h-3 w-3" />
                      <span>Imprimer</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Mark Paid Toggle */}
                    <button
                      type="button"
                      onClick={() => handleMarkAsPaid(inv)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                      title={isPaid ? 'Remettre en attente' : 'Valider manuellement la réception du paiement Stripe'}
                    >
                      {isPaid ? 'Payée ✓' : 'Marquer Payée'}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteInvoice(inv)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer la facture"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-900 via-[#1c5d57] to-[#338b84] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-200 border border-white/20">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">
                    Créer une Facture & Lien de Paiement Stripe
                  </h3>
                  <p className="text-xs text-teal-100/90">
                    {client ? (
                      <>Client : <strong>{client.fullName}</strong> ({client.email || client.phone})</>
                    ) : (
                      <>Espace Facturation Général &bull; Catalogue d'articles prédéfinis</>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin text-xs text-slate-700">
              {/* Client Selection (if in global mode) */}
              {!client && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <label className="block text-[11px] font-bold text-slate-800">
                    Client destinataire de la facture :
                  </label>
                  <select
                    value={selectedClientIdForInvoice}
                    onChange={(e) => {
                      setSelectedClientIdForInvoice(e.target.value);
                      const found = allClients.find((c) => c.id === e.target.value);
                      if (found) {
                        setCustomClientName(found.fullName);
                        setCustomClientEmail(found.email);
                        setCustomClientPhone(found.phone);
                        if (found.submissions && found.submissions.length > 0) {
                          setSelectedSubmissionId(found.submissions[0].id);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                  >
                    <option value="">-- Choisir un client existant ou saisir manuellement --</option>
                    {allClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.email || c.phone || 'Sans courriel'}) • {c.destinations.join(', ') || 'Voyage'}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nom complet :</label>
                      <input
                        type="text"
                        value={customClientName}
                        onChange={(e) => setCustomClientName(e.target.value)}
                        placeholder="Ex: Jean Tremblay"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Courriel :</label>
                      <input
                        type="email"
                        value={customClientEmail}
                        onChange={(e) => setCustomClientEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Téléphone :</label>
                      <input
                        type="tel"
                        value={customClientPhone}
                        onChange={(e) => setCustomClientPhone(e.target.value)}
                        placeholder="514-555-0199"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Submission & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Dossier de soumission lié (Optionnel) :
                  </label>
                  <select
                    value={selectedSubmissionId}
                    onChange={(e) => setSelectedSubmissionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                  >
                    <option value="">-- Aucun dossier particulier --</option>
                    {(client?.submissions || (selectedClientIdForInvoice ? allClients.find((c) => c.id === selectedClientIdForInvoice)?.submissions : submissions) || []).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.referenceNumber} • {sub.destination} ({sub.departureDate || 'Standard'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Date d'échéance du paiement :
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                  />
                </div>
              </div>

              {/* Predefined Articles Dropdown (User Requested Feature) */}
              <div className="bg-gradient-to-r from-teal-50/80 to-slate-50 p-3.5 rounded-xl border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-[#338b84]" />
                    <span>Ajouter un article prédéfini (Catalogue Agence)</span>
                  </div>
                  <span className="text-[10px] text-teal-800 font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200">
                    {catalog.length} prestations prêtes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id="catalog-article-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCatalogArticle(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                  >
                    <option value="" disabled>
                      Sélectionnez un article du catalogue à insérer...
                    </option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} — {c.defaultPrice.toFixed(2)} $ CAD
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs whitespace-nowrap cursor-pointer"
                  >
                    + Ligne libre
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Prestations & Articles Facturés :
                </label>
                <div className="space-y-2">
                  {invoiceItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                            placeholder="Titre de la prestation..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 text-xs focus:outline-none focus:border-[#338b84]"
                          />
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            placeholder="Description / Détails de l'article (optionnel)..."
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-[11px] focus:outline-none focus:border-[#338b84]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center pt-1 border-t border-slate-100 text-slate-700">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Quantité :</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Prix unitaire ($) :</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total ligne :</span>
                          <span className="text-xs font-black text-slate-900">
                            {item.total.toFixed(2)} $ CAD
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax Exemption Toggle & Total Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxExempt}
                    onChange={(e) => setTaxExempt(e.target.checked)}
                    className="h-4 w-4 text-[#338b84] rounded border-slate-300 focus:ring-[#338b84]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Forfait voyage international exempté de TPS / TVQ (0%)
                  </span>
                </label>

                <div className="space-y-1 pt-2 border-t border-slate-200/80 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total :</span>
                    <span className="font-bold">{subtotal.toFixed(2)} $ CAD</span>
                  </div>
                  {!taxExempt && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>TPS (5%) :</span>
                        <span className="font-bold">{taxTPS.toFixed(2)} $ CAD</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>TVQ (9.975%) :</span>
                        <span className="font-bold">{taxTVQ.toFixed(2)} $ CAD</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-slate-900 text-sm font-black pt-1 border-t border-slate-300">
                    <span>Total à payer via Stripe :</span>
                    <span className="text-emerald-700 text-base">{totalAmount.toFixed(2)} $ CAD</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Message & Remarques pour le voyageur :
                </label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                  placeholder="Instructions de paiement ou remarques..."
                />
              </div>

              {/* Security info */}
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-[11px] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#338b84] shrink-0" />
                <span>
                  Un lien sécurisé Stripe Checkout certifié SSL 256-bit sera automatiquement généré pour permettre au voyageur de payer par carte de crédit ou Apple Pay.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Annuler
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmittingInvoice}
                  onClick={() => handleCreateInvoice(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Générer Facture
                </button>

                <button
                  type="button"
                  disabled={isSubmittingInvoice}
                  onClick={() => handleCreateInvoice(true)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#286f6a] to-[#338b84] hover:from-[#205753] hover:to-[#286f6a] text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Générer & Envoyer par Courriel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW / PRINT INVOICE MODAL */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header with Print action */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-teal-400" />
                <span className="font-extrabold text-sm">Facture {viewInvoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewInvoice(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div className="p-6 overflow-y-auto flex-1 scrollbar-thin text-xs text-slate-800 space-y-6" id="printable-invoice-content">
              {/* Agency Brand Header */}
              <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                <div>
                  <h2 className="text-xl font-black text-teal-800">Voyages Évasion Soleil Inc.</h2>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Permis d'agence du Québec &bull; Protection FICAV
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    info@evasionsoleil.com &bull; 1-800-555-SOLEIL (7653)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-slate-900">{viewInvoice.invoiceNumber}</div>
                  <div className="text-[11px] text-slate-500">Date : {new Date(viewInvoice.createdAt).toLocaleDateString('fr-CA')}</div>
                  <div className="text-[11px] text-slate-500">Échéance : {viewInvoice.dueDate}</div>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Facturé à :</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">{viewInvoice.clientName}</div>
                  {viewInvoice.clientEmail && <div className="text-slate-600">{viewInvoice.clientEmail}</div>}
                  {viewInvoice.clientPhone && <div className="text-slate-600">{viewInvoice.clientPhone}</div>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Statut du Paiement :</span>
                  <div className="mt-1">
                    {viewInvoice.status === 'payee' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Payée via Stripe ✓
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                        En attente de règlement
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Conseiller : {viewInvoice.createdByUserName}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px]">
                    <th className="p-2.5 text-left">Description / Prestation</th>
                    <th className="p-2.5 text-center">Quantité</th>
                    <th className="p-2.5 text-right">Prix Unitaire</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewInvoice.items.map((it, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{it.title}</div>
                        {it.description && <div className="text-[10px] text-slate-500">{it.description}</div>}
                      </td>
                      <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                      <td className="p-2.5 text-right">{it.unitPrice.toFixed(2)} $</td>
                      <td className="p-2.5 text-right font-black text-slate-900">{it.total.toFixed(2)} $</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="w-64 ml-auto space-y-1.5 text-right pt-2 border-t border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total :</span>
                  <span className="font-bold">{viewInvoice.subtotal.toFixed(2)} $ CAD</span>
                </div>
                {!viewInvoice.taxExempt && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>TPS (5%) :</span>
                      <span>{viewInvoice.taxTPS.toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>TVQ (9.975%) :</span>
                      <span>{viewInvoice.taxTVQ.toFixed(2)} $</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t-2 border-slate-900">
                  <span>Total Facturé :</span>
                  <span className="text-teal-800 text-base">{viewInvoice.total.toFixed(2)} $ CAD</span>
                </div>
              </div>

              {/* Stripe Payment Button in Modal */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                <div className="text-xs font-bold text-slate-700">Lien de Paiement Sécurisé Stripe :</div>
                <a
                  href={viewInvoice.stripePaymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-white font-extrabold text-xs shadow-sm transition-all"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Accéder à la Passerelle Stripe &rarr;</span>
                </a>
                <div className="text-[10px] text-slate-400">
                  Paiement par carte Visa, Mastercard, American Express ou Apple Pay
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
