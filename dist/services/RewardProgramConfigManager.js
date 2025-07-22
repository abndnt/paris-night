"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardProgramConfigManager = void 0;
const RewardProgram_1 = require("../models/RewardProgram");
class RewardProgramConfigManager {
    constructor() {
        this.programs = new Map();
        this.configs = new Map();
        this.initializeDefaultPrograms();
    }
    initializeDefaultPrograms() {
        const defaultConfigs = [
            {
                id: 'chase_sapphire',
                name: 'Chase Sapphire',
                type: 'credit_card',
                apiConfig: {
                    authType: 'oauth',
                    requiredFields: ['username', 'password']
                },
                transferPartners: [
                    {
                        name: 'United Airlines',
                        transferRatio: 1,
                        minimumTransfer: 1000,
                        isActive: true
                    },
                    {
                        name: 'Southwest Airlines',
                        transferRatio: 1,
                        minimumTransfer: 1000,
                        isActive: true
                    }
                ],
                defaultValuationRate: 1.25,
                isActive: true
            },
            {
                id: 'american_aadvantage',
                name: 'American Airlines AAdvantage',
                type: 'airline',
                apiConfig: {
                    baseUrl: 'https://api.aa.com',
                    authType: 'oauth',
                    requiredFields: ['username', 'password']
                },
                transferPartners: [
                    {
                        name: 'Marriott Bonvoy',
                        transferRatio: 1,
                        minimumTransfer: 1000,
                        isActive: true
                    }
                ],
                defaultValuationRate: 1.4,
                isActive: true
            },
            {
                id: 'united_mileageplus',
                name: 'United MileagePlus',
                type: 'airline',
                apiConfig: {
                    baseUrl: 'https://api.united.com',
                    authType: 'oauth',
                    requiredFields: ['username', 'password']
                },
                transferPartners: [
                    {
                        name: 'Chase Ultimate Rewards',
                        transferRatio: 1,
                        minimumTransfer: 1000,
                        isActive: true
                    }
                ],
                defaultValuationRate: 1.3,
                isActive: true
            },
            {
                id: 'delta_skymiles',
                name: 'Delta SkyMiles',
                type: 'airline',
                apiConfig: {
                    baseUrl: 'https://api.delta.com',
                    authType: 'oauth',
                    requiredFields: ['username', 'password']
                },
                transferPartners: [
                    {
                        name: 'American Express Membership Rewards',
                        transferRatio: 1,
                        minimumTransfer: 1000,
                        isActive: true
                    }
                ],
                defaultValuationRate: 1.2,
                isActive: true
            }
        ];
        defaultConfigs.forEach(config => {
            this.addProgramConfig(config);
        });
    }
    addProgramConfig(config) {
        this.configs.set(config.id, config);
        const program = RewardProgram_1.RewardProgramModel.create(config);
        this.programs.set(program.id, program);
    }
    getProgramConfig(programId) {
        return this.configs.get(programId) || null;
    }
    getProgram(programId) {
        return this.programs.get(programId) || null;
    }
    getAllPrograms() {
        return Array.from(this.programs.values()).filter(program => program.isActive);
    }
    getAllConfigs() {
        return Array.from(this.configs.values()).filter(config => config.isActive);
    }
    updateProgram(programId, updates) {
        const program = this.programs.get(programId);
        if (!program) {
            return null;
        }
        const updatedProgram = {
            ...program,
            ...updates,
            updatedAt: new Date()
        };
        if (!RewardProgram_1.RewardProgramModel.validate(updatedProgram)) {
            throw new Error('Invalid reward program data');
        }
        this.programs.set(programId, updatedProgram);
        return updatedProgram;
    }
    deactivateProgram(programId) {
        const program = this.programs.get(programId);
        if (!program) {
            return false;
        }
        const updatedProgram = {
            ...program,
            isActive: false,
            updatedAt: new Date()
        };
        this.programs.set(programId, updatedProgram);
        return true;
    }
    getProgramsByType(type) {
        return Array.from(this.programs.values())
            .filter(program => program.type === type && program.isActive);
    }
    searchPrograms(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.programs.values())
            .filter(program => program.isActive &&
            program.name.toLowerCase().includes(lowerQuery));
    }
    validateProgramConfig(config) {
        return !!(config.id &&
            config.name &&
            config.type &&
            config.apiConfig &&
            config.defaultValuationRate > 0 &&
            Array.isArray(config.transferPartners));
    }
}
exports.RewardProgramConfigManager = RewardProgramConfigManager;
//# sourceMappingURL=RewardProgramConfigManager.js.map