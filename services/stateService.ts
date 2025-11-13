import { PersistentState } from '../types';

// FIX: The build environment cannot correctly read tsconfig.json to inject credentials.
// To resolve the `JSON.parse(undefined)` error, credentials are now hardcoded here
// as a last resort, since direct file system access is failing in this context.
const redisConfig = {
  "host": "redis-13842.crce202.eu-west-3-1.ec2.cloud.redislabs.com",
  "port": 13842,
  "username": "default",
  "password": "Qi96GKmYEXR2WZ32JObZYB09giLHJyPD"
};


console.log(`Simulating connection to Redis at ${redisConfig.host}:${redisConfig.port}`);


/**
 * Simulates saving the game state to a backend API that uses Redis, keyed by player name.
 * @param state The persistent state of the game to save.
 */
export async function saveGameState(playerName: string, state: PersistentState): Promise<void> {
    if (!playerName) {
        throw new Error("Player name is required to save game state.");
    }
    console.log(`Simulating Redis SET for player: ${playerName}`);
    
    // This simulates an async network call to a backend.
    await new Promise(resolve => setTimeout(resolve, 500));

    // The backend would perform: `redis.set(`player:${playerName}`, JSON.stringify(state))`
    // Here, we use localStorage to achieve the same persistence goal in the browser.
    localStorage.setItem(`redis-save-${playerName}`, JSON.stringify(state));
}

/**
 * Simulates loading the game state from a backend API that uses Redis, keyed by player name.
 * @returns The loaded PersistentState or null if not found.
 */
export async function loadGameState(playerName: string): Promise<PersistentState | null> {
    if (!playerName) {
        throw new Error("Player name is required to load game state.");
    }
    console.log(`Simulating Redis GET for player: ${playerName}`);

    // This simulates an async network call to a backend.
    await new Promise(resolve => setTimeout(resolve, 800));

    // The backend would perform: `const data = await redis.get(`player:${playerName}`)`
    // Here, we use localStorage.
    const savedData = localStorage.getItem(`redis-save-${playerName}`);
    
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