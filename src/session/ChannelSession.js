"use strict";

const firebaseSession = require("telegraf-session-firebase");

module.exports = (sessionRef, opts) => firebaseSession(sessionRef, Object.assign({getSessionKey: (ctx) => ctx.chat && `${ctx.chat.id}`}, opts));
