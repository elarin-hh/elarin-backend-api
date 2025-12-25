export interface MLConfig {
    maxFrames: number;
    minFrames: number;
    predictionInterval: number;
    threshold: number;
}

export interface FeedbackConfig {
    feedbackMode: 'hybrid' | 'ml_only' | 'heuristic_only';
    mlWeight: number;
    heuristicWeight: number;
    maxFeedbackItems: number;
}

export interface HeuristicConfig {
    minConfidence?: number;
    kneeDownAngle?: number;
    kneeUpAngle?: number;
    maxTrunkInclination?: number;
    maxLateralInclination?: number;
    maxAngleDifference?: number;
    minFramesInState?: number;
    minFootDistance?: number;
    maxFootDistance?: number;
}

export interface ExerciseMetric {
    id: string;
    type: string;
    target?: number;
    label: string;
    unit: string;
    display?: string;
    showIn: string[];
}

export interface FixedExerciseConfig {
    feedbackCooldownMs: number;
    analysisInterval: number;
    mlConfig: MLConfig;
    feedbackConfig: FeedbackConfig;
    components: string[];
    heuristicConfig?: Partial<HeuristicConfig>;
}

export interface DefaultExerciseConfig {
    heuristicConfig: HeuristicConfig;
    metrics?: ExerciseMetric[];
}

export interface ExerciseConfigOverride {
    heuristicConfig?: Partial<HeuristicConfig>;
    metrics?: Partial<ExerciseMetric>[];
}

export interface ExerciseConfig {
    exerciseName: string;
    modelPath?: string;

    _fixed: FixedExerciseConfig;

    _defaults: DefaultExerciseConfig;

    completion?: {
        mode: 'any' | 'all' | 'manual';
        metrics?: string[];
    };
}

export interface MergedExerciseConfig {
    exerciseName: string;
    modelPath?: string;

    feedbackCooldownMs: number;
    analysisInterval: number;
    mlConfig: MLConfig;
    feedbackConfig: FeedbackConfig;
    components: string[];

    heuristicConfig: HeuristicConfig;
    metrics?: ExerciseMetric[];

    completion?: {
        mode: 'any' | 'all' | 'manual';
        metrics?: string[];
    };
}

export function isVariableConfigKey(key: string): boolean {
    const allowedKeys = ['heuristicConfig', 'metrics'];
    return allowedKeys.includes(key);
}

export function validateOverride(override: any): override is ExerciseConfigOverride {
    if (!override || typeof override !== 'object') {
        return false;
    }

    const keys = Object.keys(override);
    return keys.every(key => isVariableConfigKey(key));
}
