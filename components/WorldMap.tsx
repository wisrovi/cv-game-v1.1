import React from 'react';
import { PlayerState, GameObject } from '../types';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants';

interface WorldMapProps {
    gameObjects: GameObject[];
    playerState: PlayerState;
    missionTarget: GameObject | null;
}

const WorldMap: React.FC<WorldMapProps> = ({ gameObjects, playerState, missionTarget }) => {
    const MAP_DISPLAY_WIDTH = 750;
    const scale = MAP_DISPLAY_WIDTH / WORLD_WIDTH;
    const MAP_DISPLAY_HEIGHT = WORLD_HEIGHT * scale;

    return (
        <>
            <h3>Mapa del Mundo</h3>
            <div className="world-map-wrapper">
                <div 
                    className="world-map-container"
                    style={{ width: MAP_DISPLAY_WIDTH, height: MAP_DISPLAY_HEIGHT }}
                >
                    {gameObjects
                        .filter(obj => obj.type === 'building' || obj.type === 'obstacle')
                        .map(obj => (
                        <div
                            key={`map-obj-${obj.id}`}
                            className={`world-map-object ${obj.type}`}
                            style={{
                                left: obj.x * scale,
                                top: obj.y * scale,
                                width: obj.width * scale,
                                height: obj.height * scale,
                                backgroundColor: obj.color,
                            }}
                        >
                            {obj.type === 'building' && <span className="world-map-object-tooltip">{obj.name}</span>}
                        </div>
                    ))}
                    {gameObjects
                        .filter(obj => obj.type === 'npc')
                        .map(obj => (
                        <div
                            key={`map-npc-${obj.id}`}
                            className="world-map-object npc"
                            style={{
                                left: (obj.x + obj.width / 2) * scale - 3,
                                top: (obj.y + obj.height / 2) * scale - 3,
                                width: 6,
                                height: 6,
                                backgroundColor: obj.color,
                            }}
                        >
                             <span className="world-map-object-tooltip">{obj.name}</span>
                        </div>
                    ))}
                    {missionTarget && (
                        <div
                            key="map-mission-target"
                            className="world-map-object mission-target"
                            style={{
                                left: (missionTarget.x + missionTarget.width / 2) * scale - 5,
                                top: (missionTarget.y + missionTarget.height / 2) * scale - 5,
                                width: 10,
                                height: 10,
                                backgroundColor: '#f1c40f',
                                borderRadius: '50%',
                            }}
                        />
                    )}
                    <div
                        key="map-player"
                        className="world-map-object player"
                        style={{
                            left: playerState.x * scale - 4,
                            top: playerState.y * scale - 4,
                            width: 8,
                            height: 8,
                        }}
                    />
                </div>
                <div className="world-map-legend">
                    <div className="legend-item">
                        <div className="legend-swatch player"></div>
                        <span>Tú</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-swatch npc"></div>
                        <span>NPC</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-swatch mission"></div>
                        <span>Objetivo</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WorldMap;
