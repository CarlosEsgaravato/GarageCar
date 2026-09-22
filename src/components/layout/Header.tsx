import React from 'react';
import { Menu, Database, LogOut, CheckCircle2, AlertTriangle, Shield, HardDrive } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from './Sidebar';

interface HeaderProps {
  currentView: NavItemKey;
  onOpenMobileMenu: () => void;
  onOpenDbModal: () => void;
  onNavigateToConfig?: () => void;
}

const VIEW_TITLES: Record<NavItemKey, { title: string; category?: string }> = {
  dashboard: { title: 'Dashboard Geral', category: 'Visão Geral' },
  agenda: { title: 'Agenda de Serviços', category: 'Agendamentos' },
  servicos_realizados: { title: 'Serviços Realizados', category: 'Serviços' },
  servicos_catalogo: { title: 'Catálogo de Serviços', category: 'Serviços' },
  clientes: { title: 'Gerenciamento de Clientes', category: 'Cadastros' },
  veiculos: { title: 'Gerenciamento de Veículos', category: 'Cadastros' },
  produtos_lista: { title: 'Cadastro de Produtos', category: 'Estoque' },
  produtos_estoque: { title: 'Movimentações de Estoque', category: 'Estoque' },
  produtos_lotes: { title: 'Compras e Lotes (FIFO)', category: 'Estoque' },
  financeiro_movimentacoes: { title: 'Movimentações Financeiras', category: 'Financeiro' },
  financeiro_aportes: { title: 'Aportes de Capital', category: 'Financeiro' },
  equipamentos: { title: 'Equipamentos da Oficina', category: 'Patrimônio' },
  lista_desejos: { title: 'Lista de Desejos / Aquisições', category: 'Planejamento' },
  relatorios: { title: 'Relatórios Gerenciais', category: 'Inteligência' },
  configuracoes: { title: 'Configurações do Sistema', category: 'Administração' },
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenMobileMenu,
  onOpenDbModal,
  onNavigateToConfig,
}) => {
  const { user, isDemoMode, isConfigured, signOut } = useAuth();
  const viewInfo = VIEW_TITLES[currentView] || { title: 'Garage Car' };

  return (
    <header className="sticky top-0 z-30 flex h-18 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-8">
      {/* Esquerda: Botão mobile e Título */}
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-menu"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          {viewInfo.category && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              {viewInfo.category}
            </span>
          )}
          <h1 className="text-base font-bold text-slate-900 sm:text-lg">
            {viewInfo.title}
          </h1>
        </div>
      </div>

      {/* Direita: Status Supabase, Atalho DB e Perfil Admin */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Status de Conexão Supabase */}
        <button
          id="btn-status-supabase"
          onClick={onOpenDbModal}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            isConfigured && !isDemoMode
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : isDemoMode
              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
          title="Clique para gerenciar conexão e ver script SQL"
        >
          {isConfigured && !isDemoMode ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden md:inline">Supabase Online</span>
              <span className="md:hidden">Online</span>
            </>
          ) : isDemoMode ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden md:inline">Modo Demonstração</span>
              <span className="md:hidden">Demo</span>
            </>
          ) : (
            <>
              <HardDrive className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden md:inline">Configurar Banco</span>
              <span className="md:hidden">Config</span>
            </>
          )}
        </button>

        {/* Botão rápido para Schema SQL / DDL */}
        <button
          id="btn-open-schema"
          onClick={onOpenDbModal}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Inspecionar Script SQL / Tabelas / RLS"
        >
          <Database className="h-3.5 w-3.5 text-blue-600" />
          <span>Banco & RLS</span>
        </button>

        {/* Botão Temporário para Diagnóstico Supabase no Navegador */}
        {onNavigateToConfig && (
          <button
            id="btn-open-browser-diagnostic"
            onClick={onNavigateToConfig}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            title="Abrir área de diagnóstico de sessão Supabase no navegador"
          >
            <Shield className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden md:inline">Diagnóstico Navegador</span>
            <span className="md:hidden">Diag</span>
          </button>
        )}

        {/* Chip do Administrador */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs shadow-xs">
            <Shield className="h-4 w-4 text-blue-400" />
          </div>
          <div className="hidden text-left xl:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              Administrador
            </p>
            <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
              {user?.email || 'admin@garagecar.com.br'}
            </p>
          </div>

          <button
            id="btn-logout"
            onClick={signOut}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Sair do sistema administrativo"
            aria-label="Encerrar sessão"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
