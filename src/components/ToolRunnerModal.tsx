import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  BookmarkPlus,
  Play,
  AlertCircle,
  Loader2,
  FolderCheck,
  RefreshCw,
  Wand2,
  FlaskConical,
} from 'lucide-react';
import { CreatorTool } from '../data/catalog';
import {
  db,
  doc,
  setDoc,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../firebase';

interface ToolRunnerModalProps {
  tool: CreatorTool | null;
  onClose: () => void;
  user: FirebaseUser | null;
  onRequireAuth: () => void;
  onSavedProject?: () => void;
  onOpenInLab?: (tool: CreatorTool, currentTopic: string) => void;
}

const MODAL_EXAMPLES: Record<string, string[]> = {
  roteiros: [
    '5 ferramentas gratuitas de produtividade para criadores em 2026',
    'Como criar vídeos curtos de 60 segundos com alta retenção',
  ],
  titulos: [
    'Rotina real de criação de conteúdo em lote no domingo',
    'Tutorial prático de edição rápida pelo celular',
  ],
  descricoes: [
    'Guia completo para estruturar um canal do zero no YouTube',
    'Equipamentos acessíveis para gravar vídeos em casa',
  ],
  hashtags: [
    'Inteligência artificial, produtividade e criação de conteúdo digital',
    'Educação financeira prática e investimentos para iniciantes',
  ],
  ideias: [
    'Canal de tecnologia, programação e inteligência artificial aplicada',
    'Perfil de culinária rápida e econômica para rotina corrida',
  ],
  biografias: [
    'Criador digital ensinando IA e automação para empreendedores',
    'Especialista em vídeos verticais e retenção de audiência',
  ],
  assistente: [
    'Como converter seguidores de vídeos curtos em espectadores de vídeos longos?',
    'Estratégia de 7 dias para lançar um produto digital para criadores',
  ],
  organizador: [
    'Série de 4 vídeos sobre automação e produtividade com IA',
    'Cronograma mensal de publicações para YouTube e Instagram',
  ],
};

export const ToolRunnerModal: React.FC<ToolRunnerModalProps> = ({
  tool,
  onClose,
  user,
  onRequireAuth,
  onSavedProject,
  onOpenInLab,
}) => {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('');
  const [tone, setTone] = useState('');
  const [audience, setAudience] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    usedToday: number;
    dailyLimit: number;
    planId: string;
  } | null>(null);

  useEffect(() => {
    if (tool) {
      setPlatform(tool.suggestedPlatforms[0]);
      setTone(tool.suggestedTones[0]);
      setErrorMsg(null);
      setSavedSuccess(false);
    }
  }, [tool]);

  if (!tool) return null;

  const runGeneration = async () => {
    setErrorMsg(null);
    setSavedSuccess(false);

    if (!user) {
      onRequireAuth();
      return;
    }

    if (topic.trim().length < 3) {
      setErrorMsg('Descreva o tema ou objetivo com pelo menos 3 caracteres.');
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          toolId: tool.id,
          topic: topic.trim(),
          platform: platform || tool.suggestedPlatforms[0],
          tone: tone || tool.suggestedTones[0],
          audience: audience.trim(),
          extraDetails: extraDetails.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Não foi possível processar sua solicitação.');
        setLoading(false);
        return;
      }

      setResult(data.result);
      if (data.usage) {
        setUsageInfo(data.usage);
      }

      if (user.emailVerified) {
        const usageId = `use_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
          await setDoc(doc(db, 'usage_history', usageId), {
            id: usageId,
            userId: user.uid,
            toolId: tool.id,
            toolName: tool.name.slice(0, 100),
            promptSummary: topic.trim().slice(0, 500),
            outputPreview: String(data.result).slice(0, 3900),
            dateKey: data.dateKey || new Date().toISOString().slice(0, 10),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `usage_history/${usageId}`);
        }
      }
    } catch (err: any) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Falha de conexão com o servidor NEXUS AI STUDIO.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    await runGeneration();
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToProjects = async () => {
    if (!user || !result || savingProject || savedSuccess) return;
    if (!user.emailVerified) {
      setErrorMsg('Verifique seu e-mail para salvar projetos no banco de dados.');
      return;
    }

    setSavingProject(true);
    setErrorMsg(null);
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await setDoc(doc(db, 'saved_projects', projectId), {
        id: projectId,
        userId: user.uid,
        title: `${tool.name}: ${topic.trim()}`.slice(0, 140),
        category: tool.category,
        toolId: tool.id,
        content: result.slice(0, 14500),
        status: tool.id === 'roteiros' ? 'roteiro' : 'ideia',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSavedSuccess(true);
      if (onSavedProject) onSavedProject();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `saved_projects/${projectId}`);
    } finally {
      setSavingProject(false);
    }
  };

  const examples = MODAL_EXAMPLES[tool.id] || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl nexus-glass rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-purple-500/30">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-[#060918] border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
              <span>{tool.category}</span>
              <span aria-hidden="true">·</span>
              <span>Processamento Gemini Server-Side</span>
            </div>
            <h2 id="tool-modal-title" className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {tool.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onOpenInLab && (
              <button
                type="button"
                onClick={() => onOpenInLab(tool, topic)}
                className="nexus-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold hidden sm:inline-flex items-center gap-1.5"
              >
                <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                <span>Abrir no NEXUS LAB</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Fechar ferramenta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Column */}
          <form onSubmit={handleExecute} className="lg:col-span-5 space-y-4">
            {examples.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Exemplos Práticos (1 clique):</span>
                </div>
                {examples.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(ex)}
                    className="w-full text-left px-3 py-1.5 rounded-lg bg-[#050814] hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 text-xs text-slate-300 hover:text-white transition-colors line-clamp-1"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Qual é o tema ou objetivo do conteúdo? *
                </label>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {topic.length}/1200
                </span>
              </div>
              <textarea
                required
                rows={3}
                maxLength={1200}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={tool.placeholderTopic}
                className="w-full p-3 bg-[#050814] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Plataforma Alvo
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tool.suggestedPlatforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      (platform || tool.suggestedPlatforms[0]) === p
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#050814] border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tom / Estratégia
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tool.suggestedTones.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      (tone || tool.suggestedTones[0]) === t
                        ? 'bg-cyan-600 text-white'
                        : 'bg-[#050814] border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Público-Alvo (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Ex: Criadores, estudantes"
                  className="w-full px-3 py-2 bg-[#050814] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Instruções Extras (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={400}
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  placeholder="Ex: Vídeo de 60s com CTA"
                  className="w-full px-3 py-2 bg-[#050814] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[40px]"
                />
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 bg-red-950/70 border border-red-800 rounded-lg flex items-start gap-2 text-xs text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="nexus-btn-primary w-full py-2.5 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando com Gemini AI...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Executar Ferramenta</span>
                </>
              )}
            </button>

            {usageInfo && (
              <p className="text-[11px] text-slate-400 text-center tabular-nums">
                Consumo diário do plano ({usageInfo.planId.toUpperCase()}): {usageInfo.usedToday} /{' '}
                {usageInfo.dailyLimit} execuções
              </p>
            )}
          </form>

          {/* Output Column */}
          <div className="lg:col-span-7 flex flex-col bg-[#050814] border border-slate-800 rounded-xl p-4 min-h-[340px]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300">Resultado Processado</span>
              {result && !loading && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={runGeneration}
                    className="nexus-btn-secondary px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Gerar Novamente</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="nexus-btn-secondary px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToProjects}
                    disabled={savingProject || savedSuccess}
                    className="nexus-btn-primary px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {savedSuccess ? (
                      <>
                        <FolderCheck className="w-3.5 h-3.5" />
                        <span>Salvo nos Projetos</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>{savingProject ? 'Salvando...' : 'Salvar Projeto'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-sm font-medium text-slate-200">
                  Processando sua solicitação no servidor com Gemini AI...
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Estruturando ganchos, palavras-chave e formatação profissional para o seu canal.
                </p>
              </div>
            ) : result ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed">
                  {result}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <p className="text-sm font-medium text-slate-400 mb-1">
                  Preencha os parâmetros ao lado e clique em Executar Ferramenta
                </p>
                <p className="text-xs max-w-md">
                  O resultado real gerado pelo Gemini no servidor aparecerá aqui pronto para copiar,
                  salvar na sua biblioteca de projetos ou gerar novamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
