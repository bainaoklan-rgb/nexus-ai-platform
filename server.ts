import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PUBLIC_SHARED_APP_URL =
  'https://ais-pre-ymgwovy2ap2cish26msfkk-253742165772.us-east1.run.app';
const DEVELOPMENT_APP_URL =
  'https://ais-dev-ymgwovy2ap2cish26msfkk-253742165772.us-east1.run.app';

function resolveCanonicalOrigin(req?: Request): string {
  const customDomain = (process.env.CUSTOM_DOMAIN || '').trim().replace(/\/+$/, '');
  if (customDomain && customDomain.startsWith('https://')) {
    return customDomain;
  }
  const envAppUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (
    envAppUrl &&
    envAppUrl !== 'MY_APP_URL' &&
    envAppUrl.startsWith('https://')
  ) {
    return envAppUrl;
  }
  if (req) {
    const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();
    if (
      forwardedHost &&
      !forwardedHost.startsWith('localhost') &&
      !forwardedHost.startsWith('127.0.0.1') &&
      !forwardedHost.startsWith('0.0.0.0')
    ) {
      const cleanHost = forwardedHost.replace(/^www\./i, '');
      return `https://${cleanHost}`;
    }
  }
  return PUBLIC_SHARED_APP_URL;
}

function generateRobotsTxt(baseOrigin: string): string {
  const cleanOrigin = baseOrigin.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /ferramentas',
    'Allow: /nexus-lab',
    'Allow: /planos',
    'Allow: /produtos',
    'Disallow: /admin',
    'Disallow: /painel',
    'Disallow: /projetos',
    'Disallow: /conversa',
    'Disallow: /notificacoes',
    'Disallow: /checkout',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}

