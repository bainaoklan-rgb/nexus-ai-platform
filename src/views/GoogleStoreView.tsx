import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  ExternalLink,
  Globe,
  CheckCircle2,
  Info,
  Smartphone,
  Watch,
  Headphones,
  Home as HomeIcon,
  FileText,
  X,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  OFFICIAL_GOOGLE_STORE_PRODUCTS,
  OfficialGoogleStoreProduct,
  GoogleProductCategory,
  StoreRegionCode,
  formatCurrencyBRL,
} from '../data/catalog';

interface GoogleStoreViewProps {
  digitalProducts: any[];
  onSelectDigitalProductCheckout: (prod: any) => void;
}

const CATEGORIES: GoogleProductCategory[] = [
  'Todos',
  'Smartphones Google Pixel',
  'Relógios & Wearables',
  'Fones Google Pixel Buds',
  'Dispositivos Google Nest',
];

const REGIONS: {
  code: StoreRegionCode;
  shortLabel: string;
  fullLabel: string;
  currency: string;
  storeUrl: string;
}[] = [
  {
    code: 'US',
    shortLabel: 'Estados Unidos (US$)',
    fullLabel: 'Google Store Estados Unidos (USD)',
    currency: 'USD (US$)',
    storeUrl: 'https://store.google.com/us/?hl=en-US',
  },
  {
    code: 'PT',
    shortLabel: 'Portugal / Europa (€)',
    fullLabel: 'Google Store Portugal / União Europeia (EUR)',
    currency: 'EUR (€)',
    storeUrl: 'https://store.google.com/pt/?hl=pt-PT',
  },
  {
    code: 'BR',
    shortLabel: 'Brasil (Consulta Regional)',
    fullLabel: 'Brasil — Verificação de Disponibilidade Oficial',
    currency: 'BRL (R$)',
    storeUrl: 'https://store.google.com/regionpicker',
  },
];

