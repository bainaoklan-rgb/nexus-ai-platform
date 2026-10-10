import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowRight,
  Video,
  Type,
  FileText,
  Hash,
  Lightbulb,
  UserCheck,
  Sparkles,
  Calendar,
  Crown,
  Shield,
  Cloud,
  Lock,
  Check,
  ChevronDown,
  ShoppingBag,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged as onFirebaseAuthChanged } from 'firebase/auth';
import {
  auth,
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  ensureUserDocuments,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  CREATOR_TOOLS,
  CreatorTool,
  ToolCategory,
  DEFAULT_PLANS,
  INITIAL_DIGITAL_PRODUCTS,
  DEFAULT_LEGAL_TEXTS,
  OFFICIAL_NUBANK_PIX_LINKS,
  formatCurrencyBRL,
} from './data/catalog';
import { Navbar, AppRoute, ChatConversationSummary } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ToolRunnerModal } from './components/ToolRunnerModal';
import { PixCheckoutModal, CheckoutItem } from './components/PixCheckoutModal';
import { AmbientParticleCanvas } from './components/AmbientBackdrop';
import { HolographicRunners3D } from './components/HolographicRunners3D';
import { NexusRobotAssistant } from './components/NexusRobotAssistant';
import { DashboardView } from './views/DashboardView';
import { NexusLabView } from './views/NexusLabView';
import { ChatView } from './views/ChatView';
import { NotificationsView } from './views/NotificationsView';
import { GoogleStoreView } from './views/GoogleStoreView';
import { AdminView } from './views/AdminView';
import {
  ROUTE_SEO_MAP,
  resolveRouteFromPathname,
  buildCanonicalUrl,
  buildStructuredDataJsonLd,
} from './utils/seoConfig';
import { motion } from 'motion/react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const initial = resolveRouteFromPathname(window.location.pathname);
      return initial === 'projects' ? 'dashboard' : initial;
    }
    return 'home';
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userDoc, setUserDoc] = useState<Record<string, any> | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, any> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [appSettings, setAppSettings] = useState<Record<string, any> | null>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>(INITIAL_DIGITAL_PRODUCTS);

  // Search & category filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('Todas');

  // Modals, NEXUS LAB & Checkout state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<CreatorTool | null>(null);
  const [labInitialTool, setLabInitialTool] = useState<CreatorTool | null>(null);
  const [labInitialPrompt, setLabInitialPrompt] = useState<string>('');
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<'pro' | 'studio' | null>(null);
  const [dashboardInitialTab, setDashboardInitialTab] = useState<
    'overview' | 'projects' | 'history' | 'orders' | 'support' | 'settings'
  >(() => {
    if (typeof window !== 'undefined' && resolveRouteFromPathname(window.location.pathname) === 'projects') {
      return 'projects';
    }
    return 'overview';
  });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Sidebar & ChatGPT-style conversation state
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Real-Time Updates & Automatic Client Notifications state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [firestoreReadIds, setFirestoreReadIds] = useState<string[]>([]);
  const [robotAlertsEnabled, setRobotAlertsEnabled] = useState<boolean>(true);

  // Listen to browser back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = resolveRouteFromPathname(window.location.pathname);
      if (nextRoute === 'projects') {
        setDashboardInitialTab('projects');
        setCurrentRoute('dashboard');
      } else {
        setCurrentRoute(nextRoute);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize clean URL path, document title, meta description, robots, canonical URL, OpenGraph & JSON-LD
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seoMeta = ROUTE_SEO_MAP[currentRoute] || ROUTE_SEO_MAP.home;

    // Update clean browser URL path without reloading
    if (window.location.pathname !== seoMeta.path) {
      window.history.pushState({ route: currentRoute }, seoMeta.title, seoMeta.path);
    }

    // 1. Document Title
    document.title = seoMeta.title;

    // 2. Meta Description & Robots
    const setMetaContent = (selector: string, attrName: string, attrValue: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaContent('meta[name="description"]', 'name', 'description', seoMeta.description);
    setMetaContent(
      'meta[name="robots"]',
      'name',
      'robots',
      seoMeta.indexable
        ? 'index, follow, max-image-preview:large, max-snippet:-1'
        : 'noindex, nofollow, noarchive'
    );

    // 3. Canonical URL & OpenGraph / Twitter
    const origin = window.location.origin;
    const canonicalHref = buildCanonicalUrl(origin, currentRoute);

    let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalHref);

    setMetaContent('meta[property="og:title"]', 'property', 'og:title', seoMeta.title);
    setMetaContent('meta[property="og:description"]', 'property', 'og:description', seoMeta.description);
    setMetaContent('meta[property="og:url"]', 'property', 'og:url', canonicalHref);
    setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', seoMeta.title);
    setMetaContent('meta[name="twitter:description"]', 'name', 'twitter:description', seoMeta.description);

    // 4. Schema.org Structured Data (JSON-LD)
    const jsonLdEl = document.getElementById('nexus-jsonld');
    if (jsonLdEl) {
      const supportEmail = appSettings?.supportEmail || DEFAULT_LEGAL_TEXTS.supportEmail;
      jsonLdEl.textContent = JSON.stringify(buildStructuredDataJsonLd(origin, supportEmail));
    }
  }, [currentRoute, appSettings?.supportEmail]);

  // Track authentication state
  useEffect(() => {
    const unsub = onFirebaseAuthChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        try {
          await ensureUserDocuments(firebaseUser);
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/admin/verify-status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const adminInfo = await res.json();
            setIsAdmin(Boolean(adminInfo.isAdmin));
          }
        } catch {
          setIsAdmin(false);
        }
      } else {
        setUserDoc(null);
        setUserProfile(null);
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  // Listen to authenticated user's own profile & global settings
  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'app_settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          setAppSettings(snap.data());
        }
      },
      () => {}
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const activeItems = snap.docs
          .map((d) => d.data())
          .filter((item) => item.active === true);
        if (activeItems.length > 0) {
          setStoreProducts(activeItems);
        } else {
          setStoreProducts(INITIAL_DIGITAL_PRODUCTS);
        }
      },
      () => {}
    );

    const qAnnouncements = query(
      collection(db, 'announcements'),
      where('status', '==', 'published')
    );
    const unsubAnnouncements = onSnapshot(
      qAnnouncements,
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setAnnouncements(list);
      },
      () => {}
    );

    return () => {
      unsubSettings();
      unsubProducts();
      unsubAnnouncements();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setUserNotifications([]);
      setFirestoreReadIds([]);
      return;
    }
    const unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) setUserDoc(snap.data());
      },
      () => {}
    );
    const unsubProfile = onSnapshot(
      doc(db, 'user_profiles', user.uid),
      (snap) => {
        if (snap.exists()) {
          const prof = snap.data();
          setUserProfile(prof);
          if (typeof prof.robotAlertsEnabled === 'boolean') {
            setRobotAlertsEnabled(prof.robotAlertsEnabled);
          }
        }
      },
      () => {}
    );

    // Real-time persistent chat conversations for sidebar history
    const qConvs = query(
      collection(db, 'chat_conversations'),
      where('userId', '==', user.uid)
    );
    const unsubConvs = onSnapshot(
      qConvs,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChatConversationSummary);
        list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        setConversations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'chat_conversations')
    );

    // Real-time automatic internal client notifications
    const qNotifs = query(
      collection(db, 'user_notifications'),
      where('userId', '==', user.uid)
    );
    const unsubNotifs = onSnapshot(
      qNotifs,
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setUserNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'user_notifications')
    );

    // Real-time read receipts for announcements
    const qReads = query(
      collection(db, 'notification_reads'),
      where('userId', '==', user.uid)
    );
    const unsubReads = onSnapshot(
      qReads,
      (snap) => {
        setFirestoreReadIds(snap.docs.map((d) => d.data().announcementId));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notification_reads')
    );

    // Monitor today's usage quota to trigger automatic non-duplicated limit warning
    const todayKey = new Date().toISOString().slice(0, 10);
    const quotaId = `${user.uid}_${todayKey}`;
    const unsubQuota = onSnapshot(
      doc(db, 'usage_quotas', quotaId),
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const used = Number(data.usedCount) || 0;
        const limit = Number(data.dailyLimit) || 5;
        if (used >= Math.max(1, limit - 1)) {
          const notifId = `notif_limit_${user.uid}_${todayKey}`.slice(0, 128);
          try {
            await setDoc(
              doc(db, 'user_notifications', notifId),
              {
                id: notifId,
                userId: user.uid,
                title:
                  used >= limit
                    ? 'Limite diário de IA atingido hoje'
                    : 'Seu limite diário de IA está próximo do fim',
                message:
                  used >= limit
                    ? `Você utilizou ${used}/${limit} gerações diárias do seu plano hoje. Faça upgrade para o Plano Pro ou Studio para liberar mais execuções imediatas.`
                    : `Você já utilizou ${used} de ${limit} gerações diárias disponíveis hoje no seu plano.`,
                category: 'plano',
                read: false,
                eventKey: `limit_${todayKey}`,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // Ignore if already created
          }
        }
      },
      () => {}
    );

    return () => {
      unsubUser();
      unsubProfile();
      unsubConvs();
      unsubNotifs();
      unsubReads();
      unsubQuota();
    };
  }, [user]);

  // Dynamic plans based on app_settings persisted in Firestore
  const activePlans = useMemo(() => {
    return DEFAULT_PLANS.map((plan) => {
      if (plan.id === 'free') {
        const limit = appSettings?.freeDailyLimit || plan.dailyLimit;
        return {
          ...plan,
          priceCents: 0,
          dailyLimit: Number(limit),
          pixPaymentLink: '',
          ctaLabel: 'Começar Grátis',
          features: [
            `${limit} execuções de ferramentas de IA por dia (limite no servidor)`,
            ...plan.features.slice(1),
          ],
        };
      }
      if (plan.id === 'pro') {
        const limit = appSettings?.proDailyLimit || plan.dailyLimit;
        const price = appSettings?.proPriceCents || plan.priceCents;
        const pixLink =
          appSettings?.proPixLink || plan.pixPaymentLink || OFFICIAL_NUBANK_PIX_LINKS.pro;
        return {
          ...plan,
          priceCents: Number(price),
          dailyLimit: Number(limit),
          pixPaymentLink: String(pixLink).trim(),
          ctaLabel: 'Assinar Pro',
          features: [
            `${limit} execuções de ferramentas de IA por dia`,
            ...plan.features.slice(1),
          ],
        };
      }
      if (plan.id === 'studio') {
        const limit = appSettings?.studioDailyLimit || plan.dailyLimit;
        const price = appSettings?.studioPriceCents || plan.priceCents;
        const pixLink =
          appSettings?.studioPixLink || plan.pixPaymentLink || OFFICIAL_NUBANK_PIX_LINKS.studio;
        return {
          ...plan,
          priceCents: Number(price),
          dailyLimit: Number(limit),
          pixPaymentLink: String(pixLink).trim(),
          ctaLabel: 'Assinar Studio',
          features: [
            `${limit} execuções de ferramentas de IA por dia`,
            ...plan.features.slice(1),
          ],
        };
      }
      return plan;
    });
  }, [appSettings]);

  const filteredTools = useMemo(() => {
    return CREATOR_TOOLS.filter((tool) => {
      const matchesCategory =
        selectedCategory === 'Todas' || tool.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const renderToolIcon = (iconName: CreatorTool['iconName']) => {
    switch (iconName) {
      case 'video':
        return <Video className="w-5 h-5 text-purple-300" />;
      case 'type':
        return <Type className="w-5 h-5 text-cyan-300" />;
      case 'file-text':
        return <FileText className="w-5 h-5 text-purple-300" />;
      case 'hash':
        return <Hash className="w-5 h-5 text-emerald-300" />;
      case 'lightbulb':
        return <Lightbulb className="w-5 h-5 text-purple-300" />;
      case 'user-check':
        return <UserCheck className="w-5 h-5 text-cyan-300" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-purple-300" />;
      case 'calendar':
        return <Calendar className="w-5 h-5 text-cyan-300" />;
      default:
        return <ImageIcon className="w-5 h-5 text-purple-300" />;
    }
  };

  // Filter announcements relevant to user's plan
  const currentUserPlanId = (userDoc?.planId || 'free') as 'free' | 'pro' | 'studio';
  const visibleAnnouncements = useMemo(() => {
    return announcements.filter(
      (a) => !a.targetAudience || a.targetAudience === 'all' || a.targetAudience === currentUserPlanId
    );
  }, [announcements, currentUserPlanId]);

  const readAnnouncementIdsSet = useMemo(() => {
    return new Set<string>(firestoreReadIds);
  }, [firestoreReadIds]);

  const unreadTotalCount = useMemo(() => {
    const unreadAnn = visibleAnnouncements.filter(
      (a) => !readAnnouncementIdsSet.has(a.id)
    ).length;
    const unreadPersonal = userNotifications.filter((n) => !n.read).length;
    return unreadAnn + unreadPersonal;
  }, [visibleAnnouncements, readAnnouncementIdsSet, userNotifications]);

  const publishedAnnouncementsSummary = useMemo(() => {
    if (visibleAnnouncements.length === 0) return '';
    return visibleAnnouncements
      .slice(0, 5)
      .map((a) => `- [${a.category}] ${a.title}: ${a.message}`)
      .join('\n');
  }, [visibleAnnouncements]);

  const handleToggleRobotAlerts = async (enabled: boolean) => {
    setRobotAlertsEnabled(enabled);
    if (!user) return;
    try {
      await setDoc(
        doc(db, 'user_profiles', user.uid),
        {
          uid: user.uid,
          email: (user.email || '').slice(0, 150),
          phone: (userProfile?.phone || '').slice(0, 40),
          niche: (userProfile?.niche || 'Criador de Conteúdo').slice(0, 80),
          bio: (userProfile?.bio || '').slice(0, 500),
          robotAlertsEnabled: enabled,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_profiles/${user.uid}`);
    }
  };

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    if (!user || !newTitle.trim()) return;
    const target = conversations.find((c) => c.id === convId);
    if (!target) return;
    try {
      await updateDoc(doc(db, 'chat_conversations', convId), {
        userId: user.uid,
        title: newTitle.trim().slice(0, 120),
        lastMessagePreview: target.lastMessagePreview || 'Conversa no NEXUS AI',
        messageCount: target.messageCount || 1,
        createdAt: target.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chat_conversations/${convId}`);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!user) return;
    try {
      const msgsSnap = await getDocs(
        collection(db, 'chat_conversations', convId, 'messages')
      );
      for (const mDoc of msgsSnap.docs) {
        await deleteDoc(doc(db, 'chat_conversations', convId, 'messages', mDoc.id));
      }
      await deleteDoc(doc(db, 'chat_conversations', convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chat_conversations/${convId}`);
    }
  };

  const handleStartFree = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveConversationId(null);
    setCurrentRoute('chat');
  };

  const openNubankPaymentUrl = (url: string) => {
    if (!url || !url.startsWith('https://')) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleSelectPlanCheckout = (plan: (typeof activePlans)[0]) => {
    if (plan.id === 'free') {
      handleStartFree();
      return;
    }
    if (!user) {
      setPendingPlanId(plan.id as 'pro' | 'studio');
      setIsAuthModalOpen(true);
      return;
    }

    const targetPixLink =
      plan.pixPaymentLink ||
      (plan.id === 'studio'
        ? OFFICIAL_NUBANK_PIX_LINKS.studio
        : OFFICIAL_NUBANK_PIX_LINKS.pro);

    if (user.emailVerified && targetPixLink) {
      openNubankPaymentUrl(targetPixLink);
    }

    setCheckoutItem({
      itemType: 'plan',
      itemId: plan.id,
      title: `Plano ${plan.name} — Assinatura Mensal`,
      priceCents: plan.priceCents,
      description: `${plan.dailyLimit} execuções de ferramentas de IA por dia.`,
      pixPaymentLink: targetPixLink,
      autoCreateOrder: true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentRoute('checkout');
  };

  const handleSelectProductCheckout = (prod: any) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutItem({
      itemType: 'product',
      itemId: prod.id,
      title: prod.title,
      priceCents: prod.priceCents,
      description: `Produto Digital (${prod.fileFormat}) — Entrega liberada após confirmação do pagamento.`,
      pixPaymentLink: appSettings?.pixKey || appSettings?.proPixLink || OFFICIAL_NUBANK_PIX_LINKS.pro,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentRoute('checkout');
  };

  const faqs = [
    {
      q: 'As ferramentas de IA usam modelos reais ou respostas simuladas?',
      a: 'Todas as 8 ferramentas disponíveis executam chamadas reais ao Google Gemini AI diretamente no servidor backend do NEXUS AI STUDIO, protegendo a chave de API e mantendo o subsistema de IA separado do sistema de pagamentos.',
    },
    {
      q: 'Como funcionam os botões Assinar Pro e Assinar Studio com Pix Nubank?',
      a: 'Ao clicar em Assinar Pro (R$ 19,90) ou Assinar Studio (R$ 39,90), a plataforma cria um pedido real no Cloud Firestore com status awaiting_payment (Aguardando pagamento) e abre o link de cobrança Pix correspondente do Nubank. Os recursos premium são liberados exclusivamente depois que o administrador confirma o recebimento real no servidor (sem aprovação automática e sem renovação automática por link).',
    },
    {
      q: 'Meus projetos e roteiros ficam salvos se eu trocar de celular ou computador?',
      a: 'Sim. Todos os projetos salvos, histórico de uso, pedidos e pagamentos ficam vinculados ao seu identificador único no Firebase Firestore, com regras de segurança que impedem acesso por terceiros.',
    },
    {
      q: 'Posso usar o NEXUS AI STUDIO pelo celular Android?',
      a: 'Sim. Toda a interface foi projetada com áreas de toque otimizadas, navegação inferior rápida para dispositivos móveis e carregamento leve.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#03050D] text-slate-100 relative overflow-x-hidden">
      <AmbientParticleCanvas />

      <Navbar
        currentRoute={currentRoute}
        onNavigate={(r) => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (r === 'projects') {
            setDashboardInitialTab('projects');
            setCurrentRoute('dashboard');
          } else {
            setCurrentRoute(r);
          }
        }}
        user={user}
        userPlanId={currentUserPlanId}
        isAdmin={isAdmin}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(convId) => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveConversationId(convId);
          setCurrentRoute('chat');
        }}
        onNewConversation={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveConversationId(null);
          setCurrentRoute('chat');
        }}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        unreadNotificationsCount={unreadTotalCount}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 relative z-10">
          {/* ROUTE: CHAT (CHATGPT-STYLE CONVERSATIONAL AI INTERFACE) */}
          {currentRoute === 'chat' && (
            <ChatView
              user={user}
              userDoc={userDoc}
              appSettings={appSettings}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => setActiveConversationId(id)}
              onRequireAuth={() => setIsAuthModalOpen(true)}
              onNavigatePlans={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setCurrentRoute('plans');
              }}
              onNavigateLab={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setCurrentRoute('lab');
              }}
              onNavigateTools={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setCurrentRoute('tools');
              }}
              publishedAnnouncementsSummary={publishedAnnouncementsSummary}
            />
          )}

          {/* ROUTE: NOTIFICATIONS & REAL-TIME UPDATES CENTER */}
          {currentRoute === 'notifications' && (
            <NotificationsView
              user={user}
              userPlanId={currentUserPlanId}
              announcements={visibleAnnouncements}
              readAnnouncementIds={readAnnouncementIdsSet}
              userNotifications={userNotifications}
              robotAlertsEnabled={robotAlertsEnabled}
              onToggleRobotAlerts={handleToggleRobotAlerts}
              onRequireAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {/* ROUTE: HOME (CINEMATIC 3D OPENING + STREAMLINED CREATOR STUDIO) */}
        {currentRoute === 'home' && (
          <div>
            {/* 1. Real 3D Skeletal Running Holographic Opening */}
            <HolographicRunners3D
              isAuthenticated={Boolean(user)}
              onStartCreating={handleStartFree}
              onExploreTools={() => {
                const el = document.getElementById('estudio-ferramentas');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setCurrentRoute('tools');
                }
              }}
              onSkipIntro={() => {
                const el = document.getElementById('estudio-ferramentas');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

            {/* 2. Streamlined Studio Workspace & Tools Section */}
            <section
              id="estudio-ferramentas"
              className="relative py-12 sm:py-16 px-4 sm:px-8 border-b border-slate-800/80"
            >
              <div className="max-w-6xl mx-auto">
                {/* Central Command Bar: "O que vamos criar hoje?" */}
                <div className="p-5 sm:p-6 nexus-glass rounded-2xl border border-cyan-500/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <label
                        htmlFor="central-command-input"
                        className="text-base sm:text-lg font-bold text-white block"
                      >
                        O que vamos criar hoje?
                      </label>
                      <p className="text-xs text-slate-400">
                        Pesquise uma ferramenta ou digite seu tema para abrir diretamente no NEXUS
                        LAB.
                      </p>
                    </div>

                    <div className="flex-1 max-w-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="relative flex-1 flex items-center bg-[#050814] border border-slate-700/90 focus-within:border-cyan-400 rounded-xl px-3.5 py-2">
                        <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-2.5" />
                        <input
                          id="central-command-input"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Ex: roteiro para Reels, títulos virais, biografia..."
                          className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none min-h-[28px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetTool =
                            filteredTools.length > 0 ? filteredTools[0] : CREATOR_TOOLS[0];
                          setLabInitialTool(targetTool);
                          setLabInitialPrompt(searchQuery.trim());
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setCurrentRoute('lab');
                        }}
                        className="nexus-btn-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 min-h-[44px] flex items-center justify-center gap-2"
                      >
                        <span>Abrir no NEXUS LAB</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Clean Category Selector */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mt-5 pt-5 border-t border-slate-800/80">
                    {(
                      [
                        { id: 'Todas', desc: 'Todas as 8 ferramentas' },
                        { id: 'Texto', desc: 'Títulos, descrições, hashtags e bio' },
                        { id: 'Vídeo', desc: 'Roteiros com gancho e retenção' },
                        { id: 'Produtividade', desc: 'Assistente e organizador de lotes' },
                        { id: 'Imagem', desc: 'Direção visual e status transparente' },
                      ] as { id: ToolCategory; desc: string }[]
                    ).map((catItem) => {
                      const active = selectedCategory === catItem.id;
                      return (
                        <button
                          key={catItem.id}
                          type="button"
                          onClick={() => setSelectedCategory(catItem.id)}
                          className={`text-left p-3 rounded-xl transition-all min-h-[60px] flex flex-col justify-between ${
                            active
                              ? 'bg-gradient-to-r from-purple-600/35 to-cyan-500/25 border border-cyan-400 text-white'
                              : 'bg-[#050814]/90 border border-slate-800/90 text-slate-300 hover:border-purple-500/50 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{catItem.id}</span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-75" />
                          </div>
                          <span className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                            {catItem.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Interactive Tools Grid + Featured Plan Spotlight */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedCategory === 'Imagem' ? (
                      <div className="col-span-full p-6 nexus-glass rounded-xl text-left space-y-3">
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                          <AlertCircle className="w-4 h-4" />
                          <span>Status Transparente da Categoria Imagem</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          Geração Direta de Imagens Pendente de Chave Visual Dedicada
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Não utilizamos imagens falsas nem simulamos geração de imagens. Enquanto a
                          integração visual dedicada não estiver ativada, utilize nosso{' '}
                          <strong className="text-white">Assistente para Criadores</strong> ou{' '}
                          <strong className="text-white">Gerador de Títulos</strong> para criar textos
                          de capa (Thumbnails) e direções visuais.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedCategory('Todas')}
                          className="nexus-btn-primary px-4 py-2 text-xs font-semibold rounded-lg"
                        >
                          Ver todas as 8 ferramentas reais ativas
                        </button>
                      </div>
                    ) : (
                      filteredTools.map((tool, index) => (
                        <motion.div
                          key={tool.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: index * 0.03 }}
                          className="nexus-glass-card p-5 rounded-xl flex flex-col justify-between min-h-[192px]"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-500/25 border border-purple-500/40 flex items-center justify-center">
                                {renderToolIcon(tool.iconName)}
                              </div>
                              <span className="text-[11px] text-slate-400">{tool.category}</span>
                            </div>
                            <h3 className="text-sm font-bold text-white">{tool.name}</h3>
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                              {tool.shortDescription}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTool(tool)}
                              className="nexus-btn-primary flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[38px]"
                            >
                              <span>Usar ferramenta</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLabInitialTool(tool);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                setCurrentRoute('lab');
                              }}
                              className="nexus-btn-secondary py-2 px-2.5 rounded-lg text-xs font-medium min-h-[38px]"
                              title="Abrir no NEXUS LAB"
                            >
                              Lab
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Featured Pro Plan Spotlight Card */}
                  <div className="lg:col-span-3 p-6 nexus-glass rounded-xl border border-purple-500/40 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-purple-300" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Desbloqueie todo o potencial</h3>
                      <p className="text-sm font-medium text-cyan-200">
                        Plano Pro ({formatCurrencyBRL(activePlans[1].priceCents)}) e Studio (
                        {formatCurrencyBRL(activePlans[2].priceCents)})
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Aumente seu limite para até 100 ou 500 execuções diárias com Gemini AI no
                        servidor e organize toda a sua linha de produção.
                      </p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-purple-500/20 space-y-3">
                      <div className="text-xs text-slate-400">
                        Pagamento Pix manual seguro · Ativação verificada no servidor
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setCurrentRoute('plans');
                        }}
                        className="nexus-btn-primary w-full py-2.5 px-4 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 min-h-[42px]"
                      >
                        <span>Ver Planos</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trust Strip */}
                <div className="max-w-4xl mx-auto mt-10 pt-6 border-t border-slate-800/70 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Sua conta protegida com Firebase Auth</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Seus projetos salvos no Cloud Firestore</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Planos transparentes sem cobrança oculta</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Advantages Section */}
            <section className="py-14 px-4 sm:px-8 border-b border-slate-800/80 bg-[#070A18]">
              <div className="max-w-6xl mx-auto">
                <div className="max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Por que criadores escolhem o NEXUS AI STUDIO
                  </h2>
                  <p className="text-sm text-slate-400 mt-2">
                    Uma arquitetura completa para substituir dezenas de abas soltas por um fluxo
                    único de roteirização, otimização e gestão.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
                  <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-2">
                    <div className="text-xs font-semibold text-purple-400">01. Velocidade Real</div>
                    <h3 className="text-base font-bold text-white">
                      Da ideia ao roteiro gravável em menos de 60 segundos
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nossos prompts de sistema são calibrados especificamente para retenção
                      audiovisual no Brasil, entregando ganchos de 3 segundos e blocos prontos para
                      teleprompter.
                    </p>
                  </div>

                  <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-2">
                    <div className="text-xs font-semibold text-cyan-400">
                      02. Segurança Server-Side
                    </div>
                    <h3 className="text-base font-bold text-white">
                      Banco de dados persistente com isolamento de dados
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cada pauta, roteiro e histórico de geração fica salvo na sua conta do Cloud
                      Firestore com regras de segurança que protegem sua propriedade intelectual.
                    </p>
                  </div>

                  <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-2">
                    <div className="text-xs font-semibold text-purple-400">
                      03. Ecossistema Completo
                    </div>
                    <h3 className="text-base font-bold text-white">
                      Ferramentas de IA + Organizador de Lotes + Loja Digital
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Além das 8 ferramentas generativas, gerencie o status de cada vídeo (Ideia,
                      Roteiro, Gravação, Edição e Publicado) em um só painel.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Commercial Plans Section */}
            <section className="py-14 px-4 sm:px-8 border-b border-slate-800/80">
              <div className="max-w-6xl mx-auto">
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Planos transparentes para cada estágio do seu canal
                  </h2>
                  <p className="text-sm text-slate-400 mt-2">
                    Comece gratuitamente e evolua conforme sua rotina de produção crescer.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                  {activePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-6 rounded-xl flex flex-col justify-between border ${
                        plan.highlighted
                          ? 'bg-[#101633] border-purple-500/70'
                          : 'bg-[#0B1024] border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-400">{plan.audienceLabel}</span>
                          {plan.id === 'free' ? (
                            <span className="text-[11px] font-medium text-emerald-300">
                              Sem pagamento
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-purple-300">
                              Pix Nubank Oficial
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white mt-1">Plano {plan.name}</h3>
                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-white tabular-nums">
                            {formatCurrencyBRL(plan.priceCents)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {plan.id === 'free' ? '/ acesso gratuito' : '/ 30 dias (sem renovação automática)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                          {plan.description}
                        </p>

                        <ul className="mt-5 space-y-2.5 text-xs text-slate-200">
                          {plan.features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectPlanCheckout(plan)}
                        className={`mt-6 w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-opacity min-h-[44px] ${
                          plan.id !== 'free'
                            ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-95'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                      >
                        {plan.ctaLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="py-14 px-4 sm:px-8 bg-[#070A18]">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">
                  Perguntas Frequentes
                </h2>
                <div className="mt-8 space-y-3">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-[#0B1024] border border-slate-800 rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-semibold text-white"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ROUTE: NEXUS LAB (INTERACTIVE AI CREATIVE LABORATORY) */}
        {currentRoute === 'lab' && (
          <NexusLabView
            user={user}
            userDoc={userDoc}
            appSettings={appSettings}
            initialTool={labInitialTool}
            initialTopicPrompt={labInitialPrompt}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onNavigatePlans={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentRoute('plans');
            }}
          />
        )}

        {/* ROUTE: TOOLS */}
        {currentRoute === 'tools' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 pb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Ferramentas Criativas com IA
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Clique em qualquer ferramenta abaixo para enviar seus parâmetros, processar com o
                  Gemini no servidor e copiar ou salvar o resultado.
                </p>
              </div>
              <div className="w-full md:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar ferramentas..."
                  className="w-full px-3.5 py-2 bg-[#0B1024] border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
              {CREATOR_TOOLS.filter(
                (t) =>
                  !searchQuery.trim() ||
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.fullDescription.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((tool) => (
                <div
                  key={tool.id}
                  className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        {renderToolIcon(tool.iconName)}
                      </div>
                      <span className="text-xs text-slate-400">{tool.category}</span>
                    </div>
                    <h2 className="text-base font-bold text-white">{tool.name}</h2>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {tool.fullDescription}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTool(tool)}
                    className="mt-5 w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg hover:opacity-95 transition-opacity min-h-[42px]"
                  >
                    Abrir e Executar Ferramenta
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROUTE: PLANS & COMPARISON MATRIX */}
        {currentRoute === 'plans' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 pb-24">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-2xl sm:text-4xl font-bold text-white">
                Comparação de Planos e Limites
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                Todos os limites diários são verificados no servidor. Escolha o plano ideal para o
                seu ritmo de criação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              {activePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-6 rounded-xl flex flex-col justify-between border ${
                    plan.highlighted
                      ? 'bg-[#101633] border-purple-500/70'
                      : 'bg-[#0B1024] border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{plan.audienceLabel}</span>
                      {plan.id === 'free' ? (
                        <span className="text-[11px] font-medium text-emerald-300">
                          Sem pagamento
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-purple-300">
                          Pix Nubank Oficial
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">Plano {plan.name}</h2>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tabular-nums">
                        {formatCurrencyBRL(plan.priceCents)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {plan.id === 'free' ? '/ acesso gratuito' : '/ 30 dias (sem renovação automática)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      {plan.description}
                    </p>
                    <ul className="mt-5 space-y-2.5 text-xs text-slate-200">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlanCheckout(plan)}
                    className={`mt-6 w-full py-2.5 px-4 text-white text-xs font-semibold rounded-lg min-h-[44px] ${
                      plan.id !== 'free'
                        ? 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    {plan.ctaLabel}
                  </button>
                </div>
              ))}
            </div>

            {/* Concrete Comparison Matrix */}
            <div className="mt-12 overflow-x-auto bg-[#0B1024] border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3.5 px-4">Recurso / Limite Técnico</th>
                    <th className="py-3.5 px-4 text-right">Gratuito</th>
                    <th className="py-3.5 px-4 text-right text-purple-300">Pro</th>
                    <th className="py-3.5 px-4 text-right text-cyan-300">Studio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">
                      Execuções diárias no Gemini AI (Server-Side)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {activePlans[0].dailyLimit} / dia
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-purple-200">
                      {activePlans[1].dailyLimit} / dia
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-cyan-200">
                      {activePlans[2].dailyLimit} / dia
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">
                      Ferramentas de Texto, Roteiro e Produtividade
                    </td>
                    <td className="py-3 px-4 text-right">8 ferramentas</td>
                    <td className="py-3 px-4 text-right">8 ferramentas</td>
                    <td className="py-3 px-4 text-right">8 ferramentas</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">
                      Projetos Salvos no Cloud Firestore
                    </td>
                    <td className="py-3 px-4 text-right">Incluso</td>
                    <td className="py-3 px-4 text-right">Ilimitado</td>
                    <td className="py-3 px-4 text-right">Ilimitado</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">
                      Atendimento via Painel de Suporte
                    </td>
                    <td className="py-3 px-4 text-right">Padrão</td>
                    <td className="py-3 px-4 text-right">Prioritário</td>
                    <td className="py-3 px-4 text-right">Dedicado</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROUTE: OFFICIAL GOOGLE HARDWARE STORE & DIGITAL PRODUCTS */}
        {currentRoute === 'products' && (
          <GoogleStoreView
            digitalProducts={storeProducts}
            onSelectDigitalProductCheckout={handleSelectProductCheckout}
          />
        )}

        {/* ROUTE: DEDICATED CHECKOUT PAGE (Manual Nubank Pix) */}
        {currentRoute === 'checkout' && (
          <PixCheckoutModal
            asPage={true}
            item={
              checkoutItem || {
                itemType: 'plan',
                itemId: activePlans[1].id,
                title: `Plano ${activePlans[1].name} — Assinatura Mensal`,
                priceCents: activePlans[1].priceCents,
                description: `${activePlans[1].dailyLimit} execuções de ferramentas de IA por dia.`,
              }
            }
            onClose={() => setCurrentRoute('plans')}
            user={user}
            appSettings={appSettings}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onGoToOrders={() => {
              setDashboardInitialTab('orders');
              setCurrentRoute('dashboard');
            }}
          />
        )}

        {/* ROUTE: USER DASHBOARD (Protected Route) */}
        {currentRoute === 'dashboard' &&
          (user ? (
            <DashboardView
              user={user}
              userDoc={userDoc}
              userProfile={userProfile}
              appSettings={appSettings}
              isAdmin={isAdmin}
              initialTab={dashboardInitialTab}
              onSelectTool={(t) => setActiveTool(t)}
              onNavigate={(r) => {
                if (r !== 'dashboard') setDashboardInitialTab('overview');
                setCurrentRoute(r);
              }}
            />
          ) : (
            <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
              <Lock className="w-10 h-10 text-purple-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Área Privada do Criador</h2>
              <p className="text-xs text-slate-400">
                Faça login com sua conta para acessar seus projetos salvos, histórico de uso e
                configurações.
              </p>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg min-h-[42px]"
              >
                Entrar ou Criar Conta
              </button>
            </div>
          ))}

        {/* ROUTE: ADMIN PANEL (Protected Admin Route) */}
        {currentRoute === 'admin' &&
          (user ? (
            <AdminView user={user} isAdmin={isAdmin} appSettings={appSettings} />
          ) : (
            <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
              <Lock className="w-10 h-10 text-cyan-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Autenticação Administrativa</h2>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg min-h-[42px]"
              >
                Fazer Login Administrativo
              </button>
            </div>
          ))}

        {/* ROUTES: LEGAL PAGES (TERMS, PRIVACY, CANCELLATION) */}
        {(currentRoute === 'terms' ||
          currentRoute === 'privacy' ||
          currentRoute === 'cancellation') && (
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 pb-24">
            <div className="p-6 sm:p-8 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4">
              <div className="text-xs text-amber-400 font-medium">
                Documento Base Editável pelo Painel Administrativo — Recomendada Revisão Jurídica
                Antes da Publicação Comercial
              </div>
              <h1 className="text-2xl font-bold text-white">
                {currentRoute === 'terms' && 'Termos de Uso'}
                {currentRoute === 'privacy' && 'Política de Privacidade'}
                {currentRoute === 'cancellation' && 'Política de Cancelamento e Reembolso'}
              </h1>
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-300 leading-relaxed">
                {currentRoute === 'terms' &&
                  (appSettings?.termsOfUse || DEFAULT_LEGAL_TEXTS.termsOfUse)}
                {currentRoute === 'privacy' &&
                  (appSettings?.privacyPolicy || DEFAULT_LEGAL_TEXTS.privacyPolicy)}
                {currentRoute === 'cancellation' &&
                  (appSettings?.cancellationPolicy || DEFAULT_LEGAL_TEXTS.cancellationPolicy)}
              </pre>
            </div>
          </div>
        )}
        </main>

        {/* Footer (hidden on full-height chat view to keep message bar pinned cleanly) */}
        {currentRoute !== 'chat' && (
          <footer className="bg-[#04060E] border-t border-slate-800/80 py-10 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto flex flex-col gap-6 text-xs text-slate-400">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="font-bold text-white text-sm">
                    NEXUS AI STUDIO — Plataforma de Inteligência Artificial
                  </div>
                  <p className="mt-1">
                    Todas as suas ferramentas criativas em um só lugar · Contato:{' '}
                    {appSettings?.supportEmail || DEFAULT_LEGAL_TEXTS.supportEmail}
                  </p>
                </div>

                <nav aria-label="Páginas públicas e institucionais" className="flex flex-wrap items-center gap-4">
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('home');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Início
                  </a>
                  <a
                    href="/ferramentas"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('tools');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Ferramentas de IA
                  </a>
                  <a
                    href="/nexus-lab"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('lab');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    NEXUS LAB
                  </a>
                  <a
                    href="/planos"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('plans');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Planos e Preços
                  </a>
                  <a
                    href="/produtos"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('products');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Produtos (Google Store)
                  </a>
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-5">
                  <a
                    href="/termos"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('terms');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Termos de Uso
                  </a>
                  <a
                    href="/privacidade"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('privacy');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Política de Privacidade
                  </a>
                  <a
                    href="/cancelamento"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCurrentRoute('cancellation');
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Política de Cancelamento
                  </a>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Sitemap XML
                  </a>
                  <span>·</span>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    robots.txt
                  </a>
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* Intelligent Robot Assistant & Real-Time Update Notifier */}
      <NexusRobotAssistant
        user={user}
        userPlanId={currentUserPlanId}
        announcements={visibleAnnouncements}
        readAnnouncementIds={readAnnouncementIdsSet}
        userNotifications={userNotifications}
        robotAlertsEnabled={robotAlertsEnabled}
        onToggleRobotAlerts={handleToggleRobotAlerts}
        onRequireAuth={() => setIsAuthModalOpen(true)}
        onOpenNotificationsPage={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setCurrentRoute('notifications');
        }}
        onOpenFullChat={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveConversationId(null);
          setCurrentRoute('chat');
        }}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingPlanId(null);
        }}
        onSuccess={() => {
          if (pendingPlanId) {
            const targetPlan = activePlans.find((p) => p.id === pendingPlanId);
            setPendingPlanId(null);
            if (targetPlan) {
              setCheckoutItem({
                itemType: 'plan',
                itemId: targetPlan.id,
                title: `Plano ${targetPlan.name} — Assinatura Mensal`,
                priceCents: targetPlan.priceCents,
                description: `${targetPlan.dailyLimit} execuções de ferramentas de IA por dia.`,
                pixPaymentLink: targetPlan.pixPaymentLink,
                autoCreateOrder: true,
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentRoute('checkout');
            }
          }
        }}
      />

      <ToolRunnerModal
        tool={activeTool}
        onClose={() => setActiveTool(null)}
        user={user}
        onRequireAuth={() => setIsAuthModalOpen(true)}
        onOpenInLab={(toolToOpen, currentTopic) => {
          setActiveTool(null);
          setLabInitialTool(toolToOpen);
          setLabInitialPrompt(currentTopic);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setCurrentRoute('lab');
        }}
      />
    </div>
  );
}
