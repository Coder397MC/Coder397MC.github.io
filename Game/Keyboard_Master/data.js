export const UPGRADES = [
  {
    id: 'mechanical_switch',
    name: 'Mechanical Switches',
    baseCost: 15,
    multiplier: 0,
    bonus: 1, // Adds to click power
    desc: '+1 Press per key',
    type: 'click',
    costFactor: 1.5
  },
  {
    id: 'auto_clicker',
    name: 'Auto-Key Presser',
    baseCost: 100,
    multiplier: 0,
    bonus: 1, // Adds to PPS
    desc: '+1 Press per second',
    type: 'auto',
    costFactor: 1.2
  },
  {
    id: 'rgb_lighting',
    name: 'RGB Lighting',
    baseCost: 500,
    multiplier: 1.1, // 10% global multiplier
    bonus: 0,
    desc: 'x1.1 Global Multiplier',
    type: 'global_mult',
    costFactor: 2.0
  },
  {
    id: 'streamer_setup',
    name: 'Streamer Setup',
    baseCost: 1200,
    multiplier: 0,
    bonus: 5,
    desc: '+5 Presses per second',
    type: 'auto',
    costFactor: 1.3
  },
  {
    id: 'golden_caps',
    name: 'Golden Keycaps',
    baseCost: 5000,
    multiplier: 0,
    bonus: 10,
    desc: '+10 Press per key',
    type: 'click',
    costFactor: 1.4
  },
  {
    id: 'server_bot',
    name: 'Server Bot Farm',
    baseCost: 25000,
    multiplier: 0,
    bonus: 50,
    desc: '+50 Presses per second',
    type: 'auto',
    costFactor: 1.5
  },
  {
    id: 'quantum_keyboard',
    name: 'Quantum Keyboard',
    baseCost: 100000,
    multiplier: 2.0,
    bonus: 0,
    desc: 'Doubles all production',
    type: 'global_mult',
    costFactor: 5.0
  }
];

export const ACHIEVEMENTS = [
  {
    id: 'start',
    name: 'First Click',
    desc: 'Press a key for the first time.',
    condition: (game) => game.stats.totalPresses >= 1,
    icon: '👆'
  },
  {
    id: 'hundred',
    name: 'Century Club',
    desc: 'Reach 100 total presses.',
    condition: (game) => game.stats.totalPresses >= 100,
    icon: '💯'
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    desc: 'Reach 10 Presses Per Second.',
    condition: (game) => game.stats.currentPPS >= 10,
    icon: '⚡'
  },
  {
    id: 'keyboard_warrior',
    name: 'Keyboard Warrior',
    desc: 'Reach 1,000 total presses.',
    condition: (game) => game.stats.totalPresses >= 1000,
    icon: '⚔️'
  },
  {
    id: 'upgrade_master',
    name: 'Upgraded',
    desc: 'Purchase 5 upgrades.',
    condition: (game) => game.state.upgradesOwned.reduce((a, b) => a + b.count, 0) >= 5,
    icon: '🛠️'
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    desc: 'Reach 1,000,000 total presses.',
    condition: (game) => game.stats.totalPresses >= 1000000,
    icon: '💎'
  }
];

export const MOCK_LEADERBOARD = [
  { name: 'KeyboardKing', score: 5000000 },
  { name: 'ClickMaster99', score: 2500000 },
  { name: 'WASD_Warrior', score: 1000000 },
  { name: 'SpaceBar_Smasher', score: 750000 },
  { name: 'NoLife', score: 500000 }
];
