import { AppRoute } from '../components/Navbar';

export interface RouteSEOMetadata {
  route: AppRoute;
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: string;
}

export const PUBLIC_SHARED_APP_URL =
  'https://ais-pre-ymgwovy2ap2cish26msfkk-253742165772.us-east1.run.app';

export const PREFERRED_BRAND_DOMAINS = [
  'nexusaistudio.com.br',
  'nexusaistudio.com',
] as const;

export const ROUTE_SEO_MAP: Record<AppRoute, RouteSEOMetadata> = {
  home: {
    route: 'home',
    path: '/',
    title: 'NEXUS AI STUDIO — Plataforma de Inteligência Artificial',
    description:
      'Plataforma de inteligência artificial para criar roteiros, títulos, descrições, organizar projetos criativos e explorar ferramentas interativas.',
    indexable: true,
    changefreq: 'daily',
    priority: '1.0',
  },
  tools: {
    route: 'tools',
    path: '/ferramentas',
    title: 'Ferramentas de Inteligência Artificial — NEXUS AI STUDIO',
    description:
      'Acesse 8 ferramentas de IA para criadores: gerador de roteiros para vídeos, títulos, descrições otimizadas, hashtags, ideias, biografias e projetos.',
    indexable: true,
    changefreq: 'weekly',
    priority: '0.9',
  },
  lab: {
    route: 'lab',
    path: '/nexus-lab',
    title: 'NEXUS LAB · Estúdio Criativo Interativo — NEXUS AI STUDIO',
    description:
      'Experimente o laboratório criativo interativo do NEXUS AI STUDIO para estruturar roteiros de retenção, ideias virais e planejamento de conteúdo com IA.',
    indexable: true,
    changefreq: 'weekly',
    priority: '0.9',
  },
  plans: {
    route: 'plans',
    path: '/planos',
    title: 'Planos e Preços (Gratuito, Pro e Studio) — NEXUS AI STUDIO',
    description:
      'Conheça os planos do NEXUS AI STUDIO: Plano Gratuito (R$ 0,00), Plano Pro (R$ 19,90) e Plano Studio (R$ 39,90) com limites diários verificados no servidor.',
    indexable: true,
    changefreq: 'weekly',
    priority: '0.8',
  },
  products: {
    route: 'products',
    path: '/produtos',
    title: 'Produtos Oficiais Google Store & Frameworks — NEXUS AI STUDIO',
    description:
      'Vitrine comercial com smartphones Google Pixel, Google Pixel Watch, Pixel Buds e dispositivos Google Nest com informações verificadas e links oficiais.',
    indexable: true,
    changefreq: 'weekly',
    priority: '0.8',
  },
  chat: {
    route: 'chat',
    path: '/conversa',
    title: 'Conversa IA — NEXUS AI STUDIO',
    description:
      'Área privada de conversa com o assistente de inteligência artificial NEXUS AI STUDIO.',
    indexable: false,
  },
  notifications: {
    route: 'notifications',
    path: '/notificacoes',
    title: 'Notificações e Atualizações — NEXUS AI STUDIO',
    description:
      'Central de atualizações da plataforma e avisos individuais da conta no NEXUS AI STUDIO.',
    indexable: false,
  },
  dashboard: {
    route: 'dashboard',
    path: '/painel',
    title: 'Painel do Criador e Configurações — NEXUS AI STUDIO',
    description:
      'Área privada do cliente para gerenciamento de projetos salvos, histórico, pedidos Pix e configurações de conta.',
    indexable: false,
  },
  projects: {
    route: 'projects',
    path: '/projetos',
    title: 'Projetos Salvos — NEXUS AI STUDIO',
    description: 'Gerenciamento privado de projetos salvos no Cloud Firestore.',
    indexable: false,
  },
  checkout: {
    route: 'checkout',
    path: '/checkout',
    title: 'Checkout Pix — NEXUS AI STUDIO',
    description: 'Finalização segura de pedido via Link Pix Nubank no NEXUS AI STUDIO.',
    indexable: false,
  },
  admin: {
    route: 'admin',
    path: '/admin',
    title: 'Painel Administrativo — NEXUS AI STUDIO',
    description: 'Área restrita de administração do NEXUS AI STUDIO.',
    indexable: false,
  },
  terms: {
    route: 'terms',
    path: '/termos',
    title: 'Termos de Uso — NEXUS AI STUDIO',
    description:
      'Termos de uso da plataforma NEXUS AI STUDIO, regras de utilização das ferramentas de IA e condições dos planos.',
    indexable: true,
    changefreq: 'monthly',
    priority: '0.4',
  },
  privacy: {
    route: 'privacy',
    path: '/privacidade',
    title: 'Política de Privacidade — NEXUS AI STUDIO',
    description:
      'Política de privacidade, isolamento de dados pessoais no Cloud Firestore e segurança de processamento no NEXUS AI STUDIO.',
    indexable: true,
    changefreq: 'monthly',
    priority: '0.4',
  },
  cancellation: {
    route: 'cancellation',
    path: '/cancelamento',
    title: 'Política de Cancelamento e Reembolso — NEXUS AI STUDIO',
    description:
      'Política de cancelamento de pedidos pendentes e condições de reembolso no NEXUS AI STUDIO.',
    indexable: true,
    changefreq: 'monthly',
    priority: '0.4',
  },
};

