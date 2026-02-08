
import { Game } from './game.js';
import { UPGRADES, ACHIEVEMENTS, MOCK_LEADERBOARD } from './data.js';
import { MinigameSystem } from './minigames.js';

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
    challengeBtn: document.getElementById('challenge-btn'), // The main UI button
    modal: null // For minigame popup
};

let lastTime = 0;

function init() {
    renderUpgrades();
    renderAchievements();
    renderLeaderboard();

    // Load saved state
    updateUI();

    ui.challengeBtn.addEventListener('click', () => {
        minigameSystem.startMinigame('speed');
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
    ui.totalPresses.innerText = Math.floor(game.state.presses).toLocaleString();
    ui.pps.innerText = game.stats.currentPPS.toFixed(1);
    ui.keysUnlocked.innerText = game.state.upgradesOwned.length; // Placeholder logic

    // Update upgrade buttons (expensive to do every frame, maybe throttle?)
    // For now just do it every 10 frames or so if performance lags
    updateUpgradeAvailability();
    updateChallengeButton();
}

function updateChallengeButton() {
    const now = Date.now();
    const timeLeft = Math.max(0, (minigameSystem.lastPlayed + minigameSystem.cooldown) - now);

    if (minigameSystem.active) {
        ui.challengeBtn.innerText = "Challenge Active!";
        ui.challengeBtn.disabled = true;
    } else if (timeLeft > 0) {
        ui.challengeBtn.innerText = `Cooldown: ${(timeLeft / 1000).toFixed(1)}s`;
        ui.challengeBtn.disabled = true;
    } else {
        ui.challengeBtn.innerText = "Start Challenge (Ready)";
        ui.challengeBtn.disabled = false;
    }
}

function updateUpgradeAvailability() {
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

    // Minigame override
    if (minigameSystem.active) {
        if (minigameSystem.handleInput(key)) {
            spawnFloatingText(key, '+1', true); // Visual feedback only
            animateKey(key);
        }
        return;
    }

    // Normal Gameplay (Space or user selected keys)
    if (key === ' ' || key.toLowerCase() === 'a' || key.toLowerCase() === 'w' || key.toLowerCase() === 's' || key.toLowerCase() === 'd') {
        const value = game.calculateClickValue();
        game.pressKey(value);
        spawnFloatingText(key, `+${value.toFixed(1)}`);
        animateKey(key);
        playClickSound();
    }
});

ui.mainKey.addEventListener('mousedown', () => {
    const value = game.calculateClickValue();
    game.pressKey(value);
    spawnFloatingText('Space', `+${value.toFixed(1)}`);
    animateKey(' ');
    playClickSound();
});


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
    // Simple oscillator beep for now
    // In a real app, use Howler.js or AudioBuffer
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
init();
