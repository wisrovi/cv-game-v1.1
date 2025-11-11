import React from 'react';
import { PlayerState, Skill, SkillCost } from '../types';
import { skillTree } from '../constants';
import { CoinIcon, GemIcon, LockIcon, XPIcon, InteractIcon } from './Icons';

interface SkillTreeDisplayProps {
    playerState: PlayerState;
    onUnlockSkill: (skillId: string) => void;
}

const getSkillStatus = (skill: Skill, playerState: PlayerState) => {
    if (playerState.unlockedSkills.includes(skill.id)) {
        return 'unlocked';
    }
    const hasRequiredSkill = !skill.requiredSkillId || playerState.unlockedSkills.includes(skill.requiredSkillId);
    const hasRequiredLevel = playerState.level >= skill.requiredLevel;
    
    let hasResources = true;
    if (skill.cost.coins && playerState.coins < skill.cost.coins) {
        hasResources = false;
    }
    if (skill.cost.gems) {
        for (const color in skill.cost.gems) {
            if ((playerState.gems[color] || 0) < skill.cost.gems[color]) {
                hasResources = false;
                break;
            }
        }
    }
    
    if (hasRequiredSkill && hasRequiredLevel && hasResources) {
        return 'available';
    }
    return 'locked';
};

const CostDisplay: React.FC<{ cost: SkillCost }> = ({ cost }) => (
    <div className="skill-cost">
        {cost.coins && (
            <div className="cost-item">
                <CoinIcon className="icon coin-icon" /> {cost.coins}
            </div>
        )}
        {cost.gems && Object.entries(cost.gems).map(([color, amount]) => (
            <div key={color} className="cost-item">
                <GemIcon className="icon" color={color} /> {amount}
            </div>
        ))}
    </div>
);

const SkillNode: React.FC<{ skill: Skill; playerState: PlayerState; onUnlock: () => void; }> = ({ skill, playerState, onUnlock }) => {
    const status = getSkillStatus(skill, playerState);

    const getIcon = () => {
        switch(skill.icon) {
            case 'speed': return <InteractIcon className="icon" />;
            case 'coin': return <CoinIcon className="icon coin-icon" />;
            case 'gem': return <GemIcon className="icon" />;
            case 'xp': return <XPIcon className="icon xp-icon" />;
            default: return null;
        }
    };

    return (
        <div className={`skill-node ${status}`} onClick={status === 'available' ? onUnlock : undefined}>
            <div className="skill-icon-container">
                {getIcon()}
            </div>
            <div className="skill-details">
                <h4>{skill.name}</h4>
                <p>{skill.description}</p>
                <div className="skill-footer">
                    <div className="skill-requirements">
                        {playerState.level < skill.requiredLevel && <span>Req. Nv. {skill.requiredLevel}</span>}
                    </div>
                    {status !== 'unlocked' && <CostDisplay cost={skill.cost} />}
                </div>
            </div>
            {status === 'available' && <button onClick={onUnlock}>Desbloquear</button>}
            {status === 'locked' && <div className="skill-lock-overlay"><LockIcon /></div>}
            {status === 'unlocked' && <div className="skill-unlocked-check">✓</div>}
        </div>
    );
};

const SkillTreeDisplay: React.FC<SkillTreeDisplayProps> = ({ playerState, onUnlockSkill }) => {
    const tiers: { [key: number]: Skill[] } = {};
    skillTree.forEach(skill => {
        if (!tiers[skill.tier]) {
            tiers[skill.tier] = [];
        }
        tiers[skill.tier].push(skill);
    });

    return (
        <>
            <h3>Árbol de Habilidades</h3>
            <div className="skill-tree-container item-list">
                {Object.keys(tiers).map(tier => (
                    <div className="skill-tier" key={tier}>
                        {tiers[parseInt(tier)].map(skill => (
                            <SkillNode
                                key={skill.id}
                                skill={skill}
                                playerState={playerState}
                                onUnlock={() => onUnlockSkill(skill.id)}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </>
    );
};

export default SkillTreeDisplay;