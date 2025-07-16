// script.js
// FINAL VERSION WITH RELEVANCE-BASED SEARCH SORTING

document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('searchInput');
    const measureDropdown = document.getElementById('measureDropdown');
    const foodList = document.getElementById('foodList');
    const quantityInput = document.getElementById('quantityInput');
    const resultsPanel = document.querySelector('.results-panel');

    let foodIndex = {};
    const fileCache = new Map();
    let currentFood = null;
    let searchTimeout;
    const PREFIX_LENGTH = 3;

    // --- INITIALIZATION ---
    fetch('food_index.json')
        .then(response => response.json())
        .then(index => {
            foodIndex = index;
            showInitialMessage();
        })
        .catch(error => {
            console.error('CRITICAL: Could not load food index.', error);
            foodList.innerHTML = '<li class="info-item">Error: Could not load app data.</li>';
        });

    function showInitialMessage() {
        foodList.innerHTML = '<li class="info-item">Type 3 or more letters to search...</li>';
        resultsPanel.style.display = 'none';
    }

    // --- DATA FETCHING & SEARCH ---
    async function searchFoods(query) {
        if (query.length < PREFIX_LENGTH) {
            showInitialMessage();
            return;
        }

        foodList.innerHTML = '<li class="info-item">Searching...</li>';
        const prefix = query.substring(0, PREFIX_LENGTH).toLowerCase();
        const fileNumbersToFetch = foodIndex[prefix] || [];

        if (fileNumbersToFetch.length === 0) {
            foodList.innerHTML = '<li class="info-item">No results found.</li>';
            return;
        }

        const fetchPromises = fileNumbersToFetch.map(fileNum => fetchAndCacheFile(fileNum));
        const allFileContents = await Promise.all(fetchPromises);
        
        const allLines = allFileContents.join('');
        const matchingFoods = parseAndFilterLines(allLines, query);

        populateFoodList(matchingFoods);
    }

    async function fetchAndCacheFile(fileNumber) {
        if (fileCache.has(fileNumber)) return fileCache.get(fileNumber);
        const start = Math.floor(fileNumber / 5000) * 5000;
        const end = start + 4999;
        const filename = `data/food_data_${start}-${end}.jsonl`;
        try {
            const response = await fetch(filename);
            const text = await response.text();
            fileCache.set(fileNumber, text);
            return text;
        } catch (error) {
            console.error(`Failed to fetch ${filename}`, error);
            return '';
        }
    }

    function parseAndFilterLines(text, query) {
        const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedQuery}\\b`, 'i');
        const matching = [];
        const lines = text.split('\n');
        for (const line of lines) {
            if (line && regex.test(line)) {
                try {
                    const foodItem = JSON.parse(line);
                    if (foodItem.food && foodItem.food.food_name && regex.test(foodItem.food.food_name)) {
                        matching.push(foodItem);
                    }
                } catch (e) { /* Skip malformed lines */ }
            }
        }
        return matching;
    }

    // --- UI UPDATING ---

    // THIS IS THE UPDATED FUNCTION
    function populateFoodList(foods) {
        if (foods.length === 0) {
            foodList.innerHTML = '<li class="info-item">No results found.</li>';
            return;
        }
        
        foodList.innerHTML = '';
        const query = searchInput.value.toLowerCase().trim();

        foods.sort((a, b) => {
            const nameA = a.food.food_name.trim().toLowerCase();
            const nameB = b.food.food_name.trim().toLowerCase();

            const lengthDifference = nameA.length - nameB.length;
            if (lengthDifference !== 0) {
                if (Math.abs(lengthDifference) > 2) {
                    return lengthDifference;
                }
            }
            const indexA = nameA.indexOf(query);
            const indexB = nameB.indexOf(query);
            const indexDifference = indexA - indexB;
            if (indexDifference !== 0) {
                return indexDifference;
            }
            return nameA.localeCompare(nameB);
        });

        foods.forEach(foodItem => {
            const li = document.createElement('li');
            li.textContent = foodItem.food.food_name.trim();
            li.dataset.foodId = foodItem.food.food_id;
            li.addEventListener('click', () => selectFood(foodItem));
            foodList.appendChild(li);
        });
    }


    function selectFood(foodItem) {
        currentFood = foodItem;
        resultsPanel.style.display = 'block';
        highlightActiveListItem(foodItem.food.food_id);
        updateMeasureDropdown(foodItem);
    }
    
    function highlightActiveListItem(foodId) {
        const foodIdStr = String(foodId);
        foodList.querySelectorAll('li').forEach(li => {
            li.classList.remove('active');
            if (li.dataset.foodId === foodIdStr) {
                li.classList.add('active');
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    function updateMeasureDropdown(foodItem) {
        measureDropdown.innerHTML = '';
        if (!foodItem.food_measures || foodItem.food_measures.length === 0) {
            console.error("This food item has no serving measures:", foodItem);
            document.getElementById('nutrientInfo').innerHTML = '';
            document.getElementById('micronutrientDetails').innerHTML = '';
            document.getElementById('chartContainer').style.display = 'none';
            return;
        }
        foodItem.food_measures.forEach(measure => {
            const option = document.createElement('option');
            option.value = measure.measure_id;
            option.textContent = measure.measure_name;
            option.dataset.defaultQuantity = measure.default_quantity || 1;
            measureDropdown.appendChild(option);
        });
        let defaultMeasureExists = Array.from(measureDropdown.options).some(opt => opt.value == foodItem.food.default_measure_id);
        if (defaultMeasureExists) {
            measureDropdown.value = foodItem.food.default_measure_id;
        } else {
            measureDropdown.selectedIndex = 0;
            console.warn(`Default measure ID ${foodItem.food.default_measure_id} not found for food ${foodItem.food.food_id}. Falling back to first available measure.`);
        }
        quantityInput.value = measureDropdown.options[measureDropdown.selectedIndex].dataset.defaultQuantity;
        recalculate();
    }
    
    // --- EVENT LISTENERS & CALCULATION ---
    function recalculate() {
        if (!currentFood) return;
        const selectedMeasureId = parseInt(measureDropdown.value);
        const selectedMeasure = currentFood.food_measures.find(m => m.measure_id === selectedMeasureId);
        if (selectedMeasure) {
            displayNutrientInfo(selectedMeasure);
        }
    }
    
    function displayNutrientInfo(measure) {
        // This function does not need to change.
        const quantity = parseFloat(quantityInput.value) || 1;
        const nutrientInfo = document.getElementById('nutrientInfo');
        const micronutrientDetails = document.getElementById('micronutrientDetails');
        const chartContainer = document.getElementById('chartContainer');
        const canvas = document.getElementById('macroChart');
        let macroChart = window.macroChart;

        const finalCarbs = measure.carbs * quantity;
        const finalProteins = measure.proteins * quantity;
        const finalFats = measure.fats * quantity;
        const finalFibre = measure.fibre * quantity;
        const caloriesFromCarbs = finalCarbs * 4;
        const caloriesFromProtein = finalProteins * 4;
        const caloriesFromFat = finalFats * 9;
        const totalCalories = caloriesFromCarbs + caloriesFromProtein + caloriesFromFat;

        nutrientInfo.innerHTML = `<h3>Macronutrients</h3><div class="nutrients-grid"><div class="nutrient-item calorie-item"><i class="fas fa-fire-alt"></i><div class="label">Calories</div><div class="value">${totalCalories.toFixed(2)} kcal</div></div><div class="nutrient-item"><i class="fas fa-bread-slice"></i><div class="label">Carbs</div><div class="value">${finalCarbs.toFixed(2)} g</div></div><div class="nutrient-item"><i class="fas fa-drumstick-bite"></i><div class="label">Protein</div><div class="value">${finalProteins.toFixed(2)} g</div></div><div class="nutrient-item"><i class="fas fa-oil-can"></i><div class="label">Fats</div><div class="value">${finalFats.toFixed(2)} g</div></div><div class="nutrient-item"><i class="fas fa-seedling"></i><div class="label">Fibre</div><div class="value">${finalFibre.toFixed(2)} g</div></div></div>`;

        const micros = measure.micronutrient_details;
        if (micros) {
            const createListItem = (label, value, unit) => {
                if (value !== undefined && value !== null) {
                    const finalValue = value * quantity;
                    return `<li><strong>${label}</strong> <span>${finalValue.toFixed(2)} ${unit}</span></li>`;
                }
                return '';
            };
            micronutrientDetails.innerHTML = `<h4>Detailed Nutrients</h4><ul>${createListItem("Total Sugars", micros.total_sugars, "g")}${createListItem("Saturated Fats", micros.saturated_fats, "g")}${createListItem("Cholesterol", micros.cholesterol || micros.cholestrol, "mg")}${createListItem("Sodium", micros.sodium, "mg")}${createListItem("Calcium", micros.calcium, "mg")}${createListItem("Iron", micros.iron, "mg")}${createListItem("Magnesium", micros.magnesium, "mg")}${createListItem("Zinc", micros.zinc, "mg")}${createListItem("Vitamin A", micros.vitamin_a, "mcg")}${createListItem("Vitamin C", micros.vitamin_c, "mg")}</ul>`;
        } else {
            micronutrientDetails.innerHTML = '';
        }

        if (chartContainer && canvas && totalCalories > 0) {
            chartContainer.style.display = 'block';
            if (macroChart) { macroChart.destroy(); }
            const ctx = canvas.getContext('2d');
            window.macroChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Carbs', 'Protein', 'Fat'],
                    datasets: [{ data: [caloriesFromCarbs, caloriesFromProtein, caloriesFromFat], backgroundColor: ['rgba(255, 159, 64, 0.8)', 'rgba(75, 192, 192, 0.8)', 'rgba(255, 205, 86, 0.8)'], borderColor: ['#fff'], borderWidth: 2 }]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function(context) { const value = context.raw; const percentage = ((value / totalCalories) * 100).toFixed(0); return `${context.label}: ${value.toFixed(0)} kcal (${percentage}%)`; } } } } }
            });
        } else if (chartContainer) {
            chartContainer.style.display = 'none';
        }
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.toLowerCase().trim();
        if (query.length < PREFIX_LENGTH) {
            showInitialMessage();
            return;
        }
        searchTimeout = setTimeout(() => {
            searchFoods(query);
        }, 300);
    });

    measureDropdown.addEventListener('change', () => {
        quantityInput.value = measureDropdown.options[measureDropdown.selectedIndex].dataset.defaultQuantity;
        recalculate();
    });

    quantityInput.addEventListener('input', recalculate);
});