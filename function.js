const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const jsforce = require('jsforce');
const express = require('express');
const app = express();

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();
const PROJECT_ID = '13958241844'; // Replace with your GCP project ID

// Helper function to access secrets
async function accessSecret(secretName) {
    try {
        const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
        const [version] = await secretClient.accessSecretVersion({ name });
        return version.payload.data.toString('utf8');
    } catch (error) {
        console.error(`Error accessing secret ${secretName}:`, error);
        throw error;
    }
}

// Helper function to fetch metadata from Salesforce
async function getMetadata(conn, objectName) {
    console.log(`Starting metadata fetch for ${objectName}...`);
    return new Promise((resolve, reject) => {
        conn.sobject(objectName).describe()
            .then(metadata => {
                const fields = metadata.fields.map(field => ({
                    FieldLabel: field.label || '',
                    FieldName: field.name || '',
                    APIName: field.name || '',
                    HelpText: field.inlineHelpText || '',
                    DataType: field.type || ''
                }));
                console.log(`Successfully processed ${fields.length} fields for ${objectName}`);
                resolve(fields);
            })
            .catch(err => {
                console.error(`Error fetching metadata for ${objectName}:`, err);
                reject(err);
            });
    });
}

// Helper function to write data to Google Sheets
async function writeToSheet(sheets, objectName, fields, spreadsheetId) {
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

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetTitle}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values }
        });

        console.log(`Data written to sheet for ${objectName}`);
    } catch (error) {
        console.error(`Error writing data to sheet for ${objectName}:`, error);
        throw error;
    }
}

// Main Cloud Function
const updateDataDictionary = async (req, res) => {
    try {
        console.log('Starting data dictionary update process...');

        // Fetch all required secrets
        const [
            sfRefreshToken,
            sfClientId,
            sfClientSecret,
            sfInstanceUrl,
            googleCredentials,
            spreadsheetId
        ] = await Promise.all([
            accessSecret('SF_REFRESH_TOKEN'),
            accessSecret('SF_CLIENT_ID'),
            accessSecret('SF_CLIENT_SECRET'),
            accessSecret('SF_INSTANCE_URL'),
            accessSecret('CREDENTIALS_PATH'),
            accessSecret('SPREADSHEET_ID')
        ]);

        // Initialize Google Sheets
        const credentials = JSON.parse(googleCredentials);
        const auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets']
        );
        const sheets = google.sheets({ version: 'v4', auth });

        // Initialize Salesforce connection
        const conn = new jsforce.Connection({
            oauth2: {
                clientId: sfClientId,
                clientSecret: sfClientSecret,
                redirectUri: 'https://eshyft--sandbox3.sandbox.my.salesforce.com/services/oauth2/callback'
            },
            instanceUrl: sfInstanceUrl,
            refreshToken: sfRefreshToken,
            loginUrl: 'https://eshyft--sandbox3.sandbox.my.salesforce.com'
        });

        // Refresh Salesforce token
        await conn.oauth2.refreshToken(sfRefreshToken);
        console.log('Salesforce connection established');

        // objects to process
        const objectToPull = ['Shift__c', 'Application__c', 'TimeCards__c'];
        console.log('Starting metadata fetch process...');

        // Process each object
        for (const objectName of objectToPull) {
            try {
                console.log(`Processing ${objectName}...`);
                const fields = await getMetadata(conn, objectName);
                console.log(`Got metadata for ${objectName}, field count:`, fields.length);

                console.log(`Writing ${objectName} to Google Sheets...`);
                await writeToSheet(sheets, objectName, fields, spreadsheetId);
                console.log(`Completed processing ${objectName}`);
            } catch (error) {
                console.error(`Failed to process ${objectName}:`, error.message);
                continue;
            }
        }

        console.log('Data dictionary update completed successfully');
        return res.status(200).send('Data dictionary updated successfully');
    } catch (error) {
        console.error('Error updating dictionary:', error);
        return res.status(500).send(`Failed to update data dictionary: ${error.message}`);
    }
};

// Add port handling
const port = process.env.PORT || 8080;
app.get('/', updateDataDictionary);

app.listen(port, () => {
    console.log(`Function listening on port ${port}`);
});

// Export both the function and app
exports.updateDataDictionary = updateDataDictionary;
exports.app = app;