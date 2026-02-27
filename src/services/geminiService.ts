import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getFinancialAdvice = async (query: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: {
      systemInstruction: "Você é um consultor financeiro e tributário especializado em pequenos negócios no Brasil. Forneça explicações simples, educativas e acionáveis. Use markdown para formatar a resposta.",
    },
  });
  return response.text;
};

export const getTaxAlerts = async (transactions: Transaction[], taxRegime: string) => {
  const prompt = `Com base nessas transações: ${JSON.stringify(transactions)} e no regime tributário ${taxRegime}, identifique oportunidades de dedução fiscal (especialmente para Lucro Presumido como aluguel de máquinas e consumíveis) e alertas de vencimento. Retorne um JSON com uma lista de alertas, cada um com 'title', 'description' e 'type' (warning, info, success).`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });
  
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};
