import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minimize2 } from 'lucide-react';
import api from '../../lib/api';
import { useStore } from '../../store/useStore';
import './AdvisorWidget.css';

export default function AdvisorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Olá! Sou seu Advisor de Inteligência Artificial. Como posso ajudar com seu gerenciamento e robô hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { bankBalance } = useStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Puxar configurações atuais do localStorage ou store se existirem
      const configStr = localStorage.getItem('bot_config_v3');
      let botState = {};
      if (configStr) {
        botState.config = JSON.parse(configStr);
      }

      const response = await api.post('/ai/chat', {
        message: userText,
        botState,
        balance: bankBalance
      });

      const { reply, suggestedConfigChanges } = response.data;
      
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      if (suggestedConfigChanges) {
        // Se a IA sugerir mudanças, podemos aplicá-las (precisaria de aprovação do usuário, mas vamos logar por enquanto)
        console.log('IA sugeriu mudanças na config:', suggestedConfigChanges);
        // Exemplo: Mostrar um botão para o usuário aplicar no chat
        setMessages(prev => [...prev, { 
          role: 'system', 
          text: 'A IA sugeriu alterações na sua configuração. Para aplicá-las, acesse a página de Robôs.',
          changes: suggestedConfigChanges
        }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, tive um problema de conexão. Verifique minha chave de API.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        className="advisor-floating-btn"
        onClick={() => setIsOpen(true)}
        title="Falar com o Advisor"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className={`advisor-widget ${isExpanded ? 'expanded' : ''}`}>
      <div className="advisor-header">
        <div className="advisor-title">
          <Bot size={18} />
          <span>Advisor IA</span>
        </div>
        <div className="advisor-actions">
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="advisor-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`advisor-message-row ${msg.role}`}>
            <div className="advisor-message-bubble">
              {msg.text}
              {msg.changes && (
                <pre className="advisor-changes">
                  {JSON.stringify(msg.changes, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="advisor-message-row assistant">
            <div className="advisor-message-bubble loading">
              Digitando...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="advisor-input" onSubmit={handleSend}>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Peça dicas de gerenciamento..."
          disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim() || isLoading}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
