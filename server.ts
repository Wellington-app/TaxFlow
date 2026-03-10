import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.TaxFloww || process.env.TaxFlow || process.env.Taxflow || process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });

  // API routes
  app.post("/api/gemini/advice", async (req, res) => {
    const { query } = req.body;
    console.log("Recebendo solicitação de conselho para:", query);
    try {
      if (!apiKey) {
        console.error("Erro: Chave de API não configurada no servidor.");
        return res.status(500).json({ error: "Chave de API não configurada. Verifique as variáveis de ambiente." });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: query }] }],
        config: {
          systemInstruction: "Você é um consultor financeiro e tributário especializado em pequenos negócios no Brasil. Forneça explicações simples, educativas e acionáveis. Use markdown para formatar a resposta.",
        },
      });
      console.log("Resposta da IA recebida com sucesso.");
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error (Advice):", error);
      res.status(error.status || 500).json({ error: error.message || "Erro interno no servidor de IA" });
    }
  });

  app.post("/api/gemini/alerts", async (req, res) => {
    const { transactions, taxRegime } = req.body;
    const prompt = `Com base nessas transações: ${JSON.stringify(transactions)} e no regime tributário ${taxRegime}, identifique oportunidades de dedução fiscal (especialmente para Lucro Presumido como aluguel de máquinas e consumíveis) e alertas de vencimento. Retorne um JSON com uma lista de alertas, cada um com 'title', 'description' e 'type' (warning, info, success).`;
    
    try {
      if (!apiKey) {
        return res.status(500).json({ error: "Chave de API não configurada." });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      });
      res.json(JSON.parse(response.text || "[]"));
    } catch (error: any) {
      console.error("Gemini API Error (Alerts):", error);
      res.status(error.status || 500).json({ error: error.message || "Erro interno no servidor de IA" });
    }
  });

  app.post("/api/gemini/generate-icon", async (req, res) => {
    const { prompt } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: prompt,
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

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return res.json({ data: part.inlineData.data });
        }
      }
      res.status(404).json({ error: "No image generated" });
    } catch (error: any) {
      console.error("Gemini API Error (Icon):", error);
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
