const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const csvHeaders = 'Type,Timestamp,Brand,FuelType,Age,Price,Kilometers,Insurance,Tax,FuelConsumption,ElectricConsumption,GasConsumption,Maintenance,Tires,OtherCosts,Depreciation,Costs,Total\n';

app.use(express.json());
app.use(express.static(path.resolve(__dirname)));


// Initialize CSV file if it doesn't exist
if (!fs.existsSync('search_log.csv')) {
    fs.writeFileSync('search_log.csv', csvHeaders);
}

// Route for "Calculate" button clicks
app.post('/logCalculate', (req, res) => {
    const timestamp = new Date().toISOString();
    const data = req.body;

    const csvLine = [
        "Calculate",
        timestamp,
        data.brand || '',
        data.fuelType || '',
        data.age || '',
        data.price || '0.00',
        data.kilometers || '',
        data.insurance || '0.00',
        data.tax || '0.00',
        data.fuelConsumption || '',
        data.electricConsumption || '',
        data.gasConsumption || '',
        data.maintenance || '0.00',
        data.tires || '0.00',
        data.otherCosts || '0.00',
        data.depreciation || '0.00',
        data.costs || '0.00',
        data.total || '0.00'
    ].join(',') + '\n';

    fs.appendFile('search_log.csv', csvLine, (err) => {
        if (err) {
            console.error("Error writing to CSV:", err);
            return res.status(500).send("Error writing to CSV.");
        }
        console.log('Calculate action logged to file');
        res.status(200).send('Calculate action logged');
    });
});

// Route for "Add to Compare" button clicks
app.post('/logAddToCompare', (req, res) => {
    const data = req.body;
    const timestamp = new Date().toISOString();

    const csvLine = [
        "AddToCompare",
        timestamp,
        data.brand || '',
        data.fuelType || '',
        data.age || '',
        data.price || '0.00',
        data.kilometers || '',
        data.insurance || '0.00',
        data.tax || '0.00',
        data.fuelConsumption || '',
        data.electricConsumption || '',
        data.gasConsumption || '',
        data.maintenance || '0.00',
        data.tires || '0.00',
        data.otherCosts || '0.00',
        data.depreciation || '0.00',
        data.costs || '0.00',
        data.total || '0.00'
    ].join(',') + '\n';

    fs.appendFile('search_log.csv', csvLine, (err) => {
        if (err) {
            console.error("Error writing to CSV:", err);
            return res.status(500).send("Error writing to CSV.");
        }
        console.log('Add to Compare action logged to file');
        res.status(200).send("Data logged to compare.");
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
