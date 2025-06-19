// js/ui.js

import { STATS_MAP, MAX_ENHANCEMENT_LEVELS, STATS_ORDER } from './constants.js';

export function createTargetInputs(gridElement) {
  gridElement.innerHTML = '';
  for (const key of STATS_ORDER) {
    gridElement.innerHTML += `
      <div class="target-input-group">
          <label for="target-${key}">${STATS_MAP[key]}</label>
          <input type="number" id="target-${key}" data-stat-key="${key}" min="0" placeholder="0">
      </div>
    `;
  }
}

export function populateSelect(selectElement, items, defaultText) {
  selectElement.innerHTML = `<option value="">${defaultText}</option>`;
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.sourceUrl;
    option.textContent = item.name;
    selectElement.appendChild(option);
  });
}

export function updateSlotUI(slotId, item, defaultSlotTitles) {
  const slotElement = document.querySelector(`.slot[data-slot-id="${slotId}"]`);
  if (!slotElement) return;

  const imageEl = slotElement.querySelector('.slot-image');
  const nameEl = slotElement.querySelector('.slot-title');
  const transferBtn = slotElement.querySelector('.transfer-btn');
  const transferInfoEl = slotElement.querySelector('.slot-transfer-info');
  const uniquePropertyInfoEl = slotElement.querySelector('.slot-unique-property');
  const enhancementInput = slotElement.querySelector('.enhancement-input');
  const patchSelect = slotElement.querySelector('.patch-selector');

  if (item) {
    imageEl.src = item.localImage ? item.localImage.replace(/configurator[\\/]/i, '').replace(/\\/g, '/') : 'placeholder.png';
    nameEl.textContent = item.name;
    
    const itemType = slotId === 'skin' ? 'skin' : 'accessory';
    enhancementInput.max = MAX_ENHANCEMENT_LEVELS[itemType];

    if (transferBtn) {
        transferBtn.style.display = 'block';
        transferBtn.classList.toggle('active', !!item.transferredStats || !!item.transferredProperties);
    }
    
    // Независимое отображение переноса статов
    if (item.statsTransferInfo) {
      transferInfoEl.innerHTML = `<span class="transfer-source">Перенос от: ${item.statsTransferInfo.sourceName}</span><span class="transfer-stats">${item.statsTransferInfo.rawString}</span>`;
      transferInfoEl.classList.add('active');
    } else {
      transferInfoEl.innerHTML = '';
      transferInfoEl.classList.remove('active');
    }

    // Независимое отображение переноса свойств
    if (item.propertyTransferInfo) {
      const propertiesHtml = item.transferredProperties.map(prop => `<li>${prop}</li>`).join('');
      uniquePropertyInfoEl.innerHTML = `<span class="property-source">Свойство от: ${item.propertyTransferInfo.sourceName}</span><ul class="property-list">${propertiesHtml}</ul>`;
      uniquePropertyInfoEl.classList.add('active');
    } else {
      uniquePropertyInfoEl.innerHTML = '';
      uniquePropertyInfoEl.classList.remove('active');
    }

    if (enhancementInput) enhancementInput.value = item.enhancementLevel || 0;
    if (patchSelect) patchSelect.value = item.patch ? `${item.patch.type}-${item.patch.value}` : 'none-0';

  } else {
    // Сброс слота
    imageEl.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    nameEl.textContent = defaultSlotTitles[slotId] || 'Пустой слот';
    if (transferBtn) transferBtn.style.display = 'none';
    if(transferInfoEl) transferInfoEl.classList.remove('active');
    if(uniquePropertyInfoEl) uniquePropertyInfoEl.classList.remove('active');
    if (enhancementInput) {
        enhancementInput.value = 0;
        enhancementInput.max = 14;
    }
    if (patchSelect) patchSelect.value = 'none-0';
    const searchInput = slotElement.querySelector('.slot-search-input');
    if (searchInput) searchInput.value = '';
    const select = slotElement.querySelector('.slot-select');
    if (select) {
        select.value = "";
        Array.from(select.options).forEach(opt => opt.hidden = false);
    }
  }
}

export function calculateAndDisplayTotals(selectedItems) {
  const totals = Object.keys(STATS_MAP).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  const uniqueProperties = new Set();

  for (const slotId in selectedItems) {
    const item = selectedItems[slotId];
    if (!item) continue;

    if (item.effectiveStats) {
        for (const statKey in item.effectiveStats) {
            if (totals.hasOwnProperty(statKey)) {
                totals[statKey] += item.effectiveStats[statKey];
            }
        }
    }
    const properties = item.transferredProperties || item.uniqueProperties;
    if (properties) {
        properties.forEach(prop => uniqueProperties.add(prop));
    }
  }
  totals.defense = Math.min(totals.defense, 90);

  const summaryList = document.getElementById("summary-list");
  summaryList.innerHTML = "";

  const keysToDisplay = STATS_ORDER.filter(key => totals[key] && totals[key] !== 0);

  for (const key of keysToDisplay) {
    if (totals[key] !== 0) {
      const value = Math.round(totals[key] * 10) / 10;
      const sign = value > 0 && ["damage", "maxHp", "maxArmor"].includes(key) ? "+" : "";
      const unit = STATS_MAP[key].includes('%') ? '%' : (key === 'regeneration' ? '/мин' : '');
      summaryList.innerHTML += `<li><span>${STATS_MAP[key]}:</span> <strong>${sign}${value}${unit}</strong></li>`;
    }
  }

  if (uniqueProperties.size > 0) {
      if (summaryList.innerHTML !== "") {
          summaryList.innerHTML += `<li class="summary-divider" style="border-top: 1px dashed #555; margin: 10px 0; padding: 0;"></li>`;
      }
      uniqueProperties.forEach(prop => {
          summaryList.innerHTML += `<li class="summary-property" style="justify-content: flex-start; gap: 8px;"><span>✨</span> ${prop}</li>`;
      });
  }
}

export function openTransferModal(modalElement) {
    modalElement.classList.remove("hidden");
}

export function closeTransferModal(modalElement, searchInput) {
    searchInput.value = "";
    modalElement.classList.add("hidden");
}

export function populateModalList(listElement, dataList, type, searchTerm = "") {
  listElement.innerHTML = "";
  const lowerSearchTerm = searchTerm.toLowerCase();

  dataList
    .filter(info => {
        const searchCorpus = type === 'stats' 
            ? info.sourceName + info.rawString
            : info.sourceName + info.properties.join(' ');
        return searchCorpus.toLowerCase().includes(lowerSearchTerm);
    })
    .forEach(info => {
      const li = document.createElement("li");
      
      if (type === 'stats') {
          li.dataset.stats = JSON.stringify(info.stats);
          li.innerHTML = `<span class="item-source">Источник: <strong>${info.sourceName}</strong></span><span class="item-stats">${info.rawString}</span>`;
      } else { // properties
          li.dataset.properties = JSON.stringify(info.properties);
          const propertiesHtml = info.properties.map(p => `<li>${p}</li>`).join('');
          li.innerHTML = `<span class="item-source">Источник: <strong>${info.sourceName}</strong></span><ul class="property-list">${propertiesHtml}</ul>`;
      }

      li.addEventListener("click", () => {
        listElement.querySelector(".selected")?.classList.remove("selected");
        li.classList.add("selected");
      });
      listElement.appendChild(li);
    });
}