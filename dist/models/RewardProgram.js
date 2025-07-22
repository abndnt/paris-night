"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardProgramModel = void 0;
class RewardProgramModel {
    static create(config) {
        const now = new Date();
        return {
            id: config.id,
            name: config.name,
            type: config.type,
            transferPartners: config.transferPartners.map((partner, index) => ({
                id: `${config.id}_partner_${index}`,
                ...partner
            })),
            valuationRate: config.defaultValuationRate,
            apiEndpoint: config.apiConfig.baseUrl,
            isActive: config.isActive,
            createdAt: now,
            updatedAt: now
        };
    }
    static validate(program) {
        return !!(program.id &&
            program.name &&
            program.type &&
            program.valuationRate > 0 &&
            Array.isArray(program.transferPartners));
    }
}
exports.RewardProgramModel = RewardProgramModel;
//# sourceMappingURL=RewardProgram.js.map