import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getFinancialAdvice = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction: "Você é um consultor financeiro e tributário especializado em pequenos negócios no Brasil. Forneça explicações simples, educativas e acionáveis. Use markdown para formatar a resposta.",
      },
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429") || error.status === 429) {
      return "⚠️ Limite de cota da IA atingido. Por favor, tente novamente em alguns minutos ou verifique seu plano no Google AI Studio (ai.google.dev).";
    }
    return "Ocorreu um erro ao consultar a IA. Por favor, tente novamente mais tarde.";
  }
};

export const getTaxAlerts = async (transactions: Transaction[], taxRegime: string) => {
  const prompt = `Com base nessas transações: ${JSON.stringify(transactions)} e no regime tributário ${taxRegime}, identifique oportunidades de dedução fiscal (especialmente para Lucro Presumido como aluguel de máquinas e consumíveis) e alertas de vencimento. Retorne um JSON com uma lista de alertas, cada um com 'title', 'description' e 'type' (warning, info, success).`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    console.error("Gemini API Error (Alerts):", error);
    return [];
  }
};
