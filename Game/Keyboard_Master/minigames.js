
export class MinigameSystem {
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
                score: 0, // Track specific score here
                onPress: () => {
                    this.score++;
                    this.game.pressKey(this.game.calculateClickValue());
                },
                onEnd: () => {
                    const reward = this.score * 10;
                    this.game.pressKey(reward);
                    alert(`Time's up! Score: ${this.score}. Reward: +${reward} presses`);
                }
            };
        }

        this.uiCallback('ready', this.currentMinigame);
    }

    confirmStart() {
        if (!this.currentMinigame) return;
        this.active = true;
        this.score = 0;
        this.uiCallback('start', this.currentMinigame);
        this.timer = setInterval(() => this.tick(), 100); // 100ms tick for smooth timer
    }

    tick() {
        if (!this.active || !this.currentMinigame) return;

        this.currentMinigame.timeLeft -= 0.1;
        this.uiCallback('update', { time: this.currentMinigame.timeLeft, score: this.score });

        if (this.currentMinigame.timeLeft <= 0) {
            this.endMinigame();
        }
    }

    handleInput(key) {
        if (!this.active) return false;

        if (this.currentMinigame.name === 'Speed Challenge' && key === ' ') {
            this.currentMinigame.onPress();
            this.uiCallback('update', { time: this.currentMinigame.timeLeft, score: this.score });
            return true;
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
