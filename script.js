
// ==========================================
// DATA
// ==========================================
const UPGRADES = [
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

const ACHIEVEMENTS = [
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

const MOCK_LEADERBOARD = [
    { name: 'KeyboardKing', score: 5000000 },
    { name: 'ClickMaster99', score: 2500000 },
    { name: 'WASD_Warrior', score: 1000000 },
    { name: 'SpaceBar_Smasher', score: 750000 },
    { name: 'NoLife', score: 500000 }
];

const UNLOCK_ORDER = ['q', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm'];

// ==========================================
// GAME CLASS
// ==========================================
class Game {
    constructor() {
        this.state = {
            presses: 0,
            lifetimePresses: 0,
            manualPresses: 0, // Track human clicks
            pps: 0,
            clickValue: 1,
            multiplier: 1.0,
            startTime: Date.now(),
            upgradesOwned: UPGRADES.map(u => ({ id: u.id, count: 0 })),
            achievementsUnlocked: [],
            unlockedKeys: [' ', 'w', 'a', 's', 'd'] // Strings, lowercase
        };

        this.stats = {
            totalPresses: 0,
            currentPPS: 0,
            maxPPS: 0
        };

        // Load save if exists
        this.load();
    }

    pressKey(amount) {
        // Fallback if no amount provided (auto-clickers usually provide amount, manual provides calculated)
        if (amount === undefined) amount = this.calculateClickValue();

        this.state.presses += amount;
        this.state.lifetimePresses += amount;
        this.stats.totalPresses = this.state.lifetimePresses; // sync
        return amount;
    }

    handleManualPress() {
        this.state.manualPresses++;

        // Progression Logic: Unlock new key every 1000 manual presses
        const nextUnlockIndex = this.state.unlockedKeys.length - 5; // 5 starting keys
        const nextMilestone = (nextUnlockIndex + 1) * 1000;

        if (this.state.manualPresses >= nextMilestone && nextUnlockIndex < UNLOCK_ORDER.length) {
            const newKey = UNLOCK_ORDER[nextUnlockIndex];
            this.state.unlockedKeys.push(newKey);

            // Visual notification
            alert(`UNLOCKED NEW KEY: ${newKey.toUpperCase()}! Base Click Value Increased +1`);

            this.recalcStats();
        }

        const value = this.calculateClickValue();
        this.pressKey(value);
        return value;
    }

    isKeyUnlocked(key) {
        return this.state.unlockedKeys.includes(key.toLowerCase());
    }

    calculateClickValue() {
        // Base changes based on unlocked keys
        // Starts at 1. each unlock adds +1.
        // Initial keys (5) = Base 1.
        // +1 Key = Base 2.
        let base = 1 + (this.state.unlockedKeys.length - 5);

        // Add click upgrades
        this.state.upgradesOwned.forEach(owned => {
            const upgrade = UPGRADES.find(u => u.id === owned.id);
            if (upgrade.type === 'click') {
                base += upgrade.bonus * owned.count;
            }
        });
        return base * this.calculateMultiplier();
    }

    calculatePPS() {
        let pps = 0;
        this.state.upgradesOwned.forEach(owned => {
            const upgrade = UPGRADES.find(u => u.id === owned.id);
            if (upgrade.type === 'auto') {
                pps += upgrade.bonus * owned.count;
            }
        });
        return pps * this.calculateMultiplier();
    }

    calculateMultiplier() {
        let mult = 1.0;
        this.state.upgradesOwned.forEach(owned => {
            const upgrade = UPGRADES.find(u => u.id === owned.id);
            if (upgrade.type === 'global_mult' && owned.count > 0) {
                mult *= Math.pow(upgrade.multiplier, owned.count);
            }
        });
        return mult;
    }

    buyUpgrade(upgradeId) {
        const upgrade = UPGRADES.find(u => u.id === upgradeId);
        const owned = this.state.upgradesOwned.find(u => u.id === upgradeId);

        const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costFactor, owned.count));

        if (this.state.presses >= cost) {
            this.state.presses -= cost;
            owned.count++;
            this.recalcStats();
            return true;
        }
        return false;
    }

    getUpgradeCost(upgradeId) {
        const upgrade = UPGRADES.find(u => u.id === upgradeId);
        const owned = this.state.upgradesOwned.find(u => u.id === upgradeId);
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costFactor, owned.count));
    }

    recalcStats() {
        this.state.clickValue = this.calculateClickValue();
        this.state.pps = this.calculatePPS();
    }

    tick(dt) {
        // Add auto presses
        const pps = this.state.pps;
        if (pps > 0) {
            const amount = pps * (dt / 1000);
            this.state.presses += amount;
            this.state.lifetimePresses += amount;
            this.stats.totalPresses = Math.floor(this.state.lifetimePresses);
        }
        this.stats.currentPPS = pps; // For UI
    }

    save() {
        localStorage.setItem('kb_master_save', JSON.stringify({
            state: this.state,
            stats: this.stats
        }));
    }

    load() {
        const saved = localStorage.getItem('kb_master_save');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge to avoid breaking if data structure changes slightly

                this.state = {
                    ...this.state,
                    ...parsed.state,
                    // Ensure new properties are initialized if loading old save
                    manualPresses: parsed.state.manualPresses || 0,
                    unlockedKeys: parsed.state.unlockedKeys || [' ', 'w', 'a', 's', 'd']
                };
                this.stats = { ...this.stats, ...parsed.stats };
                this.recalcStats();
            } catch (e) {
                console.error('Save file corrupted', e);
            }
        }
    }

    reset() {
        localStorage.removeItem('kb_master_save');
        location.reload();
    }
}

