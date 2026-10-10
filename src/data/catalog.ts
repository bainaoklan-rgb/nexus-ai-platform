import packRoteirosImg from '../assets/images/product_pack_roteiros_1791585254798.jpg';
import guiaRetencaoImg from '../assets/images/product_guia_retencao_1791585264775.jpg';
import templatesNotionImg from '../assets/images/product_templates_notion_1791585274923.jpg';

export type ToolCategory = 'Todas' | 'Texto' | 'Imagem' | 'Vídeo' | 'Produtividade';

export interface CreatorTool {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: Exclude<ToolCategory, 'Todas'>;
  iconName: 'video' | 'type' | 'file-text' | 'hash' | 'lightbulb' | 'user-check' | 'sparkles' | 'calendar' | 'image';
  status: 'active' | 'pending_integration';
  placeholderTopic: string;
  suggestedPlatforms: string[];
  suggestedTones: string[];
}

export const CREATOR_TOOLS: CreatorTool[] = [
  {
    id: 'roteiros',
    name: 'Gerador de Roteiros para Vídeos',
    shortDescription: 'Crie roteiros profissionais para vídeos, lives e redes sociais.',
    fullDescription:
      'Estrutura completa com gancho nos primeiros 3 segundos, blocos de gravação visual/locução, quebra de padrão e chamada para ação.',
    category: 'Vídeo',
    iconName: 'video',
    status: 'active',
    placeholderTopic: 'Ex: Como editar vídeos 3x mais rápido pelo celular sem perder qualidade',
    suggestedPlatforms: ['YouTube (Longo)', 'Reels / Shorts / TikTok', 'Live / Aulão'],
    suggestedTones: ['Dinâmico e Direto', 'Educativo / Passo a Passo', 'Storytelling Envolvente'],
  },
  {
    id: 'titulos',
    name: 'Gerador de Títulos',
    shortDescription: 'Crie títulos atrativos que aumentam a taxa de clique e o engajamento.',
    fullDescription:
      'Gera 12 variações estratégicas divididas entre curiosidade, SEO/busca direta e contra-intuitivos, incluindo sugestão de texto para capa.',
    category: 'Texto',
    iconName: 'type',
    status: 'active',
    placeholderTopic: 'Ex: 5 ferramentas gratuitas para gravar vídeos sozinho em casa',
    suggestedPlatforms: ['YouTube', 'TikTok / Reels', 'Artigo / Newsletter'],
    suggestedTones: ['Alta Curiosidade (CTR)', 'Foco em Busca (SEO)', 'Urgência / Alerta'],
  },
  {
    id: 'descricoes',
    name: 'Gerador de Descrições',
    shortDescription: 'Textos otimizados com palavras-chave, capítulos e chamadas para ação.',
    fullDescription:
      'Produz descrições prontas para indexação algorítmica com abertura estratégica, timestamps sugeridos e tags de busca.',
    category: 'Texto',
    iconName: 'file-text',
    status: 'active',
    placeholderTopic: 'Ex: Tutorial completo de iluminação caseira para criadores iniciantes',
    suggestedPlatforms: ['YouTube', 'Instagram Legenda', 'TikTok SEO'],
    suggestedTones: ['Profissional e Completo', 'Conversacional', 'Foco em Conversão de Links'],
  },
  {
    id: 'hashtags',
    name: 'Gerador de Hashtags',
    shortDescription: 'Seleção inteligente de hashtags por nicho, volume e intenção de busca.',
    fullDescription:
      'Mapeia hashtags específicas de nicho, médio alcance e tendência com bloco pronto para copiar e colar.',
    category: 'Produtividade',
    iconName: 'hash',
    status: 'active',
    placeholderTopic: 'Ex: Dicas de produtividade, inteligência artificial e criação de conteúdo',
    suggestedPlatforms: ['Instagram Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn'],
    suggestedTones: ['Nicho Específico', 'Crescimento Acelerado', 'Alcance Local Brasil'],
  },
  {
    id: 'ideias',
    name: 'Gerador de Ideias de Conteúdo',
    shortDescription: 'Tenha pautas originais, formatos e ângulos criativos para o seu canal.',
    fullDescription:
      'Cria uma matriz de 10 ideias acionáveis com formato recomendado, diferencial criativo e nível de dificuldade de produção.',
    category: 'Produtividade',
    iconName: 'lightbulb',
    status: 'active',
    placeholderTopic: 'Ex: Finanças pessoais e investimentos para jovens profissionais',
    suggestedPlatforms: ['Multiplataforma', 'Reels e TikTok', 'Canal de YouTube'],
    suggestedTones: ['Prático e Acionável', 'Polêmico / Debate', 'Tendências da Semana'],
  },
  {
    id: 'biografias',
    name: 'Gerador de Biografias',
    shortDescription: 'Biografias magnéticas para transformar visitantes do perfil em seguidores.',
    fullDescription:
      'Gera opções focadas em autoridade, comunidade e conversão para link na bio dentro do limite exato de caracteres.',
    category: 'Texto',
    iconName: 'user-check',
    status: 'active',
    placeholderTopic: 'Ex: Ajudo empreendedores a destravarem vídeos naturais no Instagram',
    suggestedPlatforms: ['Instagram', 'TikTok', 'YouTube Sobre', 'LinkedIn'],
    suggestedTones: ['Autoridade', 'Minimalista', 'Foco em Vendas / Link'],
  },
  {
    id: 'assistente',
    name: 'Assistente para Criadores',
    shortDescription: 'Consultoria estratégica de retenção, posicionamento e monetização.',
    fullDescription:
      'Analisa gargalos do seu canal ou perfil e entrega diagnósticos práticos de melhoria de retenção e formato.',
    category: 'Texto',
    iconName: 'sparkles',
    status: 'active',
    placeholderTopic: 'Ex: Meus vídeos têm bom clique mas a retenção cai após os primeiros 20 segundos',
    suggestedPlatforms: ['YouTube', 'Instagram', 'TikTok'],
    suggestedTones: ['Consultoria Técnica', 'Plano de Ação Rápido', 'Estratégia de Monetização'],
  },
  {
    id: 'organizador',
    name: 'Organizador de Projetos',
    shortDescription: 'Planeje cronogramas, checklists de gravação e lotes semanais.',
    fullDescription:
      'Transforma sua meta de conteúdo em um cronograma passo a passo de pré-produção, gravação em lote, edição e distribuição.',
    category: 'Produtividade',
    iconName: 'calendar',
    status: 'active',
    placeholderTopic: 'Ex: Produzir 5 Reels e 1 vídeo longo por semana estudando e trabalhando',
    suggestedPlatforms: ['Rotina Semanal', 'Lançamento de Produto', 'Série Especial'],
    suggestedTones: ['Produtividade Enxuta', 'Estúdio Completo', 'Criador Solo'],
  },
];

