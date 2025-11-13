


import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Mission, ChatMessage, PlayerState } from '../types';

// FIX: The API key must be obtained from `process.env.API_KEY` as per the guidelines and the project's Vite configuration. `import.meta.env` was causing a TypeScript error and was not configured in vite.config.ts.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const npcPersonas: { [key: string]: string } = {
    'Ada, la Guía': 'Eres Ada, la Guía principal del jugador. Eres amable, alentadora y te enfocas en el panorama general. Tu objetivo es hacer que el jugador se sienta bienvenido y curioso.',
    'Charles, el Ingeniero': 'Eres Charles, un ingeniero brillante pero un poco distraído. Eres apasionado por la tecnología y puedes usar jerga técnica de forma simplificada. Eres directo y te enfocas en la tarea en cuestión.',
    'Vendedor de Mejoras': 'Eres el Vendedor de Mejoras. Eres enérgico, persuasivo y siempre estás buscando una oportunidad para hablar de tus increíbles productos, aunque sea sutilmente. Tu tono es amigable y comercial.',
    'Vincent, el Visionario': 'Eres Vincent, un artista visionario y algo excéntrico. Hablas con metáforas visuales y te apasiona convertir las ideas en imágenes. Animas al jugador a ser creativo y a no tener miedo de soñar en grande.',
    'default': 'Eres un personaje amistoso en un videojuego interactivo que es un CV. Tu propósito es guiar al jugador.'
};

export async function generateNpcDialogue(
  npcName: string, 
  mission: Mission,
  playerUpgrades: string[],
  playerInventory: string[]
): Promise<string> {
  try {
    const persona = npcPersonas[npcName] || npcPersonas['default'];
    const missionContent = mission.contenido_educativo;

    let playerContext = '';
    if (playerUpgrades.length > 0) {
        playerContext += `El jugador tiene las siguientes mejoras activas: ${playerUpgrades.join(', ')}.\n`;
    }
    if (playerInventory.length > 0) {
        playerContext += `El jugador lleva estos objetos clave en su inventario: ${playerInventory.join(', ')}.\n`;
    }

    const prompt = `Eres un personaje en un videojuego de CV interactivo. Tu nombre es ${npcName}.

**Tu Personalidad:**
${persona}

**Contexto de la Misión Actual:**
El jugador está trabajando en la misión llamada "${mission.titulo}". Tienes que explicarles el siguiente concepto clave de una manera que encaje con tu personalidad.

**Concepto a Explicar:**
"${missionContent}"

${playerContext ? `**Contexto Adicional del Jugador:**\n${playerContext}Si es relevante y natural para tu personalidad, puedes hacer un comentario sutil sobre alguna de sus mejoras (ej. su velocidad, "¡Qué rápido te mueves!") o un objeto que lleven. ¡No lo fuerces si no encaja con la conversación principal!` : ''}

**Tu Tarea:**
Genera un diálogo corto y atractivo (2-3 frases).
1. Empieza con un saludo personalizado y en personaje.
2. Introduce y explica el concepto de forma natural y concisa.
3. ¡Sé memorable!`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating dialogue:", error);
    return `Hola, soy ${npcName}. He encontrado un error al procesar mi diálogo, pero la misión trata sobre: "${mission.contenido_educativo.substring(0, 80)}...". ¡Sigue adelante!`;
  }
}

export async function generateAdaChatResponse(
  chatHistory: ChatMessage[], 
  playerState: PlayerState,
  missions: Mission[],
  userQuestion: string
): Promise<string> {
  try {
    const persona = npcPersonas['Ada, la Guía'];
    const historyPrompt = chatHistory.map(msg => `${msg.sender === 'user' ? 'Jugador' : 'Ada'}: ${msg.text}`).join('\n');

    const activeMission = missions.find(m => m.status === 'disponible');
    const completedMissions = missions.filter(m => m.status === 'completada');

    const playerContext = `El jugador está en el nivel ${playerState.level} con ${Math.round(playerState.xp)} XP. Tiene ${playerState.coins} monedas y estas gemas: ${Object.entries(playerState.gems).map(([c, a]) => `${a} de color ${c}`).join(', ') || 'ninguna'}.
Ha completado ${completedMissions.length} misiones.
${activeMission ? `La misión actual es "${activeMission.titulo}", con el objetivo: "${activeMission.pasos[activeMission.paso_actual].descripcion}".` : 'Ha completado todas las misiones.'}`;

    const prompt = `Eres Ada, la Guía, un personaje en un videojuego de CV interactivo sobre un desarrollador llamado "Wisrovi".

**Tu Personalidad:**
${persona}

**Contexto del Juego:**
El juego es un CV interactivo. Los edificios representan los proyectos de GitHub de Wisrovi (p. ej. wiliutils, wkafka). Las misiones guían al jugador para que aprenda sobre las habilidades y proyectos del desarrollador. El jugador puede subir de nivel, conseguir monedas y mejorar su personaje.

**Contexto del Jugador:**
${playerContext}

**Historial de la Conversación:**
${historyPrompt}

**Pregunta del Jugador:** "${userQuestion}"

**Tu Tarea:**
Responde a la pregunta del jugador como Ada. Sé amable, alentadora y mantén tu personaje. Puedes dar pistas sobre la misión actual o sugerir explorar. Si la pregunta es sobre Wisrovi, responde basándote en que este CV es su portafolio. Si no sabes la respuesta, dilo amablemente. Mantén las respuestas cortas y conversacionales (2-4 frases).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating Ada's chat response:", error);
    return "Uhm... parece que mis circuitos de comunicación están un poco revueltos. ¿Podrías preguntar de nuevo?";
  }
}


export async function generateChatResponse(mission: Mission, chatHistory: ChatMessage[], userQuestion: string): Promise<{ text: string; sources: { uri: string; title: string }[] }> {
    try {
        const historyPrompt = chatHistory.map(msg => `${msg.sender === 'user' ? 'Usuario' : 'Asistente'}: ${msg.text}`).join('\n');

        const prompt = `Eres un asistente experto en ingeniería de software. Tu objetivo es responder preguntas sobre el proyecto "${mission.titulo}".
Utiliza la información obtenida de la búsqueda en Google sobre la siguiente URL para fundamentar tu respuesta: ${mission.referencia}.
Responde de manera clara y útil.

Historial de la conversación:
${historyPrompt}

Pregunta del usuario: "${userQuestion}"
Tu respuesta:`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title)
            .map(web => ({ uri: web.uri, title: web.title }));
        
        // FIX: The original method using `Array.from(new Map(...).values())` was causing a type inference error, resulting in `unknown[]`.
        // This has been replaced with a more explicit and readable approach that is guaranteed to be type-safe.
        const sourcesByUri: Record<string, { uri: string; title: string }> = {};
        for (const source of sources) {
            sourcesByUri[source.uri] = source;
        }
        const uniqueSources = Object.values(sourcesByUri);

        return { text, sources: uniqueSources };

    } catch (error) {
        console.error("Error generating chat response:", error);
        return { 
            text: "Lo siento, he tenido un problema para conectar con mis circuitos de conocimiento. Por favor, intenta hacer otra pregunta.",
            sources: [] 
        };
    }
}

export async function generateImage(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("La API no devolvió ninguna imagen.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("No pude plasmar tu visión. Quizás la idea era demasiado abstracta, o mis pinceles cósmicos necesitan un descanso. Inténtalo con otra descripción.");
    }
}