import React, { useState } from 'react';
import {
  Home,
  Wrench,
  CreditCard,
  ShoppingBag,
  LayoutDashboard,
  ShieldCheck,
  LogIn,
  FlaskConical,
  MessageSquarePlus,
  MessageSquare,
  Search,
  Bell,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Pencil,
  Trash2,
  Check,
  User,
} from 'lucide-react';
import { FirebaseUser } from '../firebase';

export type AppRoute =
  | 'home'
  | 'chat'
  | 'lab'
  | 'tools'
  | 'projects'
  | 'plans'
  | 'products'
  | 'notifications'
  | 'checkout'
  | 'dashboard'
  | 'admin'
  | 'terms'
  | 'privacy'
  | 'cancellation';

export interface ChatConversationSummary {
  id: string;
  userId: string;
  title: string;
  lastMessagePreview: string;
  messageCount: number;
  createdAt?: any;
  updatedAt?: any;
}

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: FirebaseUser | null;
  userPlanId?: string;
  isAdmin: boolean;
  onOpenAuth: () => void;
  // ChatGPT-style conversation controls
  conversations?: ChatConversationSummary[];
  activeConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onRenameConversation?: (conversationId: string, newTitle: string) => Promise<void> | void;
  onDeleteConversation?: (conversationId: string) => Promise<void> | void;
  // Unread notifications count
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  user,
  userPlanId = 'free',
  isAdmin,
  onOpenAuth,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  unreadNotificationsCount = 0,
}) => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Inline rename & delete confirmation state
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);

  const planDisplayLabel =
    userPlanId === 'studio'
      ? 'Plano Studio'
      : userPlanId === 'pro'
      ? 'Plano Pro'
      : 'Plano Gratuito';

  const filteredConversations = conversations.filter((c) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.lastMessagePreview || '').toLowerCase().includes(q)
    );
  });

  const handleSelectNav = (route: AppRoute) => {
    onNavigate(route);
    setIsMobileDrawerOpen(false);
  };

  const handleTriggerNewChat = () => {
    if (onNewConversation) {
      onNewConversation();
    } else {
      onNavigate('chat');
    }
    setIsMobileDrawerOpen(false);
  };

  const handleStartRename = (conv: ChatConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteConvId(null);
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = editingTitle.trim();
    if (trimmed && onRenameConversation) {
      await onRenameConversation(convId, trimmed);
    }
    setEditingConvId(null);
  };

  const handleConfirmDelete = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteConversation) {
      await onDeleteConversation(convId);
    }
    setConfirmDeleteConvId(null);
  };

  const renderSidebarContent = (collapsed: boolean, isMobile = false) => (
    <div className="flex flex-col h-full bg-[#050814] text-slate-200 select-none">
      {/* Top Header: Brand + Collapse/Close Toggle */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-3.5 border-b border-slate-800/80 shrink-0">
        {!collapsed && (
          <button
            type="button"
            onClick={() => handleSelectNav('home')}
            className="text-base font-bold tracking-tight nexus-animated-gradient-text truncate text-left focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
          >
            NEXUS AI STUDIO
          </button>
        )}

        {isMobile ? (
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Fechar menu lateral"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsDesktopCollapsed((prev) => !prev)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center mx-auto sm:mx-0"
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
      </div>

      {/* Primary Action: New Conversation Button */}
      <div className="p-3 shrink-0">
        <button
          type="button"
          onClick={handleTriggerNewChat}
          className={`nexus-btn-primary w-full rounded-xl font-semibold text-xs sm:text-sm flex items-center ${
            collapsed ? 'justify-center p-2.5' : 'justify-start gap-2.5 px-3.5 py-2.5'
          } min-h-[42px]`}
          title="Nova conversa com a IA"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Nova conversa</span>}
        </button>
      </div>

      {/* Scrollable Navigation & Conversation History */}
      <div className="flex-1 overflow-y-auto px-2.5 space-y-5 py-1">
        {/* Conversation Search & History Section (Expanded Mode) */}
        {!collapsed && (
          <div className="space-y-2">
            <div className="px-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Histórico de Conversas
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {conversations.length}
              </span>
            </div>

            {/* Search in conversation history */}
            <div className="relative flex items-center bg-[#090E22] border border-slate-800/90 focus-within:border-cyan-400/70 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Pesquisar conversas..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                aria-label="Pesquisar no histórico de conversas"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="text-slate-400 hover:text-white ml-1"
                  aria-label="Limpar pesquisa"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Conversation List */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              {!user ? (
                <p className="text-[11px] text-slate-500 px-2 py-2 leading-relaxed">
                  Faça login para salvar e sincronizar seu histórico de conversas.
                </p>
              ) : filteredConversations.length === 0 ? (
                <p className="text-[11px] text-slate-500 px-2 py-2">
                  {historySearch.trim()
                    ? 'Nenhuma conversa encontrada.'
                    : 'Nenhuma conversa iniciada ainda.'}
                </p>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected =
                    currentRoute === 'chat' && activeConversationId === conv.id;
                  const isEditing = editingConvId === conv.id;
                  const isConfirmingDelete = confirmDeleteConvId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        if (onSelectConversation) {
                          onSelectConversation(conv.id);
                        }
                        handleSelectNav('chat');
                      }}
                      className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-purple-600/25 border border-purple-500/40 text-white'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                      }`}
                    >
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            maxLength={100}
                            className="flex-1 bg-[#03050D] border border-cyan-400 rounded px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(conv.id, e)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                            title="Salvar nome"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingConvId(null);
                            }}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div
                          className="flex items-center justify-between w-full gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-rose-300 truncate">
                            Excluir conversa?
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleConfirmDelete(conv.id, e)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-semibold"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteConvId(null);
                              }}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate font-medium">{conv.title}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(conv, e)}
                              className="p-1 text-slate-400 hover:text-white rounded"
                              title="Renomear conversa"
                              aria-label="Renomear conversa"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(null);
                                setConfirmDeleteConvId(conv.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded"
                              title="Excluir conversa"
                              aria-label="Excluir conversa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Platform Navigation Sections */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Plataforma
            </div>
          )}

          {(
            [
              {
                id: 'chat' as AppRoute,
                label: 'Conversa IA',
                icon: MessageSquare,
              },
              {
                id: 'home' as AppRoute,
                label: 'Início (Estúdio 3D)',
                icon: Home,
              },
              {
                id: 'lab' as AppRoute,
                label: 'NEXUS LAB',
                icon: FlaskConical,
              },
              {
                id: 'tools' as AppRoute,
                label: 'Ferramentas de IA',
                icon: Wrench,
              },
              {
                id: 'projects' as AppRoute,
                label: 'Projetos salvos',
                icon: FolderKanban,
              },
              {
                id: 'plans' as AppRoute,
                label: 'Planos e preços',
                icon: CreditCard,
              },
              {
                id: 'products' as AppRoute,
                label: 'Produtos (Google Store)',
                icon: ShoppingBag,
              },
              {
                id: 'notifications' as AppRoute,
                label: 'Notificações',
                icon: Bell,
                badge: unreadNotificationsCount,
              },
              {
                id: 'dashboard' as AppRoute,
                label: 'Perfil e configurações',
                icon: LayoutDashboard,
              },
            ] as Array<{
              id: AppRoute;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
              badge?: number;
            }>
          ).map((item) => {
            const Icon = item.icon;
            const active =
              currentRoute === item.id ||
              (item.id === 'plans' && currentRoute === 'checkout');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[40px] ${
                  active
                    ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-cyan-400/50 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <Icon
                      className={`w-4 h-4 ${
                        active ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    />
                    {collapsed && item.badge && item.badge > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    ) : null}
                  </div>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 rounded-md tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSelectNav('admin')}
              title={collapsed ? 'Painel Administrativo' : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
              } rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[40px] ${
                currentRoute === 'admin'
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                  : 'text-cyan-400 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
                {!collapsed && <span className="truncate">Painel Admin</span>}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Footer: User Account & Plan Status */}
      <div className="p-3 border-t border-slate-800/80 shrink-0 bg-[#040611]">
        {user ? (
          <button
            type="button"
            onClick={() => handleSelectNav('dashboard')}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center p-2' : 'justify-between px-3 py-2.5'
            } rounded-xl bg-[#0B1024] hover:bg-[#111836] border border-slate-800 transition-colors min-h-[44px]`}
            title="Abrir Perfil e Configurações"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="text-left min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {user.displayName || user.email?.split('@')[0] || 'Criador'}
                  </div>
                  <div className="text-[11px] text-cyan-300 truncate">{planDisplayLabel}</div>
                </div>
              )}
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              onOpenAuth();
            }}
            className={`nexus-btn-primary w-full rounded-xl text-xs font-semibold flex items-center ${
              collapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-3.5 py-2.5'
            } min-h-[42px]`}
            title="Entrar ou criar conta"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Entrar / Criar conta</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar (Expandable / Collapsible) */}
      <aside
        aria-label="Menu Lateral Principal"
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen z-40 border-r border-slate-800/80 transition-all duration-200 ${
          isDesktopCollapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
      >
        {renderSidebarContent(isDesktopCollapsed, false)}
      </aside>

      {/* Mobile Top Bar with Top-Left Drawer Menu Button (No bottom bar blocking chat input) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#040611]/95 backdrop-blur-xl border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 rounded-lg bg-[#0B1024] border border-slate-800 text-slate-200 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleSelectNav('home')}
            className="text-sm font-bold tracking-tight nexus-animated-gradient-text truncate"
          >
            NEXUS AI STUDIO
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerNewChat}
            className="p-2 rounded-lg bg-[#0B1024] border border-slate-800 text-cyan-300 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Nova conversa"
            title="Nova conversa"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav('notifications')}
            className="relative p-2 rounded-lg bg-[#0B1024] border border-slate-800 text-slate-200 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Notificações e Atualizações"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-cyan-500 text-[#03050D] font-bold text-[10px] rounded-md tabular-nums">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => handleSelectNav('dashboard')}
              className="p-2 rounded-lg bg-purple-600/25 border border-purple-500/40 text-purple-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Perfil e Configurações"
            >
              <User className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="nexus-btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[38px]"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[285px] max-w-[85vw] h-full shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(false, true)}
          </div>
        </div>
      )}
    </>
  );
};
