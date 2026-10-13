import React from 'react';
import { Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from './Sidebar';

interface HeaderProps {
  currentView: NavItemKey;
  onOpenMobileMenu: () => void;
  onOpenDbModal?: () => void;
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
}) => {
  const { user, signOut } = useAuth();
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

      {/* Direita: Perfil Admin e Ações */}
      <div className="flex items-center gap-3">
        {/* Chip do Administrador */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs shadow-xs">
            <Shield className="h-4 w-4 text-blue-400" />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              Administrador
            </p>
            <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
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
