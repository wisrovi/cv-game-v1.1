import { PersistentState } from '../types';

const SESSION_ID_KEY = 'wisrovi-cv-session-id';

// ===================================================================================
// ADVERTENCIA DE SEGURIDAD IMPORTANTE
// ===================================================================================
// Esta implementación es solo para fines de demostración y prototipado.
// Exponer las credenciales de la base de datos (como REDIS_HOST y REDIS_PASSWORD)
// en el lado del cliente (frontend) es una VULNERABILIDAD DE SEGURIDAD GRAVE.
//
// En una aplicación de producción, NUNCA debe hacer esto. En su lugar, debe crear
// un servicio de backend (API) que actúe como intermediario. El frontend se
// comunicaría con su backend, y solo el backend tendría las credenciales para
// conectarse de forma segura a la base de datos.
// ===================================================================================

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_USER = 'default'; // The user provided 'default' for Redis Cloud
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_BASE_URL = REDIS_HOST && REDIS_PORT ? `https://${REDIS_HOST}:${REDIS_PORT}` : null;


/**
 * Generates a simple v4-like UUID.
 * @returns A unique string identifier.
 */
function generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Gets the current player's session ID from localStorage, or creates a new one.
 * @returns The session ID string.
 */
export function getSessionId(): string {
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
}

/**
 * Saves the game state to a Redis database via its REST API.
 * @param state The persistent state of the game to save.
 */
export async function saveGameState(state: PersistentState): Promise<void> {
    if (!REDIS_BASE_URL || !REDIS_PASSWORD) {
        console.error("Redis configuration is missing in environment variables (HOST, PORT, PASSWORD). Cannot save game state.");
        throw new Error("La configuración de Redis no está disponible.");
    }

    const sessionId = getSessionId();
    const key = `wisrovi-cv-session:${sessionId}`;
    const value = JSON.stringify(state);

    try {
        const response = await fetch(`${REDIS_BASE_URL}/SET/${key}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${btoa(`${REDIS_USER}:${REDIS_PASSWORD}`)}`,
                'Content-Type': 'application/json'
            },
            body: value,
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || `Redis request failed with status ${response.status}`);
        }
        console.log(`Successfully saved to Redis for session: ${sessionId}`);
    } catch (error) {
        console.error("Error saving game state to Redis:", error);
        throw error; // Re-throw to be caught by the UI layer
    }
}

/**
 * Loads the game state from a Redis database via its REST API.
 * @returns The loaded PersistentState or null if not found or on error.
 */
export async function loadGameState(): Promise<PersistentState | null> {
    if (!REDIS_BASE_URL || !REDIS_PASSWORD) {
        console.error("Redis configuration is missing in environment variables (HOST, PORT, PASSWORD). Cannot load game state.");
        // Throw an error here so the UI can show a more specific message.
        throw new Error("Redis configuration is missing in environment variables. Cannot load game state.");
    }
    const sessionId = getSessionId();
    const key = `wisrovi-cv-session:${sessionId}`;

    try {
        const response = await fetch(`${REDIS_BASE_URL}/GET/${key}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${btoa(`${REDIS_USER}:${REDIS_PASSWORD}`)}`,
            },
        });

        if (response.status === 404) {
            console.log(`No data found for session: ${sessionId}`);
            return null; // No data found for this session
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Redis request failed with status ${response.status}` }));
            throw new Error(errorData.error);
        }

        const data = await response.json();

        // The response for GET is often `{"GET": "<value>"}`
        if (data.GET) {
            try {
                return JSON.parse(data.GET) as PersistentState;
            } catch (e) {
                console.error("Failed to parse saved data from Redis:", e);
                return null;
            }
        }
        
        return null;
    } catch (error) {
        console.error("Error loading game state from Redis:", error);
        // On load failure, we throw an error to be caught by the UI layer
        // This allows for more specific feedback to the user.
        throw error;
    }
}
