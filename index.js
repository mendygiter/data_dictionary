const express = require('express');
const { google } = require('googleapis');
const jsforce = require('jsforce');
const fs = require('fs');
const app = express();
require('dotenv').config();
const PORT = 4000;


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
const SF_REFRESH_TOKEN = process.env.SF_REFRESH_TOKEN;
const SF_ACCESS_TOKEN = process.env.SF_ACCESS_TOKEN;
const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SF_CLIENT_ID = process.env.SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;

// Establish Salesforce connection with OAuth
const conn = new jsforce.Connection({
    oauth2: {
        clientId: SF_CLIENT_ID,
        clientSecret: SF_CLIENT_SECRET,
        redirectUri: process.env.SF_REDIRECT_URI,
    },
    instanceUrl: SF_INSTANCE_URL,
    refreshToken: SF_REFRESH_TOKEN,
    loginUrl: 'https://eshyft--sandbox3.sandbox.my.salesforce.com'
});

conn.oauth2.refreshToken(SF_REFRESH_TOKEN)
    .then(results => {
        console.log("Connected to Salesforce");
        conn.accessToken = results.access_token;
    })
    .catch(err => {
        console.error("Error connecting to Salesforce:", err);
    });
conn.on('refresh', (newAccessToken) => {
    console.log('Access token refreshed:', newAccessToken);
    // Store the new access token if needed
});

conn.on('error', (err) => {
    console.error('Salesforce connection error:', err);
});

//Function to fetch metadata from Salesforce
function getMetadata(objectName) {
    console.log(`Starting metadata fetch for ${objectName}...`);

    return new Promise((resolve, reject) => {
        conn.sobject(objectName).describe((err, metadata) => {
            if (err) {
                console.error(`Error fetching metadata for ${objectName}:`, err);
                reject(err);
                return;
            }

            const fields = metadata.fields.map(field => ({
                FieldLabel: field.label || '',
                FieldName: field.name || '',
                APIName: field.name || '',
                HelpText: field.inlineHelpText || '',
                DataType: field.type || ''
            }));

            console.log (`Succesfully proccessed ${fields.length} fields for ${objectName}`);
            resolve(fields);
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
        const sheetTitle = objectName;
        const sheetResponse = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetExists = sheetResponse.data.sheets.some(sheet =>
            sheet.properties.title === sheetTitle);

        if (!sheetExists) {
            // Create new sheet
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: { title: sheetTitle }
                        }
                    }]
                }
            });
        }

        // Write data
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetTitle}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values }
        });

        console.log(`Data written to sheet for ${objectName}`);
    } catch (error) {
        console.error(`Error writing data to sheet for ${objectName}:`, error);
        throw error;  // Re-throw to be caught by the main error handler
    }
}

app.get('/', (req, res) => {
    res.send('Welcome! Use /update-dictionary to update the data dictionary or /test-sheets to test the Google Sheets connection.');
});

//Main function to pull metadata and update G-sheets
app.get('/update-dictionary', async (req, res) => {
    const objectToPull = ['Shift__c', 'Application__c', 'TimeCards__c'];
    const spreadsheetId = '1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY';

    try {
        console.log('Starting metadata fetch...');

        for (const objectName of objectToPull) {
            try{
                const fields = await getMetadata(objectName);
                console.log(`writing ${objectName} to google sheets...`);
                await writeToSheet(objectName, fields, spreadsheetId);
                console.log(`completed proccessing ${objectName}`);
            } catch (error) {
                console.error(`Failed to process ${objectName}:`, error)
                continue;
            }
        };
        res.status(200).send('Data dictionary updated successfully');
    } catch (error) {
        console.error('Error updating dictionary:', error);
        res.status(500).send('Failed to update data dictionary: ' + error.message);
    }
});

app.get('/auth/salesforce', (req, res) => {
    res.redirect(conn.oauth2.getAuthorizationUrl({
        scope: 'api refresh_token',
        loginUrl: 'https://eshyft--sandbox3.sandbox.my.salesforce.com'
    }));
});

app.get('/auth/salesforce/callback', (req, res) => {
    const code = req.query.code;

    conn.authorize(code, (err, userInfo) => {
        if (err) {
            console.error('Auth error:', err);
            return res.status(500).send(err.message);
        }

        // Store these new tokens in your .env file
        console.log('Access Token:', conn.accessToken);
        console.log('Refresh Token:', conn.refreshToken);
        console.log('Instance URL:', conn.instanceUrl);

        res.send('Authentication successful! Check your console for the tokens.');
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});