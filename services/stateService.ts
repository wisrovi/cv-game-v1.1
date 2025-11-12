import { PersistentState } from '../types';

const SESSION_ID_KEY = 'wisrovi-cv-session-id';
const API_BASE_URL = '/api'; // Placeholder for the actual API URL

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
 * Simulates saving the game state to a backend API that uses Redis.
 * @param state The persistent state of the game to save.
 */
export async function saveGameState(state: PersistentState): Promise<void> {
    const sessionId = getSessionId();
    console.log(`Simulating SAVE for session: ${sessionId}`);
    
    // In a real application, this would be a fetch call to your backend.
    // The backend would then take this data and store it in Redis.
    // Example:
    /*
    const response = await fetch(`${API_BASE_URL}/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, state }),
    });

    if (!response.ok) {
        throw new Error('Failed to save game state to cloud.');
    }
    */

    // For demonstration, we'll use localStorage to simulate the Redis persistence.
    // This makes the feature work without a real backend.
    localStorage.setItem(`redis-save-${sessionId}`, JSON.stringify(state));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Simulates loading the game state from a backend API that uses Redis.
 * @returns The loaded PersistentState or null if not found.
 */
export async function loadGameState(): Promise<PersistentState | null> {
    const sessionId = getSessionId();
    console.log(`Simulating LOAD for session: ${sessionId}`);

    // In a real application, this would be a fetch call.
    // Example:
    /*
    const response = await fetch(`${API_BASE_URL}/load?sessionId=${sessionId}`);
    if (response.status === 404) {
        return null; // No save game found
    }
    if (!response.ok) {
        throw new Error('Failed to load game state from cloud.');
    }
    return await response.json() as PersistentState;
    */

    // For demonstration, we'll read from localStorage.
    const savedData = localStorage.getItem(`redis-save-${sessionId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (savedData) {
        try {
            return JSON.parse(savedData) as PersistentState;
        } catch (e) {
            console.error("Failed to parse saved data:", e);
            return null;
        }
    }

    return null;
}