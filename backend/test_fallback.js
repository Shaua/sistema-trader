require('dotenv').config();
const ai = require('./src/services/ai.service');

async function runTest() {
  ai.init();

  // Mock Gemini to throw 429
  ai.ai.models.generateContent = async () => {
    const err = new Error('Fake 429 error from Gemini');
    err.status = 429;
    throw err;
  };

  try {
    const result = await ai.processChat('Me retorne um JSON simples: { "reply": "funcionou perfeitamente" }', 'Você é um bot de teste');
    console.log('--- TESTE CONCLUÍDO COM SUCESSO ---');
    console.log('Resultado do Fallback (Groq):', result);
  } catch (err) {
    console.error('Falhou o fallback!', err);
  }
}

runTest();
