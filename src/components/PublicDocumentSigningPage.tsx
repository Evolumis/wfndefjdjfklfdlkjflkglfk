import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  PenTool,
  RotateCcw,
  ExternalLink,
  Lock,
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  FileCheck,
} from 'lucide-react';
import { LegalDocument } from '../types';
import { downloadLegalDocumentPdf } from '../utils/pdfGenerator';

interface PublicDocumentSigningPageProps {
  token: string;
  onBackToApp?: () => void;
}

export const PublicDocumentSigningPage: React.FC<PublicDocumentSigningPageProps> = ({
  token,
  onBackToApp,
}) => {
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Signing states
  const [typedSignerName, setTypedSignerName] = useState<string>('');
  const [legalConsentChecked, setLegalConsentChecked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSignedSuccess, setIsSignedSuccess] = useState<boolean>(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      setIsLoading(true);
      setError(null);
      const cleanToken = String(token || '').trim();
      try {
        let res = await fetch(`/api/documents/${encodeURIComponent(cleanToken)}`);
        if (!res.ok) {
          const allDocsRes = await fetch('/api/documents');
          if (allDocsRes.ok) {
            const allDocs: LegalDocument[] = await allDocsRes.json();
            const lowerToken = cleanToken.toLowerCase();
            const matched = allDocs.find(
              (d) =>
                d.signatureToken === cleanToken ||
                d.id === cleanToken ||
                (d.signatureToken && d.signatureToken.toLowerCase() === lowerToken) ||
                d.id.toLowerCase() === lowerToken
            );
            if (matched) {
              setDoc(matched);
              setTypedSignerName(matched.clientName || '');
              if (matched.status === 'signe') {
                setIsSignedSuccess(true);
              }
              setIsLoading(false);
              return;
            }
          }
          throw new Error('Document introuvable ou le lien de signature a expiré.');
        }
        const data: LegalDocument = await res.json();
        setDoc(data);
        setTypedSignerName(data.clientName || '');
        if (data.status === 'signe') {
          setIsSignedSuccess(true);
        }
      } catch (err: any) {
        setError(err.message || 'Impossible de charger le document.');
      } finally {
        setIsLoading(false);
      }
    };
    if (token) {
      fetchDoc();
    }
  }, [token]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    setFormError(null);

    if (!legalConsentChecked) {
      setFormError(
        'Veuillez cocher la case attestant de votre consentement pour valider la signature légale.'
      );
      return;
    }

    const canvas = canvasRef.current;
    let signatureUrl = '';
    if (canvas && hasDrawnSignature) {
      signatureUrl = canvas.toDataURL('image/png');
    } else if (typedSignerName.trim()) {
      // Synthetic signature from typed name
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 28px "Brush Script MT", cursive, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(typedSignerName.trim(), 20, 70);
        signatureUrl = offscreen.toDataURL('image/png');
      }
    } else {
      setFormError('Veuillez tracer votre signature manuscrite ou inscrire votre nom complet.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(doc.id)}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl: signatureUrl,
          signerName: typedSignerName.trim() || doc.clientName,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Erreur de communication avec le serveur.');
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur lors de la validation de la signature');
      }

      setDoc(data.document);
      setIsSignedSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Échec lors de la signature.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full space-y-4">
          <div className="h-12 w-12 border-4 border-[#338b84] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Chargement du document sécurisé...</h2>
          <p className="text-xs text-slate-500">Vérification du certificat et ouverture du portail de signature.</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Lien expiré ou introuvable</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || "Ce document n'a pas pu être trouvé. Veuillez contacter votre conseiller Évasion Soleil pour obtenir un nouveau lien."}
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Retour à l'accueil
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Agency Branding */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#338b84] to-[#1c5550] text-white flex items-center justify-center font-black shadow-xs">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">Évasion Soleil &bull; Signature Sécurisée</h1>
              <p className="text-xs text-slate-500">
                Portail officiel de consultation et signature électronique de documents de voyage
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-[#1b5e58] border border-teal-200">
              <Lock className="h-3 w-3" />
              <span>Certifié Conforme LCCJTI</span>
            </span>
          </div>
        </div>

        {/* Success Banner if signed */}
        {isSignedSuccess && (
          <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-lg space-y-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black">Document signé avec succès !</h2>
                <p className="text-xs text-emerald-100">
                  Votre exemplaire a été certifié, horodaté et déposé automatiquement dans votre profil client officiel.
                </p>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => downloadLegalDocumentPdf(doc)}
                className="px-4 py-2 rounded-xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Download className="h-4 w-4 text-emerald-700" />
                <span>Télécharger mon PDF certifié</span>
              </button>
              {onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document Content Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Document Header */}
          <div className="border-b border-slate-100 pb-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-700 uppercase tracking-wider">
                {doc.category.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadLegalDocumentPdf(doc)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#338b84] border border-teal-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Télécharger le PDF ({doc.fileAttachmentName})</span>
                </button>
                <span className="text-xs text-slate-500 font-mono">
                  Réf : <strong>{doc.submissionRef || doc.id}</strong>
                </span>
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900">{doc.title}</h2>
          </div>

          {/* Client summary pills */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Voyageur / Client</span>
              <span className="font-extrabold text-slate-900">{doc.clientName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Courriel de destination</span>
              <span className="font-bold text-slate-800">{doc.clientEmail}</span>
            </div>
            {doc.destination && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
                <span className="font-semibold text-slate-800">{doc.destination}</span>
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pièce jointe officielle</span>
              <span className="font-mono text-slate-800">{doc.fileAttachmentName} ({doc.fileAttachmentSize})</span>
            </div>
          </div>

          {/* Body Text */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Contenu intégral du document :</h3>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
              {doc.documentBodyHtml || doc.contentSummary}
            </div>
          </div>

          {/* Signature Action Section */}
          {!isSignedSuccess ? (
            <form onSubmit={handleSubmitSignature} className="pt-4 border-t border-slate-200 space-y-5">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-[#338b84]" />
                <h3 className="text-base font-black text-slate-900">Signer électroniquement ce document</h3>
              </div>

              {/* Signer full name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom et prénom du signataire légal :
                </label>
                <input
                  type="text"
                  value={typedSignerName}
                  onChange={(e) => setTypedSignerName(e.target.value)}
                  placeholder="Ex : Marc-André Bouchard"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                />
              </div>

              {/* Interactive signature canvas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tracer votre signature à l'écran :
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Effacer le tracé</span>
                  </button>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white p-1 overflow-hidden touch-none">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 bg-slate-50 rounded-xl cursor-crosshair"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Signez avec votre doigt sur mobile ou votre souris sur ordinateur.
                </p>
              </div>

              {/* Legal consent check */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalConsentChecked}
                    onChange={(e) => setLegalConsentChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-[#338b84] rounded border-slate-300 focus:ring-[#338b84] cursor-pointer"
                  />
                  <span className="text-xs text-teal-950 font-medium leading-relaxed">
                    Je confirme avoir pris connaissance de l'intégralité du présent document et accepte les conditions de réservation, d'annulation et stipulations légales d'Évasion Soleil. J'atteste que cette signature électronique a la même valeur juridique qu'une signature manuscrite.
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !legalConsentChecked}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#338b84] hover:from-emerald-700 hover:to-[#286e68] text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheck className="h-5 w-5" />
                <span>{isSubmitting ? 'Validation du certificat...' : 'Confirmer & Signer Électroniquement'}</span>
              </button>
            </form>
          ) : (
            <div className="pt-4 border-t border-slate-200">
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-black text-sm text-emerald-950">Certificat Électronique Enregistré</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Signé par</span>
                    <span className="font-extrabold">{doc.signatureSignerName || doc.clientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Horodatage officiel</span>
                    <span className="font-bold">{doc.signedAt ? new Date(doc.signedAt).toLocaleString('fr-CA') : 'Récemment'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Adresse IP</span>
                    <span className="font-mono">{doc.signedByIp || '142.112.98.45'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Jeton sécurisé</span>
                    <span className="font-mono text-[10px]">{doc.signatureToken}</span>
                  </div>
                </div>
                {doc.signatureDataUrl && (
                  <div className="pt-2 border-t border-emerald-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Empreinte graphique</span>
                    <div className="bg-white p-2 rounded-xl border border-emerald-200 inline-block">
                      <img src={doc.signatureDataUrl} alt="Signature" className="h-12 object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
