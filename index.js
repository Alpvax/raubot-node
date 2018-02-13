"use strict";

const AdvancedBot = require("./src/bot");
const session = require("./src/session");
const firebase = require("firebase-admin");

firebase.initializeApp({
  credential: firebase.credential.cert(require("./firebase-rau-firebase-adminsdk-qo49p-1bd84e14ab.json")),
  databaseURL: "https://rau.firebaseio.com"
});

const bot = new AdvancedBot(process.env.BOT_TOKEN, require("./package.json").version);
bot.use(session());

console.log("Starting bot");
bot.startPolling();
