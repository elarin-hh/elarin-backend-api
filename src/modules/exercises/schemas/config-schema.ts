/**
 * Schema definitions for exercise configurations
 * Separates FIXED (immutable system configs) from VARIABLE (user-customizable params)
 */

/**
 * ML Configuration (FIXED - system-level)
 */
export interface MLConfig {
    maxFrames: number;
    minFrames: number;
    predictionInterval: number;
    threshold: number;
}

/**
 * Feedback Configuration (FIXED - system-level)
 */
export interface FeedbackConfig {
    feedbackMode: 'hybrid' | 'ml_only' | 'heuristic_only';
    mlWeight: number;
    heuristicWeight: number;
    maxFeedbackItems: number;
}

/**
 * Heuristic Configuration (VARIABLE - user-customizable)
 * These are biomechanical parameters that can vary per user
 */
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
    // Additional biomechanical parameters can be added here
}

/**
 * Exercise Metric Definition (VARIABLE - targets can be customized)
 */
export interface ExerciseMetric {
    id: string;
    type: string;
    target?: number; // Customizable per user
    label: string;
    unit: string;
    display?: string;
    showIn: string[];
}

/**
 * FIXED Configuration Section
 * These values should NEVER be overridden by database configs
 */
export interface FixedExerciseConfig {
    feedbackCooldownMs: number;
    analysisInterval: number;
    mlConfig: MLConfig;
    feedbackConfig: FeedbackConfig;
    components: string[];
    // Allow SOME heuristic configs to be fixed (e.g. minConfidence)
    heuristicConfig?: Partial<HeuristicConfig>;
}

/**
 * DEFAULT (Variable) Configuration Section
 * These are default values that CAN be overridden by database configs
 */
export interface DefaultExerciseConfig {
    heuristicConfig: HeuristicConfig;
    metrics?: ExerciseMetric[];
}

/**
 * Database Override Configuration
 * Only contains user-customizable fields
 */
export interface ExerciseConfigOverride {
    heuristicConfig?: Partial<HeuristicConfig>;
    metrics?: Partial<ExerciseMetric>[];
}

/**
 * Complete Exercise Configuration
 * Result of merging static config with database overrides
 */
export interface ExerciseConfig {
    exerciseName: string;
    modelPath?: string;

    // Fixed section (immutable)
    _fixed: FixedExerciseConfig;

    // Defaults section (can be overridden)
    _defaults: DefaultExerciseConfig;

    // Completion config
    completion?: {
        mode: 'any' | 'all' | 'manual';
        metrics?: string[];
    };
}

/**
 * Fully Merged Configuration (for runtime use)
 * Flattened structure with overrides applied
 */
export interface MergedExerciseConfig {
    exerciseName: string;
    modelPath?: string;

    // Fixed fields (from _fixed)
    feedbackCooldownMs: number;
    analysisInterval: number;
    mlConfig: MLConfig;
    feedbackConfig: FeedbackConfig;
    components: string[];

    // Variable fields (from _defaults + overrides)
    heuristicConfig: HeuristicConfig;
    metrics?: ExerciseMetric[];

    completion?: {
        mode: 'any' | 'all' | 'manual';
        metrics?: string[];
    };
}

/**
 * Type guard to check if a key is allowed in overrides
 */
export function isVariableConfigKey(key: string): boolean {
    const allowedKeys = ['heuristicConfig', 'metrics'];
    return allowedKeys.includes(key);
}

/**
 * Validate that override only contains variable fields
 */
export function validateOverride(override: any): override is ExerciseConfigOverride {
    if (!override || typeof override !== 'object') {
        return false;
    }

    const keys = Object.keys(override);
    return keys.every(key => isVariableConfigKey(key));
}
