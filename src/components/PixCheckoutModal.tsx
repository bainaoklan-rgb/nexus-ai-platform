import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Loader2,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { formatCurrencyBRL, OFFICIAL_NUBANK_PIX_LINKS } from '../data/catalog';
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

export interface CheckoutItem {
  itemType: 'plan' | 'product';
  itemId: string;
  title: string;
  priceCents: number;
  description: string;
  pixPaymentLink?: string;
  autoCreateOrder?: boolean;
}

interface PixCheckoutModalProps {
  item: CheckoutItem | null;
  onClose: () => void;
  user: FirebaseUser | null;
  appSettings?: Record<string, any> | null;
  onRequireAuth: () => void;
  onOrderCreated?: () => void;
  onGoToOrders?: () => void;
  asPage?: boolean;
}

export const PixCheckoutModal: React.FC<PixCheckoutModalProps> = ({
  item,
  onClose,
  user,
  appSettings,
  onRequireAuth,
  onOrderCreated,
  onGoToOrders,
  asPage = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [orderState, setOrderState] = useState<{
    orderId: string;
    configured: boolean;
    status: 'awaiting_payment' | 'approved' | 'cancelled' | string;
    pixPaymentLink: string;
    pixKeyType: string;
    pixHolderName: string;
    pixBankName: string;
    externalReference: string;
    amountCents: number;
    message: string;
  } | null>(null);

  const autoTriggeredRef = useRef<string | null>(null);

  const resolvePlanPixLink = (): string => {
    if (!item) return '';
    if (item.itemType === 'plan' && item.itemId === 'pro') {
      return String(
        appSettings?.proPixLink || item.pixPaymentLink || OFFICIAL_NUBANK_PIX_LINKS.pro
      ).trim();
    }
    if (item.itemType === 'plan' && item.itemId === 'studio') {
      return String(
        appSettings?.studioPixLink || item.pixPaymentLink || OFFICIAL_NUBANK_PIX_LINKS.studio
      ).trim();
    }
    return String(
      item.pixPaymentLink ||
        appSettings?.pixKey ||
        appSettings?.proPixLink ||
        OFFICIAL_NUBANK_PIX_LINKS.pro
    ).trim();
  };

  const openNubankBillingLink = (url: string) => {
    if (!url || !url.startsWith('https://')) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Real-time listener on the created order document so when the Admin approves/cancels on the server, the UI updates immediately
  useEffect(() => {
    if (!orderState?.orderId || !user) return;
    const unsub = onSnapshot(
      doc(db, 'orders', orderState.orderId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOrderState((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.status || prev.status,
                }
              : null
          );
        }
      },
      () => {}
    );
    return () => unsub();
  }, [orderState?.orderId, user]);

  const handleGeneratePixOrder = async (shouldOpenExternalLink = false) => {
    if (!item) return;
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!user.emailVerified) {
      setErrorMsg('Sua conta precisa ter um e-mail verificado para registrar pedidos.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/payments/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId,
          itemType: item.itemType,
          itemId: item.itemId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Erro ao preparar pedido Pix no servidor.');
        setLoading(false);
        return;
      }

      const targetLink = String(data.pixPaymentLink || data.pixKey || resolvePlanPixLink()).trim();
      const authoritativeCents = Number(data.amountCents || item.priceCents);

      // Save persistent order in Firestore /orders/{orderId} with status 'awaiting_payment'
      try {
        await setDoc(doc(db, 'orders', orderId), {
          id: orderId,
          userId: user.uid,
          itemType: item.itemType,
          itemId: item.itemId,
          itemTitle: String(data.itemTitle || item.title).slice(0, 150),
          amountCents: authoritativeCents,
          status: 'awaiting_payment',
          externalReference: String(data.externalReference || `nubank_${orderId}`).slice(0, 128),
          pixCopyPaste: targetLink.slice(0, 1000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      }

      setOrderState({
        orderId,
        configured: Boolean(targetLink.length > 0),
        status: 'awaiting_payment',
        pixPaymentLink: targetLink,
        pixKeyType: data.pixKeyType || 'Link de Cobrança Pix Nubank',
        pixHolderName: data.pixHolderName || 'NEXUS AI STUDIO (Conta Nubank)',
        pixBankName: data.pixBankName || 'Nu Pagamentos S.A. (Nubank)',
        externalReference: data.externalReference || `nubank_${orderId}`,
        amountCents: authoritativeCents,
        message: data.message,
      });

      if (onOrderCreated) onOrderCreated();

      if (shouldOpenExternalLink && targetLink.startsWith('https://')) {
        openNubankBillingLink(targetLink);
      }
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // When user clicks "Assinar Pro" or "Assinar Studio", automatically create the order in Firestore with status awaiting_payment
  useEffect(() => {
    if (!item || !user || !item.autoCreateOrder) return;
    const triggerKey = `${user.uid}:${item.itemType}:${item.itemId}`;
    if (autoTriggeredRef.current === triggerKey) return;
    autoTriggeredRef.current = triggerKey;
    handleGeneratePixOrder(false);
  }, [item, user]);

  if (!item) return null;

  const activePixLink = String(orderState?.pixPaymentLink || resolvePlanPixLink()).trim();
  const adminPixKeyType = String(
    orderState?.pixKeyType || appSettings?.pixKeyType || 'Link de Cobrança Pix Nubank'
  ).trim();
  const adminPixHolderName = String(
    orderState?.pixHolderName || appSettings?.pixHolderName || 'NEXUS AI STUDIO (Conta Nubank)'
  ).trim();
  const adminPixBankName = String(
    orderState?.pixBankName || appSettings?.pixBankName || 'Nu Pagamentos S.A. (Nubank)'
  ).trim();

  const handleVerifyStatusOnServer = async () => {
    if (!user || !orderState) return;
    setVerifying(true);
    setErrorMsg(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/payments/verify/${encodeURIComponent(orderState.orderId)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOrderState((prev) =>
          prev
            ? {
                ...prev,
                status: data.verifiedStatus || prev.status,
                message:
                  data.message ||
                  `Status verificado no servidor: ${data.statusLabel || data.verifiedStatus}`,
              }
            : null
        );
      } else {
        setErrorMsg(data.error || 'Não foi possível verificar o status do pedido.');
      }
    } catch {
      setErrorMsg('Erro ao consultar o servidor.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelOrderByCustomer = async () => {
    if (!user || !orderState || orderState.status !== 'awaiting_payment') return;
    setCancelling(true);
    setErrorMsg(null);
    try {
      await updateDoc(doc(db, 'orders', orderState.orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      setOrderState((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              message: 'Pedido cancelado pelo usuário.',
            }
          : null
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderState.orderId}`);
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyPixLink = async (linkToCopy: string) => {
    if (!linkToCopy) return;
    await navigator.clipboard.writeText(linkToCopy);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Aprovado</span>
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold">
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelado</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" />
        <span>Aguardando pagamento (awaiting_payment)</span>
      </span>
    );
  };

  const content = (
    <div className="w-full max-w-2xl mx-auto bg-[#0B1024] border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Landmark className="w-4 h-4" />
            <span>Checkout Oficial · Cobrança Pix Nubank</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">{item.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{item.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-800 hover:border-slate-700"
          aria-label="Voltar"
        >
          {asPage ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {/* Item & Price Summary */}
        <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 block">Plano / Item Selecionado</span>
            <span className="text-sm font-bold text-white">{item.title}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Sem renovação automática · Liberação exclusiva após confirmação real pelo administrador no servidor.
            </span>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="text-xs text-slate-400 block">Valor em Reais</span>
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrencyBRL(orderState?.amountCents ?? item.priceCents)}
            </span>
          </div>
        </div>

        {/* Nubank Pix Billing Link & Copy Card */}
        <div className="p-5 bg-gradient-to-b from-[#160F2E] to-[#080C1E] border border-purple-500/40 rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-purple-300">
                Link Oficial de Cobrança Pix do Plano
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{adminPixBankName}</h3>
            </div>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-md">
              {adminPixKeyType}
            </span>
          </div>

          {adminPixHolderName && (
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">Recebedor: </span>
              <strong className="text-white">{adminPixHolderName}</strong>
            </div>
          )}

          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-slate-300">
              Link Pix Nubank ({item.itemId === 'studio' ? 'Plano Studio — R$ 39,90' : 'Plano Pro — R$ 19,90'}):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={activePixLink}
                className="flex-1 px-3.5 py-2.5 bg-[#050711] border border-purple-500/40 rounded-lg text-xs font-mono text-white select-all"
              />
              <button
                type="button"
                onClick={() => handleCopyPixLink(activePixLink)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shrink-0 min-h-[42px] transition-colors"
              >
                {copiedPix ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link Pix</span>
                  </>
                )}
              </button>
            </div>

            {activePixLink.startsWith('https://') && (
              <a
                href={activePixLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold rounded-xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 min-h-[46px]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Link de Cobrança Pix no Nubank</span>
              </a>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Order Status & Action Block */}
        {loading ? (
          <div className="p-6 bg-[#060916] border border-slate-800 rounded-xl flex items-center justify-center gap-3 text-xs text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>Criando pedido real no Cloud Firestore com status awaiting_payment...</span>
          </div>
        ) : !orderState ? (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => handleGeneratePixOrder(true)}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold text-sm rounded-xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 min-h-[48px]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Registrar Pedido no Firestore e Abrir Cobrança Nubank</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">Identificador Único do Pedido (Firestore):</span>
                <span className="font-mono text-white font-semibold tabular-nums">
                  {orderState.orderId}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">Status Real do Pedido:</span>
                {renderStatusBadge(orderState.status)}
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-slate-300 leading-relaxed">
                {orderState.status === 'approved' ? (
                  <p className="text-emerald-300 font-medium">
                    Pagamento confirmado manualmente pelo administrador no servidor! Seu plano já
                    está ativo na sua conta.
                  </p>
                ) : orderState.status === 'cancelled' ? (
                  <p className="text-red-300 font-medium">
                    Este pedido foi marcado como cancelado. Caso deseje contratar, gere um novo pedido.
                  </p>
                ) : (
                  <p>
                    Seu pedido <span className="font-mono text-purple-300">{orderState.orderId}</span>{' '}
                    foi salvo no Cloud Firestore com status <strong>awaiting_payment</strong>.
                    <br />
                    <span className="text-slate-400">
                      Importante: A simples abertura do link do Nubank ou o retorno ao navegador não
                      aprova o pagamento automaticamente. O plano será liberado no servidor assim que
                      o administrador confirmar o recebimento real no Nubank.
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleVerifyStatusOnServer}
                disabled={verifying}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 min-h-[42px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                <span>Consultar Status no Servidor</span>
              </button>

              {orderState.status === 'awaiting_payment' && (
                <button
                  type="button"
                  onClick={handleCancelOrderByCustomer}
                  disabled={cancelling}
                  className="py-2.5 px-4 bg-red-950/60 hover:bg-red-900/70 border border-red-800/70 text-red-200 text-xs font-semibold rounded-lg min-h-[42px]"
                >
                  {cancelling ? 'Cancelando...' : 'Cancelar Pedido'}
                </button>
              )}

              {onGoToOrders && (
                <button
                  type="button"
                  onClick={onGoToOrders}
                  className="py-2.5 px-4 bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-200 text-xs font-semibold rounded-lg min-h-[42px]"
                >
                  Ver Histórico de Pedidos
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (asPage) {
    return <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 pb-24">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      {content}
    </div>
  );
};
