export type Category = 'Бюджет' | 'Средний класс' | 'Субфлагман' | 'Флагман' | 'Ультрафлагман' | 'Лимитированный'

export interface Phone {
  id: string
  name: string
  brand: string
  category: Category
  price: number
  color: string
  accent: string
}

export interface CaseDef {
  id: string
  name: string
  subtitle: string
  price: number
  level: number
  color: string
  pool: string[]
}

const p = (id: string, brand: string, name: string, category: Category, price: number, color: string, accent: string): Phone => ({ id, brand, name: `${brand} ${name}`, category, price, color, accent })

export const PHONES: Phone[] = [
  p('nova-c1', 'Samsung', 'Galaxy A05s', 'Бюджет', 180, '#a7adb5', '#d7dce2'),
  p('pixel-a2', 'Xiaomi', 'Redmi 13C', 'Бюджет', 280, '#52796f', '#a8c5b5'),
  p('orbit-5', 'Motorola', 'Moto G54', 'Бюджет', 420, '#3b82f6', '#93c5fd'),
  p('nova-c9', 'Samsung', 'Galaxy A15', 'Бюджет', 650, '#ef8354', '#f6bd60'),
  p('pixel-a7', 'Xiaomi', 'Redmi Note 13', 'Средний класс', 900, '#84a59d', '#b7e4c7'),
  p('orbit-12', 'Samsung', 'Galaxy A35', 'Средний класс', 1300, '#6366f1', '#a5b4fc'),
  p('zen-neo', 'Nothing', 'Phone (2a)', 'Средний класс', 1900, '#f97316', '#fed7aa'),
  p('nova-n30', 'Google', 'Pixel 8a', 'Средний класс', 2600, '#0ea5e9', '#7dd3fc'),
  p('zen-gt', 'OnePlus', 'Nord 4', 'Субфлагман', 3600, '#e11d48', '#fb7185'),
  p('orbit-r', 'Xiaomi', '14T', 'Субфлагман', 4800, '#8b5cf6', '#c4b5fd'),
  p('pixel-pro', 'Google', 'Pixel 9', 'Субфлагман', 6500, '#64748b', '#cbd5e1'),
  p('nova-x', 'Samsung', 'Galaxy S24 FE', 'Субфлагман', 8500, '#14b8a6', '#5eead4'),
  p('zen-15', 'Apple', 'iPhone 15', 'Флагман', 11000, '#e2e8f0', '#ffffff'),
  p('orbit-ultra', 'Samsung', 'Galaxy S24+', 'Флагман', 14500, '#334155', '#94a3b8'),
  p('pixel-fold', 'Google', 'Pixel 9 Pro Fold', 'Флагман', 18500, '#7c3aed', '#c4b5fd'),
  p('nova-titan', 'Apple', 'iPhone 15 Pro Max', 'Флагман', 24000, '#78716c', '#d6d3d1'),
  p('zen-15u', 'Samsung', 'Galaxy S25 Ultra', 'Ультрафлагман', 32000, '#111827', '#f59e0b'),
  p('orbit-max', 'Apple', 'iPhone 16 Pro', 'Ультрафлагман', 42000, '#1e3a8a', '#60a5fa'),
  p('pixel-v', 'Google', 'Pixel 10 Pro', 'Ультрафлагман', 55000, '#581c87', '#d8b4fe'),
  p('nova-infinity', 'Apple', 'iPhone 17 Pro Max', 'Ультрафлагман', 72000, '#082f49', '#22d3ee'),
  p('zen-aurum', 'Samsung', 'Galaxy Z Fold7', 'Лимитированный', 100000, '#a16207', '#fde047'),
  p('orbit-carbon', 'Apple', 'iPhone 17 Pro Titanium', 'Лимитированный', 150000, '#18181b', '#ef4444'),
  p('pixel-prism', 'Vertu', 'Agent Q', 'Лимитированный', 240000, '#155e75', '#f0abfc'),
  p('nova-ceo', 'Caviar', 'iPhone 17 Pro Gold Edition', 'Лимитированный', 400000, '#451a03', '#fbbf24'),
]

export const CASES: CaseDef[] = [
  { id: 'start', name: 'СТАРТОВЫЙ', subtitle: 'Первый шаг к коллекции', price: 500, level: 1, color: '#38bdf8', pool: ['nova-c1','pixel-a2','orbit-5','nova-c9','pixel-a7','orbit-12','zen-neo','nova-n30','zen-gt'] },
  { id: 'pro', name: 'PRO КЕЙС', subtitle: 'Больше мощности. Выше ставки.', price: 3000, level: 2, color: '#a78bfa', pool: ['orbit-12','zen-neo','nova-n30','zen-gt','orbit-r','pixel-pro','nova-x','zen-15','orbit-ultra','pixel-fold'] },
  { id: 'elite', name: 'ULTRA КЕЙС', subtitle: 'Охота за редчайшими моделями', price: 15000, level: 4, color: '#fbbf24', pool: ['nova-x','zen-15','orbit-ultra','pixel-fold','nova-titan','zen-15u','orbit-max','pixel-v','nova-infinity','zen-aurum','orbit-carbon','pixel-prism','nova-ceo'] },
]

export const phoneById = (id: string) => PHONES.find(phone => phone.id === id)!
export const formatCoins = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₵`
export const xpForLevel = (level: number) => 100 + (level - 1) * 100

export function rollFromCase(caseDef: CaseDef): Phone {
  const pool = caseDef.pool.map(phoneById)
  // Cheaper drops are intentionally much more common; every case still has a jackpot.
  const weights = pool.map(phone => Math.pow(pool[pool.length - 1].price / phone.price, 1.65))
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return pool[i]
  }
  return pool[0]
}
