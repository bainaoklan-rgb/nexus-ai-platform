import React, { useState } from 'react';
import {
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { formatCurrencyBRL } from '../data/catalog';
import {
  db,
  doc,
  setDoc,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { AppRoute } from '../components/Navbar';

export interface CheckoutSelection {
  itemType: 'plan' | 'product';
  itemId: string;
  title: string;
  priceCents: number;
  description: string;
}

interface CheckoutViewProps {
  selection: CheckoutSelection | null;
  user: FirebaseUser | null;
  appSettings: Record<string, any> | null;
  isAdmin: boolean;
  onRequireAuth: () => void;
  onNavigate: (route: AppRoute) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  selection,
  user,
  appSettings,
  isAdmin,
  onRequireAuth,
  onNavigate,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{
    orderId: string;
    status: string;
    amountCents: number;
    itemTitle: string;
    pixKey: string;
    message: string;
  } | null>(null);

  if (!selection) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-14 text-center space-y-4">
        <div className="p-8 bg-[#0B1024] border border-slate-800 rounded-xl space-y-4">
          <h1 className="text-xl font-bold text-white">Nenhum item selecionado para checkout</h1>
          <p className="text-xs text-slate-400">
            Escolha um plano ou produto digital para prosseguir com o pagamento via Pix.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('plans')}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg"
            >
              Ver Planos Disponíveis
            </button>
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="px-5 py-2.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg"
            >
              Ver Loja Digital
            </button>
          </div>
        </div>
      </div>
    );
  }

  const configuredPixKey = String(appSettings?.pixKey || '').trim();
  const configuredPixKeyType = String(appSettings?.pixKeyType || 'Chave Aleatória').trim();
  const configuredHolderName = String(
    appSettings?.pixHolderName || 'Titular da Conta Nubank (Configurar no Painel Admin)'
  ).trim();
  const configuredBankName = String(
    appSettings?.pixBankName || 'Nu Pagamentos S.A. (Nubank)'
  ).trim();

  const handleCopyPixKey = async () => {
    if (!configuredPixKey) return;
    await navigator.clipboard.writeText(configuredPixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCreateManualOrder = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!user.emailVerified) {
      setErrorMsg('Sua conta precisa ter um e-mail verificado para registrar pedidos.');
      return;
    }

    setLoadingOrder(true);
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
          itemType: selection.itemType,
          itemId: selection.itemId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Não foi possível preparar o pedido no servidor.');
        setLoadingOrder(false);
        return;
      }

      // Persist real order in Firestore /orders/{orderId} with status 'awaiting_payment'
      try {
        await setDoc(doc(db, 'orders', orderId), {
          id: orderId,
          userId: user.uid,
          itemType: selection.itemType,
          itemId: selection.itemId,
          itemTitle: String(data.itemTitle || selection.title).slice(0, 150),
          amountCents: Number(data.amountCents || selection.priceCents),
          status: 'awaiting_payment',
          externalReference: String(data.externalReference || `nubank_${orderId}`).slice(0, 128),
          pixCopyPaste: String(configuredPixKey).slice(0, 1000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      }

      setCreatedOrder({
        orderId,
        status: 'awaiting_payment',
        amountCents: Number(data.amountCents || selection.priceCents),
        itemTitle: String(data.itemTitle || selection.title),
        pixKey: configuredPixKey,
        message: data.message,
      });
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha de conexão com o servidor.');
    } finally {
      setLoadingOrder(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 pb-24">
      <button
        type="button"
        onClick={() => onNavigate(selection.itemType === 'plan' ? 'plans' : 'products')}
        className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para {selection.itemType === 'plan' ? 'Planos' : 'Produtos'}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Order Summary */}
        <div className="lg:col-span-5 p-6 bg-[#0B1024] border border-slate-800 rounded-xl space-y-5">
          <div>
            <span className="text-xs font-medium text-purple-400">Resumo do Pedido</span>
            <h1 className="text-xl font-bold text-white mt-1">{selection.title}</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {selection.description}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Valor Total a Transferir:</span>
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrencyBRL(selection.priceCents)}
            </span>
          </div>

          <div className="p-3.5 bg-[#060916] border border-slate-800/90 rounded-lg space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Regras de Segurança e Liberação</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc pl-4">
              <li>O pedido é salvo com status inicial <strong className="text-amber-300">Aguardando pagamento</strong>.</li>
              <li>Nenhum cliente pode aprovar o próprio pagamento pelo navegador.</li>
              <li>
                A liberação do plano ou arquivo ocorre exclusivamente no servidor após a
                confirmação manual pelo administrador na conta Nubank.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Manual Nubank Pix Instructions & Order Registration */}
        <div className="lg:col-span-7 p-6 bg-[#0B1024] border border-purple-500/40 rounded-xl space-y-5">
          <div>
            <span className="text-xs font-semibold text-cyan-400">
              Pagamento via Pix Manual · Conta Nubank
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              Dados para Transferência Pix
            </h2>
          </div>

          {/* Configured Pix Key Box */}
          {configuredPixKey ? (
            <div className="p-4 bg-[#060916] border border-slate-800 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Instituição Recebedora:</span>
                  <span className="font-semibold text-purple-300">{configuredBankName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tipo da Chave:</span>
                  <span className="font-semibold text-white">{configuredPixKeyType}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block">Titular da Conta:</span>
                  <span className="font-semibold text-white">{configuredHolderName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Chave Pix Cadastrada pelo Administrador:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={configuredPixKey}
                    className="flex-1 px-3.5 py-2.5 bg-[#0B1024] border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPixKey}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Chave Pix Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Chave Pix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-100 space-y-2">
                <p className="font-semibold text-amber-300">
                  Chave Pix Nubank ainda não cadastrada pelo Administrador
                </p>
                <p>
                  O administrador da plataforma precisa acessar o{' '}
                  <strong className="text-white">Painel Administrativo → Planos e Chave Pix</strong>{' '}
                  e informar a chave Pix da conta Nubank para que ela seja exibida aqui.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin')}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-semibold rounded-lg text-xs inline-block"
                  >
                    Cadastrar Minha Chave Pix Nubank Agora →
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {!createdOrder ? (
            <div className="space-y-3 pt-1">
              <div className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Como funciona:</strong> Copie a chave Pix acima,
                realize a transferência do valor exato ({formatCurrencyBRL(selection.priceCents)})
                pelo aplicativo do seu banco para a conta Nubank indicada e clique no botão abaixo
                para registrar seu pedido no banco de dados.
              </div>

              <button
                type="button"
                onClick={handleCreateManualOrder}
                disabled={loadingOrder}
                className="w-full py-3 px-5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold text-sm rounded-xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-50"
              >
                {loadingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Pedido no Banco de Dados...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Registrar Pedido (Status: Aguardando Pagamento)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-5 bg-[#060916] border border-emerald-500/40 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pedido Registrado com Sucesso no Cloud Firestore!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">{createdOrder.message}</p>
                </div>
              </div>

              <div className="p-3.5 bg-[#0B1024] border border-slate-800 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Identificador Único do Pedido:</span>
                  <span className="font-mono text-white tabular-nums">{createdOrder.orderId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Item Solicitado:</span>
                  <span className="text-slate-200 font-medium">{createdOrder.itemTitle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Valor:</span>
                  <span className="font-mono text-white tabular-nums">
                    {formatCurrencyBRL(createdOrder.amountCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status Atual no Banco:</span>
                  <span className="font-mono font-semibold text-amber-400 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>AGUARDANDO PAGAMENTO</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg min-h-[40px]"
                >
                  Acompanhar no Meu Histórico de Pedidos
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin')}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-lg min-h-[40px]"
                  >
                    Ir ao Painel Admin para Aprovar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
