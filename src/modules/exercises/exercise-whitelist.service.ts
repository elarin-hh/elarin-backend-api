import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Service to manage the whitelist of valid exercise types
 * Loads from default-exercises.json
 */
@Injectable()
export class ExerciseWhitelistService {
    private readonly logger = new Logger(ExerciseWhitelistService.name);
    private allowedTypes: Set<string> | null = null;

    /**
     * Load the whitelist of allowed exercise types from config
     */
    async loadWhitelist(): Promise<Set<string>> {
        if (this.allowedTypes) {
            return this.allowedTypes;
        }

        try {
            const configPath = join(
                process.cwd(),
                'src',
                'config',
                'default-exercises.json'
            );

            const configData = await readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);

            if (!Array.isArray(config.exercises)) {
                throw new Error('Invalid default-exercises.json format: exercises must be an array');
            }

            this.allowedTypes = new Set<string>(config.exercises);

            this.logger.log(
                `Loaded whitelist with ${this.allowedTypes.size} allowed exercise types`
            );

            return this.allowedTypes;
        } catch (error) {
            this.logger.error('Failed to load exercise whitelist:', error.stack);
            throw error;
        }
    }

    /**
     * Check if an exercise type is in the whitelist
     */
    async isTypeAllowed(type: string): Promise<boolean> {
        const whitelist = await this.loadWhitelist();
        return whitelist.has(type);
    }

    /**
     * Filter an array of exercises to only include whitelisted types
     */
    async filterAllowedExercises<T extends { type: string }>(
        exercises: T[]
    ): Promise<T[]> {
        const whitelist = await this.loadWhitelist();
        return exercises.filter(exercise => whitelist.has(exercise.type));
    }

    /**
     * Get all allowed exercise types
     */
    async getAllowedTypes(): Promise<string[]> {
        const whitelist = await this.loadWhitelist();
        return Array.from(whitelist);
    }

    /**
     * Clear cache (useful for testing)
     */
    clearCache(): void {
        this.allowedTypes = null;
        this.logger.log('Whitelist cache cleared');
    }
}
