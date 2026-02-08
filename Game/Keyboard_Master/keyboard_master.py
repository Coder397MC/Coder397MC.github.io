import os
import time
import json
import threading
import msvcrt
import random
from datetime import datetime

# ==========================================
# CONFIG & DATA
# ==========================================
SAVE_FILE = "keyboard_master_save.json"

UPGRADES = [
    {"id": "mechanical_switch", "name": "Mechanical Switches", "baseCost": 15, "bonus": 1, "type": "click", "costFactor": 1.5, "desc": "+1 Press per key"},
    {"id": "auto_clicker", "name": "Auto-Key Presser", "baseCost": 100, "bonus": 1, "type": "auto", "costFactor": 1.2, "desc": "+1 Press/sec"},
    {"id": "rgb_lighting", "name": "RGB Lighting", "baseCost": 500, "multiplier": 1.1, "type": "global_mult", "costFactor": 2.0, "desc": "x1.1 Multiplier"},
    {"id": "streamer_setup", "name": "Streamer Setup", "baseCost": 1200, "bonus": 5, "type": "auto", "costFactor": 1.3, "desc": "+5 Press/sec"},
    {"id": "golden_caps", "name": "Golden Keycaps", "baseCost": 5000, "bonus": 10, "type": "click", "costFactor": 1.4, "desc": "+10 Press per key"},
    {"id": "server_bot", "name": "Server Bot Farm", "baseCost": 25000, "bonus": 50, "type": "auto", "costFactor": 1.5, "desc": "+50 Press/sec"},
    {"id": "quantum_keyboard", "name": "Quantum Keyboard", "baseCost": 100000, "multiplier": 2.0, "type": "global_mult", "costFactor": 5.0, "desc": "x2.0 Multiplier"}
]

