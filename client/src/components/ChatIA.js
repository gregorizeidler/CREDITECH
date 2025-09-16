import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatIA.css';

const ChatIA = ({ onClose }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'assistant',
            content: '👋 Olá! Sou seu assistente financeiro especializado em crédito. Como posso ajudar você hoje?',
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState('session_' + Date.now());
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll automático para última mensagem
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focar no input quando abrir
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/chat', {
                message: userMessage.content,
                sessionId: sessionId
            });

            if (response.data.success) {
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: response.data.data.response,
                    timestamp: new Date(),
                    sessionInfo: response.data.data
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error(response.data.error || 'Erro na resposta');
            }

        } catch (error) {
            console.error('Erro no chat:', error);
            
            const errorMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: '😅 Ops! Tive um probleminha. Mas posso responder algumas coisas básicas: consulte sempre várias opções de crédito antes de decidir, compare taxas e evite o rotativo do cartão!',
                timestamp: new Date(),
                isError: true
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = async () => {
        try {
            await axios.delete(`/api/chat/${sessionId}`);
            setMessages([
                {
                    id: Date.now(),
                    type: 'assistant',
                    content: '🔄 Conversa reiniciada! Como posso ajudar você agora?',
                    timestamp: new Date()
                }
            ]);
        } catch (error) {
            console.error('Erro ao limpar chat:', error);
        }
    };

    const quickQuestions = [
        "Qual a melhor modalidade de crédito para mim?",
        "Como funciona o score de crédito?",
        "Devo negociar a taxa com o banco?",
        "O que é comprometimento de renda?",
        "Como sair do rotativo do cartão?"
    ];

    const askQuickQuestion = (question) => {
        setInputMessage(question);
        inputRef.current?.focus();
    };

    return (
        <div className="chat-overlay">
            <div className="chat-container">
                {/* Header do Chat */}
                <div className="chat-header">
                    <div className="chat-title">
                        <span className="chat-icon">🤖</span>
                        <div>
                            <h3>Assistente Financeiro IA</h3>
                            <span className="chat-subtitle">Especializado em crédito</span>
                        </div>
                    </div>
                    <div className="chat-actions">
                        <button 
                            className="btn-icon" 
                            onClick={clearChat}
                            title="Limpar conversa"
                        >
                            🗑️
                        </button>
                        <button 
                            className="btn-icon" 
                            onClick={onClose}
                            title="Fechar chat"
                        >
                            ✖️
                        </button>
                    </div>
                </div>

                {/* Mensagens */}
                <div className="chat-messages">
                    {messages.map((message) => (
                        <div 
                            key={message.id} 
                            className={`message ${message.type} ${message.isError ? 'error' : ''}`}
                        >
                            <div className="message-content">
                                {message.content}
                            </div>
                            <div className="message-time">
                                {message.timestamp.toLocaleTimeString('pt-BR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}
                                {message.sessionInfo && (
                                    <span className="session-info">
                                        · {message.sessionInfo.messageCount} msgs
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message assistant loading">
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                Pensando...
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Perguntas Rápidas */}
                {messages.length <= 1 && (
                    <div className="quick-questions">
                        <div className="quick-questions-title">💬 Perguntas frequentes:</div>
                        <div className="quick-questions-grid">
                            {quickQuestions.map((question, index) => (
                                <button
                                    key={index}
                                    className="quick-question-btn"
                                    onClick={() => askQuickQuestion(question)}
                                >
                                    {question}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="chat-input-container">
                    <div className="chat-input">
                        <textarea
                            ref={inputRef}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Digite sua pergunta sobre crédito..."
                            rows={1}
                            disabled={isLoading}
                        />
                        <button 
                            className={`send-btn ${inputMessage.trim() ? 'active' : ''}`}
                            onClick={sendMessage}
                            disabled={!inputMessage.trim() || isLoading}
                        >
                            {isLoading ? '⏳' : '📤'}
                        </button>
                    </div>
                    <div className="chat-footer">
                        <span className="chat-disclaimer">
                            ℹ️ Baseado em dados oficiais do Banco Central • Confirme condições com sua instituição
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatIA;
