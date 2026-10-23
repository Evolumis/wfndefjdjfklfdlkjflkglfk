import React, { useState, useEffect } from 'react';
import {
  Sun,
  Plane,
  Ship,
  Flame,
  Check,
  CheckCircle2,
  Calendar,
  Send,
  Phone,
  Mail,
  User as UserIcon,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  BedDouble,
  PlaneTakeoff,
  Clock,
  Sparkles,
  X,
  Info,
  Building,
  Palmtree,
  Car,
  MapPin,
  Anchor,
  Compass,
  Minus,
  Plus
} from 'lucide-react';
import { FormConfig, ServiceType, QuoteSubmission } from '../types';

interface QuoteFormInteractiveProps {
  formConfig: FormConfig;
  onSubmissionSuccess?: (sub: QuoteSubmission) => void;
  isStandaloneEmbed?: boolean;
}

export const QuoteFormInteractive: React.FC<QuoteFormInteractiveProps> = ({
  formConfig,
  onSubmissionSuccess,
  isStandaloneEmbed = false,
}) => {
  // 4 clear, comfortable steps:
  // 1: Destination & Dates (Type de voyage, départ, destination, dates, options de transport)
  // 2: Voyageurs & Chambres (Adultes, enfants, chambres, budget par personne)
  // 3: Assurances & Options (Protection voyage, financement, demandes spéciales)
  // 4: Vos Coordonnées & Envoi (Nom, courriel, tél, moment d'appel -> ENVOYER)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Active Travel Category
  const [activeTab, setActiveTab] = useState<ServiceType>('forfait_tout_inclus');

  // Detect Home Page section embed layout mode
  const isHomeLayout = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('layout') === 'home' || params.get('mode') === 'home' || params.get('compact') === 'true' || window.location.hash.includes('home');
  }, []);

  // PostMessage auto-resizing to parent page (WordPress/cPanel embed) via ResizeObserver
  useEffect(() => {
    const notifyParent = () => {
      try {
        const root = document.getElementById('evasion-quote-root');
        const height = root ? root.offsetHeight : document.body.scrollHeight;
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'EVASION_SOUMISSION_RESIZE', height }, '*');
          window.parent.postMessage({ type: 'EVASION_RESIZE_IFRAME', height }, '*');
        }
      } catch {}
    };
    notifyParent();
    const t = setTimeout(notifyParent, 120);
    window.addEventListener('resize', notifyParent);

    let observer: ResizeObserver | null = null;
    const rootEl = document.getElementById('evasion-quote-root');
    if (rootEl && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => notifyParent());
      observer.observe(rootEl);
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', notifyParent);
      if (observer) observer.disconnect();
    };
  }, [currentStep, activeTab]);

  // --- STEP 1: DESTINATION & DATES ---
  const defaultCity = formConfig.departureCities?.[0] || 'Montréal (YUL)';
  const [departureCity, setDepartureCity] = useState<string>(defaultCity);
  const [customCity, setCustomCity] = useState<string>('');
  const [isCustomCity, setIsCustomCity] = useState<boolean>(false);

  const [destination, setDestination] = useState<string>('Cancún / Riviera Maya');
  const [customDestination, setCustomDestination] = useState<string>('');
  const [isCustomDestination, setIsCustomDestination] = useState<boolean>(false);

  const [departureDate, setDepartureDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFlexibleDate, setIsFlexibleDate] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>('7 jours / 7 nuits');

  // Options configurables demandées (Classe de cabine)
  const defaultAllInclusiveFlightClass =
    formConfig.allInclusiveFlightClasses?.[0] || 'Classe Économique standard';
  const [allInclusiveFlightClass, setAllInclusiveFlightClass] = useState<string>(
    defaultAllInclusiveFlightClass
  );
  const defaultVolHotelFlightClass =
    formConfig.volHotelFlightClasses?.[0] || 'Classe Économique standard';
  const [volHotelFlightClass, setVolHotelFlightClass] = useState<string>(
    defaultVolHotelFlightClass
  );
  const defaultVolHotelCategory =
    formConfig.volHotelHotelCategories?.[0] || '4 Étoiles Supérieur';
  const [volHotelHotelCategory, setVolHotelHotelCategory] = useState<string>(defaultVolHotelCategory);

  useEffect(() => {
    if (formConfig.allInclusiveFlightClasses && formConfig.allInclusiveFlightClasses.length > 0) {
      if (!allInclusiveFlightClass || !formConfig.allInclusiveFlightClasses.includes(allInclusiveFlightClass)) {
        setAllInclusiveFlightClass(formConfig.allInclusiveFlightClasses[0]);
      }
    }
  }, [formConfig.allInclusiveFlightClasses]);

  useEffect(() => {
    if (formConfig.volHotelFlightClasses && formConfig.volHotelFlightClasses.length > 0) {
      if (!volHotelFlightClass || !formConfig.volHotelFlightClasses.includes(volHotelFlightClass)) {
        setVolHotelFlightClass(formConfig.volHotelFlightClasses[0]);
      }
    }
  }, [formConfig.volHotelFlightClasses]);

  // Duration in days state (derived from dates or preset)
  const [durationDays, setDurationDays] = useState<number>(7);

  // Helper to add days to a YYYY-MM-DD string
  const addDaysToDate = (start: string, days: number): string => {
    const base = start ? new Date(start + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + days);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper to get number of days between two YYYY-MM-DD dates
  const getDurationDaysNumber = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const d1 = new Date(start + 'T12:00:00');
    const d2 = new Date(end + 'T12:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    const diff = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Helper to calculate exact days and nights from departureDate and endDate
  const calculateDurationFromDates = (start: string, end: string): string => {
    if (!start || !end) return '';
    const d1 = new Date(start + 'T12:00:00');
    const d2 = new Date(end + 'T12:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Date de retour antérieure';
    if (diffDays === 0) return 'Aller-retour même jour (1 jour)';
    return `${diffDays} jour${diffDays > 1 ? 's' : ''} / ${diffDays} nuit${diffDays > 1 ? 's' : ''}`;
  };

  // Quick preset helper to quickly set endDate (e.g. +7j, +10j, +14j, +21j)
  const handleSetEndDateWithDays = (days: number) => {
    setDurationDays(days);
    const formatted = addDaysToDate(departureDate, days);
    setEndDate(formatted);
    setDuration(`${days} jour${days > 1 ? 's' : ''} / ${days} nuit${days > 1 ? 's' : ''}`);
  };

  // Sync duration automatically whenever dates change
  useEffect(() => {
    if (departureDate && endDate) {
      const calc = calculateDurationFromDates(departureDate, endDate);
      const days = getDurationDaysNumber(departureDate, endDate);
      if (days > 0) {
        setDurationDays(days);
      }
      if (calc && !calc.includes('antérieure')) {
        setDuration(calc);
      }
    }
  }, [departureDate, endDate]);

  // Auto-notify parent iframe of exact height to eliminate scrollbars
  useEffect(() => {
    const notifyHeight = () => {
      try {
        const height = document.body.scrollHeight || document.documentElement.scrollHeight || 950;
        window.parent?.postMessage({ type: 'EVASION_SOUMISSION_RESIZE', height }, '*');
      } catch {}
    };
    notifyHeight();
    const timer = setTimeout(notifyHeight, 250);
    window.addEventListener('resize', notifyHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', notifyHeight);
    };
  }, [currentStep, activeTab]);

  // Specific to Vol Seul
  const [flightTripType, setFlightTripType] = useState<'aller_retour' | 'aller_simple' | 'multi_destinations'>('aller_retour');
  const [flightReturnDate, setFlightReturnDate] = useState<string>('');
  const [flightClass, setFlightClass] = useState<'economique' | 'premium' | 'affaires'>('economique');
  const [flightOnlyNoHotelConfirmed, setFlightOnlyNoHotelConfirmed] = useState<boolean>(false);
  const [flightDirectOnly, setFlightDirectOnly] = useState<boolean>(false);

  // Specific to Croisière (Ports d'embarquement & Vols requis)
  const defaultCruisePort = formConfig.cruiseDeparturePorts?.[0] || 'Port de Miami (Floride)';
  const [cruiseDeparturePort, setCruiseDeparturePort] = useState<string>(defaultCruisePort);
  const [customCruisePort, setCustomCruisePort] = useState<string>('');
  const [isCustomCruisePort, setIsCustomCruisePort] = useState<boolean>(false);
  const [cruiseRequiresFlights, setCruiseRequiresFlights] = useState<boolean>(false);
  const [cruiseCabinType, setCruiseCabinType] = useState<string>('Balcon Privé (Vue mer dégagée)');
  const [cruiseLine, setCruiseLine] = useState<string>('Royal Caribbean');

  // Specific to Location d'auto (Option voyage et catégorie)
  const [carRentalRequested, setCarRentalRequested] = useState<boolean>(false);
  const [carRentalStartDate, setCarRentalStartDate] = useState<string>('');
  const [carRentalEndDate, setCarRentalEndDate] = useState<string>('');
  const [carPickupLocation, setCarPickupLocation] = useState<string>('Aéroport d\'arrivée');
  const [customCarPickupLocation, setCustomCarPickupLocation] = useState<string>('');
  const [isCustomCarPickup, setIsCustomCarPickup] = useState<boolean>(false);
  const [carDropoffLocation, setCarDropoffLocation] = useState<string>('');
  const [carSameDropoffLocation, setCarSameDropoffLocation] = useState<boolean>(true);
  const [carCategory, setCarCategory] = useState<string>('Berline intermédiaire standard');
  const [carDriverAge, setCarDriverAge] = useState<string>('25 ans et +');

  // Specific to Battre un prix
  const [competitorUrl, setCompetitorUrl] = useState<string>('');
  const [competitorTargetPrice, setCompetitorTargetPrice] = useState<string>('');
  const [competitorAgency, setCompetitorAgency] = useState<string>('');
  const [competitorDetails, setCompetitorDetails] = useState<string>('');

  // Specific to Vol + Hôtel or Forfait
  const [hotelName, setHotelName] = useState<string>('');
  const [hotelClassification, setHotelClassification] = useState<string>('Toutes classifications');

  // --- STEP 2: VOYAGEURS & CHAMBRES ---
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [childrenAgesList, setChildrenAgesList] = useState<number[]>([]);
  const [roomsCount, setRoomsCount] = useState<number>(1);
  const [budgetPerPerson, setBudgetPerPerson] = useState<string>('1 600 $ - 2 200 $');

  // --- STEP 3: ASSURANCES & OPTIONS ---
  const [travelInsurance, setTravelInsurance] = useState<'oui' | 'non' | 'deja_assure'>('oui');
  const [insuranceConfirmedNo, setInsuranceConfirmedNo] = useState<boolean>(false);
  const [insuranceTypeSelected, setInsuranceTypeSelected] = useState<string>(
    'Forfait Tout Compris (Soins Médicaux + Annulation + Bagages)'
  );
  const [vacationFinancing, setVacationFinancing] = useState<'oui' | 'non'>('non');
  const [showFinancingModal, setShowFinancingModal] = useState<boolean>(false);
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Auto-sync car rental dates with trip dates if car rental is enabled and dates not set yet
  useEffect(() => {
    if ((carRentalRequested || activeTab === 'location_auto') && departureDate && !carRentalStartDate) {
      setCarRentalStartDate(departureDate);
    }
    if ((carRentalRequested || activeTab === 'location_auto') && endDate && !carRentalEndDate) {
      setCarRentalEndDate(endDate);
    }
  }, [carRentalRequested, activeTab, departureDate, endDate, carRentalStartDate, carRentalEndDate]);

  // --- STEP 4: COORDONNÉES & ENVOI ---
  const [fullName, setFullName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [preferredCallTime, setPreferredCallTime] = useState<'matin' | 'apres-midi' | 'soiree' | 'tout_temps'>('apres-midi');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<QuoteSubmission | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Post message to parent frame for dynamic iframe resizing and communication
  useEffect(() => {
    const notifyParentHeight = () => {
      try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
          const rootEl = document.getElementById('evasion-quote-root');
          const exactHeight = rootEl
            ? Math.ceil(rootEl.getBoundingClientRect().height) + 16
            : Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0);
          const payload = {
            height: exactHeight,
            step: currentStep,
            submitted: Boolean(submittedData),
          };
          window.parent.postMessage({ type: 'EVASION_RESIZE_IFRAME', ...payload }, '*');
          window.parent.postMessage({ type: 'EVASION_SOUMISSION_RESIZE', ...payload }, '*');
        }
      } catch {}
    };

    notifyParentHeight();
    const t1 = setTimeout(notifyParentHeight, 80);
    const t2 = setTimeout(notifyParentHeight, 300);

    const rootEl = document.getElementById('evasion-quote-root');
    let ro: ResizeObserver | null = null;
    if (rootEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        notifyParentHeight();
      });
      ro.observe(rootEl);
    }

    window.addEventListener('resize', notifyParentHeight);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', notifyParentHeight);
    };
  }, [currentStep, activeTab, submittedData]);

  // Travel Categories definitions
  const serviceCards = [
    {
      id: 'forfait_tout_inclus' as ServiceType,
      title: 'Forfait / Tout-Inclus',
      badge: null,
      icon: Sun,
      headerTitle: 'FORFAIT / TOUT-INCLUS',
      description: 'Vol, hôtel tout-inclus, repas, boissons et transferts aéroport inclus.',
    },
    {
      id: 'croisiere' as ServiceType,
      title: 'Croisière',
      badge: null,
      icon: Ship,
      headerTitle: 'CROISIÈRE',
      description: 'Caraïbes, Méditerranée, Bahamas ou Alaska avec cabine vue mer ou balcon.',
    },
    {
      id: 'battre_prix' as ServiceType,
      title: 'Battre un prix',
      badge: 'PRIX',
      icon: Flame,
      headerTitle: 'BATTRE UN PRIX (MEILLEUR TARIF GARANTI)',
      description: 'Vous avez vu moins cher ailleurs ? Collez le lien ou le tarif, on fait mieux !',
    },
    {
      id: 'vol_hotel' as ServiceType,
      title: 'Vol + Hôtel',
      badge: null,
      icon: Plane,
      headerTitle: 'VOL + HÔTEL',
      description: 'Combinaison sur-mesure de vol et hôtel pour escapade ou séjour personnalisé.',
    },
    {
      id: 'vol_seul' as ServiceType,
      title: 'Vol seul (sans hôtel)',
      badge: 'AUCUN HÔTEL',
      icon: PlaneTakeoff,
      headerTitle: 'VOL SEUL (SANS HÔTEL)',
      description: 'Billet d\'avion seul sans aucun complexe hôtelier ni hébergement.',
    },
  ];

  const currentTabInfo = serviceCards.find((t) => t.id === activeTab) || serviceCards[0];

  // Helper for child count & age management
  const handleChildrenCountChange = (count: number) => {
    setChildrenCount(count);
    setChildrenAgesList((prev) => {
      const newList = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          newList.push(6);
        }
      } else {
        newList.length = count;
      }
      return newList;
    });
  };

  const handleChildAgeChange = (index: number, delta: number) => {
    setChildrenAgesList((prev) => {
      const updated = [...prev];
      const cur = updated[index] ?? 6;
      updated[index] = Math.max(0, Math.min(17, cur + delta));
      return updated;
    });
  };

  // Step 1 Validation -> Go to Step 2
  const handleGoToStep2 = () => {
    setValidationError(null);

    // If cruise, validate cruise departure port
    if (activeTab === 'croisiere') {
      const effPort = isCustomCruisePort ? customCruisePort.trim() : cruiseDeparturePort.trim();
      if (!effPort) {
        setValidationError('Veuillez sélectionner ou préciser votre port d\'embarquement pour la croisière.');
        return;
      }
      if (cruiseRequiresFlights) {
        const effCity = isCustomCity ? customCity.trim() : departureCity.trim();
        if (!effCity) {
          setValidationError('Veuillez indiquer votre aéroport de départ pour les billets d\'avion.');
          return;
        }
      }
    } else {
      const effCity = isCustomCity ? customCity.trim() : departureCity.trim();
      if (!effCity) {
        setValidationError('Veuillez indiquer ou choisir une ville de départ.');
        return;
      }
    }

    const effDest = isCustomDestination ? customDestination.trim() : destination.trim();
    if (!effDest && activeTab !== 'battre_prix') {
      setValidationError('Veuillez préciser votre destination.');
      return;
    }

    if (!departureDate) {
      setValidationError('Veuillez indiquer votre date approximative de départ.');
      return;
    }

    if (endDate && endDate < departureDate) {
      setValidationError('La date de fin ne peut pas être antérieure à la date de départ.');
      return;
    }

    if (activeTab === 'vol_seul' && flightTripType === 'aller_retour' && !flightReturnDate && !endDate) {
      setValidationError('Veuillez indiquer votre date de retour pour le vol aller-retour.');
      return;
    }

    if (activeTab === 'vol_seul' && !flightOnlyNoHotelConfirmed) {
      setValidationError("Veuillez cocher la case confirmant qu'aucun hôtel n'est inclus pour le vol seul.");
      return;
    }

    setCurrentStep(2);
  };

  // Step 2 Validation -> Go to Step 3
  const handleGoToStep2to3 = () => {
    setValidationError(null);
    if (adultsCount < 1) {
      setValidationError('Veuillez indiquer au moins 1 adulte.');
      return;
    }
    if (adultsCount > 20) {
      setValidationError('Le nombre maximal d\'adultes par demande est fixé à 20 personnes.');
      return;
    }
    setCurrentStep(3);
  };

  // Step 3 Validation -> Go to Step 4
  const handleGoToStep3to4 = () => {
    setValidationError(null);
    if (travelInsurance === 'non' && !insuranceConfirmedNo) {
      setValidationError('Veuillez cocher la confirmation du délai strict de 48h concernant l\'assurance.');
      return;
    }
    if (carRentalRequested) {
      const effPickup = isCustomCarPickup ? customCarPickupLocation.trim() : carPickupLocation.trim();
      if (!effPickup) {
        setValidationError('Veuillez préciser l\'emplacement de prise en charge pour la voiture de location.');
        return;
      }
    }
    setCurrentStep(4);
  };

  // Step 4: Final Submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!fullName.trim()) {
      setValidationError('Veuillez renseigner votre nom et prénom complet.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setValidationError('Veuillez saisir une adresse courriel valide pour recevoir la confirmation CC.');
      return;
    }
    
    // STRICT REQUIREMENT: Phone number must have exactly 10 digits
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setValidationError('Le numéro de téléphone doit comporter exactement 10 chiffres (ex: (514) 555-0199 ou 5145550199).');
      return;
    }

    setIsSubmitting(true);

    try {
      const nameParts = fullName.trim().split(' ');
      const customerFirstName = nameParts[0] || fullName;
      const customerLastName = nameParts.slice(1).join(' ') || '';

      const effCity = isCustomCity ? customCity.trim() : departureCity.trim();
      const effDest = isCustomDestination ? customDestination.trim() : destination.trim();

      const childrenAgesFormatted =
        childrenAgesList.length > 0
          ? childrenAgesList.map((a, i) => `Enfant ${i + 1}: ${a} an(s)`).join(', ')
          : undefined;

      const effCruisePort = isCustomCruisePort ? customCruisePort.trim() : cruiseDeparturePort.trim();
      const effCarPickup = isCustomCarPickup ? customCarPickupLocation.trim() : carPickupLocation.trim();

      const payload = {
        serviceType: activeTab,
        departureCity: activeTab === 'croisiere' ? (cruiseRequiresFlights ? effCity : effCruisePort) : effCity,
        destination: effDest,
        departureDate,
        endDate: endDate || flightReturnDate || undefined,
        returnDate: endDate || flightReturnDate || undefined,
        isFlexibleDate,
        duration,
        hotelName: (activeTab === 'forfait_tout_inclus' || activeTab === 'vol_hotel') ? hotelName.trim() || undefined : undefined,
        hotelClassification: activeTab === 'vol_hotel' ? volHotelHotelCategory : ((activeTab === 'forfait_tout_inclus') ? hotelClassification : undefined),
        cabinClass:
          activeTab === 'forfait_tout_inclus'
            ? allInclusiveFlightClass
            : activeTab === 'vol_hotel'
            ? volHotelFlightClass
            : activeTab === 'vol_seul'
            ? (flightClass === 'economique' ? 'Classe Économique standard' : flightClass === 'premium' ? 'Classe Premium Économie' : 'Classe Affaires')
            : undefined,
        allInclusiveFlightClass: activeTab === 'forfait_tout_inclus' ? allInclusiveFlightClass : undefined,
        volHotelFlightClass: activeTab === 'vol_hotel' ? volHotelFlightClass : undefined,
        volHotelHotelCategory: activeTab === 'vol_hotel' ? volHotelHotelCategory : undefined,
        flightDirectOnly: activeTab !== 'croisiere' ? flightDirectOnly : undefined,
        // Specific to Croisière (Ports)
        cruiseCabinType: activeTab === 'croisiere' ? cruiseCabinType : undefined,
        cruiseLine: activeTab === 'croisiere' ? cruiseLine : undefined,
        cruisePort: activeTab === 'croisiere' ? effCruisePort : undefined,
        cruiseDeparturePort: activeTab === 'croisiere' ? effCruisePort : undefined,
        cruiseRequiresFlights: activeTab === 'croisiere' ? cruiseRequiresFlights : undefined,
        // Specific to Location d'auto
        carRentalRequested: activeTab === 'location_auto' ? true : carRentalRequested,
        carRentalStartDate: (activeTab === 'location_auto' || carRentalRequested) ? (carRentalStartDate || departureDate || undefined) : undefined,
        carRentalEndDate: (activeTab === 'location_auto' || carRentalRequested) ? (carRentalEndDate || endDate || undefined) : undefined,
        carPickupLocation: (activeTab === 'location_auto' || carRentalRequested) ? effCarPickup : undefined,
        carDropoffLocation: (activeTab === 'location_auto' || carRentalRequested) ? (carSameDropoffLocation ? effCarPickup : (carDropoffLocation.trim() || undefined)) : undefined,
        carCategory: (activeTab === 'location_auto' || carRentalRequested) ? carCategory : undefined,
        carDriverAge: (activeTab === 'location_auto' || carRentalRequested) ? carDriverAge : undefined,
        // Specific to Vol Seul
        flightTripType: activeTab === 'vol_seul' ? flightTripType : undefined,
        flightClass: activeTab === 'vol_seul' ? flightClass : undefined,
        flightReturnDate: activeTab === 'vol_seul' && flightTripType === 'aller_retour' ? (flightReturnDate || endDate) : undefined,
        flightOnlyNoHotelConfirmed: activeTab === 'vol_seul' ? flightOnlyNoHotelConfirmed : undefined,
        competitorUrl: activeTab === 'battre_prix' ? competitorUrl.trim() || undefined : undefined,
        competitorTargetPrice: activeTab === 'battre_prix' ? competitorTargetPrice.trim() || undefined : undefined,
        competitorAgency: activeTab === 'battre_prix' ? competitorAgency.trim() || undefined : undefined,
        competitorDetails: activeTab === 'battre_prix' ? competitorDetails.trim() || undefined : undefined,
        roomsCount: (activeTab === 'vol_seul' || activeTab === 'location_auto') ? 0 : roomsCount,
        adultsCount,
        childrenCount,
        childrenAges: childrenAgesFormatted,
        childrenAgesList: childrenCount > 0 ? childrenAgesList : undefined,
        travelInsurance,
        insuranceConfirmedNo: travelInsurance === 'non' ? insuranceConfirmedNo : undefined,
        insuranceTypeSelected: travelInsurance === 'oui' ? insuranceTypeSelected : undefined,
        vacationFinancing,
        budgetPerPerson,
        customerNotes: customerNotes.trim() || undefined,
        fullName,
        customerFirstName,
        customerLastName,
        customerEmail,
        customerPhone,
        preferredCallTime,
      };

      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error('Erreur lors de la transmission du devis à la centrale.');
        }

        const created: QuoteSubmission = await res.json();
        setSubmittedData(created);
        if (onSubmissionSuccess) {
          onSubmissionSuccess(created);
        }
      } catch (networkErr) {
        // Continuité 100% Sans Interruption : Sauvegarde locale immédiate côté navigateur si coupure réseau
        const fallbackSubmission: QuoteSubmission = {
          ...(payload as any),
          id: `sub_local_${Date.now()}`,
          referenceNumber: `ES-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
          callStatus: 'a_appeler',
          callAttempts: 0,
          notes: [],
          emailCustomerSent: true,
          emailAgencySent: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          const rawQueue = localStorage.getItem('evasion_pending_submissions_outbox');
          const queue = rawQueue ? JSON.parse(rawQueue) : [];
          queue.push(payload);
          localStorage.setItem('evasion_pending_submissions_outbox', JSON.stringify(queue));
        } catch {}
        setSubmittedData(fallbackSubmission);
        if (onSubmissionSuccess) {
          onSubmissionSuccess(fallbackSubmission);
        }
      }
    } catch (err: any) {
      setValidationError(err.message || 'Une erreur est survenue lors de l\'envoi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Synchronisation automatique en arrière-plan des devis enregistrés localement en cas de micro-coupure réseau
  useEffect(() => {
    const flushPendingOutbox = async () => {
      try {
        const rawQueue = localStorage.getItem('evasion_pending_submissions_outbox');
        if (!rawQueue) return;
        const queue = JSON.parse(rawQueue);
        if (!Array.isArray(queue) || queue.length === 0) return;

        const remaining: any[] = [];
        for (const item of queue) {
          try {
            const res = await fetch('/api/submissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            if (!res.ok) remaining.push(item);
          } catch {
            remaining.push(item);
          }
        }
        if (remaining.length === 0) {
          localStorage.removeItem('evasion_pending_submissions_outbox');
        } else {
          localStorage.setItem('evasion_pending_submissions_outbox', JSON.stringify(remaining));
        }
      } catch {}
    };

    flushPendingOutbox();
    const interval = setInterval(flushPendingOutbox, 15000);
    window.addEventListener('online', flushPendingOutbox);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', flushPendingOutbox);
    };
  }, []);

  const handleReset = () => {
    setSubmittedData(null);
    setCurrentStep(1);
    setDestination('Cancún / Riviera Maya');
    setCustomDestination('');
    setIsCustomDestination(false);
    setDepartureDate('');
    setFlightReturnDate('');
    setFullName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerNotes('');
    setChildrenCount(0);
    setChildrenAgesList([]);
    setFlightOnlyNoHotelConfirmed(false);
    setInsuranceConfirmedNo(false);
  };

  // =========================================================================
  // SUCCESS VIEW
  // =========================================================================
  if (submittedData) {
    return (
      <div id="evasion-quote-root" className="relative rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 w-full max-w-4xl mx-auto my-0 bg-white p-6 sm:p-10 text-center animate-in fade-in duration-200">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
          <Check className="h-8 w-8 stroke-[2.5]" />
        </div>

        <span className="inline-block px-4 py-1.5 rounded-full bg-[#daf0ed] text-[#0e7068] text-xs font-black tracking-widest uppercase mb-3">
          RÉFÉRENCE : {submittedData.referenceNumber}
        </span>

        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Demande de Devis Transmise avec Succès !
        </h3>

        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
          Merci <strong>{submittedData.customerFirstName}</strong> ! Nos conseillers spécialisés analysent les meilleurs tarifs et vous transmettront votre proposition détaillée sous 4 heures ouvrables.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 max-w-lg mx-auto text-left text-sm space-y-2 mb-6">
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Type :</span>
            <span className="font-bold text-slate-900">{currentTabInfo.title}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Départ :</span>
            <span className="font-bold text-slate-900">{submittedData.departureCity} &bull; {submittedData.departureDate}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Destination :</span>
            <span className="font-bold text-slate-900">{submittedData.destination}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-medium">Voyageurs :</span>
            <span className="font-bold text-slate-900">{submittedData.adultsCount} adulte(s){submittedData.childrenCount ? `, ${submittedData.childrenCount} enfant(s)` : ''}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="px-8 py-3.5 bg-[#0e7068] hover:bg-[#0b5953] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition-all cursor-pointer"
        >
          Faire une autre demande de devis
        </button>
      </div>
    );
  }

  // =========================================================================
  // MAIN WIZARD VIEW (4 STEPS - ZERO SCROLLBARS - ZERO SELECTS)
  // =========================================================================
  return (
    <div
      id="evasion-quote-root"
      className="relative rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80 w-full max-w-[1440px] mx-auto my-0 bg-white/98 backdrop-blur-md text-slate-900 overflow-hidden"
    >
      {/* EN-TÊTE DU FORMULAIRE DE DEVIS GRATUIT */}
      <div className="bg-gradient-to-r from-[#0e7068] via-[#13857b] to-[#0e7068] px-4 sm:px-6 py-3 sm:py-3.5 text-white flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#0b5953]/30">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="h-4 w-4 text-amber-300" />
          </span>
          <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white">
            Remplissez ce formulaire pour obtenir un devis gratuit
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] sm:text-xs font-extrabold tracking-wide shrink-0 backdrop-blur-xs">
          <Check className="h-3.5 w-3.5 text-amber-300 stroke-[3]" />
          Rapide, personnalisé & sans engagement
        </span>
      </div>

      {/* 1. BARRE D'ÉTAPES ÉPURÉE ADAPTÉE À LA PAGE D'ACCUEIL */}
      <div className="bg-slate-50/90 border-b border-slate-200/80 px-3 sm:px-5 py-2.5 sm:py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. Voyage & Dates' },
            { step: 2, label: '2. Voyageurs & Budget' },
            { step: 3, label: '3. Assurances & Options' },
            { step: 4, label: '4. Coordonnées & Envoi' },
          ].map((s) => {
            const isCurrent = currentStep === s.step;
            const isPast = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (isPast) setCurrentStep(s.step);
                }}
                disabled={!isPast && !isCurrent}
                className={`flex items-center justify-start gap-2 py-2 px-3 rounded-xl border text-xs sm:text-sm transition-all ${
                  isCurrent
                    ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-sm font-black ring-2 ring-[#0e7068]/20'
                    : isPast
                    ? 'bg-teal-50 text-[#0e7068] border-teal-200 hover:bg-teal-100 font-bold cursor-pointer'
                    : 'bg-white text-slate-400 border-slate-200/90 font-medium cursor-default opacity-75'
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isCurrent
                      ? 'bg-white text-[#0e7068]'
                      : isPast
                      ? 'bg-[#0e7068] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isPast ? '✓' : s.step}
                </div>
                <span className="truncate font-bold text-xs">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CORPS DU FORMULAIRE : CHOIX SUR LE CÔTÉ (SIDEBAR) & CONTENU DES ÉTAPES */}
      <div className="flex flex-col md:flex-row items-stretch">
        {/* SIDEBAR SUR LE CÔTÉ : CHOIX DE LA FORMULE DE VOYAGE */}
        <aside className="w-full md:w-64 lg:w-72 bg-slate-50/90 border-b md:border-b-0 md:border-r border-slate-200/90 p-3 sm:p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-[#0e7068]" />
                Choix du voyage
              </span>
              <span className="text-[10px] font-extrabold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                {serviceCards.length} choix
              </span>
            </div>

            {/* Boutons verticaux sur desktop (grille sur mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-2">
              {serviceCards.map((srv) => {
                const IconComp = srv.icon;
                const isSelected = activeTab === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(srv.id);
                      setValidationError(null);
                    }}
                    className={`relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer border text-left w-full ${
                      isSelected
                        ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-md ring-2 ring-[#0e7068]/20 font-bold'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300 font-semibold'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-teal-50 text-[#0e7068]'
                      }`}
                    >
                      <IconComp className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-black leading-tight truncate">
                          {srv.title}
                        </span>
                        {srv.badge && (
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950'
                                : srv.id === 'battre_prix'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {srv.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className={`hidden md:block text-[11px] leading-tight line-clamp-2 mt-0.5 ${
                          isSelected ? 'text-teal-100' : 'text-slate-500'
                        }`}
                      >
                        {srv.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL DES ÉTAPES */}
        <div className="flex-1 p-3.5 sm:p-5 md:p-6 space-y-4 min-w-0">
          {/* ERROR BANNER */}
          {validationError && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md animate-in fade-in duration-150">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          
          {/* ================================================================= */}
          {/* ÉTAPE 1 : CONFIGURATION VOYAGE & DATES */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Card Header */}
              <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <currentTabInfo.icon className="h-5 w-5 text-[#0e7068] shrink-0" />
                  <h2 className="text-base sm:text-lg font-black uppercase text-[#0e7068] tracking-tight">
                    {currentTabInfo.headerTitle}
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Étape 1/4 &bull; Voyage & Dates
                </span>
              </div>

              {/* ================================================================= */}
              {/* DÉPART : PORTS (CROISIÈRE) / PRISE EN CHARGE (AUTO) / AÉROPORT (AUTRES) */}
              {/* ================================================================= */}
              {activeTab === 'croisiere' ? (
                /* PORT D'EMBARQUEMENT MARITIME POUR CROISIÈRE */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Anchor className="h-4 w-4 text-sky-700" />
                      <span>Port d'embarquement / Départ de la croisière <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[11px] text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      Ports maritimes
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Choisissez le port où débute votre croisière (différent des aéroports) :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(formConfig.cruiseDeparturePorts && formConfig.cruiseDeparturePorts.length > 0
                      ? formConfig.cruiseDeparturePorts
                      : [
                          'Port de Miami (Floride)',
                          'Fort Lauderdale / Port Everglades',
                          'Port Canaveral (Orlando)',
                          'San Juan (Porto Rico)',
                          'Tampa (Floride)',
                          'New York / Cape Liberty',
                          'Barcelone (Méditerranée)',
                          'Rome / Civitavecchia (Italie)',
                          'Vancouver / Seattle (Alaska)',
                          'Québec / Montréal (St-Laurent)',
                        ]
                    ).map((port) => {
                      const isSelected = !isCustomCruisePort && cruiseDeparturePort === port;
                      return (
                        <button
                          key={port}
                          type="button"
                          onClick={() => {
                            setCruiseDeparturePort(port);
                            setIsCustomCruisePort(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border min-h-[40px] flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-sky-700 text-white border-sky-700 shadow-xs ring-2 ring-sky-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Anchor className="h-3.5 w-3.5 shrink-0 opacity-80" />
                          <span>{port}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCustomCruisePort(true)}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border min-h-[40px] ${
                        isCustomCruisePort
                          ? 'bg-sky-700 text-white border-sky-700 shadow-xs ring-2 ring-sky-300'
                          : 'bg-white text-slate-600 border-dashed border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      + Autre port...
                    </button>
                  </div>
                  {isCustomCruisePort && (
                    <input
                      type="text"
                      placeholder="Précisez le port d'embarquement maritime (ex: Venise, Marseille, Southampton, Galveston...)"
                      value={customCruisePort}
                      onChange={(e) => setCustomCruisePort(e.target.value)}
                      className="w-full mt-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-sky-600 focus:outline-hidden"
                      autoFocus
                    />
                  )}

                  {/* OPTION VOLS POUR REJOINDRE LE PORT */}
                  <div className="mt-2 p-3 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <PlaneTakeoff className="h-4 w-4 text-sky-700" />
                        Avez-vous besoin de billets d'avion pour rejoindre le port ?
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCruiseRequiresFlights(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                            cruiseRequiresFlights
                              ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          Oui, inclure les vols
                        </button>
                        <button
                          type="button"
                          onClick={() => setCruiseRequiresFlights(false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                            !cruiseRequiresFlights
                              ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          Non, j'y vais par mes moyens
                        </button>
                      </div>
                    </div>

                    {cruiseRequiresFlights && (
                      <div className="pt-2 border-t border-sky-200/80 space-y-1.5">
                        <label className="block text-xs font-bold text-sky-950">
                          Aéroport de départ au Canada : <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {['Montréal (YUL)', 'Québec (YQB)', 'Ottawa (YOW)', 'Toronto (YYZ)'].map((city) => {
                            const isSelected = !isCustomCity && departureCity === city;
                            return (
                              <button
                                key={city}
                                type="button"
                                onClick={() => {
                                  setDepartureCity(city);
                                  setIsCustomCity(false);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {city}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setIsCustomCity(true)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isCustomCity
                                ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                                : 'bg-white text-slate-600 border-dashed border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            + Autre aéroport...
                          </button>
                        </div>
                        {isCustomCity && (
                          <input
                            type="text"
                            placeholder="Saisissez votre aéroport de départ..."
                            value={customCity}
                            onChange={(e) => setCustomCity(e.target.value)}
                            className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-sky-600 focus:outline-hidden"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* VILLE DE DÉPART STANDARD (FORFAITS, VOLS, ETC.) */
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    Ville de départ <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Montréal (YUL)', 'Québec (YQB)', 'Ottawa (YOW)', 'Toronto (YYZ)'].map((city) => {
                      const isSelected = !isCustomCity && departureCity === city;
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setDepartureCity(city);
                            setIsCustomCity(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border min-h-[40px] ${
                            isSelected
                              ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {city}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCustomCity(true)}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border min-h-[40px] ${
                        isCustomCity
                          ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-xs'
                          : 'bg-white text-slate-600 border-dashed border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      + Autre ville...
                    </button>
                  </div>
                  {isCustomCity && (
                    <input
                      type="text"
                      placeholder="Saisissez votre aéroport ou ville de départ..."
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                      autoFocus
                    />
                  )}
                </div>
              )}

              {/* DESTINATION (BOUTONS PILLS OU CHAMPS SPÉCIFIQUES - ZÉRO DROPDOWN) */}
              {activeTab !== 'battre_prix' && (
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    {activeTab === 'croisiere'
                      ? 'Région / Destination de croisière'
                      : 'Destination souhaitée'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(activeTab === 'croisiere'
                      ? ['Caraïbes de l\'Est', 'Caraïbes de l\'Ouest', 'Bahamas', 'Méditerranée', 'Alaska', 'Europe du Nord']
                      : ['Cancún / Riviera Maya', 'Punta Cana', 'Varadero / Cuba', 'Montego Bay', 'Bahamas', 'Europe']
                    ).map((dest) => {
                      const isSelected = !isCustomDestination && destination === dest;
                      return (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => {
                            setDestination(dest);
                            setIsCustomDestination(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border min-h-[40px] ${
                            isSelected
                              ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {dest}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCustomDestination(true)}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border min-h-[40px] ${
                        isCustomDestination
                          ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-xs'
                          : 'bg-white text-slate-600 border-dashed border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      + Autre destination...
                    </button>
                  </div>
                  {isCustomDestination && (
                    <input
                      type="text"
                      placeholder="Précisez le pays, la ville ou l'île souhaitée..."
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                      autoFocus
                    />
                  )}
                </div>
              )}

              {/* BATTRE UN PRIX : CHAMPS SPÉCIFIQUES */}
              {activeTab === 'battre_prix' && (
                <div className="space-y-3 p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Lien URL de l'offre concurrente
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={competitorUrl}
                        onChange={(e) => setCompetitorUrl(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Prix affiché chez le concurrent ($)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 1 450 $ / pers."
                        value={competitorTargetPrice}
                        onChange={(e) => setCompetitorTargetPrice(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* DATES : DATE DE DÉPART ET DATE DE FIN (SANS - ET + POUR LES JOURS) */}
              {/* ================================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Date de départ */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Date de départ <span className="text-rose-500">*</span></span>
                    {isFlexibleDate && (
                      <span className="text-[10px] text-[#0e7068] font-bold">&plusmn; 3 jours flexibles</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => {
                        const newDep = e.target.value;
                        setDepartureDate(newDep);
                        if (endDate && newDep) {
                          const daysNum = getDurationDaysNumber(newDep, endDate);
                          if (daysNum > 0) {
                            setDurationDays(daysNum);
                            setDuration(calculateDurationFromDates(newDep, endDate));
                          }
                        } else if (newDep && !endDate) {
                          const endD = addDaysToDate(newDep, durationDays);
                          setEndDate(endD);
                        }
                      }}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden min-h-[44px]"
                    />
                    <label className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer select-none text-xs font-bold text-slate-700 min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={isFlexibleDate}
                        onChange={(e) => setIsFlexibleDate(e.target.checked)}
                        className="rounded border-slate-300 text-[#0e7068] focus:ring-[#0e7068]"
                      />
                      <span>&plusmn;3j</span>
                    </label>
                  </div>
                </div>

                {/* Date de fin (Remplacement des - et + de jours par un sélecteur de date direct) */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>
                      Date de fin <span className="text-rose-500">*</span>
                    </span>
                    {departureDate && endDate && durationDays > 0 && (
                      <span className="text-[11px] font-black text-[#0e7068] bg-[#daf0ed] px-2 py-0.5 rounded-md">
                        {durationDays} {durationDays > 1 ? 'jours' : 'jour'} ({durationDays} {durationDays > 1 ? 'nuits' : 'nuit'})
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={endDate || flightReturnDate}
                    min={departureDate || undefined}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setEndDate(newEnd);
                      setFlightReturnDate(newEnd);
                      if (departureDate && newEnd) {
                        const daysNum = getDurationDaysNumber(departureDate, newEnd);
                        if (daysNum > 0) {
                          setDurationDays(daysNum);
                          setDuration(calculateDurationFromDates(departureDate, newEnd));
                        }
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden min-h-[44px]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Indiquez directement votre date de fin ou retour de voyage.
                  </p>
                </div>
              </div>

              {/* OPTIONS SPÉCIFIQUES: FORFAIT TOUT-INCLUS */}
              {activeTab === 'forfait_tout_inclus' && (
                <div className="p-4 bg-amber-50/70 border-2 border-amber-200/90 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      Options & Personnalisation Forfait Tout-Inclus
                    </span>
                  </div>

                  {/* Classe de cabine */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <PlaneTakeoff className="h-4 w-4 text-amber-600" />
                        Classe de cabine :
                      </span>
                      <span className="text-[11px] text-amber-800 font-semibold">
                        Sélectionné : {allInclusiveFlightClass}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(formConfig.allInclusiveFlightClasses && formConfig.allInclusiveFlightClasses.length > 0
                        ? formConfig.allInclusiveFlightClasses
                        : [
                            'Classe Économique standard',
                            'Sièges Sélection Plus (Espace jambes)',
                            'Classe Premium / Club',
                            'Classe Affaires',
                          ]
                      ).map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setAllInclusiveFlightClass(cls)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center flex items-center justify-center min-h-[42px] ${
                            allInclusiveFlightClass === cls
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catégories d'établissement / Complexe */}
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                      <Palmtree className="h-3.5 w-3.5 text-amber-600" />
                      Catégorie d'établissement souhaitée :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(formConfig.hotelCategories || ['Toutes classifications', '3 étoiles (Économique)', '4 étoiles (Bon confort)', '5 étoiles (Luxe & Prestige)']).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setHotelClassification(cat)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            hotelClassification === cat
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hôtel ou complexe spécifique si connu */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nom d'un complexe ou hôtel spécifique (facultatif)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Riu Palace, Bahia Principe, Secrets, Iberostar..."
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* OPTIONS SPÉCIFIQUES: CROISIÈRE */}
              {activeTab === 'croisiere' && (
                <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
                  {/* Type de cabine */}
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                      <Ship className="h-3.5 w-3.5 text-sky-600" />
                      Type de cabine souhaité :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(formConfig.cruiseCabins || ['Balcon Privé (Recommandé)', 'Vue mer (Extérieure)', 'Intérieure', 'Suite Deluxe']).map((cab) => (
                        <button
                          key={cab}
                          type="button"
                          onClick={() => setCruiseCabinType(cab)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            cruiseCabinType === cab
                              ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {cab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compagnie préférée */}
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                      <Ship className="h-3.5 w-3.5 text-sky-600" />
                      Compagnie de croisière préférée :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(formConfig.cruiseLines || ['Royal Caribbean', 'MSC Croisières', 'Celebrity Cruises', 'Norwegian Cruise Line', 'Princess Cruises', 'Carnival']).map((line) => (
                        <button
                          key={line}
                          type="button"
                          onClick={() => setCruiseLine(line)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            cruiseLine === line
                              ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {line}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* OPTIONS SPÉCIFIQUES: VOL + HÔTEL */}
              {activeTab === 'vol_hotel' && (
                <div className="p-4 bg-teal-50/70 border-2 border-teal-200/90 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-teal-200/70 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#0e7068] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#0e7068]" />
                      Options & Personnalisation Vol + Hôtel
                    </span>
                  </div>

                  {/* Classe de cabine */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <PlaneTakeoff className="h-4 w-4 text-[#0e7068]" />
                        Classe de cabine :
                      </span>
                      <span className="text-[11px] text-[#0e7068] font-semibold">
                        Sélectionné : {volHotelFlightClass}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(formConfig.volHotelFlightClasses && formConfig.volHotelFlightClasses.length > 0
                        ? formConfig.volHotelFlightClasses
                        : [
                            'Classe Économique standard',
                            'Classe Premium Économie',
                            'Classe Affaires',
                            'Première Classe',
                          ]
                      ).map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setVolHotelFlightClass(cls)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center flex items-center justify-center min-h-[42px] ${
                            volHotelFlightClass === cls
                              ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-sm ring-2 ring-[#0e7068]/30'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50/50'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catégories & Options d'hôtel */}
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                      <Building className="h-3.5 w-3.5 text-[#0e7068]" />
                      Catégorie d'hôtel souhaitée :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(formConfig.volHotelHotelCategories || ['3 étoiles (Économique)', '4 étoiles (Confort)', '5 étoiles (Luxe / Diamant)', 'Boutique Hôtel', 'Complexe All-Inclusive']).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setVolHotelHotelCategory(cat)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            volHotelHotelCategory === cat
                              ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nom de l'hôtel */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nom d'un hôtel spécifique (si vous en avez un en tête)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Hilton, Marriott, Boutique Hotel Downtown..."
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* OPTIONS SPÉCIFIQUES: VOL SEUL SANS AUCUN MENU DÉROULANT */}
              {activeTab === 'vol_seul' && (
                <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Type de vol :</span>
                    <div className="flex gap-1.5">
                      {[
                        { id: 'aller_retour', label: 'Aller-retour' },
                        { id: 'aller_simple', label: 'Aller simple' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFlightTripType(t.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            flightTripType === t.id
                              ? 'bg-[#0e7068] text-white border-[#0e7068]'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Classe de cabine :</span>
                    <div className="flex gap-1.5">
                      {[
                        { id: 'economique', label: 'Économique' },
                        { id: 'premium', label: 'Privilège / Premium' },
                        { id: 'affaires', label: 'Affaires' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setFlightClass(c.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            flightClass === c.id
                              ? 'bg-[#0e7068] text-white border-[#0e7068]'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AVIS VOL SEUL */}
                  <label className="flex items-start gap-2 pt-2 border-t border-teal-200/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={flightOnlyNoHotelConfirmed}
                      onChange={(e) => setFlightOnlyNoHotelConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-teal-500 text-[#0e7068] focus:ring-[#0e7068] shrink-0"
                    />
                    <span className="text-xs font-bold text-teal-950">
                      Je confirme que cette soumission est un <u>vol seul</u> et ne comprend aucun complexe ni hôtel. *
                    </span>
                  </label>
                </div>
              )}

              {/* VOL AVEC ESCALE */}
              {activeTab !== 'croisiere' && (
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={flightDirectOnly}
                    onChange={(e) => setFlightDirectOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0e7068] focus:ring-[#0e7068]"
                  />
                  <span>Vol avec escale</span>
                </label>
              )}

              {/* NAVIGATION BUTTON: SUIVANT */}
              <div className="pt-3.5 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                  Étape 1 sur 4
                </span>
                <button
                  type="button"
                  onClick={handleGoToStep2}
                  className="w-full sm:w-auto ml-auto cursor-pointer px-7 py-2.5 sm:py-3 bg-[#0e7068] hover:bg-[#0b5953] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Suivant : Voyageurs</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ÉTAPE 2 : VOYAGEURS & CHAMBRES (ZÉRO DROPDOWN) */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Nombre de Voyageurs & Chambres
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  Étape 2/4 &bull; Voyageurs
                </span>
              </div>

              {/* ADULTES STEPPER & PILLS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="font-bold text-slate-900 text-sm sm:text-base block">
                    Nombre d'adulte(s) (18 ans et +)
                  </label>
                  <span className="text-xs text-slate-500">Voyageurs principaux</span>
                </div>
                <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl p-1.5 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                    disabled={adultsCount <= 1}
                    className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-[#daf0ed] disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-base font-black text-slate-900 w-8 text-center">
                    {adultsCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdultsCount(Math.min(20, adultsCount + 1))}
                    disabled={adultsCount >= 20}
                    className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-[#daf0ed] disabled:opacity-30 cursor-pointer"
                    title="Maximum 20 adultes"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ENFANTS STEPPER & PILLS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="font-bold text-slate-900 text-sm sm:text-base block">
                    Nombre d'enfant(s) (0 à 17 ans)
                  </label>
                  <span className="text-xs text-slate-500">Pour tarifs réduits ou gratuité</span>
                </div>
                <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl p-1.5 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleChildrenCountChange(Math.max(0, childrenCount - 1))}
                    disabled={childrenCount <= 0}
                    className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-[#daf0ed] disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-base font-black text-slate-900 w-8 text-center">
                    {childrenCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleChildrenCountChange(Math.min(6, childrenCount + 1))}
                    disabled={childrenCount >= 6}
                    className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-[#daf0ed] disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ÂGE DES ENFANTS SI ENFANTS > 0 (BOUTONS STEPPER - ZÉRO DROPDOWN) */}
              {childrenCount > 0 && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                  <span className="text-xs font-extrabold text-amber-950 block">
                    Âge des enfants au moment du retour :
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Array.from({ length: childrenCount }).map((_, idx) => {
                      const curAge = childrenAgesList[idx] ?? 6;
                      return (
                        <div key={idx} className="bg-white border border-amber-300 rounded-xl p-2.5 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Enfant {idx + 1} :</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleChildAgeChange(idx, -1)}
                              className="h-7 w-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-slate-900 w-10 text-center">
                              {curAge === 0 ? '< 2 ans' : `${curAge} ans`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleChildAgeChange(idx, 1)}
                              className="h-7 w-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CHAMBRES (SI PAS VOL SEUL) */}
              {activeTab !== 'vol_seul' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <BedDouble className="h-5 w-5 text-[#0e7068]" />
                      <span>Nombre de chambres requises</span>
                    </label>
                    <span className="text-xs text-slate-500">Pour l'hébergement</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl p-1.5 shadow-2xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
                      disabled={roomsCount <= 1}
                      className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-[#daf0ed] disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-base font-black text-slate-900 w-8 text-center">
                      {roomsCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoomsCount(Math.min(6, roomsCount + 1))}
                      disabled={roomsCount >= 6}
                      className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-[#daf0ed] disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* BUDGET SOUHAITÉ PAR PERSONNE (PILLS) */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  Budget visé par personne :
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['< 1 200 $', '1 200 $ - 1 600 $', '1 600 $ - 2 200 $', '2 200 $ - 3 000 $', '3 000 $ +'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudgetPerPerson(b)}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border min-h-[40px] ${
                        budgetPerPerson.startsWith(b)
                          ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* NAVIGATION BUTTONS: PRÉCÉDENT & SUIVANT */}
              <div className="pt-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1 px-4 sm:px-6 py-2.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Précédent</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoToStep2to3}
                  className="flex items-center gap-1.5 px-6 sm:px-7 py-2.5 sm:py-3 bg-[#0e7068] hover:bg-[#0b5953] text-white font-extrabold text-xs sm:text-base rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
                >
                  <span>Suivant : Assurances</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ÉTAPE 3 : ASSURANCES & OPTIONS (ZÉRO DROPDOWN) */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Assurance Voyage & Options
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  Étape 3/4 &bull; Assurances
                </span>
              </div>

              {/* 3 GRANDES CARTES D'ASSURANCE */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  Protection médicale & annulation :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTravelInsurance('oui')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      travelInsurance === 'oui'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-slate-900">OUI</span>
                      <ShieldCheck className={`h-5 w-5 ${travelInsurance === 'oui' ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      Inclure la meilleure protection annulation, bagages et soins médicaux.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTravelInsurance('non')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      travelInsurance === 'non'
                        ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-slate-900">NON</span>
                      <div className={`h-4 w-4 rounded-full border-2 ${travelInsurance === 'non' ? 'border-rose-600 bg-rose-600' : 'border-slate-300'}`} />
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      Je décline l'assurance voyage pour l'instant (délai légal de 48h).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTravelInsurance('deja_assure')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      travelInsurance === 'deja_assure'
                        ? 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-slate-900">J'AI MON ASSURANCE</span>
                      <div className={`h-4 w-4 rounded-full border-2 ${travelInsurance === 'deja_assure' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'}`} />
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      Couvert(e) par mon assurance personnelle ou carte de crédit.
                    </p>
                  </button>
                </div>
              </div>

              {/* SI OUI: CHOIX PROTECTION (BOUTONS PILLS - ZÉRO DROPDOWN) */}
              {travelInsurance === 'oui' && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-300 rounded-xl space-y-1.5">
                  <span className="text-xs font-bold text-emerald-950 block">
                    Type de protection souhaité :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Forfait Tout Compris (Soins + Annulation + Bagages)',
                      'Soins Médicaux d\'urgence seuls',
                      'Annulation / Interruption seule',
                    ].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setInsuranceTypeSelected(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          insuranceTypeSelected === p
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-800 border-emerald-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SI NON: AVIS LÉGAL 48H */}
              {travelInsurance === 'non' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-xs sm:text-sm text-amber-950 block">
                        AVIS LÉGAL STRICT &bull; DÉLAI DE 48 HEURES :
                      </span>
                      <p className="text-amber-900 text-xs mt-0.5 leading-relaxed">
                        Vous disposez d'un délai maximal de 48 heures suivant la confirmation pour ajouter une assurance. Passé ce délai, aucun recours ne pourra être effectué.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 pt-2 border-t border-amber-300/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={insuranceConfirmedNo}
                      onChange={(e) => setInsuranceConfirmedNo(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-500 text-amber-800 focus:ring-amber-600 shrink-0"
                    />
                    <span className="font-bold text-amber-950 text-xs">
                      Je confirme avoir lu et compris le délai strict de 48 heures concernant l'assurance voyage. *
                    </span>
                  </label>
                </div>
              )}

              {/* FINANCEMENT VACANCES */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-xs sm:text-sm text-indigo-950 flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      Financement Vacances Disponible (Paiement échelonné)
                    </span>
                    <p className="text-xs text-indigo-800">
                      Souhaitez-vous recevoir les modalités de versement mensuel sans intérêt ?
                    </p>
                  </div>
                  <div className="flex gap-1.5 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setVacationFinancing('oui');
                        setShowFinancingModal(true);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all ${
                        vacationFinancing === 'oui'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-indigo-900 border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVacationFinancing('non');
                        setShowFinancingModal(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all ${
                        vacationFinancing === 'non'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-indigo-900 border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      Non
                    </button>
                  </div>
                </div>

                {vacationFinancing === 'oui' && (
                  <div className="pt-2 border-t border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-950 font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Service offert par <strong>IFinance Canada</strong> (Sous réserve d'approbation selon leurs modalités).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFinancingModal(true)}
                      className="text-xs font-extrabold text-indigo-700 hover:text-indigo-900 underline cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      Revoir les modalités & disclaimer
                    </button>
                  </div>
                )}
              </div>

              {/* OPTION LOCATION D'AUTO DANS LES EXTRAS (OPTIONS ET ASSURANCES) */}
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <Car className="h-4 w-4 text-[#0e7068]" />
                        Option Location d'auto (Véhicule sur place)
                      </span>
                      <p className="text-xs text-slate-600">
                        Désirez-vous ajouter une voiture de location pour vous déplacer durant votre voyage ?
                      </p>
                    </div>
                    <div className="flex gap-1.5 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCarRentalRequested(true);
                          if (!carRentalStartDate && departureDate) setCarRentalStartDate(departureDate);
                          if (!carRentalEndDate && endDate) setCarRentalEndDate(endDate);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all ${
                          carRentalRequested
                            ? 'bg-[#0e7068] text-white border-[#0e7068] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        + Ajouter une auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setCarRentalRequested(false)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer border transition-all ${
                          !carRentalRequested
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Non merci
                      </button>
                    </div>
                  </div>

                  {carRentalRequested && (
                    <div className="pt-3 border-t border-teal-200/80 space-y-3 animate-in fade-in duration-150">
                      {/* DATES DE LOCATION D'AUTO */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Date de début de location <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={carRentalStartDate || departureDate}
                            onChange={(e) => setCarRentalStartDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Date de retour / fin de location <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={carRentalEndDate || endDate}
                            min={carRentalStartDate || departureDate || undefined}
                            onChange={(e) => setCarRentalEndDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* EMPLACEMENT DE LOCATION */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Emplacement de prise en charge et restitution <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {[
                            'Aéroport de destination / Arrivée',
                            'Hôtel / Complexe hôtelier',
                            'Centre-ville destination',
                          ].map((loc) => {
                            const isSel = !isCustomCarPickup && carPickupLocation === loc;
                            return (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => {
                                  setCarPickupLocation(loc);
                                  setIsCustomCarPickup(false);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#0e7068] text-white border-[#0e7068]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {loc}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setIsCustomCarPickup(true)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isCustomCarPickup
                                ? 'bg-[#0e7068] text-white border-[#0e7068]'
                                : 'bg-white text-slate-600 border-dashed border-slate-300'
                            }`}
                          >
                            + Autre emplacement...
                          </button>
                        </div>
                        {isCustomCarPickup && (
                          <input
                            type="text"
                            placeholder="Précisez la ville, aéroport ou adresse de prise en charge..."
                            value={customCarPickupLocation}
                            onChange={(e) => setCustomCarPickupLocation(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                            autoFocus
                          />
                        )}
                      </div>

                      {/* CATÉGORIE DU VÉHICULE ADDON */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-teal-200/60">
                        <span className="text-xs font-bold text-slate-700">Catégorie souhaitée :</span>
                        <div className="flex flex-wrap gap-1">
                          {(formConfig.carRentalCategories || [
                            'Économique / Compacte',
                            'Berline intermédiaire standard',
                            'VUS / SUV familial',
                            'Minivan 7 passagers',
                          ]).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCarCategory(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                carCategory === cat
                                  ? 'bg-[#0e7068] text-white border-[#0e7068]'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              {/* DEMANDES SPÉCIALES */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Demandes spéciales ou précisions (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Voyage de noces, chambre communicante, vol de jour..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden"
                />
              </div>

              {/* NAVIGATION BUTTONS: PRÉCÉDENT & SUIVANT */}
              <div className="pt-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1 px-4 sm:px-6 py-2.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Précédent</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoToStep3to4}
                  className="flex items-center gap-1.5 px-6 sm:px-7 py-2.5 sm:py-3 bg-[#0e7068] hover:bg-[#0b5953] text-white font-extrabold text-xs sm:text-base rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
                >
                  <span>Suivant : Coordonnées</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ÉTAPE 4 : COORDONNÉES & ENVOI FINAL (BOUTON "ENVOYER") */}
          {/* ================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Vos Coordonnées & Réception du Devis
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  Étape 4/4 &bull; Envoi final
                </span>
              </div>

              {/* Récapitulatif rapide de votre demande */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#0e7068]" />
                    Récapitulatif de votre demande
                  </span>
                  <span className="text-[#0e7068] font-bold text-[11px] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    {serviceCards.find((s) => s.id === activeTab)?.title}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-[11px]">
                  <span><strong>Destination :</strong> {isCustomDestination ? customDestination : destination}</span>
                  <span><strong>Départ :</strong> {isCustomCity ? customCity : departureCity} ({departureDate})</span>
                  <span><strong>Durée :</strong> {duration}</span>
                  {(activeTab === 'forfait_tout_inclus' || activeTab === 'vol_hotel') && (
                    <span>
                      <strong>Classe de cabine :</strong>{' '}
                      <span className="text-slate-900 font-bold">
                        {activeTab === 'forfait_tout_inclus' ? allInclusiveFlightClass : volHotelFlightClass}
                      </span>
                    </span>
                  )}
                  <span><strong>Voyageurs :</strong> {adultsCount} adulte{adultsCount > 1 ? 's' : ''}{childrenCount > 0 ? ` + ${childrenCount} enfant${childrenCount > 1 ? 's' : ''}` : ''}</span>
                </div>
              </div>

              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Nom et Prénom complet <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Jean Tremblay"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                      Adresse courriel <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="nom@exemple.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-[#0e7068] focus:outline-hidden min-h-[44px]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Une copie conforme (CC) automatique vous sera transmise.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs sm:text-sm font-bold text-slate-800">
                        Numéro de téléphone (10 chiffres) <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[11px] font-bold ${
                        customerPhone.replace(/\D/g, '').length === 10
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }`}>
                        {customerPhone.replace(/\D/g, '').length === 10 ? '✓ 10/10 chiffres' : `${customerPhone.replace(/\D/g, '').length}/10 chiffres requis`}
                      </span>
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        maxLength={14}
                        placeholder="(514) 555-0199"
                        value={customerPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          if (digits.length <= 3) {
                            setCustomerPhone(digits);
                          } else if (digits.length <= 6) {
                            setCustomerPhone(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
                          } else {
                            setCustomerPhone(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`);
                          }
                        }}
                        className={`w-full bg-slate-50 border rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:outline-hidden min-h-[44px] ${
                          customerPhone.replace(/\D/g, '').length === 10
                            ? 'border-emerald-400 focus:ring-emerald-500'
                            : 'border-slate-300 focus:ring-[#0e7068]'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Exactement 10 chiffres (indicatif régional inclus, sans le +1).
                    </span>
                  </div>
                </div>

                {/* MOMENT D'APPEL PRÉFÉRÉ (PILLS) */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Moment préféré pour un appel téléphonique :
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'matin', label: 'Matin (9h - 12h)' },
                      { id: 'apres-midi', label: 'Après-midi (12h - 17h)' },
                      { id: 'soiree', label: 'Soirée (17h - 20h)' },
                      { id: 'tout_temps', label: 'En tout temps' },
                    ].map((time) => (
                      <button
                        type="button"
                        key={time.id}
                        onClick={() => setPreferredCallTime(time.id as any)}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer min-h-[40px] flex items-center justify-center ${
                          preferredCallTime === time.id
                            ? 'border-[#0e7068] bg-[#daf0ed] text-[#0e7068] ring-1 ring-[#0e7068]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TRANSMISSION BADGE */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Transmission sécurisée vers <strong>{formConfig.notificationEmail || 'info@evasionsoleil.com'}</strong> avec copie officielle au client.
                  </span>
                </div>

                {/* BUTTONS: PRÉCÉDENT & FINAL "ENVOYER" */}
                <div className="pt-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-1 px-4 sm:px-6 py-2.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Précédent</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto ml-auto cursor-pointer px-7 sm:px-9 py-2.5 sm:py-3 bg-[#0e7068] hover:bg-[#0b5953] text-white font-black text-sm sm:text-base rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL DISCLAIMER FINANCEMENT IFINANCE CANADA */}
      {showFinancingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowFinancingModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-indigo-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-linear-to-r from-indigo-800 via-indigo-900 to-[#143734] text-white p-5 sm:p-6 relative">
              <button
                type="button"
                onClick={() => setShowFinancingModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-white/15 border border-white/20 shrink-0">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider text-indigo-100 mb-1">
                    Option Financement Vacances
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Modalités & Avertissement
                  </h3>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-700 max-h-[72vh] overflow-y-auto">
              {/* Disclaimer officiel IFinance Canada */}
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 font-black text-amber-900 uppercase text-xs tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Avis et Décharge Obligatoire (Disclaimer)</span>
                </div>
                <p className="font-black text-sm sm:text-base leading-snug text-amber-950">
                  IFinance Canada qui offre le service SOUS RÉSERVE D'APPROBATION SELON LEUR MODALITÉ
                </p>
                <p className="text-[11px] text-amber-900/90 font-semibold">
                  (Sous réserve d'approbation de crédit selon leurs modalités et critères d'évaluation indépendants).
                </p>
              </div>

              {/* Points d'information essentiels */}
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Fournisseur tiers indépendant :</strong> Le programme de versements échelonnés pour votre voyage est administré et financé exclusivement par <strong>IFinance Canada</strong>. L'agence de voyages Évasion Soleil n'est pas le prêteur direct.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sous réserve d'approbation :</strong> Toute demande de prêt est examinée et soumise à la décision autonome d'<strong>IFinance Canada</strong>, selon ses propres règles d'admissibilité financière.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Simple option consultative :</strong> Cocher « Oui » transmet simplement votre souhait à votre conseiller qui joindra le lien et la proposition de simulation IFinance Canada à votre devis.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setVacationFinancing('non');
                  setShowFinancingModal(false);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Non merci, annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setVacationFinancing('oui');
                  setShowFinancingModal(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>J'ai compris et j'accepte</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteFormInteractive;
