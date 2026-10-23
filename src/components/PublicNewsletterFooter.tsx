import React, { useState, useEffect, useRef } from 'react';
import { Mail, Check, AlertCircle, Sparkles, Send, User } from 'lucide-react';

interface PublicNewsletterFooterProps {
  onSubscribed?: (email: string) => void;
  className?: string;
  isEmbed?: boolean;
}

export const PublicNewsletterFooter: React.FC<PublicNewsletterFooterProps> = ({
  onSubscribed,
  className = '',
  isEmbed = false,
}) => {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [preferencesLink, setPreferencesLink] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Send height to parent iframe if embedded via ResizeObserver
  useEffect(() => {
    const sendHeight = () => {
      if (containerRef.current && typeof window !== 'undefined' && window.parent !== window) {
        const h = containerRef.current.offsetHeight;
        window.parent.postMessage({ type: 'EVASION_NEWSLETTER_RESIZE', height: h }, '*');
      }
    };
    sendHeight();
    window.addEventListener('resize', sendHeight);

    let observer: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => sendHeight());
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', sendHeight);
      if (observer) observer.disconnect();
    };
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setStatusMessage('Veuillez saisir une adresse courriel valide.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setStatusMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          source: 'website_footer',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription.");
      }

      setStatus('success');
      setStatusMessage(data.message || 'Merci de votre inscription !');
      if (data.preferencesUrl) {
        setPreferencesLink(data.preferencesUrl);
      }
      setEmail('');
      setFirstName('');
      setLastName('');
      if (onSubscribed) onSubscribed(email);
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      id="newsletter-signup-footer"
      className={`w-full overflow-hidden ${
        isEmbed
          ? 'bg-transparent p-0 m-0 border-0 shadow-none'
          : 'mt-4 rounded-2xl bg-slate-900/95 px-4 py-3 border border-slate-800 shadow-sm'
      } ${className}`}
    >
      <div className="w-full max-w-5xl mx-auto">
        {/* Minimal header matching "Nous joindre" footer typography - Zero box/clash */}
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#14b8a6] tracking-tight">
              Infolettre Privilège
            </span>
            <span className="text-xs text-white/75">
              Ventes flash & aubaines voyage Évasion Soleil
            </span>
          </div>
        </div>

        {status === 'success' ? (
          <div className="py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold text-white">{statusMessage}</span>
            </div>
            {preferencesLink && (
              <a
                href={preferencesLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
              >
                ⚙️ Préférences
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="m-0">
            {/* Strictly Horizontal Row even in narrow footer columns: Nom | Prénom | Courriel | S'abonner */}
            <div className="flex flex-row items-center gap-1.5 w-full">
              <input
                type="text"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-[21%] min-w-[64px] px-2.5 py-2 rounded-lg bg-white/8 border border-white/20 text-white placeholder-white/55 text-xs focus:outline-none focus:border-[#14b8a6] focus:bg-white/12 transition-colors"
              />

              <input
                type="text"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-[21%] min-w-[64px] px-2.5 py-2 rounded-lg bg-white/8 border border-white/20 text-white placeholder-white/55 text-xs focus:outline-none focus:border-[#14b8a6] focus:bg-white/12 transition-colors"
              />

              <input
                type="email"
                required
                placeholder="Courriel *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-[105px] px-2.5 py-2 rounded-lg bg-white/8 border border-white/20 text-white placeholder-white/55 text-xs focus:outline-none focus:border-[#14b8a6] focus:bg-white/12 transition-colors"
              />

              <button
                type="submit"
                disabled={loading}
                className="shrink-0 px-3.5 py-2 rounded-lg bg-[#338b84] hover:bg-[#286f6a] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <span>...</span>
                ) : (
                  <>
                    <Send className="h-3 w-3" />
                    <span>S'abonner</span>
                  </>
                )}
              </button>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-1.5 text-rose-400 text-[11px] pt-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

