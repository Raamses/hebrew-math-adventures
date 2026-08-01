import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SHOP_ITEMS } from '../../data/shopItems';
import { useProfile } from '../../context/ProfileContext';

interface TreasureShopProps {
  open: boolean;
  onClose: () => void;
}

export const TreasureShop: React.FC<TreasureShopProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { profile, buyItem, equipItem } = useProfile();
  const [flash, setFlash] = useState<string | null>(null);

  const coins = profile?.coins || 0;
  const owned = profile?.ownedItems || [];
  const equipped = profile?.equippedItems || {};

  const handleBuy = (itemId: string, price: number) => {
    if (buyItem(itemId, price)) {
      setFlash(`bought:${itemId}`);
      setTimeout(() => setFlash(null), 1000);
    }
  };

  const handleEquip = (category: string, itemId: string) => {
    equipItem(category, itemId);
    setFlash(`equipped:${itemId}`);
    setTimeout(() => setFlash(null), 1000);
  };

  const categories: Array<{ key: string; label: string }> = [
    { key: 'mascot', label: t('shop.categoryMascot') },
    { key: 'bubble_skin', label: t('shop.categorySkin') },
    { key: 'particle_effect', label: t('shop.categoryEffect') },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-3xl p-5 m-4 max-w-md w-full shadow-2xl"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-700">
                {t('shop.title')}
              </h2>
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1.5 rounded-full">
                <span className="text-xl">🪙</span>
                <span className="font-bold text-yellow-700">{coins}</span>
              </div>
            </div>

            {/* Items grid */}
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              {categories.map((cat) => (
                <div key={cat.key}>
                  <h3 className="text-sm font-bold text-slate-500 mb-2">{cat.label}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {SHOP_ITEMS.filter((item) => item.category === cat.key).map((item) => {
                      const isOwned = owned.includes(item.id);
                      const isEquipped = equipped[item.category] === item.id;
                      const canAfford = coins >= item.price;

                      return (
                        <motion.div
                          key={item.id}
                          className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 text-center transition-colors ${
                            isEquipped
                              ? 'border-green-400 bg-green-50'
                              : isOwned
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                          animate={
                            flash === `bought:${item.id}`
                              ? { scale: [1, 1.1, 1] }
                              : flash === `equipped:${item.id}`
                              ? { scale: [1, 1.05, 1] }
                              : {}
                          }
                          transition={{ duration: 0.3 }}
                        >
                          <span className="text-3xl">{item.emoji}</span>
                          <span className="text-xs font-bold text-slate-600">
                            {t(item.nameKey)}
                          </span>

                          {isEquipped ? (
                            <span className="text-xs font-bold text-green-600 py-1">
                              ✓ {t('shop.equipped')}
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => handleEquip(item.category, item.id)}
                              className="px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors min-h-[36px]"
                            >
                              {t('shop.equip')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy(item.id, item.price)}
                              disabled={!canAfford}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors min-h-[36px] ${
                                canAfford
                                  ? 'bg-yellow-400 text-yellow-800 hover:bg-yellow-500'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              🪙 {item.price}
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold text-sm min-h-[48px]"
            >
              {t('app.common.close')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};