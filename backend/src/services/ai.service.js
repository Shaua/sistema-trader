const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

class AIService {
  constructor() {
    this.ai = null;
    this.isInitialized = false;
  }

  init() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
      this.isInitialized = true;
      console.log('[AI Service] Gemini API inicializada com sucesso.');
    } else {
      console.warn('[AI Service] GEMINI_API_KEY não definida. Funcionalidades do Advisor desabilitadas.');
    }
    
    if (process.env.GROK_API_KEY) {
      console.log('[AI Service] Grok configurado como fallback.');
    }
  }

  async processChat(message, systemContext) {
    if (!this.isInitialized) throw new Error("AI não configurada.");
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
          systemInstruction: systemContext,
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      });
      
      return JSON.parse(response.text);
    } catch (error) {
      console.error('[AI Service] Erro no processChat (Gemini):', error.message || error);
      
      const errMsg = error.message || '';
      if (error.status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        
        // Tenta fallback para o Grok se a chave estiver configurada
        if (process.env.GROK_API_KEY) {
          console.log('[AI Service] Limite do Gemini atingido. Iniciando fallback para o Grok...');
          try {
            return await this.processGrokFallback(message, systemContext);
          } catch (grokError) {
            console.error('[AI Service] Erro no fallback do Grok:', grokError.response?.data || grokError.message);
            // Se falhar também, segue para jogar o erro de quota
          }
        }
        
        const friendlyError = new Error('Limite gratuito da IA atingido (Quota Exceeded). Atualize sua chave de API do Gemini ou aguarde.');
        friendlyError.isQuotaError = true;
        throw friendlyError;
      }
      
      throw error;
    }
  }

  async processGrokFallback(message, systemContext) {
    // Utiliza API da xAI por padrão, mas permite sobrescrever para Groq se desejado via ENV
    const endpoint = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
    const model = process.env.GROK_MODEL || 'grok-beta';
    
    // Forçamos o Grok a responder apenas o JSON para não quebrar o parse
    const enrichedContext = systemContext + '\n\nIMPORTANTE: Sua resposta DEVE SER EXCLUSIVAMENTE um objeto JSON válido. Não adicione nenhuma formatação markdown (como ```json) ou texto extra antes/depois do JSON.';
    
    const response = await axios.post(
      endpoint,
      {
        messages: [
          { role: 'system', content: enrichedContext },
          { role: 'user', content: message }
        ],
        model: model,
        temperature: 0.2,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROK_API_KEY.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let responseText = response.data.choices[0].message.content;
    
    // Limpeza de segurança caso a IA retorne blocos markdown
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return JSON.parse(responseText);
  }
}

module.exports = new AIService();
