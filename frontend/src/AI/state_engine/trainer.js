import * as tf from '@tensorflow/tfjs';
import fs from 'fs';

/**
 * BEHAVIORAL TRAINER
 * 
 * Uses Gradient Descent to optimize the Weight Matrix against
 * research-backed archetypes.
 */

async function train() {
    console.log("--- STARTING BEHAVIORAL WEIGHT OPTIMIZATION ---");
    
    // 1. Load Archetypes
    const data = JSON.parse(fs.readFileSync('./src/AI/state_engine/training_samples.json', 'utf8'));
    
    const featureKeys = [
        'fEAR', 'fPERCLOS', 'fYawn', 'fSlowBlink', 'fBlinkVar',
        'fYaw', 'fPitch', 'fRoll', 'fEntropy', 'fTremor', 'fJerk',
        'fClosureDur', 'fDistractDur', 'fPhoneDur', 'fMissingDur',
        'fAsymmetry', 'fPosture', 'isFacingForward'
    ];
    
    const labelKeys = ['drowsy', 'intoxicated', 'distracted', 'phone_use', 'alert'];

    const xs = tf.tensor2d(data.map(s => featureKeys.map(k => s.features[k] || 0)));
    const ys = tf.tensor2d(data.map(s => labelKeys.map(k => s.labels[k] || 0)));

    // 2. Define Model (Multi-label Sigmoid)
    const model = tf.sequential();
    model.add(tf.layers.dense({
        units: labelKeys.length,
        inputShape: [featureKeys.length],
        activation: 'sigmoid',
        kernelInitializer: 'zeros',
        biasInitializer: 'zeros'
    }));

    model.compile({
        optimizer: tf.train.adam(0.1),
        loss: 'binaryCrossentropy'
    });

    // 3. Train
    console.log("Optimizing weights...");
    await model.fit(xs, ys, {
        epochs: 500,
        verbose: 0
    });

    const finalLoss = model.evaluate(xs, ys);
    console.log(`Optimization Complete. Final Loss: ${finalLoss.toString()}`);

    // 4. Extract Learned Weights
    const weights = model.layers[0].getWeights()[0].arraySync();
    const biases = model.layers[0].getWeights()[1].arraySync();

    const result = {};
    labelKeys.forEach((label, i) => {
        result[label] = { bias: biases[i] };
        featureKeys.forEach((feat, j) => {
            if (Math.abs(weights[j][i]) > 0.05) { // Filter out low influence for readability
                result[label][feat] = parseFloat(weights[j][i].toFixed(4));
            }
        });
    });

    fs.writeFileSync('./src/AI/state_engine/learned_weights.json', JSON.stringify(result, null, 2));
    console.log("Learned weights saved to learned_weights.json");
}

train().catch(console.error);
