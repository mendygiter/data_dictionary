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
