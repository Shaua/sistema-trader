const { GoogleGenAI } = require('@google/genai');

class AIService {
  constructor() {
    this.ai = null;
    this.isInitialized = false;
  }

  init() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.isInitialized = true;
      console.log('[AI Service] Gemini API inicializada com sucesso.');
    } else {
      console.warn('[AI Service] GEMINI_API_KEY não definida. Funcionalidades do Advisor desabilitadas.');
    }
  }

  async processChat(message, systemContext) {
    if (!this.isInitialized) throw new Error("AI não configurada.");
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: message,
        config: {
          systemInstruction: systemContext,
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      });
      
      return JSON.parse(response.text);
    } catch (error) {
      console.error('[AI Service] Erro no processChat:', error);
      throw error;
    }
  }
}

module.exports = new AIService();
