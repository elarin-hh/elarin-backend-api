import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { readFile } from 'fs/promises';
import type { ExerciseConfig } from './schemas/config-schema';

@Injectable()
export class StaticConfigService {
    private readonly logger = new Logger(StaticConfigService.name);
    private readonly configCache = new Map<string, ExerciseConfig>();

    private getConfigPath(exerciseType: string): string {
        return join(
            process.cwd(),
            'static',
            'exercises',
            exerciseType,
            'config.json'
        );
    }

    async loadStaticConfig(exerciseType: string): Promise<ExerciseConfig> {
        if (this.configCache.has(exerciseType)) {
            return this.configCache.get(exerciseType)!;
        }

        try {
            const configPath = this.getConfigPath(exerciseType);
            this.logger.debug(`Loading static config from: ${configPath}`);

            const configData = await readFile(configPath, 'utf-8');
            const config: ExerciseConfig = JSON.parse(configData);

            this.validateConfig(config, exerciseType);

            this.configCache.set(exerciseType, config);

            this.logger.log(`Loaded static config for exercise: ${exerciseType}`);
            return config;

        } catch (error) {
            this.logger.error(
                `Falha ao carregar configuração estática para ${exerciseType}:`,
                error.stack
            );
            throw new NotFoundException(
                `Configuração estática não encontrada para o tipo de exercício: ${exerciseType}`
            );
        }
    }

    private validateConfig(config: any, exerciseType: string): void {
        if (!config._fixed) {
            throw new Error(
                `Configuração inválida para ${exerciseType}: seção _fixed ausente`
            );
        }

        if (!config._defaults) {
            throw new Error(
                `Configuração inválida para ${exerciseType}: seção _defaults ausente`
            );
        }

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
                    `Configuração inválida para ${exerciseType}: _fixed.${field} obrigatório`
                );
            }
        }

        if (!config._defaults.heuristicConfig) {
            throw new Error(
                `Configuração inválida para ${exerciseType}: _defaults.heuristicConfig obrigatório`
            );
        }
    }

    clearCache(): void {
        this.configCache.clear();
        this.logger.log('Static config cache cleared');
    }

    getCachedTypes(): string[] {
        return Array.from(this.configCache.keys());
    }
}
