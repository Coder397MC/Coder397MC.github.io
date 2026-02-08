
import { UPGRADES } from './data.js';

export class Game {
    constructor() {
        this.state = {
            presses: 0,
            lifetimePresses: 0,
            pps: 0,
            clickValue: 1,
            multiplier: 1.0,
            startTime: Date.now(),
            upgradesOwned: UPGRADES.map(u => ({ id: u.id, count: 0 })),
            achievementsUnlocked: []
        };

        this.stats = {
            totalPresses: 0,
            currentPPS: 0,
            maxPPS: 0
        };

        // Load save if exists
        this.load();
    }

    pressKey(amount = this.calculateClickValue()) {
        this.state.presses += amount;
        this.state.lifetimePresses += amount;
        this.stats.totalPresses = this.state.lifetimePresses; // sync
        return amount;
    }

    calculateClickValue() {
        let base = 1;
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
                this.state = { ...this.state, ...parsed.state };
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
