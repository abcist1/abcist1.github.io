// js/data-handler.js

import { STATS_MAP } from './constants.js';

// Генерирует список ВСЕХ наборов статов из массива предметов.

function generateUniqueStatsFromItems(items) {
    const allStats = [];

    items.forEach(item => {
        const stats = item.parsedStats;
        if (stats && Object.keys(stats).length > 0) {
            const rawString = Object.entries(stats).map(([statKey, statValue]) => {
                const name = STATS_MAP[statKey] || statKey;
                const sign = statValue > 0 ? '+' : '';
                const unit = name.includes('%') ? '%' : '';
                return `${name.replace(' (%)', '')}: ${sign}${statValue}${unit}`;
            }).join('; ');

            allStats.push({
                sourceName: item.name,
                stats: stats,
                rawString: rawString
            });
        }
    });

    return allStats.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}

//  Функция для сбора уникальных свойств для переноса
function generateUniqueProperties(items) {
    const uniqueProperties = new Map();
    items.forEach(item => {
        const properties = item.uniqueProperties;
        if (properties && properties.length > 0) {
            const key = JSON.stringify([...properties].sort());
            if (!uniqueProperties.has(key)) {
                uniqueProperties.set(key, {
                    sourceName: item.name,
                    properties: properties
                });
            }
        }
    });
    return Array.from(uniqueProperties.values()).sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}

export function generateAllTransferableData(allSkins, allAccessories) {
    const transferableData = {};

    const processSlot = (items) => ({
        stats: generateUniqueStatsFromItems(items),
        properties: generateUniqueProperties(items)
    });
    
    transferableData['skin'] = processSlot(allSkins);

    for (let i = 1; i <= 8; i++) {
        const accessoriesForThisSlot = allAccessories.filter(acc => acc.slot === i);
        transferableData[String(i)] = processSlot(accessoriesForThisSlot);
    }
    return transferableData;
}


export async function loadAndProcessData() {
    let [skinsData, itemsData] = await Promise.all([
        fetch('skins_data.json').then(res => res.json()),
        fetch('items_data.json').then(res => res.json())
    ]);

    const processedSkinsData = skinsData.map(skin => ({ ...skin, slot: 0 }));

    const accessoriesToMoveAsSkins = [];
    const finalAccessoriesData = [];
    for (const item of itemsData) {
        if (item.slot === 0) {
            accessoriesToMoveAsSkins.push(item);
        } else if (item.slot >= 1 && item.slot <= 8) {
            finalAccessoriesData.push(item);
        }
    }

    const allSkins = [...processedSkinsData, ...accessoriesToMoveAsSkins];
    const allAccessories = finalAccessoriesData;

    return { allSkins, allAccessories };
}