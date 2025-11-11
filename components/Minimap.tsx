import React from 'react';
import { PlayerState, GameObject } from '../types';
import { WORLD_WIDTH, WORLD_HEIGHT, MINIMAP_SIZE, MINIMAP_SCALE } from '../constants';

interface MinimapProps {
    playerState: PlayerState;
    gameObjects: GameObject[];
    missionTarget: GameObject | null;
}

const Minimap: React.FC<MinimapProps> = ({ playerState, gameObjects, missionTarget }) => {
    const { x: playerX, y: playerY } = playerState;

    const mapCenterX = playerX * MINIMAP_SCALE;
    const mapCenterY = playerY * MINIMAP_SCALE;
    
    const transformX = MINIMAP_SIZE / 2 - mapCenterX;
    const transformY = MINIMAP_SIZE / 2 - mapCenterY;

    return (
        <div className="minimap-container">
            <div className="minimap-background" style={{ 
                transform: `translate(${transformX}px, ${transformY}px)`,
                width: WORLD_WIDTH * MINIMAP_SCALE,
                height: WORLD_HEIGHT * MINIMAP_SCALE,
            }}>
                {gameObjects.filter(obj => obj.type === 'npc').map(obj => (
                     <div
                        key={`map-${obj.id}`}
                        className="minimap-dot npc"
                        style={{
                            left: `${obj.x * MINIMAP_SCALE}px`,
                            top: `${obj.y * MINIMAP_SCALE}px`,
                        }}
                    />
                ))}
                 {missionTarget && (
                    <div
                        className="minimap-dot mission"
                        style={{
                            left: `${(missionTarget.x + missionTarget.width / 2) * MINIMAP_SCALE}px`,
                            top: `${(missionTarget.y + missionTarget.height / 2) * MINIMAP_SCALE}px`,
                        }}
                    />
                )}
            </div>
             <div
                className="minimap-dot player"
                style={{
                    left: '50%',
                    top: '50%',
                }}
            />
        </div>
    );
};

export default Minimap;
