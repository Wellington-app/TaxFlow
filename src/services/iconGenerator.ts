import { GoogleGenAI } from "@google/genai";

async function generateIcon() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: "A professional and modern app icon for a financial and tax planning app called 'TaxFlow'. The icon should feature a clean, minimalist design with a stylized growth chart or a simple geometric representation of a calculator/ledger. Use a professional color palette of deep indigo (#4F46E5) and vibrant emerald (#10B981). The design should be flat, centered on a solid background, with no text. High quality, 1024x1024 resolution.",
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
      return part.inlineData.data;
    }
  }
  return null;
}

// This script is meant to be run in the browser context or via a temporary tool call if possible.
// Since I can't run a separate node script easily that saves to disk without shell_exec (which is restricted),
// I will instead implement this logic directly in a component or a temporary page to let the user download it,
// OR I can try to use a tool if I had one for image saving.
// Wait, I can't save the image to the filesystem directly from the model response in a single step without a tool.
// I will generate the image and then use create_file to save the base64 data if I can get it.
