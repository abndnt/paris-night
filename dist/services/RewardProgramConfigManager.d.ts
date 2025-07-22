import { RewardProgram, RewardProgramConfig } from '../models/RewardProgram';
export declare class RewardProgramConfigManager {
    private programs;
    private configs;
    constructor();
    private initializeDefaultPrograms;
    addProgramConfig(config: RewardProgramConfig): void;
    getProgramConfig(programId: string): RewardProgramConfig | null;
    getProgram(programId: string): RewardProgram | null;
    getAllPrograms(): RewardProgram[];
    getAllConfigs(): RewardProgramConfig[];
    updateProgram(programId: string, updates: Partial<RewardProgram>): RewardProgram | null;
    deactivateProgram(programId: string): boolean;
    getProgramsByType(type: 'airline' | 'credit_card' | 'hotel'): RewardProgram[];
    searchPrograms(query: string): RewardProgram[];
    validateProgramConfig(config: RewardProgramConfig): boolean;
}
//# sourceMappingURL=RewardProgramConfigManager.d.ts.map