
import React, { useRef, useEffect } from 'react';

interface LiveConversationProps {
    npcName: string;
    history: { speaker: 'user' | 'model', text: string }[];
    currentUserInput: string;
    currentModelOutput: string;
    status: 'idle' | 'connecting' | 'active' | 'error';
    onClose: () => void;
}

const LiveConversation: React.FC<LiveConversationProps> = ({ npcName, history, currentUserInput, currentModelOutput, status, onClose }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // A small delay to allow the DOM to update before scrolling
        setTimeout(scrollToBottom, 100);
    }, [history, currentUserInput, currentModelOutput]);

    const renderStatus = () => {
        switch (status) {
            case 'connecting':
                return <div className="status-indicator connecting">Conectando...</div>;
            case 'active':
                return <div className="status-indicator active">● En vivo</div>;
            case 'error':
                 return <div className="status-indicator error">Error de conexión</div>;
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box wide chat-box live-chat-box">
                <div className="live-chat-header">
                    <h3>Conversación con {npcName}</h3>
                    {renderStatus()}
                </div>
                <div className="chat-messages">
                    {history.map((t, index) => (
                        <div key={index} className={`message ${t.speaker === 'user' ? 'user-message' : 'gemini-message'}`}>
                             <p>
                                <strong>{t.speaker === 'user' ? 'Tú' : npcName}:</strong> {t.text}
                            </p>
                        </div>
                    ))}
                    {currentUserInput && (
                        <div className="message user-message">
                            <p className="partial-transcription">
                                <strong>Tú:</strong> {currentUserInput}
                            </p>
                        </div>
                    )}
                     {currentModelOutput && (
                        <div className="message gemini-message">
                            <p className="partial-transcription">
                                <strong>{npcName}:</strong> {currentModelOutput}
                            </p>
                        </div>
                    )}
                     <div ref={messagesEndRef} />
                </div>
                <button onClick={onClose} style={{ marginTop: '20px' }}>Finalizar Conversación</button>
            </div>
        </div>
    );
};

export default LiveConversation;
