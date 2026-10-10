import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bell,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Megaphone,
  MessageSquare,
  Volume2,
  VolumeX,
  ExternalLink,
} from 'lucide-react';
import {
  db,
  doc,
  setDoc,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  AnnouncementDoc,
  UserNotificationDoc,
  getCategoryLabel,
  formatFirestoreTimestamp,
} from '../views/NotificationsView';

interface NexusRobotAssistantProps {
  user: FirebaseUser | null;
  userPlanId: string;
  announcements: AnnouncementDoc[];
  readAnnouncementIds: Set<string>;
  userNotifications: UserNotificationDoc[];
  robotAlertsEnabled: boolean;
  onToggleRobotAlerts: (enabled: boolean) => void;
  onRequireAuth: () => void;
  onOpenNotificationsPage: () => void;
  onOpenFullChat: () => void;
}

interface RobotChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ROBOT_QUICK_QUESTIONS = [
  'Como usar cada uma das 8 ferramentas?',
  'Quais são as últimas atualizações publicadas?',
  'Como funcionam os planos Pro e Studio via Pix Nubank?',
  'Me ajude a criar um roteiro curto e magnético',
];

export const NexusRobotAssistant: React.FC<NexusRobotAssistantProps> = ({
  user,
  userPlanId,
  announcements,
  readAnnouncementIds,
  userNotifications,
  robotAlertsEnabled,
  onToggleRobotAlerts,
  onRequireAuth,
  onOpenNotificationsPage,
  onOpenFullChat,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'updates'>('assistant');
  const [dismissedBubbleIds, setDismissedBubbleIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nexus_robot_dismissed_alerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [chatHistory, setChatHistory] = useState<RobotChatMessage[]>([
    {
      id: 'welcome_nexus_bot',
      role: 'assistant',
      content:
        'Olá! Eu sou o NEXUS, o assistente inteligente oficial da plataforma. Posso tirar dúvidas sobre as 8 ferramentas de IA, ajudar a criar roteiros e títulos, orientar sobre os planos ou mostrar as atualizações publicadas.',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Filter real published announcements for the user's audience
  const eligibleAnnouncements = announcements.filter(
    (a) =>
      a.status === 'published' &&
      (a.targetAudience === 'all' || a.targetAudience === userPlanId)
  );

  const unreadAnnouncements = eligibleAnnouncements.filter(
    (a) => !readAnnouncementIds.has(a.id)
  );
  const unreadAccountNotifs = userNotifications.filter((n) => !n.read);
  const totalUnread = unreadAnnouncements.length + unreadAccountNotifs.length;

  // Find the latest unread announcement that hasn't been dismissed in the speech bubble
  const latestUnseenAnnouncement = robotAlertsEnabled
    ? unreadAnnouncements.find((a) => !dismissedBubbleIds.has(a.id)) || null
    : null;

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory.length, isOpen, isThinking]);

  const handleDismissBubble = (annId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(dismissedBubbleIds);
    next.add(annId);
    setDismissedBubbleIds(next);
    try {
      localStorage.setItem('nexus_robot_dismissed_alerts', JSON.stringify(Array.from(next)));
    } catch {
      // Ignore storage error
    }
  };

  const handleMarkAnnouncementRead = async (annId: string) => {
    handleDismissBubble(annId);
    if (!user) return;
    if (readAnnouncementIds.has(annId)) return;
    const readDocId = `${user.uid}_${annId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
    try {
      await setDoc(doc(db, 'notification_reads', readDocId), {
        id: readDocId,
        userId: user.uid,
        announcementId: annId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notification_reads/${readDocId}`);
    }
  };

  const handleSendRobotMessage = async (textToSend: string) => {
    setErrorMsg(null);
    const clean = textToSend.trim();
    if (!clean || isThinking) return;

    if (!user) {
      onRequireAuth();
      return;
    }

    const userMsg: RobotChatMessage = {
      id: `r_u_${Date.now()}`,
      role: 'user',
      content: clean,
    };
    setChatHistory((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsThinking(true);

    try {
      const token = await user.getIdToken();
      const announcementsContext = eligibleAnnouncements
        .slice(0, 5)
        .map(
          (a) =>
            `- [${getCategoryLabel(a.category)}] ${a.title}: ${a.message} (${formatFirestoreTimestamp(
              a.updatedAt || a.createdAt
            )})`
        )
        .join('\n');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: clean,
          history: chatHistory.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: 'robot',
          announcementsContext,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setInputPrompt(clean);
        setErrorMsg(
          data.error ||
            'Não foi possível responder agora. Seu texto foi preservado.'
        );
        setIsThinking(false);
        return;
      }

      const replyText = String(data.reply || '').trim();
      if (replyText) {
        setChatHistory((prev) => [
          ...prev,
          {
            id: `r_a_${Date.now()}`,
            role: 'assistant',
            content: replyText,
          },
        ]);
      }
    } catch {
      setInputPrompt(clean);
      setErrorMsg(
        'Erro de conexão ao consultar o motor Gemini AI. Seu texto foi preservado.'
      );
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
      {/* Proactive Real-Time Announcement Speech Bubble (Non-Repetitive) */}
      {!isOpen && latestUnseenAnnouncement && (
        <div className="mb-3 w-72 sm:w-80 p-3.5 rounded-2xl bg-[#0B1024]/95 backdrop-blur-xl border border-cyan-400/50 shadow-2xl text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
              <Megaphone className="w-3.5 h-3.5" />
              <span>{getCategoryLabel(latestUnseenAnnouncement.category)}</span>
            </span>
            <button
              type="button"
              onClick={(e) => handleDismissBubble(latestUnseenAnnouncement.id, e)}
              className="text-slate-400 hover:text-white p-0.5"
              aria-label="Dispensar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs font-bold text-white line-clamp-1">
            {latestUnseenAnnouncement.title}
          </p>
          <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
            {latestUnseenAnnouncement.message}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setActiveTab('updates');
              }}
              className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Ler comunicado
            </button>
            <button
              type="button"
              onClick={() => handleMarkAnnouncementRead(latestUnseenAnnouncement.id)}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Marcar como lido</span>
            </button>
          </div>
        </div>
      )}

      {/* Expanded NEXUS Robot Panel */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-32px)] sm:w-[390px] h-[520px] max-h-[78vh] rounded-2xl bg-[#070B19]/98 backdrop-blur-2xl border border-cyan-500/40 shadow-2xl flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0B1126] to-[#110D29] border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Mini Robot Icon */}
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center relative">
                <svg
                  viewBox="0 0 36 36"
                  className="w-5 h-5 text-cyan-300"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line
                    x1="18"
                    y1="3"
                    x2="18"
                    y2="8"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <circle cx="18" cy="3" r="2" fill="#A855F7" />
                  <rect
                    x="6"
                    y="8"
                    width="24"
                    height="18"
                    rx="6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="#050814"
                  />
                  <circle cx="13.5" cy="17" r="2.2" fill="#22D3EE" />
                  <circle cx="22.5" cy="17" r="2.2" fill="#22D3EE" />
                  <path
                    d="M13 22H23"
                    stroke="#A855F7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#070B19]" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Robô Inteligente NEXUS</span>
                </div>
                <div className="text-[10px] text-cyan-300">
                  Assistente Gemini AI · Central de Avisos
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleRobotAlerts(!robotAlertsEnabled)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70"
                title={
                  robotAlertsEnabled
                    ? 'Silenciar avisos automáticos do robô'
                    : 'Ativar avisos automáticos do robô'
                }
              >
                {robotAlertsEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70"
                aria-label="Fechar painel do robô NEXUS"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-800 bg-[#050814] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className={`py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'assistant'
                  ? 'border-cyan-400 text-white bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Assistente IA</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('updates')}
              className={`py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'updates'
                  ? 'border-purple-400 text-white bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Novidades</span>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-cyan-500 text-[#03050D] rounded tabular-nums">
                  {totalUnread}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: Interactive AI Assistant */}
          {activeTab === 'assistant' ? (
            <>
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {chatHistory.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-purple-600/35 border border-purple-500/40 text-white'
                          : 'bg-[#0B1024] border border-slate-800 text-slate-200'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {/* Quick Starter Prompts */}
                {chatHistory.length === 1 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Perguntas rápidas:
                    </div>
                    {ROBOT_QUICK_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendRobotMessage(q)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-[#0B1024] hover:bg-slate-800/80 border border-slate-800 text-xs text-cyan-200 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {isThinking && (
                  <div className="flex items-center gap-2 text-xs text-cyan-300 bg-[#0B1024] border border-cyan-500/30 rounded-xl p-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>NEXUS está consultando o Gemini AI...</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/40 text-[11px] text-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Footer Input */}
              <div className="p-2.5 border-t border-slate-800 bg-[#050814] space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendRobotMessage(inputPrompt);
                      }
                    }}
                    placeholder="Pergunte ao robô NEXUS..."
                    className="flex-1 bg-[#0B1024] border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none min-h-[38px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendRobotMessage(inputPrompt)}
                    disabled={!inputPrompt.trim() || isThinking}
                    className="nexus-btn-primary px-3 py-2 rounded-xl text-xs font-semibold min-h-[38px] disabled:opacity-40"
                    aria-label="Enviar pergunta ao NEXUS"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Base oficial NEXUS · Gemini AI</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenFullChat();
                    }}
                    className="text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    <span>Abrir tela cheia</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: Real-Time Updates & Notifications */
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Comunicados Publicados ({eligibleAnnouncements.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenNotificationsPage();
                  }}
                  className="text-[11px] font-semibold text-cyan-300 hover:underline"
                >
                  Ver Central Completa
                </button>
              </div>

              {eligibleAnnouncements.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0B1024] border border-slate-800 text-xs text-slate-400">
                  Nenhuma atualização publicada no momento.
                </div>
              ) : (
                eligibleAnnouncements.map((ann) => {
                  const isRead = readAnnouncementIds.has(ann.id);
                  return (
                    <div
                      key={ann.id}
                      className={`p-3.5 rounded-xl border space-y-1.5 ${
                        isRead
                          ? 'bg-[#090D1E] border-slate-800'
                          : 'bg-[#0F1734] border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-cyan-300">
                          {getCategoryLabel(ann.category)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatFirestoreTimestamp(ann.updatedAt || ann.createdAt)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {ann.message}
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Por {ann.authorEmail}</span>
                        {isRead ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <Check className="w-3 h-3" /> Lido
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkAnnouncementRead(ann.id)}
                            className="text-cyan-300 hover:text-white font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Marcar como lido
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Futuristic Animated NEXUS Robot Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center gap-2.5 p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-gradient-to-br from-[#0B122B] via-[#0F1736] to-[#1A103C] border border-cyan-400/50 hover:border-cyan-300 shadow-xl transition-all min-h-[52px]"
        aria-label="Abrir Assistente Robô NEXUS"
        title="Assistente Robô Inteligente NEXUS"
      >
        {/* Subtle Luminous Halo */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl bg-cyan-400/10 group-hover:bg-cyan-400/20 transition-colors pointer-events-none"
        />

        {/* Custom Futuristic NEXUS Robot Vector */}
        <div className="relative w-9 h-9 rounded-xl bg-[#050814] border border-cyan-400/40 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 40 40"
            className="w-6 h-6 text-cyan-300 group-hover:scale-105 transition-transform"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Robot Antenna */}
            <line
              x1="20"
              y1="3"
              x2="20"
              y2="9"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="20" cy="3" r="2.3" fill="#A855F7" />
            {/* Side Ears / Sensors */}
            <rect x="3" y="15" width="3" height="8" rx="1.5" fill="#22D3EE" />
            <rect x="34" y="15" width="3" height="8" rx="1.5" fill="#22D3EE" />
            {/* Robot Head Chassis */}
            <rect
              x="7"
              y="9"
              width="26"
              height="20"
              rx="7"
              stroke="currentColor"
              strokeWidth="2"
              fill="#070C1F"
            />
            {/* Visor Screen */}
            <rect
              x="10.5"
              y="13"
              width="19"
              height="9"
              rx="4"
              fill="#03050D"
              stroke="#67E8F9"
              strokeWidth="1.2"
            />
            {/* Glowing Eyes */}
            <circle cx="15.5" cy="17.5" r="2" fill="#22D3EE" />
            <circle cx="24.5" cy="17.5" r="2" fill="#22D3EE" />
            {/* Vocal Light Strip */}
            <path
              d="M15 25H25"
              stroke="#A855F7"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* Activity / Unread Badge */}
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-cyan-400 text-[#03050D] font-bold text-[10px] rounded-md shadow tabular-nums">
              {totalUnread}
            </span>
          )}
        </div>

        <div className="hidden sm:block text-left pr-1 relative z-10">
          <div className="text-xs font-bold text-white flex items-center gap-1">
            <span>NEXUS</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-[10px] text-cyan-300">
            {totalUnread > 0 ? `${totalUnread} novidade(s)` : 'Assistente IA'}
          </div>
        </div>
      </button>
    </div>
  );
};
