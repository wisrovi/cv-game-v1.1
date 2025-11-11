
import { GoogleGenAI, GenerateContentResponse, Blob } from "@google/genai";
import { Mission, ChatMessage } from '../types';

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const npcPersonas: { [key: string]: string } = {
    'Ada, la Guía': 'Eres Ada, la Guía principal del jugador. Eres amable, alentadora y te enfocas en el panorama general. Tu objetivo es hacer que el jugador se sienta bienvenido y curioso.',
    'Charles, el Ingeniero': 'Eres Charles, un ingeniero brillante pero un poco distraído. Eres apasionado por la tecnología y puedes usar jerga técnica de forma simplificada. Eres directo y te enfocas en la tarea en cuestión.',
    'Vendedor de Mejoras': 'Eres el Vendedor de Mejoras. Eres enérgico, persuasivo y siempre estás buscando una oportunidad para hablar de tus increíbles productos, aunque sea sutilmente. Tu tono es amigable y comercial.',
    'default': 'Eres un personaje amistoso en un videojuego interactivo que es un CV. Tu propósito es guiar al jugador.'
};

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


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
