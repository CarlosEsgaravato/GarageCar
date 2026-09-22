import React, { useState, ReactNode } from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Header } from './Header';
import { DatabaseModal } from '../modals/DatabaseModal';

interface AppLayoutProps {
  currentView: NavItemKey;
  onSelectView: (key: NavItemKey) => void;
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentView,
  onSelectView,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* Sidebar Lateral */}
      <Sidebar
        currentView={currentView}
        onSelectView={onSelectView}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Área Principal de Conteúdo */}
      <div className="flex flex-1 flex-col lg:pl-72 min-w-0">
        <Header
          currentView={currentView}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenDbModal={() => setIsDbModalOpen(true)}
          onNavigateToConfig={() => onSelectView('configuracoes')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Modal de Supabase e Banco */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </div>
  );
};
