// js/logic.js

import { ENHANCEMENT_CONFIG, PATCH_OPTIONS, STATS_MAP, STAT_CAPS, MAX_ENHANCEMENT_LEVELS} from './constants.js';


// Рассчитывает статы для предмета на определенном уровне заточки.

export function calculateStatsForEnhancementLevel(baseStats, item, level) {
    const stats = { ...baseStats };
    if (!item || level < 4 || !item.parsedEnhancements) {
        return stats;
    }

    // Применяем бонусы для каждой характеристики, найденной в `parsedEnhancements`
    item.parsedEnhancements.forEach(enhancement => {
        const totalBonus = (level - 3) * enhancement.valuePerLevel;
        stats[enhancement.key] = (stats[enhancement.key] || 0) + totalBonus;
    });

    if (level >= 13) {
        for (const statKey in ENHANCEMENT_CONFIG.level13Bonus) {
            stats[statKey] = (stats[statKey] || 0) + ENHANCEMENT_CONFIG.level13Bonus[statKey];
        }
    }
    if (level >= 14) {
        for (const statKey in ENHANCEMENT_CONFIG.level14Bonus) {
            stats[statKey] = (stats[statKey] || 0) + ENHANCEMENT_CONFIG.level14Bonus[statKey];
        }
    }
    return stats;
}


// Пересчитывает итоговые статы предмета, учитывая заточку и нашивки.

export function recalculateEffectiveStats(item) {
    if (!item) return {};
    
    // Базовые статы - это либо перенесенные, либо собственные статы предмета.
    const baseStats = item.transferredStats || item.parsedStats || {};
    
    // Применяем заточку
    const statsWithEnhancement = calculateStatsForEnhancementLevel(baseStats, item, item.enhancementLevel || 0);

    // Применяем нашивку
    const newEffectiveStats = { ...statsWithEnhancement };
    const patch = item.patch || { type: 'none', value: 0 };
    if (patch.type !== 'none' && patch.value > 0) {
        newEffectiveStats[patch.type] = (newEffectiveStats[patch.type] || 0) + patch.value;
    }
    
    return newEffectiveStats;
}

// Оценивает, насколько набор статов подходит под заданные цели.

function calculateScore(stats, targets) {
    let score = 0;
    if (!stats) return 0;

    for (const statKey in targets) {
        if (targets[statKey] <= 0) continue;

        const statValue = stats[statKey] || 0;
        if (statValue <= 0) continue;

        const weight = (statKey === 'defense' || statKey === 'damage') ? 1.5 : 1.0;
        const overkillPenaltyWeight = weight * 0.5;

        const usefulValue = Math.min(statValue, targets[statKey]);
        const wastedValue = Math.max(0, statValue - targets[statKey]);

        score += (usefulValue * weight) - (wastedValue * overkillPenaltyWeight);
    }
    return score;
}

// Находит лучшую нашивку для набора статов под конкретные цели.

function findBestPatchForStats(baseStats, targets) {
    let bestResult = {
        patch: { type: 'none', value: 0 },
        score: calculateScore(baseStats, targets),
        finalStats: baseStats
    };

    for (const patch of PATCH_OPTIONS) {
        if (patch.type === 'none') continue;
        const statsWithPatch = { ...baseStats };
        statsWithPatch[patch.type] = (statsWithPatch[patch.type] || 0) + patch.value;
        const currentScore = calculateScore(statsWithPatch, targets);
        if (currentScore > bestResult.score) {
            bestResult = { patch, score: currentScore, finalStats: statsWithPatch };
        }
    }
    return bestResult;
}

// Находит лучший уровень заточки и нашивку для одного предмета.

function findBestEnhancementAndPatch(item, baseStats, targets, options = { allowPatches: true, itemType: 'accessory' }) {
    let bestResult = { score: -1, finalStats: null, patch: null, enhancementLevel: 0 };
    const maxLevel = MAX_ENHANCEMENT_LEVELS[options.itemType];

    for (let level = 0; level <= maxLevel; level++) {
        const statsAtLevel = calculateStatsForEnhancementLevel(baseStats, item, level);
        let resultWithModifiers;

        if (options.allowPatches) {
            resultWithModifiers = findBestPatchForStats(statsAtLevel, targets);
        } else {
            resultWithModifiers = {
                patch: { type: 'none', value: 0 },
                score: calculateScore(statsAtLevel, targets),
                finalStats: statsAtLevel
            };
        }

        if (resultWithModifiers.score > bestResult.score) {
            bestResult = {
                score: resultWithModifiers.score,
                finalStats: resultWithModifiers.finalStats,
                patch: resultWithModifiers.patch,
                enhancementLevel: level
            };
        }
    }
    return bestResult;
}

// Главная функция автоматического подбора сборки.

