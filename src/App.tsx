/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  BookOpen, 
  Wallet, 
  Bell, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Search,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle2,
  Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { simulateTaxes } from './services/taxLogic';
import { getFinancialAdvice, getTaxAlerts } from './services/geminiService';
import { BusinessData, TaxSimulationResult, Transaction } from './types';
import { cn } from './lib/utils';

// --- Components ---

const Card = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div ref={ref} className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  )
);
Card.displayName = 'Card';

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className,
  disabled
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'; 
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100'
  };

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'education' | 'cashflow' | 'alerts' | 'settings'>('dashboard');
  const [businessData, setBusinessData] = useState<BusinessData>({
    monthlyRevenue: 50000,
    monthlyExpenses: 15000,
    employeeCosts: 10000,
    machineRental: 2000,
    consumables: 1500,
    activityType: 'service_general',
    issRate: 5
  });
  const adviceRef = React.useRef<HTMLDivElement>(null);

  const [simulationResults, setSimulationResults] = useState<TaxSimulationResult[]>([]);
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    type: 'expense',
    category: 'Outros'
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      try {
        // Fetch transactions
        const { data: transData, error: transError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('date', { ascending: false });
        
        if (transError) throw transError;
        if (transData) setTransactions(transData);

        // Fetch business data
        const { data: bizData, error: bizError } = await supabase
          .from('business_data')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (bizError && bizError.code !== 'PGRST116') throw bizError;
        if (bizData) {
          const { user_id, id, ...rest } = bizData;
          setBusinessData(rest as BusinessData);
        }
      } catch (e) {
        console.error("Error fetching data from Supabase", e);
      }
    };
    fetchData();
  }, [session]);

  useEffect(() => {
    const results = simulateTaxes(businessData);
    setSimulationResults(results);
    
    if (!session) return;

    const saveBizData = async () => {
      try {
        await supabase
          .from('business_data')
          .upsert({ 
            user_id: session.user.id,
            ...businessData 
          }, { onConflict: 'user_id' });
      } catch (e) {
        console.error("Error saving business data to Supabase", e);
      }
    };
    saveBizData();
  }, [businessData, session]);

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount || !session) return;
    
    const transaction = {
      user_id: session.user.id,
      date: newTransaction.date || new Date().toISOString().split('T')[0],
      description: newTransaction.description,
      amount: Number(newTransaction.amount),
      type: newTransaction.type as 'income' | 'expense',
      category: newTransaction.category || 'Outros'
    };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select();

      if (error) throw error;
      if (data) setTransactions([data[0] as Transaction, ...transactions]);
      
      setIsTransactionModalOpen(false);
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: 'expense',
        category: 'Outros'
      });
    } catch (e) {
      console.error("Error saving transaction to Supabase", e);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.text('Relatório de Planejamento Tributário', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    // Business Data Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Dados do Negócio', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Campo', 'Valor']],
      body: [
        ['Receita Mensal', `R$ ${businessData.monthlyRevenue.toLocaleString()}`],
        ['Despesas Operacionais', `R$ ${businessData.monthlyExpenses.toLocaleString()}`],
        ['Folha de Pagamento', `R$ ${businessData.employeeCosts.toLocaleString()}`],
        ['Aluguel de Máquinas', `R$ ${businessData.machineRental.toLocaleString()}`],
        ['Consumíveis', `R$ ${businessData.consumables.toLocaleString()}`],
        ['Alíquota ISS', `${businessData.issRate}%`],
      ],
    });

    // Tax Comparison Section
    doc.text('Comparativo de Regimes', 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Regime', 'Imposto Total', 'Alíquota Efetiva']],
      body: simulationResults.map(r => [
        r.regime,
        `R$ ${r.totalTax.toLocaleString()}`,
        `${r.effectiveRate.toFixed(2)}%`
      ]),
    });

    // Best Option Highlight
    const best = [...simulationResults].sort((a, b) => a.totalTax - b.totalTax)[0];
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text(`Recomendação: O regime mais econômico é o ${best.regime}.`, 14, (doc as any).lastAutoTable.finalY + 15);
    
    const fileName = 'relatorio-taxflow.pdf';

    // Lógica para Celular vs Web
    const savePDF = async () => {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        try {
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Cache
          });

          await Share.share({
            title: 'Relatório TaxFlow',
            text: 'Confira seu planejamento tributário gerado pelo TaxFlow.',
            url: savedFile.uri,
            dialogTitle: 'Compartilhar Relatório'
          });
        } catch (e) {
          console.error('Erro ao compartilhar PDF no celular', e);
          alert('Não foi possível gerar o PDF no celular.');
        }
      } else {
        doc.save(fileName);
      }
    };

    savePDF();
  };

  useEffect(() => {
    setSimulationResults(simulateTaxes(businessData));
  }, [businessData]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const newAlerts = await getTaxAlerts(transactions, 'Lucro Presumido');
      setAlerts(newAlerts);
    };
    fetchAlerts();
  }, [transactions]);

  const handleGetAdvice = async (topic: string) => {
    setLoadingAdvice(true);
    setAdvice('');
    try {
      const res = await getFinancialAdvice(`Explique detalhadamente sobre ${topic} para um empreendedor iniciante no Brasil. Use exemplos práticos e linguagem simples.`);
      setAdvice(res || '');
      // Scroll to advice after a short delay to allow rendering
      setTimeout(() => {
        adviceRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e) {
      setAdvice('Erro ao obter conselhos. Tente novamente.');
    }
    setLoadingAdvice(false);
  };

  const renderTransactionModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-4">Nova Transação</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input 
              type="text" 
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Aluguel de Máquina"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input 
                type="number" 
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input 
                type="date" 
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select 
              value={newTransaction.type}
              onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as any})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="income">Receita (+)</option>
              <option value="expense">Despesa (-)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select 
              value={newTransaction.category}
              onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Serviços">Serviços</option>
              <option value="Equipamento">Equipamento</option>
              <option value="Insumos">Insumos</option>
              <option value="Marketing">Marketing</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setIsTransactionModalOpen(false)}>Cancelar</Button>
          <Button className="flex-1" onClick={handleAddTransaction}>Salvar</Button>
        </div>
      </motion.div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-indigo-50 border-indigo-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider">Receita Mensal</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">R$ {businessData.monthlyRevenue.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span>+12% vs mês anterior</span>
          </div>
        </Card>

        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Economia Estimada</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">R$ 2.450,00</h3>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            Otimização por Lucro Presumido
          </div>
        </Card>

        <Card className="p-6 bg-amber-50 border-amber-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Próximo Vencimento</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">20/02</h3>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            Guia do DAS (Simples Nacional)
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-6">Comparativo de Regimes Tributários</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={simulationResults}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="regime" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="totalTax" radius={[6, 6, 0, 0]} barSize={40}>
                  {simulationResults.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 1 ? '#10b981' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Alertas Inteligentes</h4>
          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.map((alert, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className={cn(
                    "p-2 rounded-lg h-fit",
                    alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  )}>
                    {alert.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900">{alert.title}</h5>
                    <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum alerta crítico no momento.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderSimulator = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-1 space-y-6">
        <h3 className="text-xl font-bold text-slate-900">Dados do Negócio</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ramo de Atividade</label>
            <select 
              value={businessData.activityType}
              onChange={(e) => setBusinessData({...businessData, activityType: e.target.value as any})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="service_general">Prestação de Serviços (Geral)</option>
              <option value="service_professional">Serviços Profissionais (Advogados, Médicos, etc.)</option>
              <option value="commerce">Comércio</option>
              <option value="industry">Indústria</option>
              <option value="transport">Transporte</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Receita Bruta Mensal (R$)</label>
            <input 
              type="number" 
              value={businessData.monthlyRevenue}
              onChange={(e) => setBusinessData({...businessData, monthlyRevenue: Number(e.target.value)})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Despesas Operacionais (R$)</label>
            <input 
              type="number" 
              value={businessData.monthlyExpenses}
              onChange={(e) => setBusinessData({...businessData, monthlyExpenses: Number(e.target.value)})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Folha de Pagamento (R$)</label>
            <input 
              type="number" 
              value={businessData.employeeCosts}
              onChange={(e) => setBusinessData({...businessData, employeeCosts: Number(e.target.value)})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alíquota ISS (%)</label>
            <input 
              type="number" 
              value={businessData.issRate}
              onChange={(e) => setBusinessData({...businessData, issRate: Number(e.target.value)})}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              Deduções (Lucro Presumido/Real)
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Aluguel de Máquinas/Equip.</label>
                <input 
                  type="number" 
                  value={businessData.machineRental}
                  onChange={(e) => setBusinessData({...businessData, machineRental: Number(e.target.value)})}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Gastos com Consumíveis</label>
                <input 
                  type="number" 
                  value={businessData.consumables}
                  onChange={(e) => setBusinessData({...businessData, consumables: Number(e.target.value)})}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        {simulationResults.map((result, i) => (
          <Card key={i} className={cn(
            "p-6 border-l-4",
            i === 1 ? "border-l-emerald-500 bg-emerald-50/30" : "border-l-slate-300"
          )}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{result.regime}</h4>
                <p className="text-sm text-slate-600">Alíquota Efetiva: <span className="font-bold text-slate-900">{result.effectiveRate.toFixed(2)}%</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Imposto Estimado</p>
                <p className="text-2xl font-black text-slate-900">R$ {result.totalTax.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Detalhamento</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-slate-500">PIS:</span>
                  <span className="text-right font-medium">R$ {result.breakdown.pis.toLocaleString()}</span>
                  <span className="text-slate-500">COFINS:</span>
                  <span className="text-right font-medium">R$ {result.breakdown.cofins.toLocaleString()}</span>
                  <span className="text-slate-500">IRPJ:</span>
                  <span className="text-right font-medium">R$ {result.breakdown.irpj.toLocaleString()}</span>
                  <span className="text-slate-500">CSLL:</span>
                  <span className="text-right font-medium">R$ {result.breakdown.csll.toLocaleString()}</span>
                  <span className="text-slate-500">ISS:</span>
                  <span className="text-right font-medium">R$ {result.breakdown.iss.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Vantagens</p>
                <ul className="space-y-1">
                  {result.details.map((detail, j) => (
                    <li key={j} className="text-xs text-slate-600 flex items-center gap-2">
                      <div className="w-1 h-1 bg-slate-400 rounded-full" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {i === 1 && (
                <div className="bg-emerald-100/50 p-3 rounded-xl border border-emerald-200 text-emerald-800 text-xs">
                  <p className="font-bold mb-1">💡 Estratégia Legal:</p>
                  No Lucro Presumido, gastos indispensáveis como aluguel de máquinas e consumíveis podem ser deduzidos da base de cálculo do ISS em alguns municípios ou otimizados via planejamento tributário.
                </div>
              )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEducation = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Educação Financeira</h2>
        <p className="text-slate-600">Aprenda conceitos complexos de forma simples com nossa IA.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Simples Nacional', 'Lucro Presumido', 'Fluxo de Caixa', 'Deduções Fiscais'].map((topic) => (
          <button 
            key={topic}
            onClick={() => handleGetAdvice(topic)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center group"
          >
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700">{topic}</span>
          </button>
        ))}
      </div>

      {loadingAdvice ? (
        <Card className="p-12 text-center" ref={adviceRef}>
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Consultando especialista IA...</p>
        </Card>
      ) : advice ? (
        <Card className="p-8 prose prose-slate max-w-none" ref={adviceRef}>
          <div className="markdown-body">
            <Markdown>{advice}</Markdown>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center bg-slate-50 border-dashed">
          <p className="text-slate-500">Selecione um tópico acima para começar sua jornada de aprendizado.</p>
        </Card>
      )}
    </div>
  );

  const renderCashflow = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Fluxo de Caixa</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePDF}>
            <TrendingUp className="w-4 h-4" />
            Gerar PDF
          </Button>
          <Button onClick={() => setIsTransactionModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-bottom border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">{t.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{t.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-bold",
                        t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h4 className="font-bold text-slate-900 mb-4">Distribuição de Gastos</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Equipamento', value: 2000 },
                      { name: 'Insumos', value: 800 },
                      { name: 'Outros', value: 1200 },
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Equipamento</span>
                <span className="font-bold">50%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Insumos</span>
                <span className="font-bold">20%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-indigo-600 text-white">
            <h4 className="font-bold mb-2">Dica de Fluxo</h4>
            <p className="text-sm text-indigo-100">
              Você tem R$ 2.800 em gastos com consumíveis este mês. Sabia que no Lucro Real isso poderia reduzir seu imposto em até R$ 952?
            </p>
            <Button 
              variant="ghost" 
              className="mt-4 text-white hover:bg-indigo-500 w-full border border-indigo-400"
              onClick={() => setActiveTab('simulator')}
            >
              Ver Detalhes
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );

  const [generatingIcon, setGeneratingIcon] = useState(false);
  const [generatedIconUrl, setGeneratedIconUrl] = useState<string | null>(null);

  const handleGenerateHighResIcon = async () => {
    setGeneratingIcon(true);
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: "A professional and modern app icon for a financial and tax planning app called 'TaxFlow'. The icon should feature a clean, minimalist design with a stylized growth chart or a simple geometric representation of a calculator/ledger. Use a professional color palette of deep indigo (#4F46E5) and vibrant emerald (#10B981). The design should be flat, centered on a solid background, with no text. High quality, 1024x1024 resolution, centered, app icon style.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedIconUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (e) {
      console.error("Error generating icon", e);
      alert("Erro ao gerar ícone em alta resolução.");
    }
    setGeneratingIcon(false);
  };

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card className="p-8">
        <h3 className="text-xl font-bold mb-6">Identidade Visual</h3>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="w-48 h-48 bg-white rounded-3xl shadow-2xl border border-slate-100 flex items-center justify-center overflow-hidden p-4">
            <img src="/icon.svg" alt="App Icon" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h4 className="font-bold text-slate-900">Ícone do Aplicativo (SVG)</h4>
              <p className="text-sm text-slate-500">Este é o ícone vetorial oficial. Ideal para uso em qualquer tamanho sem perder qualidade.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <a 
                href="/icon.svg" 
                download="taxflow-icon.svg"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                Download SVG
              </a>
              <Button variant="outline" onClick={handleGenerateHighResIcon} disabled={generatingIcon}>
                {generatingIcon ? 'Gerando...' : 'Gerar Versão 1024px (PNG)'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {generatedIconUrl && (
        <Card className="p-8 border-indigo-200 bg-indigo-50/30">
          <h3 className="text-xl font-bold mb-4 text-indigo-900">Versão em Alta Resolução (1024x1024)</h3>
          <p className="text-sm text-indigo-700 mb-6">Aqui está uma versão gerada por IA em alta definição para você tirar seu print ou salvar.</p>
          <div className="flex flex-col items-center gap-6">
            <div className="w-64 h-64 rounded-[48px] shadow-2xl overflow-hidden border-4 border-white">
              <img src={generatedIconUrl} alt="Generated High Res Icon" className="w-full h-full object-cover" />
            </div>
            <a 
              href={generatedIconUrl} 
              download="taxflow-high-res.png"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Baixar PNG em Alta Resolução
            </a>
          </div>
        </Card>
      )}

      <Card className="p-8">
        <h3 className="text-xl font-bold mb-4">Informações do Sistema</h3>
        <div className="space-y-4">
          <div className="flex justify-between py-3 border-b border-slate-100">
            <span className="text-slate-500">Nome do App</span>
            <span className="font-bold">TaxFlow</span>
          </div>
          <div className="flex justify-between py-3 border-b border-slate-100">
            <span className="text-slate-500">Versão</span>
            <span className="font-bold">1.0.0 (Beta)</span>
          </div>
          <div className="flex justify-between py-3 border-b border-slate-100">
            <span className="text-slate-500">Links Legais</span>
            <div className="flex gap-3">
              <a href="/privacy.html" target="_blank" className="text-indigo-600 hover:underline text-sm font-medium">Privacidade</a>
              <a href="/delete-account.html" target="_blank" className="text-indigo-600 hover:underline text-sm font-medium">Excluir Dados</a>
            </div>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-slate-500">Ambiente</span>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold uppercase">Produção</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-center">
        <button 
          onClick={() => supabase.auth.signOut()}
          className="text-rose-600 font-bold hover:underline"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 pb-20 md:pb-0">
      {/* Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">TaxFlow</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'simulator', icon: Calculator, label: 'Simulador Fiscal' },
            { id: 'cashflow', icon: Wallet, label: 'Fluxo de Caixa' },
            { id: 'education', icon: BookOpen, label: 'Educação' },
            { id: 'alerts', icon: Bell, label: 'Alertas' },
            { id: 'settings', icon: Info, label: 'Configurações' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                activeTab === item.id 
                  ? "bg-indigo-50 text-indigo-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <Card className="p-4 bg-slate-900 text-white border-none">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Plano Pro</p>
            <p className="text-sm font-medium mb-3">Acesso total a consultoria IA ilimitada.</p>
            <button className="w-full py-2 bg-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors">
              Upgrade
            </button>
          </Card>
        </div>
      </aside>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'simulator', icon: Calculator },
          { id: 'cashflow', icon: Wallet },
          { id: 'education', icon: BookOpen },
          { id: 'alerts', icon: Bell },
          { id: 'settings', icon: Info },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "p-2 rounded-xl transition-all",
              activeTab === item.id ? "text-indigo-600 bg-indigo-50" : "text-slate-400"
            )}
          >
            <item.icon className="w-6 h-6" />
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Bem-vindo, Empreendedor'}
              {activeTab === 'simulator' && 'Simulador de Economia Tributária'}
              {activeTab === 'education' && 'Central de Conhecimento'}
              {activeTab === 'cashflow' && 'Gestão de Fluxo de Caixa'}
              {activeTab === 'alerts' && 'Alertas e Oportunidades'}
              {activeTab === 'settings' && 'Configurações da Marca'}
            </h2>
            <p className="text-slate-500 text-sm">Hoje é {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
              />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 relative">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => supabase.auth.signOut()}>
                <img src={`https://picsum.photos/seed/${session?.user?.email}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'simulator' && renderSimulator()}
            {activeTab === 'education' && renderEducation()}
            {activeTab === 'cashflow' && renderCashflow()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'alerts' && (
              <div className="max-w-3xl mx-auto">
                <h3 className="text-xl font-bold mb-6">Alertas do Sistema</h3>
                <div className="space-y-4">
                  {alerts.map((alert, i) => (
                    <Card key={i} className="p-6 flex gap-6 items-start">
                      <div className={cn(
                        "p-3 rounded-2xl",
                        alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                      )}>
                        {alert.type === 'warning' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-bold text-slate-900">{alert.title}</h4>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agora</span>
                        </div>
                        <p className="text-slate-600 mt-1">{alert.description}</p>
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" className="text-xs py-1.5">Ignorar</Button>
                          <Button className="text-xs py-1.5">Resolver Agora</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {isTransactionModalOpen && renderTransactionModal()}
      </main>
    </div>
  );
}
