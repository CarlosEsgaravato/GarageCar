import React from 'react';
import {
  Calendar,
  Users,
  Car,
  Package,
  DollarSign,
  Wrench,
  BookmarkPlus,
  BarChart3,
  LayoutDashboard,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { NavItemKey } from '../layout/Sidebar';

interface ModulePlaceholderViewProps {
  viewKey: NavItemKey;
  onNavigateToPhaseOne: () => void;
  onOpenDbModal?: () => void;
}

interface ModuleSpec {
  title: string;
  category: string;
  phase: number;
  phaseLabel: string;
  icon: React.ReactNode;
  description: string;
  rules: string[];
}

const MODULE_SPECS: Record<string, ModuleSpec> = {
  dashboard: {
    title: 'Dashboard de Indicadores',
    category: 'Visão Geral',
    phase: 4,
    phaseLabel: 'Financeiro, Dashboard e Relatórios',
    icon: <LayoutDashboard className="h-7 w-7 text-blue-600" />,
    description:
      'Painel de métricas operacionais calculado a partir dos dados reais: faturamento, serviços realizados, ticket médio, caixa, tempo médio, receita/hora e alertas.',
    rules: [
      'Indicadores calculados diretamente dos dados reais (sem tabelas duplicadas)',
      'Filtros por período personalizável',
      'Alertas automáticos de estoque mínimo e agendamentos',
    ],
  },
  agenda: {
    title: 'Agenda de Serviços',
    category: 'Agendamentos',
    phase: 3,
    phaseLabel: 'Agenda, Execução, FIFO e Estoque',
    icon: <Calendar className="h-7 w-7 text-sky-600" />,
    description:
      'Controle visual de horários em formato diário, semanal e lista para qualquer data, com horários excepcionais.',
    rules: [
      'Nunca bloquear uma data simplesmente porque o dia normalmente está fechado',
      'Horários excepcionais flexíveis (ex: quarta-feira 17:00 às 21:00)',
      'Permitir registrar serviço realizado diretamente sem agendamento prévio',
    ],
  },
  servicos_realizados: {
    title: 'Serviços Realizados (Executados)',
    category: 'Serviços',
    phase: 2,
    phaseLabel: 'Execução e Histórico',
    icon: <Car className="h-7 w-7 text-indigo-600" />,
    description:
      'Registro de execuções com snapshots históricos imutáveis, início real, término real, produtos consumidos e controle de pagamento.',
    rules: [
      'Diferenciação clara entre agendamento previsto e serviço executado',
      'Snapshots de cliente, modelo, categoria e preço base no momento do registro',
      'Cálculo de produtividade: receita/hora e duração real (finished_at - started_at)',
      'Pagamento sem parcelamento: Pendente, Pago ou Cancelado',
    ],
  },
  clientes: {
    title: 'Gerenciamento de Clientes',
    category: 'Cadastros',
    phase: 2,
    phaseLabel: 'Clientes, Veículos e Produtos',
    icon: <Users className="h-7 w-7 text-teal-600" />,
    description:
      'Cadastro centralizado de clientes e seus veículos associados para histórico de estética automotiva.',
    rules: [
      'Campos: Nome, Telefone, E-mail, Observações e Ativo/Inativo',
      'Um cliente pode possuir múltiplos veículos vinculados',
      'REGRA ABSOLUTA: NÃO criar CPF em nenhum lugar do sistema',
    ],
  },
  veiculos: {
    title: 'Gerenciamento de Veículos',
    category: 'Cadastros',
    phase: 2,
    phaseLabel: 'Clientes, Veículos e Produtos',
    icon: <Car className="h-7 w-7 text-cyan-600" />,
    description:
      'Cadastro de veículos com categorização comercial livre e independente da documentação oficial.',
    rules: [
      'Categorias: Carro / Compacto, SUV / Crossover, Porte Médio / Pickup, Moto',
      'Classificação comercial livremente editável pelo administrador',
      'Placa opcional para maior agilidade no atendimento',
    ],
  },
  produtos_lista: {
    title: 'Cadastro de Produtos',
    category: 'Estoque',
    phase: 2,
    phaseLabel: 'Produtos e Equipamentos',
    icon: <Package className="h-7 w-7 text-amber-600" />,
    description:
      'Catálogo de insumos e produtos químicos com padronização de unidades volumétricas.',
    rules: [
      'Para produtos líquidos, utilizar obrigatoriamente ml como unidade interna (ex: 3L = 3000ml)',
      'Controle de estoque mínimo com alertas visuais',
      'Ativação/inativação de produtos para preservar histórico',
    ],
  },
  produtos_estoque: {
    title: 'Movimentações de Estoque',
    category: 'Estoque',
    phase: 3,
    phaseLabel: 'FIFO e Movimentações',
    icon: <Package className="h-7 w-7 text-amber-600" />,
    description:
      'Rastreamento completo de entradas por compra, consumo por serviços executados e ajustes.',
    rules: [
      'Estoque negativo é permitido (nunca bloqueia um serviço)',
      'Alerta visual específico para saldo negativo',
      'Ajustes manuais exigem obrigatoriamente motivo formal',
    ],
  },
  produtos_lotes: {
    title: 'Compras e Lotes (FIFO)',
    category: 'Estoque',
    phase: 3,
    phaseLabel: 'FIFO e Gestão de Lotes',
    icon: <Package className="h-7 w-7 text-amber-600" />,
    description:
      'Gerenciamento de lotes adquiridos com consumo prioritário por Primeiro a Entrar, Primeiro a Sair (FIFO).',
    rules: [
      'Primeiro lote adquirido é o primeiro lote consumido automaticamente',
      'Quando um lote acabar, consome o restante e prossegue no próximo lote',
      'Permite seleção manual de lote pelo administrador quando necessário',
      'Preservação perpétua do preço histórico de compra do lote',
    ],
  },
  financeiro_movimentacoes: {
    title: 'Movimentações Financeiras',
    category: 'Financeiro',
    phase: 4,
    phaseLabel: 'Financeiro e Aportes',
    icon: <DollarSign className="h-7 w-7 text-emerald-600" />,
    description:
      'Fluxo de caixa separando receitas, despesas e resultado operacional da Garage Car.',
    rules: [
      'Receita de serviço gerada somente quando o pagamento for marcado como PAGO',
      'Correções financeiras geram estornos/ajustes sem apagar o registro original',
      'Precisão decimal rigorosa para fechamento financeiro',
    ],
  },
  financeiro_aportes: {
    title: 'Aportes de Capital',
    category: 'Financeiro',
    phase: 4,
    phaseLabel: 'Financeiro e Aportes',
    icon: <DollarSign className="h-7 w-7 text-emerald-600" />,
    description:
      'Registro contábil de recursos inseridos na oficina pelo proprietário.',
    rules: [
      'Diferenciação clara entre: 1. Dinheiro colocado na empresa vs 2. Compra paga diretamente pelo proprietário',
      'Compra paga pelo proprietário não reduz o caixa da empresa',
      'Aportes não são classificados como receita operacional',
    ],
  },
  equipamentos: {
    title: 'Equipamentos da Oficina',
    category: 'Patrimônio',
    phase: 2,
    phaseLabel: 'Equipamentos',
    icon: <Wrench className="h-7 w-7 text-orange-600" />,
    description:
      'Inventário de maquinários e ferramentas de estética automotiva (politrizes, extratoras, lavadoras de alta pressão).',
    rules: [
      'Controle de status: Ativo, Em Manutenção ou Baixado',
      'Registro de data e valor de aquisição',
    ],
  },
  lista_desejos: {
    title: 'Lista de Desejos / Aquisições',
    category: 'Planejamento',
    phase: 4,
    phaseLabel: 'Planejamento e Desejos',
    icon: <BookmarkPlus className="h-7 w-7 text-pink-600" />,
    description:
      'Planejamento de investimentos futuros em novos equipamentos, produtos especiais e melhorias da oficina.',
    rules: [
      'Prioridades: Baixa, Média e Alta',
      'Estimativa de investimento e acompanhamento de compra',
    ],
  },
  relatorios: {
    title: 'Relatórios Gerenciais',
    category: 'Inteligência',
    phase: 4,
    phaseLabel: 'Relatórios Gerenciais',
    icon: <BarChart3 className="h-7 w-7 text-violet-600" />,
    description:
      'Exportação e análise de faturamento, produtividade, consumo de insumos e financeiro.',
    rules: [
      'Relatórios consolidados gerados a partir do histórico operacional',
      'Relatórios de faturamento, serviços, produtividade e estoque',
    ],
  },
};

export const ModulePlaceholderView: React.FC<ModulePlaceholderViewProps> = ({
  viewKey,
  onNavigateToPhaseOne,
}) => {
  const spec = MODULE_SPECS[viewKey] || {
    title: 'Módulo do Sistema',
    category: 'Sistema',
    phase: 1,
    phaseLabel: 'Módulo Programado',
    icon: <ShieldCheck className="h-7 w-7 text-blue-600" />,
    description: 'Módulo integrado às operações da Garage Car.',
    rules: ['Diretrizes operacionais alinhadas'],
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner do Módulo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100">
              {spec.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  {spec.category}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                  Indisponível
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {spec.title}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                {spec.description}
              </p>
            </div>
          </div>
        </div>

        {/* Informação Operacional */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
            <ShieldCheck className="h-4 w-4 text-slate-600" />
            <span>Módulo indisponível no momento</span>
          </div>
          <p className="text-xs text-slate-600">
            As funcionalidades deste módulo estão reservadas para a operação da Garage Car.
          </p>
        </div>

        {/* Diretrizes Operacionais */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Diretrizes Operacionais do Módulo:
          </h3>
          <div className="space-y-2">
            {spec.rules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ações de Navegação */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          <button
            onClick={onNavigateToPhaseOne}
            className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            <span>Retornar ao Início</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
