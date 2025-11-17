import React from 'react';
import { PlayerState, ShopItem } from '../types';
import { shopItems, GEM_SELL_VALUE, COIN_TO_XP_RATE, XP_PER_COIN_TRADE } from '../constants';
import { CoinIcon, GemIcon, InteractIcon, MagnetIcon, TeleportIcon, XPIcon, HeartXPIcon } from './Icons';

interface ShopProps {
    playerState: PlayerState;
    onClose: () => void;
    onBuyItem: (item: ShopItem) => void;
    onSellGem: (color: string) => void;
    onSellAllGems: (color: string) => void;
    onBuyXP: () => void;
}

const getUpgradeIcon = (type: ShopItem['effect']['type']) => {
    switch (type) {
        case 'SPEED_BOOST':
            return <InteractIcon className="icon" style={{ stroke: '#56B4E9' }} />;
        case 'INTERACTION_RANGE_BOOST':
            return <InteractIcon className="icon" style={{ stroke: '#F0E442' }} />;
        case 'XP_BOOST':
            return <XPIcon className="icon" />;
        case 'MAGNET_RANGE':
            return <MagnetIcon className="icon" />;
        case 'TELEPORT_COST_MULTIPLIER':
            return <TeleportIcon className="icon" />;
        case 'COIN_DOUBLER_CHANCE':
            return <span style={{fontSize: '1.2em', color: 'var(--xp-color)'}}>2x</span>;
        case 'HEART_TO_XP':
            return <HeartXPIcon className="icon" />;
        default:
            return null;
    }
};

const ShopItemCard: React.FC<{
    item: ShopItem,
    playerState: PlayerState,
    onBuyItem: (item: ShopItem) => void
}> = ({ item, playerState, onBuyItem }) => {
    const isPurchased = playerState.upgrades.includes(item.id) || (item.effect.type === 'HEART_TO_XP' && playerState.hasHeartToXPAmulet);
    const discountedCost = Math.round(item.cost * (1 - playerState.shopDiscount));
    const isAffordable = playerState.coins >= discountedCost;
    const buttonText = isPurchased ? 'Comprado' : 'Comprar';
    
    let cardClass = 'shop-item-card';
    if (isPurchased) {
        cardClass += ' purchased';
    } else if (!isAffordable) {
        cardClass += ' unaffordable';
    }

    return (
        <div className={cardClass}>
            <div className="shop-item-header">
                <div className="shop-item-icon">{getUpgradeIcon(item.effect.type)}</div>
                <h5>{item.name}</h5>
            </div>
            <p>{item.description}</p>
            <div className="shop-item-footer">
                <div className="shop-item-cost">
                    <CoinIcon className="icon" />
                    {playerState.shopDiscount > 0 && !isPurchased ? (
                        <>
                            <del style={{opacity: 0.7}}>{item.cost}</del> {discountedCost}
                        </>
                    ) : (
                        item.cost
                    )}
                </div>
                <button onClick={() => onBuyItem(item)} disabled={isPurchased || !isAffordable}>
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

const Shop: React.FC<ShopProps> = ({ playerState, onClose, onBuyItem, onSellGem, onSellAllGems, onBuyXP }) => {
    const gemCount = Object.keys(playerState.gems).length;
    const finalSellValue = Math.round(GEM_SELL_VALUE * (1 + playerState.gemSellBonus));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box shop" onClick={(e) => e.stopPropagation()}>
                <div className="shop-container">
                    <h3>Mercado de Chip</h3>
                    
                    <div className="shop-section">
                        <h4>Mejoras de Nave</h4>
                        <div className="shop-grid">
                            {shopItems.map(item => (
                                <ShopItemCard 
                                    key={item.id}
                                    item={item}
                                    playerState={playerState}
                                    onBuyItem={onBuyItem}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <div className="shop-section">
                        <h4>Mercado de Gemas</h4>
                        {gemCount > 0 ? (
                             <div className="sell-gems-grid">
                                {Object.entries(playerState.gems).map(([color, amount]) => 
                                    ((amount as number) > 0) && (
                                        <div key={color} className="sell-gem-card">
                                            <p style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                                <GemIcon className="icon" color={color} />
                                                Gema (x{amount})
                                            </p>
                                            <button onClick={() => onSellGem(color)}>
                                                Vender 1 por {finalSellValue}
                                            </button>
                                            {(amount as number) > 1 && (
                                                <button className="sell-all-btn" onClick={() => onSellAllGems(color)}>
                                                    Vender Todo
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}
                             </div>
                        ) : (
                            <p style={{opacity: 0.7, textAlign: 'center'}}>No tienes gemas para vender. ¡Completa misiones para conseguirlas!</p>
                        )}
                    </div>

                    <div className="shop-section">
                        <h4>Entrenamiento</h4>
                        <div className="sell-gems-grid">
                             <div className="sell-gem-card">
                                <p style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <XPIcon className="icon" />
                                    <span>Comprar <b>{XP_PER_COIN_TRADE} XP</b></span>
                                </p>
                                <button onClick={onBuyXP} disabled={playerState.coins < COIN_TO_XP_RATE}>
                                    Coste: {COIN_TO_XP_RATE} <CoinIcon className="icon" style={{width: 14, height: 14, display: 'inline', verticalAlign: 'middle'}} />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
                 <button onClick={onClose} style={{marginTop: '20px'}}>Cerrar Tienda</button>
            </div>
        </div>
    );
};

export default Shop;