export const OFFICIAL_NUBANK_PIX_LINKS = {
  pro: 'https://nubank.com.br/cobrar/90ldd3/6ac97ae0-2ce1-4d8f-a685-c673c40677f5',
  studio: 'https://nubank.com.br/cobrar/90ldd3/6ac97b26-1c25-48d6-b267-b7a4d750f7fb',
} as const;

export interface CommercialPlan {
  id: 'free' | 'pro' | 'studio';
  name: string;
  audienceLabel: string;
  priceCents: number;
  dailyLimit: number;
  description: string;
  features: string[];
  ctaLabel: string;
  pixPaymentLink?: string;
  highlighted?: boolean;
}

export const DEFAULT_PLANS: CommercialPlan[] = [
  {
    id: 'free',
    name: 'Gratuito',
    audienceLabel: 'Para criadores iniciando sua jornada',
    priceCents: 0,
    dailyLimit: 5,
    description:
      'Acesso às ferramentas gratuitas e limites definidos no servidor. Não exige pagamento.',
    features: [
      '5 execuções de ferramentas de IA por dia (definido no servidor)',
      'Acesso às 8 ferramentas criativas de texto, roteiro e produtividade',
      'Salvamento de projetos no banco de dados Cloud Firestore',
      'Não exige cartão ou pagamento Pix',
    ],
    ctaLabel: 'Começar Grátis',
  },
  {
    id: 'pro',
    name: 'Pro',
    audienceLabel: 'Para criadores consistentes em crescimento',
    priceCents: 1990,
    dailyLimit: 100,
    description:
      'Mais volume diário para roteirizar, titular e organizar calendários semanais via cobrança Pix Nubank.',
    features: [
      '100 execuções de ferramentas de IA por dia no servidor',
      'Todas as 8 ferramentas criativas liberadas',
      'Organizador de projetos com fluxo de etapas ilimitado',
      'Pagamento avulso via Link Pix Nubank (sem renovação automática)',
    ],
    ctaLabel: 'Assinar Pro',
    pixPaymentLink: OFFICIAL_NUBANK_PIX_LINKS.pro,
    highlighted: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    audienceLabel: 'Para produtores intensivos e operações de conteúdo',
    priceCents: 3990,
    dailyLimit: 500,
    description:
      'Capacidade máxima para operações de conteúdo em lote e múltiplos canais via cobrança Pix Nubank.',
    features: [
      '500 execuções de ferramentas de IA por dia no servidor',
      'Todas as ferramentas e assistente estratégico completo',
      'Projetos salvos e histórico completo na nuvem',
      'Pagamento avulso via Link Pix Nubank (sem renovação automática)',
    ],
    ctaLabel: 'Assinar Studio',
    pixPaymentLink: OFFICIAL_NUBANK_PIX_LINKS.studio,
  },
];

export interface DigitalProductItem {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  category: string;
  imageUrl: string;
  fileFormat: string;
  active: boolean;
}

