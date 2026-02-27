import { BusinessData, TaxSimulationResult, TaxBreakdown } from '../types';

export const simulateTaxes = (data: BusinessData): TaxSimulationResult[] => {
  const results: TaxSimulationResult[] = [];

  // 1. Simples Nacional (Annex III - Services)
  // Simplified progressive rate calculation
  const annualRevenue = data.monthlyRevenue * 12;
  let simplesRate = 0.06;
  let deduction = 0;

  if (annualRevenue <= 180000) { simplesRate = 0.06; deduction = 0; }
  else if (annualRevenue <= 360000) { simplesRate = 0.112; deduction = 9360; }
  else if (annualRevenue <= 720000) { simplesRate = 0.135; deduction = 17640; }
  else if (annualRevenue <= 1800000) { simplesRate = 0.16; deduction = 35640; }
  else if (annualRevenue <= 3600000) { simplesRate = 0.21; deduction = 125640; }
  else { simplesRate = 0.33; deduction = 648000; }

  const effectiveSimplesRate = (annualRevenue * simplesRate - deduction) / annualRevenue;
  const simplesTax = data.monthlyRevenue * effectiveSimplesRate;

  results.push({
    regime: 'Simples Nacional',
    totalTax: simplesTax,
    effectiveRate: effectiveSimplesRate * 100,
    deductions: 0,
    details: [
      'Imposto unificado em guia única (DAS)',
      'Inclui IRPJ, CSLL, PIS, COFINS, ISS e CPP',
      'Cálculo baseado no faturamento bruto anual'
    ],
    breakdown: {
      pis: simplesTax * 0.12, // Approximate distribution
      cofins: simplesTax * 0.18,
      irpj: simplesTax * 0.15,
      csll: simplesTax * 0.15,
      iss: simplesTax * 0.20,
      total: simplesTax
    }
  });

  // 2. Lucro Presumido
  const presumptionRate = 0.32; // Standard for services
  const presumedProfit = data.monthlyRevenue * presumptionRate;
  
  // Federal Taxes on Revenue
  const pis = data.monthlyRevenue * 0.0065;
  const cofins = data.monthlyRevenue * 0.03;
  
  // Federal Taxes on Profit
  const irpj = presumedProfit * 0.15 + (presumedProfit > 20000 ? (presumedProfit - 20000) * 0.10 : 0);
  const csll = presumedProfit * 0.09;
  
  // Municipal Tax (ISS)
  // Some cities allow deduction of materials (consumables) from ISS base
  const issBase = Math.max(0, data.monthlyRevenue - data.consumables);
  const iss = issBase * (data.issRate / 100);
  
  const lucroPresumidoTotal = pis + cofins + irpj + csll + iss;

  results.push({
    regime: 'Lucro Presumido',
    totalTax: lucroPresumidoTotal,
    effectiveRate: (lucroPresumidoTotal / data.monthlyRevenue) * 100,
    deductions: data.consumables,
    details: [
      'PIS (0.65%) e COFINS (3.00%) cumulativos',
      'IRPJ e CSLL sobre lucro presumido (32%)',
      'ISS calculado sobre faturamento (com deduções se aplicável)'
    ],
    breakdown: { pis, cofins, irpj, csll, iss, total: lucroPresumidoTotal }
  });

  // 3. Lucro Real
  // Revenue - All Expenses
  const totalExpenses = data.monthlyExpenses + data.employeeCosts + data.machineRental + data.consumables;
  const realProfit = data.monthlyRevenue - totalExpenses;
  
  // Non-cumulative PIS/COFINS (9.25% total)
  // Credits on some expenses (simplified)
  const pisCofinsRate = 0.0925;
  const pisCofinsGross = data.monthlyRevenue * pisCofinsRate;
  const pisCofinsCredits = (data.machineRental + data.consumables) * pisCofinsRate;
  const netPisCofins = Math.max(0, pisCofinsGross - pisCofinsCredits);
  
  const lrIrpj = Math.max(0, realProfit * 0.15 + (realProfit > 20000 ? (realProfit - 20000) * 0.10 : 0));
  const lrCsll = Math.max(0, realProfit * 0.09);
  const lrIss = data.monthlyRevenue * (data.issRate / 100);
  
  const lucroRealTotal = netPisCofins + lrIrpj + lrCsll + lrIss;

  results.push({
    regime: 'Lucro Real',
    totalTax: lucroRealTotal,
    effectiveRate: (lucroRealTotal / data.monthlyRevenue) * 100,
    deductions: totalExpenses,
    details: [
      'PIS e COFINS não-cumulativos com créditos',
      'IRPJ e CSLL sobre lucro contábil real',
      'Ideal para empresas com margens baixas ou altos custos dedutíveis'
    ],
    breakdown: { 
      pis: netPisCofins * 0.17, // Approximate split
      cofins: netPisCofins * 0.83,
      irpj: lrIrpj, 
      csll: lrCsll, 
      iss: lrIss, 
      total: lucroRealTotal 
    }
  });

  return results;
};
