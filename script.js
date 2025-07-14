// REPLACE the entire document.addEventListener block in your script.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const measureDropdown = document.getElementById('measureDropdown');
    const foodList = document.getElementById('foodList');
    const sortButton = document.getElementById('sortButton'); // Get the new sort button
    
    let foodData = [];
    let currentFoodId = null; // State variable to track selected food
    let sortOrder = 'asc'; // State variable for sorting ('asc' or 'desc')

    fetch('food.jsonl')
        .then(response => response.text())
        .then(text => {
            const lines = text.split('\n');
            const allFoods = lines
                .map(line => { try { return JSON.parse(line); } catch (e) { return null; } })
                .filter(obj => obj && obj.food);
            
            // Initial sort A-Z
            foodData = sortFoods(allFoods, 'asc');

            if (foodData.length > 0) {
                populateFoodList(foodData);
                // Select the first food in the list by default
                selectFood(foodData[0].food.food_id);
            } else {
                console.error("No valid food data could be extracted from the file.");
                document.querySelector('.card-body').innerHTML = '<p style="color: red;">Error: Could not load food data.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching or parsing food data:', error);
            document.querySelector('.card-body').innerHTML = '<p style="color: red;">Error: Could not load food data file.</p>';
        });

    // REFACTORED: Central function to select a food and update the UI
    function selectFood(foodId) {
        if (!foodId) return;
        currentFoodId = parseInt(foodId);
        
        const selectedFood = foodData.find(item => item.food.food_id === currentFoodId);
        if (selectedFood) {
            updateMeasureDropdown(selectedFood);
            highlightActiveListItem(currentFoodId);
        }
    }

    // NEW: Function to sort the food data array
    function sortFoods(foods, order) {
        return foods.sort((a, b) => {
            const nameA = a.food.food_name.trim().toLowerCase();
            const nameB = b.food.food_name.trim().toLowerCase();
            if (order === 'asc') {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });
    }

    function populateFoodList(foods) {
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
        foodItem.food_measures.forEach(measure => {
            const option = document.createElement('option');
            option.value = measure.measure_id;
            option.textContent = measure.measure_name;
            measureDropdown.appendChild(option);
        });
        measureDropdown.value = foodItem.food.default_measure_id;
        measureDropdown.dispatchEvent(new Event('change'));
    }

function displayNutrientInfo(measure) {
    const nutrientInfo = document.getElementById('nutrientInfo');
    nutrientInfo.innerHTML = `
        <h3>Macronutrients</h3>
        <div class="nutrients-grid">
            <div class="nutrient-item calorie-item">
                <i class="fas fa-fire-alt"></i>
                <div class="label">Calories</div>
                <!-- The unit "kcal" has been added below -->
                <div class="value">${measure.calorie.toFixed(2)} kcal</div>
            </div>
            <div class="nutrient-item">
                <i class="fas fa-bread-slice"></i>
                <div class="label">Carbs</div>
                <div class="value">${measure.carbs.toFixed(2)} g</div>
            </div>
            <div class="nutrient-item">
                <i class="fas fa-drumstick-bite"></i>
                <div class="label">Protein</div>
                <div class="value">${measure.proteins.toFixed(2)} g</div>
            </div>
            <div class="nutrient-item">
                <i class="fas fa-oil-can"></i>
                <div class="label">Fats</div>
                <div class="value">${measure.fats.toFixed(2)} g</div>
            </div>
            <div class="nutrient-item">
                <i class="fas fa-seedling"></i>
                <div class="label">Fibre</div>
                <div class="value">${measure.fibre.toFixed(2)} g</div>
            </div>
        </div>
    `;

    const micronutrientDetails = document.getElementById('micronutrientDetails');
    const micros = measure.micronutrient_details;
    if (micros) {
        const createListItem = (label, value, unit) => (value !== undefined && value !== null) ? `<li><strong>${label}</strong> <span>${value.toFixed(2)} ${unit}</span></li>` : '';
        micronutrientDetails.innerHTML = `<h4>Detailed Nutrients</h4><ul>${createListItem("Total Sugars", micros.total_sugars, "g")}${createListItem("Saturated Fats", micros.saturated_fats, "g")}${createListItem("Cholesterol", micros.cholesterol || micros.cholestrol, "mg")}${createListItem("Sodium", micros.sodium, "mg")}${createListItem("Calcium", micros.calcium, "mg")}${createListItem("Iron", micros.iron, "mg")}${createListItem("Magnesium", micros.magnesium, "mg")}${createListItem("Zinc", micros.zinc, "mg")}${createListItem("Vitamin A", micros.vitamin_a, "mcg")}${createListItem("Vitamin C", micros.vitamin_c, "mg")}</ul>`;
    } else {
        micronutrientDetails.innerHTML = '';
    }
}

    // --- Event Listeners ---
    
    // UPDATED: Measure dropdown uses the state variable
    measureDropdown.addEventListener('change', () => {
        const selectedMeasureId = parseInt(measureDropdown.value);
        const selectedFood = foodData.find(item => item.food.food_id === currentFoodId);
        if (selectedFood) {
            const selectedMeasure = selectedFood.food_measures.find(m => m.measure_id === selectedMeasureId);
            if (selectedMeasure) {
                displayNutrientInfo(selectedMeasure);
            }
        }
    });

    // UPDATED: Search only repopulates the list and selects the first result
    searchInput.addEventListener('input', () => {
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

    // NEW: Event listener for the sort button
    sortButton.addEventListener('click', () => {
        // Toggle sort order
        sortOrder = (sortOrder === 'asc') ? 'desc' : 'asc';
        
        // Update button text and icon
        if (sortOrder === 'asc') {
            sortButton.innerHTML = `<i class="fas fa-sort-alpha-down"></i> Sort A-Z`;
        } else {
            sortButton.innerHTML = `<i class="fas fa-sort-alpha-up"></i> Sort Z-A`;
        }

        // Re-sort the current data and update the list
        const currentlyDisplayedFoods = foodData.filter(item => {
            const currentListIds = Array.from(foodList.querySelectorAll('li')).map(li => li.dataset.foodId);
            return currentListIds.includes(String(item.food.food_id));
        });

        const sortedList = sortFoods(currentlyDisplayedFoods, sortOrder);
        populateFoodList(sortedList);
        
        // Re-highlight the active item
        highlightActiveListItem(currentFoodId);
    });
});

