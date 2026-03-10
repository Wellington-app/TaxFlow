import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Tenta encontrar a chave de API em diferentes variações de nome
  const apiKey = process.env.TaxFloww || process.env.TaxFlow || process.env.Taxflow || process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });

  // Rota para conselhos financeiros (IA)
  app.post("/api/gemini/advice", async (req, res) => {
    const { query } = req.body;
    try {
      if (!apiKey) {
        return res.status(500).json({ error: "Chave de API não configurada." });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: query }] }],
        config: {
          systemInstruction: "Você é um consultor financeiro e tributário especializado em pequenos negócios no Brasil. Forneça explicações simples, educativas e acionáveis. Use markdown para formatar a resposta.",
        },
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(error.status || 500).json({ error: error.message || "Erro na IA" });
    }
  });

  // Rota para alertas fiscais
  app.post("/api/gemini/alerts", async (req, res) => {
    const { transactions, taxRegime } = req.body;
    const prompt = `Analise estas transações: ${JSON.stringify(transactions)} para o regime ${taxRegime}. Identifique deduções e alertas. Retorne JSON com 'title', 'description', 'type'.`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" },
      });
      res.json(JSON.parse(response.text || "[]"));
    } catch (error: any) {
      res.status(500).json({ error: "Erro nos alertas" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile("dist/index.html", { root: "." }));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

startServer();
