
import { GAME_VERSION } from '../constants';

export const soundLibrary = {
    PICKUP: '/sounds/pickup.wav',
    DOOR: '/sounds/door.wav',
    DIALOGUE_START: '/sounds/dialogue.wav',
    MISSION_ADVANCE: '/sounds/complete.wav',
    TELEPORT: '/sounds/teleport.wav',
    UNLOCK: '/sounds/unlock.wav',
    ERROR: '/sounds/error.wav',
    UI_CLICK: '/sounds/click.wav',
};

// Append a version query string to bust cache on new game versions
const versionedSoundLibrary: { [key: string]: string } = {};
Object.entries(soundLibrary).forEach(([key, src]) => {
    versionedSoundLibrary[key] = `${src}?v=${GAME_VERSION}`;
});


type SoundName = keyof typeof versionedSoundLibrary;

// A simple pool to handle overlapping sounds of the same type
const audioPool: { [key in SoundName]?: HTMLAudioElement[] } = {};
const POOL_SIZE = 5;

// Pre-load sounds
Object.entries(versionedSoundLibrary).forEach(([key, src]) => {
    audioPool[key as SoundName] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audioPool[key as SoundName]?.push(audio);
    }
});

const poolIndex: { [key in SoundName]?: number } = {};

export const playSound = (soundName: SoundName, volume: number = 0.4) => {
    try {
        const pool = audioPool[soundName];
        if (!pool) {
            console.warn(`Sound "${soundName}" not found in library.`);
            return;
        }

        // Initialize index for the sound if it's the first time playing it
        if (poolIndex[soundName] === undefined) {
            poolIndex[soundName] = 0;
        }

        const audio = pool[poolIndex[soundName]!];
        
        // Cycle through the pool for this sound
        poolIndex[soundName] = (poolIndex[soundName]! + 1) % POOL_SIZE;

        if (audio) {
            audio.volume = volume;
            audio.currentTime = 0;
            // play() returns a promise which can be rejected if autoplay is disabled.
            audio.play().catch(error => {
                // This error is expected if the user hasn't interacted with the page yet.
                // We can safely ignore it.
            });
        }
    } catch (error) {
        console.error(`Error playing sound ${soundName}:`, error);
    }
};
