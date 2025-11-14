import { PersistentState } from '../types';

const SESSION_STORAGE_KEY = 'wisrovi-cv-session-id';

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    // Basic UUID generator
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

const redisConfig = {
  host: "simulated-redis.local",
  port: 6379,
  username: "default-user",
  password: "placeholder-password"
};

console.log(`Simulating connection to Redis at ${redisConfig.host}:${redisConfig.port}`);

/**
 * Simulates saving the game state to a backend API that uses Redis, keyed by a persistent session ID.
 * @param state The persistent state of the game to save.
 */
export async function saveGameState(state: PersistentState): Promise<void> {
    const sessionId = getSessionId();
    console.log(`Simulating Redis SET for session: ${sessionId}`);
    
    // This simulates an async network call to a backend.
    await new Promise(resolve => setTimeout(resolve, 500));

    // The backend would perform: `redis.set(`session:${sessionId}`, JSON.stringify(state))`
    // Here, we use localStorage to achieve the same persistence goal in the browser.
    localStorage.setItem(`redis-save-${sessionId}`, JSON.stringify(state));
}

/**
 * Simulates loading the game state from a backend API that uses Redis, keyed by a persistent session ID.
 * @returns The loaded PersistentState or null if not found.
 */
export async function loadGameState(): Promise<PersistentState | null> {
    const sessionId = getSessionId();
    console.log(`Simulating Redis GET for session: ${sessionId}`);

    // This simulates an async network call to a backend.
    await new Promise(resolve => setTimeout(resolve, 800));

    // The backend would perform: `const data = await redis.get(`session:${sessionId}`)`
    // Here, we use localStorage.
    const savedData = localStorage.getItem(`redis-save-${sessionId}`);
    
    if (savedData) {
        try {
            return JSON.parse(savedData) as PersistentState;
        } catch (e) {
            console.error("Failed to parse saved data from simulated Redis:", e);
            return null;
        }
    }

    return null;
}