UNLOCK_ORDER = ['q', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm']

# ==========================================
# GAME LOGIC
# ==========================================
class Game:
    def __init__(self):
        self.state = {
            "presses": 0,
            "lifetimePresses": 0,
            "manualPresses": 0,
            "upgradesOwned": {u["id"]: 0 for u in UPGRADES},
            "unlockedKeys": [' ', 'w', 'a', 's', 'd']
        }
        self.running = True
        self.message = ""
        self.menu = "main" # main, upgrades, minigame

    def load(self):
        if os.path.exists(SAVE_FILE):
            try:
                with open(SAVE_FILE, 'r') as f:
                    data = json.load(f)
                    # Merge loop to ensure new updates don't break old saves
                    for k, v in data.items():
                        if k == "upgradesOwned":
                            # Merge upgrades specifically
                            for uid, count in v.items():
                                self.state["upgradesOwned"][uid] = count
                        else:
                            self.state[k] = v
                self.message = "Save loaded!"
            except:
                self.message = "Save file corrupted or incompatible."

    def save(self):
        with open(SAVE_FILE, 'w') as f:
            json.dump(self.state, f)
        self.message = "Game Saved!"

    def calculate_click_value(self):
        base = 1 + (len(self.state["unlockedKeys"]) - 5)
        
        for u in UPGRADES:
            count = self.state["upgradesOwned"].get(u["id"], 0)
            if u["type"] == "click":
                base += u["bonus"] * count
        
        multiplier = 1.0
        for u in UPGRADES:
            if u["type"] == "global_mult":
                count = self.state["upgradesOwned"].get(u["id"], 0)
                if count > 0:
                    multiplier *= (u["multiplier"] ** count)
        
        return base * multiplier

    def calculate_pps(self):
        pps = 0
        for u in UPGRADES:
            if u["type"] == "auto":
                count = self.state["upgradesOwned"].get(u["id"], 0)
                pps += u["bonus"] * count
        
        multiplier = 1.0
        for u in UPGRADES:
            if u["type"] == "global_mult":
                count = self.state["upgradesOwned"].get(u["id"], 0)
                if count > 0:
                    multiplier *= (u["multiplier"] ** count)
        return pps * multiplier

    def manual_press(self):
        self.state["manualPresses"] += 1
        val = self.calculate_click_value()
        self.state["presses"] += val
        self.state["lifetimePresses"] += val
        
        # Unlock logic
        next_idx = len(self.state["unlockedKeys"]) - 5
        if next_idx < len(UNLOCK_ORDER):
            milestone = (next_idx + 1) * 1000
            if self.state["manualPresses"] >= milestone:
                new_key = UNLOCK_ORDER[next_idx]
                self.state["unlockedKeys"].append(new_key)
                self.message = f"!!! UNLOCKED NEW KEY: {new_key.upper()} !!!"
                self.save()

    def tick(self, dt):
        pps = self.calculate_pps()
        if pps > 0:
            add = pps * dt
            self.state["presses"] += add
            self.state["lifetimePresses"] += add

    def get_upgrade_cost(self, u_id):
        u = next((x for x in UPGRADES if x["id"] == u_id), None)
        count = self.state["upgradesOwned"].get(u_id, 0)
        return int(u["baseCost"] * (u["costFactor"] ** count))

    def buy_upgrade(self, index):
        if 0 <= index < len(UPGRADES):
            u_id = UPGRADES[index]["id"]
            cost = self.get_upgrade_cost(u_id)
            if self.state["presses"] >= cost:
                self.state["presses"] -= cost
                self.state["upgradesOwned"][u_id] += 1
                self.message = f"Purchased {UPGRADES[index]['name']}!"
            else:
                self.message = "Not enough presses!"

# ==========================================
# DISPLAY & INPUT
# ==========================================
game = Game()
game.load()

def input_thread(game):
    while game.running:
        if msvcrt.kbhit():
            key = msvcrt.getch()
            try:
                char = key.decode('utf-8').lower()
            except:
                continue

            if game.menu == "main":
                if char == 'q': # Quit
                    game.running = False
                elif char == 'u':
                    game.menu = "upgrades"
                elif char == 'm':
                    game.menu = "minigame"
                elif char in game.state["unlockedKeys"]:
                    game.manual_press()
                elif char == ' ': # Spacebar check
                    if ' ' in game.state["unlockedKeys"]:
                        game.manual_press()
            
            elif game.menu == "upgrades":
                if char == 'x':
                    game.menu = "main"
                elif char.isdigit():
                    idx = int(char) - 1
                    game.buy_upgrade(idx)
            
            elif game.menu == "minigame":
                if char == 'x':
                    game.menu = "main"
                elif char == 's': # Speed run
                    run_speed_minigame(game)
                elif char == 'r': # Reaction
                    run_reaction_minigame(game)

def run_speed_minigame(game):
    print("\n--- SPEED CHALLENGE ---")
    print("Press SPACE as fast as possible for 10 seconds!")
    print("Press standard ENTER to start...")
    input()
    
    start_time = time.time()
    clicks = 0
    while time.time() - start_time < 10:
        if msvcrt.kbhit():
            key = msvcrt.getch()
            if key == b' ':
                clicks += 1
                print(f"Click! ({clicks})", end='\r')
    
    reward = clicks * 10 * game.calculate_click_value()
    game.state["presses"] += reward
    game.message = f"Challenge Result: {clicks} clicks. Reward: {int(reward)} presses."
    game.menu = "main"

def run_reaction_minigame(game):
    # Simplified reaction game for console
    print("\n--- REACTION TEST ---")
    print("Press the key SHOWN on screen.")
    print("Press ENTER to start...")
    input()
    
    mapping = game.state["unlockedKeys"]
    score = 0
    start_time = time.time()
    
    while time.time() - start_time < 15:
        target = random.choice(mapping)
        target_display = "SPACE" if target == ' ' else target.upper()
        
        print(f"\nPRESS >>> [ {target_display} ] <<<")
        
        pressed = False
        while not pressed and time.time() - start_time < 15:
            if msvcrt.kbhit():
                key = msvcrt.getch()
                try:
                    char = key.decode('utf-8').lower()
                    if char == target:
                        score += 1
                        print("GOOD!")
                        game.state["presses"] += game.calculate_click_value() * 5
                        pressed = True
                    else:
                        print("MISS!")
                        pressed = True # Skip to next
                except:
                    pass
    
    game.message = f"Reaction Test Over! Score: {score}"
    game.menu = "main"

# Start input listener
t = threading.Thread(target=input_thread, args=(game,))
t.start()

# Main Loop
try:
    while game.running:
        game.tick(0.1)
        
        # Render
        os.system('cls' if os.name == 'nt' else 'clear')
        print("========================================")
        print("      KEYBOARD MASTER (CMD Edition)")
        print("========================================")
        print(f"PRESSES: {int(game.state['presses']):,}")
        print(f"PPS:     {game.calculate_pps():.1f} / sec")
        print(f"CLICK:   {int(game.calculate_click_value()):,}")
        print("----------------------------------------")
        
        # Unlock Progress
        next_idx = len(game.state["unlockedKeys"]) - 5
        if next_idx < len(UNLOCK_ORDER):
            milestone = (next_idx + 1) * 1000
            print(f"Next Unlock: {game.state['manualPresses']} / {milestone} clicks ({UNLOCK_ORDER[next_idx].upper()})")
        else:
            print("ALL KEYS UNLOCKED (MAX)")
            
        print("----------------------------------------")
        print(f"Keys Unlocked: {len(game.state['unlockedKeys'])}")
        keys_str = ", ".join([k.upper() if k != ' ' else 'SPACE' for k in game.state['unlockedKeys']])
        # Wrap keys text
        print(f"Active: {keys_str[:60]}..." if len(keys_str) > 60 else f"Active: {keys_str}")
        print("----------------------------------------")
        
        if game.message:
            print(f"> MESSAGE: {game.message}")
            # game.message = "" # Don't clear immediately so user can read it
        
        print("----------------------------------------")
        
        if game.menu == "main":
            print("[SPACE / Active Keys] : Press for Points")
            print("[U] : Upgrades Shop")
            print("[M] : Minigames")
            print("[Q] : Save & Quit")
            
        elif game.menu == "upgrades":
            print("--- UPGRADES SHOP ---")
            for i, u in enumerate(UPGRADES):
                cost = game.get_upgrade_cost(u["id"])
                owned = game.state["upgradesOwned"][u["id"]]
                can_buy = "[BUY]" if game.state["presses"] >= cost else "[---]"
                print(f"[{i+1}] {can_buy} {u['name']} (Lvl {owned}) - Cost: {cost}")
                print(f"    Effect: {u['desc']}")
            print("\n[Number] Buy Upgrade  |  [X] Back")
            
        elif game.menu == "minigame":
            print("--- MINIGAMES ---")
            print("[S] Speed Challenge (10s Mash)")
            print("[R] Reaction Test (15s Skill)")
            print("[X] Back")

        time.sleep(0.1)

except KeyboardInterrupt:
    game.running = False

game.save()
print("\nGame Saved. Goodbye!")
# Ensure input thread dies or we exit
os._exit(0)