// ==========================================
// MINIGAME SYSTEM
// ==========================================
class MinigameSystem {
    constructor(gameInstance, uiCallback) {
        this.game = gameInstance;
        this.uiCallback = uiCallback; // Function to update UI
        this.active = false;
        this.currentMinigame = null;
        this.timer = null;
        this.score = 0;
        this.lastPlayed = 0;
        this.cooldown = 15000; // 15s cooldown
    }



    startMinigame(type) {
        const now = Date.now();
        if (this.active || now - this.lastPlayed < this.cooldown) {
            return false;
        }

        // Prepare the game but don't start timer yet
        if (type === 'speed') {
            this.currentMinigame = {
                name: 'Speed Challenge',
                desc: 'Press SPACE as fast as you can!',
                duration: 10,
                timeLeft: 10,
                targetKey: ' ',
                score: 0,
                onPress: () => {
                    this.score++;
                    this.game.pressKey(this.game.calculateClickValue());
                },
                onEnd: () => {
                    const reward = this.score * 10;
                    this.game.pressKey(reward);
                    alert(`Speed Challenge Complete!\nScore: ${this.score}\nReward: +${reward} presses`);
                }
            };
        } else if (type === 'reaction') {
            this.currentMinigame = {
                name: 'Reaction Test',
                desc: 'Press the highlighted key efficiently!',
                duration: 15,
                timeLeft: 15,
                targetKey: null, // Will be set periodically
                score: 0,
                onStart: () => {
                    this.nextReactionKey();
                },
                onPress: (key) => {
                    if (key.toLowerCase() === this.currentMinigame.targetKey) {
                        this.score++;
                        this.game.pressKey(this.game.calculateClickValue() * 2); // Double value for accuracy
                        // Visual feedback handled by main loop, but we need to switch key
                        this.nextReactionKey();
                        return true;
                    }
                    return false;
                },
                onEnd: () => {
                    const reward = this.score * 25; // Higher reward for skill
                    this.game.pressKey(reward);
                    alert(`Reaction Test Complete!\nScore: ${this.score}\nReward: +${reward} presses`);
                }
            };
        }

        this.uiCallback('ready', this.currentMinigame);
    }

    nextReactionKey() {
        if (!this.currentMinigame) return;
        const keys = this.game.state.unlockedKeys;
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.currentMinigame.targetKey = randomKey;
        this.uiCallback('update_instruction', `Press: ${randomKey === ' ' ? 'SPACE' : randomKey.toUpperCase()}`);
    }

    confirmStart() {
        if (!this.currentMinigame) return;
        this.active = true;
        this.score = 0;

        if (this.currentMinigame.onStart) this.currentMinigame.onStart();

        this.uiCallback('start', this.currentMinigame);
        this.timer = setInterval(() => this.tick(), 100);
    }

