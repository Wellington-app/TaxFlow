export interface Transaction {
  id: string;
  user_id?: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

export interface TaxBreakdown {
  pis: number;
  cofins: number;
  irpj: number;
  csll: number;
  iss: number;
  total: number;
}

export interface TaxSimulationResult {
  regime: string;
  totalTax: number;
  effectiveRate: number;
  deductions: number;
  details: string[];
  breakdown: TaxBreakdown;
}

export type TaxRegime = 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';

export interface BusinessData {
  monthlyRevenue: number;
  monthlyExpenses: number;
  employeeCosts: number;
  machineRental: number;
  consumables: number;
  activityType: 'service' | 'commerce';
  issRate: number;
}
