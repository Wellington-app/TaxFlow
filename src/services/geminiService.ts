import { Transaction } from '../types';

export const getFinancialAdvice = async (query: string) => {
  try {
    const response = await fetch("/api/gemini/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "API Error");
    }
    
    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("Gemini API Error (Advice):", error);
    if (error.message?.includes("429")) {
      return "⚠️ Limite de cota da IA atingido. Por favor, tente novamente em alguns minutos.";
    }
    return "Ocorreu um erro ao consultar a IA. Por favor, tente novamente mais tarde.";
  }
};

export const getTaxAlerts = async (transactions: Transaction[], taxRegime: string) => {
  try {
    const response = await fetch("/api/gemini/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions, taxRegime }),
    });
    
    if (!response.ok) return [];
    
    return await response.json();
  } catch (error: any) {
    console.error("Gemini API Error (Alerts):", error);
    return [];
  }
};
