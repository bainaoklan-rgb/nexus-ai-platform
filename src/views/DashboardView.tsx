import React, { useState, useEffect } from 'react';
import {
  User,
  FolderKanban,
  History,
  ShoppingBag,
  HelpCircle,
  Settings,
  LogOut,
  Trash2,
  Copy,
  Check,
  Download,
  Send,
  Wrench,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  db,
  auth,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  signOut,
  deleteUser,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  CREATOR_TOOLS,
  CreatorTool,
  DEFAULT_PLANS,
  formatCurrencyBRL,
} from '../data/catalog';
import { AppRoute } from '../components/Navbar';

interface DashboardViewProps {
  user: FirebaseUser;
  userDoc: Record<string, any> | null;
  userProfile: Record<string, any> | null;
  appSettings?: Record<string, any> | null;
  isAdmin: boolean;
  initialTab?: 'overview' | 'projects' | 'history' | 'orders' | 'support' | 'settings';
  onSelectTool: (tool: CreatorTool) => void;
  onNavigate: (route: AppRoute) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  userDoc,
  userProfile,
  appSettings,
  isAdmin,
  initialTab = 'overview',
  onSelectTool,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'projects' | 'history' | 'orders' | 'support' | 'settings'
  >(initialTab);

  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState(userDoc?.displayName || user.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [niche, setNiche] = useState(userProfile?.niche || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  // New project manual form
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjCategory, setNewProjCategory] = useState<
    'Texto' | 'Imagem' | 'Vídeo' | 'Produtividade'
  >('Vídeo');
  const [newProjContent, setNewProjContent] = useState('');
  const [creatingProj, setCreatingProj] = useState(false);

  // Support ticket form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketFeedback, setTicketFeedback] = useState<string | null>(null);

  // Account deletion confirmation
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setDisplayName(userDoc?.displayName || user.displayName || '');
  }, [userDoc, user.displayName]);

  useEffect(() => {
    if (userProfile) {
      setPhone(userProfile.phone || '');
      setNiche(userProfile.niche || '');
      setBio(userProfile.bio || '');
    }
  }, [userProfile]);

  // Real-time listeners for authenticated user's own data
  useEffect(() => {
    const qProjects = query(collection(db, 'saved_projects'), where('userId', '==', user.uid));
    const unsubProjects = onSnapshot(
      qProjects,
      (snap) => {
        const items = snap.docs.map((d) => d.data());
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setSavedProjects(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'saved_projects')
    );

    const qHistory = query(collection(db, 'usage_history'), where('userId', '==', user.uid));
    const unsubHistory = onSnapshot(
      qHistory,
      (snap) => {
        const items = snap.docs.map((d) => d.data());
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setUsageHistory(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'usage_history')
    );

    const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubOrders = onSnapshot(
      qOrders,
      (snap) => {
        const items = snap.docs.map((d) => d.data());
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setOrders(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const qPayments = query(collection(db, 'payments'), where('userId', '==', user.uid));
    const unsubPayments = onSnapshot(
      qPayments,
      (snap) => {
        const items = snap.docs.map((d) => d.data());
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPayments(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
    );

    const qTickets = query(collection(db, 'support_tickets'), where('userId', '==', user.uid));
    const unsubTickets = onSnapshot(
      qTickets,
      (snap) => {
        const items = snap.docs.map((d) => d.data());
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTickets(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets')
    );

    return () => {
      unsubProjects();
      unsubHistory();
      unsubOrders();
      unsubPayments();
      unsubTickets();
    };
  }, [user.uid]);

  const currentPlanId = userDoc?.planId || 'free';
  const basePlan = DEFAULT_PLANS.find((p) => p.id === currentPlanId) || DEFAULT_PLANS[0];
  const configuredLimit =
    currentPlanId === 'studio'
      ? appSettings?.studioDailyLimit || basePlan.dailyLimit
      : currentPlanId === 'pro'
      ? appSettings?.proDailyLimit || basePlan.dailyLimit
      : appSettings?.freeDailyLimit || basePlan.dailyLimit;

  const todayKey = new Date().toISOString().slice(0, 10);
  const usedTodayCount = usageHistory.filter((h) => h.dateKey === todayKey).length;

  const handleCopyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateManualProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim() || !newProjContent.trim()) return;
    setCreatingProj(true);
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await setDoc(doc(db, 'saved_projects', projectId), {
        id: projectId,
        userId: user.uid,
        title: newProjTitle.trim().slice(0, 150),
        category: newProjCategory,
        toolId: 'organizador',
        content: newProjContent.trim().slice(0, 14500),
        status: 'ideia',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewProjTitle('');
      setNewProjContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `saved_projects/${projectId}`);
    } finally {
      setCreatingProj(false);
    }
  };

  const handleUpdateProjectStatus = async (project: any, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'saved_projects', project.id), {
        title: project.title,
        category: project.category,
        content: project.content,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `saved_projects/${project.id}`);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteDoc(doc(db, 'saved_projects', projectId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `saved_projects/${projectId}`);
    }
  };

  const handleCancelOrder = async (order: any) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleDownloadPaidProduct = async (order: any) => {
    setDownloadFeedback(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(
        `/api/products/${encodeURIComponent(order.itemId)}/download?orderId=${encodeURIComponent(
          order.id
        )}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setDownloadFeedback(data.error || 'Download não autorizado.');
        return;
      }

      const blob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || `${order.itemId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadFeedback(`Download concluído: ${data.fileName}`);
    } catch {
      setDownloadFeedback('Erro ao comunicar com o servidor para download.');
    }
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketSubject.trim().length < 3 || ticketMessage.trim().length < 5) return;
    setSendingTicket(true);
    setTicketFeedback(null);
    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await setDoc(doc(db, 'support_tickets', ticketId), {
        id: ticketId,
        userId: user.uid,
        userEmail: (user.email || 'sem-email@nexus.app').slice(0, 150),
        subject: ticketSubject.trim().slice(0, 150),
        message: ticketMessage.trim().slice(0, 2000),
        status: 'open',
        adminReply: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTicketSubject('');
      setTicketMessage('');
      setTicketFeedback('Chamado registrado com sucesso no banco de dados.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `support_tickets/${ticketId}`);
    } finally {
      setSendingTicket(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSavingProfile(true);
    setProfileFeedback(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim().slice(0, 100),
        photoURL: (userDoc?.photoURL || user.photoURL || '').slice(0, 500),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'user_profiles', user.uid), {
        phone: phone.trim().slice(0, 30),
        bio: bio.trim().slice(0, 500),
        niche: niche.trim().slice(0, 100),
        updatedAt: serverTimestamp(),
      });
      setProfileFeedback('Perfil e preferências atualizados com sucesso.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `user_profiles/${user.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccountPermanently = async () => {
    if (confirmDeleteText !== 'EXCLUIR MINHA CONTA') {
      setDeleteError('Digite exatamente EXCLUIR MINHA CONTA para confirmar.');
      return;
    }
    setDeleteError(null);
    try {
      for (const proj of savedProjects) {
        await deleteDoc(doc(db, 'saved_projects', proj.id));
      }
      await deleteDoc(doc(db, 'user_profiles', user.uid));
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      onNavigate('home');
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setDeleteError(
          'Por segurança, faça logout e login novamente antes de concluir a exclusão definitiva da conta.'
        );
      } else {
        setDeleteError(err?.message || 'Erro ao excluir conta.');
      }
    }
  };

  const renderStatusBadge = (status: string) => {
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

  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
  const remainingTodayCount = Math.max(0, configuredLimit - usedTodayCount);
  const usagePercentage = Math.min(
    100,
    Math.round((usedTodayCount / Math.max(1, configuredLimit)) * 100)
  );

  // Derive real recently used tools from the user's actual Firestore usage_history
  const recentToolIds = Array.from(
    new Set(usageHistory.map((item) => item.toolId).filter(Boolean))
  ).slice(0, 4);
  const recentTools = recentToolIds
    .map((id) => CREATOR_TOOLS.find((t) => t.id === id))
    .filter((t): t is CreatorTool => Boolean(t));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 relative z-10">
      {/* Top Personalized Greeting & User Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Painel Personalizado do Criador</span>
            <span aria-hidden="true">·</span>
            <span>ID: {user.uid.slice(0, 10)}...</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400 font-semibold">Plano {basePlan.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            {timeGreeting}, {userDoc?.displayName || user.displayName || 'Criador'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe suas utilizações do dia, projetos salvos, histórico de gerações e pedidos em
            tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('lab')}
            className="nexus-btn-primary px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <span>Abrir NEXUS LAB</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-lg hover:bg-cyan-900/60 flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Painel Administrativo</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="nexus-btn-secondary px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>

      {/* Real-Time KPI Metrics Row (Zero invented stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="p-5 nexus-glass-card rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Plano Atual (Verificado no Servidor)</span>
            <div className="text-xl font-bold text-white mt-1">Plano {basePlan.name}</div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('plans')}
            className="text-left text-xs text-purple-300 hover:text-cyan-300 mt-3 font-semibold transition-colors"
          >
            Acessar planos ou fazer upgrade via Pix →
          </button>
        </div>

        <div className="p-5 nexus-glass-card rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Utilizações do Dia</span>
              <span className="font-mono tabular-nums text-cyan-300">{usagePercentage}%</span>
            </div>
            <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">
              {usedTodayCount} / {configuredLimit}
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-slate-400 mt-2 block font-mono tabular-nums">
            Limite restante hoje: <strong className="text-white">{remainingTodayCount}</strong>
          </span>
        </div>

        <div className="p-5 nexus-glass-card rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Projetos e Histórico</span>
            <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">
              {savedProjects.length} projetos · {usageHistory.length} gerações
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className="text-left text-xs text-cyan-300 hover:text-white mt-3 font-semibold transition-colors"
          >
            Gerenciar projetos salvos →
          </button>
        </div>

        <div className="p-5 nexus-glass-card rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Pedidos e Conta</span>
            <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">
              {orders.length} pedidos · {payments.length} pagamentos
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="text-xs text-purple-300 hover:text-white font-semibold transition-colors"
            >
              Ver pedidos →
            </button>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="text-xs text-slate-300 hover:text-white font-semibold transition-colors"
            >
              Configurações →
            </button>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#070B19] border border-slate-800 rounded-xl overflow-x-auto mb-6">
        {[
          { id: 'overview', label: 'Visão Geral & Ferramentas', icon: Wrench },
          { id: 'projects', label: `Projetos Salvos (${savedProjects.length})`, icon: FolderKanban },
          { id: 'history', label: `Histórico de Gerações (${usageHistory.length})`, icon: History },
          { id: 'orders', label: `Pedidos e Pagamentos (${orders.length})`, icon: ShoppingBag },
          { id: 'support', label: 'Ajuda e Suporte', icon: HelpCircle },
          { id: 'settings', label: 'Configurações da Conta', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                active
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Personalized Overview, Recent Tools, Recent Activity & All Tools */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Recently Used Tools Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Ferramentas Recentes da Sua Conta</h2>
              <button
                type="button"
                onClick={() => onNavigate('lab')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Explorar no NEXUS LAB →
              </button>
            </div>
            {recentTools.length === 0 ? (
              <div className="p-6 nexus-glass rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Você ainda não executou nenhuma ferramenta hoje.
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Escolha qualquer uma das 8 ferramentas abaixo para gerar seu primeiro roteiro,
                    título ou planejamento real com o Gemini AI.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTool(CREATOR_TOOLS[0])}
                  className="nexus-btn-primary px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  Começar Primeira Geração
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => onSelectTool(tool)}
                    className="text-left p-4 nexus-glass-card rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-[11px] text-cyan-300 font-medium">
                        Recente · {tool.category}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">{tool.name}</h3>
                    </div>
                    <span className="text-xs font-semibold text-purple-300 mt-3 inline-block">
                      Executar novamente →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* All 8 Available AI Tools Shortcuts */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">Atalhos para Todas as Ferramentas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {CREATOR_TOOLS.map((tool) => (
                <div
                  key={tool.id}
                  className="p-5 nexus-glass-card rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs text-slate-400 mb-1">{tool.category}</div>
                    <h3 className="text-base font-bold text-white">{tool.name}</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {tool.shortDescription}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTool(tool)}
                    className="nexus-btn-primary mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg min-h-[40px]"
                  >
                    Abrir Ferramenta →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Saved Projects & Recent Generation History Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="nexus-glass rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Projetos Salvos Recentes</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className="text-xs text-purple-300 hover:text-white font-semibold"
                >
                  Ver todos ({savedProjects.length}) →
                </button>
              </div>
              {savedProjects.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    Nenhum projeto salvo no momento. Salve roteiros ou crie pautas para organizar
                    sua produção.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    className="nexus-btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Criar Primeiro Projeto
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedProjects.slice(0, 3).map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3.5 bg-[#050814] border border-slate-800 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{proj.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {proj.category} · Etapa: {String(proj.status || 'ideia').toUpperCase()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('projects')}
                        className="text-xs text-cyan-300 hover:text-white font-medium shrink-0"
                      >
                        Abrir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="nexus-glass rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Últimas Gerações com IA</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-cyan-300 hover:text-white font-semibold"
                >
                  Ver histórico ({usageHistory.length}) →
                </button>
              </div>
              {usageHistory.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    Seu histórico de gerações está vazio. Execute uma ferramenta para registrar sua
                    primeira criação.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectTool(CREATOR_TOOLS[0])}
                    className="nexus-btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Executar Gerador de Roteiros
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {usageHistory.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-[#050814] border border-slate-800 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {item.promptSummary}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.toolName} · <span className="font-mono">{item.dateKey}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="text-xs text-purple-300 hover:text-white font-medium shrink-0"
                      >
                        Ver
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Saved Projects */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateManualProject}
            className="lg:col-span-4 p-5 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4 h-fit"
          >
            <h3 className="text-base font-bold text-white">Novo Projeto ou Pauta</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Título do Projeto</label>
              <input
                type="text"
                required
                maxLength={140}
                value={newProjTitle}
                onChange={(e) => setNewProjTitle(e.target.value)}
                placeholder="Ex: Roteiro Vídeo 01 - Produtividade"
                className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Categoria</label>
              <select
                value={newProjCategory}
                onChange={(e) => setNewProjCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white min-h-[40px]"
              >
                <option value="Vídeo">Vídeo</option>
                <option value="Texto">Texto</option>
                <option value="Produtividade">Produtividade</option>
                <option value="Imagem">Imagem</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Conteúdo / Anotações</label>
              <textarea
                rows={5}
                required
                maxLength={14000}
                value={newProjContent}
                onChange={(e) => setNewProjContent(e.target.value)}
                placeholder="Cole ou escreva seu roteiro, pauta ou planejamento..."
                className="w-full p-3 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={creatingProj}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg min-h-[40px]"
            >
              {creatingProj ? 'Salvando...' : 'Salvar Projeto no Banco'}
            </button>
          </form>

          <div className="lg:col-span-8 space-y-4">
            {savedProjects.length === 0 ? (
              <div className="p-8 bg-[#0B1024] border border-slate-800 rounded-xl text-center">
                <p className="text-sm font-medium text-slate-300">
                  Você ainda não possui projetos salvos.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Gere conteúdos nas ferramentas de IA e clique em "Salvar Projeto" ou cadastre uma
                  pauta ao lado.
                </p>
              </div>
            ) : (
              savedProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{proj.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>Etapa: {String(proj.status || 'ideia').toUpperCase()}</span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-0.5">{proj.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={proj.status || 'ideia'}
                        onChange={(e) => handleUpdateProjectStatus(proj, e.target.value)}
                        className="px-2.5 py-1.5 bg-[#060916] border border-slate-700 rounded-lg text-xs text-slate-200"
                      >
                        <option value="ideia">Ideia</option>
                        <option value="roteiro">Roteiro</option>
                        <option value="gravacao">Gravação</option>
                        <option value="edicao">Edição</option>
                        <option value="publicado">Publicado</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleCopyText(proj.id, proj.content)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                        title="Copiar conteúdo"
                      >
                        {copiedId === proj.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        className="p-2 bg-red-950/50 hover:bg-red-900/70 text-red-300 rounded-lg"
                        title="Excluir projeto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 bg-[#060916] p-3.5 rounded-lg border border-slate-800/80 max-h-60 overflow-y-auto">
                    {proj.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Usage History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {usageHistory.length === 0 ? (
            <div className="p-8 bg-[#0B1024] border border-slate-800 rounded-xl text-center">
              <p className="text-sm font-medium text-slate-300">
                Nenhuma execução registrada até o momento.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cada vez que você utiliza uma ferramenta com Gemini AI, o registro aparece aqui.
              </p>
            </div>
          ) : (
            usageHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#0B1024] border border-slate-800 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <span className="font-semibold text-purple-400">{item.toolName}</span>
                    <span className="mx-2">·</span>
                    <span className="tabular-nums">{item.dateKey}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(item.id, item.outputPreview)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-md flex items-center gap-1"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-medium text-white">Tema: {item.promptSummary}</p>
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-400 bg-[#060916] p-3 rounded-lg max-h-40 overflow-y-auto">
                  {item.outputPreview}
                </pre>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: User Orders & Payments History */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {downloadFeedback && (
            <div className="p-3.5 bg-slate-900 border border-cyan-500/40 rounded-lg text-xs text-cyan-200">
              {downloadFeedback}
            </div>
          )}

          {/* Section A: User Orders */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white">Histórico de Pedidos da Conta</h3>
                <p className="text-xs text-slate-400">
                  Pedidos criados para planos ou produtos digitais e seu status real no servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('plans')}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg"
              >
                Novo Pedido / Alterar Plano
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 bg-[#0B1024] border border-slate-800 rounded-xl text-center">
                <p className="text-sm font-medium text-slate-300">
                  Você ainda não possui pedidos registrados.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('plans')}
                    className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Conhecer Planos
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('products')}
                    className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg"
                  >
                    Visitar Loja Digital
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto bg-[#0B1024] border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400">
                      <th className="py-3 px-4">ID Único</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Plano / Descrição</th>
                      <th className="py-3 px-4 text-right">Preço</th>
                      <th className="py-3 px-4">Cobrança Pix Nubank</th>
                      <th className="py-3 px-4">Status Real</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {orders.map((ord) => {
                      const fallbackLink =
                        ord.itemId === 'studio'
                          ? appSettings?.studioPixLink ||
                            'https://nubank.com.br/cobrar/90ldd3/6ac97b26-1c25-48d6-b267-b7a4d750f7fb'
                          : appSettings?.proPixLink ||
                            appSettings?.pixKey ||
                            'https://nubank.com.br/cobrar/90ldd3/6ac97ae0-2ce1-4d8f-a685-c673c40677f5';
                      const pixToCopy = String(ord.pixCopyPaste || fallbackLink).trim();
                      const formattedDate = ord.createdAt?.seconds
                        ? new Date(ord.createdAt.seconds * 1000).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Agora';
                      return (
                        <tr key={ord.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                            {ord.id}
                          </td>
                          <td className="py-3 px-4 text-slate-400 tabular-nums whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{ord.itemTitle}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-200 tabular-nums">
                            {formatCurrencyBRL(ord.amountCents)}
                          </td>
                          <td className="py-3 px-4">
                            {pixToCopy ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {pixToCopy.startsWith('https://') && (
                                  <a
                                    href={pixToCopy}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-md inline-flex items-center gap-1 font-semibold text-[11px]"
                                  >
                                    <span>Abrir Link Nubank</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(`pix_${ord.id}`, pixToCopy)}
                                  className="px-2.5 py-1 bg-purple-950/60 border border-purple-500/40 hover:bg-purple-900/60 text-purple-200 rounded-md inline-flex items-center gap-1.5 font-mono text-[11px]"
                                >
                                  {copiedId === `pix_${ord.id}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>Copiado</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copiar Link</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500">Aguardando chave do admin</span>
                            )}
                          </td>
                          <td className="py-3 px-4">{renderStatusBadge(ord.status)}</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {ord.itemType === 'product' && ord.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleDownloadPaidProduct(ord)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Baixar Arquivo</span>
                              </button>
                            )}
                            {(ord.status === 'awaiting_payment' ||
                              ord.status === 'pending_pix' ||
                              ord.status === 'pending_configuration') && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(ord)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-200 rounded-md"
                              >
                                Cancelar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section B: User Payments History */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">
                Histórico de Pagamentos Processados da Sua Conta
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Registros oficiais da coleção <span className="font-mono">payments</span> gerados
              quando o administrador confirma ou atualiza um pagamento Pix no servidor.
            </p>

            {payments.length === 0 ? (
              <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Nenhum pagamento confirmado registrado para sua conta até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto bg-[#0B1024] border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-4">ID do Pagamento</th>
                      <th className="py-3 px-4">Pedido Vinculado</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                          {pay.id}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{pay.orderId}</td>
                        <td className="py-3 px-4 text-slate-200">{pay.provider}</td>
                        <td className="py-3 px-4 text-right font-mono text-white tabular-nums">
                          {formatCurrencyBRL(pay.amountCents)}
                        </td>
                        <td className="py-3 px-4">{renderStatusBadge(pay.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Help & Support */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateSupportTicket}
            className="lg:col-span-5 p-5 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4 h-fit"
          >
            <h3 className="text-base font-bold text-white">Abrir Chamado de Suporte</h3>
            {ticketFeedback && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-200">
                {ticketFeedback}
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-300 mb-1">Assunto</label>
              <input
                type="text"
                required
                maxLength={140}
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Ex: Dúvida sobre limite do plano ou pedido Pix"
                className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Mensagem Detalhada</label>
              <textarea
                rows={4}
                required
                maxLength={1900}
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Descreva como podemos ajudar..."
                className="w-full p-3 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={sendingTicket}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 min-h-[40px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingTicket ? 'Enviando...' : 'Enviar Chamado'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {tickets.length === 0 ? (
              <div className="p-8 bg-[#0B1024] border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                Nenhum chamado de suporte aberto.
              </div>
            ) : (
              tickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="p-4 bg-[#0B1024] border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{tkt.subject}</span>
                    <span className="font-mono text-cyan-400">{tkt.status.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-300">{tkt.message}</p>
                  {tkt.adminReply && (
                    <div className="p-3 bg-[#060916] border border-purple-500/30 rounded-lg text-xs text-purple-200 mt-2">
                      <span className="font-semibold block mb-1">Resposta do Suporte:</span>
                      {tkt.adminReply}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Account Settings & Deletion */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-7 p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              <span>Dados do Perfil e Preferências Criativas</span>
            </h3>

            {profileFeedback && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-200">
                {profileFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  required
                  maxLength={90}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  E-mail Autenticado (Isolado)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full px-3 py-2 bg-[#060916]/50 border border-slate-800 rounded-lg text-xs text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nicho Principal</label>
                <input
                  type="text"
                  maxLength={90}
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ex: Tecnologia, Educação, Gastronomia"
                  className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Telefone / WhatsApp (Privado)
                </label>
                <input
                  type="text"
                  maxLength={25}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-0000"
                  className="w-full px-3 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Biografia / Notas do Canal</label>
              <textarea
                rows={3}
                maxLength={450}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg min-h-[40px]"
            >
              {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>

          {/* Danger Zone: Account Deletion */}
          <div className="lg:col-span-5 p-6 bg-[#0B1024] border border-red-900/50 rounded-xl space-y-4 h-fit">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Exclusão Permanente de Conta</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você pode encerrar sua conta e remover seus dados de perfil e projetos salvos do Cloud
              Firestore a qualquer momento. Esta ação é irreversível.
            </p>
            {deleteError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200">
                {deleteError}
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Para confirmar, digite{' '}
                <span className="font-mono text-red-300">EXCLUIR MINHA CONTA</span>
              </label>
              <input
                type="text"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                placeholder="EXCLUIR MINHA CONTA"
                className="w-full px-3 py-2 bg-[#060916] border border-red-900/60 rounded-lg text-xs text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleDeleteAccountPermanently}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg min-h-[40px]"
            >
              Excluir Minha Conta Permanentemente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
