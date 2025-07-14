// REPLACE the entire document.addEventListener block in your script.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const measureDropdown = document.getElementById('measureDropdown');
    const foodList = document.getElementById('foodList');
    const sortButton = document.getElementById('sortButton');
    const quantityInput = document.getElementById('quantityInput'); // Get the new quantity input
        const chartContainer = document.getElementById('chartContainer'); // Get the chart container

    let foodData = [];
    let currentFoodId = null;
    let sortOrder = 'asc';
    let macroChart = null; // Variable to hold the chart instance

    fetch('food.jsonl')
        .then(response => response.text())
        .then(text => {
            const lines = text.split('\n');
            const allFoods = lines
                .map(line => { try { return JSON.parse(line); } catch (e) { return null; } })
                .filter(obj => obj && obj.food);
            
            foodData = sortFoods(allFoods, 'asc');

            if (foodData.length > 0) {
                populateFoodList(foodData);
                selectFood(foodData[0].food.food_id);
            } else {
                // Handle error
            }
        })
        .catch(error => console.error('Error:', error));

    function selectFood(foodId) {
        if (!foodId) return;
        currentFoodId = parseInt(foodId);
        
        const selectedFood = foodData.find(item => item.food.food_id === currentFoodId);
        if (selectedFood) {
            updateMeasureDropdown(selectedFood);
            highlightActiveListItem(currentFoodId);
        }
    }

    function sortFoods(foods, order) {
        // ... (this function remains the same)
        return foods.sort((a, b) => {
            const nameA = a.food.food_name.trim().toLowerCase();
            const nameB = b.food.food_name.trim().toLowerCase();
            if (order === 'asc') return nameA.localeCompare(nameB);
            else return nameB.localeCompare(nameA);
        });
    }

    function populateFoodList(foods) {
        // ... (this function remains the same)
        foodList.innerHTML = '';
        foods.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.food.food_name.trim();
            li.dataset.foodId = item.food.food_id;
            li.addEventListener('click', () => selectFood(li.dataset.foodId));
            foodList.appendChild(li);
        });
    }

    function highlightActiveListItem(foodId) {
        // ... (this function remains the same)
        const foodIdStr = String(foodId);
        foodList.querySelectorAll('li').forEach(li => {
            li.classList.remove('active');
            if (li.dataset.foodId === foodIdStr) {
                li.classList.add('active');
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    // MODIFIED: This function now sets the default quantity
    function updateMeasureDropdown(foodItem) {
        measureDropdown.innerHTML = '';
        foodItem.food_measures.forEach(measure => {
            const option = document.createElement('option');
            option.value = measure.measure_id;
            option.textContent = measure.measure_name;
            measureDropdown.appendChild(option);
        });
        measureDropdown.value = foodItem.food.default_measure_id;
        
        // When a new food is selected, set the quantity input to its default
        const defaultMeasure = foodItem.food_measures.find(m => m.measure_id === foodItem.food.default_measure_id);
        quantityInput.value = defaultMeasure?.default_quantity || 1;

        measureDropdown.dispatchEvent(new Event('change'));
    }

    // THE MAIN CHANGE: This function now performs calculations
    function displayNutrientInfo(measure) {
        const quantity = parseFloat(quantityInput.value) || 1;
        const nutrientInfo = document.getElementById('nutrientInfo');

        // Calculate final values by multiplying by quantity
        const finalCalories = measure.calorie * quantity;
        const finalCarbs = measure.carbs * quantity;
        const finalProteins = measure.proteins * quantity;
        const finalFats = measure.fats * quantity;
        const finalFibre = measure.fibre * quantity;

        const caloriesFromCarbs = finalCarbs * 4;
    const caloriesFromProtein = finalProteins * 4;
    const caloriesFromFat = finalFats * 9;
    const totalCalories = caloriesFromCarbs + caloriesFromProtein + caloriesFromFat;


        nutrientInfo.innerHTML = `
            <h3>Macronutrients</h3>
            <div class="nutrients-grid">
                <div class="nutrient-item calorie-item">
                    <i class="fas fa-fire-alt"></i>
                    <div class="label">Calories</div>
                    <div class="value">${finalCalories.toFixed(2)} kcal</div>
                </div>
                <div class="nutrient-item">
                    <i class="fas fa-bread-slice"></i>
                    <div class="label">Carbs</div>
                    <div class="value">${finalCarbs.toFixed(2)} g</div>
                </div>
                <div class="nutrient-item">
                    <i class="fas fa-drumstick-bite"></i>
                    <div class="label">Protein</div>
                    <div class="value">${finalProteins.toFixed(2)} g</div>
                </div>
                <div class="nutrient-item">
                    <i class="fas fa-oil-can"></i>
                    <div class="label">Fats</div>
                    <div class="value">${finalFats.toFixed(2)} g</div>
                </div>
                <div class="nutrient-item">
                    <i class="fas fa-seedling"></i>
                    <div class="label">Fibre</div>
                    <div class="value">${finalFibre.toFixed(2)} g</div>
                </div>
            </div>
        `;

        const micronutrientDetails = document.getElementById('micronutrientDetails');
        const micros = measure.micronutrient_details;
        if (micros) {
            const createListItem = (label, value, unit) => {
                if (value !== undefined && value !== null) {
                    const finalValue = value * quantity; // Also multiply micronutrients
                    return `<li><strong>${label}</strong> <span>${finalValue.toFixed(2)} ${unit}</span></li>`;
                }
                return '';
            };
            micronutrientDetails.innerHTML = `<h4>Detailed Nutrients</h4><ul>${createListItem("Total Sugars", micros.total_sugars, "g")}${createListItem("Saturated Fats", micros.saturated_fats, "g")}${createListItem("Cholesterol", micros.cholesterol || micros.cholestrol, "mg")}${createListItem("Sodium", micros.sodium, "mg")}${createListItem("Calcium", micros.calcium, "mg")}${createListItem("Iron", micros.iron, "mg")}${createListItem("Magnesium", micros.magnesium, "mg")}${createListItem("Zinc", micros.zinc, "mg")}${createListItem("Vitamin A", micros.vitamin_a, "mcg")}${createListItem("Vitamin C", micros.vitamin_c, "mg")}</ul>`;
        } else {
            micronutrientDetails.innerHTML = '';
        }
        
    }

    // Function to trigger the calculation and display update
    function recalculate() {
        const selectedMeasureId = parseInt(measureDropdown.value);
        const selectedFood = foodData.find(item => item.food.food_id === currentFoodId);
        if (selectedFood) {
            const selectedMeasure = selectedFood.food_measures.find(m => m.measure_id === selectedMeasureId);
            if (selectedMeasure) {
                displayNutrientInfo(selectedMeasure);
            }
        }
    }

    // --- Event Listeners ---

    // When the measure dropdown changes, update the quantity input and recalculate
    measureDropdown.addEventListener('change', () => {
        const selectedMeasureId = parseInt(measureDropdown.value);
        const selectedFood = foodData.find(item => item.food.food_id === currentFoodId);
        if (selectedFood) {
            const selectedMeasure = selectedFood.food_measures.find(m => m.measure_id === selectedMeasureId);
            if (selectedMeasure) {
                // If the selected measure is 'grams', set the default to 100g, otherwise use its default
                if (selectedMeasure.measure_name.toLowerCase().includes('gram')) {
                    quantityInput.value = 100;
                } else {
                    quantityInput.value = selectedMeasure.default_quantity || 1;
                }
            }
        }
        recalculate();
    });
    
    // NEW: When the quantity input changes, just recalculate
    quantityInput.addEventListener('input', recalculate);
    
    searchInput.addEventListener('input', () => {
        // ... (this function remains the same)
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredFoods = foodData.filter(item => item.food.food_name.toLowerCase().includes(searchTerm));
        populateFoodList(filteredFoods);
        if (filteredFoods.length > 0) {
            selectFood(filteredFoods[0].food.food_id);
        } else {
            document.getElementById('nutrientInfo').innerHTML = '';
            document.getElementById('micronutrientDetails').innerHTML = '';
            measureDropdown.innerHTML = '';
        }
    });

    sortButton.addEventListener('click', () => {
        // ... (this function remains the same)
        sortOrder = (sortOrder === 'asc') ? 'desc' : 'asc';
        if (sortOrder === 'asc') sortButton.innerHTML = `<i class="fas fa-sort-alpha-down"></i> Sort A-Z`;
        else sortButton.innerHTML = `<i class="fas fa-sort-alpha-up"></i> Sort Z-A`;
        const currentlyDisplayedFoods = foodData.filter(item => {
            const currentListIds = Array.from(foodList.querySelectorAll('li')).map(li => li.dataset.foodId);
            return currentListIds.includes(String(item.food.food_id));
        });
        const sortedList = sortFoods(currentlyDisplayedFoods, sortOrder);
        populateFoodList(sortedList);
        highlightActiveListItem(currentFoodId);
    });
});