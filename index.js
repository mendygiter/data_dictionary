const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const jsforce = require('jsforce');

const PROJECT_ID = 'eshyft-salesforce-dev';
const secretClient = new SecretManagerServiceClient();

// Helper to get secrets
async function getSecret(secretName) {
    const [version] = await secretClient.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`,
    });
    return version.payload.data.toString('utf8');
}

/**
 * HTTP Cloud Function (Gen 2)
 * Updates Salesforce Data Dictionary in Google Sheets
 * - Preserves custom data in columns F+
 * - Marks deleted fields RED
 * - Marks new fields PINK
 */
exports.updateDataDictionary = async (req, res) => {
    console.log('Starting data dictionary update...');
    
    try {
        // Get credentials from Secret Manager
        console.log('Loading secrets...');
        const [SF_REFRESH_TOKEN, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_INSTANCE_URL, GOOGLE_CREDENTIALS, SPREADSHEET_ID] = await Promise.all([
            getSecret('SF_REFRESH_TOKEN'),
            getSecret('SF_CLIENT_ID'),
            getSecret('SF_CLIENT_SECRET'),
            getSecret('SF_INSTANCE_URL'),
            getSecret('CREDENTIALS_PATH'),
            getSecret('SPREADSHEET_ID')
        ]);
        console.log('Secrets loaded');

        // Parse Google credentials
        const credentials = JSON.parse(GOOGLE_CREDENTIALS);
        
        // Initialize Google Sheets
        const auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets']
        );
        const sheets = google.sheets({ version: 'v4', auth });
        console.log('Google Sheets initialized');

        // Initialize Salesforce
        const conn = new jsforce.Connection({
            oauth2: {
                clientId: SF_CLIENT_ID,
                clientSecret: SF_CLIENT_SECRET,
            },
            instanceUrl: SF_INSTANCE_URL,
            refreshToken: SF_REFRESH_TOKEN,
        });

        await conn.oauth2.refreshToken(SF_REFRESH_TOKEN);
        console.log('Salesforce connected');

        // Objects to sync
        const objects = ['Shift__c', 'Application__c', 'TimeCards__c'];
        
        for (const objectName of objects) {
            console.log(`Processing ${objectName}...`);
            
            // Get metadata from Salesforce
            const metadata = await conn.sobject(objectName).describe();
            const sfFields = metadata.fields.map(field => ({
                FieldLabel: field.label || '',
                FieldName: field.name || '',
                APIName: field.name || '',
                HelpText: field.inlineHelpText || '',
                DataType: field.type || ''
            }));
            
            console.log(`Got ${sfFields.length} fields for ${objectName}`);

            // Check if sheet exists
            const sheetResponse = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
            const sheet = sheetResponse.data.sheets.find(s => s.properties.title === objectName);
            const sheetExists = !!sheet;

            if (!sheetExists) {
                // New sheet - create and write all data with headers
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SPREADSHEET_ID,
                    requestBody: {
                        requests: [{ addSheet: { properties: { title: objectName } } }]
                    }
                });
                console.log(`Created sheet: ${objectName}`);

                const values = [
                    ['Field Label', 'Field Name', 'API Name', 'Help Text', 'Data Type'],
                    ...sfFields.map(f => [f.FieldLabel, f.FieldName, f.APIName, f.HelpText, f.DataType])
                ];

                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${objectName}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: { values }
                });

                console.log(`Wrote ${sfFields.length} fields to new sheet`);
                continue;
            }

            // Sheet exists - read existing data
            const sheetId = sheet.properties.sheetId;
            const existingDataResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${objectName}!A:Z`
            });

            const existingRows = existingDataResponse.data.values || [];
            
            if (existingRows.length === 0) {
                // Empty sheet - write everything
                const values = [
                    ['Field Label', 'Field Name', 'API Name', 'Help Text', 'Data Type'],
                    ...sfFields.map(f => [f.FieldLabel, f.FieldName, f.APIName, f.HelpText, f.DataType])
                ];

                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${objectName}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: { values }
                });

                console.log(`Wrote ${sfFields.length} fields to empty sheet`);
                continue;
            }

            // Build map of SF fields by API Name
            const sfFieldMap = new Map();
            sfFields.forEach(field => {
                sfFieldMap.set(field.APIName, field);
            });

            // Track existing field API names
            const existingFieldApiNames = new Set();
            const updatedRows = [existingRows[0]]; // Keep header
            const formatRequests = [];
            let currentRow = 2; // Row 2 is first data row (1-indexed)

            // Process existing rows
            for (let i = 1; i < existingRows.length; i++) {
                const row = existingRows[i];
                const apiName = row[2]; // Column C (API Name)
                
                if (!apiName) continue; // Skip empty rows

                existingFieldApiNames.add(apiName);

                if (sfFieldMap.has(apiName)) {
                    // Field still exists - update SF columns (A-E), preserve rest
                    const sfField = sfFieldMap.get(apiName);
                    const updatedRow = [...row];
                    updatedRow[0] = sfField.FieldLabel;
                    updatedRow[1] = sfField.FieldName;
                    updatedRow[2] = sfField.APIName;
                    updatedRow[3] = sfField.HelpText;
                    updatedRow[4] = sfField.DataType;
                    updatedRows.push(updatedRow);
                } else {
                    // Field deleted in Salesforce - mark ROW RED
                    updatedRows.push(row);
                    formatRequests.push({
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: currentRow - 1,
                                endRowIndex: currentRow,
                                startColumnIndex: 0,
                                endColumnIndex: Math.max(row.length, 5)
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 1.0, green: 0.0, blue: 0.0 }
                                }
                            },
                            fields: 'userEnteredFormat.backgroundColor'
                        }
                    });
                }
                currentRow++;
            }

            // Find new fields that don't exist in sheet
            const newFields = sfFields.filter(field => !existingFieldApiNames.has(field.APIName));
            
            // Append new fields and mark them PINK
            newFields.forEach(field => {
                updatedRows.push([
                    field.FieldLabel,
                    field.FieldName,
                    field.APIName,
                    field.HelpText,
                    field.DataType
                ]);
                
                // Mark new row PINK
                formatRequests.push({
                    repeatCell: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: currentRow - 1,
                            endRowIndex: currentRow,
                            startColumnIndex: 0,
                            endColumnIndex: 5
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 1.0, green: 0.75, blue: 0.8 } // Pink
                            }
                        },
                        fields: 'userEnteredFormat.backgroundColor'
                    }
                });
                currentRow++;
            });

            // Write all data back
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${objectName}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: updatedRows }
            });

            // Apply formatting
            if (formatRequests.length > 0) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SPREADSHEET_ID,
                    requestBody: { requests: formatRequests }
                });
            }

            const deletedCount = updatedRows.length - 1 - existingFieldApiNames.size;
            console.log(`Updated ${objectName}: ${newFields.length} new (pink), ${deletedCount} deleted (red)`);
        }

        res.status(200).send('Data dictionary updated successfully!');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
};