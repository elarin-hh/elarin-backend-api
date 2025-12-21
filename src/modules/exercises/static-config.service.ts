import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { readFile } from 'fs/promises';
import type { ExerciseConfig } from './schemas/config-schema';

/**
 * Service to load and cache static exercise configurations
 * Static configs are stored in /static/exercises/{exerciseType}/config.json
 */
@Injectable()
export class StaticConfigService {
    private readonly logger = new Logger(StaticConfigService.name);
    private readonly configCache = new Map<string, ExerciseConfig>();

    /**
     * Base path to static exercise configs
     * Adjust this path based on your project structure
     */
    private getConfigPath(exerciseType: string): string {
        // Assuming static configs are in project root under static/exercises/
        return join(
            process.cwd(),
            'static',
            'exercises',
            exerciseType,
            'config.json'
        );
    }

    /**
     * Load static configuration for an exercise type
     * Results are cached for performance
     */
    async loadStaticConfig(exerciseType: string): Promise<ExerciseConfig> {
        // Check cache first
        if (this.configCache.has(exerciseType)) {
            return this.configCache.get(exerciseType)!;
        }

        try {
            const configPath = this.getConfigPath(exerciseType);
            this.logger.debug(`Loading static config from: ${configPath}`);

            const configData = await readFile(configPath, 'utf-8');
            const config: ExerciseConfig = JSON.parse(configData);

            // Validate config structure
            this.validateConfig(config, exerciseType);

            // Cache the config
            this.configCache.set(exerciseType, config);

            this.logger.log(`Loaded static config for exercise: ${exerciseType}`);
            return config;

        } catch (error) {
            this.logger.error(
                `Failed to load static config for ${exerciseType}:`,
                error.stack
            );
            throw new NotFoundException(
                `Static configuration not found for exercise type: ${exerciseType}`
            );
        }
    }

    /**
     * Validate that the loaded config has required structure
     */
    private validateConfig(config: any, exerciseType: string): void {
        if (!config._fixed) {
            throw new Error(
                `Invalid config for ${exerciseType}: missing _fixed section`
            );
        }

        if (!config._defaults) {
            throw new Error(
                `Invalid config for ${exerciseType}: missing _defaults section`
            );
        }

        // Validate required fixed fields
        const requiredFixedFields = [
            'feedbackCooldownMs',
            'analysisInterval',
            'mlConfig',
            'feedbackConfig',
            'components'
        ];

        for (const field of requiredFixedFields) {
            if (!(field in config._fixed)) {
                throw new Error(
                    `Invalid config for ${exerciseType}: _fixed.${field} is required`
                );
            }
        }

        // Validate required defaults fields
        if (!config._defaults.heuristicConfig) {
            throw new Error(
                `Invalid config for ${exerciseType}: _defaults.heuristicConfig is required`
            );
        }
    }

    /**
     * Clear the cache (useful for testing or hot-reload scenarios)
     */
    clearCache(): void {
        this.configCache.clear();
        this.logger.log('Static config cache cleared');
    }

    /**
     * Get all cached exercise types
     */
    getCachedTypes(): string[] {
        return Array.from(this.configCache.keys());
    }
}
