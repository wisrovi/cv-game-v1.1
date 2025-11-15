


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerState, GameObject, Mission, Dialogue, ShopItem, Interior, Skill, PersistentState } from './types';
import {
  gameObjects as initialGameObjects,
  missions as initialMissions,
  shopItems,
  interiors,
  PLAYER_INITIAL_SPEED,
  PLAYER_INTERACTION_RANGE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  INITIAL_XP_TO_LEVEL_UP,
  BASE_VIEWPORT_WIDTH,
  BASE_VIEWPORT_HEIGHT,
  GAME_VERSION,
  GEM_SELL_VALUE,
  COLLECTIBLE_RESPAWN_TIME,
  TELEPORT_COST,
  skillTree,
} from './constants';
import { generateNpcDialogue } from './services/geminiService';
import { playSound, soundLibrary } from './services/audioService';
import { saveGameState, loadGameState } from './services/stateService';
import { CoinIcon, GemIcon, XPIcon, InteractIcon, SettingsIcon, CheckIcon, LockIcon } from './components/Icons';
import MissionChat from './components/MissionChat';
import SkillTreeDisplay from './components/SkillTreeDisplay';
import AdaChat from './components/AdaChat';
import Minimap from './components/Minimap';
import WorldMap from './components/WorldMap';
import DeployPuzzle from './components/DeployPuzzle';
import ImageGenerator from './components/ImageGenerator';
import PlayerNamePrompt from './components/PlayerNamePrompt';
import Shop from './components/Shop';
import './App.css';

interface MissionArrowProps {
    playerX: number;
    playerY: number;
    targetX: number | null;
    targetY: number | null;
    isMinimized: boolean;
}

const MissionArrow: React.FC<MissionArrowProps> = ({ playerX, playerY, targetX, targetY, isMinimized }) => {
    if (targetX === null || targetY === null) return null;

    const angle = Math.atan2(targetY - playerY, targetX - playerX) * (180 / Math.PI);

    return (
        <div className={`mission-arrow-container ${isMinimized ? 'minimized' : ''}`}>
            <div className="mission-arrow" style={{ transform: `rotate(${angle}deg)` }}>
                ➤
            </div>
        </div>
    );
};

interface NotificationOptions {
  duration?: number;
  sound?: keyof typeof soundLibrary;
}

const LOCAL_STORAGE_PLAYER_NAME_KEY = 'wisrovi-cv-last-player';


const App: React.FC = () => {
    const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem(LOCAL_STORAGE_PLAYER_NAME_KEY));
    const [playerState, setPlayerState] = useState<PlayerState>({
        x: WORLD_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: WORLD_HEIGHT / 2 - PLAYER_HEIGHT / 2,
        level: 1,
        xp: 0,
        coins: 50,
        gems: {},
        inventory: [],
        speed: PLAYER_INITIAL_SPEED,
        interactionTarget: null,
        upgrades: [],
        xpBoost: 1,
        interactionRange: PLAYER_INTERACTION_RANGE,
        unlockedSkills: [],
        isMoving: false,
        magnetRange: 0,
        coinDoublerChance: 0,
        teleportCostMultiplier: 1,
    });

    const [missions, setMissions] = useState<Mission[]>(initialMissions);
    const [gameObjects, setGameObjects] = useState<GameObject[]>(initialGameObjects);
    const [dialogue, setDialogue] = useState<Dialogue | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'missions' | 'skills' | 'map'>('main');
    const [showHud, setShowHud] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMission, setChatMission] = useState<Mission | null>(null);
    const [isAdaChatOpen, setIsAdaChatOpen] = useState(false);
    const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);
    const [currentInterior, setCurrentInterior] = useState<Interior | null>(null);
    const [poppingCollectibles, setPoppingCollectibles] = useState<GameObject[]>([]);
    const [viewportSize, setViewportSize] = useState({ width: BASE_VIEWPORT_WIDTH, height: BASE_VIEWPORT_HEIGHT });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Developer Mode State
    const [devOptionsUnlocked, setDevOptionsUnlocked] = useState(false);
    const [teleporterEnabled, setTeleporterEnabled] = useState(false);
    const [versionClickCount, setVersionClickCount] = useState(0);
    const [isTeleporting, setIsTeleporting] = useState(false);
    const [isPuzzleActive, setIsPuzzleActive] = useState(false);
    const [teleportPhase, setTeleportPhase] = useState<'idle' | 'out' | 'in'>('idle');
    const [isCameraSnapping, setIsCameraSnapping] = useState(false);


    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const gameLoopRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(performance.now());
    const notificationTimeoutRef = useRef<number | null>(null);
    const versionClickTimeoutRef = useRef<number | null>(null);
    
    const isGamePaused = dialogue || isShopOpen || isInventoryOpen || isMenuOpen || isChatOpen || isAdaChatOpen || isPuzzleActive || isImageGeneratorOpen || !playerName;
    const isPausedRef = useRef(isGamePaused);
