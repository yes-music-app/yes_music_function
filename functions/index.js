'use strict'

// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// Dependencies for managing state cookies.
const cookies = require('cookie-parser');
const crypto = require('crypto');

// Modules required to make https requests.
const https = require('https');
const request = require('request');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://yesmusicapp.firebaseio.com"
});

// A Spotify wrapper to help construct Spotify requests.
const SpotifyWebAPI = require('spotify-web-api-node');
const Spotify = new SpotifyWebAPI({
    clientId: functions.config().spotify.client_id,
    clientSecret: functions.config().spotify.client_secret,
    redirectUri: functions.config().spotify.redirect_uri
});

// The authorization scopes that we will need for our operations.
const SCOPES = [
    'app-remote-control',
    'user-read-private'
]

/**
 * Requests authorization from the Spotify authorization endpoint.
 */
exports.requestAuth = functions.https.onRequest((req, res) => {
    cookies()(req, res, () => {
        // Generate a state cookie for state verification.
        const state = req.cookies.state || crypto.randomBytes(20).toString('hex');
        res.cookie('state', state.toString(), { maxAge: 3600000, secure: true, httpOnly: true });

        // Redirect the authorization request to the Spotify authorization endpoint.
        const authorizeURL = Spotify.createAuthorizeURL(SCOPES, state.toString());
        res.location(authorizeURL);

        // Send the response back to the client.
        res.status(200).json({ 'data': authorizeURL });
    });
});

/**
 * Requests an access token from the Spotify token endpoint.
 */
exports.requestAccessToken = functions.https.onRequest((req, res) => {
    // Get the auth code that was passed to this function.
    const code = req.body.data.code;

    // Make the request to the Spotify endpoint.
    Spotify.authorizationCodeGrant(code).then(
        (data) => {
            // Return the retrieved codes.
            return res.status(200).json({ 'data': data.body });
        },
        (err) => {
            if (err) {
                res.status(400).end();
            }
        }).catch((err) => {
            if (err) {
                res.status(400).end();
            }
        });
});