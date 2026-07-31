export interface ShopItem {
  id: string;
  nameKey: string;
  emoji: string;
  price: number;
  category: 'mascot' | 'bubble_skin' | 'particle_effect';
}

export const SHOP_ITEMS: ShopItem[] = [
  // Mascots
  { id: 'mascot_fox', nameKey: 'shop.mascot_fox', emoji: '🦊', price: 50, category: 'mascot' },
  { id: 'mascot_penguin', nameKey: 'shop.mascot_penguin', emoji: '🐧', price: 50, category: 'mascot' },
  { id: 'mascot_unicorn', nameKey: 'shop.mascot_unicorn', emoji: '🦄', price: 80, category: 'mascot' },
  { id: 'mascot_dragon', nameKey: 'shop.mascot_dragon', emoji: '🐉', price: 120, category: 'mascot' },

  // Bubble skins
  { id: 'skin_star', nameKey: 'shop.skin_star', emoji: '⭐', price: 30, category: 'bubble_skin' },
  { id: 'skin_apple', nameKey: 'shop.skin_apple', emoji: '🍎', price: 30, category: 'bubble_skin' },
  { id: 'skin_rainbow', nameKey: 'shop.skin_rainbow', emoji: '🌈', price: 60, category: 'bubble_skin' },
  { id: 'skin_crystal', nameKey: 'shop.skin_crystal', emoji: '🔮', price: 40, category: 'bubble_skin' },

  // Particle effects
  { id: 'fx_confetti', nameKey: 'shop.fx_confetti', emoji: '🎉', price: 25, category: 'particle_effect' },
  { id: 'fx_fireworks', nameKey: 'shop.fx_fireworks', emoji: '🎆', price: 40, category: 'particle_effect' },
  { id: 'fx_sparkle', nameKey: 'shop.fx_sparkle', emoji: '✨', price: 20, category: 'particle_effect' },
];

export const SHOP_ITEM_MAP: Record<string, ShopItem> = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item]),
);