export const INITIAL_DIGITAL_PRODUCTS: DigitalProductItem[] = [
  {
    id: 'pack-roteiros-retencao',
    title: 'Pack 50 Estruturas de Roteiros de Alta Retenção',
    description:
      'Modelos práticos de abertura (hooks de 3 segundos), desenvolvimento com loops abertos e chamadas para ação validadas para Reels, Shorts e YouTube.',
    priceCents: 2990,
    category: 'Roteirização',
    imageUrl: packRoteirosImg,
    fileFormat: 'Guia Estruturado (.MD)',
    active: true,
  },
  {
    id: 'guia-algoritmo-seo',
    title: 'Guia Técnico de SEO, Títulos e CTR para Vídeos',
    description:
      'Manual objetivo sobre engenharia de cliques, construção de títulos magnéticos e indexação semântica nas primeiras 48 horas após a publicação.',
    priceCents: 3990,
    category: 'Crescimento & CTR',
    imageUrl: guiaRetencaoImg,
    fileFormat: 'Manual Técnico (.MD)',
    active: true,
  },
  {
    id: 'sistema-producao-semanal',
    title: 'Sistema de Produção Semanal em Lote (Batch Creation)',
    description:
      'Metodologia completa para planejar, roteirizar e gravar até 15 conteúdos em um único turno semanal sem sobrecarga criativa.',
    priceCents: 4990,
    category: 'Produtividade',
    imageUrl: templatesNotionImg,
    fileFormat: 'Framework Operacional (.MD)',
    active: true,
  },
];

export const DEFAULT_LEGAL_TEXTS = {
  supportEmail: 'suporte@nexusaistudio.com.br',
  termsOfUse: `TERMOS DE USO — NEXUS AI STUDIO (TEXTO BASE EDITÁVEL PARA REVISÃO JURÍDICA)

1. Objeto da Plataforma
O NEXUS AI STUDIO é uma plataforma digital que disponibiliza ferramentas baseadas em inteligência artificial para criação de roteiros, títulos, descrições, organização de pautas e comercialização de materiais digitais para criadores de conteúdo.

2. Contas e Responsabilidade do Usuário
O acesso às ferramentas requer cadastro autenticado. O usuário é responsável por manter a confidencialidade de suas credenciais e pelo conteúdo final publicado em suas redes sociais.

3. Limites de Uso e Assinaturas via Link Pix Nubank
Os planos Gratuito (R$ 0,00), Pro (R$ 19,90) e Studio (R$ 39,90) possuem limites diários de processamento verificados diretamente no servidor. Os pagamentos são realizados via links oficiais de cobrança Pix do Nubank, sem renovação automática, e os recursos pagos são liberados exclusivamente após a confirmação manual do recebimento pelo administrador no servidor.`,
  privacyPolicy: `POLÍTICA DE PRIVACIDADE — NEXUS AI STUDIO (TEXTO BASE EDITÁVEL PARA REVISÃO JURÍDICA)

1. Coleta e Isolamento de Dados
Coletamos apenas os dados necessários para autenticação (nome e e-mail via Firebase Authentication) e funcionamento do painel criativo (histórico de uso, projetos salvos e pedidos). Dados pessoais de contato ficam isolados na coleção privada do titular.

2. Processamento de Inteligência Artificial
Os comandos enviados às ferramentas são processados via API segura no servidor (Google Gemini API) sem exposição de chaves no navegador.

3. Exclusão de Conta
O titular pode solicitar ou executar a exclusão permanente de sua conta e de seus projetos salvos diretamente nas Configurações da Conta do Painel do Usuário.`,
  cancellationPolicy: `POLÍTICA DE CANCELAMENTO E REEMBOLSO — NEXUS AI STUDIO

1. Pagamentos Avulsos sem Renovação Automática
Os links de cobrança Pix do Nubank não geram débito recorrente automático. O usuário pode cancelar qualquer pedido com status Aguardando pagamento diretamente pelo Painel do Usuário.

2. Liberação e Reembolso
A liberação de planos pagos e produtos digitais ocorre somente após conferência do recebimento real na conta Nubank do administrador. Solicitações de reembolso dentro do prazo legal de 7 dias podem ser registradas na aba Ajuda e Suporte.`,
};

export function formatCurrencyBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export type GoogleProductCategory =
  | 'Todos'
  | 'Smartphones Google Pixel'
  | 'Relógios & Wearables'
  | 'Fones Google Pixel Buds'
  | 'Dispositivos Google Nest';

export type StoreRegionCode = 'US' | 'PT' | 'BR';

export interface RegionalAvailabilityInfo {
  regionCode: StoreRegionCode;
  countryLabel: string;
  availableOnOfficialStore: boolean;
  availabilityNote: string;
  confirmedPriceDisplay: string | null; // null => "Consulte o preço no site oficial"
  currencyCode: 'USD' | 'EUR' | 'BRL';
  officialProductUrl: string;
  officialConfigUrl?: string;
}

export interface OfficialGoogleStoreProduct {
  id: string;
  slug: string;
  officialName: string;
  category: Exclude<GoogleProductCategory, 'Todos'>;
  officialTagline: string;
  officialDescription: string;
  officialImageUrl: string;
  verifiedSpecs: {
    label: string;
    value: string;
  }[];
  officialSpecsUrl: string;
  regions: Record<StoreRegionCode, RegionalAvailabilityInfo>;
}

/**
 * Catálogo Oficial Verificado — Google Store (https://store.google.com/)
 * Fotografias oficiais servidas diretamente pelo CDN oficial do Google (lh3.googleusercontent.com).
 * Nenhuma avaliação fictícia, desconto inventado, estoque falso ou imagem gerada por IA.
 */
