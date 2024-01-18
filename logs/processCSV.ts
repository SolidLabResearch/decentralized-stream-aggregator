import * as fs from 'fs';

// Read the CSV file
const csvFilePath = 'module_processing_time.csv';
const csvContent = fs.readFileSync(csvFilePath, 'utf-8');

// Parse the CSV content into rows
const rows = csvContent.trim().split('\n').map(row => row.split(','));

// Initialize a Map to store cumulative time differences
const cumulativeTimes = new Map<string, number>();

// Iterate through each row of the CSV
for (const row of rows) {
    // Extract values from the row
    const message1 = row[0].trim();
    const message2 = row[1].trim();
    const timeDifference = parseFloat(row[2]);

    // Create a key for the Map based on Message 1 and Message 2
    const key = `${message1},${message2}`;

    // Check if the key exists in the Map
    if (cumulativeTimes.has(key)) {
        // If the key exists, add the time difference to the existing value
        cumulativeTimes.set(key, cumulativeTimes.get(key)! + timeDifference);
    } else {
        // If the key doesn't exist, set the time difference as the initial value
        cumulativeTimes.set(key, timeDifference);
    }
}

// Prepare the content for the new CSV file
const newCsvContent = Array.from(cumulativeTimes.entries()).map(([key, value]) => `${key},${value}`).join('\n');

// Write the content to a new CSV file
const newCsvFilePath = 'new-file.csv';
fs.writeFileSync(newCsvFilePath, newCsvContent, 'utf-8');

console.log(`Cumulative times written to ${newCsvFilePath}`);
