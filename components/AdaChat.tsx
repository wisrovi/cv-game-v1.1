import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PlayerState, Mission } from '../types';
import { generateAdaChatResponse } from '../services/geminiService';

interface AdaChatProps {
    playerState: PlayerState;
    missions: Mission[];
    onClose: () => void;
}

const AdaChat: React.FC<AdaChatProps> = ({ playerState, missions, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        setMessages([{
            sender: 'gemini',
            text: `¡Hola! Soy Ada, tu guía en este mundo. Puedes preguntarme sobre el juego, tu progreso o sobre el desarrollador detrás de este CV interactivo. ¿En qué puedo ayudarte?`
        }]);
    }, []);

    const handleSendMessage = async () => {
        if (inputValue.trim() === '' || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: inputValue };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const geminiResponseText = await generateAdaChatResponse(newMessages, playerState, missions, userMessage.text);
            setMessages([...newMessages, { sender: 'gemini', text: geminiResponseText }]);
        } catch (error) {
            setMessages([...newMessages, { sender: 'gemini', text: 'Hubo un error al procesar tu pregunta.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box wide chat-box" onClick={(e) => e.stopPropagation()}>
                <h3>Chat con Ada, la Guía</h3>
                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}-message`}>
                            <p>{msg.text}</p>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message gemini-message">
                           <div className="typing-indicator">
                               <span></span><span></span><span></span>
                           </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="chat-input-area">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Pregúntale algo a Ada..."
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading}>
                        Enviar
                    </button>
                </div>
                <button onClick={onClose} style={{marginTop: '20px'}}>Cerrar Chat</button>
            </div>
        </div>
    );
};

export default AdaChat;
