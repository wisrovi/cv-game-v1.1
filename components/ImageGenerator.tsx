import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';

interface ImageGeneratorProps {
    onClose: () => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setGeneratedImage(null);
        setError(null);

        try {
            const imageBase64 = await generateImage(prompt);
            setGeneratedImage(imageBase64);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box wide image-generator-box">
                <h3>Estudio de Vincent, el Visionario</h3>
                <div className="image-generator-content">
                    <div className="image-display-area">
                        {isLoading ? (
                            <div className="loading-spinner"></div>
                        ) : error ? (
                            <p className="image-generator-error">{error}</p>
                        ) : generatedImage ? (
                            <img src={`data:image/jpeg;base64,${generatedImage}`} alt={prompt} />
                        ) : (
                            <p>Describe la imagen que quieres crear. ¿Qué visión quieres que traiga a la realidad? Un "holograma de neón de un gato conduciendo a toda velocidad", quizás...</p>
                        )}
                    </div>
                    <div className="chat-input-area">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                            placeholder="Describe tu visión..."
                            disabled={isLoading}
                        />
                        <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}>
                            {isLoading ? 'Creando...' : 'Generar'}
                        </button>
                    </div>
                </div>
                <button onClick={onClose} style={{ marginTop: '20px' }}>Cerrar Estudio</button>
            </div>
        </div>
    );
};

export default ImageGenerator;