export function resolveRouteFromPathname(pathname: string): AppRoute {
  const clean = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  switch (clean) {
    case '/':
      return 'home';
    case '/ferramentas':
    case '/tools':
      return 'tools';
    case '/nexus-lab':
    case '/lab':
      return 'lab';
    case '/planos':
    case '/plans':
      return 'plans';
    case '/produtos':
    case '/products':
    case '/loja':
      return 'products';
    case '/conversa':
    case '/chat':
      return 'chat';
    case '/notificacoes':
    case '/notifications':
      return 'notifications';
    case '/painel':
    case '/dashboard':
      return 'dashboard';
    case '/projetos':
    case '/projects':
      return 'projects';
    case '/checkout':
      return 'checkout';
    case '/admin':
      return 'admin';
    case '/termos':
    case '/terms':
      return 'terms';
    case '/privacidade':
    case '/privacy':
      return 'privacy';
    case '/cancelamento':
    case '/cancellation':
      return 'cancellation';
    default:
      return 'home';
  }
}

export function buildCanonicalUrl(baseOrigin: string, route: AppRoute): string {
  const cleanOrigin = (baseOrigin || PUBLIC_SHARED_APP_URL).replace(/\/+$/, '');
  const meta = ROUTE_SEO_MAP[route] || ROUTE_SEO_MAP.home;
  return meta.path === '/' ? `${cleanOrigin}/` : `${cleanOrigin}${meta.path}`;
}

export function buildStructuredDataJsonLd(baseOrigin: string, supportEmail?: string) {
  const cleanOrigin = (baseOrigin || PUBLIC_SHARED_APP_URL).replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${cleanOrigin}/#organization`,
        name: 'NEXUS AI STUDIO',
        url: `${cleanOrigin}/`,
         ...(supportEmail
          ? {
              contactPoint: {
                '@type': 'ContactPoint',
                email: supportEmail,
                contactType: 'customer support',
                availableLanguage: ['Portuguese'],
              },
            }
          : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${cleanOrigin}/#website`,
        url: `${cleanOrigin}/`,
        name: 'NEXUS AI STUDIO',
        description:
          'Plataforma de inteligência artificial para criar roteiros, títulos, descrições, organizar projetos criativos e explorar ferramentas interativas.',
        inLanguage: 'pt-BR',
        publisher: {
          '@id': `${cleanOrigin}/#organization`,
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${cleanOrigin}/#webapp`,
        name: 'NEXUS AI STUDIO — Plataforma de Inteligência Artificial',
        url: `${cleanOrigin}/`,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        inLanguage: 'pt-BR',
        description:
          'Estúdio inteligente com ferramentas de IA (Google Gemini) para roteirização de vídeos, títulos, descrições, organização de projetos e catálogo verificado.',
        offers: [
          {
            '@type': 'Offer',
            name: 'Plano Gratuito',
            price: '0.00',
            priceCurrency: 'BRL',
            description: 'Acesso às ferramentas gratuitas com 5 execuções diárias no servidor.',
          },
          {
            '@type': 'Offer',
            name: 'Plano Pro',
            price: '19.90',
            priceCurrency: 'BRL',
            description: '100 execuções diárias de ferramentas de IA no servidor.',
          },
          {
            '@type': 'Offer',
            name: 'Plano Studio',
            price: '39.90',
            priceCurrency: 'BRL',
            description: '500 execuções diárias de ferramentas de IA no servidor.',
          },
        ],
      },
    ],
  };
}
