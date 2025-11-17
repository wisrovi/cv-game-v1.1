import React, { useEffect, useState } from 'react';
import { CoinIcon, GemIcon, HeartIcon } from './Icons';

interface FlyingCollectibleProps {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: 'coin' | 'gem' | 'heart';
  gemColor?: string;
  onEnd: (id: string) => void;
}

const FlyingCollectible: React.FC<FlyingCollectibleProps> = ({ id, from, to, type, gemColor, onEnd }) => {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    left: from.x - 12,
    top: from.y - 12,
    transform: 'scale(1.2)',
    opacity: 1,
    zIndex: 1000,
    pointerEvents: 'none',
    transition: 'left 0.6s cubic-bezier(0.5, 0, 1, 0.5), top 0.6s cubic-bezier(0, 0.5, 0.5, 1), transform 0.6s ease-out, opacity 0.5s ease-out 0.1s',
  });

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
        setStyle(prev => ({
            ...prev,
            left: to.x - 12,
            top: to.y - 12,
            transform: 'scale(0.2)',
            opacity: 0,
        }));
    });

    const timer = setTimeout(() => {
      onEnd(id);
    }, 700);

    return () => {
        cancelAnimationFrame(animationFrame);
        clearTimeout(timer);
    };
  }, [id, to, onEnd]);

  const renderIcon = () => {
    switch (type) {
      case 'coin':
        return <CoinIcon className="flying-collectible-icon" style={{ fill: '#FFD700', stroke: '#fff', strokeWidth: 1 }} />;
      case 'gem':
        return <GemIcon className="flying-collectible-icon gem" color={gemColor} />;
      case 'heart':
        return <HeartIcon className="flying-collectible-icon" />;
      default:
        return null;
    }
  };


  return (
    <div className="flying-collectible" style={style}>
        {renderIcon()}
    </div>
  );
};

export default FlyingCollectible;