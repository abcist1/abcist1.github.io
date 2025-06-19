// js/app.js

import { STATS_MAP, MAX_ENHANCEMENT_LEVELS } from './constants.js';
import { loadAndProcessData, generateAllTransferableData } from './data-handler.js';
import { recalculateEffectiveStats, findCombinationForTargets } from './logic.js';
import { createTargetInputs, populateSelect, updateSlotUI, calculateAndDisplayTotals, openTransferModal, closeTransferModal, populateModalList } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        allSkins: [],
        allAccessories: [],
        transferableDataBySlot: {},
        selectedItems: { skin: null, '1': null, '2': null, '3': null, '4': null, '5': null, '6': null, '7': null, '8': null },
        defaultSlotTitles: {},
        activeTransferSlotId: null,
        activeModalTab: 'stats'
    };

    const modal = document.getElementById('transfer-modal');
    const modalTabs = modal.querySelector('.modal-tabs');
    const modalCloseBtn = modal.querySelector('.modal-close');
    const modalStatList = document.getElementById('modal-stat-list');
    const modalApplyBtn = document.getElementById('modal-apply-btn');
    const modalResetBtn = document.getElementById('modal-reset-btn');
    const modalSearchInput = document.getElementById('modal-search');
    const targetInputsGrid = document.getElementById('target-inputs-grid');
    const targetConfigBtn = document.getElementById('target-config-btn');
    const targetResetBtn = document.getElementById('target-reset-btn');

    async function initialize() {
        const { allSkins, allAccessories } = await loadAndProcessData();
        state.allSkins = allSkins;
        state.allAccessories = allAccessories;
        state.transferableDataBySlot = generateAllTransferableData(allSkins, allAccessories);

        document.querySelectorAll('.slot').forEach(slot => {
            state.defaultSlotTitles[slot.dataset.slotId] = slot.querySelector('.slot-title').textContent;
        });

        createTargetInputs(targetInputsGrid);
        populateAllSelectors();
        setupEventListeners();
        calculateAndDisplayTotals(state.selectedItems);
    }

    function populateAllSelectors() {
        populateSelect(document.getElementById("select-skin"), state.allSkins, "Выберите скин");
        for (let i = 1; i <= 8; i++) {
            const accSelect = document.getElementById(`select-${i}`);
            const accessoriesForSlot = state.allAccessories.filter(acc => acc.slot === i);
            populateSelect(accSelect, accessoriesForSlot, "Пустой слот");
        }
    }
    
    function updateSlotAndSelection(slotId, choice) {
        const select = document.getElementById(`select-${slotId}`);
        if (choice && choice.item) {
            const { item, patch, isTransfer, transferInfo, enhancementLevel, finalStats, originalStats, originalProperties } = choice;
            const newItemInstance = { 
                ...item, 
                effectiveStats: finalStats, 
                transferredStats: isTransfer && originalStats ? originalStats : null,
                statsTransferInfo: isTransfer && originalStats ? transferInfo : null,
                transferredProperties: isTransfer && originalProperties ? originalProperties : null,
                propertyTransferInfo: isTransfer && originalProperties ? transferInfo : null,
                patch: patch || { type: 'none', value: 0 }, 
                enhancementLevel: enhancementLevel || 0
            };
            state.selectedItems[slotId] = newItemInstance;
            if (select) select.value = (isTransfer) ? "" : item.sourceUrl;
        } else {
            state.selectedItems[slotId] = null;
            if (select) select.value = "";
        }
        updateSlotUI(slotId, state.selectedItems[slotId], state.defaultSlotTitles);
    }

    function applyTransfer() {
        const selectedLi = modalStatList.querySelector(".selected");
        if (!selectedLi || !state.activeTransferSlotId) return;

        const itemToUpdate = state.selectedItems[state.activeTransferSlotId];
        if (!itemToUpdate) return;

        if (state.activeModalTab === 'stats') {
            itemToUpdate.transferredStats = JSON.parse(selectedLi.dataset.stats);
            itemToUpdate.statsTransferInfo = {
                sourceName: selectedLi.querySelector('.item-source strong').textContent,
                rawString: selectedLi.querySelector('.item-stats').textContent
            };
        } else { // 'properties'
            itemToUpdate.transferredProperties = JSON.parse(selectedLi.dataset.properties);
            itemToUpdate.propertyTransferInfo = {
                sourceName: selectedLi.querySelector('.item-source strong').textContent,
                rawString: Array.from(selectedLi.querySelectorAll('.property-list li')).map(li => li.textContent).join(' ')
            };
        }
        
        itemToUpdate.effectiveStats = recalculateEffectiveStats(itemToUpdate);
        updateSlotUI(state.activeTransferSlotId, itemToUpdate, state.defaultSlotTitles);
        calculateAndDisplayTotals(state.selectedItems);
        closeTransferModal(modal, modalSearchInput);
    }

    function resetTransfer() {
        if (!state.activeTransferSlotId) return;
        const itemToUpdate = state.selectedItems[state.activeTransferSlotId];
        if (itemToUpdate) {
            if (state.activeModalTab === 'stats') {
                itemToUpdate.transferredStats = null;
                itemToUpdate.statsTransferInfo = null;
            } else { // 'properties'
                itemToUpdate.transferredProperties = null;
                itemToUpdate.propertyTransferInfo = null;
            }
            itemToUpdate.effectiveStats = recalculateEffectiveStats(itemToUpdate);
        }
        updateSlotUI(state.activeTransferSlotId, itemToUpdate, state.defaultSlotTitles);
        calculateAndDisplayTotals(state.selectedItems);
        closeTransferModal(modal, modalSearchInput);
    }
    
    function setupEventListeners() {

        document.querySelector('.slots-container').addEventListener('change', e => {
            // --- Логика для выбора предмета ---
            if (e.target.classList.contains('slot-select')) {
                const slotId = e.target.id.split("-")[1];
                const selectedUrl = e.target.value;

                if (!selectedUrl) {
                    // Если выбрали "пустой слот", очищаем
                    state.selectedItems[slotId] = null;
                } else {
                    const itemType = slotId === 'skin' ? 'skin' : 'accessory';
                    const sourceArray = itemType === "skin" ? state.allSkins : state.allAccessories;
                    const foundItem = sourceArray.find(i => i.sourceUrl === selectedUrl);
                    
                    if (foundItem) {
                        // Вместо полного создания, обновляем существующий или создаем новый
                        let currentItem = state.selectedItems[slotId] || {};
                        
                        // Создаем новый объект, сохраняя существующие модификаторы
                        const newItem = {
                            ...foundItem,
                            itemType,
                            enhancementLevel: currentItem.enhancementLevel || 0,
                            patch: currentItem.patch || { type: 'none', value: 0 },
                            transferredStats: currentItem.transferredStats || null,
                            statsTransferInfo: currentItem.statsTransferInfo || null,
                            transferredProperties: currentItem.transferredProperties || null,
                            propertyTransferInfo: currentItem.propertyTransferInfo || null,
                        };
                        newItem.effectiveStats = recalculateEffectiveStats(newItem);
                        state.selectedItems[slotId] = newItem;
                    }
                }
                updateSlotUI(slotId, state.selectedItems[slotId], state.defaultSlotTitles);
                calculateAndDisplayTotals(state.selectedItems);
            }

            // --- Логика для выбора нашивки ---
            if (e.target.classList.contains('patch-selector')) {
                const slotId = e.target.dataset.patchSlotId;
                const item = state.selectedItems[slotId];
                if (item) {
                    const [type, value] = e.target.value.split("-");
                    item.patch = { type, value: parseInt(value, 10) };
                    item.effectiveStats = recalculateEffectiveStats(item);
                    calculateAndDisplayTotals(state.selectedItems);
                }
            }
        });

        // Единый обработчик для всех ВВОДОВ (поиск и заточка)
        document.querySelector('.slots-container').addEventListener('input', e => {
            // --- Логика для поиска ---
            if (e.target.classList.contains('slot-search-input')) {
                const selectElement = document.getElementById(e.target.dataset.targetSelect);
                if (selectElement) {
                    const searchTerm = e.target.value.toLowerCase();
                    Array.from(selectElement.options).forEach(opt => {
                        opt.hidden = (opt.value !== "" && !opt.textContent.toLowerCase().includes(searchTerm));
                    });
                }
            }

            // --- Логика для заточки ---
            if (e.target.classList.contains('enhancement-input')) {
                const slotId = e.target.closest('.enhancement-control').dataset.enhancementSlotId;
                const item = state.selectedItems[slotId];
                if (item) {
                    let level = parseInt(e.target.value, 10) || 0;
                    const maxLevel = parseInt(e.target.max, 10);
                    if (level > maxLevel) {
                        level = maxLevel;
                        e.target.value = level;
                    }
                    item.enhancementLevel = level;
                    item.effectiveStats = recalculateEffectiveStats(item);
                    calculateAndDisplayTotals(state.selectedItems);
                }
            }
        });

        // Единый обработчик для всех КЛИКОВ (кнопки +, -, перенос)
        document.querySelector('.slots-container').addEventListener('click', e => {
            // --- Логика для кнопок заточки ---
            if (e.target.classList.contains('enhancement-btn')) {
                const controlDiv = e.target.closest('.enhancement-control');
                const input = controlDiv.querySelector('.enhancement-input');
                const action = e.target.dataset.action;
                const maxLevel = parseInt(input.max, 10);
                let currentValue = parseInt(input.value, 10) || 0;

                if (action === 'plus') {
                    currentValue = Math.min(maxLevel, currentValue + 1);
                } else if (action === 'minus') {
                    currentValue = Math.max(0, currentValue - 1);
                }

                input.value = currentValue;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // --- Логика для кнопки переноса ---
            if (e.target.classList.contains("transfer-btn")) {
                const slot = e.target.closest(".slot");
                if (slot && state.selectedItems[slot.dataset.slotId]) {
                    state.activeTransferSlotId = slot.dataset.slotId;
                    const dataToShow = state.transferableDataBySlot[state.activeTransferSlotId]?.[state.activeModalTab] || [];
                    populateModalList(modalStatList, dataToShow, state.activeModalTab);
                    openTransferModal(modal);
                }
            }
        });

        // Остальные обработчики (вне .slots-container)
        targetConfigBtn.addEventListener('click', () => {
            const targets = {};
            document.querySelectorAll('#target-inputs-grid input').forEach(input => {
                const value = parseInt(input.value, 10);
                if (value > 0) targets[input.dataset.statKey] = value;
            });
            if (Object.keys(targets).length === 0) {
                alert("Пожалуйста, укажите хотя бы одну цель для подбора.");
                return;
            }
            ["skin", "1", "2", "3", "4", "5", "6", "7", "8"].forEach(slotId => updateSlotAndSelection(slotId, null));
            
            const { finalBuild, remainingTargets } = findCombinationForTargets(targets, state.allSkins, state.allAccessories, state.transferableDataBySlot);
            
            for(const slotId in finalBuild) {
                updateSlotAndSelection(slotId, finalBuild[slotId]);
            }
            
            calculateAndDisplayTotals(state.selectedItems);
            
            const unmetGoals = Object.entries(remainingTargets)
                .filter(([, val]) => val > 0.1) 
                .map(([key, val]) => `${STATS_MAP[key]}: не хватает ~${Math.ceil(val)}`);

            if (unmetGoals.length > 0) {
                alert(`Сборка подобрана, но некоторые цели не удалось полностью закрыть.\n\nЧто не удалось собрать:\n- ${unmetGoals.join('\n- ')}`);
            } 
        });
        
        targetResetBtn.addEventListener('click', () => {
            document.querySelectorAll("#target-inputs-grid input").forEach(input => input.value = "");
            ["skin", "1", "2", "3", "4", "5", "6", "7", "8"].forEach(slotId => updateSlotAndSelection(slotId, null));
            calculateAndDisplayTotals(state.selectedItems);
        });
        
        modalCloseBtn.addEventListener("click", () => closeTransferModal(modal, modalSearchInput));
        modalApplyBtn.addEventListener("click", applyTransfer);
        modalResetBtn.addEventListener("click", resetTransfer);
        
        modalSearchInput.addEventListener("input", e => {
            const dataToShow = state.transferableDataBySlot[state.activeTransferSlotId]?.[state.activeModalTab] || [];
            populateModalList(modalStatList, dataToShow, state.activeModalTab, e.target.value);
        });

        modalTabs.addEventListener('click', e => {
            if (e.target.classList.contains('modal-tab-btn')) {
                const newTab = e.target.dataset.tab;
                if (newTab === state.activeModalTab) return;

                modalTabs.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                state.activeModalTab = newTab;

                const dataToShow = state.transferableDataBySlot[state.activeTransferSlotId]?.[state.activeModalTab] || [];
                populateModalList(modalStatList, dataToShow, state.activeModalTab, modalSearchInput.value);
            }
        });
    }

    initialize();
});