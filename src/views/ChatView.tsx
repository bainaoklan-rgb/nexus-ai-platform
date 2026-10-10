import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Copy,
  Check,
  RefreshCw,
  Square,
  MessageSquarePlus,
  Sparkles,
  AlertCircle,
  Loader2,
  BookmarkPlus,
  FolderCheck,
  Pencil,
  Trash2,
  X,
  Wrench,
  FlaskConical,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import {
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { ChatConversationSummary } from '../components/Navbar';

export interface ChatMessageDoc {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
}

interface ChatViewProps {
  user: FirebaseUser | null;
  userDoc: Record<string, any> | null;
  appSettings: Record<string, any> | null;
  conversations: ChatConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onRequireAuth: () => void;
  onNavigatePlans: () => void;
  onNavigateLab: () => void;
  onNavigateTools: () => void;
  publishedAnnouncementsSummary?: string;
}

const QUICK_STARTER_PROMPTS = [
  {
    title: 'Criar roteiro de alta retenção',
    prompt:
      'Crie um roteiro completo de 60 segundos para Reels e TikTok sobre 3 ferramentas ou hábitos de produtividade para criadores de conteúdo, com gancho forte nos primeiros 3 segundos.',
  },
  {
    title: 'Gerar títulos magnéticos (CTR)',
    prompt:
      'Gere 10 títulos altamente clicáveis para YouTube sobre como crescer um canal do zero em 2026, incluindo sugestões de texto curto para a capa (Thumbnail).',
  },
  {
    title: 'Planejar calendário semanal',
    prompt:
      'Monte um cronograma semanal enxuto de produção em lote para publicar 5 vídeos curtos e 1 vídeo longo sem sobrecarga.',
  },
  {
    title: 'Conhecer recursos e planos NEXUS',
    prompt:
      'Explique como funcionam as 8 ferramentas criativas da NEXUS AI STUDIO, o NEXUS LAB e as diferenças entre os planos Gratuito, Pro e Studio.',
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  user,
  userDoc,
  appSettings,
  conversations,
  activeConversationId,
  onSelectConversation,
  onRequireAuth,
  onNavigatePlans,
  onNavigateLab,
  onNavigateTools,
  publishedAnnouncementsSummary = '',
}) => {
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedMsgId, setSavedMsgId] = useState<string | null>(null);
  const [savingMsgId, setSavingMsgId] = useState<string | null>(null);

  // Header rename/delete states for the active conversation
  const [isRenamingHeader, setIsRenamingHeader] = useState(false);
  const [headerTitleInput, setHeaderTitleInput] = useState('');
  const [confirmingDeleteHeader, setConfirmingDeleteHeader] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Listen to messages in the active conversation subcollection
  useEffect(() => {
    if (!user || !activeConversationId) {
      setMessages([]);
      return;
    }

    const messagesPath = `chat_conversations/${activeConversationId}/messages`;
    const q = query(
      collection(db, 'chat_conversations', activeConversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ChatMessageDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.userId === user.uid) {
            list.push({ ...(data as ChatMessageDoc), id: d.id });
          }
        });
        setMessages(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, messagesPath)
    );

    return () => unsub();
  }, [user, activeConversationId]);

  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isGenerating]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const ensureConversationDocument = async (firstUserText: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado.');
    if (activeConversationId) return activeConversationId;

    const newConvId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const autoTitle =
      firstUserText.trim().slice(0, 65) + (firstUserText.trim().length > 65 ? '...' : '');

    try {
      await setDoc(doc(db, 'chat_conversations', newConvId), {
        id: newConvId,
        userId: user.uid,
        title: autoTitle || 'Nova conversa',
        lastMessagePreview: firstUserText.trim().slice(0, 220),
        messageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onSelectConversation(newConvId);
      return newConvId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chat_conversations/${newConvId}`);
    }
  };

  const sendPromptToGemini = async (
    promptText: string,
    options?: { isRegeneration?: boolean }
  ) => {
    setErrorMsg(null);
    const cleanPrompt = promptText.trim();
    if (!cleanPrompt || isGenerating) return;

    if (!user) {
      onRequireAuth();
      return;
    }

    if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
      setErrorMsg(
        'Verifique seu endereço de e-mail antes de enviar mensagens para salvar seu histórico com segurança.'
      );
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const convId = await ensureConversationDocument(cleanPrompt);
      const currentConv = conversations.find((c) => c.id === convId);
      let nextCount = currentConv ? Number(currentConv.messageCount || 0) : messages.length;

      // Save user message if not regenerating last assistant response
      if (!options?.isRegeneration) {
        setInputMessage('');
        const userMsgId = `msg_${Date.now()}_u_${Math.random().toString(36).slice(2, 6)}`;
        await setDoc(doc(db, 'chat_conversations', convId, 'messages', userMsgId), {
          id: userMsgId,
          conversationId: convId,
          userId: user.uid,
          role: 'user',
          content: cleanPrompt.slice(0, 14500),
          createdAt: serverTimestamp(),
        });
        nextCount += 1;

        await updateDoc(doc(db, 'chat_conversations', convId), {
          lastMessagePreview: cleanPrompt.slice(0, 220),
          messageCount: nextCount,
          updatedAt: serverTimestamp(),
        });
      }

      const token = await user.getIdToken();
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: cleanPrompt,
          history: historyPayload,
          mode: 'chat',
          announcementsContext: publishedAnnouncementsSummary,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        // Restore user input if sending failed so user never loses typed text
        if (!options?.isRegeneration) {
          setInputMessage(cleanPrompt);
        }
        setErrorMsg(
          data.error ||
            'Não foi possível gerar a resposta no momento. Seu texto foi preservado.'
        );
        setIsGenerating(false);
        return;
      }

      const replyContent = String(data.reply || '').trim();
      if (replyContent) {
        const aiMsgId = `msg_${Date.now()}_a_${Math.random().toString(36).slice(2, 6)}`;
        await setDoc(doc(db, 'chat_conversations', convId, 'messages', aiMsgId), {
          id: aiMsgId,
          conversationId: convId,
          userId: user.uid,
          role: 'assistant',
          content: replyContent.slice(0, 14500),
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'chat_conversations', convId), {
          lastMessagePreview: replyContent.slice(0, 220),
          messageCount: nextCount + 1,
          updatedAt: serverTimestamp(),
        });

        // Also log in usage_history for unified telemetry
        const usageId = `use_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await setDoc(doc(db, 'usage_history', usageId), {
          id: usageId,
          userId: user.uid,
          toolId: 'assistente',
          toolName: 'Conversa IA NEXUS',
          promptSummary: cleanPrompt.slice(0, 480),
          outputPreview: replyContent.slice(0, 3800),
          dateKey: data.dateKey || new Date().toISOString().slice(0, 10),
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setErrorMsg('Geração interrompida pelo usuário.');
      } else {
        if (!options?.isRegeneration && !inputMessage) {
          setInputMessage(cleanPrompt);
        }
        setErrorMsg(
          'Falha de comunicação com o servidor Gemini AI. Seu texto foi preservado para tentar novamente.'
        );
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPromptToGemini(inputMessage);
    }
  };

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleRegenerateLast = () => {
    if (isGenerating) return;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      sendPromptToGemini(lastUserMessage.content, { isRegeneration: true });
    }
  };

  const handleSaveAsProject = async (msg: ChatMessageDoc) => {
    if (!user || savingMsgId) return;
    setSavingMsgId(msg.id);
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(db, 'saved_projects', projectId), {
        id: projectId,
        userId: user.uid,
        title: (activeConversation?.title || ' Ideia gerada no Chat IA').slice(0, 140),
        category: 'Texto',
        toolId: 'assistente',
        content: msg.content.slice(0, 14500),
        status: 'roteiro',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSavedMsgId(msg.id);
      setTimeout(() => setSavedMsgId(null), 2500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `saved_projects/${projectId}`);
    } finally {
      setSavingMsgId(null);
    }
  };

  const handleRenameActiveConversation = async () => {
    if (!user || !activeConversation) return;
    const trimmed = headerTitleInput.trim();
    if (!trimmed) return;
    try {
      await updateDoc(doc(db, 'chat_conversations', activeConversation.id), {
        title: trimmed.slice(0, 110),
        updatedAt: serverTimestamp(),
      });
      setIsRenamingHeader(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `chat_conversations/${activeConversation.id}`
      );
    }
  };

  const handleDeleteActiveConversation = async () => {
    if (!user || !activeConversation) return;
    const targetId = activeConversation.id;
    try {
      const msgSnap = await getDocs(
        collection(db, 'chat_conversations', targetId, 'messages')
      );
      for (const mDoc of msgSnap.docs) {
        await deleteDoc(doc(db, 'chat_conversations', targetId, 'messages', mDoc.id));
      }
      await deleteDoc(doc(db, 'chat_conversations', targetId));
      setConfirmingDeleteHeader(false);
      onSelectConversation(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chat_conversations/${targetId}`);
    }
  };

  const activePlanId = userDoc?.planId || 'free';
  const dailyLimit =
    activePlanId === 'studio'
      ? appSettings?.studioDailyLimit || 500
      : activePlanId === 'pro'
      ? appSettings?.proDailyLimit || 100
      : appSettings?.freeDailyLimit || 5;

  return (
    <div className="flex flex-col h-[calc(100vh-58px)] md:h-screen bg-[#03050D] relative">
      {/* Top Conversation Bar */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-[#050814]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {activeConversation ? (
            isRenamingHeader ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={headerTitleInput}
                  onChange={(e) => setHeaderTitleInput(e.target.value)}
                  maxLength={100}
                  className="bg-[#0B1024] border border-cyan-400 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleRenameActiveConversation}
                  className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                  title="Confirmar novo nome"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenamingHeader(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeConversation.title}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderTitleInput(activeConversation.title);
                    setIsRenamingHeader(true);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Renomear conversa"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {confirmingDeleteHeader ? (
                  <div className="flex items-center gap-1.5 ml-2 bg-rose-950/60 border border-rose-500/40 px-2.5 py-1 rounded-lg">
                    <span className="text-xs text-rose-200">Confirmar exclusão?</span>
                    <button
                      type="button"
                      onClick={handleDeleteActiveConversation}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteHeader(false)}
                      className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteHeader(true)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded"
                    title="Excluir conversa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h1 className="text-sm sm:text-base font-bold text-white">
                Assistente Criativo NEXUS IA
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-block text-xs text-slate-400">
            Limite do plano: <strong className="text-cyan-300">{dailyLimit}/dia</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectConversation(null);
              setErrorMsg(null);
            }}
            className="nexus-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px]"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nova conversa</span>
          </button>
        </div>
      </div>

      {/* Central Conversation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            /* Empty State: "Como posso ajudar você hoje?" */
            <div className="py-8 sm:py-14 text-center space-y-8">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-500/25 border border-cyan-400/40 flex items-center justify-center mx-auto shadow-lg">
                  <Sparkles className="w-7 h-7 text-cyan-300" />
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                  Como posso ajudar você hoje?
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Converse em tempo real com o motor Gemini AI do NEXUS AI STUDIO para criar
                  roteiros, títulos, descrições, planejamentos ou tirar dúvidas da plataforma.
                </p>
              </div>

              {/* Starter Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                {QUICK_STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendPromptToGemini(item.prompt)}
                    className="nexus-glass-card p-4 rounded-xl text-left space-y-1.5 group"
                  >
                    <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>

              {/* Quick Shortcuts to Specialized Modules */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={onNavigateLab}
                  className="nexus-btn-secondary px-4 py-2 rounded-xl flex items-center gap-2 min-h-[38px]"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Abrir NEXUS LAB</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateTools}
                  className="nexus-btn-secondary px-4 py-2 rounded-xl flex items-center gap-2 min-h-[38px]"
                >
                  <Wrench className="w-3.5 h-3.5 text-purple-400" />
                  <span>Ver as 8 Ferramentas Especializadas</span>
                </button>
              </div>
            </div>
          ) : (
            /* Messages Thread */
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isLastAssistant =
                !isUser && index === messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 ${
                      isUser
                        ? 'bg-gradient-to-br from-purple-600/35 to-blue-600/25 border border-purple-500/40 text-white'
                        : 'bg-[#0B1024] border border-slate-800/90 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                        {isUser ? 'Você' : 'NEXUS AI'}
                      </span>
                    </div>

                    <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
                      {msg.content}
                    </div>

                    {/* Action Bar on Assistant Messages */}
                    {!isUser && (
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#060916] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors min-h-[32px]"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar resposta</span>
                            </>
                          )}
                        </button>

                        {isLastAssistant && (
                          <button
                            type="button"
                            onClick={handleRegenerateLast}
                            disabled={isGenerating}
                            className="px-2.5 py-1.5 rounded-lg bg-[#060916] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[32px]"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                isGenerating ? 'animate-spin text-cyan-400' : ''
                              }`}
                            />
                            <span>Gerar novamente</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveAsProject(msg)}
                          disabled={savingMsgId === msg.id || savedMsgId === msg.id}
                          className="px-2.5 py-1.5 rounded-lg bg-[#060916] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors min-h-[32px]"
                        >
                          {savedMsgId === msg.id ? (
                            <>
                              <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Salvo em Projetos</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5 text-purple-400" />
                              <span>Salvar em Projetos</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Real Generation Indicator & Stop Button */}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-[#0B1024] border border-cyan-500/40 rounded-2xl p-4 flex items-center justify-between gap-4 max-w-md w-full">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-200 font-medium">
                    Processando resposta com Gemini AI...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-semibold text-rose-200 flex items-center gap-1.5 shrink-0 min-h-[32px]"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Interromper</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner (Preserves typed input) */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {errorMsg.includes('Limite diário') && (
                <button
                  type="button"
                  onClick={onNavigatePlans}
                  className="nexus-btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                >
                  Fazer Upgrade de Plano
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Bottom Message Input Box */}
      <div className="border-t border-slate-800/80 bg-[#050814]/95 backdrop-blur-xl px-4 sm:px-6 py-3.5 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2.5 bg-[#0B1024] border border-slate-700/90 focus-within:border-cyan-400 rounded-2xl p-2.5 shadow-inner">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Envie uma mensagem para o NEXUS AI... (Enter para enviar, Shift+Enter para nova linha)"
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none resize-none max-h-36 leading-relaxed px-1.5 py-1"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 min-h-[42px]"
                title="Interromper geração"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Parar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => sendPromptToGemini(inputMessage)}
                disabled={!inputMessage.trim()}
                className="nexus-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 min-h-[42px] disabled:opacity-40"
                title="Enviar mensagem (Enter)"
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Enter envia · Shift+Enter adiciona nova linha</span>
            <span>Histórico sincronizado no Cloud Firestore</span>
          </div>
        </div>
      </div>
    </div>
  );
};
