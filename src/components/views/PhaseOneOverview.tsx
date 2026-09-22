import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Database,
  Layers,
  Sparkles,
  Car,
  AlertCircle,
  ArrowRight,
  Clock,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from '../layout/Sidebar';

interface PhaseOneOverviewProps {
  onNavigate: (view: NavItemKey) => void;
  onOpenDbModal: () => void;
}

export const PhaseOneOverview: React.FC<PhaseOneOverviewProps> = ({
  onNavigate,
  onOpenDbModal,
}) => {
  const { isConfigured, isDemoMode } = useAuth();

  return (
    <div className="space-y-8">
      {/* Banner de Boas-Vindas da Fase 1 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>FASE 1: Fundação, Autenticação, Layout, Supabase & Segurança</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Sistema Administrativo Garage Car
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Ambiente administrativo inicial configurado com rigor de regras de negócio, identidade visual automotiva, esquema relacional PostgreSQL completo, segurança RLS e catálogo padrão de preços.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('agenda')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            >
              <Clock className="h-4 w-4" />
              <span>Acessar Agenda</span>
            </button>
            <button
              onClick={() => onNavigate('servicos_realizados')}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>Serviços Realizados</span>
            </button>
            <button
              onClick={onOpenDbModal}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Database className="h-4 w-4" />
              <span>Inspecionar DDL SQL & Supabase</span>
            </button>
          </div>
        </div>

        {/* Efeito estético de fundo */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Grid de Validação da Fase 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Fundação & Regras */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Concluído
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Fundação & Arquitetura</h3>
          <p className="mt-1 text-xs text-slate-500">
            Regras de dados estritas, sem simplificações indevidas.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Identificador <strong>UUID</strong> em todas entidades</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Financeiro estritamente <strong>NUMERIC</strong> (sem float)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span><strong>NÃO criar CPF</strong> em nenhuma tabela</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Unidade interna <code className="font-mono bg-slate-100 px-1">ml</code> para líquidos</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Segurança & RLS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Ativo
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Segurança & Supabase Auth</h3>
          <p className="mt-1 text-xs text-slate-500">
            Acesso administrativo exclusivo protegido por RLS.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span><strong>RLS habilitado</strong> nas 16 tabelas</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Usuário anônimo bloqueado de dados sensíveis</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Tabela e triggers para <code className="font-mono bg-slate-100 px-1">audit_logs</code></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Supabase Storage para logo preparado</span>
            </li>
          </ul>
        </div>

        {/* Card 3: Identidade Visual & Layout */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Car className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Pronto
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Identidade Garage Car</h3>
          <p className="mt-1 text-xs text-slate-500">
            Design automotivo, limpo, responsivo e minimalista.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Paleta: Azul, azul escuro, branco e neutros</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Menu completo com 11 seções e submenus</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Navegação responsiva (Desktop & Mobile drawer)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Componentes reutilizáveis e modulares</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tabela de Preços e Serviços Oficiais da Garage Car (Seção 7 e 8) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-600" />
              Tabela de Preços Iniciais Parametrizada (Seção 7 e 8)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Preços definidos estritamente pelo documento. Nunca alteram o histórico de serviços já realizados.
            </p>
          </div>
          <button
            onClick={() => onNavigate('servicos_catalogo')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>Ver Catálogo Detalhado</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Tabela Principal */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Categoria Comercial</th>
                <th className="py-3 px-4">Convencional</th>
                <th className="py-3 px-4">Técnica</th>
                <th className="py-3 px-4">Premium</th>
                <th className="py-3 px-4">Exemplos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-bold text-slate-900">Carro / Compacto</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 70,00</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 109,90</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 199,90</td>
                <td className="py-3 px-4 text-slate-500">Strada, Saveiro, Montana antiga, Onix, Polo</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-bold text-slate-900">SUV / Crossover</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 90,00</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 129,90</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 209,90</td>
                <td className="py-3 px-4 text-slate-500">EcoSport, Renegade, Compass, Tracker, Creta</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-bold text-slate-900">Porte Médio / Pickup</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 100,00</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 139,90</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 219,90</td>
                <td className="py-3 px-4 text-slate-500">Toro, Montana nova, Hilux, Ranger, S10</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-bold text-slate-900">Moto</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 35,00</td>
                <td className="py-3 px-4 font-semibold text-blue-600">R$ 70,00</td>
                <td className="py-3 px-4 text-slate-400 italic">—</td>
                <td className="py-3 px-4 text-slate-500">Motos street, custom, trail, esportivas</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Grade de Acréscimos de Condição e Serviços Adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Acréscimos */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Acréscimos de Condição do Veículo (Seção 10)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-500">Normal:</span>
                <span className="ml-1 font-bold text-slate-800">R$ 0,00</span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-500">Acima do normal:</span>
                <span className="ml-1 font-bold text-slate-800">+ R$ 10,00</span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-500">Pesada:</span>
                <span className="ml-1 font-bold text-slate-800">+ R$ 20,00</span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-500">Extrema:</span>
                <span className="ml-1 font-bold text-slate-800">Definido no ato</span>
              </div>
            </div>
          </div>

          {/* Serviços Adicionais */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Serviços Adicionais Iniciais (Seção 8)
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-slate-700 font-medium">Cristalização de Para-brisa</span>
                <span className="font-bold text-blue-600">R$ 60,00</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-slate-700 font-medium">Remoção de chuva ácida dos vidros</span>
                <span className="font-bold text-blue-600">R$ 80,00</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-slate-700 font-medium">Higienização de bancos de tecido</span>
                <span className="font-bold text-blue-600">R$ 150,00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regra de Faseamento e Próximo Passo */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-slate-50 p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900">
              Faseamento: FASE 3 (Operação) Implementada com Sucesso
            </h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              A <strong>FASE 3 — OPERAÇÃO</strong> está totalmente funcional: Agenda visual com detecção não bloqueante de conflitos e horários excepcionais, Atendimentos Walk-in, Cronometragem real e produtividade (R$/h), Consumo de insumos por baixa FIFO com suporte a fracionamento e saldo negativo, Margens brutas simples, e Registro autônomo de pagamento.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                Fases 1, 2 e 3 Concluídas
              </span>
              <span className="text-xs text-slate-500">
                Próxima Etapa: FASE 4 (Financeiro, Caixa e Aportes).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