    tick() {
        if (!this.active || !this.currentMinigame) return;

        this.currentMinigame.timeLeft -= 0.1;
        this.uiCallback('update', {
            time: this.currentMinigame.timeLeft,
            score: this.score
        });

        if (this.currentMinigame.timeLeft <= 0) {
            this.endMinigame();
        }
    }


    handleInput(key) {
        if (!this.active) return false;

        if (this.currentMinigame.name === 'Speed Challenge' && key === ' ') {
            this.currentMinigame.onPress();
            this.uiCallback('update', {
                time: this.currentMinigame.timeLeft,
                score: this.score
            });
            return true;
        } else if (this.currentMinigame.name === 'Reaction Test') {
            if (this.currentMinigame.onPress(key)) {
                this.uiCallback('update', {
                    time: this.currentMinigame.timeLeft,
                    score: this.score
                });
                return true;
            }
        }
        return false;
    }

    endMinigame() {
        clearInterval(this.timer);
        if (this.currentMinigame && this.currentMinigame.onEnd) {
            this.currentMinigame.onEnd();
        }
        this.active = false;
        this.currentMinigame = null;
        this.lastPlayed = Date.now();
        this.uiCallback('end');
    }
}

// ==========================================
// MAIN LOGIC
// ==========================================
const game = new Game();
const minigameSystem = new MinigameSystem(game, updateMinigameUI);

const ui = {
    totalPresses: document.getElementById('total-presses'),
    pps: document.getElementById('pps'),
    keysUnlocked: document.getElementById('keys-unlocked'),
    upgradesList: document.getElementById('upgrades-list'),
    achievementsList: document.getElementById('achievements-list'),
    leaderboardList: document.getElementById('leaderboard-list'),
    mainKey: document.getElementById('main-key'),
    floatingTextContainer: document.getElementById('floating-text-container'),
    minigameOverlay: document.getElementById('minigame-overlay'),
    minigameTitle: document.getElementById('minigame-title'),
    minigameDesc: document.getElementById('minigame-desc'),
    minigameTimer: document.getElementById('minigame-timer'),


    minigameScore: document.getElementById('minigame-score'),
    startMinigameBtn: document.getElementById('start-minigame-btn'),
    btnSpeed: document.getElementById('btn-speed'),

    btnReaction: document.getElementById('btn-reaction'),
    statusText: document.getElementById('minigame-status'),
    activeKeysList: document.getElementById('active-keys-list'),
    cornerProgress: document.getElementById('corner-progress'),
    cornerRemaining: document.getElementById('corner-remaining'),
    modal: null // For minigame popup
};

let lastTime = 0;

function init() {
    console.log('Initializing Keyboard Master...');
    renderUpgrades();
    renderAchievements();
    renderLeaderboard();

    // Load saved state
    updateUI();

    ui.btnSpeed.addEventListener('click', () => {
        try { minigameSystem.startMinigame('speed'); } catch (e) { console.error(e); }
    });

    ui.btnReaction.addEventListener('click', () => {
        try { minigameSystem.startMinigame('reaction'); } catch (e) { console.error(e); }
    });

    // Start Loop
    requestAnimationFrame(gameLoop);

    // Auto-save every 30s
    setInterval(() => game.save(), 30000);
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    game.tick(dt);
    minigameSystem.tick(dt);

    updateUI();
    checkAchievements();

    requestAnimationFrame(gameLoop);
}

function updateUI() {
    if (!ui.totalPresses) return;
    ui.totalPresses.innerText = Math.floor(game.state.presses).toLocaleString();

    ui.pps.innerText = game.stats.currentPPS.toFixed(1);

    // Update Keys Unlocked display with progress
    const nextUnlockIndex = game.state.unlockedKeys.length - 5;
    const nextMilestone = (nextUnlockIndex + 1) * 1000;

    // If we have keys to unlock
    if (nextUnlockIndex < UNLOCK_ORDER.length) {
        ui.keysUnlocked.innerHTML = `${game.state.unlockedKeys.length} <span style="font-size:0.6em; color:var(--text-muted)">(${game.state.manualPresses}/${nextMilestone})</span>`;
    } else {
        ui.keysUnlocked.innerHTML = `${game.state.unlockedKeys.length} <span style="font-size:0.6em; color:var(--accent-color)">(MAX)</span>`;
    }

    if (ui.activeKeysList) {
        ui.activeKeysList.innerText = "Active Keys: " + game.state.unlockedKeys.map(k => k === ' ' ? 'Space' : k.toUpperCase()).join(', ');
    }


    // Update upgrade buttons (expensive to do every frame, maybe throttle?)
    // For now just do it every 10 frames or so if performance lags
    updateUpgradeAvailability();
    updateChallengeButton();
    updateCornerCounter();
}

