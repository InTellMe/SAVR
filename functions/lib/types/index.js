"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_LIMITS = void 0;
exports.TIER_LIMITS = {
    basic: {
        name: 'basic',
        maxInventoryItems: 50,
        maxRecipesPerMonth: 10,
        maxMealPlansPerMonth: 2,
        maxPetRecipesPerMonth: 5,
        aiChatEnabled: false,
        advancedFeatures: false,
    },
    plus: {
        name: 'plus',
        maxInventoryItems: -1,
        maxRecipesPerMonth: -1,
        maxMealPlansPerMonth: -1,
        maxPetRecipesPerMonth: -1,
        aiChatEnabled: true,
        advancedFeatures: true,
    },
    premium: {
        name: 'premium',
        maxInventoryItems: -1,
        maxRecipesPerMonth: -1,
        maxMealPlansPerMonth: -1,
        maxPetRecipesPerMonth: -1,
        aiChatEnabled: true,
        advancedFeatures: true,
    },
};
//# sourceMappingURL=index.js.map