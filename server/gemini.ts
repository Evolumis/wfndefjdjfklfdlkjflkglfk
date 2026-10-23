import { GoogleGenAI } from '@google/genai';
import { dbManager } from './db.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

let aiInstance: GoogleGenAI | null = null;
let lastApiKeyUsed: string | undefined = undefined;

export function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!aiInstance || lastApiKeyUsed !== apiKey) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    lastApiKeyUsed = apiKey;
  }
  return aiInstance;
}

export interface BotReplyResult {
  replyText: string;
  isAgentHandoff: boolean;
  isReservationRedirect: boolean;
  visitorInfoDetected?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  providerUsed?: 'gemini' | 'openai' | 'programmed_responses' | 'rule_fallback';
  fallbackReason?: string;
  suggestedTags?: string[];
}

let lastGeminiStatus = {
  testedAt: '',
  working: false,
  lastError: '',
  statusCode: 0,
};

export function getOpenAIStatus(): {
  configured: boolean;
  working: boolean;
  model: string;
  maskedKey: string | null;
  lastTestedAt: string;
  lastError: string;
} {
  const key = process.env.GEMINI_API_KEY?.trim();
  return {
    configured: Boolean(key && key.length > 5),
    working: lastGeminiStatus.working,
    model: DEFAULT_GEMINI_MODEL,
    maskedKey: null,
    lastTestedAt: lastGeminiStatus.testedAt,
    lastError: lastGeminiStatus.lastError,
  };
}

export async function testOpenAIConnection(): Promise<{
  success: boolean;
  status: string;
  message: string;
  model: string;
  code?: number;
}> {
  const ai = getGenAI();
  if (!ai) {
    lastGeminiStatus = {
      testedAt: new Date().toISOString(),
      working: false,
      lastError: 'Service Gemini en attente de configuration',
      statusCode: 400,
    };
    return {
      success: false,
      status: 'missing_key',
      message: 'Martine fonctionne actuellement en mode Réponses Programmées.',
      model: DEFAULT_GEMINI_MODEL,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: 'Réponds uniquement par OK.',
    });
    const text = response.text;
    if (text) {
      lastGeminiStatus = {
        testedAt: new Date().toISOString(),
        working: true,
        lastError: '',
        statusCode: 200,
      };
      return {
        success: true,
        status: 'active',
        message: `Connexion réussie avec Google Gemini (${DEFAULT_GEMINI_MODEL}). Martine V. est opérationnelle !`,
        model: DEFAULT_GEMINI_MODEL,
        code: 200,
      };
    }
    throw new Error('Réponse vide du modèle Gemini');
  } catch (err: any) {
    lastGeminiStatus = {
      testedAt: new Date().toISOString(),
      working: false,
      lastError: err.message || 'Erreur lors de la communication avec Gemini',
      statusCode: 500,
    };
    return {
      success: false,
      status: 'error',
      message: `Erreur Gemini : ${err.message || 'Service indisponible'}. Mode Réponses Programmées activé.`,
      model: DEFAULT_GEMINI_MODEL,
      code: 500,
    };
  }
}

async function generateGeminiResponse(
  systemPrompt: string,
  userMessage: string,
  history: { sender: string; text: string }[] = []
): Promise<{ text: string | null; error?: string }> {
  const ai = getGenAI();
  if (!ai) {
    lastGeminiStatus.working = false;
    lastGeminiStatus.lastError = 'Service Gemini non configuré';
    return { text: null, error: 'missing_key' };
  }

  try {
    const conversationContext = history
      .slice(-6)
      .map((h) => `${h.sender === 'visitor' ? 'Client' : 'Martine V.'}: ${h.text}`)
      .join('\n');

    const promptContents = conversationContext
      ? `Historique récent de la conversation :\n${conversationContext}\n\nNouveau message du client : ${userMessage}`
      : userMessage;

    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: promptContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const content = response.text?.trim();
    if (content) {
      lastGeminiStatus.working = true;
      lastGeminiStatus.lastError = '';
      lastGeminiStatus.testedAt = new Date().toISOString();
      return { text: content };
    }
  } catch (err: any) {
    lastGeminiStatus.working = false;
    lastGeminiStatus.lastError = err.message || 'Erreur Gemini';
    lastGeminiStatus.testedAt = new Date().toISOString();
    console.warn(
      `[Martine AI / Gemini] Erreur lors de l'appel Gemini: ${err.message}. Basculement automatique en mode Réponses Programmées.`
    );
    return { text: null, error: err.message || 'gemini_error' };
  }

  return { text: null, error: 'empty_response' };
}

/**
 * Main Martine V. response generator
 * Propulsé par Google Gemini (gemini-3.8-flash) avec basculement automatique
 * en Mode Réponses Programmées si nécessaire.
 */
