import React from 'react';
import { PlayerState, GameObject } from '../types';
import { WORLD_WIDTH, WORLD_HEIGHT, MINIMAP_SIZE } from '../constants';

interface MinimapProps {
    playerState: PlayerState;
    gameObjects: GameObject[];
    missionTarget: GameObject | null;
    viewportWidth: number;
}

const Minimap: React.FC<MinimapProps> = ({ playerState, gameObjects, missionTarget, viewportWidth }) => {
    const { x: playerX, y: playerY } = playerState;

    const minimapScale = MINIMAP_SIZE / (viewportWidth * 1.2);

    const mapCenterX = playerX * minimapScale;
    const mapCenterY = playerY * minimapScale;
    
    const transformX = MINIMAP_SIZE / 2 - mapCenterX;
    const transformY = MINIMAP_SIZE / 2 - mapCenterY;

    return (
        <div className="minimap-container">
            <div className="minimap-background" style={{ 
                transform: `translate(${transformX}px, ${transformY}px)`,
                width: WORLD_WIDTH * minimapScale,
                height: WORLD_HEIGHT * minimapScale,
            }}>
                {gameObjects.filter(obj => obj.type === 'npc').map(obj => (
                     <div
                        key={`map-${obj.id}`}
                        className="minimap-dot npc"
                        style={{
                            left: `${obj.x * minimapScale}px`,
                            top: `${obj.y * minimapScale}px`,
                        }}
                    />
                ))}
                 {missionTarget && (
                    <div
                        className="minimap-dot mission"
                        style={{
                            left: `${(missionTarget.x + missionTarget.width / 2) * minimapScale}px`,
                            top: `${(missionTarget.y + missionTarget.height / 2) * minimapScale}px`,
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