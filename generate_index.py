import json
import os
import re

# --- CONFIGURATION ---
DATA_DIRECTORY = "./Data"  
OUTPUT_FILE = "food_index.json"
PREFIX_LENGTH = 3
# --- END CONFIGURATION ---

file_index = {}

# Regex to extract the starting number from the filename
# e.g., extracts '5000' from 'food_data_5000-9999.jsonl'
file_number_regex = re.compile(r'(\d+)')

def get_file_identifier(filename):
    match = file_number_regex.search(filename)
    return int(match.group(1)) if match else None

# Get all .jsonl files from the directory
all_files = [f for f in os.listdir(DATA_DIRECTORY) if f.endswith('.jsonl')]

for filename in all_files:
    file_id = get_file_identifier(filename)
    if file_id is None:
        continue
    
    print(f"Processing {filename}...")
    
    with open(os.path.join(DATA_DIRECTORY, filename), 'r', encoding='utf-8') as f:
        for line in f:
            try:
                # We only need the food_name, so we do a quick parse
                data = json.loads(line)
                if 'food' in data and 'food_name' in data['food']:
                    food_name = data['food']['food_name'].strip().lower()
                    if len(food_name) >= PREFIX_LENGTH:
                        prefix = food_name[:PREFIX_LENGTH]
                        
                        # If this prefix is new, create an entry
                        if prefix not in file_index:
                            file_index[prefix] = []
                        
                        # If this file_id isn't already listed for this prefix, add it
                        if file_id not in file_index[prefix]:
                            file_index[prefix].append(file_id)
            except json.JSONDecodeError:
                continue # Skip malformed lines

# Sort the file lists for consistency
for prefix in file_index:
    file_index[prefix].sort()

# Write the final index to the output file
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(file_index, f, indent=2)

print(f"\nIndex created successfully! Saved to {OUTPUT_FILE}")