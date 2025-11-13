import React, { useState } from 'react';

interface PlayerNamePromptProps {
    onNameSubmit: (name: string) => void;
}

const PlayerNamePrompt: React.FC<PlayerNamePromptProps> = ({ onNameSubmit }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onNameSubmit(name.trim());
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ textAlign: 'center' }}>
                <h3>Bienvenido al CV Interactivo</h3>
                <p>Por favor, introduce tu nombre para guardar tu progreso.</p>
                <form onSubmit={handleSubmit}>
                    <div className="chat-input-area">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tu nombre..."
                            autoFocus
                        />
                        <button type="submit" disabled={!name.trim()}>
                            Empezar Aventura
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlayerNamePrompt;
