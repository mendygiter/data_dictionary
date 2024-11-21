const express = require('express');
const { google } = require('googleapis');
const jsforce = require('jsforce');
const fs = require('fs');
const app = express();
require('dotenv').config();
const PORT = 3000;


// Load Google Sheets credentials
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH;
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    SCOPES
);

const sheets = google.sheets({ version: 'v4', auth });

//Salesforce Credentials
const SF_USERNAME = process.env.SF_USERNAME;
const SF_PASSWORD = process.env.SF_PASSWORD;
const SF_LOGIN_URL = process.env.SF_LOGIN_URL;

const conn = new jsforce.Connection({ loginUrl: SF_LOGIN_URL });

//Function to fetch metadata from Salesforce
async function getMetadata(objectName) {
    return new Promise((resolve, reject) => {
        conn.sobject(objectName).describe((err, metadata) => {
            if (err) {
                reject(err);
            } else {
                const fields = metadata.fields.map(field => ({
                    FieldLabel: field.label || '',
                    FieldName: field.name || '',
                    APIName: field.name || '',
                    HelpText: field.inlineHelpText || '',
                    DataType: field.Type || ''
                }));
                resolve(fields);
            }
        });
    });
}

// Function to write data to google sheets
async function writeToSheet(objectName, fields, spreadsheetId) {
    const values = [
        ['Field Label', 'Field Name', 'API Name', 'Help Text', 'Data Type'],
        ...fields.map(field => [
            field.FieldLabel,
            field.FieldName,
            field.APIName,
            field.HelpText,
            field.DataType
        ])
    ];

    try {
        // Check if the sheet/tab exists, otherwise create it
        const sheetTitle = objectName;
        const sheetResponse = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetExists = sheetResponse.data.sheets.some(sheet => sheet.properties.title === sheetTitle);

        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: sheetTitle
                                }
                            }
                        }
                    ]
                }
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `$(sheetTitle)!A1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values
                }
            });
        }
        
        console.log(`Data written to sheet for ${objectName}`);
    } catch (error) {
        console.error(`Error writing data to sheet for ${objectName}:`, error);
    }
}


/*
//Test endpoint to get data from Google Sheets
app.get ('/test-sheets', async (req, res) => {
    const spreadsheetId = '1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY';
    const range = 'sheet1!A2:A7';

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        const rows = response.data.values;
        if (rows.length) {
            console.log('Data retrieved from Google Sheets:', rows);
            res.status(200).json({
                message: 'Data retrieved successfully',
                data: rows,
            });
        } else {
            console.log('No data found.');
            res.status(200).send('No data found.')
        }
    } catch (error) {
        console.error('Error fetching data from Google sheets:', error);
        res.status(500).send('Failed to fetch data from Google sheets.');
    }
});

app.listen (PORT, () =>{
    console.log('Server running on http;//localhost:${PORT}');
});
*/