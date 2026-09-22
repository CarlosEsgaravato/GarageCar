import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Users,
  Car,
  Package,
  DollarSign,
  Wrench,
  BookmarkPlus,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'agenda'
  | 'servicos_realizados'
  | 'servicos_catalogo'
  | 'clientes'
  | 'veiculos'
  | 'produtos_lista'
  | 'produtos_estoque'
  | 'produtos_lotes'
  | 'financeiro_movimentacoes'
  | 'financeiro_aportes'
  | 'equipamentos'
  | 'lista_desejos'
  | 'relatorios'
  | 'configuracoes';

interface SidebarProps {
  currentView: NavItemKey;
  onSelectView: (key: NavItemKey) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
}) => {
  // Submenus abertos por padrão
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    servicos: true,
    produtos: false,
    financeiro: false,
  });

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleItemClick = (key: NavItemKey) => {
    onSelectView(key);
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  const isServicosActive =
    currentView === 'servicos_realizados' || currentView === 'servicos_catalogo';
  const isProdutosActive =
    currentView === 'produtos_lista' ||
    currentView === 'produtos_estoque' ||
    currentView === 'produtos_lotes';
  const isFinanceiroActive =
    currentView === 'financeiro_movimentacoes' ||
    currentView === 'financeiro_aportes';

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Container da Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-slate-100 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Topo / Brand Header */}
        <div className="flex h-18 items-center justify-between px-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-tight text-lg text-white">GARAGE</span>
                <span className="font-black tracking-tight text-lg text-blue-500">CAR</span>
              </div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Estética Automotiva
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status de Administrador Único */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate font-medium">Painel do Administrador</span>
            <span className="ml-auto rounded-full bg-blue-900/60 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-700/50">
              Fase 2
            </span>
          </div>
        </div>

        {/* Lista de Navegação */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {/* 1. Dashboard */}
          <button
            id="nav-dashboard"
            onClick={() => handleItemClick('dashboard')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-blue-400" />
            <span>Dashboard</span>
          </button>

          {/* 2. Agenda */}
          <button
            id="nav-agenda"
            onClick={() => handleItemClick('agenda')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'agenda'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0 text-sky-400" />
            <span>Agenda</span>
          </button>

          {/* 3. Serviços (Submenu) */}
          <div className="space-y-0.5">
            <button
              id="nav-servicos-parent"
              onClick={() => toggleSubmenu('servicos')}
              className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                isServicosActive
                  ? 'text-white bg-slate-900/90'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 shrink-0 text-indigo-400" />
                <span>Serviços</span>
              </div>
              {openSubmenus.servicos ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {openSubmenus.servicos && (
              <div className="ml-5 pl-3 border-l border-slate-800 space-y-1 pt-1">
                <button
                  id="nav-servicos-realizados"
                  onClick={() => handleItemClick('servicos_realizados')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    currentView === 'servicos_realizados'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  Serviços realizados
                </button>
                <button
                  id="nav-servicos-catalogo"
                  onClick={() => handleItemClick('servicos_catalogo')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    currentView === 'servicos_catalogo'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  Catálogo de serviços
                </button>
              </div>
            )}
          </div>

          {/* 4. Clientes */}
          <button
            id="nav-clientes"
            onClick={() => handleItemClick('clientes')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'clientes'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4 shrink-0 text-teal-400" />
            <span>Clientes</span>
          </button>

          {/* 5. Veículos */}
          <button
            id="nav-veiculos"
            onClick={() => handleItemClick('veiculos')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'veiculos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Car className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Veículos</span>
          </button>

          {/* 6. Produtos (Submenu) */}
          <div className="space-y-0.5">
            <button
              id="nav-produtos-parent"
              onClick={() => toggleSubmenu('produtos')}
              className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                isProdutosActive
                  ? 'text-white bg-slate-900/90'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Produtos</span>
              </div>
              {openSubmenus.produtos ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {openSubmenus.produtos && (
              <div className="ml-5 pl-3 border-l border-slate-800 space-y-1 pt-1">
                <button
                  id="nav-produtos-lista"
                  onClick={() => handleItemClick('produtos_lista')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    currentView === 'produtos_lista'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  Produtos
                </button>
                <button
                  id="nav-produtos-estoque"
                  onClick={() => handleItemClick('produtos_estoque')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    currentView === 'produtos_estoque'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  Estoque
                </button>
                <button
                  id="nav-produtos-lotes"
                  onClick={() => handleItemClick('produtos_lotes')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    currentView === 'produtos_lotes'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  Compras / Lotes
                </button>
              </div>
            )}
          </div>

          {/* 7. Financeiro (Submenu) */}
          <div className="space-y-0.5">
            <button
              id="nav-financeiro-parent"
              onClick={() => toggleSubmenu('financeiro')}
              className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                isFinanceiroActive
                  ? 'text-white bg-slate-900/90'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Financeiro</span>
              </div>
              {openSubmenus.financeiro ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {openSubmenus.financeiro && (
              <div className="ml-5 pl-3 border-l border-slate-800 space-y-1 pt-1">
                <button
                  id="nav-financeiro-movimentacoes"
                  onClick={() => handleItemClick('financeiro_movimentacoes')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    currentView === 'financeiro_movimentacoes'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  Movimentações
                </button>
                <button
                  id="nav-financeiro-aportes"
                  onClick={() => handleItemClick('financeiro_aportes')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    currentView === 'financeiro_aportes'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  Aportes
                </button>
              </div>
            )}
          </div>

          {/* 8. Equipamentos */}
          <button
            id="nav-equipamentos"
            onClick={() => handleItemClick('equipamentos')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'equipamentos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Wrench className="h-4 w-4 shrink-0 text-orange-400" />
            <span>Equipamentos</span>
          </button>

          {/* 9. Lista de desejos */}
          <button
            id="nav-lista-desejos"
            onClick={() => handleItemClick('lista_desejos')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'lista_desejos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BookmarkPlus className="h-4 w-4 shrink-0 text-pink-400" />
            <span>Lista de desejos</span>
          </button>

          {/* 10. Relatórios */}
          <button
            id="nav-relatorios"
            onClick={() => handleItemClick('relatorios')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'relatorios'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0 text-violet-400" />
            <span>Relatórios</span>
          </button>

          {/* 11. Configurações */}
          <button
            id="nav-configuracoes"
            onClick={() => handleItemClick('configuracoes')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
              currentView === 'configuracoes'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Configurações</span>
          </button>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-300 mb-1">
              <span className="font-semibold text-slate-200">Garage Car</span>
              <span className="text-[10px] text-emerald-400 font-mono">v3.0-Fase3</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Operação • Agenda • FIFO • RLS Ativo
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