export const OFFICIAL_GOOGLE_STORE_PRODUCTS: OfficialGoogleStoreProduct[] = [
  {
    id: 'google-pixel-11-pro',
    slug: 'pixel_11_pro',
    officialName: 'Google Pixel 11 Pro',
    category: 'Smartphones Google Pixel',
    officialTagline:
      "Google Pixel 11 Pro's vapor chamber helps keep your phone running at peak speeds.",
    officialDescription:
      'Smartphone flagship da linha Google Pixel com arquitetura térmica de câmara de vapor para desempenho sustentado, sistema de câmeras Pro de nível profissional e integração nativa com modelos Gemini.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/wDDDdufrDg1fmakvzbW6llGw-vcfA9BaVUO0BgnxrltoQdgkM_j3jF_GUhHwLsehRWjmcZAaE7q7m2R_36-ul3ZUF-_L3GgJg8E=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Linha Oficial', value: 'Google Pixel Pro Series' },
      { label: 'Refrigeração', value: 'Câmara de vapor (Vapor Chamber) de alta eficiência' },
      { label: 'Inteligência Artificial', value: 'Google Gemini integrado ao sistema operacional' },
      { label: 'Sistema de Câmeras', value: 'Conjunto triplo Pro com teleobjetiva e Super Res Zoom' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/pixel_11_pro_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 1.099,00',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/pixel_11_pro?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/pixel_11_pro?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '1.219,00 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/pixel_11_pro?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/pixel_11_pro?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'A linha Google Pixel não possui comercialização direta na Google Store Brasil (store.google.com/br redireciona ao seletor de regiões).',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/pixel_11_pro?hl=en-US',
      },
    },
  },
  {
    id: 'google-pixel-11',
    slug: 'pixel_11',
    officialName: 'Google Pixel 11',
    category: 'Smartphones Google Pixel',
    officialTagline: 'Intentionally built to stay strong for years',
    officialDescription:
      'Construído intencionalmente para permanecer forte e atualizado por anos, combinando fotografia computacional avançada do Google, estrutura resistente e recursos inteligentes do Gemini.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/LjR1DUAaIcVR0fFVnE3g4l3AGqJPRBNjyLnJ0M36zxjz7K4U67KJOw5s9QhafDcCpoYYqt8KW5TWShPoBcdSG7wZIyUOYoFliW4=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Linha Oficial', value: 'Google Pixel Flagship' },
      { label: 'Durabilidade', value: 'Construção reforçada com suporte prolongado de atualizações' },
      { label: 'Fotografia', value: 'Câmera principal avançada + Ultrawide com edição assistida por IA' },
      { label: 'Segurança', value: 'Proteção de hardware e software Google integrada' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/pixel_11_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 899,00',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/pixel_11?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/pixel_11?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '1.019,00 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/pixel_11?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/pixel_11?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Não comercializado diretamente na Google Store Brasil. Consulte a página oficial internacional.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/pixel_11?hl=en-US',
      },
    },
  },
  {
    id: 'google-pixel-11-pro-fold',
    slug: 'pixel_11_pro_fold',
    officialName: 'Google Pixel 11 Pro Fold',
    category: 'Smartphones Google Pixel',
    officialTagline:
      'Crafted to be sleek and light, without compromising the durability that makes a foldable last.',
    officialDescription:
      'Projetado para ser fino e leve sem comprometer a durabilidade estrutural de um dobrável, oferecendo tela interna expansiva para multitarefa, tela externa completa e câmeras Pro.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/ZSKblyyXwsws0ZOmiTuSFzl98RNW1MYQrwlPo8MmmwwvCJFRXaJWYtMeEWgIyuUzh_DcJZQem3MDp6OGW1MHiJyz9_7KkD-VyA=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Formato', value: 'Smartphone Dobrável (Foldable) ultrafino' },
      { label: 'Dobradiça', value: 'Engenharia de alta durabilidade para uso contínuo' },
      { label: 'Multitarefa', value: 'Tela dividida otimizada e recursos Gemini em tela ampla' },
      { label: 'Câmeras', value: 'Sistema triplo traseiro + selfies com câmera principal' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/pixel_11_pro_fold_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 1.899,00',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/pixel_11_pro_fold?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/pixel_11_pro_fold?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Modelo dobrável não listado no catálogo direto de Portugal (disponível em mercados selecionados como EUA).',
        confirmedPriceDisplay: null,
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/us/product/pixel_11_pro_fold?hl=en-US',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Não comercializado diretamente na Google Store Brasil. Consulte o site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/pixel_11_pro_fold?hl=en-US',
      },
    },
  },
  {
    id: 'google-pixel-10a',
    slug: 'pixel_10a',
    officialName: 'Google Pixel 10a',
    category: 'Smartphones Google Pixel',
    officialTagline: 'All the essentials are at their best.',
    officialDescription:
      'Todos os recursos essenciais da família Google Pixel no seu melhor: câmera premiada com recursos de IA, bateria para o dia todo e excelente relação custo-benefício.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/10WpyvAp49yHzILvc8z_JOBfb6Z64Y84w5K2gLur2NG4UIKG80mpEm2vVIlh4QlGZRiHBL6nPLYf_4V0WdicWafLlJf4ruuqVQ=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Série', value: 'Google Pixel A-Series' },
      { label: 'Câmera', value: 'Fotografia computacional Pixel com Real Tone e Night Sight' },
      { label: 'Bateria', value: 'Bateria adaptável de longa duração' },
      { label: 'Segurança', value: 'Atualizações de segurança e sistema garantidas pelo Google' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/pixel_10a_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 599,00',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/pixel_10a?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/pixel_10a?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '659,00 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/pixel_10a?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/pixel_10a?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Não comercializado diretamente na Google Store Brasil. Consulte o site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/pixel_10a?hl=en-US',
      },
    },
  },
  {
    id: 'google-pixel-watch-5',
    slug: 'pixel_watch_5',
    officialName: 'Google Pixel Watch 5',
    category: 'Relógios & Wearables',
    officialTagline: 'A smarter way to a healthier you',
    officialDescription:
      'O smartwatch oficial do Google projetado para oferecer monitoramento avançado de saúde e condicionamento físico com tecnologia Fitbit, além de integração completa com o ecossistema Pixel e Wear OS.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/qSvHd40DvBOUO-pcQwxjs0o-v2-Bsgdo_8dnfa38Xp-VEkxjS8mH0-RnzF9gyxV2xyt83nQqYHWouVE9TyY58_r0U3HPZ7Q6LKM=w720-h720-rw-nu-rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Sistema', value: 'Wear OS by Google' },
      { label: 'Saúde e Treino', value: 'Sensores cardíacos, sono e recuperação integrados ao Fitbit' },
      { label: 'Conectividade', value: 'Versões Bluetooth / Wi-Fi e 4G LTE disponíveis no configurador' },
      { label: 'Design', value: 'Caixa circular abobadada com pulseiras intercambiáveis' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/pixel_watch_5_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 349,99',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/pixel_watch_5?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/pixel_watch_5?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '419,00 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/pixel_watch_5?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/pixel_watch_5?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Não disponível na Google Store Brasil. Consulte o preço e disponibilidade no site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/pixel_watch_5?hl=en-US',
      },
    },
  },
  {
    id: 'fitbit-charge-6',
    slug: 'fitbit_charge_6',
    officialName: 'Fitbit Charge 6',
    category: 'Relógios & Wearables',
    officialTagline: 'Run your day and routine.',
    officialDescription:
      'Smartband avançada de saúde e fitness com batimentos cardíacos precisos em equipamentos de ginástica compatíveis, mais de 40 modos de exercício, GPS integrado e aplicativos essenciais do Google.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/4fHe7o06nMhfBJhr2NPnn49GnXZV4m60iqWNfmNl5H5MjD1nuMhEGTz1hNR_Du9rlsnA5HyEF5NKcfNeE22YZAghCtEZl0BX_Q=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Monitoramento', value: 'Frequência cardíaca contínua, ECG, SpO2 e nível de prontidão' },
      { label: 'Localização', value: 'GPS integrado + mais de 40 modos de exercício' },
      { label: 'Recursos Google', value: 'Controles do YouTube Music, Google Maps e Google Wallet' },
      { label: 'Autonomia', value: 'Bateria para múltiplos dias de uso contínuo' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/fitbit_charge_6_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 159,95',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/fitbit_charge_6?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/fitbit_charge_6?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '159,95 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/fitbit_charge_6?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/fitbit_charge_6?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Sem venda direta na Google Store Brasil. Consulte o preço no site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/fitbit_charge_6?hl=en-US',
      },
    },
  },
  {
    id: 'google-pixel-buds-pro-2',
    slug: 'pixel_buds_pro_2',
    officialName: 'Google Pixel Buds Pro 2',
    category: 'Fones Google Pixel Buds',
    officialTagline: 'Immersive Audio, Comfortable Fit',
    officialDescription:
      'Fones de ouvido sem fio premium projetados com o chip Google Tensor A1 para Cancelamento Ativo de Ruído com Silent Seal 2.0, encaixe com estabilizador giratório e conversas fluidas com o Gemini.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/MP4ymmRItYWpJsY0cjGQfkR38WYCvrqGWv8PF-sOJQwK0A9oM2u0sr-BKD2kq_SxImwincyudgTwJRiNF5UofQwXT0IljAXKq-Zm=rw-e365-w1200-rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Processador de Áudio', value: 'Chip Google Tensor A1 dedicado' },
      { label: 'Cancelamento de Ruído', value: 'Active Noise Cancellation com Silent Seal 2.0' },
      { label: 'Ergonomia', value: 'Estabilizador ajustável por giro (Twist-to-adjust)' },
      { label: 'Drivers', value: 'Drivers personalizados de 11 mm com áudio espacial' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/pixel_buds_pro_2_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 229,00',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/pixel_buds_pro_2?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/pixel_buds_pro_2?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '249,00 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/pixel_buds_pro_2?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/pixel_buds_pro_2?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Sem venda direta na Google Store Brasil. Consulte o site oficial do Google.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/pixel_buds_pro_2?hl=en-US',
      },
    },
  },
  {
    id: 'google-pixel-buds-2a',
    slug: 'pixel_buds_2a',
    officialName: 'Google Pixel Buds 2a',
    category: 'Fones Google Pixel Buds',
    officialTagline:
      'All-day battery, Active Noise Cancellation, twist to adjust fit, and crisp audio, for less.',
    officialDescription:
      'Bateria para o dia todo, Cancelamento Ativo de Ruído (ANC), ajuste giratório confortável e áudio nítido em um formato acessível e perfeitamente integrado ao ecossistema Android.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/QSgF4x43zcaoQDMPYYY1UZOi9KH-7fCqXBdRZGp8uXm29Rs7kSgIy1f5_58T7_aOJMC4lAZrZAjddAVDDRiDtotxCFPqohiyVQ=s2046-w2046-e365-rw-v0-nu-rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Cancelamento de Ruído', value: 'Active Noise Cancellation (ANC) integrado' },
      { label: 'Encaixe', value: 'Ajuste ergonômico Twist-to-adjust para treinos e uso diário' },
      { label: 'Pareamento', value: 'Fast Pair e alternância rápida entre dispositivos' },
      { label: 'Assistente', value: 'Acesso rápido por voz ao Google / Gemini' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/pixel_buds_2a_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 129,00',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/pixel_buds_2a?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/pixel_buds_2a?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '149,00 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/pixel_buds_2a?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/pixel_buds_2a?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Sem venda direta na Google Store Brasil. Consulte o preço no site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/pixel_buds_2a?hl=en-US',
      },
    },
  },
  {
    id: 'google-tv-streamer-4k',
    slug: 'google_tv_streamer',
    officialName: 'Google TV Streamer (4K)',
    category: 'Dispositivos Google Nest',
    officialTagline:
      'Google TV Streamer is the next-generation, 4K TV streaming device from Google.',
    officialDescription:
      'Dispositivo de streaming 4K de nova geração do Google que combina entretenimento personalizado com Google TV e funções de central para casa inteligente compatível com Matter e Thread.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/TQ3VHKHdvlpjlbE3woohVYFJrVBUgcVrCtHJN2xVFzkXEHNbqEiy1gS7vnxgUwHnRspROwVDgNWPUEWRxfCZC4j4mDaQD7DOACLe=rw-rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Resolução e Áudio', value: '4K HDR a 60 fps com Dolby Vision e Dolby Atmos' },
      { label: 'Casa Inteligente', value: 'Hub Matter integrado e roteador de borda Thread' },
      { label: 'Conectividade', value: 'Porta Ethernet Gigabit integrada + Wi-Fi' },
      { label: 'Armazenamento', value: '32 GB de armazenamento interno' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/google_tv_streamer_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 99,99',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/google_tv_streamer?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/google_tv_streamer?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: false,
        availabilityNote: 'Disponibilidade variável na União Europeia. Consulte o site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/us/product/google_tv_streamer?hl=en-US',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte a disponibilidade e o preço no site oficial do Google.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/google_tv_streamer?hl=en-US',
      },
    },
  },
  {
    id: 'google-home-speaker',
    slug: 'google_home_speaker',
    officialName: 'Google Home Speaker',
    category: 'Dispositivos Google Nest',
    officialTagline: 'A well rounded smart speaker with Gemini, for a more helpful home',
    officialDescription:
      'Caixa de som inteligente do Google com integração nativa ao assistente Gemini, som envolvente para o ambiente e controle por voz de dispositivos da casa conectada.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/CkegE5yZ7JLFwjWCjPKsv27pgoT-q9Xy7AaigbpesZEonEUwei2rcJRDdq8z_Bt6n9XV1tTh9DBJzkTkcEr804LBiRCLFMeEQ8o=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Assistente', value: 'Experiência de voz integrada com Google Gemini' },
      { label: 'Áudio', value: 'Acústica balanceada para música e comandos em qualquer cômodo' },
      { label: 'Automação Residencial', value: 'Controle centralizado via app Google Home' },
      { label: 'Privacidade', value: 'Chave física para desativação dos microfones' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/google_home_speaker_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 99,99',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/google_home_speaker?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/google_home_speaker?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte a disponibilidade regional no site oficial da Google Store.',
        confirmedPriceDisplay: null,
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/us/product/google_home_speaker?hl=en-US',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte o preço e a disponibilidade regional no site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/google_home_speaker?hl=en-US',
      },
    },
  },
  {
    id: 'nest-learning-thermostat-4th-gen',
    slug: 'nest_learning_thermostat_4th_gen',
    officialName: 'Nest Learning Thermostat (4th gen)',
    category: 'Dispositivos Google Nest',
    officialTagline:
      'Meet the next-gen Nest Learning Thermostat with smart ways to save energy and stay comfy.',
    officialDescription:
      'A 4ª geração do termostato inteligente da linha Google Nest com display amplo sem bordas, aprendizado inteligente de rotina térmica, economia de energia e compatibilidade com sensor de temperatura Nest.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/XxwSWRqofPLTTO09iEw_xxknHCHTA_rYl59Ru4CYVAcJEuExZMJeRZhQqs3lQ6aQ5Rt2r9rUm306kzzhXa0dSHk12h75-yTgLg4=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Geração', value: '4ª Geração (4th Gen) com Nest Temperature Sensor' },
      { label: 'Display', value: 'Visor de cristal líquido com recurso Dynamic Farsight' },
      { label: 'Padrões', value: 'Compatível com Matter e app Google Home' },
      { label: 'Eficiência', value: 'Programação inteligente Smart Schedule para economia térmica' },
    ],
    officialSpecsUrl:
      'https://store.google.com/us/product/nest_learning_thermostat_4th_gen_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 279,99',
        currencyCode: 'USD',
        officialProductUrl:
          'https://store.google.com/us/product/nest_learning_thermostat_4th_gen?hl=en-US',
        officialConfigUrl:
          'https://store.google.com/us/config/nest_learning_thermostat_4th_gen?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: false,
        availabilityNote: 'Projetado para sistemas HVAC norte-americanos (EUA e Canadá).',
        confirmedPriceDisplay: null,
        currencyCode: 'EUR',
        officialProductUrl:
          'https://store.google.com/us/product/nest_learning_thermostat_4th_gen?hl=en-US',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote: 'Projetado para sistemas HVAC norte-americanos. Consulte o site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl:
          'https://store.google.com/us/product/nest_learning_thermostat_4th_gen?hl=en-US',
      },
    },
  },
  {
    id: 'nest-cam-indoor-wired-3rd-gen',
    slug: 'nest_cam_indoor_wired_3rd_gen',
    officialName: 'Google Nest Cam Indoor (Wired, 3rd Gen)',
    category: 'Dispositivos Google Nest',
    officialTagline:
      'Gemini summarizes hours of recorded events into a quick daily recap, so you’ll never miss a thing.',
    officialDescription:
      'Câmera de segurança interna com fio de 3ª geração com vídeo HD HDR nítido, alertas inteligentes de pessoas, animais e veículos, e resumos diários de eventos assistidos pelo Gemini no Google Home.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/81sZCY_pEVkXlUS3Hi3PsJVZ3oIG1hhPPe5kdGAvJlFQwvOz1PYAg4IgUDyulpUlMs2iakQOmYFkIqIubLx-cqtH_VIyqZUk8A=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Alimentação', value: 'Com fio (Wired) para monitoramento interno contínuo' },
      { label: 'Vídeo', value: 'Vídeo HD com HDR e visão noturna (Night Vision)' },
      { label: 'Inteligência', value: 'Detecção inteligente e resumos de atividade via Google Home' },
      { label: 'Áudio', value: 'Microfone e alto-falante integrados (Two-way talk)' },
    ],
    officialSpecsUrl:
      'https://store.google.com/us/product/nest_cam_indoor_wired_3rd_gen_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 99,99',
        currencyCode: 'USD',
        officialProductUrl:
          'https://store.google.com/us/product/nest_cam_indoor_wired_3rd_gen?hl=en-US',
        officialConfigUrl:
          'https://store.google.com/us/config/nest_cam_indoor_wired_3rd_gen?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte a disponibilidade regional na Google Store europeia.',
        confirmedPriceDisplay: null,
        currencyCode: 'EUR',
        officialProductUrl:
          'https://store.google.com/us/product/nest_cam_indoor_wired_3rd_gen?hl=en-US',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte o preço e a disponibilidade no site oficial da Google Store.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl:
          'https://store.google.com/us/product/nest_cam_indoor_wired_3rd_gen?hl=en-US',
      },
    },
  },
  {
    id: 'nest-cam-outdoor-wired-2nd-gen',
    slug: 'nest_cam_outdoor_wired_2nd_gen',
    officialName: 'Google Nest Cam Outdoor (Wired, 2nd Gen)',
    category: 'Dispositivos Google Nest',
    officialTagline:
      'Nest Cam Outdoor, Wired is the outdoor security camera with continuous power for continuous peace of mind.',
    officialDescription:
      'Câmera de segurança externa com alimentação contínua por cabo, construção resistente às intempéries e alertas inteligentes em tempo real diretamente no aplicativo Google Home.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/Ac8mhzaByOXQicIFtVFFutEYgmau7EmRWn8i0Y62zHmTaz_p272rwwUifRCchyLxFo0ZHLWexk-u2vJhrKU2OyJQFCFzqAas_IT1=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Uso', value: 'Externo (Outdoor) com resistência climática' },
      { label: 'Alimentação', value: 'Energia contínua com fio (Wired, 2ª Geração)' },
      { label: 'Segurança', value: 'Criptografia de vídeo e verificação em duas etapas na conta Google' },
      { label: 'Alertas', value: 'Identificação diferenciada de pessoas, veículos e animais' },
    ],
    officialSpecsUrl:
      'https://store.google.com/us/product/nest_cam_outdoor_wired_2nd_gen_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 149,99',
        currencyCode: 'USD',
        officialProductUrl:
          'https://store.google.com/us/product/nest_cam_outdoor_wired_2nd_gen?hl=en-US',
        officialConfigUrl:
          'https://store.google.com/us/config/nest_cam_outdoor_wired_2nd_gen?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte a disponibilidade regional no site oficial da Google Store.',
        confirmedPriceDisplay: null,
        currencyCode: 'EUR',
        officialProductUrl:
          'https://store.google.com/us/product/nest_cam_outdoor_wired_2nd_gen?hl=en-US',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte o preço e a disponibilidade no site oficial da Google Store.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl:
          'https://store.google.com/us/product/nest_cam_outdoor_wired_2nd_gen?hl=en-US',
      },
    },
  },
  {
    id: 'nest-doorbell-wired-3rd-gen',
    slug: 'nest_doorbell_wired_3rd_gen',
    officialName: 'Google Nest Doorbell (Wired, 3rd Gen)',
    category: 'Dispositivos Google Nest',
    officialTagline: 'Answer your door from anywhere with Nest Doorbell Wired, 3rd Gen',
    officialDescription:
      'Campainha inteligente com vídeo de 3ª geração com alimentação contínua por fio, campo de visão vertical amplo para visualizar encomendas no chão e pessoas de corpo inteiro, além de comunicação bidirecional.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/wp3yMv-yweoFE2ftXtcwzMYMSrNfJ6fj21VqHz6vjO33KVYyHfPK8BvnT2C0CiXE6IQlSRH3Rmv8vKzo4sFFgkNBKyXARNbOGg=rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Geração', value: '3ª Geração com fio (Wired 3rd Gen)' },
      { label: 'Campo de Visão', value: 'Proporção vertical ampliada com HDR e Night Vision' },
      { label: 'Detecção', value: 'Alertas de pacotes, pessoas, animais e veículos' },
      { label: 'Integração', value: 'Compatível com telas e alto-falantes Google Nest' },
    ],
    officialSpecsUrl:
      'https://store.google.com/us/product/nest_doorbell_wired_3rd_gen_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 179,99',
        currencyCode: 'USD',
        officialProductUrl:
          'https://store.google.com/us/product/nest_doorbell_wired_3rd_gen?hl=en-US',
        officialConfigUrl:
          'https://store.google.com/us/config/nest_doorbell_wired_3rd_gen?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte a disponibilidade regional no site oficial da Google Store.',
        confirmedPriceDisplay: null,
        currencyCode: 'EUR',
        officialProductUrl:
          'https://store.google.com/us/product/nest_doorbell_wired_3rd_gen?hl=en-US',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote: 'Consulte o preço e a disponibilidade no site oficial da Google Store.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl:
          'https://store.google.com/us/product/nest_doorbell_wired_3rd_gen?hl=en-US',
      },
    },
  },
  {
    id: 'google-nest-wifi-pro',
    slug: 'nest_wifi_pro',
    officialName: 'Google Nest Wifi Pro (Wi-Fi 6E)',
    category: 'Dispositivos Google Nest',
    officialTagline:
      'Experience smoother connections, super fast speeds, and a smarter network all around your home with the Google Nest Wifi Pro.',
    officialDescription:
      'Sistema de roteador Mesh tri-band com tecnologia Wi-Fi 6E (bandas de 2,4 GHz, 5 GHz e 6 GHz), gerenciamento inteligente de tráfego e suporte integrado para dispositivos Matter e Thread.',
    officialImageUrl:
      'https://lh3.googleusercontent.com/sLmxSoy5AHmguh2LHCPscuqE9299NcMkKsfN45UcsoIrrWF5Bb-wrgcYiEm2An-B9FMoWT7GL8ytmiTkkzWYkXQVRzE7v6SLtw=rw-rj-sc0xffffffff',
    verifiedSpecs: [
      { label: 'Padrão Sem Fio', value: 'Wi-Fi 6E (AXE5400) Tri-Band (2.4 GHz, 5 GHz e 6 GHz)' },
      { label: 'Rede Mesh', value: 'Expansível com cobertura inteligente para toda a residência' },
      { label: 'Smart Home', value: 'Hub Matter e roteador de borda Thread integrados' },
      { label: 'Segurança', value: 'WPA3, atualizações automáticas e diagnósticos no app Google Home' },
    ],
    officialSpecsUrl: 'https://store.google.com/us/product/nest_wifi_pro_specs?hl=en-US',
    regions: {
      US: {
        regionCode: 'US',
        countryLabel: 'Estados Unidos (Google Store US)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store dos Estados Unidos.',
        confirmedPriceDisplay: 'US$ 199,99',
        currencyCode: 'USD',
        officialProductUrl: 'https://store.google.com/us/product/nest_wifi_pro?hl=en-US',
        officialConfigUrl: 'https://store.google.com/us/config/nest_wifi_pro?hl=en-US',
      },
      PT: {
        regionCode: 'PT',
        countryLabel: 'Portugal / União Europeia (Google Store PT)',
        availableOnOfficialStore: true,
        availabilityNote: 'Disponível oficialmente na Google Store Portugal.',
        confirmedPriceDisplay: '219,99 €',
        currencyCode: 'EUR',
        officialProductUrl: 'https://store.google.com/pt/product/nest_wifi_pro?hl=pt-PT',
        officialConfigUrl: 'https://store.google.com/pt/config/nest_wifi_pro?hl=pt-PT',
      },
      BR: {
        regionCode: 'BR',
        countryLabel: 'Brasil (Consulta Regional)',
        availableOnOfficialStore: false,
        availabilityNote:
          'Sem venda direta na Google Store Brasil. Consulte o preço no site oficial.',
        confirmedPriceDisplay: null,
        currencyCode: 'BRL',
        officialProductUrl: 'https://store.google.com/us/product/nest_wifi_pro?hl=en-US',
      },
    },
  },
];