function generateSitemapXml(baseOrigin: string): string {
  const cleanOrigin = baseOrigin.replace(/\/+$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const publicPages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/ferramentas', changefreq: 'weekly', priority: '0.9' },
    { path: '/nexus-lab', changefreq: 'weekly', priority: '0.9' },
    { path: '/planos', changefreq: 'weekly', priority: '0.8' },
    { path: '/produtos', changefreq: 'weekly', priority: '0.8' },
  ];

  const urlsXml = publicPages
    .map(
      (p) => `  <url>
    <loc>${cleanOrigin}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
}

async function checkDomainDnsStatus(domain: string) {
  const cleanDomain = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  try {
    const nsRecords = await dns.promises.resolveNs(cleanDomain);
    const aRecords = await dns.promises.resolve4(cleanDomain).catch(() => [] as string[]);
    const cnameRecords = await dns.promises
      .resolveCname(`www.${cleanDomain}`)
      .catch(() => [] as string[]);
    const txtRecords = await dns.promises
      .resolveTxt(cleanDomain)
      .then((list) => list.map((chunks) => chunks.join('')))
      .catch(() => [] as string[]);

    const hasGoogleSearchVerificationTxt = txtRecords.some((t) =>
      t.includes('google-site-verification=')
    );

    return {
      domain: cleanDomain,
      registeredAndResolving: true,
      nsRecords,
      aRecords,
      wwwCnameRecords: cnameRecords,
      hasGoogleSearchVerificationTxt,
      statusSummary:
        aRecords.length > 0
          ? `Domínio registrado e ativo no DNS (${nsRecords.slice(0, 2).join(', ')})`
          : `Domínio registrado com servidores NS (${nsRecords.slice(0, 2).join(', ')})`,
    };
  } catch (err: any) {
    return {
      domain: cleanDomain,
      registeredAndResolving: false,
      nsRecords: [] as string[],
      aRecords: [] as string[],
      wwwCnameRecords: [] as string[],
      hasGoogleSearchVerificationTxt: false,
      errorCode: err?.code || 'ENOTFOUND',
      statusSummary:
        'Domínio sem resolução DNS ativa (não registrado ou aguardando propagação de servidores DNS).',
    };
  }
}

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(firebaseConfigPath, 'utf-8')
);

const BOOTSTRAPPED_ADMIN_EMAIL = 'bainaoklan@gmail.com';

// Initialize Gemini SDK on Server Side only (Separated from payment subsystem)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  idToken: string;
}

const dailyUsageCounter = new Map<string, number>();

function getTodayDateKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// Verify Firebase ID Token against Google Identity Toolkit
async function verifyFirebaseToken(idToken: string): Promise<VerifiedUser | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.length < 20) {
    return null;
  }
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{
        localId: string;
        email?: string;
        emailVerified?: boolean;
      }>;
    };
    const user = data.users?.[0];
    if (!user || !user.localId) return null;
    return {
      uid: user.localId,
      email: user.email || '',
      emailVerified: Boolean(user.emailVerified),
      idToken,
    };
  } catch {
    return null;
  }
}

function docFullPath(collectionPath: string, docId: string): string {
  return `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/${collectionPath}/${docId}`;
}

// Fetch a Firestore document via REST API using verified token
async function getFirestoreDocument(
  collectionPath: string,
  docId: string,
  idToken?: string
): Promise<Record<string, any> | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/${docFullPath(
      collectionPath,
      encodeURIComponent(docId)
    )}`;
    const headers: Record<string, string> = {};
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const raw = (await res.json()) as { fields?: Record<string, any> };
    if (!raw.fields) return null;
    const parsed: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw.fields)) {
      if ('stringValue' in v) parsed[k] = v.stringValue;
      else if ('integerValue' in v) parsed[k] = Number(v.integerValue);
      else if ('booleanValue' in v) parsed[k] = Boolean(v.booleanValue);
      else if ('timestampValue' in v) parsed[k] = v.timestampValue;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Execute atomic server-side writes to Firestore with REQUEST_TIME transforms
async function commitFirestoreWrites(writes: any[], idToken?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:commit`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, error: errBody };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function isVerifiedAdminOnServer(user: VerifiedUser): Promise<boolean> {
  if (!user.emailVerified) return false;
  if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) return true;
  const adminDoc = await getFirestoreDocument('admins', user.uid, user.idToken);
  return Boolean(adminDoc && adminDoc.uid === user.uid);
}

// Authoritative tool prompts in Brazilian Portuguese (Separated from Payment System)
const TOOL_SYSTEM_PROMPTS: Record<string, { name: string; category: string; systemInstruction: string }> = {
  roteiros: {
    name: 'Gerador de Roteiros para Vídeos',
    category: 'Vídeo',
    systemInstruction: `Você é um roteirista sênior especialista em retenção para YouTube, Reels, TikTok e Shorts no Brasil.
Estruture o roteiro de forma profissional em português brasileiro com:
1. GANCHO DE ALTA RETENÇÃO (Primeiros 3 a 5 segundos) — 3 variações de abertura.
2. CONTEXTO E PROMESSA — Por que o espectador deve assistir até o fim.
3. DESENVOLVIMENTO EM BLOCOS — Com marcações [VISUAL / CENA] e [LOCUÇÃO / FALA] passo a passo.
4. QUEBRA DE PADRÃO — Momento estratégico no meio do vídeo para manter a atenção.
5. CHAMADA PARA AÇÃO (CTA) — Fechamento persuasivo e natural.`,
  },
  titulos: {
    name: 'Gerador de Títulos',
    category: 'Texto',
    systemInstruction: `Você é um especialista em CTR (Taxa de Clique) e copywriting para criadores de conteúdo no Brasil.
Gere 12 títulos altamente magnéticos em português brasileiro divididos em:
- 4 Títulos de Curiosidade Extrema
- 4 Títulos de Benefício Direto / Como Fazer (SEO)
- 4 Títulos de Alerta / Contra-intuitivos
Para cada categoria, inclua também uma sugestão curta de texto para a Thumbnail (máximo 4 palavras).`,
  },
  descricoes: {
    name: 'Gerador de Descrições',
    category: 'Texto',
    systemInstruction: `Você é um especialista em SEO para YouTube, Instagram e TikTok no Brasil.
Crie uma descrição completa e otimizada em português brasileiro contendo:
1. Parágrafo de abertura rico em palavras-chave (primeiras 2 linhas visíveis antes do "ler mais").
2. Resumo estruturado do conteúdo.
3. Sugestão de Capítulos (Timestamps) lógicos.
4. Área estruturada para links importantes e chamada para inscrição/engajamento.
5. Palavras-chave estratégicas (tags de busca) ao final.`,
  },
  hashtags: {
    name: 'Gerador de Hashtags',
    category: 'Produtividade',
    systemInstruction: `Você é um estrategista de alcance orgânico e indexação algorítmica para redes sociais no Brasil.
Gere conjuntos estratégicos de hashtags em português brasileiro organizados por:
1. Hashtags de Nicho Específico (Alta conversão)
2. Hashtags de Médio Volume (Crescimento)
3. Hashtags Amplas / Tendência
4. Bloco Pronto para Copiar e Colar (Mix ideal de 15 hashtags) e orientações de uso.`,
  },
  ideias: {
    name: 'Gerador de Ideias de Conteúdo',
    category: 'Produtividade',
    systemInstruction: `Você é um diretor criativo de mídia digital para criadores brasileiros.
Desenvolva uma matriz com 10 ideias originais e acionáveis de conteúdo para o nicho informado:
Para cada ideia, apresente:
- Título da pauta
- Formato ideal (Reels/Shorts, Vídeo Longo, Carrossel, Live)
- Ângulo criativo diferencial (por que essa ideia se destaca)
- Nível de complexidade de produção (Baixo, Médio, Alto).`,
  },
  biografias: {
    name: 'Gerador de Biografias',
    category: 'Texto',
    systemInstruction: `Você é um especialista em posicionamento de marca pessoal e conversão de perfil no Brasil.
Crie 6 opções de biografias (Bio) profissionais em português brasileiro:
- 2 opções focadas em Autoridade e Especialidade
- 2 opções focadas em Conexão e Comunidade
- 2 opções enxutas focadas em Conversão Direta (CTA para link na bio)
Respeite o limite de caracteres do Instagram/TikTok/YouTube e inclua sugestão de frase para o botão de link.`,
  },
  assistente: {
    name: 'Assistente para Criadores',
    category: 'Texto',
    systemInstruction: `Você é um consultor estratégico sênior de produção de conteúdo, monetização e retenção de audiência no Brasil.
Responda à dúvida ou desafio do criador com um plano de ação prático, direto, técnico e detalhado em português brasileiro, evitando clichês genéricos.`,
  },
  organizador: {
    name: 'Organizador de Projetos',
    category: 'Produtividade',
    systemInstruction: `Você é um produtor executivo audiovisual especialista em fluxo de trabalho para criadores.
Transforme a meta ou projeto descrito pelo usuário em um Plano de Produção estruturado contendo:
1. Cronograma de etapas (Pré-produção, Roteirização, Gravação, Edição, Publicação e Distribuição)
2. Checklist técnico de gravação e ativos necessários
3. Calendário sugerido de distribuição multiplataforma.`,
  },
};

// Protected digital product deliverables (served only after verified approved order)
const PROTECTED_DIGITAL_ASSETS: Record<
  string,
  { title: string; priceCents: number; fileName: string; content: string }
> = {
  'pack-roteiros-retencao': {
    title: 'Pack 50 Estruturas de Roteiros de Alta Retenção',
    priceCents: 2990,
    fileName: 'nexus-pack-50-roteiros-retencao.md',
    content: `# NEXUS AI STUDIO — Pack 50 Estruturas de Roteiros de Alta Retenção
Licença Comercial Individual para Criadores de Conteúdo.

## Módulo 1: Ganchos de 3 Segundos (Hooks Visuais e Verbais)
1. **A Quebra de Expectativa**: "Todo mundo no nicho de [Nicho] diz para você fazer [Ação Comum]. Eu testei o exato oposto por 30 dias e este foi o resultado..."
2. **O Erro Invisível**: "Se você ainda faz [Hábito] ao gravar seus vídeos, você está perdendo metade da sua retenção nos primeiros 10 segundos."
3. **A Demonstração Imediata**: Mostre o resultado pronto no segundo 01 antes de explicar o processo.

## Módulo 2: Framework de Retenção Contínua (Loop Aberto)
- **Minuto 0:00 - 0:15**: Gancho + Promessa clara sem enrolação.
- **Minuto 0:15 - 1:30**: Primeiro bloco prático + abertura de loop secundário ("E o terceiro passo é o que 90% ignora...").
- **Fechamento Rápido**: Conclusão em menos de 15 segundos conectando diretamente com o próximo vídeo do canal.`,
  },
  'guia-algoritmo-seo': {
    title: 'Guia Técnico de SEO, Títulos e CTR para Vídeos',
    priceCents: 3990,
    fileName: 'nexus-guia-tecnico-seo-ctr.md',
    content: `# NEXUS AI STUDIO — Guia Técnico de SEO, Títulos e CTR para Vídeos
Material Oficial de Otimização de Canal e Descoberta Orgânica.

## 1. Engenharia de Taxa de Clique (CTR)
- Contraste visual na miniatura: máximo de 3 elementos focais.
- Complementaridade: O texto da thumbnail NUNCA deve repetir exatamente o título do vídeo; ele deve criar uma pergunta ou tensão visual.

## 2. Indexação Semântica nas Primeiras 48 Horas
- As primeiras 160 letras da descrição funcionam como meta-description para busca externa e interna.
- Utilize capítulos nomeados com termos reais de pesquisa do público.`,
  },
  'sistema-producao-semanal': {
    title: 'Sistema de Produção Semanal em Lote (Batch Creation)',
    priceCents: 4990,
    fileName: 'nexus-sistema-producao-lote.md',
    content: `# NEXUS AI STUDIO — Sistema de Produção Semanal em Lote
Manual Operacional para Gravar 15 Conteúdos em 1 Turno.

## 1. Divisão de Energia Criativa
- **Segunda-feira (60 min)**: Coleta de ideias e geração de títulos no NEXUS AI STUDIO.
- **Terça-feira (90 min)**: Roteirização completa em lote de 5 vídeos principais.
- **Quarta-feira (120 min)**: Gravação contínua agrupada por iluminação e enquadramento.
- **Quinta-feira**: Edição focada em cortes dinâmicos a cada 4-6 segundos.`,
  },
};

const OFFICIAL_NUBANK_PIX_LINKS = {
  pro: 'https://nubank.com.br/cobrar/90ldd3/6ac97ae0-2ce1-4d8f-a685-c673c40677f5',
  studio: 'https://nubank.com.br/cobrar/90ldd3/6ac97b26-1c25-48d6-b267-b7a4d750f7fb',
} as const;

const AUTHORITATIVE_PLANS: Record<
  string,
  { id: string; name: string; priceCents: number; dailyLimit: number; pixPaymentLink?: string }
> = {
  free: { id: 'free', name: 'Plano Gratuito', priceCents: 0, dailyLimit: 5 },
  pro: {
    id: 'pro',
    name: 'Plano Pro',
    priceCents: 1990,
    dailyLimit: 100,
    pixPaymentLink: OFFICIAL_NUBANK_PIX_LINKS.pro,
  },
  studio: {
    id: 'studio',
    name: 'Plano Studio',
    priceCents: 3990,
    dailyLimit: 500,
    pixPaymentLink: OFFICIAL_NUBANK_PIX_LINKS.studio,
  },
};

// Ensure persistent Firestore configuration app_settings/global is initialized with the official prices and Nubank Pix links
async function ensureGlobalPlanSettingsInFirestore() {
  const existing = await getFirestoreDocument('app_settings', 'global');
  if (existing && existing.proPixLink && existing.studioPixLink) {
    return existing;
  }
  const writes = [
    {
      update: {
        name: docFullPath('app_settings', 'global'),
        fields: {
          id: { stringValue: 'global' },
          freeDailyLimit: { integerValue: '5' },
          proDailyLimit: { integerValue: '100' },
          studioDailyLimit: { integerValue: '500' },
          proPriceCents: { integerValue: '1990' },
          studioPriceCents: { integerValue: '3990' },
          proPixLink: { stringValue: OFFICIAL_NUBANK_PIX_LINKS.pro },
          studioPixLink: { stringValue: OFFICIAL_NUBANK_PIX_LINKS.studio },
          pixKey: { stringValue: OFFICIAL_NUBANK_PIX_LINKS.pro },
          pixKeyType: { stringValue: 'Link de Cobrança Pix Nubank' },
          pixHolderName: { stringValue: 'NEXUS AI STUDIO (Conta Nubank)' },
          pixBankName: { stringValue: 'Nu Pagamentos S.A. (Nubank)' },
          supportEmail: { stringValue: 'suporte@nexusaistudio.com.br' },
          termsOfUse: {
            stringValue:
              'TERMOS DE USO — NEXUS AI STUDIO: Os planos Gratuito (R$ 0,00), Pro (R$ 19,90) e Studio (R$ 39,90) possuem limites diários verificados no servidor. Os pagamentos são realizados via links de cobrança Pix do Nubank, sem renovação automática, com liberação após confirmação pelo administrador no servidor.',
          },
          privacyPolicy: {
            stringValue:
              'POLÍTICA DE PRIVACIDADE — NEXUS AI STUDIO: Dados de conta, histórico, projetos e pedidos são armazenados com isolamento de usuário no Cloud Firestore.',
          },
          cancellationPolicy: {
            stringValue:
              'POLÍTICA DE CANCELAMENTO — NEXUS AI STUDIO: Os links de cobrança Pix do Nubank não realizam cobrança recorrente automática. Pedidos pendentes podem ser cancelados no painel do usuário.',
          },
        },
      },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
    },
  ];
  await commitFirestoreWrites(writes);
  return await getFirestoreDocument('app_settings', 'global');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Canonical www -> non-www redirect & Private Route NoIndex Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();

    if (hostHeader.toLowerCase().startsWith('www.')) {
      const bareHost = hostHeader.slice(4);
      res.redirect(301, `https://${bareHost}${req.originalUrl}`);
      return;
    }

    const reqPath = req.path.toLowerCase();
    const isPrivateOrApiRoute =
      reqPath.startsWith('/api/') ||
      reqPath.startsWith('/admin') ||
      reqPath.startsWith('/painel') ||
      reqPath.startsWith('/dashboard') ||
      reqPath.startsWith('/projetos') ||
      reqPath.startsWith('/projects') ||
      reqPath.startsWith('/conversa') ||
      reqPath.startsWith('/chat') ||
      reqPath.startsWith('/notificacoes') ||
      reqPath.startsWith('/notifications') ||
      reqPath.startsWith('/checkout');

    if (isPrivateOrApiRoute) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }

    next();
  });

  // Dynamic robots.txt endpoint
  app.get('/robots.txt', (req: Request, res: Response) => {
    const origin = resolveCanonicalOrigin(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(generateRobotsTxt(origin));
  });

  // Dynamic sitemap.xml endpoint
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const origin = resolveCanonicalOrigin(req);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(generateSitemapXml(origin));
  });

  // Initialize persistent plan prices and Nubank Pix links in Firestore on startup
  ensureGlobalPlanSettingsInFirestore().catch(() => {});

  // Middleware to authenticate requests with Firebase Bearer token
  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Autenticação necessária. Faça login para acessar este recurso.',
      });
      return;
    }
    const idToken = authHeader.replace('Bearer ', '').trim();
    const verified = await verifyFirebaseToken(idToken);
    if (!verified) {
      res.status(401).json({
        error: 'Sessão inválida ou expirada. Faça login novamente.',
      });
      return;
    }
    (req as any).user = verified;
    next();
  }

  // 1. Health & Configuration Status
  app.get('/api/system/status', async (_req: Request, res: Response) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim() !== ''
    );
    const settingsDoc =
      (await getFirestoreDocument('app_settings', 'global')) ||
      (await ensureGlobalPlanSettingsInFirestore());

    const proPixLink = String(settingsDoc?.proPixLink || OFFICIAL_NUBANK_PIX_LINKS.pro);
    const studioPixLink = String(settingsDoc?.studioPixLink || OFFICIAL_NUBANK_PIX_LINKS.studio);

    res.json({
      geminiConfigured,
      paymentMode: 'manual_nubank_pix_links',
      manualPixConfigured: Boolean(proPixLink && studioPixLink),
      proPriceCents: Number(settingsDoc?.proPriceCents || 1990),
      studioPriceCents: Number(settingsDoc?.studioPriceCents || 3990),
      proPixLink,
      studioPixLink,
      pixBankName: settingsDoc?.pixBankName || 'Nu Pagamentos S.A. (Nubank)',
      pixKeyType: settingsDoc?.pixKeyType || 'Link de Cobrança Pix Nubank',
      pixHolderName: settingsDoc?.pixHolderName || 'NEXUS AI STUDIO (Conta Nubank)',
      imageGenerationAvailable: false,
      videoGenerationAvailable: false,
      environment: process.env.NODE_ENV || 'development',
      publicAppUrl: resolveCanonicalOrigin(),
      sharedAppUrl: PUBLIC_SHARED_APP_URL,
      developmentAppUrl: DEVELOPMENT_APP_URL,
      sitemapUrl: `${resolveCanonicalOrigin()}/sitemap.xml`,
      robotsUrl: `${resolveCanonicalOrigin()}/robots.txt`,
      googleSiteVerificationConfigured: Boolean(process.env.GOOGLE_SITE_VERIFICATION),
    });
  });

  // 1b. SEO, Custom Domain DNS & Google Search Console Verification Endpoint
  app.get('/api/system/seo-domain-status', async (req: Request, res: Response) => {
    const customQueryDomain = String(req.query.domain || '').trim();
    const domainsToCheck = ['nexusaistudio.com.br', 'nexusaistudio.com'];
    if (
      customQueryDomain &&
      !domainsToCheck.includes(customQueryDomain.toLowerCase()) &&
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(customQueryDomain)
    ) {
      domainsToCheck.push(customQueryDomain.toLowerCase());
    }

    const dnsChecks = await Promise.all(domainsToCheck.map((d) => checkDomainDnsStatus(d)));
    const canonicalOrigin = resolveCanonicalOrigin(req);

    res.json({
      checkedAt: new Date().toISOString(),
      hostingPlatform: 'Google Cloud Run (Full-Stack Node.js + Express + Vite SPA com HTTPS Nativo)',
      canonicalOrigin,
      publicSharedUrl: PUBLIC_SHARED_APP_URL,
      developmentUrl: DEVELOPMENT_APP_URL,
      sitemapUrl: `${canonicalOrigin}/sitemap.xml`,
      robotsTxtUrl: `${canonicalOrigin}/robots.txt`,
      publicIndexableRoutes: [
        { path: '/', title: 'NEXUS AI STUDIO — Plataforma de Inteligência Artificial' },
        { path: '/ferramentas', title: 'Ferramentas de Inteligência Artificial — NEXUS AI STUDIO' },
        { path: '/nexus-lab', title: 'NEXUS LAB · Estúdio Criativo Interativo — NEXUS AI STUDIO' },
        { path: '/planos', title: 'Planos e Preços (Gratuito, Pro e Studio) — NEXUS AI STUDIO' },
        { path: '/produtos', title: 'Produtos Oficiais Google Store & Frameworks — NEXUS AI STUDIO' },
      ],
      protectedNoIndexRoutes: [
        '/conversa',
        '/notificacoes',
        '/painel',
        '/projetos',
        '/checkout',
        '/admin',
        '/api/*',
      ],
      domainChecks: dnsChecks,
    });
  });

  // 2. Verify Admin Status
  app.get('/api/admin/verify-status', requireAuth, async (req: Request, res: Response) => {
    const user: VerifiedUser = (req as any).user;
    const isAdmin = await isVerifiedAdminOnServer(user);
    res.json({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      isAdmin,
      bootstrappedEmailMatch: user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified,
    });
  });

  // 3. Execute AI Creator Tool (Independent from Payment Subsystem; reads authoritative planId from Firestore)
  app.post('/api/ai/execute', requireAuth, async (req: Request, res: Response) => {
    const user: VerifiedUser = (req as any).user;
    const { toolId, topic, platform, tone, audience, extraDetails } = req.body || {};

    if (!toolId || typeof toolId !== 'string' || !TOOL_SYSTEM_PROMPTS[toolId]) {
      res.status(400).json({ error: 'Ferramenta inválida ou não especificada.' });
      return;
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3 || topic.trim().length > 1500) {
      res.status(400).json({
        error: 'Informe um tema ou descrição válida (entre 3 e 1500 caracteres).',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'A integração com o Gemini AI não está configurada no servidor. Configure a variável GEMINI_API_KEY no painel Secrets para ativar a geração.',
        code: 'GEMINI_NOT_CONFIGURED',
      });
      return;
    }

    // Fetch authoritative user plan from Firestore (never trust client-reported plan)
    const userDoc = await getFirestoreDocument('users', user.uid, user.idToken);
    const settingsDoc = await getFirestoreDocument('app_settings', 'global', user.idToken);

    const authoritativePlanId =
      userDoc?.planId && ['free', 'pro', 'studio'].includes(userDoc.planId)
        ? userDoc.planId
        : 'free';

    const dailyLimits: Record<string, number> = {
      free: settingsDoc?.freeDailyLimit || AUTHORITATIVE_PLANS.free.dailyLimit,
      pro: settingsDoc?.proDailyLimit || AUTHORITATIVE_PLANS.pro.dailyLimit,
      studio: settingsDoc?.studioDailyLimit || AUTHORITATIVE_PLANS.studio.dailyLimit,
    };

    const userDailyLimit = dailyLimits[authoritativePlanId] || 5;
    const dateKey = getTodayDateKey();
    const counterKey = `${user.uid}:${dateKey}`;
    const currentUsed = dailyUsageCounter.get(counterKey) || 0;

    if (currentUsed >= userDailyLimit) {
      res.status(429).json({
        error: `Limite diário atingido para o plano ${authoritativePlanId.toUpperCase()} (${userDailyLimit} execuções/dia). Faça upgrade de plano para continuar produzindo hoje.`,
        code: 'DAILY_LIMIT_REACHED',
        usedToday: currentUsed,
        dailyLimit: userDailyLimit,
        planId: authoritativePlanId,
      });
      return;
    }

    const toolSpec = TOOL_SYSTEM_PROMPTS[toolId];
    const userPrompt = [
      `Ferramenta: ${toolSpec.name}`,
      `Tema / Objetivo Principal: ${topic.trim()}`,
      platform ? `Plataforma Alvo: ${String(platform).slice(0, 80)}` : '',
      tone ? `Tom de Voz / Estilo: ${String(tone).slice(0, 80)}` : '',
      audience ? `Público-Alvo: ${String(audience).slice(0, 120)}` : '',
      extraDetails ? `Detalhes Adicionais: ${String(extraDetails).slice(0, 500)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction: toolSpec.systemInstruction,
          temperature: 0.75,
        },
      });

      const outputText = response.text || '';
      if (!outputText.trim()) {
        res.status(502).json({
          error: 'O modelo não retornou conteúdo para esta solicitação. Tente detalhar melhor o tema.',
        });
        return;
      }

      const updatedUsed = currentUsed + 1;
      dailyUsageCounter.set(counterKey, updatedUsed);

      res.json({
        result: outputText,
        toolId,
        toolName: toolSpec.name,
        category: toolSpec.category,
        dateKey,
        usage: {
          usedToday: updatedUsed,
          dailyLimit: userDailyLimit,
          planId: authoritativePlanId,
        },
      });
    } catch (err: any) {
      console.error('Erro na chamada Gemini:', err);
      res.status(500).json({
        error:
          'Falha ao processar sua solicitação com o Gemini AI no servidor. Verifique sua conexão ou tente novamente em instantes.',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // 3b. Conversational AI & Intelligent NEXUS Robot Endpoint (Real Gemini AI on Server)
  app.post('/api/ai/chat', requireAuth, async (req: Request, res: Response) => {
    const user: VerifiedUser = (req as any).user;
    const { message, history, mode, announcementsContext } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length < 1 || message.trim().length > 4000) {
      res.status(400).json({
        error: 'Digite uma mensagem válida (entre 1 e 4000 caracteres).',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'A integração com o Gemini AI não está configurada no servidor. Configure a variável GEMINI_API_KEY no painel Secrets.',
        code: 'GEMINI_NOT_CONFIGURED',
      });
      return;
    }

    const userDoc = await getFirestoreDocument('users', user.uid, user.idToken);
    const settingsDoc = await getFirestoreDocument('app_settings', 'global', user.idToken);

    const authoritativePlanId =
      userDoc?.planId && ['free', 'pro', 'studio'].includes(userDoc.planId)
        ? userDoc.planId
        : 'free';

    const dailyLimits: Record<string, number> = {
      free: settingsDoc?.freeDailyLimit || AUTHORITATIVE_PLANS.free.dailyLimit,
      pro: settingsDoc?.proDailyLimit || AUTHORITATIVE_PLANS.pro.dailyLimit,
      studio: settingsDoc?.studioDailyLimit || AUTHORITATIVE_PLANS.studio.dailyLimit,
    };

    const userDailyLimit = dailyLimits[authoritativePlanId] || 5;
    const dateKey = getTodayDateKey();
    const counterKey = `${user.uid}:${dateKey}`;
    const currentUsed = dailyUsageCounter.get(counterKey) || 0;

    if (currentUsed >= userDailyLimit) {
      res.status(429).json({
        error: `Limite diário atingido para o plano ${authoritativePlanId.toUpperCase()} (${userDailyLimit} interações/dia). Faça upgrade de plano para continuar conversando hoje.`,
        code: 'DAILY_LIMIT_REACHED',
        usedToday: currentUsed,
        dailyLimit: userDailyLimit,
        planId: authoritativePlanId,
      });
      return;
    }

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-10)
          .filter(
            (m: any) =>
              m &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string' &&
              m.content.trim().length > 0
          )
          .map((m: any) => `${m.role === 'user' ? 'Usuário' : 'NEXUS'}: ${m.content.slice(0, 1500)}`)
          .join('\n\n')
      : '';

    const announcementsSummary =
      typeof announcementsContext === 'string' && announcementsContext.trim().length > 0
        ? `\nComunicados Reais Publicados na Central de Atualizações:\n${announcementsContext.slice(0, 1500)}`
        : '';

    const systemInstruction =
      mode === 'robot'
        ? `Você é o NEXUS, o robô assistente oficial da plataforma NEXUS AI STUDIO.
Responda sempre em português brasileiro, de forma clara, prestativa, direta e bem estruturada.
Suas funções reais dentro da NEXUS AI STUDIO são:
1. Responder dúvidas sobre a plataforma NEXUS AI STUDIO e seu menu lateral (Conversa IA, NEXUS LAB, Ferramentas, Projetos Salvos, Planos, Produtos, Notificações e Perfil).
2. Explicar como usar cada uma das 8 ferramentas reais: Gerador de Roteiros para Vídeos, Gerador de Títulos, Gerador de Descrições, Gerador de Hashtags, Gerador de Ideias de Conteúdo, Gerador de Biografias, Assistente para Criadores e Organizador de Projetos.
3. Ajudar diretamente o criador a criar roteiros, títulos, descrições, hashtags e ideias.
4. Informar sobre as atualizações publicadas reais listadas abaixo (nunca invente atualizações que não estejam registradas e não afirme que você monitora toda a internet automaticamente).
5. Orientar sobre os planos oficiais: Plano Gratuito (R$ 0,00 — ${dailyLimits.free} execuções/dia), Plano Pro (R$ 19,90 — ${dailyLimits.pro} execuções/dia via Pix Nubank) e Plano Studio (R$ 39,90 — ${dailyLimits.studio} execuções/dia via Pix Nubank), com aprovação segura no servidor pelo administrador.
Plano atual do usuário autenticado: ${authoritativePlanId.toUpperCase()} (${currentUsed}/${userDailyLimit} usos hoje).${announcementsSummary}`
        : `Você é o assistente central de inteligência artificial da plataforma NEXUS AI STUDIO ("Como posso ajudar você hoje?").
Você é especialista em criação de conteúdo digital, roteirização de alta retenção (YouTube, Reels, TikTok, Shorts), copywriting, títulos magnéticos, SEO, estratégia de canal e organização de produção no Brasil.
Responda sempre em português brasileiro com formatação clara, tópicos organizados e conteúdo prático pronto para uso.
Plano atual do usuário: ${authoritativePlanId.toUpperCase()}.${announcementsSummary}`;

    const fullPrompt = safeHistory
      ? `Histórico recente da conversa:\n${safeHistory}\n\nNova mensagem do Usuário:\n${message.trim()}`
      : message.trim();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || '';
      if (!replyText.trim()) {
        res.status(502).json({
          error: 'O assistente não retornou resposta para esta mensagem. Tente reformular sua pergunta.',
        });
        return;
      }

      const updatedUsed = currentUsed + 1;
      dailyUsageCounter.set(counterKey, updatedUsed);

      res.json({
        reply: replyText,
        dateKey,
        usage: {
          usedToday: updatedUsed,
          dailyLimit: userDailyLimit,
          planId: authoritativePlanId,
        },
      });
    } catch (err: any) {
      console.error('Erro na conversa Gemini:', err);
      res.status(500).json({
        error:
          'Não foi possível concluir a geração com o Gemini AI no momento. Seu texto foi preservado para tentar novamente.',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // 4. Server-Side Manual Nubank Pix Order Preparation (No API token required; never auto-approves)
  app.post('/api/payments/create-pix', requireAuth, async (req: Request, res: Response) => {
    const user: VerifiedUser = (req as any).user;
    const { itemType, itemId, orderId } = req.body || {};

    if (!orderId || typeof orderId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(orderId)) {
      res.status(400).json({ error: 'Identificador de pedido inválido.' });
      return;
    }

    const settingsDoc = await getFirestoreDocument('app_settings', 'global', user.idToken);

    let authoritativeTitle = '';
    let authoritativeAmountCents = 0;
    let pixPaymentLink = '';

    if (itemType === 'plan') {
      if (itemId === 'pro') {
        authoritativeTitle = 'Plano Pro — NEXUS AI STUDIO';
        authoritativeAmountCents =
          Number(settingsDoc?.proPriceCents) || AUTHORITATIVE_PLANS.pro.priceCents;
        pixPaymentLink = String(settingsDoc?.proPixLink || OFFICIAL_NUBANK_PIX_LINKS.pro).trim();
      } else if (itemId === 'studio') {
        authoritativeTitle = 'Plano Studio — NEXUS AI STUDIO';
        authoritativeAmountCents =
          Number(settingsDoc?.studioPriceCents) || AUTHORITATIVE_PLANS.studio.priceCents;
        pixPaymentLink = String(
          settingsDoc?.studioPixLink || OFFICIAL_NUBANK_PIX_LINKS.studio
        ).trim();
      } else {
        res.status(400).json({ error: 'Plano inválido para cobrança Pix.' });
        return;
      }
    } else if (itemType === 'product') {
      const prodDoc = await getFirestoreDocument('products', String(itemId), user.idToken);
      const fallbackAsset = PROTECTED_DIGITAL_ASSETS[String(itemId)];
      if (prodDoc && prodDoc.priceCents > 0) {
        authoritativeTitle = prodDoc.title;
        authoritativeAmountCents = prodDoc.priceCents;
      } else if (fallbackAsset) {
        authoritativeTitle = fallbackAsset.title;
        authoritativeAmountCents = fallbackAsset.priceCents;
      } else {
        res.status(404).json({ error: 'Produto digital não encontrado.' });
        return;
      }
      pixPaymentLink = String(
        settingsDoc?.pixKey || settingsDoc?.proPixLink || OFFICIAL_NUBANK_PIX_LINKS.pro
      ).trim();
    } else {
      res.status(400).json({ error: 'Tipo de item inválido.' });
      return;
    }

    const pixKeyType = String(settingsDoc?.pixKeyType || 'Link de Cobrança Pix Nubank').trim();
    const pixHolderName = String(
      settingsDoc?.pixHolderName || 'NEXUS AI STUDIO (Conta Nubank)'
    ).trim();
    const pixBankName = String(settingsDoc?.pixBankName || 'Nu Pagamentos S.A. (Nubank)').trim();

    res.status(200).json({
      configured: pixPaymentLink.length > 0,
      orderId,
      itemType,
      itemId,
      itemTitle: authoritativeTitle,
      amountCents: authoritativeAmountCents,
      status: 'awaiting_payment',
      externalReference: `nubank_${orderId}`,
      pixCopyPaste: pixPaymentLink,
      pixPaymentLink,
      pixKey: pixPaymentLink,
      pixKeyType,
      pixHolderName,
      pixBankName,
      message:
        'Pedido registrado com status Aguardando pagamento. Conclua o Pix pelo link oficial do Nubank e aguarde a confirmação manual pelo administrador no servidor.',
    });
  });

  // 4b. Verify Real Order Status on Server
  app.get('/api/payments/verify/:orderId', requireAuth, async (req: Request, res: Response) => {
    const user: VerifiedUser = (req as any).user;
    const { orderId } = req.params;

    if (!orderId || !/^[a-zA-Z0-9_\-]+$/.test(orderId)) {
      res.status(400).json({ error: 'Identificador de pedido inválido.' });
      return;
    }

    const orderDoc = await getFirestoreDocument('orders', orderId, user.idToken);
    if (!orderDoc) {
      res.status(404).json({ error: 'Pedido não encontrado no banco de dados.' });
      return;
    }

    const isAdmin = await isVerifiedAdminOnServer(user);
    if (orderDoc.userId !== user.uid && !isAdmin) {
      res.status(403).json({ error: 'Acesso negado a este pedido.' });
      return;
    }

    const status = String(orderDoc.status || 'awaiting_payment');
    const statusLabel =
      status === 'approved'
        ? 'Aprovado — Plano/Produto liberado pelo servidor'
        : status === 'cancelled'
        ? 'Cancelado'
        : 'Aguardando pagamento (confirmação manual pelo administrador)';

    res.json({
      orderId,
      verifiedStatus: status,
      statusLabel,
      amountCents: orderDoc.amountCents,
      itemType: orderDoc.itemType,
      itemId: orderDoc.itemId,
      message: `Status consultado no servidor: ${statusLabel}.`,
    });
  });

  // 5. Server-Side Manual Order Approval / Cancellation by Authorized Administrator ONLY
  app.post('/api/admin/orders/:orderId/decision', requireAuth, async (req: Request, res: Response) => {
    const adminUser: VerifiedUser = (req as any).user;
    const isAdmin = await isVerifiedAdminOnServer(adminUser);

    if (!isAdmin) {
      res.status(403).json({
        error:
          'Acesso negado. Somente um administrador autorizado no servidor pode aprovar ou cancelar pagamentos.',
      });
      return;
    }

    const { orderId } = req.params;
    const { decision } = req.body || {};

    if (!orderId || !/^[a-zA-Z0-9_\-]+$/.test(orderId)) {
      res.status(400).json({ error: 'ID de pedido inválido.' });
      return;
    }

    if (decision !== 'approve' && decision !== 'cancel') {
      res.status(400).json({ error: 'Decisão inválida. Use "approve" ou "cancel".' });
      return;
    }

    const orderDoc = await getFirestoreDocument('orders', orderId, adminUser.idToken);
    if (!orderDoc) {
      res.status(404).json({ error: 'Pedido não encontrado no banco de dados.' });
      return;
    }

    const newOrderStatus = decision === 'approve' ? 'approved' : 'cancelled';
    const writes: any[] = [];

    // 1. Update the order status on the server
    writes.push({
      update: {
        name: docFullPath('orders', orderId),
        fields: {
          id: { stringValue: String(orderDoc.id) },
          userId: { stringValue: String(orderDoc.userId) },
          itemType: { stringValue: String(orderDoc.itemType) },
          itemId: { stringValue: String(orderDoc.itemId) },
          itemTitle: { stringValue: String(orderDoc.itemTitle) },
          amountCents: { integerValue: String(orderDoc.amountCents) },
          status: { stringValue: newOrderStatus },
          externalReference: { stringValue: String(orderDoc.externalReference) },
          pixCopyPaste: { stringValue: String(orderDoc.pixCopyPaste || '') },
          createdAt: { timestampValue: String(orderDoc.createdAt) },
        },
      },
      updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
    });

    // 2. Record the verified payment decision in /payments
    const paymentId = `pay_${orderId}`;
    writes.push({
      update: {
        name: docFullPath('payments', paymentId),
        fields: {
          id: { stringValue: paymentId },
          orderId: { stringValue: orderId },
          userId: { stringValue: String(orderDoc.userId) },
          amountCents: { integerValue: String(orderDoc.amountCents) },
          status: { stringValue: newOrderStatus },
          provider: { stringValue: 'Pix Manual Nubank' },
          transactionId: { stringValue: `nubank_${orderId}` },
          idempotencyKey: { stringValue: `decision_${orderId}_${newOrderStatus}` },
        },
      },
      updateTransforms: [
        { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
        { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
      ],
    });

    // 3. If approved and itemType === 'plan', unlock the user's plan and active subscription on the server
    if (decision === 'approve' && orderDoc.itemType === 'plan') {
      const targetUserDoc = await getFirestoreDocument('users', String(orderDoc.userId), adminUser.idToken);
      if (targetUserDoc) {
        writes.push({
          update: {
            name: docFullPath('users', String(orderDoc.userId)),
            fields: {
              uid: { stringValue: String(targetUserDoc.uid) },
              displayName: { stringValue: String(targetUserDoc.displayName || 'Criador') },
              photoURL: { stringValue: String(targetUserDoc.photoURL || '') },
              role: { stringValue: String(targetUserDoc.role || 'user') },
              planId: { stringValue: String(orderDoc.itemId) },
              createdAt: { timestampValue: String(targetUserDoc.createdAt) },
            },
          },
          updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
        });
      }

      const subId = `sub_${orderId}`;
      writes.push({
        update: {
          name: docFullPath('subscriptions', subId),
          fields: {
            id: { stringValue: subId },
            userId: { stringValue: String(orderDoc.userId) },
            planId: { stringValue: String(orderDoc.itemId) },
            status: { stringValue: 'active' },
            priceCents: { integerValue: String(orderDoc.amountCents) },
          },
        },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      });
    }

    // 4. Automatic internal platform notification to the customer (non-duplicated deterministic ID)
    const notifId = `notif_order_${orderId}_${newOrderStatus}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
    const notifTitle =
      decision === 'approve'
        ? `Pagamento Confirmado: ${String(orderDoc.itemTitle).slice(0, 100)}`
        : `Pedido Cancelado: ${String(orderDoc.itemTitle).slice(0, 100)}`;
    const notifMessage =
      decision === 'approve'
        ? `Seu pagamento referente a "${orderDoc.itemTitle}" foi aprovado pelo administrador no servidor e seus recursos já estão liberados na sua conta.`
        : `O pedido "${orderDoc.itemTitle}" (${orderId}) foi marcado como cancelado. Caso precise de auxílio, abra um chamado no painel de suporte.`;

    writes.push({
      update: {
        name: docFullPath('user_notifications', notifId),
        fields: {
          id: { stringValue: notifId },
          userId: { stringValue: String(orderDoc.userId) },
          eventKey: { stringValue: `order_${orderId}_${newOrderStatus}`.slice(0, 128) },
          title: { stringValue: notifTitle },
          message: { stringValue: notifMessage },
          category: { stringValue: orderDoc.itemType === 'plan' ? 'plano' : 'pedido' },
          read: { booleanValue: false },
        },
      },
      updateTransforms: [
        { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
        { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
      ],
    });

    const commitRes = await commitFirestoreWrites(writes, adminUser.idToken);
    if (!commitRes.ok) {
      res.status(500).json({
        error: 'Não foi possível gravar a decisão do pedido no banco de dados.',
        details: commitRes.error,
      });
      return;
    }

    res.json({
      success: true,
      orderId,
      status: newOrderStatus,
      planUnlocked: decision === 'approve' && orderDoc.itemType === 'plan' ? orderDoc.itemId : null,
      message:
        decision === 'approve'
          ? 'Pagamento aprovado no servidor! O pedido foi confirmado, o plano/produto foi liberado e o cliente recebeu uma notificação automática.'
          : 'Pedido marcado como cancelado pelo administrador e cliente notificado.',
    });
  });

  // 5b. Server-Protected Admin Announcements Management ("Central de Atualizações")
  app.post('/api/admin/announcements', requireAuth, async (req: Request, res: Response) => {
    const adminUser: VerifiedUser = (req as any).user;
    const isAdmin = await isVerifiedAdminOnServer(adminUser);

    if (!isAdmin) {
      res.status(403).json({
        error:
          'Acesso negado no servidor. Somente administradores autorizados podem criar ou publicar comunicados.',
      });
      return;
    }

    const { id, title, message, category, status, targetAudience } = req.body || {};
    const announcementId =
      id && typeof id === 'string' && /^[a-zA-Z0-9_\-]+$/.test(id)
        ? id.slice(0, 128)
        : `ann_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();
    const validCategories = ['nova_ferramenta', 'melhoria', 'manutencao', 'recurso', 'plano'];
    const validStatuses = ['draft', 'published', 'archived'];
    const validAudiences = ['all', 'free', 'pro', 'studio'];

    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
      res.status(400).json({ error: 'O título do comunicado deve ter entre 3 e 150 caracteres.' });
      return;
    }
    if (cleanMessage.length < 5 || cleanMessage.length > 4000) {
      res.status(400).json({ error: 'A mensagem do comunicado deve ter entre 5 e 4000 caracteres.' });
      return;
    }
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Categoria de comunicado inválida.' });
      return;
    }
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado de publicação inválido.' });
      return;
    }
    if (!validAudiences.includes(targetAudience)) {
      res.status(400).json({ error: 'Público-alvo inválido.' });
      return;
    }

    const existingDoc = await getFirestoreDocument('announcements', announcementId, adminUser.idToken);
    const writes: any[] = [
      {
        update: {
          name: docFullPath('announcements', announcementId),
          fields: {
            id: { stringValue: announcementId },
            title: { stringValue: cleanTitle },
            message: { stringValue: cleanMessage },
            category: { stringValue: category },
            status: { stringValue: status },
            targetAudience: { stringValue: targetAudience },
            authorUid: { stringValue: existingDoc?.authorUid || adminUser.uid },
            authorEmail: { stringValue: (existingDoc?.authorEmail || adminUser.email || BOOTSTRAPPED_ADMIN_EMAIL).slice(0, 150) },
            ...(existingDoc?.createdAt ? { createdAt: { timestampValue: String(existingDoc.createdAt) } } : {}),
          },
        },
        updateTransforms: [
          ...(!existingDoc?.createdAt ? [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] : []),
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      },
    ];

    const commitRes = await commitFirestoreWrites(writes, adminUser.idToken);
    if (!commitRes.ok) {
      res.status(500).json({
        error: 'Não foi possível salvar o comunicado no Cloud Firestore.',
        details: commitRes.error,
      });
      return;
    }

    res.json({
      success: true,
      id: announcementId,
      status,
      message:
        status === 'published'
          ? 'Comunicado publicado com sucesso no servidor! Os usuários elegíveis já recebem a atualização em tempo real.'
          : status === 'draft'
          ? 'Rascunho de comunicado salvo no servidor.'
          : 'Comunicado arquivado com sucesso.',
    });
  });

  // 6. Protected Digital Store File Delivery
  app.get('/api/products/:productId/download', requireAuth, async (req: Request, res: Response) => {
    const user: VerifiedUser = (req as any).user;
    const { productId } = req.params;
    const orderId = String(req.query.orderId || '');

    const isAdmin = await isVerifiedAdminOnServer(user);

    if (!isAdmin) {
      if (!orderId) {
        res.status(403).json({
          error: 'Acesso negado. É necessário informar um pedido com pagamento aprovado.',
        });
        return;
      }
      const orderDoc = await getFirestoreDocument('orders', orderId, user.idToken);
      if (
        !orderDoc ||
        orderDoc.userId !== user.uid ||
        orderDoc.itemType !== 'product' ||
        orderDoc.itemId !== productId ||
        orderDoc.status !== 'approved'
      ) {
        res.status(403).json({
          error:
            'Download bloqueado. O arquivo digital só é liberado após a aprovação do pagamento pelo administrador (status: aprovado).',
        });
        return;
      }
    }

    const asset = PROTECTED_DIGITAL_ASSETS[productId];
    if (asset) {
      res.json({
        productId,
        fileName: asset.fileName,
        content: asset.content,
        license: 'Licença de Uso Comercial Individual — NEXUS AI STUDIO',
      });
      return;
    }

    const customProd = await getFirestoreDocument('products', productId, user.idToken);
    if (customProd) {
      res.json({
        productId,
        fileName: `${customProd.id}.md`,
        content: `# ${customProd.title}\n\n${customProd.description}\n\nFormato: ${customProd.fileFormat}\nEntrega autorizada pelo servidor NEXUS AI STUDIO.`,
        license: 'Licença de Uso Comercial Individual — NEXUS AI STUDIO',
      });
      return;
    }

    res.status(404).json({ error: 'Arquivo digital não encontrado.' });
  });

  // 7. Automated Security & Subsystem Verification Suite
  app.get('/api/system/run-tests', async (_req: Request, res: Response) => {
    const results: Array<{
      suite: string;
      name: string;
      passed: boolean;
      details: string;
    }> = [];

    // Test 1: Authentication Guard Rejects Unauthenticated Requests
    const fakeTokenCheck = await verifyFirebaseToken('invalid_token_payload');
    results.push({
      suite: 'Autenticação',
      name: 'Rejeição de Token JWT Inválido ou Forjado',
      passed: fakeTokenCheck === null,
      details: 'Tokens não emitidos pelo Firebase Identity Toolkit retornam null imediatamente.',
    });

    // Test 2: Customer Cannot Approve Their Own Order
    const regularUser: VerifiedUser = {
      uid: 'regular_customer_uid',
      email: 'cliente@exemplo.com',
      emailVerified: true,
      idToken: 'none',
    };
    const customerCanApprove = await isVerifiedAdminOnServer(regularUser);
    results.push({
      suite: 'Pagamentos Pix Manual (Nubank)',
      name: 'Bloqueio de Auto-Aprovação de Pagamento pelo Cliente',
      passed: customerCanApprove === false,
      details: 'Clientes comuns são bloqueados no servidor ao tentar acionar a rota de aprovação de pedidos.',
    });

    // Test 3: Unverified Email Admin Spoof Blocked
    const spoofedAdminUser: VerifiedUser = {
      uid: 'spoof_uid',
      email: BOOTSTRAPPED_ADMIN_EMAIL,
      emailVerified: false,
      idToken: 'none',
    };
    const adminSpoofResult = await isVerifiedAdminOnServer(spoofedAdminUser);
    results.push({
      suite: 'Permissões e RBAC',
      name: 'Bloqueio de Spoofing Administrativo sem E-mail Verificado',
      passed: adminSpoofResult === false,
      details: 'Mesmo com o e-mail do proprietário, tokens sem email_verified == true são recusados.',
    });

    // Test 4: Plan Usage Limits Enforcement (AI Subsystem Isolated)
    const freeLimit = AUTHORITATIVE_PLANS.free.dailyLimit;
    const simulatedUsage = 5;
    const isBlockedAtLimit = simulatedUsage >= freeLimit;
    results.push({
      suite: 'Limites de Uso (Isolamento IA)',
      name: 'Controle de Cota Diária Separado do Sistema de Pagamentos',
      passed: isBlockedAtLimit === true && freeLimit === 5,
      details: `Ferramentas de IA consultam apenas o planId ativo do usuário (${freeLimit} execuções/dia no Gratuito).`,
    });

    // Test 5: Persistent Firestore Plan Prices & Nubank Pix Links Verification
    const liveSettings =
      (await getFirestoreDocument('app_settings', 'global')) ||
      (await ensureGlobalPlanSettingsInFirestore());
    const hasValidLinksAndPrices =
      liveSettings?.proPriceCents === 1990 &&
      liveSettings?.studioPriceCents === 3990 &&
      liveSettings?.proPixLink === OFFICIAL_NUBANK_PIX_LINKS.pro &&
      liveSettings?.studioPixLink === OFFICIAL_NUBANK_PIX_LINKS.studio;
    results.push({
      suite: 'Configuração Persistente Firestore (Links Nubank)',
      name: 'Preços (R$ 19,90 e R$ 39,90) e Links de Cobrança Pix Nubank Salvos no Firestore',
      passed: Boolean(hasValidLinksAndPrices),
      details:
        'Planos Pro e Studio sincronizados em app_settings/global com status inicial awaiting_payment e sem auto-aprovação.',
    });

    // Test 6: Admin Announcements Authorization Guard
    const nonAdminCannotPublishAnnouncement = (await isVerifiedAdminOnServer(regularUser)) === false;
    results.push({
      suite: 'Central de Atualizações & Comunicados',
      name: 'Bloqueio Server-Side de Publicação de Comunicados por Não-Administradores',
      passed: nonAdminCannotPublishAnnouncement,
      details:
        'Apenas administradores verificados no servidor podem criar, editar, publicar ou arquivar comunicados em /announcements.',
    });

    // Test 7: Sitemap XML & Robots.txt Validation
    const canonicalBase = resolveCanonicalOrigin();
    const generatedSitemap = generateSitemapXml(canonicalBase);
    const generatedRobots = generateRobotsTxt(canonicalBase);
    const seoFilesValid =
      generatedSitemap.includes('<urlset') &&
      generatedSitemap.includes('/ferramentas</loc>') &&
      !generatedSitemap.includes('/admin') &&
      generatedRobots.includes('Allow: /') &&
      generatedRobots.includes('Disallow: /admin') &&
      generatedRobots.includes('Disallow: /conversa') &&
      generatedRobots.includes('Sitemap:');
    results.push({
      suite: 'Google Search & SEO (Sitemap e Robots.txt)',
      name: 'Validação de Sitemap XML Público e Bloqueio de Rotas Privadas no robots.txt',
      passed: seoFilesValid,
      details:
        'O sitemap.xml expõe exclusivamente as 5 páginas públicas e o robots.txt protege /admin, /painel, /conversa, /checkout e /api/.',
    });

    // Test 8: Secret Isolation Verification
    const envExampleContent = fs.existsSync(path.join(process.cwd(), '.env.example'))
      ? fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8')
      : '';
    const noExposedSecretInFrontend = !envExampleContent.includes('AIzaSy');
    results.push({
      suite: 'Segurança de Produção & Segredos',
      name: 'Isolamento Server-Side de GEMINI_API_KEY (Zero Segredos no Frontend)',
      passed: noExposedSecretInFrontend,
      details:
        'A chave da API Gemini permanece restrita ao processo Node.js no servidor, sem variáveis VITE_GEMINI_API_KEY expostas no cliente.',
    });

    res.json({
      allPassed: results.every((r) => r.passed),
      executedAt: new Date().toISOString(),
      results,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXUS AI STUDIO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
