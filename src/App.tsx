import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { AppLayout } from './components/layout/AppLayout';
import { NavItemKey } from './components/layout/Sidebar';
import { PhaseOneOverview } from './components/views/PhaseOneOverview';
import { DashboardView } from './components/views/DashboardView';
import { ServiceCatalogView } from './components/views/ServiceCatalogView';
import { ClientsView } from './components/views/ClientsView';
import { VehiclesView } from './components/views/VehiclesView';
import { ProductsView } from './components/views/ProductsView';
import { EquipmentView } from './components/views/EquipmentView';
import { ConfigurationView } from './components/views/ConfigurationView';
import { AgendaView } from './components/views/AgendaView';
import { ExecutedServicesView } from './components/views/ExecutedServicesView';
import { ProductBatchesView } from './components/views/ProductBatchesView';
import { ProductStockView } from './components/views/ProductStockView';
import { FinancialTransactionsView } from './components/views/FinancialTransactionsView';
import { CapitalContributionsView } from './components/views/CapitalContributionsView';
import { WishlistView } from './components/views/WishlistView';
import { ReportsView } from './components/views/ReportsView';
import { ModulePlaceholderView } from './components/views/ModulePlaceholderView';
import { DatabaseModal } from './components/modals/DatabaseModal';
import { Car } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading, isDemoMode } = useAuth();
  const [currentView, setCurrentView] = useState<NavItemKey>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Tela de Carregamento Inicial
  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30 animate-pulse mb-4">
          <Car className="h-8 w-8 text-white" />
        </div>
        <div className="flex items-center gap-1.5 text-xl font-black tracking-tight">
          <span>GARAGE</span>
          <span className="text-blue-500">CAR</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Carregando ambiente administrativo...
        </p>
      </div>
    );
  }

  // Se não estiver autenticado nem em modo de demonstração, exibe tela de login
  if (!user && !isDemoMode) {
    return (
      <>
        <LoginView onOpenDbModal={() => setIsDbModalOpen(true)} />
        <DatabaseModal
          isOpen={isDbModalOpen}
          onClose={() => setIsDbModalOpen(false)}
        />
      </>
    );
  }

  // Renderiza a visualização correspondente ao menu selecionado
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
      case 'agenda':
        return (
          <AgendaView
            onStartServiceFromAppointment={() => {
              setCurrentView('servicos_realizados');
            }}
            onNavigateToRealizedServices={() => setCurrentView('servicos_realizados')}
          />
        );
      case 'servicos_realizados':
        return (
          <ExecutedServicesView
            onNavigateToAgenda={() => setCurrentView('agenda')}
          />
        );
      case 'clientes':
        return (
          <ClientsView
            onNavigateToVehicles={(clientId) => {
              setSelectedClientId(clientId);
              setCurrentView('veiculos');
            }}
          />
        );
      case 'veiculos':
        return <VehiclesView initialClientId={selectedClientId} />;
      case 'servicos_catalogo':
        return <ServiceCatalogView />;
      case 'produtos_lista':
        return <ProductsView />;
      case 'produtos_estoque':
        return <ProductStockView />;
      case 'produtos_lotes':
        return <ProductBatchesView />;
      case 'financeiro_movimentacoes':
        return <FinancialTransactionsView />;
      case 'financeiro_aportes':
        return <CapitalContributionsView />;
      case 'equipamentos':
        return <EquipmentView />;
      case 'lista_desejos':
        return (
          <WishlistView
            onNavigateToEquipment={() => setCurrentView('equipamentos')}
            onNavigateToBatches={() => setCurrentView('produtos_lotes')}
          />
        );
      case 'relatorios':
        return <ReportsView />;
      case 'configuracoes':
        return (
          <ConfigurationView
            onOpenDbModal={() => setIsDbModalOpen(true)}
          />
        );
      default:
        return (
          <ModulePlaceholderView
            viewKey={currentView}
            onNavigateToPhaseOne={() => setCurrentView('dashboard')}
            onOpenDbModal={() => setIsDbModalOpen(true)}
          />
        );
    }
  };

  return (
    <>
      <AppLayout currentView={currentView} onSelectView={setCurrentView}>
        {renderCurrentView()}
      </AppLayout>

      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