export function findCombinationForTargets(targets, allSkins, allAccessories, transferableDataBySlot) {
    const cappedTargets = {};
    const capMessages = [];
    for (const key in targets) {
        const userTarget = targets[key];
        const cap = STAT_CAPS[key];
        if (cap && userTarget > cap) {
            cappedTargets[key] = cap;
            capMessages.push(`Цель по "${STATS_MAP[key]}" (${userTarget}) была снижена до игрового лимита в ${cap}.`);
        } else {
            cappedTargets[key] = userTarget;
        }
    }

    if (capMessages.length > 0) {
        alert("Внимание:\n\n" + capMessages.join("\n"));
    }

    const finalBuild = {};
    let remainingTargets = { ...cappedTargets };
    
    let bestSkinChoice = { score: -Infinity };

    for (const skin of allSkins) {
        const result = findBestEnhancementAndPatch(skin, skin.parsedStats, remainingTargets, { allowPatches: true, itemType: 'skin' });
        if (result.score > bestSkinChoice.score) {
            bestSkinChoice = { item: skin, ...result, isTransfer: false, transferInfo: null, originalStats: skin.parsedStats };
        }
    }

    const skinTransfers = transferableDataBySlot['skin']?.stats || [];
    for (const transfer of skinTransfers) {
        const result = findBestPatchForStats(transfer.stats, remainingTargets);
        if (result.score > bestSkinChoice.score) {
            const hostItem = { name: `Перенос в слот 'Скин'`, sourceUrl: `transfer-skin`, parsedStats: transfer.stats };
            bestSkinChoice = {
                item: { ...hostItem, name: `Перенос от '${transfer.sourceName}'` },
                score: result.score,
                patch: result.patch,
                finalStats: result.finalStats,
                enhancementLevel: 0,
                isTransfer: true,
                originalStats: transfer.stats,
                transferInfo: { sourceName: transfer.sourceName, rawString: transfer.rawString }
            };
        }
    }
    
    if (bestSkinChoice.score > 0) {
        finalBuild['skin'] = bestSkinChoice;
        for (const key in remainingTargets) {
            if (bestSkinChoice.finalStats[key]) {
                remainingTargets[key] = Math.max(0, remainingTargets[key] - bestSkinChoice.finalStats[key]);
            }
        }
    }

    let unfilledSlots = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);

    while (Object.values(remainingTargets).some(val => val > 0.01) && unfilledSlots.size > 0) {
        let bestOverallMove = { score: 0, slotId: null, choice: null };

        for (const slotId of unfilledSlots) {
            const itemsForSlot = allAccessories.filter(acc => acc.slot === parseInt(slotId, 10));
            const allowPatches = !['7', '8'].includes(slotId);
            const allowTransfers = !['7', '8'].includes(slotId);
            let bestChoiceForThisSlot = { score: -1 };

            for (const item of itemsForSlot) {
                const result = findBestEnhancementAndPatch(item, item.parsedStats, remainingTargets, { allowPatches, itemType: 'accessory' });
                if (result.score > bestChoiceForThisSlot.score) {
                    bestChoiceForThisSlot = { item, ...result, isTransfer: false, transferInfo: null, originalStats: item.parsedStats };
                }
            }
            
            if (allowTransfers) {
                const availableTransfers = transferableDataBySlot[slotId]?.stats || [];
                for (const transfer of availableTransfers) {
                    const result = findBestPatchForStats(transfer.stats, remainingTargets);
                    if (result.score > bestChoiceForThisSlot.score) {
                        const hostItem = { name: `Перенос в слот #${slotId}`, sourceUrl: `transfer-${slotId}`, parsedStats: transfer.stats };
                        bestChoiceForThisSlot = {
                            item: { ...hostItem, name: `Перенос от '${transfer.sourceName}'` },
                            score: result.score,
                            patch: result.patch,
                            finalStats: result.finalStats,
                            enhancementLevel: 0,
                            isTransfer: true,
                            originalStats: transfer.stats,
                            transferInfo: { sourceName: transfer.sourceName, rawString: transfer.rawString }
                        };
                    }
                }
            }
            
            if (bestChoiceForThisSlot.score > bestOverallMove.score) {
                bestOverallMove = { score: bestChoiceForThisSlot.score, slotId, choice: bestChoiceForThisSlot };
            }
        }
        
        if (bestOverallMove.score > 0) {
            const { slotId, choice } = bestOverallMove;
            finalBuild[slotId] = choice;
            unfilledSlots.delete(slotId);
            
            for (const key in remainingTargets) {
                if (choice.finalStats[key]) {
                    remainingTargets[key] = Math.max(0, remainingTargets[key] - choice.finalStats[key]);
                }
            }
        } else {
            break; 
        }
    }
    
    return { finalBuild, remainingTargets };
}