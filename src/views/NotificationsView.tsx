import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Sparkles,
  Wrench,
  AlertTriangle,
  Crown,
  Megaphone,
  Clock,
  ShieldCheck,
  Bot,
} from 'lucide-react';
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

export interface AnnouncementDoc {
  id: string;
  title: string;
  message: string;
  category: 'nova_ferramenta' | 'melhoria' | 'manutencao' | 'recurso' | 'plano';
  status: 'draft' | 'published' | 'archived';
  targetAudience: 'all' | 'free' | 'pro' | 'studio';
  authorUid: string;
  authorEmail: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserNotificationDoc {
  id: string;
  userId: string;
  eventKey: string;
  title: string;
  message: string;
  category: 'nova_ferramenta' | 'melhoria' | 'manutencao' | 'plano' | 'pedido';
  read: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface NotificationsViewProps {
  user: FirebaseUser | null;
  userPlanId: string;
  announcements: AnnouncementDoc[];
  readAnnouncementIds: Set<string>;
  userNotifications: UserNotificationDoc[];
  robotAlertsEnabled: boolean;
  onToggleRobotAlerts: (enabled: boolean) => void;
  onRequireAuth: () => void;
}

export function formatFirestoreTimestamp(ts: any): string {
  if (!ts) return 'Agora mesmo';
  if (typeof ts?.toDate === 'function') {
    return ts.toDate().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (typeof ts === 'string') {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return 'Recente';
}

export function getCategoryLabel(cat: string): string {
  switch (cat) {
    case 'nova_ferramenta':
      return 'Nova ferramenta disponível';
    case 'melhoria':
      return 'Melhoria na plataforma';
    case 'manutencao':
      return 'Manutenção programada';
    case 'recurso':
      return 'Mudança nos recursos';
    case 'plano':
      return 'Aviso sobre planos';
    case 'pedido':
      return 'Status de pedido Pix';
    default:
      return 'Comunicado oficial';
  }
}

export function getAudienceLabel(aud: string): string {
  switch (aud) {
    case 'free':
      return 'Plano Gratuito';
    case 'pro':
      return 'Plano Pro';
    case 'studio':
      return 'Plano Studio';
    default:
      return 'Todos os usuários';
  }
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  user,
  userPlanId,
  announcements,
  readAnnouncementIds,
  userNotifications,
  robotAlertsEnabled,
  onToggleRobotAlerts,
  onRequireAuth,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'announcements' | 'account'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Filter published announcements eligible for the user's audience
  const visibleAnnouncements = announcements.filter(
    (a) =>
      a.status === 'published' &&
      (a.targetAudience === 'all' || a.targetAudience === userPlanId)
  );

  const unreadAnnouncements = visibleAnnouncements.filter(
    (a) => !readAnnouncementIds.has(a.id)
  );
  const unreadAccountNotifs = userNotifications.filter((n) => !n.read);
  const totalUnreadCount = unreadAnnouncements.length + unreadAccountNotifs.length;

  const handleMarkAnnouncementRead = async (announcementId: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (readAnnouncementIds.has(announcementId)) return;
    setBusyId(announcementId);
    const readDocId = `${user.uid}_${announcementId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
    try {
      await setDoc(doc(db, 'notification_reads', readDocId), {
        id: readDocId,
        userId: user.uid,
        announcementId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notification_reads/${readDocId}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkUserNotifRead = async (notif: UserNotificationDoc) => {
    if (!user || notif.read) return;
    setBusyId(notif.id);
    try {
      await updateDoc(doc(db, 'user_notifications', notif.id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `user_notifications/${notif.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setMarkingAll(true);
    try {
      for (const ann of unreadAnnouncements) {
        const readDocId = `${user.uid}_${ann.id}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
        await setDoc(doc(db, 'notification_reads', readDocId), {
          id: readDocId,
          userId: user.uid,
          announcementId: ann.id,
          createdAt: serverTimestamp(),
        });
      }
      for (const notif of unreadAccountNotifs) {
        await updateDoc(doc(db, 'user_notifications', notif.id), {
          read: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notifications_mark_all');
    } finally {
      setMarkingAll(false);
    }
  };

  const renderCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'nova_ferramenta':
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'melhoria':
        return <Wrench className="w-4 h-4 text-purple-400" />;
      case 'manutencao':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'plano':
      case 'pedido':
        return <Crown className="w-4 h-4 text-emerald-400" />;
      default:
        return <Megaphone className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-20 space-y-8">
      {/* Header & Real-Time Counter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <Bell className="w-4 h-4" />
            <span>Central de Atualizações em Tempo Real · Cloud Firestore</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <span>Notificações e Comunicados</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 tabular-nums">
              {totalUnreadCount} não {totalUnreadCount === 1 ? 'lida' : 'lidas'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Acompanhe comunicados oficiais publicados pelos administradores e notificações
            internas automáticas da sua conta em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {user && totalUnreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="nexus-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[40px]"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{markingAll ? 'Marcando...' : 'Marcar todas como lidas'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Robot Notification Preferences Card */}
      <div className="p-4 sm:p-5 bg-[#0B1024] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Avisos de Novidades pelo Robô Inteligente NEXUS
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Quando ativado, o robô NEXUS avisa discretamente dentro da plataforma sempre que um
              novo comunicado oficial for publicado (sem repetir avisos já lidos).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleRobotAlerts(!robotAlertsEnabled)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 min-h-[38px] ${
            robotAlertsEnabled
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {robotAlertsEnabled ? 'Avisos do Robô: Ativados' : 'Avisos do Robô: Silenciados'}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: 'Todas' },
            { id: 'unread', label: `Não lidas (${totalUnreadCount})` },
            { id: 'announcements', label: `Comunicados Oficiais (${visibleAnnouncements.length})` },
            { id: 'account', label: `Alertas da Conta (${userNotifications.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[38px] ${
              activeFilter === tab.id
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                : 'bg-[#0B1024] border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section 1: Official Real-Time Platform Announcements */}
      {(activeFilter === 'all' ||
        activeFilter === 'unread' ||
        activeFilter === 'announcements') && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-cyan-400" />
            <span>Comunicados da Plataforma</span>
          </h2>

          {visibleAnnouncements.filter((a) =>
            activeFilter === 'unread' ? !readAnnouncementIds.has(a.id) : true
          ).length === 0 ? (
            <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl text-xs text-slate-400">
              Nenhum comunicado pendente nesta visualização.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAnnouncements
                .filter((a) =>
                  activeFilter === 'unread' ? !readAnnouncementIds.has(a.id) : true
                )
                .map((ann) => {
                  const isRead = readAnnouncementIds.has(ann.id);
                  return (
                    <div
                      key={ann.id}
                      className={`p-5 rounded-xl border transition-colors ${
                        isRead
                          ? 'bg-[#090D1E] border-slate-800/80'
                          : 'bg-[#0E1530] border-cyan-500/50 shadow-md'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderCategoryIcon(ann.category)}
                          <span className="text-xs font-bold text-cyan-300">
                            {getCategoryLabel(ann.category)}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-[11px] text-slate-400">
                            Público: {getAudienceLabel(ann.targetAudience)}
                          </span>
                          {!isRead && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 rounded">
                              Novo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatFirestoreTimestamp(ann.updatedAt || ann.createdAt)}</span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <h3 className="text-base font-bold text-white">{ann.title}</h3>
                        <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {ann.message}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                            <span>Admin responsável: {ann.authorEmail}</span>
                          </span>
                          <span className="font-mono text-slate-500">ID: {ann.id}</span>
                        </div>

                        {isRead ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcado como lido</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkAnnouncementRead(ann.id)}
                            disabled={busyId === ann.id}
                            className="nexus-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto min-h-[34px]"
                          >
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                            <span>
                              {busyId === ann.id ? 'Salvando...' : 'Marcar como lido'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Automatic Internal Client Notifications */}
      {(activeFilter === 'all' ||
        activeFilter === 'unread' ||
        activeFilter === 'account') && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            <span>Mensagens Automáticas Internas da Sua Conta</span>
          </h2>

          {!user ? (
            <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-slate-300">
                Faça login para visualizar os alertas automáticos da sua conta e pedidos Pix.
              </p>
              <button
                type="button"
                onClick={onRequireAuth}
                className="nexus-btn-primary px-4 py-2 rounded-lg text-xs font-semibold shrink-0"
              >
                Entrar na Conta
              </button>
            </div>
          ) : userNotifications.filter((n) =>
              activeFilter === 'unread' ? !n.read : true
            ).length === 0 ? (
            <div className="p-6 bg-[#0B1024] border border-slate-800 rounded-xl text-xs text-slate-400">
              Nenhuma notificação automática pendente na sua conta.
            </div>
          ) : (
            <div className="space-y-3">
              {userNotifications
                .filter((n) => (activeFilter === 'unread' ? !n.read : true))
                .map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 sm:p-5 rounded-xl border transition-colors ${
                      notif.read
                        ? 'bg-[#090D1E] border-slate-800/80'
                        : 'bg-[#101736] border-purple-500/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {renderCategoryIcon(notif.category)}
                        <span className="text-xs font-bold text-purple-300">
                          {getCategoryLabel(notif.category)}
                        </span>
                        {!notif.read && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/20 text-purple-200 border border-purple-400/40 rounded">
                            Não lida
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatFirestoreTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mt-2">{notif.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono text-slate-500">
                        Evento: {notif.eventKey}
                      </span>
                      {notif.read ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Lida</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkUserNotifRead(notif)}
                          disabled={busyId === notif.id}
                          className="nexus-btn-secondary px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Marcar como lida</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