isPausedRef.current = isGamePaused;
    
    useEffect(() => {
        if (isGamePaused) {
            keysPressed.current = {};
        }
    }, [isGamePaused]);
    
    const gameObjectsRef = useRef(gameObjects);
    gameObjectsRef.current = gameObjects;
    
    const getPersistentState = useCallback((): PersistentState => {
        const { x, y, interactionTarget, isMoving, ...persistedPlayerState } = playerState;
        return {
            playerState: persistedPlayerState,
            missions,
            devOptions: {
                devOptionsUnlocked,
                teleporterEnabled,
            }
        };
    }, [playerState, missions, devOptionsUnlocked, teleporterEnabled]);
    
    const autoSave = useCallback(async () => {
        if (!playerName) return;
        const currentState = getPersistentState();
        try {
            await saveGameState(currentState);
            console.log("Autosave successful.");
        } catch (error) {
            console.error("Autosave failed:", error);
        }
    }, [getPersistentState, playerName]);

    const handleNameSubmit = (name: string) => {
        localStorage.setItem(LOCAL_STORAGE_PLAYER_NAME_KEY, name);
        setPlayerName(name);
    };


    useEffect(() => {
        const handleResize = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const aspectRatio = BASE_VIEWPORT_WIDTH / BASE_VIEWPORT_HEIGHT;

            let newWidth = screenWidth - 40; // Add some margin
            let newHeight = newWidth / aspectRatio;

            if (newHeight > screenHeight - 40) { // Add some margin
                newHeight = screenHeight - 40;
                newWidth = newHeight * aspectRatio;
            }

            setViewportSize({ width: newWidth, height: newHeight });
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call

        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    const showNotification = useCallback((message: string, options: NotificationOptions = {}) => {
        const { duration = 3000, sound } = options;
        setNotification(message);
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = window.setTimeout(() => {
            setNotification(null);
        }, duration);

        if (sound) {
            playSound(sound);
        }
    }, []);

    const advanceMissionStep = useCallback((missionId: number) => {
        const mission = missions.find(m => m.id === missionId);
        if (!mission) return;

        const isCompletingMission = mission.paso_actual >= mission.pasos.length - 1;

        if (isCompletingMission) {
            showNotification(`¡Misión "${mission.titulo}" completada!`, { sound: 'MISSION_ADVANCE' });
            setPlayerState(p => {
                 const coinGainMultiplier = p.unlockedSkills.reduce((multiplier, skillId) => {
                    const skill = skillTree.find(s => s.id === skillId);
                    if (skill?.effect.type === 'COIN_GAIN_PERCENT') {
                        return multiplier * (1 + skill.effect.value);
                    }
                    return multiplier;
                }, 1);
                const finalCoinReward = Math.round(mission.recompensa_monedas * coinGainMultiplier);

                 const newGems = { ...p.gems, [mission.color_gema]: (p.gems[mission.color_gema] || 0) + mission.recompensa_gemas };
                 let newXp = p.xp + mission.recompensa_xp * p.xpBoost;
                 let xpToLevelUp = INITIAL_XP_TO_LEVEL_UP * Math.pow(1.5, p.level - 1);
                 let newLevel = p.level;

                 while (newXp >= xpToLevelUp) {
                    newLevel++;
                    newXp -= xpToLevelUp;
                    xpToLevelUp = INITIAL_XP_TO_LEVEL_UP * Math.pow(1.5, newLevel - 1);
                    showNotification(`¡Subiste de nivel! Nivel ${newLevel}`, { sound: 'UNLOCK' });
                }
                 return { ...p, coins: p.coins + finalCoinReward, xp: newXp, level: newLevel, gems: newGems };
            });
            
            setMissions(prevMissions => {
                 const newMissions = [...prevMissions];
                const completedMissionIndex = newMissions.findIndex(m => m.id === missionId);
                if (completedMissionIndex === -1) return newMissions;

                newMissions[completedMissionIndex] = {
                    ...newMissions[completedMissionIndex],
                    status: 'completada',
                    paso_actual: newMissions[completedMissionIndex].paso_actual + 1,
                };
                
                const nextMission = newMissions.find(m => m.status === 'bloqueada');
                if(nextMission) {
                    const nextMissionIndex = newMissions.findIndex(m => m.id === nextMission.id);
                    newMissions[nextMissionIndex] = {
                        ...newMissions[nextMissionIndex],
                        status: 'disponible',
                    };
                    showNotification(`Nueva misión disponible: "${newMissions[nextMissionIndex].titulo}"`);
                }
                
                return newMissions;
            });
        } else {
            setMissions(prevMissions => prevMissions.map(m => {
                if (m.id === missionId) {
                    const newPaso = m.paso_actual + 1;
                    showNotification(`Nuevo objetivo: ${m.pasos[newPaso].descripcion}`, { sound: 'MISSION_ADVANCE' });
                    return { ...m, paso_actual: newPaso };
                }
                return m;
            }));
        }
        autoSave();
    }, [missions, showNotification, autoSave]);

    const handleCloseAdaChat = useCallback(() => {
        setIsAdaChatOpen(false);
        playSound('UI_CLICK');

        const activeMission = missions.find(m => m.status === 'disponible');
        if (activeMission) {
            const currentStep = activeMission.pasos[activeMission.paso_actual];
            if (currentStep.tipo === 'interactuar' && currentStep.objetoId === 'npc_ada') {
                advanceMissionStep(activeMission.id);
            }
        }
    }, [missions, advanceMissionStep]);
    
    const handlePuzzleComplete = useCallback(() => {
        setIsPuzzleActive(false);
        const wdeployMissionId = 10;
        const wdeployMission = missions.find(m => m.id === wdeployMissionId);
        
        // Ensure the mission is actually active before advancing
        if (wdeployMission && wdeployMission.status === 'disponible') {
            const currentStep = wdeployMission.pasos[wdeployMission.paso_actual];
            if (currentStep && currentStep.tipo === 'interactuar' && currentStep.objetoId === 'deployment_script') {
                 advanceMissionStep(wdeployMissionId);
            }
        }
    }, [missions, advanceMissionStep]);

    // Save/Load Logic
    const handleSave = useCallback(async () => {
        playSound('UI_CLICK');
        setIsSaving(true);
        try {
            await saveGameState(getPersistentState());
            showNotification("¡Progreso guardado!", { duration: 2000 });
        } catch (error) {
            console.error("Error saving game state:", error);
            showNotification("Error al guardar.", { duration: 2000, sound: 'ERROR' });
        } finally {
            setIsSaving(false);
        }
    }, [getPersistentState, showNotification]);

    // Load game state on initial load
    useEffect(() => {
        const initializeGame = async () => {
            setIsLoading(true);
            try {
                const cloudState = await loadGameState();
                if (cloudState) {
                    setPlayerState(prevState => ({
                        ...prevState,
                        ...cloudState.playerState,
                        // Restore non-persistent fields
                        interactionTarget: null,
                        isMoving: false,
                    }));
                    setMissions(cloudState.missions);
                    setDevOptionsUnlocked(cloudState.devOptions.devOptionsUnlocked);
                    setTeleporterEnabled(cloudState.devOptions.teleporterEnabled);
                    showNotification(`¡Bienvenido de nuevo, ${playerName}! Cargando tu progreso.`, { duration: 2500 });
                } else {
                    showNotification(`¡Bienvenido, ${playerName}! Empezando una nueva aventura.`, { duration: 2500 });
                }
            } catch (error) {
                console.warn("Could not load progress.", error);
                showNotification("No se pudo cargar el progreso. Empezando una nueva partida...", { sound: 'ERROR'});
            } finally {
                setIsLoading(false);
            }
        };

        if (playerName) {
            initializeGame();
        } else {
            setIsLoading(false);
        }
    }, [playerName, showNotification]); 

    const openMissionChat = (mission: Mission) => {
        playSound('UI_CLICK');
        if (mission.status === 'completada') {
            setChatMission(mission);
            setIsChatOpen(true);
            setIsMenuOpen(false);
        }
    };
    
    const addInventoryItem = (itemId: string, name: string, quantity: number = 1) => {
        setPlayerState(prev => {
            const newInventory = [...prev.inventory];
            const existingItem = newInventory.find(i => i.id === itemId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                newInventory.push({ id: itemId, name, quantity });
            }
            return { ...prev, inventory: newInventory };
        });
    };

    const removeInventoryItem = (itemId: string, quantity: number = 1) => {
        setPlayerState(prev => {
            const newInventory = [...prev.inventory];
            const itemIndex = newInventory.findIndex(i => i.id === itemId);
            if (itemIndex > -1) {
                newInventory[itemIndex].quantity -= quantity;
                if (newInventory[itemIndex].quantity <= 0) {
                    newInventory.splice(itemIndex, 1);
                }
            }
            return { ...prev, inventory: newInventory };
        });
    };
    
    const hasInventoryItem = (itemId: string) => playerState.inventory.some(i => i.id === itemId);

    const handleInteraction = useCallback(async () => {
        if (dialogue) { setDialogue(null); playSound('UI_CLICK'); return; }
    
        const target = playerState.interactionTarget;
        if (!target) return;
    
        // --- Handle Exiting an Interior ---
        if (currentInterior && target.id === 'exit_door') {
            playSound('DOOR');
            const building = gameObjects.find(b => b.id === currentInterior.buildingId);
            if (building && building.door) {
                setPlayerState(prev => ({
                    ...prev,
                    x: building.x + building.door.x + (building.door.width / 2) - (PLAYER_WIDTH / 2),
                    y: building.y + building.door.y + building.door.height + 5,
                }));
            }
            setCurrentInterior(null);
            return;
        }
    
        // --- Handle Entering a Building ---
        if (!currentInterior && target.type === 'building' && target.door) {
            const interior = interiors.find(i => i.buildingId === target.id);
            if (interior) {
                playSound('DOOR');
                setCurrentInterior(interior);
                setPlayerState(prev => ({
                    ...prev,
                    x: interior.exit.x,
                    y: interior.exit.y + interior.exit.height,
                    interactionTarget: null
                }));
            }
            return;
        }
        
        // --- General Interactions (NPCs, Shop, etc that don't always advance missions) ---
        if (target.id === 'npc_ada') {
            setIsAdaChatOpen(true);
            playSound('DIALOGUE_START');
            // Let handleCloseAdaChat advance mission if applicable
            return;
        }
    
        if (target.id === 'npc_vincent') {
            setIsImageGeneratorOpen(true);
            playSound('UI_CLICK');
            return;
        }
        
        if (target.id === 'npc_vendor') {
            setIsShopOpen(true);
            playSound('UI_CLICK');
            return;
        }
    
        // --- Mission-related interactions (can happen anywhere, including interiors) ---
        const activeMission = missions.find(m => m.status === 'disponible');
        if (!activeMission) return;
    
        const currentStep = activeMission.pasos[activeMission.paso_actual];
        if (!currentStep) return;
    
        let actionTaken = false;
    
        if (currentStep.tipo === 'interactuar' && currentStep.objetoId === target.id) {
            if (currentStep.requiredItem) {
                if (hasInventoryItem(currentStep.requiredItem)) {
                    removeInventoryItem(currentStep.requiredItem);
                    showNotification(`Has usado ${target.name}.`, { sound: 'PICKUP' });
                } else {
                    const requiredItemFromMissions = initialMissions.flatMap(m => m.pasos).find(p => p.itemId === currentStep.requiredItem);
                    const requiredItemName = gameObjects.find(go => go.id === requiredItemFromMissions?.objetoId)?.name || 'un objeto';
                    showNotification(`Necesitas ${requiredItemName}.`, { sound: 'ERROR' });
                    return;
                }
            }
    
            if (target.id === 'deployment_script' && activeMission.id === 10) {
                setIsPuzzleActive(true);
                playSound('UI_CLICK');
                return; // Mission is advanced on puzzle completion
            }
            
            if (target.type === 'npc') {
                setDialogue({ npcName: target.name!, text: "Generando diálogo...", missionContent: activeMission.contenido_educativo });
                playSound('DIALOGUE_START');
                
                const upgradeNames = playerState.upgrades.map(upgradeId => shopItems.find(si => si.id === upgradeId)?.name || '').filter(name => name);
                const inventorySummary = playerState.inventory.map(item => item.name);
                const generatedText = await generateNpcDialogue(target.name!, activeMission, upgradeNames, inventorySummary, playerName || 'Jugador');
                setDialogue({ npcName: target.name!, text: generatedText, missionContent: activeMission.contenido_educativo });
            }
            actionTaken = true;
    
        } else if (currentStep.tipo === 'recoger' && currentStep.objetoId === target.id) {
            showNotification(`¡Has recogido ${target.name}!`, { sound: 'PICKUP' });
            addInventoryItem(currentStep.itemId!, target.name!, 1);
            setGameObjects(prev => prev.filter(obj => obj.id !== target.id));
            actionTaken = true;
    
        } else if (currentStep.tipo === 'entregar') {
            const isTargetNpc = currentStep.zona?.startsWith('npc_');
            let inZone = false;
            if (isTargetNpc) {
                inZone = playerState.interactionTarget?.id === currentStep.zona;
            } else {
                const zone = gameObjects.find(g => g.id === currentStep.zona);
                if (zone) {
                     inZone = playerState.x < zone.x + zone.width && playerState.x + PLAYER_WIDTH > zone.x &&
                              playerState.y < zone.y + zone.height && playerState.y + PLAYER_HEIGHT > zone.y;
                }
            }
    
            if(inZone) {
                if (currentStep.requiredItem && hasInventoryItem(currentStep.requiredItem)) {
                    removeInventoryItem(currentStep.requiredItem);
                    const zone = gameObjects.find(g => g.id === currentStep.zona);
                    showNotification(`Has entregado el objeto a ${zone?.name || 'la zona'}.`, { sound: 'PICKUP' });
                    actionTaken = true;
                } else {
                    showNotification(`Necesitas el objeto requerido.`, { sound: 'ERROR' });
                }
            }
        }
    
        if (actionTaken) {
            advanceMissionStep(activeMission.id);
        }
    }, [playerState, missions, dialogue, advanceMissionStep, showNotification, currentInterior, gameObjects, playerName, addInventoryItem, removeInventoryItem, hasInventoryItem]);

    const buyShopItem = (item: ShopItem) => {
        playSound('UI_CLICK');
        if (playerState.coins >= item.cost && !playerState.upgrades.includes(item.id)) {
            setPlayerState(p => {
                const newUpgrades = [...p.upgrades, item.id];
                let newSpeed = p.speed;
                let newInteractionRange = p.interactionRange;
                let newXpBoost = p.xpBoost;
                let newMagnetRange = p.magnetRange;
                let newCoinDoublerChance = p.coinDoublerChance;
                let newTeleportCostMultiplier = p.teleportCostMultiplier;

                if (item.effect.type === 'SPEED_BOOST') newSpeed *= item.effect.value;
                if (item.effect.type === 'INTERACTION_RANGE_BOOST') newInteractionRange *= item.effect.value;
                if (item.effect.type === 'XP_BOOST') newXpBoost *= item.effect.value;
                if (item.effect.type === 'MAGNET_RANGE') newMagnetRange += item.effect.value;
                if (item.effect.type === 'COIN_DOUBLER_CHANCE') newCoinDoublerChance = Math.max(newCoinDoublerChance, item.effect.value);
                if (item.effect.type === 'TELEPORT_COST_MULTIPLIER') newTeleportCostMultiplier = item.effect.value;


                return {
                    ...p,
                    coins: p.coins - item.cost,
                    upgrades: newUpgrades,
                    speed: newSpeed,
                    interactionRange: newInteractionRange,
                    xpBoost: newXpBoost,
                    magnetRange: newMagnetRange,
                    coinDoublerChance: newCoinDoublerChance,
                    teleportCostMultiplier: newTeleportCostMultiplier,
                };
            });
            showNotification(`¡Has comprado ${item.name}!`, { sound: 'UNLOCK' });
            autoSave();
        } else if (playerState.upgrades.includes(item.id)) {
            showNotification('Ya has comprado esta mejora.', { sound: 'ERROR' });
        } else {
            showNotification('No tienes suficientes monedas.', { sound: 'ERROR' });
        }
    };
    
    const handleSellGem = (color: string) => {
        playSound('UI_CLICK');
        if (playerState.gems[color] && playerState.gems[color] > 0) {
            setPlayerState(p => {
                const newGems = { ...p.gems };
                newGems[color]--;
                if (newGems[color] === 0) {
                    delete newGems[color];
                }
                return {
                    ...p,
                    gems: newGems,
                    coins: p.coins + GEM_SELL_VALUE,
                };
            });
            showNotification(`¡Has vendido una gema por ${GEM_SELL_VALUE} monedas!`, { sound: 'PICKUP' });
        }
    };
    
    const handleUnlockSkill = (skillId: string) => {
        playSound('UI_CLICK');
        const skill = skillTree.find(s => s.id === skillId);
        if (!skill) return;
    
        if (playerState.unlockedSkills.includes(skill.id)) {
            showNotification("Ya has desbloqueado esta habilidad.", { sound: 'ERROR' });
            return;
        }
        if (skill.requiredSkillId && !playerState.unlockedSkills.includes(skill.requiredSkillId)) {
            showNotification("Necesitas desbloquear la habilidad anterior primero.", { sound: 'ERROR' });
            return;
        }
        if (playerState.level < skill.requiredLevel) {
            showNotification(`Necesitas ser nivel ${skill.requiredLevel} para desbloquear esto.`, { sound: 'ERROR' });
            return;
        }
        if (skill.cost.coins && playerState.coins < skill.cost.coins) {
            showNotification("No tienes suficientes monedas.", { sound: 'ERROR' });
            return;
        }
        if (skill.cost.gems) {
            for (const color in skill.cost.gems) {
                if ((playerState.gems[color] || 0) < skill.cost.gems[color]) {
                    showNotification("No tienes suficientes gemas de ese color.", { sound: 'ERROR' });
                    return;
                }
            }
        }
    
        setPlayerState(prev => {
            const newCoins = prev.coins - (skill.cost.coins || 0);
            const newGems = { ...prev.gems };
            if (skill.cost.gems) {
                for (const color in skill.cost.gems) {
                    newGems[color] -= skill.cost.gems[color];
                }
            }
            
            const newUnlockedSkills = [...prev.unlockedSkills, skill.id];
    
            let newSpeed = PLAYER_INITIAL_SPEED;
            let newXpBoost = 1;
            
            prev.upgrades.forEach(upgradeId => {
                const item = shopItems.find(i => i.id === upgradeId);
                if(item) {
                     if (item.effect.type === 'SPEED_BOOST') newSpeed *= item.effect.value;
                     if (item.effect.type === 'XP_BOOST') newXpBoost *= item.effect.value;
                }
            });
    
            newUnlockedSkills.forEach(unlockedSkillId => {
                const s = skillTree.find(sk => sk.id === unlockedSkillId);
                if (s?.effect.type === 'SPEED_BOOST_PERCENT') newSpeed *= (1 + s.effect.value);
                if (s?.effect.type === 'XP_GAIN_PERCENT') newXpBoost *= (1 + s.effect.value);
            });
            
            return { ...prev, coins: newCoins, gems: newGems, unlockedSkills: newUnlockedSkills, speed: newSpeed, xpBoost: newXpBoost };
        });
    
        showNotification(`Habilidad Desbloqueada: ${skill.name}!`, { sound: 'UNLOCK' });
        autoSave();
    };

    const handleVersionClick = () => {
        if (versionClickTimeoutRef.current) {
            clearTimeout(versionClickTimeoutRef.current);
        }
    
        const newCount = versionClickCount + 1;
        setVersionClickCount(newCount);
    
        if (newCount >= 7) {
            if (!devOptionsUnlocked) {
                setDevOptionsUnlocked(true);
                showNotification("¡Opciones de desarrollador desbloqueadas!", { sound: 'UNLOCK' });
            }
            setVersionClickCount(0); // Reset on success
            autoSave();
        } else {
            versionClickTimeoutRef.current = window.setTimeout(() => {
                setVersionClickCount(0);
            }, 1500); // 1.5 seconds to make the next click
        }
    };

    const handleTeleporterToggle = () => {
        const newSetting = !teleporterEnabled;
        setTeleporterEnabled(newSetting);
        showNotification(`Teletransporte ${newSetting ? 'activado' : 'desactivado'}.`);
        playSound('UI_CLICK');
        autoSave();
    };
    
    useEffect(() => {
        if (isCameraSnapping) {
            // This effect triggers after a re-render where isCameraSnapping is true (i.e., after a teleport).
            // It waits a moment to ensure the "snapped" camera position has been rendered,
            // then sets isCameraSnapping back to false so that normal, smooth camera movement can resume.
            // This is more reliable than a simple setTimeout chain.
            const timer = setTimeout(() => {
                setIsCameraSnapping(false);
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [isCameraSnapping]);

    const handleTeleport = useCallback(() => {
        const cost = TELEPORT_COST * playerState.teleportCostMultiplier;
        if (playerState.coins < cost) {
            showNotification(`No tienes suficientes monedas para el teletransporte. Se necesitan ${cost}.`, { sound: 'ERROR' });
            return;
        }

        if(currentInterior) {
            showNotification("No se puede usar el teletransporte en interiores.", { sound: 'ERROR' });
            return;
        }

        let missionToTarget = missions.find(m => m.status === 'disponible');
        let missionPurpose = "objetivo de misión actual";

        if (!missionToTarget) {
            missionToTarget = missions.find(m => m.status === 'bloqueada');
            missionPurpose = "inicio de la siguiente misión";
        }

        if (!missionToTarget) {
            showNotification("¡Felicidades! Has completado todas las misiones.", { sound: 'UNLOCK' });
            return;
        }

        const currentStep = missionToTarget.pasos[missionToTarget.paso_actual];
        const targetId = currentStep.tipo === 'entregar' ? currentStep.zona : currentStep.objetoId;

        if (!targetId) {
            showNotification("El siguiente paso no tiene un objetivo físico.", { sound: 'ERROR' });
            return;
        }
        const targetObject = gameObjects.find(obj => obj.id === targetId);

        if (!targetObject) {
            showNotification("No se pudo encontrar el objetivo de la misión.", { sound: 'ERROR' });
            return;
        }

        const findSafeLandingSpot = (target: GameObject): {x: number, y: number} | null => {
            const checkCollision = (x: number, y: number) => {
                const playerLeft = x;
                const playerRight = x + PLAYER_WIDTH;
                const playerTop = y;
                const playerBottom = y + PLAYER_HEIGHT;

                for (const obj of gameObjects) {
                    if (obj.type === 'obstacle' || obj.type === 'building') {
                        const objLeft = obj.x;
                        const objRight = obj.x + obj.width;
                        const objTop = obj.y;
                        const objBottom = obj.y + obj.height;

                        if (playerLeft < objRight && playerRight > objLeft && playerTop < objBottom && playerBottom > objTop) {
                            return true;
                        }
                    }
                }
                return false;
            };

            const centerX = target.x + target.width / 2;
            const centerY = target.y + target.height / 2;
            let radius = Math.max(target.width, target.height) / 2 + PLAYER_WIDTH;
            const maxRadius = radius + 200;
            const angleStep = Math.PI / 12;

            while (radius < maxRadius) {
                for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
                    const potentialX = centerX + Math.cos(angle) * radius - PLAYER_WIDTH / 2;
                    const potentialY = centerY + Math.sin(angle) * radius - PLAYER_HEIGHT / 2;
                    
                    const clampedX = Math.max(0, Math.min(potentialX, WORLD_WIDTH - PLAYER_WIDTH));
                    const clampedY = Math.max(0, Math.min(potentialY, WORLD_HEIGHT - PLAYER_HEIGHT));

                    if (!checkCollision(clampedX, clampedY)) {
                        return { x: clampedX, y: clampedY };
                    }
                }
                radius += 20;
            }

            return null;
        };

        const safeSpot = findSafeLandingSpot(targetObject);

        if (safeSpot) {
            setPlayerState(p => ({...p, coins: p.coins - cost }));
            showNotification(`Teletransporte... Coste: ${cost} monedas.`, { duration: 1000 });
            setTeleportPhase('out');
            setTimeout(() => {
                setIsTeleporting(true);
            }, 200);

            setTimeout(() => {
                setIsCameraSnapping(true);
                setPlayerState(prev => ({ ...prev, x: safeSpot.x, y: safeSpot.y }));
                setTeleportPhase('in');
                playSound('TELEPORT');
                showNotification(`Teletransportado a ${targetObject.name || 'objetivo'} (${missionPurpose}).`);
            }, 500);

            setTimeout(() => {
                setIsTeleporting(false);
                setTeleportPhase('idle');
            }, 1000);
        } else {
            showNotification("No se pudo encontrar un punto de aterrizaje seguro cerca del objetivo.", { sound: 'ERROR' });
        }
    }, [playerState, missions, gameObjects, showNotification, currentInterior]);

    useEffect(() => {
        const gameLoop = (currentTime: number) => {
            const deltaTime = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;
            
            if (!isPausedRef.current) {
                setPlayerState(prev => {
                    let dx = 0;
                    let dy = 0;
                    
                    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
                    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
                    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
                    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;
        
                    let newX = prev.x;
                    let newY = prev.y;
                    const isMoving = dx !== 0 || dy !== 0;
        
                    if (isMoving) {
                        const magnitude = Math.sqrt(dx * dx + dy * dy);
                        const moveX = (dx / magnitude) * prev.speed * deltaTime;
                        const moveY = (dy / magnitude) * prev.speed * deltaTime;
                        
                        newX += moveX;
                        newY += moveY;
                    }
                    
                    let closestTarget: GameObject | null = null;
                    let minDistance = Infinity;
                    
                    if (currentInterior) {
                        newX = Math.max(0, Math.min(newX, currentInterior.width - PLAYER_WIDTH));
                        newY = Math.max(0, Math.min(newY, currentInterior.height - PLAYER_HEIGHT));
                        
                        // Check exit door
                        const exit = currentInterior.exit;
                        const exitDist = Math.hypot((exit.x + exit.width / 2) - (newX + PLAYER_WIDTH / 2), (exit.y + exit.height / 2) - (newY + PLAYER_HEIGHT / 2));
                        if (exitDist < prev.interactionRange) {
                            minDistance = exitDist;
                            closestTarget = { id: 'exit_door', name: 'Salir', type: 'object', ...exit };
                        }

                        // Check other interior objects
                        for (const obj of gameObjectsRef.current) {
                            if (obj.interiorId === currentInterior.id) {
                                const objDist = Math.hypot((obj.x + obj.width / 2) - (newX + PLAYER_WIDTH / 2), (obj.y + obj.height / 2) - (newY + PLAYER_HEIGHT / 2));
                                if (objDist < prev.interactionRange && objDist < minDistance) {
                                    minDistance = objDist;
                                    closestTarget = obj;
                                }
                            }
                        }

                    } else {
                        const checkCollision = (x: number, y: number) => {
                            for (const obj of gameObjectsRef.current) {
                                if ((obj.type === 'obstacle' || obj.type === 'building') && !obj.collectibleType) {
                                    if (x < obj.x + obj.width && x + PLAYER_WIDTH > obj.x && y < obj.y + obj.height && y + PLAYER_HEIGHT > obj.y) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        };
            
                        if (checkCollision(newX, newY)) {
                            if (!checkCollision(prev.x, newY)) newX = prev.x;
                            else if (!checkCollision(newX, prev.y)) newY = prev.y;
                            else { newX = prev.x; newY = prev.y; }
                        }
            
                        newX = Math.max(0, Math.min(newX, WORLD_WIDTH - PLAYER_WIDTH));
                        newY = Math.max(0, Math.min(newY, WORLD_HEIGHT - PLAYER_HEIGHT));
                        
                        for (const obj of gameObjectsRef.current) {
                            if (obj.type === 'npc' || obj.type === 'object' || obj.type === 'building') {
                                if (obj.collectibleType) continue; // Do not set collectibles as interaction targets
                                const targetCenterX = obj.type === 'building' && obj.door ? obj.x + obj.door.x + obj.door.width / 2 : obj.x + obj.width / 2;
                                const targetCenterY = obj.type === 'building' && obj.door ? obj.y + obj.door.y + obj.door.height / 2 : obj.y + obj.height / 2;
                                
                                const dist = Math.hypot(targetCenterX - (newX + PLAYER_WIDTH / 2), targetCenterY - (newY + PLAYER_HEIGHT / 2));
                                
                                if (dist < prev.interactionRange && dist < minDistance) {
                                    minDistance = dist;
                                    closestTarget = obj;
                                }
                            }
                        }
                    }
                    
                    const playerCenterX = newX + PLAYER_WIDTH / 2;
                    const playerCenterY = newY + PLAYER_HEIGHT / 2;
                    let playerUpdate = {};
                    const collectedThisFrame: GameObject[] = [];
                    let coinsGained = 0;
                    const gemsGained: { [key: string]: number } = {};

                    const remainingGameObjects = gameObjectsRef.current.filter(obj => {
                        if (!obj.collectibleType) return true;
                        
                        const objectIsForCurrentLocation = currentInterior ? obj.interiorId === currentInterior.id : !obj.interiorId;
                        if (!objectIsForCurrentLocation) return true;

                        const collectibleCenterX = obj.x + obj.width / 2;
                        const collectibleCenterY = obj.y + obj.height / 2;
                        const dist = Math.hypot(playerCenterX - collectibleCenterX, playerCenterY - collectibleCenterY);

                        if (dist < (PLAYER_WIDTH / 2 + obj.width / 2) + prev.magnetRange) {
                            collectedThisFrame.push(obj);
                             if (obj.collectibleType === 'coin') {
                                coinsGained += (obj.value || 1);
                            } else if (obj.collectibleType === 'gem' && obj.gemColor) {
                                gemsGained[obj.gemColor] = (gemsGained[obj.gemColor] || 0) + 1;
                            }
                            
                            setTimeout(() => {
                                setGameObjects(currentObjects => [...currentObjects, obj]);
                            }, COLLECTIBLE_RESPAWN_TIME);
                            
                            return false;
                        }
                        return true;
                    });
                    
                    if (collectedThisFrame.length > 0) {
                        playSound('PICKUP');
                        let finalCoinsGained = coinsGained;
                        let wasDoubled = false;
                        if (coinsGained > 0 && Math.random() < prev.coinDoublerChance) {
                            finalCoinsGained *= 2;
                            wasDoubled = true;
                        }

                        const coinGainMultiplier = prev.unlockedSkills.reduce((multiplier, skillId) => {
                            const skill = skillTree.find(s => s.id === skillId);
                            if (skill?.effect.type === 'COIN_GAIN_PERCENT') {
                                return multiplier * (1 + skill.effect.value);
                            }
                            return multiplier;
                        }, 1);
                        finalCoinsGained = Math.round(finalCoinsGained * coinGainMultiplier);

                        const gemFindChance = prev.unlockedSkills.reduce((chance, skillId) => {
                            const skill = skillTree.find(s => s.id === skillId);
                            if (skill?.effect.type === 'GEM_FIND_CHANCE') {
                                return Math.max(chance, skill.effect.value);
                            }
                            return chance;
                        }, 0);

                        Object.entries(gemsGained).forEach(([color, amount]) => {
                            for (let i = 0; i < amount; i++) {
                                if (Math.random() < gemFindChance) {
                                    gemsGained[color]++;
                                }
                            }
                        });

                         setGameObjects(remainingGameObjects);
                         setPoppingCollectibles(prevPopping => [...prevPopping, ...collectedThisFrame]);
                         collectedThisFrame.forEach(obj => {
                            setTimeout(() => {
                                setPoppingCollectibles(currentPopping => currentPopping.filter(p => p.id !== obj.id));
                            }, 500);
                         });

                         if (finalCoinsGained > 0) showNotification(`+${finalCoinsGained} moneda${finalCoinsGained > 1 ? 's' : ''}!${wasDoubled ? ' (x2!)' : ''}`, { duration: 1000 });
                         const numGems = Object.values(gemsGained).reduce((a, b) => a + b, 0);
                         if (numGems > 0) showNotification(`+${numGems} gema!`, { duration: 1000 });

                         const newGems = {...prev.gems};
                         Object.entries(gemsGained).forEach(([color, amount]) => {
                             newGems[color] = (newGems[color] || 0) + amount;
                         });
                         playerUpdate = { coins: prev.coins + finalCoinsGained, gems: newGems };
                    }

                    return { ...prev, x: newX, y: newY, interactionTarget: closestTarget, isMoving, ...playerUpdate };
                });
            }
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [currentInterior, showNotification]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isChatOpen || isAdaChatOpen || isImageGeneratorOpen) return;
            
            if (e.key === 'Escape') {
                let didCloseSomething = false;
                if (isPuzzleActive) { setIsPuzzleActive(false); didCloseSomething = true; }
                else if (dialogue) { setDialogue(null); didCloseSomething = true; }
                else if (isShopOpen) { setIsShopOpen(false); didCloseSomething = true; }
                else if (isInventoryOpen) { setIsInventoryOpen(false); didCloseSomething = true; }
                else if (isMenuOpen) { setIsMenuOpen(false); setMenuView('main'); didCloseSomething = true; }
                else if (isAdaChatOpen) { handleCloseAdaChat(); didCloseSomething = true; }
                else if (isImageGeneratorOpen) { setIsImageGeneratorOpen(false); didCloseSomething = true; }

                if (didCloseSomething) {
                    playSound('UI_CLICK');
                }
            }
            
            if (isGamePaused) return;

            if (e.key === ' ') {
                e.preventDefault();
                handleInteraction();
            } else if (e.key.toLowerCase() === 't') {
                if (teleporterEnabled) {
                    e.preventDefault();
                    handleTeleport();
                }
            } else if (e.key.toLowerCase() === 'i') {
                setIsInventoryOpen(prev => !prev);
                playSound('UI_CLICK');
            } else if (e.key.toLowerCase() === 'h') {
                setShowHud(prev => !prev);
            } else if (e.key.toLowerCase() === 'm') {
                setIsMenuOpen(true);
                setMenuView('main');
                playSound('UI_CLICK');
            } else if (e.key.toLowerCase() === 'b' && !currentInterior) {
                setIsMenuOpen(true);
                setMenuView('map');
                playSound('UI_CLICK');
            }
            else {
                const key = e.key.toLowerCase();
                // Prevent default for movement keys to avoid scrolling the page
                if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                    e.preventDefault();
                }
                keysPressed.current[key] = true;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
        const handleBlur = () => { keysPressed.current = {}; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            if(notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
            if(versionClickTimeoutRef.current) clearTimeout(versionClickTimeoutRef.current);
        };
    }, [handleInteraction, dialogue, isShopOpen, isInventoryOpen, isMenuOpen, isChatOpen, isPuzzleActive, isAdaChatOpen, isImageGeneratorOpen, teleporterEnabled, handleTeleport, handleCloseAdaChat, isGamePaused, currentInterior]);
    
    const activeMission = missions.find(m => m.status === 'disponible');
    const xpToLevelUp = INITIAL_XP_TO_LEVEL_UP * Math.pow(1.5, playerState.level - 1);

    // Camera logic:
    // 1. Calculate the camera's ideal top-left position to center the player.
    let cameraX = playerState.x + PLAYER_WIDTH / 2 - viewportSize.width / 2;
    let cameraY = playerState.y + PLAYER_HEIGHT / 2 - viewportSize.height / 2;

    // 2. Clamp the camera's position so its view doesn't go outside the world boundaries.
    cameraX = Math.max(0, Math.min(cameraX, WORLD_WIDTH - viewportSize.width));
    cameraY = Math.max(0, Math.min(cameraY, WORLD_HEIGHT - viewportSize.height));


    let missionTarget: GameObject | null = null;
    if (activeMission && !currentInterior) {
        let stepIndex = activeMission.paso_actual;
        let targetObject: GameObject | null = null;

        // Find the next step with a physical target in the current mission
        while(stepIndex < activeMission.pasos.length) {
            const step = activeMission.pasos[stepIndex];
            if (step) {
                const targetId = step.tipo === 'entregar' ? step.zona : step.objetoId;
                if (targetId) {
                    targetObject = gameObjects.find(obj => obj.id === targetId) || null;
                    if (targetObject) {
                        break; // Found a target
                    }
                }
            }
            stepIndex++;
        }
        
        if (targetObject) {
            if (targetObject.interiorId) {
                // If target is inside, point to the building instead
                const interior = interiors.find(i => i.id === targetObject.interiorId);
                if (interior) {
                    const building = gameObjects.find(b => b.id === interior.buildingId);
                    missionTarget = building || null;
                }
            } else {
                missionTarget = targetObject;
            }
        }
    }
    
    const playerLevelTier = Math.min(3, Math.floor(playerState.level / 5) + 1);
    const playerClasses = `player player-level-${playerLevelTier} ${teleportPhase !== 'idle' ? `teleport-${teleportPhase}` : ''} ${playerState.isMoving ? 'is-moving' : ''}`;
    
    const objectsToRender = gameObjects.filter(obj => {
        if (currentInterior) {
            return obj.interiorId === currentInterior.id;
        }
        return !obj.interiorId;
    });
    
    const poppingCollectiblesToRender = poppingCollectibles.filter(obj => {
         if (currentInterior) {
            return obj.interiorId === currentInterior.id;
        }
        return !obj.interiorId;
    });

    if (!playerName) {
        return <PlayerNamePrompt onNameSubmit={handleNameSubmit} />;
    }

    if (isLoading) {
        return (
            <div className="app-container">
                <div className="dialogue-box">
                    <h3>Cargando Mundo Interactivo...</h3>
                    <p>Conectando con la memoria persistente...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="app-container">
            {isTeleporting && <div className="teleport-overlay"></div>}
            <div className="game-viewport" style={{ width: viewportSize.width, height: viewportSize.height }}>
                {currentInterior ? (
                    <div className="interior-view" style={{ width: currentInterior.width, height: currentInterior.height }}>
                        <div className="interior-exit-door" style={{ left: currentInterior.exit.x, top: currentInterior.exit.y, width: currentInterior.exit.width, height: currentInterior.exit.height }}></div>
                         {objectsToRender.map(obj => (
                            <div key={obj.id} id={obj.id} className={`game-object ${obj.type} ${obj.collectibleType ? `collectible ${obj.collectibleType}` : ''}`} style={{ left: obj.x, top: obj.y, width: obj.width, height: obj.height, color: obj.gemColor, backgroundColor: obj.type !== 'npc' && !obj.gemColor ? obj.color : undefined }}>
                                 {obj.name && <span className="object-name">{obj.name}</span>}
                            </div>
                        ))}
                        {poppingCollectiblesToRender.map(obj => (
                            <div key={`pop-${obj.id}`} className={`collectible-pop ${obj.collectibleType}`} style={{ left: obj.x, top: obj.y, width: obj.width, height: obj.height, backgroundColor: obj.collectibleType === 'coin' ? '#FFD700' : obj.gemColor, color: obj.collectibleType === 'gem' ? obj.gemColor : '#FFD700' }} />
                        ))}
                        <div className={playerClasses} style={{ left: playerState.x, top: playerState.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}>
                            <div className="player-body">
                                <div className="player-cockpit"></div>
                            </div>
                            <div className="player-shadow"></div>
                        </div>
                        {playerState.interactionTarget && !isGamePaused && (
                           <div className="interaction-prompt" style={{ left: playerState.interactionTarget.x + (playerState.interactionTarget.width / 2) - 70, top: playerState.interactionTarget.y - 40 }}>
                                <InteractIcon className="icon" /> [Espacio] Interactuar
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`game-world ${isCameraSnapping ? 'no-transition' : ''}`} style={{ 
                        width: WORLD_WIDTH, 
                        height: WORLD_HEIGHT,
                        transform: `translate(${-cameraX}px, ${-cameraY}px)`
                    }}>
                        <div className="background-animated"></div>
                        <div className="particles">
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="particle" style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDuration: `${25 + Math.random() * 25}s`,
                              animationDelay: `${Math.random() * 20}s`,
                            }}>
                                <div className="particle-content" style={{ transform: `scale(${0.3 + Math.random() * 0.4})`}}>
                                    <div className="particle-body">
                                        <div className="particle-head"></div>
                                    </div>
                                </div>
                            </div>
                          ))}
                        </div>
                        
                        {objectsToRender.map(obj => {
                            const isMissionTarget = missionTarget && obj.id === missionTarget.id;
                            const objectClasses = `game-object ${obj.type} ${obj.collectibleType ? `collectible ${obj.collectibleType}` : ''} ${isMissionTarget ? 'mission-target-glow' : ''}`;
                            
                            return (
                                <div key={obj.id} id={obj.id} className={objectClasses} style={{ left: obj.x, top: obj.y, width: obj.width, height: obj.height, color: obj.gemColor, backgroundColor: obj.type !== 'npc' && !obj.gemColor ? obj.color : undefined }}>
                                   {(obj.type === 'npc') && (
                                        <>
                                          <div className="npc-body">
                                              <div className="npc-head"></div>
                                          </div>
                                        </>
                                    )}
                                    {obj.type === 'building' && obj.door && <div className="building-door" style={{ left: obj.door.x, top: obj.door.y, width: obj.door.width, height: obj.door.height }} />}
                                    {(obj.type === 'npc' || obj.type === 'building' || obj.name) && <span className="object-name">{obj.name}</span>}
                                </div>
                            );
                        })}
                        
                        {poppingCollectiblesToRender.map(obj => (
                            <div key={`pop-${obj.id}`} className={`collectible-pop ${obj.collectibleType}`} style={{ left: obj.x, top: obj.y, width: obj.width, height: obj.height, backgroundColor: obj.collectibleType === 'coin' ? '#FFD700' : obj.gemColor, color: obj.collectibleType === 'gem' ? obj.gemColor : '#FFD700' }} />
                        ))}

                        <div className={playerClasses} style={{ left: playerState.x, top: playerState.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}>
                            <div className="player-body">
                                <div className="player-cockpit"></div>
                            </div>
                            <div className="player-shadow"></div>
                        </div>
                        
                        {playerState.interactionTarget && !isGamePaused && (
                             <div className="interaction-prompt" style={{
                                left: playerState.interactionTarget.x + (playerState.interactionTarget.door?.x || 0),
                                top: playerState.interactionTarget.y + (playerState.interactionTarget.door?.y || 0) - 40
                            }}>
                                <InteractIcon className="icon" /> [Espacio] {playerState.interactionTarget.type === 'building' ? 'Entrar' : 'Interactuar'}
                            </div>
                        )}
                        <div className="vignette"></div>
                    </div>
                )}
            </div>
            
             <div className="top-bar">
                <div className="game-title">
                    Wisrovi's Interactive CV
                </div>
                <div className="top-bar-right">
                    <div className="player-stats-top">
                        <div className="player-level">Nv. {playerState.level}</div>
                        <div className="xp-bar-container-top" title={`${Math.round(playerState.xp)} / ${Math.round(xpToLevelUp)} XP`}>
                            <div className="xp-bar-top">
                                <div className="xp-fill-top" style={{ width: `${(playerState.xp / xpToLevelUp) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="currency-top">
                            <CoinIcon className="icon" /> {playerState.coins}
                            {Object.entries(playerState.gems).map(([color, amount]) => (
                                <div key={color} className="gem-display"><GemIcon className="icon" color={color} /> {amount}</div>
                            ))}
                        </div>
                    </div>
                    <button className="hud-button" onClick={() => { setIsMenuOpen(true); setMenuView('main'); playSound('UI_CLICK'); }} aria-label="Abrir menú">
                        <SettingsIcon />
                    </button>
                </div>
            </div>
            
            <div className="ui-container">
                <div className="hud-column left">
                    {/* Mission Arrow has been moved outside to be always visible */}
                </div>

                <div className="hud-column right">
                    {activeMission && !currentInterior && showHud && (
                        <div className={`mission-tracker hud-box`}>
                            <h3>{activeMission.titulo}</h3>
                            <p>{activeMission.pasos[activeMission.paso_actual]?.descripcion || "¡Misión completada!"}</p>
                        </div>
                    )}
                    {!currentInterior && (
                        <Minimap
                            playerState={playerState}
                            gameObjects={gameObjects}
                            missionTarget={missionTarget}
                            viewportWidth={viewportSize.width}
                        />
                    )}
                </div>
            </div>

            <MissionArrow 
                playerX={playerState.x + PLAYER_WIDTH / 2}
                playerY={playerState.y + PLAYER_HEIGHT / 2}
                targetX={missionTarget ? missionTarget.x + missionTarget.width / 2 : null}
                targetY={missionTarget ? missionTarget.y + missionTarget.height / 2 : null}
                isMinimized={false}
            />

            {showHud && !isGamePaused && !currentInterior && (
               <div className="controls-overlay">
                   <div className="hud-box">
                        <h4>Controles</h4>
                        <p className="controls-text"><b>WASD/Flechas:</b> Mover<br/><b>Espacio:</b> Interactuar<br/><b>I:</b> Inventario / <b>M:</b> Menú / <b>B:</b> Mapa<br/><b>Esc:</b> Cerrar</p>
                        <p className="controls-text hint">Pulsa <b>'H'</b> para ocultar la ayuda.</p>
                    </div>
                </div>
            )}
            
            {dialogue && (
                <div className="dialogue-overlay" onClick={() => { setDialogue(null); playSound('UI_CLICK'); }}>
                    <div className="dialogue-box">
                        <h3>{dialogue.npcName}</h3>
                        <p>{dialogue.text}</p>
                        <small>Haz clic o pulsa 'Espacio' / 'Esc' para cerrar</small>
                    </div>
                </div>
            )}
            
            {isShopOpen && (
                <Shop
                    playerState={playerState}
                    onClose={() => { setIsShopOpen(false); playSound('UI_CLICK'); }}
                    onBuyItem={buyShopItem}
                    onSellGem={handleSellGem}
                />
            )}

            {isInventoryOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Inventario</h3>
                        <div className="item-list">
                        {playerState.inventory.length > 0 ? (
                           playerState.inventory.map(item => <div className="list-item" key={item.id}><p>{item.name} <span>x{item.quantity}</span></p></div>)
                        ) : <p>Tu inventario está vacío.</p>}
                        </div>
                         <button onClick={() => { setIsInventoryOpen(false); playSound('UI_CLICK'); }} style={{marginTop: '20px'}}>Cerrar</button>
                    </div>
                </div>
            )}

            {isMenuOpen && (
                <div className="modal-overlay">
                    <div className="modal-box wide">
                        {menuView === 'main' && (
                            <>
                                <h3>Menú del Juego</h3>
                                <div className="menu-options">
                                    <button onClick={() => { setMenuView('missions'); playSound('UI_CLICK'); }}>Lista de Misiones</button>
                                    <button onClick={() => { setMenuView('skills'); playSound('UI_CLICK'); }}>Árbol de Habilidades</button>
                                    <button onClick={() => { setMenuView('map'); playSound('UI_CLICK'); }}>Mapa del Mundo</button>
                                    <button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Progreso'}</button>
                                </div>

                                <p className="game-version" onClick={handleVersionClick}>v{GAME_VERSION}</p>

                                {devOptionsUnlocked && (
                                    <div className="dev-options">
                                        <h4>Opciones de Desarrollador</h4>
                                        <div className="toggle-switch">
                                            <label>
                                                <span>Activar Teletransporte (T)</span>
                                                <input type="checkbox" checked={teleporterEnabled} onChange={handleTeleporterToggle} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => { setIsMenuOpen(false); setMenuView('main'); playSound('UI_CLICK'); }} style={{marginTop: '20px'}}>Cerrar</button>
                            </>
                        )}
                        {menuView === 'missions' && (
                            <>
                                <h3>Lista de Misiones</h3>
                                <div className="mission-list item-list">
                                    {missions.map(mission => (
                                        <div key={mission.id} className={`list-item mission-item ${mission.status}`} onClick={() => openMissionChat(mission)}>
                                            <div className="mission-info">
                                                <div className="mission-status-icon">
                                                    {mission.status === 'completada' && <CheckIcon className="icon" />}
                                                    {mission.status === 'bloqueada' && <LockIcon className="icon" />}
                                                    {mission.status === 'disponible' && <div className="status-dot available"></div>}
                                                </div>
                                                <div className="mission-details">
                                                    <b>{mission.titulo}</b>
                                                    <p>{mission.descripcion}</p>
                                                    {mission.status === 'completada' && <small className="chat-prompt">Haz clic para chatear sobre este proyecto</small>}
                                                </div>
                                            </div>
                                            <div className="mission-rewards">
                                                <div className="reward-item" title={`${mission.recompensa_monedas} Monedas`}>
                                                    <CoinIcon className="icon coin-icon" />
                                                    <span>{mission.recompensa_monedas}</span>
                                                </div>
                                                <div className="reward-item" title={`${mission.recompensa_xp} XP`}>
                                                    <XPIcon className="icon xp-icon" />
                                                    <span>{mission.recompensa_xp}</span>
                                                </div>
                                                <div className="reward-item" title={`${mission.recompensa_gemas} Gemas`}>
                                                    <GemIcon className="icon" color={mission.color_gema} />
                                                    <span>{mission.recompensa_gemas}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setMenuView('main'); playSound('UI_CLICK'); }} style={{marginTop: '20px'}}>Volver</button>
                            </>
                        )}
                        {menuView === 'skills' && (
                            <>
                                <SkillTreeDisplay 
                                    playerState={playerState}
                                    onUnlockSkill={handleUnlockSkill}
                                />
                                <button onClick={() => { setMenuView('main'); playSound('UI_CLICK'); }} style={{marginTop: '20px'}}>Volver</button>
                            </>
                        )}
                         {menuView === 'map' && (
                            <>
                                <WorldMap 
                                    gameObjects={gameObjects}
                                    playerState={playerState}
                                    missionTarget={missionTarget}
                                />
                                <button onClick={() => { setMenuView('main'); playSound('UI_CLICK'); }} style={{marginTop: '20px'}}>Volver</button>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {isAdaChatOpen && (
                <AdaChat
                    playerState={playerState}
                    missions={missions}
                    onClose={handleCloseAdaChat}
                />
            )}
            
            {isChatOpen && chatMission && <MissionChat mission={chatMission} onClose={() => { setIsChatOpen(false); playSound('UI_CLICK'); }} />}
            
            {isPuzzleActive && (
                <DeployPuzzle
                    onComplete={handlePuzzleComplete}
                    onClose={() => { setIsPuzzleActive(false); playSound('UI_CLICK'); }}
                />
            )}

            {isImageGeneratorOpen && (
                <ImageGenerator 
                    onClose={() => { setIsImageGeneratorOpen(false); playSound('UI_CLICK'); }}
                />
            )}

            {notification && <div className="notification">{notification}</div>}
        </div>
    );
};

export default App;