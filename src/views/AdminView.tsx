import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  ShoppingBag,
  CreditCard,
  Package,
  Settings,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Wrench,
  Landmark,
  XCircle,
  Clock,
  Loader2,
  Megaphone,
  Pencil,
  Globe,
  ExternalLink,
  Search,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  db,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  CREATOR_TOOLS,
  INITIAL_DIGITAL_PRODUCTS,
  DEFAULT_LEGAL_TEXTS,
  OFFICIAL_NUBANK_PIX_LINKS,
  formatCurrencyBRL,
} from '../data/catalog';

interface AdminViewProps {
  user: FirebaseUser;
  isAdmin: boolean;
  appSettings: Record<string, any> | null;
}

export const AdminView: React.FC<AdminViewProps> = ({ user, isAdmin, appSettings }) => {
  const [activeSection, setActiveSection] = useState<
    | 'orders'
    | 'announcements'
    | 'plans_settings'
    | 'revenue'
    | 'users'
    | 'payments'
    | 'subscriptions'
    | 'products'
    | 'tools'
    | 'support'
    | 'seo_domain'
    | 'quality_tests'
  >('orders');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);

  // Announcements form state
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annCategory, setAnnCategory] = useState<
    'nova_ferramenta' | 'melhoria' | 'manutencao' | 'recurso' | 'plano'
  >('melhoria');
  const [annAudience, setAnnAudience] = useState<'all' | 'free' | 'pro' | 'studio'>('all');
  const [annStatus, setAnnStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementFeedback, setAnnouncementFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Order decision processing state
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [orderDecisionFeedback, setOrderDecisionFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Product Creation Form
  const [prodId, setProdId] = useState('');
  const [prodTitle, setProdTitle] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPriceBRL, setProdPriceBRL] = useState('29.90');
  const [prodCategory, setProdCategory] = useState('Roteirização');
  const [prodImage] = useState(INITIAL_DIGITAL_PRODUCTS[0].imageUrl);
  const [prodFormat, setProdFormat] = useState('Guia Estruturado (.MD)');
  const [savingProduct, setSavingProduct] = useState(false);

  // App Settings Form (Plans + Manual Nubank Pix Links + Legal)
  const [freeLimit, setFreeLimit] = useState<number>(appSettings?.freeDailyLimit || 5);
  const [proLimit, setProLimit] = useState<number>(appSettings?.proDailyLimit || 100);
  const [studioLimit, setStudioLimit] = useState<number>(appSettings?.studioDailyLimit || 500);
  const [proPriceBRL, setProPriceBRL] = useState<string>(
    ((appSettings?.proPriceCents || 1990) / 100).toFixed(2)
  );
  const [studioPriceBRL, setStudioPriceBRL] = useState<string>(
    ((appSettings?.studioPriceCents || 3990) / 100).toFixed(2)
  );
  const [proPixLink, setProPixLink] = useState<string>(
    appSettings?.proPixLink || OFFICIAL_NUBANK_PIX_LINKS.pro
  );
  const [studioPixLink, setStudioPixLink] = useState<string>(
    appSettings?.studioPixLink || OFFICIAL_NUBANK_PIX_LINKS.studio
  );
  const [pixKey, setPixKey] = useState<string>(
    appSettings?.pixKey || OFFICIAL_NUBANK_PIX_LINKS.pro
  );
  const [pixKeyType, setPixKeyType] = useState<string>(
    appSettings?.pixKeyType || 'Link de Cobrança Pix Nubank'
  );
  const [pixHolderName, setPixHolderName] = useState<string>(
    appSettings?.pixHolderName || 'NEXUS AI STUDIO (Conta Nubank)'
  );
  const [pixBankName, setPixBankName] = useState<string>(
    appSettings?.pixBankName || 'Nu Pagamentos S.A. (Nubank)'
  );
  const [supportEmail, setSupportEmail] = useState<string>(
    appSettings?.supportEmail || DEFAULT_LEGAL_TEXTS.supportEmail
  );
  const [termsText, setTermsText] = useState<string>(
    appSettings?.termsOfUse || DEFAULT_LEGAL_TEXTS.termsOfUse
  );
  const [privacyText, setPrivacyText] = useState<string>(
    appSettings?.privacyPolicy || DEFAULT_LEGAL_TEXTS.privacyPolicy
  );
  const [cancelText, setCancelText] = useState<string>(
    appSettings?.cancellationPolicy || DEFAULT_LEGAL_TEXTS.cancellationPolicy
  );
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  // Support reply state
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Automated test suite state
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [runningTests, setRunningTests] = useState(false);

  // SEO, Custom Domain & Google Search Console state
  const [seoDomainStatus, setSeoDomainStatus] = useState<any | null>(null);
  const [loadingSeoStatus, setLoadingSeoStatus] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('nexusaistudio.com.br');

  const fetchSeoDomainStatus = async (domainQuery?: string) => {
    setLoadingSeoStatus(true);
    try {
      const q = domainQuery ? `?domain=${encodeURIComponent(domainQuery.trim())}` : '';
      const res = await fetch(`/api/system/seo-domain-status${q}`);
      if (res.ok) {
        const data = await res.json();
        setSeoDomainStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSeoStatus(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeSection === 'seo_domain' && !seoDomainStatus) {
      fetchSeoDomainStatus();
    }
  }, [isAdmin, activeSection]);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    if (appSettings) {
      setFreeLimit(appSettings.freeDailyLimit || 5);
      setProLimit(appSettings.proDailyLimit || 100);
      setStudioLimit(appSettings.studioDailyLimit || 500);
      if (appSettings.proPriceCents) {
        setProPriceBRL((Number(appSettings.proPriceCents) / 100).toFixed(2));
      }
      if (appSettings.studioPriceCents) {
        setStudioPriceBRL((Number(appSettings.studioPriceCents) / 100).toFixed(2));
      }
      setProPixLink(appSettings.proPixLink || OFFICIAL_NUBANK_PIX_LINKS.pro);
      setStudioPixLink(appSettings.studioPixLink || OFFICIAL_NUBANK_PIX_LINKS.studio);
      setPixKey(appSettings.pixKey || OFFICIAL_NUBANK_PIX_LINKS.pro);
      setPixKeyType(appSettings.pixKeyType || 'Link de Cobrança Pix Nubank');
      setPixHolderName(appSettings.pixHolderName || 'NEXUS AI STUDIO (Conta Nubank)');
      setPixBankName(appSettings.pixBankName || 'Nu Pagamentos S.A. (Nubank)');
      setSupportEmail(appSettings.supportEmail || DEFAULT_LEGAL_TEXTS.supportEmail);
      setTermsText(appSettings.termsOfUse || DEFAULT_LEGAL_TEXTS.termsOfUse);
      setPrivacyText(appSettings.privacyPolicy || DEFAULT_LEGAL_TEXTS.privacyPolicy);
      setCancelText(appSettings.cancellationPolicy || DEFAULT_LEGAL_TEXTS.cancellationPolicy);
    }
  }, [appSettings]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsersList(snap.docs.map((d) => d.data())),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setOrdersList(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPaymentsList(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
    );

    const unsubSubs = onSnapshot(
      collection(db, 'subscriptions'),
      (snap) => setSubscriptionsList(snap.docs.map((d) => d.data())),
      (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions')
    );

    const unsubProds = onSnapshot(
      collection(db, 'products'),
      (snap) => setProductsList(snap.docs.map((d) => d.data())),
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const unsubTickets = onSnapshot(
      collection(db, 'support_tickets'),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTicketsList(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets')
    );

    const unsubAnnouncements = onSnapshot(
      collection(db, 'announcements'),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setAnnouncementsList(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
    );

    fetch('/api/system/status')
      .then((r) => r.json())
      .then((d) => setSystemStatus(d))
      .catch(() => {});

    return () => {
      unsubUsers();
      unsubOrders();
      unsubPayments();
      unsubSubs();
      unsubProds();
      unsubTickets();
      unsubAnnouncements();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-8 bg-[#0B1024] border border-red-900/60 rounded-xl space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Acesso Restrito ao Administrador</h2>
          <p className="text-xs text-slate-400">
            Sua conta ({user.email}) não possui permissões administrativas verificadas no servidor e
            nas regras de segurança do Cloud Firestore.
          </p>
        </div>
      </div>
    );
  }

  // Verified Financial Metrics (Never invents approved transactions)
  const approvedOrders = ordersList.filter((o) => o.status === 'approved');
  const awaitingOrders = ordersList.filter(
    (o) =>
      o.status === 'awaiting_payment' ||
      o.status === 'pending_pix' ||
      o.status === 'pending_configuration'
  );
  const cancelledOrders = ordersList.filter((o) => o.status === 'cancelled');

  const grossVerifiedCents = approvedOrders.reduce(
    (acc, o) => acc + (Number(o.amountCents) || 0),
    0
  );
  const awaitingVolumeCents = awaitingOrders.reduce(
    (acc, o) => acc + (Number(o.amountCents) || 0),
    0
  );

  // Server-side manual payment confirmation or cancellation
  const handleAdminOrderDecision = async (orderId: string, decision: 'approve' | 'cancel') => {
    setProcessingOrderId(orderId);
    setOrderDecisionFeedback(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderDecisionFeedback({
          type: 'error',
          text: data.error || 'Falha ao processar decisão do pedido no servidor.',
        });
      } else {
        setOrderDecisionFeedback({
          type: 'success',
          text: data.message || 'Pedido atualizado com sucesso no servidor.',
        });
      }
    } catch (err: any) {
      setOrderDecisionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro de conexão com o servidor.',
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleSeedInitialProducts = async () => {
    for (const prod of INITIAL_DIGITAL_PRODUCTS) {
      try {
        await setDoc(doc(db, 'products', prod.id), {
          id: prod.id,
          title: prod.title,
          description: prod.description,
          priceCents: prod.priceCents,
          category: prod.category,
          imageUrl: prod.imageUrl,
          fileFormat: prod.fileFormat,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `products/${prod.id}`);
      }
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId =
      prodId.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || `prod_${Date.now()}`;
    const cents = Math.round(parseFloat(prodPriceBRL.replace(',', '.')) * 100);
    if (!prodTitle.trim() || isNaN(cents) || cents < 0) return;

    setSavingProduct(true);
    try {
      await setDoc(doc(db, 'products', cleanId), {
        id: cleanId,
        title: prodTitle.trim().slice(0, 120),
        description: prodDesc.trim().slice(0, 1000),
        priceCents: cents,
        category: prodCategory.trim().slice(0, 50),
        imageUrl: prodImage.trim().slice(0, 500),
        fileFormat: prodFormat.trim().slice(0, 60),
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProdId('');
      setProdTitle('');
      setProdDesc('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${cleanId}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedMsg(null);

    const parsedProCents = Math.max(
      100,
      Math.round(parseFloat(String(proPriceBRL).replace(',', '.')) * 100) || 1990
    );
    const parsedStudioCents = Math.max(
      100,
      Math.round(parseFloat(String(studioPriceBRL).replace(',', '.')) * 100) || 3990
    );

    try {
      await setDoc(doc(db, 'app_settings', 'global'), {
        id: 'global',
        freeDailyLimit: Math.max(1, Math.min(1000, Number(freeLimit) || 5)),
        proDailyLimit: Math.max(1, Math.min(10000, Number(proLimit) || 100)),
        studioDailyLimit: Math.max(1, Math.min(100000, Number(studioLimit) || 500)),
        proPriceCents: parsedProCents,
        studioPriceCents: parsedStudioCents,
        proPixLink: (proPixLink.trim() || OFFICIAL_NUBANK_PIX_LINKS.pro).slice(0, 500),
        studioPixLink: (studioPixLink.trim() || OFFICIAL_NUBANK_PIX_LINKS.studio).slice(0, 500),
        pixKey: (pixKey.trim() || OFFICIAL_NUBANK_PIX_LINKS.pro).slice(0, 200),
        pixKeyType: (pixKeyType.trim() || 'Link de Cobrança Pix Nubank').slice(0, 40),
        pixHolderName: (pixHolderName.trim() || 'NEXUS AI STUDIO (Conta Nubank)').slice(0, 120),
        pixBankName: (pixBankName.trim() || 'Nu Pagamentos S.A. (Nubank)').slice(0, 80),
        supportEmail: supportEmail.trim().slice(0, 150),
        termsOfUse: termsText.trim().slice(0, 9900),
        privacyPolicy: privacyText.trim().slice(0, 9900),
        cancellationPolicy: cancelText.trim().slice(0, 4900),
        updatedAt: serverTimestamp(),
      });
      setSettingsSavedMsg(
        'Links Pix Nubank, preços dos planos (R$ 19,90 e R$ 39,90), limites diários e textos legais salvos no Cloud Firestore!'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'app_settings/global');
    }
  };

  const handleReplyTicket = async (ticket: any, newStatus: 'answered' | 'closed') => {
    const replyText = (replyDrafts[ticket.id] ?? ticket.adminReply ?? '').trim();
    try {
      await updateDoc(doc(db, 'support_tickets', ticket.id), {
        userEmail: ticket.userEmail,
        subject: ticket.subject,
        message: ticket.message,
        status: newStatus,
        adminReply: replyText.slice(0, 2000),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `support_tickets/${ticket.id}`);
    }
  };

  const handleRunSystemTests = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/system/run-tests');
      const data = await res.json();
      setTestResults(data.results || []);
    } catch {
      setTestResults([]);
    } finally {
      setRunningTests(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim() || savingAnnouncement) return;

    setSavingAnnouncement(true);
    setAnnouncementFeedback(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          ...(editingAnnouncementId ? { id: editingAnnouncementId } : {}),
          title: annTitle.trim(),
          message: annMessage.trim(),
          category: annCategory,
          targetAudience: annAudience,
          status: annStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnnouncementFeedback({
          type: 'error',
          text: data.error || 'Falha ao salvar atualização no servidor.',
        });
      } else {
        setAnnouncementFeedback({
          type: 'success',
          text:
            data.message ||
            'Aviso de atualização salvo no Firestore e sincronizado em tempo real com o Robô NEXUS!',
        });
        setEditingAnnouncementId(null);
        setAnnTitle('');
        setAnnMessage('');
        setAnnCategory('melhoria');
        setAnnAudience('all');
        setAnnStatus('published');
      }
    } catch (err: any) {
      setAnnouncementFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro de conexão com o servidor.',
      });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleToggleAnnouncementPublished = async (ann: any) => {
    setAnnouncementFeedback(null);
    try {
      const idToken = await user.getIdToken();
      const nextStatus = ann.status === 'published' ? 'draft' : 'published';
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          id: ann.id,
          title: ann.title,
          message: ann.message,
          category: ann.category || 'melhoria',
          targetAudience: ann.targetAudience || 'all',
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnnouncementFeedback({
          type: 'error',
          text: data.error || 'Falha ao atualizar status do aviso.',
        });
      } else {
        setAnnouncementFeedback({
          type: 'success',
          text: data.message || 'Status do aviso atualizado com sucesso.',
        });
      }
    } catch (err: any) {
      setAnnouncementFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao alterar publicação.',
      });
    }
  };

  const handleStartEditAnnouncement = (ann: any) => {
    setEditingAnnouncementId(ann.id);
    setAnnTitle(ann.title || '');
    setAnnMessage(ann.message || '');
    setAnnCategory(ann.category || 'melhoria');
    setAnnAudience(ann.targetAudience || 'all');
    setAnnStatus(ann.status || 'published');
    setAnnouncementFeedback(null);
  };

  const renderOrderStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Aprovado</span>
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold">
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelado</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" />
        <span>Aguardando pagamento</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Painel Administrativo Protegido · Aprovação Server-Side</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Administração NEXUS AI STUDIO
          </h1>
        </div>
        <div className="text-xs text-slate-400 font-mono">Admin: {user.email}</div>
      </div>

      {/* Status Banner of Official Nubank Pix Links */}
      <div className="mt-6 p-4 bg-[#0B1024] border border-purple-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-purple-300">
            Links de Cobrança Pix Nubank Ativos no Firestore (app_settings/global)
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Plano Pro (R$ 19,90): {appSettings?.proPixLink || OFFICIAL_NUBANK_PIX_LINKS.pro}
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Plano Studio (R$ 39,90): {appSettings?.studioPixLink || OFFICIAL_NUBANK_PIX_LINKS.studio}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveSection('plans_settings')}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg shrink-0"
        >
          Editar Links e Preços
        </button>
      </div>

      {/* Section Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#090D1E] border border-slate-800 rounded-xl overflow-x-auto my-6">
        {[
          {
            id: 'orders',
            label: `Pedidos Pix (${ordersList.length})`,
            icon: ShoppingBag,
          },
          {
            id: 'announcements',
            label: `Atualizações (${announcementsList.length})`,
            icon: Megaphone,
          },
          {
            id: 'plans_settings',
            label: 'Planos e Pix Nubank',
            icon: Landmark,
          },
          { id: 'revenue', label: 'Receita e Resumo', icon: BarChart3 },
          { id: 'payments', label: `Pagamentos (${paymentsList.length})`, icon: CreditCard },
          { id: 'subscriptions', label: `Assinaturas (${subscriptionsList.length})`, icon: ShieldCheck },
          { id: 'users', label: `Usuários (${usersList.length})`, icon: Users },
          { id: 'products', label: `Produtos (${productsList.length})`, icon: Package },
          { id: 'tools', label: 'Ferramentas IA', icon: Wrench },
          { id: 'support', label: `Suporte (${ticketsList.length})`, icon: HelpCircle },
          { id: 'seo_domain', label: 'Domínio & Search Console', icon: Globe },
          { id: 'quality_tests', label: 'Testes de Segurança', icon: Play },
        ].map((sec) => {
          const Icon = sec.icon;
          const active = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px] ${
                active
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ORDERS & MANUAL PIX APPROVAL (Protected Server-Side Action) */}
      {activeSection === 'orders' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Gerenciamento de Pedidos e Confirmação Manual de Pix (Nubank)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Confira o recebimento do Pix na sua conta Nubank e clique em{' '}
                <strong className="text-emerald-300">Confirmar Pagamento</strong> para aprovar no
                servidor e liberar automaticamente o plano ou produto do cliente.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0">
              <div className="px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg">
                <span className="text-slate-400">Aguardando: </span>
                <strong className="text-amber-400 tabular-nums">{awaitingOrders.length}</strong>
              </div>
              <div className="px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg">
                <span className="text-slate-400">Aprovados: </span>
                <strong className="text-emerald-400 tabular-nums">{approvedOrders.length}</strong>
              </div>
            </div>
          </div>

          {orderDecisionFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium ${
                orderDecisionFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                  : 'bg-red-950/60 border-red-800 text-red-200'
              }`}
            >
              {orderDecisionFeedback.text}
            </div>
          )}

          <div className="overflow-x-auto bg-[#0B1024] border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3.5 px-4">ID do Pedido</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Cliente (UID)</th>
                  <th className="py-3.5 px-4">Plano / Produto</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                  <th className="py-3.5 px-4">Status Atual</th>
                  <th className="py-3.5 px-4 text-right">Ação no Servidor (Admin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {ordersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Nenhum pedido registrado no banco de dados até o momento.
                    </td>
                  </tr>
                ) : (
                  ordersList.map((o) => {
                    const isProcessing = processingOrderId === o.id;
                    const formattedDate = o.createdAt?.seconds
                      ? new Date(o.createdAt.seconds * 1000).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Agora';
                    return (
                      <tr key={o.id} className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-4 font-mono text-slate-200 tabular-nums">
                          {o.id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 tabular-nums whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{o.userId}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{o.itemTitle}</div>
                          <div className="text-[11px] text-slate-500 uppercase">
                            Tipo: {o.itemType === 'plan' ? `Plano (${o.itemId})` : 'Produto Digital'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-white tabular-nums">
                          {formatCurrencyBRL(o.amountCents)}
                        </td>
                        <td className="py-3.5 px-4">{renderOrderStatusBadge(o.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {o.status !== 'approved' && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleAdminOrderDecision(o.id, 'approve')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 min-h-[34px]"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Confirmar Pagamento</span>
                              </button>
                            )}
                            {o.status !== 'cancelled' && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleAdminOrderDecision(o.id, 'cancel')}
                                className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800/70 disabled:opacity-50 text-red-200 font-semibold rounded-lg inline-flex items-center gap-1.5 min-h-[34px]"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Cancelar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1B. REAL-TIME PLATFORM UPDATES & ANNOUNCEMENTS MANAGER */}
      {activeSection === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveAnnouncement}
            className="lg:col-span-5 p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editingAnnouncementId
                    ? 'Editar Aviso de Atualização'
                    : 'Criar Aviso de Atualização'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Avisos publicados disparam em tempo real na Central de Notificações e no Robô
                  Inteligente NEXUS.
                </p>
              </div>
              {editingAnnouncementId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAnnouncementId(null);
                    setAnnTitle('');
                    setAnnMessage('');
                    setAnnCategory('melhoria');
                    setAnnAudience('all');
                    setAnnStatus('published');
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg shrink-0"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            {announcementFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  announcementFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                    : 'bg-red-950/60 border-red-800 text-red-200'
                }`}
              >
                {announcementFeedback.text}
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-300 mb-1">Título da Atualização *</label>
              <input
                type="text"
                required
                maxLength={140}
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Ex: Nova ferramenta de Roteiro Viral liberada"
                className="w-full px-3.5 py-2.5 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Categoria Oficial *</label>
              <select
                value={annCategory}
                onChange={(e) => setAnnCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="nova_ferramenta">Nova ferramenta disponível</option>
                <option value="melhoria">Melhorias na plataforma</option>
                <option value="manutencao">Manutenção ou atualização importante</option>
                <option value="recurso">Novos recursos dos planos Pro e Studio</option>
                <option value="plano">Avisos gerais do sistema / Planos</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Público-Alvo *</label>
                <select
                  value={annAudience}
                  onChange={(e) => setAnnAudience(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="all">Todos os usuários</option>
                  <option value="free">Plano Gratuito</option>
                  <option value="pro">Plano Pro</option>
                  <option value="studio">Plano Studio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Status de Publicação</label>
                <select
                  value={annStatus}
                  onChange={(e) => setAnnStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="published">Publicado (Ativo)</option>
                  <option value="draft">Rascunho (Desativado)</option>
                  <option value="archived">Arquivado (Oculto)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Mensagem Completa da Atualização *
              </label>
              <textarea
                rows={4}
                required
                maxLength={2500}
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                placeholder="Descreva claramente a novidade, melhoria ou aviso para os usuários..."
                className="w-full p-3 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={savingAnnouncement}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 min-h-[42px]"
            >
              {savingAnnouncement ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Megaphone className="w-4 h-4" />
              )}
              <span>
                {editingAnnouncementId
                  ? 'Salvar Alterações no Aviso'
                  : 'Publicar Atualização no Firestore'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            <div className="p-4 bg-[#0B1024] border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Histórico de Atualizações e Avisos ({announcementsList.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Somente administradores autenticados podem criar, editar ou desativar avisos.
                </p>
              </div>
            </div>

            {announcementsList.length === 0 ? (
              <div className="p-8 bg-[#0B1024] border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                Nenhum aviso de atualização cadastrado ainda. Use o formulário ao lado para publicar
                a primeira novidade!
              </div>
            ) : (
              announcementsList.map((ann) => {
                const formattedDate = ann.createdAt?.seconds
                  ? new Date(ann.createdAt.seconds * 1000).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recente';
                const audienceMap: Record<string, string> = {
                  all: 'Todos os usuários',
                  free: 'Plano Gratuito',
                  pro: 'Plano Pro',
                  studio: 'Plano Studio',
                };
                const categoryMap: Record<string, string> = {
                  nova_ferramenta: 'Nova ferramenta disponível',
                  melhoria: 'Melhorias na plataforma',
                  manutencao: 'Manutenção ou atualização importante',
                  recurso: 'Novos recursos dos planos Pro e Studio',
                  plano: 'Avisos gerais / Planos',
                };
                const isPublished = ann.status === 'published';
                return (
                  <div
                    key={ann.id}
                    className={`p-5 rounded-xl border space-y-3 ${
                      isPublished
                        ? 'bg-[#0B1024] border-slate-800'
                        : 'bg-[#070A16] border-slate-800/50 opacity-75'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                            isPublished
                              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {isPublished ? 'Publicado' : 'Desativado'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[11px] font-medium">
                          {categoryMap[ann.category] || ann.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                          Público: {audienceMap[ann.targetAudience] || 'Todos'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums">{formattedDate}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{ann.title}</h4>
                      <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                        {ann.message}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {ann.id} · Autor: {ann.authorEmail}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditAnnouncement(ann)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAnnouncementPublished(ann)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                            isPublished
                              ? 'bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-amber-200'
                              : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          {isPublished ? 'Desativar Aviso' : 'Publicar Aviso'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. PLANS, PRICES & MANUAL NUBANK PIX KEY CONFIGURATION */}
      {activeSection === 'plans_settings' && (
        <form
          onSubmit={handleSaveGlobalSettings}
          className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-6"
        >
          <div>
            <h3 className="text-lg font-bold text-white">
              Configuração da Chave Pix Manual (Nubank) e Preços dos Planos
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Os valores abaixo ficam salvos em <span className="font-mono">app_settings/global</span>{' '}
              no Cloud Firestore e atualizam imediatamente a página de Planos e a página de Checkout.
            </p>
          </div>

          {settingsSavedMsg && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-200 font-medium">
              {settingsSavedMsg}
            </div>
          )}

          {/* Nubank Pix Links Block */}
          <div className="p-5 bg-[#060916] border border-purple-500/40 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <Landmark className="w-4 h-4" />
              <span>Links Oficiais de Cobrança Pix do Nubank por Plano</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Link Pix Nubank — Plano Pro (R$ 19,90) *
                </label>
                <input
                  type="url"
                  required
                  maxLength={450}
                  value={proPixLink}
                  onChange={(e) => setProPixLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1024] border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Link Pix Nubank — Plano Studio (R$ 39,90) *
                </label>
                <input
                  type="url"
                  required
                  maxLength={450}
                  value={studioPixLink}
                  onChange={(e) => setStudioPixLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1024] border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Nome do Recebedor / Titular da Conta Nubank
                </label>
                <input
                  type="text"
                  maxLength={110}
                  value={pixHolderName}
                  onChange={(e) => setPixHolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1024] border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Instituição Bancária</label>
                <input
                  type="text"
                  maxLength={75}
                  value={pixBankName}
                  onChange={(e) => setPixBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1024] border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Configurable Plan Prices & Server Limits */}
          <div className="p-5 bg-[#060916] border border-slate-800 rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-white">
              Preços Configuráveis dos Planos e Limites Diários de IA no Servidor
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Preço Mensal — Plano Pro (R$)
                </label>
                <input
                  type="text"
                  value={proPriceBRL}
                  onChange={(e) => setProPriceBRL(e.target.value)}
                  placeholder="19.90"
                  className="w-full px-3 py-2 bg-[#0B1024] border border-slate-800 rounded-lg text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Preço Mensal — Plano Studio (R$)
                </label>
                <input
                  type="text"
                  value={studioPriceBRL}
                  onChange={(e) => setStudioPriceBRL(e.target.value)}
                  placeholder="39.90"
                  className="w-full px-3 py-2 bg-[#0B1024] border border-slate-800 rounded-lg text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  E-mail Oficial de Suporte
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1024] border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Limite Diário IA — Plano Gratuito
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={freeLimit}
                  onChange={(e) => setFreeLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B1024] border border-slate-800 rounded-lg text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Limite Diário IA — Plano Pro
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={proLimit}
                  onChange={(e) => setProLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B1024] border border-slate-800 rounded-lg text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Limite Diário IA — Plano Studio
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={studioLimit}
                  onChange={(e) => setStudioLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B1024] border border-slate-800 rounded-lg text-xs text-white tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Termos de Uso</label>
              <textarea
                rows={3}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                className="w-full p-3 bg-[#060916] border border-slate-800 rounded-lg text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Política de Privacidade</label>
              <textarea
                rows={3}
                value={privacyText}
                onChange={(e) => setPrivacyText(e.target.value)}
                className="w-full p-3 bg-[#060916] border border-slate-800 rounded-lg text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Política de Cancelamento e Reembolso
              </label>
              <textarea
                rows={2}
                value={cancelText}
                onChange={(e) => setCancelText(e.target.value)}
                className="w-full p-3 bg-[#060916] border border-slate-800 rounded-lg text-xs text-slate-200"
              />
            </div>
          </div>

          <button
            type="submit"
            className="py-3 px-6 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg min-h-[42px]"
          >
            Salvar Chave Pix Nubank e Configurações no Firestore
          </button>
        </form>
      )}

      {/* 3. Revenue & Verified Financial Summary */}
      {activeSection === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400">Receita Aprovada (Pix Confirmado)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
                {formatCurrencyBRL(grossVerifiedCents)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pedidos aprovados pelo administrador ({approvedOrders.length})
              </span>
            </div>

            <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400">Aguardando Pagamento</span>
              <div className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">
                {formatCurrencyBRL(awaitingVolumeCents)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pedidos pendentes de conferência ({awaitingOrders.length})
              </span>
            </div>

            <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400">Pedidos Cancelados</span>
              <div className="text-2xl font-bold text-slate-300 mt-1 tabular-nums">
                {cancelledOrders.length}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pedidos encerrados sem pagamento
              </span>
            </div>

            <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400">Assinaturas Ativas</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1 tabular-nums">
                {subscriptionsList.filter((s) => s.status === 'active').length}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Planos liberados pelo servidor
              </span>
            </div>
          </div>

          <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-base font-bold text-white">
              Status Operacional dos Subsistemas Independentes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#060916] border border-slate-800 rounded-lg">
                <div className="font-semibold text-slate-200">
                  Subsistema de IA (Google Gemini Server-Side)
                </div>
                <div className="mt-1 text-slate-400">
                  Status:{' '}
                  {systemStatus?.geminiConfigured ? (
                    <span className="text-emerald-400 font-semibold">Conectado e Operacional</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">
                      Pendente de GEMINI_API_KEY
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#060916] border border-slate-800 rounded-lg">
                <div className="font-semibold text-slate-200">
                  Subsistema de Pagamentos (Pix Manual Nubank)
                </div>
                <div className="mt-1 text-slate-400">
                  Chave Pix:{' '}
                  {appSettings?.pixKey ? (
                    <span className="text-emerald-400 font-semibold">
                      Cadastrada ({appSettings.pixKeyType || 'Nubank'})
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">
                      Pendente de cadastro na aba Planos e Pix Nubank
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#060916] border border-slate-800 rounded-lg">
                <div className="font-semibold text-slate-200">Isolamento de Segurança</div>
                <div className="mt-1 text-slate-400">
                  Sem dependência de token de API bancária. Liberação exclusiva via servidor.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Users List */}
      {activeSection === 'users' && (
        <div className="overflow-x-auto bg-[#0B1024] border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="py-3 px-4">UID</th>
                <th className="py-3 px-4">Nome de Exibição</th>
                <th className="py-3 px-4">Permissão</th>
                <th className="py-3 px-4">Plano Liberado no Servidor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {usersList.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">{u.uid}</td>
                  <td className="py-3 px-4 text-white font-medium">{u.displayName}</td>
                  <td className="py-3 px-4 font-mono text-cyan-400">{u.role}</td>
                  <td className="py-3 px-4 font-mono uppercase text-purple-300">{u.planId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Payments List */}
      {activeSection === 'payments' && (
        <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-3">
          <h3 className="text-base font-bold text-white">
            Histórico Geral de Pagamentos Processados pelo Servidor
          </h3>
          <p className="text-xs text-slate-400">
            Cada confirmação ou cancelamento manual realizado pelo administrador gera um registro
            auditável na coleção <span className="font-mono">payments</span>.
          </p>
          {paymentsList.length === 0 ? (
            <div className="p-6 bg-[#060916] border border-slate-800 rounded-lg text-center text-xs text-slate-500">
              Nenhum pagamento registrado até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">ID Pagamento</th>
                    <th className="py-2.5 px-3">Pedido</th>
                    <th className="py-2.5 px-3">Cliente UID</th>
                    <th className="py-2.5 px-3">Método</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paymentsList.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-mono text-slate-200">{p.id}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{p.orderId}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{p.userId}</td>
                      <td className="py-2.5 px-3 text-slate-300">{p.provider}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-white">
                        {formatCurrencyBRL(p.amountCents)}
                      </td>
                      <td className="py-2.5 px-3">{renderOrderStatusBadge(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Subscriptions List */}
      {activeSection === 'subscriptions' && (
        <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-3">
          <h3 className="text-base font-bold text-white">Assinaturas Liberadas pelo Servidor</h3>
          {subscriptionsList.length === 0 ? (
            <div className="p-6 bg-[#060916] border border-slate-800 rounded-lg text-center text-xs text-slate-500">
              Nenhuma assinatura paga ativa no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">ID Assinatura</th>
                    <th className="py-2 px-3">Usuário UID</th>
                    <th className="py-2 px-3">Plano</th>
                    <th className="py-2 px-3 text-right">Valor</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {subscriptionsList.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 px-3 font-mono">{s.id}</td>
                      <td className="py-2 px-3 font-mono">{s.userId}</td>
                      <td className="py-2 px-3 uppercase font-bold text-purple-300">{s.planId}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {formatCurrencyBRL(s.priceCents)}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-400">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. Digital Products Store Management */}
      {activeSection === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateProduct}
            className="lg:col-span-5 p-5 bg-[#0B1024] border border-slate-800 rounded-xl space-y-3.5 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Cadastrar Produto Digital</h3>
              <button
                type="button"
                onClick={handleSeedInitialProducts}
                className="text-xs text-cyan-400 hover:underline"
              >
                Sincronizar Catálogo Padrão
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">ID Único (Slug)</label>
              <input
                type="text"
                maxLength={80}
                value={prodId}
                onChange={(e) => setProdId(e.target.value)}
                placeholder="Ex: pack-roteiros-v2"
                className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Título do Produto *</label>
              <input
                type="text"
                required
                maxLength={110}
                value={prodTitle}
                onChange={(e) => setProdTitle(e.target.value)}
                placeholder="Ex: Pack 30 Templates de Títulos Virais"
                className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Preço (R$) *</label>
                <input
                  type="text"
                  required
                  value={prodPriceBRL}
                  onChange={(e) => setProdPriceBRL(e.target.value)}
                  className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Categoria</label>
                <input
                  type="text"
                  required
                  maxLength={45}
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Formato do Arquivo Protegido
              </label>
              <input
                type="text"
                required
                maxLength={55}
                value={prodFormat}
                onChange={(e) => setProdFormat(e.target.value)}
                className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Descrição Comercial *</label>
              <textarea
                rows={3}
                required
                maxLength={900}
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                className="w-full p-2.5 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingProduct}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>{savingProduct ? 'Salvando...' : 'Publicar Produto no Firestore'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {productsList.length === 0 ? (
              <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl text-center space-y-3">
                <p className="text-xs text-slate-400">
                  O catálogo persistente no Firestore ainda não foi inicializado.
                </p>
                <button
                  type="button"
                  onClick={handleSeedInitialProducts}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg"
                >
                  Carregar os 3 Produtos Oficiais no Firestore
                </button>
              </div>
            ) : (
              productsList.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 bg-[#0B1024] border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs text-purple-400">
                      {prod.category} · {prod.fileFormat}
                    </div>
                    <h4 className="text-sm font-bold text-white">{prod.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{prod.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-white tabular-nums">
                      {formatCurrencyBRL(prod.priceCents)}
                    </div>
                    <span className="text-[11px] text-emerald-400">Ativo</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 8. Tools Status Overview */}
      {activeSection === 'tools' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl">
            <h3 className="text-base font-bold text-white mb-3">
              Catálogo de Ferramentas Operacionais (Subsistema de IA Isolado)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CREATOR_TOOLS.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-[#060916] border border-slate-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{t.name}</div>
                    <div className="text-[11px] text-slate-400">{t.category}</div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">Ativa (Gemini 3.8)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. Support Management */}
      {activeSection === 'support' && (
        <div className="space-y-4">
          {ticketsList.length === 0 ? (
            <div className="p-8 bg-[#0B1024] border border-slate-800 rounded-xl text-center text-xs text-slate-400">
              Nenhum chamado de suporte registrado pelos usuários.
            </div>
          ) : (
            ticketsList.map((tkt) => (
              <div
                key={tkt.id}
                className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{tkt.subject}</span>
                    <span className="mx-2 text-slate-500">·</span>
                    <span className="text-slate-400">{tkt.userEmail}</span>
                  </div>
                  <span className="font-mono text-cyan-400">{tkt.status.toUpperCase()}</span>
                </div>
                <p className="text-xs text-slate-300 bg-[#060916] p-3 rounded-lg">{tkt.message}</p>
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Escreva a resposta oficial do suporte..."
                    value={replyDrafts[tkt.id] ?? tkt.adminReply ?? ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [tkt.id]: e.target.value }))
                    }
                    className="w-full p-2.5 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReplyTicket(tkt, 'answered')}
                      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg"
                    >
                      Enviar Resposta
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplyTicket(tkt, 'closed')}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
                    >
                      Encerrar Chamado
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 10. Automated Security & Subsystem Tests */}
      {activeSection === 'quality_tests' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Suíte de Testes de Segurança, Autenticação, Pix Manual e Limites
                </h3>
                <p className="text-xs text-slate-400">
                  Verifica no servidor o bloqueio de auto-aprovação pelo cliente, validação JWT e
                  separação das ferramentas de IA.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunSystemTests}
                disabled={runningTests}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {runningTests ? 'Executando Testes...' : 'Executar Testes Agora'}
              </button>
            </div>

            {testResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {testResults.map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#060916] border border-slate-800 rounded-lg flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="text-purple-400 font-medium">{tr.suite}</div>
                      <div className="font-bold text-white mt-0.5">{tr.name}</div>
                      <p className="text-slate-400 mt-1">{tr.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 11. Official Publication, Brand Domain & Google Search Console */}
      {activeSection === 'seo_domain' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Publicação Oficial, Domínio Próprio e Google Search Console
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Diagnóstico real de DNS para <span className="font-mono">nexusaistudio.com.br</span> e{' '}
                  <span className="font-mono">nexusaistudio.com</span>, URLs públicas indexáveis, Sitemap XML e
                  proteção <span className="font-mono">noindex</span> de rotas privadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchSeoDomainStatus(customDomainInput)}
                disabled={loadingSeoStatus}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
              >
                {loadingSeoStatus ? 'Verificando DNS...' : 'Atualizar Diagnóstico DNS'}
              </button>
            </div>

            {/* Custom Domain Live Lookup Bar */}
            <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Consultar qualquer domínio no DNS:</span>
              </div>
              <input
                type="text"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                placeholder="Ex: nexusaistudio.com.br"
                className="flex-1 px-3 py-2 bg-[#0B1024] border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={() => fetchSeoDomainStatus(customDomainInput)}
                disabled={loadingSeoStatus}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shrink-0"
              >
                Consultar DNS
              </button>
            </div>

            {seoDomainStatus && (
              <div className="space-y-6 pt-2">
                {/* Active Hosting & Sitemap URLs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-slate-400">URL Pública Oficial Atual (HTTPS)</span>
                    <a
                      href={seoDomainStatus.publicSharedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-cyan-400 hover:underline break-all flex items-center gap-1 font-semibold"
                    >
                      <span>{seoDomainStatus.publicSharedUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-slate-400">Endereço Oficial do Sitemap XML</span>
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-400 hover:underline break-all flex items-center gap-1 font-semibold"
                    >
                      <span>{seoDomainStatus.sitemapUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-slate-400">Arquivo robots.txt Ativo</span>
                    <a
                      href="/robots.txt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-purple-300 hover:underline break-all flex items-center gap-1 font-semibold"
                    >
                      <span>{seoDomainStatus.robotsTxtUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Live Domain DNS Results Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Resultado Real da Consulta DNS dos Domínios da Marca
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {seoDomainStatus.domainChecks?.map((dc: any) => (
                      <div
                        key={dc.domain}
                        className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-white text-sm">
                            {dc.domain}
                          </span>
                          {dc.registeredAndResolving ? (
                            <span className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[11px] font-semibold">
                              Já Registrado no DNS
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold">
                              Sem Registro DNS Ativo (Livre para Consulta)
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300">{dc.statusSummary}</p>
                        {dc.nsRecords?.length > 0 && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Servidores NS: {dc.nsRecords.join(', ')}
                          </div>
                        )}
                        {dc.aRecords?.length > 0 && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Registros A (IPv4): {dc.aRecords.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Public Indexable Routes vs Protected Private Routes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-2">
                    <div className="font-bold text-emerald-400">
                      Páginas Públicas Indexáveis pelo Google (No Sitemap XML)
                    </div>
                    <ul className="space-y-1.5 text-slate-300">
                      {seoDomainStatus.publicIndexableRoutes?.map((r: any) => (
                        <li key={r.path} className="flex items-center justify-between gap-2">
                          <span className="font-mono text-cyan-300">{r.path}</span>
                          <span className="text-slate-400 truncate">{r.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-2">
                    <div className="font-bold text-amber-300">
                      Rotas Privadas Protegidas (X-Robots-Tag: noindex, nofollow)
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Bloqueadas via cabeçalho HTTP <span className="font-mono">X-Robots-Tag</span>,
                      meta tag <span className="font-mono">robots</span> e{' '}
                      <span className="font-mono">Disallow</span> no <span className="font-mono">robots.txt</span>:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {seoDomainStatus.protectedNoIndexRoutes?.map((p: string) => (
                        <span
                          key={p}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
