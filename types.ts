export interface GameObject {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'npc' | 'building' | 'obstacle' | 'object';
    name?: string;
    color?: string;
    missionId?: number;
    door?: { x: number; y: number; width: number; height: number; };
    // For collectibles
    collectibleType?: 'coin' | 'gem' | 'heart';
    value?: number; // For coins
    gemColor?: string; // For gems
    interiorId?: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
}

export interface PlayerState {
    x: number;
    y: number;
    level: number;
    xp: number;
    coins: number;
    gems: { [key: string]: number };
    inventory: InventoryItem[];
    speed: number;
    interactionTarget: GameObject | null;
    upgrades: string[];
    xpBoost: number;
    interactionRange: number;
    unlockedSkills: string[];
    isMoving?: boolean;
    magnetRange: number;
    coinDoublerChance: number;
    teleportCostMultiplier: number;
    shopDiscount: number;
    gemSellBonus: number;
    teleportCostBonus: number;
    hasHeartToXPAmulet: boolean;
}

// State that gets saved to Redis (omits transient data like position)
export type PersistentPlayerState = Omit<PlayerState, 'x' | 'y' | 'interactionTarget' | 'isMoving'>;

export interface PersistentState {
    playerState: PersistentPlayerState;
    missions: Mission[];
    devOptions: {
        devOptionsUnlocked: boolean;
        teleporterEnabled: boolean;
    };
}


export interface MissionStep {
    descripcion: string;
    tipo: 'interactuar' | 'recoger' | 'entregar' | 'info';
    objetoId?: string;
    itemId?: string;
    requiredItem?: string;
    zona?: string;
}

export interface Mission {
    id: number;
    titulo: string;
    descripcion:string;
    recompensa_gemas: number;
    color_gema: string;
    recompensa_monedas: number;
    recompensa_xp: number;
    referencia: string;
    status: 'disponible' | 'completada' | 'bloqueada';
    pasos: MissionStep[];
    contenido_educativo: string;
    paso_actual: number;
}

export interface Dialogue {
    npcName: string;
    text: string;
    missionContent: string;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    effect: {
        type: 'SPEED_BOOST' | 'INTERACTION_RANGE_BOOST' | 'XP_BOOST' | 'MAGNET_RANGE' | 'COIN_DOUBLER_CHANCE' | 'TELEPORT_COST_MULTIPLIER' | 'HEART_TO_XP';
        value: number;
    };
}

export interface ChatMessage {
    sender: 'user' | 'gemini';
    text: string;
    sources?: { uri: string; title: string }[];
}

export interface Interior {
    id: string;
    buildingId: string;
    name: string;
    width: number;
    height: number;
    exit: { x: number; y: number; width: number; height: number; };
}

export interface SkillEffect {
    type: 'SPEED_BOOST_PERCENT' | 'COIN_GAIN_PERCENT' | 'GEM_FIND_CHANCE' | 'XP_GAIN_PERCENT' | 'SHOP_DISCOUNT_PERCENT' | 'GEM_SELL_VALUE_PERCENT' | 'TELEPORT_COST_REDUCTION_PERCENT';
    value: number;
}

export interface SkillCost {
    coins?: number;
    gems?: { [color: string]: number };
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    cost: SkillCost;
    requiredLevel: number;
    requiredSkillId?: string;
    effect: SkillEffect;
    icon: 'speed' | 'coin' | 'gem' | 'xp' | 'price_tag' | 'teleport';
    tier: number;
    branch: 'mobility' | 'economy';
}