export const GoogleStoreView: React.FC<GoogleStoreViewProps> = ({
  digitalProducts,
  onSelectDigitalProductCheckout,
}) => {
  const [activeCatalogTab, setActiveCatalogTab] = useState<'google_official' | 'nexus_digital'>(
    'google_official'
  );
  const [selectedCategory, setSelectedCategory] = useState<GoogleProductCategory>('Todos');
  const [selectedRegion, setSelectedRegion] = useState<StoreRegionCode>('US');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailableInRegion, setOnlyAvailableInRegion] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [selectedProductModal, setSelectedProductModal] =
    useState<OfficialGoogleStoreProduct | null>(null);

  const activeRegionMeta = useMemo(
    () => REGIONS.find((r) => r.code === selectedRegion) || REGIONS[0],
    [selectedRegion]
  );

  const filteredGoogleProducts = useMemo(() => {
    return OFFICIAL_GOOGLE_STORE_PRODUCTS.filter((product) => {
      if (selectedCategory !== 'Todos' && product.category !== selectedCategory) {
        return false;
      }
      if (onlyAvailableInRegion && !product.regions[selectedRegion].availableOnOfficialStore) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = product.officialName.toLowerCase().includes(q);
        const matchesDesc = product.officialDescription.toLowerCase().includes(q);
        const matchesTagline = product.officialTagline.toLowerCase().includes(q);
        const matchesSpecs = product.verifiedSpecs.some(
          (s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
        );
        return matchesName || matchesDesc || matchesTagline || matchesSpecs;
      }
      return true;
    });
  }, [selectedCategory, selectedRegion, onlyAvailableInRegion, searchQuery]);

  const getCategoryIcon = (cat: GoogleProductCategory) => {
    switch (cat) {
      case 'Smartphones Google Pixel':
        return <Smartphone className="w-4 h-4" />;
      case 'Relógios & Wearables':
        return <Watch className="w-4 h-4" />;
      case 'Fones Google Pixel Buds':
        return <Headphones className="w-4 h-4" />;
      case 'Dispositivos Google Nest':
        return <HomeIcon className="w-4 h-4" />;
      default:
        return <ShoppingBag className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24">
      {/* Top Editorial Storefront Header */}
      <div className="bg-[#0B1024] border border-slate-800/90 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-400 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Vitrine Comercial Verificada · Dados e Links Oficiais</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
              Catálogo Oficial de Hardware Google &amp; Ecossistema NEXUS
            </h1>
            <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
              Explore smartphones Google Pixel, relógios Google Pixel Watch, fones Google Pixel Buds
              e dispositivos para casa conectada Google Nest com fotografias autênticas da{' '}
              <a
                href="https://store.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-medium inline-flex items-center gap-1"
              >
                Google Store Oficial
                <ExternalLink className="w-3 h-3" />
              </a>
              , especificações verificadas e disponibilidade real por país.
            </p>
          </div>

          {/* Switcher between Official Google Hardware Catalog & NEXUS Digital Frameworks */}
          <div className="flex items-center bg-[#060916] p-1 rounded-xl border border-slate-800 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveCatalogTab('google_official')}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeCatalogTab === 'google_official'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Produtos Oficiais Google ({OFFICIAL_GOOGLE_STORE_PRODUCTS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCatalogTab('nexus_digital')}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeCatalogTab === 'nexus_digital'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Frameworks Digitais NEXUS ({digitalProducts.length})</span>
            </button>
          </div>
        </div>

        {/* Regional & Country Selector Bar (Only when viewing Google Official Catalog) */}
        {activeCatalogTab === 'google_official' && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>País / Região de Consulta:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {REGIONS.map((reg) => (
                  <button
                    key={reg.code}
                    type="button"
                    onClick={() => setSelectedRegion(reg.code)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      selectedRegion === reg.code
                        ? 'bg-purple-600/20 border-purple-500 text-white'
                        : 'bg-[#060916] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {reg.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span>
                Moeda da Região:{' '}
                <strong className="text-slate-200 font-mono">{activeRegionMeta.currency}</strong>
              </span>
              <a
                href={activeRegionMeta.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <span>Abrir {activeRegionMeta.fullLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: OFFICIAL GOOGLE HARDWARE CATALOG */}
      {activeCatalogTab === 'google_official' && (
        <div className="mt-6 space-y-6">
          {/* Regional Availability Notice for Brazil */}
          {selectedRegion === 'BR' && (
            <div className="p-4 bg-amber-950/30 border border-amber-700/50 rounded-xl flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-100 font-semibold">
                  Nota de Verificação Regional — Brasil:
                </strong>{' '}
                Conforme verificado diretamente em{' '}
                <span className="font-mono">store.google.com</span>, a Google Store não possui venda
                direta oficial em Reais (BRL) para as linhas Google Pixel, Pixel Watch, Pixel Buds e
                geração atual Google Nest no Brasil. Por transparência comercial, os preços para o
                Brasil exibem{' '}
                <strong className="text-white">“Consulte o preço no site oficial”</strong>. Para
                visualizar os preços oficiais confirmados em Dólar (US$) ou Euro (€), selecione{' '}
                <button
                  type="button"
                  onClick={() => setSelectedRegion('US')}
                  className="underline text-cyan-300 font-semibold hover:text-white"
                >
                  Estados Unidos (US$)
                </button>{' '}
                ou{' '}
                <button
                  type="button"
                  onClick={() => setSelectedRegion('PT')}
                  className="underline text-cyan-300 font-semibold hover:text-white"
                >
                  Portugal / Europa (€)
                </button>
                .
              </div>
            </div>
          )}

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B1024] border border-slate-800 p-4 rounded-xl">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category;
                const count =
                  category === 'Todos'
                    ? OFFICIAL_GOOGLE_STORE_PRODUCTS.length
                    : OFFICIAL_GOOGLE_STORE_PRODUCTS.filter((p) => p.category === category).length;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-[#131C3E] text-white border-cyan-500/60'
                        : 'bg-[#060916] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {getCategoryIcon(category)}
                    <span>{category}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Availability Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAvailableInRegion}
                  onChange={(e) => setOnlyAvailableInRegion(e.target.checked)}
                  className="rounded border-slate-700 bg-[#060916] text-cyan-500 focus:ring-0"
                />
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Apenas com venda direta na região</span>
              </label>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar Pixel, Watch, Buds, Nest..."
                  className="w-full pl-9 pr-8 py-2 bg-[#060916] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    aria-label="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredGoogleProducts.length === 0 ? (
            <div className="bg-[#0B1024] border border-slate-800 rounded-xl p-12 text-center space-y-3">
              <ShoppingBag className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">
                Nenhum produto encontrado para os filtros selecionados
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {onlyAvailableInRegion && selectedRegion === 'BR'
                  ? 'A Google Store não realiza venda direta de hardware no Brasil (store.google.com/br). Desmarque o filtro de venda direta ou selecione Estados Unidos (US$) / Portugal (€).'
                  : 'Tente ajustar o termo de pesquisa ou selecionar outra categoria de hardware oficial do Google.'}
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                {onlyAvailableInRegion && (
                  <button
                    type="button"
                    onClick={() => setOnlyAvailableInRegion(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Mostrar todos os produtos do catálogo
                  </button>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-purple-600/30 border border-purple-500/40 text-white text-xs font-semibold rounded-lg"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGoogleProducts.map((product) => {
                const regionData = product.regions[selectedRegion];
                const isImageBroken = brokenImages[product.id] || !product.officialImageUrl;

                return (
                  <article
                    key={product.id}
                    className="bg-[#0B1024] border border-slate-800/90 hover:border-slate-700 rounded-xl overflow-hidden flex flex-col justify-between transition-colors"
                  >
                    <div>
                      {/* Official Product Photography Container */}
                      <div className="aspect-[4/3] w-full bg-[#F8F9FA] relative overflow-hidden border-b border-slate-800 flex items-center justify-center p-4">
                        {!isImageBroken ? (
                          <img
                            src={product.officialImageUrl}
                            alt={product.officialName}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenImages((prev) => ({ ...prev, [product.id]: true }))
                            }
                            className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#060916] text-slate-400">
                            <ShoppingBag className="w-8 h-8 text-slate-500 mb-2" />
                            <span className="text-xs font-semibold text-slate-300">
                              Imagem oficial indisponível
                            </span>
                          </div>
                        )}

                        {/* Category & Regional Status Top Bar */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                          <span className="px-2.5 py-1 rounded-md bg-slate-950/85 text-slate-100 text-[11px] font-medium backdrop-blur-sm">
                            {product.category}
                          </span>
                          {regionData.availableOnOfficialStore ? (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-600/50 text-emerald-300 text-[11px] font-semibold backdrop-blur-sm flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Google Store {selectedRegion}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-slate-300 text-[11px] font-medium backdrop-blur-sm">
                              Consulta Regional ({selectedRegion})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h2 className="text-lg font-bold text-white tracking-tight">
                            {product.officialName}
                          </h2>
                          <p className="text-xs text-cyan-300/90 font-medium mt-0.5 line-clamp-1">
                            “{product.officialTagline}”
                          </p>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {product.officialDescription}
                        </p>

                        {/* Verified Technical Specs List */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Especificações Verificadas
                          </div>
                          <dl className="space-y-1 text-xs">
                            {product.verifiedSpecs.slice(0, 3).map((spec, idx) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between gap-2 text-slate-300"
                              >
                                <dt className="text-slate-400 shrink-0">{spec.label}:</dt>
                                <dd className="text-right font-medium text-slate-200">
                                  {spec.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>

                        {/* Regional Availability Detail */}
                        <div className="p-2.5 rounded-lg bg-[#060916] border border-slate-800/80 text-[11px] text-slate-400">
                          <div className="font-semibold text-slate-200">
                            Região: {regionData.countryLabel}
                          </div>
                          <div className="mt-0.5">{regionData.availabilityNote}</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Price & Verified Official Links */}
                    <div className="p-5 pt-0 space-y-3">
                      <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between gap-2">
                        <span className="text-xs text-slate-400">Preço Oficial Confirmado:</span>
                        {regionData.confirmedPriceDisplay ? (
                          <div className="text-right">
                            <span className="text-lg font-bold text-white tabular-nums">
                              A partir de {regionData.confirmedPriceDisplay}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Moeda: {regionData.currencyCode} · Fonte: store.google.com
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-amber-300 text-right">
                            Consulte o preço no site oficial
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedProductModal(product)}
                          className="w-full py-2.5 px-3 bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 min-h-[42px]"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Ficha e Regiões</span>
                        </button>

                        <a
                          href={regionData.officialConfigUrl || regionData.officialProductUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95 text-white text-xs font-semibold rounded-lg transition-opacity flex items-center justify-center gap-1.5 min-h-[42px]"
                        >
                          <span>
                            {regionData.availableOnOfficialStore
                              ? 'Comprar na Google Store'
                              : 'Consultar no Site Oficial'}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Copyright & Official Attribution Footer Note */}
          <div className="p-4 bg-[#0B1024] border border-slate-800/80 rounded-xl text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong className="text-slate-200">Transparência e Direitos Autorais:</strong> Google,
              Google Pixel, Pixel Watch, Pixel Buds, Fitbit, Google TV e Google Nest são marcas
              registradas da Google LLC. Todas as fotografias de hardware são carregadas diretamente
              dos servidores oficiais da Google Store (<span className="font-mono">lh3.googleusercontent.com</span>).
              Nenhum preço, desconto, avaliação ou disponibilidade foi simulado.
            </div>
            <a
              href="https://store.google.com/regionpicker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline font-semibold whitespace-nowrap inline-flex items-center gap-1 shrink-0"
            >
              <span>Ver Todas as Regiões da Google Store</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* TAB 2: NEXUS AI STUDIO DIGITAL FRAMEWORKS (PRESERVED PIX STORE) */}
      {activeCatalogTab === 'nexus_digital' && (
        <div className="mt-6 space-y-6">
          <div className="p-5 bg-[#0B1024] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Frameworks e Materiais Digitais Autorais — NEXUS AI STUDIO
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Materiais digitais voltados para criadores de conteúdo com liberação no painel após
                confirmação manual do pagamento Pix pelo administrador no servidor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveCatalogTab('google_official')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 rounded-lg shrink-0"
            >
              Voltar ao Catálogo Google Store
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {digitalProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-[#0B1024] border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] w-full bg-[#060916] relative overflow-hidden border-b border-slate-800">
                    {!brokenImages[prod.id] && prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [prod.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#060916]">
                        <ShoppingBag className="w-8 h-8 text-purple-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-300">
                          Imagem oficial indisponível
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="text-xs text-slate-400">
                      <span>{prod.category}</span>
                      <span className="mx-1.5">·</span>
                      <span>{prod.fileFormat}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{prod.title}</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between gap-3">
                  <div className="text-lg font-bold text-white tabular-nums">
                    {formatCurrencyBRL(prod.priceCents)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectDigitalProductCheckout(prod)}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 min-h-[40px]"
                  >
                    Comprar com Pix
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCT SPECIFICATION & MULTI-REGION VERIFICATION MODAL */}
      {selectedProductModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#0B1024] border border-slate-700 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl my-8">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-cyan-400">
                  {selectedProductModal.category} · Código Oficial: {selectedProductModal.slug}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {selectedProductModal.officialName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
                aria-label="Fechar detalhes do produto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 aspect-square bg-[#F8F9FA] rounded-xl p-4 flex items-center justify-center border border-slate-800">
                  {!brokenImages[selectedProductModal.id] &&
                  selectedProductModal.officialImageUrl ? (
                    <img
                      src={selectedProductModal.officialImageUrl}
                      alt={selectedProductModal.officialName}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenImages((prev) => ({
                          ...prev,
                          [selectedProductModal.id]: true,
                        }))
                      }
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-xs font-semibold text-slate-600">
                      Imagem oficial indisponível
                    </div>
                  )}
                </div>

                <div className="md:col-span-7 space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-purple-300">
                      Descrição Oficial Verificada
                    </div>
                    <p className="text-sm text-white font-medium mt-1">
                      “{selectedProductModal.officialTagline}”
                    </p>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {selectedProductModal.officialDescription}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">
                      Especificações Técnicas Relevantes
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProductModal.verifiedSpecs.map((spec, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-[#060916] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-slate-400">{spec.label}</span>
                          <span className="text-white font-medium text-right">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Country Price & Availability Matrix */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Disponibilidade e Preços Confirmados por País / Região
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#060916]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">País / Região</th>
                        <th className="py-2.5 px-3">Status Google Store</th>
                        <th className="py-2.5 px-3">Preço Confirmado</th>
                        <th className="py-2.5 px-3 text-right">Acesso Oficial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {(['US', 'PT', 'BR'] as StoreRegionCode[]).map((rCode) => {
                        const rInfo = selectedProductModal.regions[rCode];
                        return (
                          <tr key={rCode}>
                            <td className="py-3 px-3 font-medium text-white">
                              {rInfo.countryLabel}
                            </td>
                            <td className="py-3 px-3">
                              {rInfo.availableOnOfficialStore ? (
                                <span className="text-emerald-400 font-semibold">
                                  Venda Direta Ativa
                                </span>
                              ) : (
                                <span className="text-slate-400">Sem venda direta local</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-white">
                              {rInfo.confirmedPriceDisplay || (
                                <span className="font-sans text-amber-300">
                                  Consulte o preço no site oficial
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <a
                                href={rInfo.officialProductUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
                              >
                                <span>Abrir Página</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#060916] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <a
                href={selectedProductModal.officialSpecsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg inline-flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ver Especificações Completas na Google Store</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedProductModal(null)}
                  className="px-4 py-2.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg"
                >
                  Fechar
                </button>
                <a
                  href={
                    selectedProductModal.regions[selectedRegion].officialConfigUrl ||
                    selectedProductModal.regions[selectedRegion].officialProductUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 hover:opacity-95"
                >
                  <span>Ir para a Google Store Oficial</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
