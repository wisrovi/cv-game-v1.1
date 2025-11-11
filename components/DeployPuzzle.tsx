import React, { useState, useMemo } from 'react';

interface DeployPuzzleProps {
    onComplete: () => void;
    onClose: () => void;
}

interface Node {
    id: string;
    label: string;
    x: number;
    y: number;
    type: 'start' | 'end' | 'node';
}

const puzzleNodes: Node[] = [
  { id: 'start', label: 'Repo', x: 50, y: 150, type: 'start' },
  { id: 'n1', label: 'CI/CD', x: 200, y: 80, type: 'node' },
  { id: 'n2', label: 'Tests Unitarios', x: 200, y: 220, type: 'node' },
  { id: 'n3', label: 'Build Docker', x: 350, y: 80, type: 'node' },
  { id: 'n4', label: 'Análisis Seguridad', x: 350, y: 220, type: 'node' },
  { id: 'n5', label: 'Deploy Staging', x: 500, y: 150, type: 'node' },
  { id: 'end', label: 'Deploy Prod', x: 650, y: 150, type: 'end' },
];

const validConnections: Record<string, string[]> = {
  'start': ['n1'], 'n1': ['start', 'n3'], 'n2': [], 'n3': ['n1', 'n5'],
  'n4': [], 'n5': ['n3', 'end'], 'end': ['n5'],
};

const solutionPath = ['start', 'n1', 'n3', 'n5', 'end'];

const DeployPuzzle: React.FC<DeployPuzzleProps> = ({ onComplete, onClose }) => {
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [connections, setConnections] = useState<[string, string][]>([]);
    const [isSolved, setIsSolved] = useState(false);

    const checkSolution = (currentConnections: [string, string][]) => {
        for (let i = 0; i < solutionPath.length - 1; i++) {
            const node1 = solutionPath[i];
            const node2 = solutionPath[i+1];
            const connectionExists = currentConnections.some(
                c => (c[0] === node1 && c[1] === node2) || (c[0] === node2 && c[1] === node1)
            );
            if (!connectionExists) return false;
        }
        return true;
    };

    const handleNodeClick = (nodeId: string) => {
        if (isSolved) return;

        if (!selectedNode) {
            setSelectedNode(nodeId);
        } else {
            if (selectedNode === nodeId) {
                setSelectedNode(null);
                return;
            }

            const allowedConnections = validConnections[selectedNode];
            const alreadyConnected = connections.some(c => (c[0] === selectedNode && c[1] === nodeId) || (c[0] === nodeId && c[1] === selectedNode));
            
            if (allowedConnections.includes(nodeId) && !alreadyConnected) {
                const newConnections = [...connections, [selectedNode, nodeId] as [string, string]];
                setConnections(newConnections);
                if (checkSolution(newConnections)) {
                    setIsSolved(true);
                }
            }
            setSelectedNode(null);
        }
    };
    
    const nodeMap = useMemo(() => {
        const map = new Map<string, Node>();
        puzzleNodes.forEach(node => map.set(node.id, node));
        return map;
    }, []);

    const isNodeInSolutionPath = (nodeId: string) => {
        if (!isSolved) return false;
        return solutionPath.includes(nodeId);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box wide puzzle-box">
                <h3>Minijuego: Pipeline de Despliegue</h3>
                <p>Conecta los nodos en el orden correcto para desplegar la aplicación, desde el repositorio hasta producción.</p>
                <div className="puzzle-container">
                    <svg className="puzzle-svg">
                        {connections.map(([startId, endId], i) => {
                             const startNode = nodeMap.get(startId);
                             const endNode = nodeMap.get(endId);
                             if (!startNode || !endNode) return null;
                             const isSolutionConnection = isSolved && solutionPath.includes(startId) && solutionPath.includes(endId) && Math.abs(solutionPath.indexOf(startId) - solutionPath.indexOf(endId)) === 1;
                             return (
                                <line 
                                    key={i} 
                                    x1={startNode.x + 60} y1={startNode.y + 30} 
                                    x2={endNode.x + 60} y2={endNode.y + 30} 
                                    className={`puzzle-line ${isSolutionConnection ? 'solved-path' : ''}`}
                                />
                             )
                        })}
                    </svg>
                    {puzzleNodes.map(node => (
                        <div
                            key={node.id}
                            className={`puzzle-node node-${node.type} ${selectedNode === node.id ? 'selected' : ''} ${isNodeInSolutionPath(node.id) ? 'solved-path' : ''}`}
                            style={{ left: node.x, top: node.y }}
                            onClick={() => handleNodeClick(node.id)}
                        >
                            {node.label}
                        </div>
                    ))}
                </div>
                 {isSolved && (
                    <div className="puzzle-solved-message">
                        <h4>¡Pipeline Correcto!</h4>
                        <p>Has desplegado la aplicación con éxito.</p>
                        <button onClick={onComplete}>Continuar Misión</button>
                    </div>
                )}
                {!isSolved && <button onClick={onClose} style={{ marginTop: '20px' }}>Cancelar</button>}
            </div>
        </div>
    );
};

export default DeployPuzzle;