function updateCornerCounter() {
    if (!ui.cornerProgress) return;

    const nextUnlockIndex = game.state.unlockedKeys.length - 5;
    const nextMilestone = (nextUnlockIndex + 1) * 1000;

    if (nextUnlockIndex < UNLOCK_ORDER.length) {
        ui.cornerProgress.innerHTML = `<span style="color:white">${game.state.manualPresses}</span> / ${nextMilestone}`;
        ui.cornerRemaining.innerText = `${nextMilestone - game.state.manualPresses} clicks to go!`;
    } else {
        ui.cornerProgress.innerText = "ALL UNLOCKED";
        ui.cornerRemaining.innerText = "You are a Keyboard Master!";
    }
}

function updateChallengeButton() {
    const now = Date.now();
    const timeLeft = Math.max(0, (minigameSystem.lastPlayed + minigameSystem.cooldown) - now);

    if (minigameSystem.active) {
        ui.statusText.innerText = "Challenge In Progress...";
        ui.btnSpeed.disabled = true;
        ui.btnReaction.disabled = true;
    } else if (timeLeft > 0) {
        ui.statusText.innerText = `Cooldown: ${(timeLeft / 1000).toFixed(1)}s`;
        ui.btnSpeed.disabled = true;
        ui.btnReaction.disabled = true;
    } else {
        ui.statusText.innerText = "Ready to start!";
        ui.btnSpeed.disabled = false;
        ui.btnReaction.disabled = false;
    }
}

function updateUpgradeAvailability() {
    if (!ui.upgradesList) return;
    const items = document.querySelectorAll('.upgrade-item');
    items.forEach(item => {
        const cost = parseInt(item.dataset.cost);
        if (game.state.presses >= cost) {
            item.classList.remove('disabled');
        } else {
            item.classList.add('disabled');
        }
    });
}

// Input Handling
document.addEventListener('keydown', (e) => {
    if (e.repeat) return; // Prevent holding down key spamming too easily? Maybe allow it for auto-clickers later.

    const key = e.key;
    console.log('Key pressed:', key); // Debugging

    // Minigame override
    if (minigameSystem.active) {
        if (minigameSystem.handleInput(key)) {
            spawnFloatingText(key, '+1', true); // Visual feedback only
            animateKey(key);
        }
        return;
    }


    // Normal Gameplay (Space or user selected keys)
    if (game.isKeyUnlocked(key)) {
        const value = game.handleManualPress();
        spawnFloatingText(key, `+${value.toFixed(1)}`);
        animateKey(key);
        playClickSound();
        updateUI(); // Immediate feedback
    }
});

/*
 * MOUSE INTERACTION REMOVED to enforce physical key pressing.
 * User requested: "make it so the player has to press the space bar physicaly"
 */
// ui.mainKey.addEventListener('mousedown', ...);


// Visuals
function spawnFloatingText(key, text, isMinigame = false) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;

    // Randomize start position slightly around center
    const rect = ui.mainKey.getBoundingClientRect();
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 20 - 10;

    el.style.left = `calc(50% + ${x}px)`;
    el.style.top = `calc(50% + ${y}px)`;

    if (isMinigame) el.style.color = '#ec4899'; // Pink for minigame

    ui.floatingTextContainer.appendChild(el);

    setTimeout(() => el.remove(), 1000);
}

function animateKey(key) {
    ui.mainKey.classList.add('pressed');
    setTimeout(() => ui.mainKey.classList.remove('pressed'), 50);
}

function playClickSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // If state is suspended (common in browsers before interaction), resume
        if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.error(e));
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.warn('Audio error:', e);
    }
}