export async function generateMartineResponse(
  userMessage: string,
  history: { sender: string; text: string }[] = [],
  forceBotStatus?: boolean
): Promise<BotReplyResult> {
  const settings = dbManager.getChatbotSettings();
  const isBotActive = forceBotStatus !== undefined ? forceBotStatus : settings.botEnabled;
  const availability = dbManager.getAgentsAvailability();
  const hasAgentsAvailable = availability.availableAgents > 0;

  const lower = userMessage.toLowerCase();
  const wantsAgent =
    lower.includes('humain') ||
    lower.includes("parler à quelqu'un") ||
    lower.includes("parler a quelqu'un") ||
    lower.includes('agent') ||
    lower.includes('conseiller') ||
    lower.includes('personne') ||
    lower.includes('téléphoner') ||
    lower.includes('telephoner') ||
    lower.includes('numéro') ||
    lower.includes('numero') ||
    lower.includes('joindre') ||
    lower.includes('transfert');

  const wantsReservationOrQuote =
    lower.includes('réserver') ||
    lower.includes('reserver') ||
    lower.includes('réservation') ||
    lower.includes('reservation') ||
    lower.includes('devis') ||
    lower.includes('prix') ||
    lower.includes('combien') ||
    lower.includes('tarif') ||
    lower.includes('soumission') ||
    lower.includes('coûte') ||
    lower.includes('coute');

  const wantsDestinations =
    lower.includes('destination') ||
    lower.includes('cancun') ||
    lower.includes('cancún') ||
    lower.includes('punta cana') ||
    lower.includes('cuba') ||
    lower.includes('varadero') ||
    lower.includes('jamaïque') ||
    lower.includes('jamaique') ||
    lower.includes('croisière') ||
    lower.includes('croisiere') ||
    lower.includes('plage') ||
    lower.includes('hôtel') ||
    lower.includes('hotel') ||
    lower.includes('soleil') ||
    lower.includes('mexique');

  const isGreeting =
    lower === 'bonjour' ||
    lower === 'bonjour !' ||
    lower === 'bonjour martine' ||
    lower === 'salut' ||
    lower === 'bonsoir' ||
    lower === 'hello' ||
    lower.startsWith('bonjour ') ||
    lower.startsWith('salut ');

  const emailMatch = userMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = userMessage.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  const programmed = settings.programmedResponses || {
    welcome:
      'Bonjour ! Je suis Martine V., votre conseillère virtuelle Évasion Soleil ☀️. En quoi puis-je vous aider pour vos prochaines vacances au soleil ?',
    quoteRequest:
      'Pour obtenir une estimation détaillée et personnalisée sans aucun frais, je vous invite à remplir notre formulaire de devis en ligne sur evasionsoleil.com/devis. Nos conseillers en voyages vous répondront en priorité avec les meilleurs tarifs du moment !',
    agentRequestOnline:
      "Des conseillers de notre équipe sont actuellement disponibles en ligne ! Indiquez-moi votre nom et votre numéro de téléphone afin qu'un conseiller prenne directement le relais avec vous.",
    agentRequestOffline:
      "Actuellement, aucun agent n'est disponible immédiatement sur le clavardage. Remplissez notre court formulaire sur evasionsoleil.com/devis ou laissez vos coordonnées ici, et un conseiller vous recontactera dès sa disponibilité !",
    destinationsInfo:
      "Évasion Soleil est spécialiste des séjours tout-inclus au soleil (Cancún, Riviera Maya, Punta Cana, Varadero, Jamaïque, Bahamas) ainsi que des croisières maritimes ! Quel type d'escapade recherchez-vous ?",
    generalFallback:
      'Je suis Martine V., votre assistante virtuelle Évasion Soleil (info@evasionsoleil.com). Pour toute demande de réservation ou tarif, je vous invite à utiliser notre formulaire de devis en ligne ou à demander à parler à un conseiller.',
  };

  const getContextualTags = (): string[] => {
    if (settings.quickReplyOptions && settings.quickReplyOptions.length > 0) {
      return settings.quickReplyOptions;
    }
    if (wantsDestinations) {
      return [
        '🌴 Forfaits Tout-Inclus Cancún',
        '☀️ Punta Cana 5★',
        '🚢 Croisières Caraïbes',
        '📋 Remplir une soumission',
        '📞 Parler à un conseiller',
      ];
    }
    if (wantsReservationOrQuote) {
      return [
        '📋 Remplir une soumission',
        '💵 Battre un prix concurrent',
        '✈️ Forfait Vol + Hôtel',
        '📞 Parler à un conseiller',
      ];
    }
    if (wantsAgent) {
      return [
        '📞 Ligne directe 1-800-555-7653',
        '✉️ info@evasionsoleil.com',
        '📋 Remplir une soumission',
        "🕒 Heures d'ouverture",
      ];
    }
    return [
      '🌴 Tout-Inclus Sud',
      '🚢 Croisières',
      '📋 Soumission gratuite',
      '📞 Conseiller en direct',
      '💵 Battre un prix',
    ];
  };

  const getProgrammedResponse = (reason: string): BotReplyResult => {
    const progAny = programmed as any;
    let replyText = programmed.generalFallback || progAny.fallbackGeneral || 'Bonjour ! Comment puis-je vous aider ?';
    let isHandoff = false;
    let isRedirect = false;

    if (wantsReservationOrQuote) {
      replyText = programmed.quoteRequest || progAny.devis || replyText;
      isRedirect = true;
    } else if (wantsAgent) {
      replyText =
        hasAgentsAvailable && isBotActive
          ? programmed.agentRequestOnline || progAny.agentTransfer || replyText
          : programmed.agentRequestOffline || progAny.agentUnavailable || replyText;
      isHandoff = true;
    } else if (wantsDestinations) {
      replyText = programmed.destinationsInfo || progAny.pricing || replyText;
    } else if (isGreeting) {
      replyText = programmed.welcome || progAny.greeting || replyText;
    }

    return {
      replyText,
      isAgentHandoff: isHandoff,
      isReservationRedirect: isRedirect,
      visitorInfoDetected: {
        email: emailMatch ? emailMatch[0] : undefined,
        phone: phoneMatch ? phoneMatch[0] : undefined,
      },
      providerUsed: 'programmed_responses',
      fallbackReason: reason,
      suggestedTags: getContextualTags(),
    };
  };

  if (settings.forceProgrammedMode) {
    return getProgrammedResponse('Mode forcé dans les paramètres');
  }

  const customPrompt = settings.systemPrompt?.trim() || '';
  const systemPrompt = `
Tu es Martine V., la conseillère d'accueil virtuelle officielle de l'agence de voyages québécoise Évasion Soleil (evasionsoleil.com).
Ton courriel officiel : martine@evasionsoleil.com.
Ton ton : Chaleureux, amical, professionnel, bienveillant, québécois courtois. Toujours soucieuse que le client soit parfaitement servi et rassuré.
${customPrompt ? `\nConsignes spécifiques de l'agence : ${customPrompt}\n` : ''}
STATUT DE L'ÉQUIPE EN DIRECT :
- Conseillers disponibles : ${hasAgentsAvailable ? `OUI (${availability.availableAgents} agent(s) disponible(s) - Pastille Verte)` : 'NON (Aucun agent disponible - Pastille Bleue)'}
- Mode du service d'accueil : ${isBotActive ? 'Actif' : 'Fermé'}

RÈGLE ABSOLUE & NON NÉGOCIABLE :
1. TU N'AS AUCUN DROIT DE DONNER DES PRIX, DE CHIFFRER UN FORFAIT OU DE VENDRE DIRECTEMENT.
   Tu es STRICTEMENT là pour donner des informations générales : climat, meilleures périodes pour voyager, types d'hôtels, plages, formalités (passeports, vaccins), suggestions de destinations soleil (Cancún, Riviera Maya, Punta Cana, Cuba, Jamaïque, croisières).
   Si le client te demande un prix, un devis ou combien ça coûte, réponds que les tarifs varient en temps réel selon les vols et disponibilités, et invite-le chaleureusement à faire une demande de devis sur evasionsoleil.com/devis.

2. GESTION DES DEMANDES D'AGENTS HUMAINS :
   - Si des conseillers sont disponibles (${hasAgentsAvailable && isBotActive}):
     Propose de transférer la discussion à un conseiller disponible en lui demandant son nom et numéro de téléphone.
   - Si aucun conseiller n'est disponible ou si le service est fermé:
     Explique avec délicatesse qu'aucun agent n'est actuellement disponible en direct, et propose-lui de laisser son nom, courriel et numéro de téléphone ou de remplir le formulaire sur evasionsoleil.com/devis pour être recontacté en priorité dès disponibilité.

3. Reste concise, positive et claire (2 à 4 phrases maximum).
`;

  const geminiResult = await generateGeminiResponse(systemPrompt, userMessage, history);
  if (geminiResult.text) {
    return {
      replyText: geminiResult.text,
      isAgentHandoff: wantsAgent,
      isReservationRedirect: wantsReservationOrQuote,
      visitorInfoDetected: {
        email: emailMatch ? emailMatch[0] : undefined,
        phone: phoneMatch ? phoneMatch[0] : undefined,
      },
      providerUsed: 'gemini',
      suggestedTags: getContextualTags(),
    };
  }

  return getProgrammedResponse(`Basculement automatique: ${geminiResult.error || 'service indisponible'}`);
}
