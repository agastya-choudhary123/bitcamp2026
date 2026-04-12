import json
import math
import random
import sys

def sigmoid(x):
    return 1 / (1 + math.exp(-max(-500, min(500, x))))

def clamp(v, low=0, high=1):
    return max(low, min(high, v))

def gaussian(mean, std):
    return random.gauss(mean, std)

# FEATURE DEFINITIONS
FEATURE_KEYS = [
    'fEAR', 'fPERCLOS', 'fYawn', 'fSlowBlink', 'fBlinkVar',
    'fYaw', 'fPitch', 'fRoll', 'fEntropy', 'fTremor', 'fJerk',
    'fClosureDur', 'fDistractDur', 'fPhoneDur', 'fMissingDur',
    'fAsymmetry', 'fPosture', 'isFacingForward'
]
LABEL_KEYS = ['drowsy', 'intoxicated', 'distracted', 'phone_use', 'alert', 'medical']

def generate_50k_dataset(count=50000):
    print(f"Synthesizing {count} behavioral clusters...")
    data = []
    archetypes = ['alert', 'drowsy_L1', 'drowsy_L2', 'intoxicated', 'distracted', 'phone', 'medical', 'mirror_noise']
    
    for i in range(count):
        arch = random.choice(archetypes)
        f = { k: clamp(gaussian(0.1, 0.08)) for k in FEATURE_KEYS }
        l = { k: 0 for k in LABEL_KEYS }
        f['isFacingForward'] = 1.0

        if arch == 'alert':
            l['alert'] = 1
        elif arch == 'drowsy_L1':
            f['fYawn'] = clamp(gaussian(0.8, 0.15))
            f['fEAR'] = clamp(gaussian(0.4, 0.2))
            l['drowsy'] = 1
        elif arch == 'drowsy_L2':
            f['fPERCLOS'] = clamp(gaussian(0.85, 0.1))
            f['fEAR'] = clamp(gaussian(0.9, 0.1))
            l['drowsy'] = 1
        elif arch == 'intoxicated':
            f['fEntropy'] = clamp(gaussian(0.9, 0.1))
            f['fTremor'] = clamp(gaussian(0.7, 0.1))
            f['fBlinkVar'] = clamp(gaussian(0.6, 0.2))
            l['intoxicated'] = 1
        elif arch == 'distracted':
            f['fYaw'] = clamp(gaussian(0.9, 0.1))
            f['fDistractDur'] = clamp(gaussian(0.8, 0.15))
            f['isFacingForward'] = 0.0
            l['distracted'] = 1
        elif arch == 'phone':
            f['fPhoneDur'] = clamp(gaussian(1.0, 0.05))
            f['fPitch'] = clamp(gaussian(0.6, 0.2))
            f['isFacingForward'] = 0.0
            l['phone_use'] = 1
        elif arch == 'medical':
            f['fRoll'] = clamp(gaussian(0.9, 0.1))
            f['fPosture'] = clamp(gaussian(0.9, 0.1))
            f['fAsymmetry'] = clamp(gaussian(0.8, 0.15))
            l['medical'] = 1
        elif arch == 'mirror_noise':
            # STRESS TEST: High yaw + high jitter = Still ALERT/DISTRACTED, NOT INTOXICATED
            f['fYaw'] = clamp(gaussian(0.85, 0.1))
            f['fBlinkVar'] = clamp(gaussian(0.7, 0.15))
            f['fEntropy'] = clamp(gaussian(0.3, 0.1))
            f['isFacingForward'] = 0.0
            l['distracted'] = 1

        data.append(( [f[k] for k in FEATURE_KEYS], [l[k] for k in LABEL_KEYS] ))
    return data

def train():
    data = generate_50k_dataset(50000)
    random.shuffle(data)
    split = 40000
    train_set = data[:split]
    test_set = data[split:]

    # ARCHITECTURE: 18 -> 12 -> 6
    I_DIM, H_DIM, O_DIM = 18, 12, 6
    
    # Init Weights (Xavier-like)
    w1 = [[random.uniform(-0.1, 0.1) for _ in range(H_DIM)] for _ in range(I_DIM)]
    b1 = [0.0 for _ in range(H_DIM)]
    w2 = [[random.uniform(-0.1, 0.1) for _ in range(O_DIM)] for _ in range(H_DIM)]
    b2 = [0.0 for _ in range(O_DIM)]

    lr = 0.05
    epochs = 15

    print("--- STARTING DEEP NEURAL TRAINING (50K SAMPLES) ---")
    for epoch in range(epochs):
        error = 0
        for x, y in train_set:
            # 1. Forward Hidden
            h_in = [sum(x[i] * w1[i][j] for i in range(I_DIM)) + b1[j] for j in range(H_DIM)]
            h_out = [sigmoid(val) for val in h_in]
            
            # 2. Forward Output
            o_in = [sum(h_out[j] * w2[j][k] for j in range(H_DIM)) + b2[k] for k in range(O_DIM)]
            o_out = [sigmoid(val) for val in o_in]

            # 3. Backprop Output
            do = [(o_out[k] - y[k]) * o_out[k] * (1 - o_out[k]) for k in range(O_DIM)]
            
            # 4. Backprop Hidden
            dh = [sum(do[k] * w2[j][k] for k in range(O_DIM)) * h_out[j] * (1 - h_out[j]) for j in range(H_DIM)]

            # 5. Update Layer 2
            for j in range(H_DIM):
                for k in range(O_DIM):
                    w2[j][k] -= lr * do[k] * h_out[j]
                b2[k] -= lr * do[k]
            
            # 6. Update Layer 1
            for i in range(I_DIM):
                for j in range(H_DIM):
                    w1[i][j] -= lr * dh[j] * x[i]
                b1[j] -= lr * dh[j]

            error += sum((o_out[k] - y[k])**2 for k in range(O_DIM))
        
        print(f"Epoch {epoch+1}/{epochs} | Avg Loss: {round(error/(len(train_set)*O_DIM), 6)}")

    # VALIDATION
    correct = 0
    for x, y in test_set:
        h_out = [sigmoid(sum(x[i] * w1[i][j] for i in range(I_DIM)) + b1[j]) for j in range(H_DIM)]
        o_out = [sigmoid(sum(h_out[j] * w2[j][k] for j in range(H_DIM)) + b2[k]) for k in range(O_DIM)]
        
        match = True
        for k in range(O_DIM):
            if (o_out[k] >= 0.70) != (y[k] == 1):
                match = False
                break
        if match: correct += 1
    
    print(f"--- TRAINING COMPLETE ---")
    print(f"Validation Accuracy: {round((correct/len(test_set))*100, 2)}%")

    # SAVE
    model = {
        "w1": w1, "b1": b1,
        "w2": w2, "b2": b2,
        "features": FEATURE_KEYS,
        "labels": LABEL_KEYS
    }
    with open('src/AI/state_engine/neural_weights.json', 'w') as f:
        json.dump(model, f)

if __name__ == "__main__":
    train()