// Rendering Lists
function renderUpgrades() {
    ui.upgradesList.innerHTML = UPGRADES.map(u => {
        const cost = u.baseCost; // Initial cost for display
        return `
      <div class="upgrade-item disabled" data-id="${u.id}" data-cost="${cost}">
        <div style="display:flex; justify-content:space-between;">
          <h3>${u.name}</h3>
          <span class="upgrade-cost" id="cost-${u.id}">${cost}</span>
        </div>
        <p class="upgrade-desc">${u.desc}</p>
        <div style="font-size:0.7em; margin-top:5px; color:#64748b">Owned: <span id="count-${u.id}">0</span></div>
      </div>
    `;
    }).join('');

    // Add click listeners
    document.querySelectorAll('.upgrade-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            if (game.buyUpgrade(id)) {
                // Update cost display
                const nextCost = game.getUpgradeCost(id);
                const ownedCount = game.state.upgradesOwned.find(u => u.id === id).count;
                document.getElementById(`cost-${id}`).innerText = nextCost;
                document.getElementById(`count-${id}`).innerText = ownedCount;
                item.dataset.cost = nextCost;
                updateUI(); // Flush UI immediately
            }
        });
    });
}

function renderAchievements() {
    ui.achievementsList.innerHTML = ACHIEVEMENTS.map(a => `
     <div class="achievement-item" id="achieve-${a.id}">
       <div class="achieve-icon">${a.icon}</div>
       <div class="achieve-info">
         <h4>${a.name}</h4>
         <p class="achieve-desc">${a.desc}</p>
       </div>
     </div>
  `).join('');
}

function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
        if (!game.state.achievementsUnlocked.includes(a.id)) {
            if (a.condition(game)) {
                game.state.achievementsUnlocked.push(a.id);
                unlockAchievementUI(a.id);
                // Show notification?
            }
        } else {
            // Ensure UI is unlocked if loaded from save
            const el = document.getElementById(`achieve-${a.id}`);
            if (el && !el.classList.contains('unlocked')) el.classList.add('unlocked');
        }
    });
}

function unlockAchievementUI(id) {
    const el = document.getElementById(`achieve-${id}`);
    if (el) {
        el.classList.add('unlocked');
        // Animate flash?
    }
}

function renderLeaderboard() {
    // Sort by score
    const sorted = MOCK_LEADERBOARD.sort((a, b) => b.score - a.score);
    ui.leaderboardList.innerHTML = sorted.map((entry, index) => `
    <div style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
      <span>#${index + 1} ${entry.name}</span>
      <span style="color:var(--accent-color)">${entry.score.toLocaleString()}</span>
    </div>
  `).join('');
}

// Minigame UI Callback
function updateMinigameUI(action, data) {
    if (action === 'ready') {
        ui.minigameOverlay.classList.remove('hidden');
        ui.minigameTitle.innerText = data.name;
        ui.minigameDesc.innerText = data.desc;
        ui.minigameTimer.innerText = `Time: ${data.duration}s`;
        ui.minigameScore.innerText = `Score: 0`;
        ui.startMinigameBtn.classList.remove('hidden');
        ui.startMinigameBtn.onclick = () => {
            minigameSystem.confirmStart();
            ui.startMinigameBtn.classList.add('hidden'); // Hide button during play
        };
    } else if (action === 'start') {
        // Game active, timer updates automatically

    } else if (action === 'update') {
        ui.minigameTimer.innerText = `Time: ${Math.max(0, data.time).toFixed(1)}s`;
        ui.minigameScore.innerText = `Score: ${data.score}`;
    } else if (action === 'update_instruction') {
        ui.minigameDesc.innerText = data;
        ui.minigameDesc.style.color = '#ec4899';
        ui.minigameDesc.style.fontWeight = 'bold';
        ui.minigameDesc.style.fontSize = '1.5em';
    } else if (action === 'end') {
        // Keep overlay open for a second or show result?
        // Alert logic in minigame.js handles result. 
        // Just close overlay after a moment
        setTimeout(() => {
            ui.minigameOverlay.classList.add('hidden');
        }, 1000);
    }
}

// Start
window.addEventListener('load', init);
