import React, { useState, useEffect } from 'react';
import {
  Play,
  Copy,
  Check,
  BookmarkPlus,
  FolderCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  Video,
  Type,
  FileText,
  Hash,
  Lightbulb,
  UserCheck,
  Sparkles,
  Calendar,
  History,
  FolderKanban,
  Wand2,
  Lock,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  db,
  doc,
  setDoc,
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { CREATOR_TOOLS, CreatorTool, ToolCategory } from '../data/catalog';

interface NexusLabViewProps {
  user: FirebaseUser | null;
  userDoc: Record<string, any> | null;
  appSettings: Record<string, any> | null;
  initialTool?: CreatorTool | null;
  initialTopicPrompt?: string;
  onRequireAuth: () => void;
  onNavigatePlans: () => void;
}

const TOOL_PRESET_EXAMPLES: Record<string, string[]> = {
  roteiros: [
    '5 ferramentas gratuitas de produtividade para criadores iniciantes em 2026',
    'Como estruturar vídeos curtos de 60 segundos que retêm 80% da audiência',
    'Erros mais comuns na iluminação de home studio e como corrigir gastando pouco',
  ],
  titulos: [
    'Vídeo mostrando minha rotina de criação de conteúdo em lote no domingo',
    'Tutorial passo a passo de edição dinâmica para Reels e TikTok',
    'Análise sincera de microfones custo-benefício para gravar pelo celular',
  ],
  descricoes: [
    'Guia completo de como crescer um canal educativo do zero no YouTube',
    'Checklist de equipamentos essenciais para gravar aulas e cursos online',
    'Bastidores de como planejo 30 dias de conteúdo em apenas 2 horas',
  ],
  hashtags: [
    'Dicas diárias de tecnologia, inteligência artificial e produtividade no trabalho',
    'Treino funcional em casa sem equipamentos para quem tem rotina corrida',
    'Educação financeira prática e organização de orçamento mensal',
  ],
  ideias: [
    'Canal sobre programação web, carreira em tecnologia e projetos práticos',
    'Perfil de gastronomia rápida e receitas econômicas para o dia a dia',
    'Canal de design gráfico, identidade visual e portfólio para freelancers',
  ],
  biografias: [
    'Criador de conteúdo de tecnologia que descomplica IA para pequenos negócios',
    'Mentora de comunicação e oratória para profissionais tímidos',
    'Especialista em edição de vídeo mobile e retenção para formatos verticais',
  ],
  assistente: [
    'Meu canal tem boas visualizações em Shorts, mas pouca conversão para vídeos longos. Como ajustar meu funil?',
    'Quero lançar meu primeiro produto digital (e-book de roteiros). Como criar uma sequência de aquecimento de 7 dias?',
    'Como organizar minha semana trabalhando sozinho para postar 4 vídeos curtos e 1 vídeo longo sem esgotamento?',
  ],
  organizador: [
    'Série especial de 4 episódios sobre automação de conteúdo e edição inteligente',
    'Cronograma de lançamento de mentoria para criadores em 3 semanas',
    'Planejamento mensal de vídeos comparativos de ferramentas digitais',
  ],
};

export const NexusLabView: React.FC<NexusLabViewProps> = ({
  user,
  userDoc,
  appSettings,
  initialTool,
  initialTopicPrompt = '',
  onRequireAuth,
  onNavigatePlans,
}) => {
  const [selectedTool, setSelectedTool] = useState<CreatorTool>(
    initialTool || CREATOR_TOOLS[0]
  );
  const [categoryFilter, setCategoryFilter] = useState<ToolCategory>('Todas');
  const [topic, setTopic] = useState(initialTopicPrompt);
  const [platform, setPlatform] = useState(
    (initialTool || CREATOR_TOOLS[0]).suggestedPlatforms[0]
  );
  const [tone, setTone] = useState((initialTool || CREATOR_TOOLS[0]).suggestedTones[0]);
  const [audience, setAudience] = useState('');
  const [extraDetails, setExtraDetails] = useState('');

  // Real execution state (never simulated)
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Real Firestore work history & saved projects
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [activeBottomDrawer, setActiveBottomDrawer] = useState<'history' | 'projects'>('history');

  useEffect(() => {
    if (initialTool) {
      setSelectedTool(initialTool);
      setPlatform(initialTool.suggestedPlatforms[0]);
      setTone(initialTool.suggestedTones[0]);
    }
  }, [initialTool]);

  useEffect(() => {
    if (initialTopicPrompt) {
      setTopic(initialTopicPrompt);
    }
  }, [initialTopicPrompt]);

  useEffect(() => {
    if (!user) {
      setRecentHistory([]);
      setSavedProjects([]);
      return;
    }

    const unsubHistory = onSnapshot(
      query(collection(db, 'usage_history'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setRecentHistory(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'usage_history')
    );

    const unsubProjects = onSnapshot(
      query(collection(db, 'saved_projects'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        setSavedProjects(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'saved_projects')
    );

    return () => {
      unsubHistory();
      unsubProjects();
    };
  }, [user]);

  const activePlanId = userDoc?.planId || 'free';
  const dailyLimit =
    activePlanId === 'studio'
      ? Number(appSettings?.studioDailyLimit || 500)
      : activePlanId === 'pro'
      ? Number(appSettings?.proDailyLimit || 100)
      : Number(appSettings?.freeDailyLimit || 5);

  const todayKey = new Date().toISOString().slice(0, 10);
  const usedToday = recentHistory.filter((h) => h.dateKey === todayKey).length;
  const remainingToday = Math.max(0, dailyLimit - usedToday);

  const handleSelectTool = (tool: CreatorTool) => {
    setSelectedTool(tool);
    setPlatform(tool.suggestedPlatforms[0]);
    setTone(tool.suggestedTones[0]);
    setErrorMsg(null);
    setSavedSuccess(false);
  };

  const renderToolIcon = (iconName: CreatorTool['iconName']) => {
    switch (iconName) {
      case 'video':
        return <Video className="w-4 h-4 text-purple-300" />;
      case 'type':
        return <Type className="w-4 h-4 text-cyan-300" />;
      case 'file-text':
        return <FileText className="w-4 h-4 text-purple-300" />;
      case 'hash':
        return <Hash className="w-4 h-4 text-emerald-300" />;
      case 'lightbulb':
        return <Lightbulb className="w-4 h-4 text-amber-300" />;
      case 'user-check':
        return <UserCheck className="w-4 h-4 text-cyan-300" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4 text-purple-300" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-cyan-300" />;
    }
  };

  const executeGeminiGeneration = async () => {
    setErrorMsg(null);
    setSavedSuccess(false);

    if (!user) {
      onRequireAuth();
      return;
    }

    if (topic.trim().length < 3) {
      setErrorMsg('Informe o tema ou comando criativo com pelo menos 3 caracteres.');
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
          toolId: selectedTool.id,
          topic: topic.trim(),
          platform: platform || selectedTool.suggestedPlatforms[0],
          tone: tone || selectedTool.suggestedTones[0],
          audience: audience.trim(),
          extraDetails: extraDetails.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Não foi possível processar sua solicitação no servidor.');
        setLoading(false);
        return;
      }

      setResult(data.result);

      if (user.emailVerified) {
        const usageId = `use_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
          await setDoc(doc(db, 'usage_history', usageId), {
            id: usageId,
            userId: user.uid,
            toolId: selectedTool.id,
            toolName: selectedTool.name.slice(0, 100),
            promptSummary: topic.trim().slice(0, 500),
            outputPreview: String(data.result).slice(0, 3900),
            dateKey: data.dateKey || todayKey,
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeGeminiGeneration();
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
      setErrorMsg('Verifique seu e-mail para salvar projetos no Cloud Firestore.');
      return;
    }

    setSavingProject(true);
    setErrorMsg(null);
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await setDoc(doc(db, 'saved_projects', projectId), {
        id: projectId,
        userId: user.uid,
        title: `${selectedTool.name}: ${topic.trim()}`.slice(0, 140),
        category: selectedTool.category,
        toolId: selectedTool.id,
        content: result.slice(0, 14500),
        status: selectedTool.id === 'roteiros' ? 'roteiro' : 'ideia',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSavedSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `saved_projects/${projectId}`);
    } finally {
      setSavingProject(false);
    }
  };

  const filteredTools = CREATOR_TOOLS.filter(
    (t) => categoryFilter === 'Todas' || t.category === categoryFilter
  );

  const presets = TOOL_PRESET_EXAMPLES[selectedTool.id] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 space-y-8 relative z-10">
      {/* Top Header of NEXUS LAB */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="text-xs font-semibold text-cyan-400">
            NEXUS LAB · Laboratório Interativo de Criação com Gemini AI
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mt-1">
            Estúdio Experimental de Produção Criativa
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Selecione um módulo criativo, personalize parâmetros de retenção e gere roteiros,
            títulos, descrições e cronogramas reais processados no servidor.
          </p>
        </div>

        {/* Real Quota Telemetry Strip */}
        <div className="nexus-glass rounded-xl p-4 flex flex-wrap items-center gap-6 shrink-0">
          {user ? (
            <>
              <div>
                <div className="text-[11px] text-slate-400">Plano Ativo</div>
                <div className="text-sm font-bold text-white uppercase">{activePlanId}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Uso Hoje</div>
                <div className="text-sm font-bold text-cyan-300 font-mono tabular-nums">
                  {usedToday} / {dailyLimit}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Restantes Hoje</div>
                <div className="text-sm font-bold text-purple-300 font-mono tabular-nums">
                  {remainingToday}
                </div>
              </div>
              {activePlanId === 'free' && (
                <button
                  type="button"
                  onClick={onNavigatePlans}
                  className="nexus-btn-primary px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap min-h-[38px]"
                >
                  Fazer Upgrade
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-300">
                Autentique-se para executar ferramentas no servidor
              </span>
              <button
                type="button"
                onClick={onRequireAuth}
                className="nexus-btn-primary px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap min-h-[38px]"
              >
                Entrar Agora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Tool Selector Strip */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-200">
            1. Selecione a Ferramenta de Inteligência Artificial
          </h2>
          <div className="flex items-center gap-1 p-1 bg-[#080C1F] border border-slate-800 rounded-lg overflow-x-auto max-w-full">
            {(['Todas', 'Vídeo', 'Texto', 'Produtividade'] as ToolCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredTools.map((tool) => {
            const isSelected = selectedTool.id === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleSelectTool(tool)}
                className={`text-left p-4 rounded-xl transition-all flex flex-col justify-between min-h-[116px] ${
                  isSelected
                    ? 'bg-gradient-to-br from-purple-900/50 via-[#101738] to-cyan-950/40 border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.2)]'
                    : 'nexus-glass-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-center">
                    {renderToolIcon(tool.iconName)}
                  </div>
                  <span className="text-[11px] text-slate-400">{tool.category}</span>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-white">{tool.name}</div>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {tool.shortDescription}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Laboratory Workspace: Command Form (Left) + Live Preview & Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Command Input Panel */}
        <form
          onSubmit={handleFormSubmit}
          className="lg:col-span-5 nexus-glass rounded-2xl p-6 space-y-5 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-800/80">
              <div className="text-xs text-purple-300 font-medium">
                <span>Módulo Selecionado</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>{selectedTool.category}</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">{selectedTool.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{selectedTool.fullDescription}</p>
            </div>

            {/* Curated 1-Click Presets */}
            {presets.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Exemplos Rápidos (clique para preencher):</span>
                </div>
                <div className="space-y-1.5">
                  {presets.map((example, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(example)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#060916]/90 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 text-xs text-slate-300 hover:text-white transition-colors line-clamp-1"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Topic / Command Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="lab-topic-input"
                  className="text-xs font-semibold text-slate-200"
                >
                  Tema, Pauta ou Comando Principal *
                </label>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {topic.length}/1200
                </span>
              </div>
              <textarea
                id="lab-topic-input"
                required
                rows={3}
                maxLength={1200}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={selectedTool.placeholderTopic}
                className="w-full p-3.5 bg-[#050814] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Modern Platform Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Plataforma de Destino
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedTool.suggestedPlatforms.map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setPlatform(plat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      platform === plat
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#050814] border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            </div>

            {/* Modern Tone Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tom e Direção Criativa
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedTool.suggestedTones.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      tone === t
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
                <label
                  htmlFor="lab-audience-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Público-Alvo (Opcional)
                </label>
                <input
                  id="lab-audience-input"
                  type="text"
                  maxLength={120}
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Ex: Jovens criadores, devs..."
                  className="w-full px-3 py-2 bg-[#050814] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[40px]"
                />
              </div>
              <div>
                <label
                  htmlFor="lab-extra-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Instrução Extra (Opcional)
                </label>
                <input
                  id="lab-extra-input"
                  type="text"
                  maxLength={400}
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  placeholder="Ex: Vídeo de 60s com CTA final"
                  className="w-full px-3 py-2 bg-[#050814] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[40px]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {errorMsg && (
              <div
                role="alert"
                className="p-3 bg-red-950/70 border border-red-800 rounded-xl flex items-start gap-2 text-xs text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="nexus-btn-primary w-full py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 min-h-[48px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando no Servidor Gemini...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Executar {selectedTool.name}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Creation Preview & Result Workspace */}
        <div className="lg:col-span-7 nexus-glass rounded-2xl p-6 flex flex-col justify-between min-h-[460px]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400">
                <span>Estação de Resultado</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>{loading ? 'Em processamento real' : result ? 'Concluído' : 'Pronto'}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Pré-Visualização e Exportação Criativa
              </h3>
            </div>

            {result && !loading && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={executeGeminiGeneration}
                  className="nexus-btn-secondary px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gerar Novamente</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="nexus-btn-secondary px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Resultado</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSaveToProjects}
                  disabled={savingProject || savedSuccess}
                  className="nexus-btn-primary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
                >
                  {savedSuccess ? (
                    <>
                      <FolderCheck className="w-3.5 h-3.5" />
                      <span>Salvo nos Projetos!</span>
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

          {/* Real State Output Area */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="relative w-16 h-16 rounded-2xl bg-purple-600/20 border border-cyan-400/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-300 animate-spin" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-base font-bold text-white">
                  Gerando conteúdo real com Google Gemini AI...
                </p>
                <p className="text-xs text-slate-400">
                  Requisição ativa no servidor para "{selectedTool.name}" ({platform} · {tone}).
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="flex-1 my-4 bg-[#050814]/90 border border-slate-800/90 rounded-xl p-5 overflow-y-auto max-h-[500px]">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-100 leading-relaxed">
                {result}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                {renderToolIcon(selectedTool.iconName)}
              </div>
              <div className="max-w-md space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  Aguardando seu comando criativo
                </p>
                <p className="text-xs text-slate-400">
                  Escolha um dos exemplos rápidos ou digite seu tema no painel ao lado e clique em{' '}
                  <strong className="text-white">Executar {selectedTool.name}</strong>. Nenhum
                  processamento é simulado sem requisição real.
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Parâmetros ativos: <strong className="text-slate-200">{platform}</strong> ·{' '}
              <strong className="text-slate-200">{tone}</strong>
            </span>
            <span className="font-mono tabular-nums">
              {result ? `${result.length} caracteres gerados` : 'Pronto para gerar'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Interactive Archive: Recent Work History & Saved Projects */}
      <div className="nexus-glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">
              Memória do Laboratório (Sincronizada com Cloud Firestore)
            </h2>
            <p className="text-xs text-slate-400">
              Clique em qualquer item abaixo para carregar o conteúdo na estação de pré-visualização.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveBottomDrawer('history')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                activeBottomDrawer === 'history'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#050814] text-slate-300 border border-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico de Gerações ({recentHistory.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBottomDrawer('projects')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                activeBottomDrawer === 'projects'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-[#050814] text-slate-300 border border-slate-800'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Projetos Salvos ({savedProjects.length})</span>
            </button>
          </div>
        </div>

        {!user ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Faça login para visualizar e carregar seu histórico real de trabalhos e projetos salvos.
            </p>
          </div>
        ) : activeBottomDrawer === 'history' ? (
          recentHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma geração registrada ainda. Execute uma ferramenta acima para iniciar seu
              histórico.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentHistory.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTopic(item.promptSummary || '');
                    setResult(item.outputPreview || '');
                    window.scrollTo({ top: 180, behavior: 'smooth' });
                  }}
                  className="text-left p-4 rounded-xl bg-[#050814] border border-slate-800 hover:border-purple-500/50 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-purple-300">{item.toolName}</span>
                    <span className="font-mono tabular-nums">{item.dateKey}</span>
                  </div>
                  <div className="text-xs font-bold text-white line-clamp-1">
                    {item.promptSummary}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.outputPreview}</p>
                </button>
              ))}
            </div>
          )
        ) : savedProjects.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhum projeto salvo ainda. Gere um resultado e clique em "Salvar Projeto".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {savedProjects.slice(0, 6).map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => {
                  setTopic(proj.title || '');
                  setResult(proj.content || '');
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className="text-left p-4 rounded-xl bg-[#050814] border border-slate-800 hover:border-cyan-500/50 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-cyan-300">{proj.category}</span>
                  <span className="uppercase">{proj.status || 'ideia'}</span>
                </div>
                <div className="text-xs font-bold text-white line-clamp-1">{proj.title}</div>
                <p className="text-xs text-slate-400 line-clamp-2">{proj.content}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
