"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_LIMITS = void 0;
exports.TIER_LIMITS = {
    free: {
        name: 'free',
        maxInventoryItems: 50,
        maxRecipesPerMonth: 10,
        maxMealPlansPerMonth: 2,
        aiChatEnabled: false,
        advancedFeatures: false,
    },
    pro: {
        name: 'pro',
        maxInventoryItems: -1, // unlimited
        maxRecipesPerMonth: -1, // unlimited
        maxMealPlansPerMonth: -1, // unlimited
        aiChatEnabled: true,
        advancedFeatures: true,
    },
};
//# sourceMappingURL=index.js.map