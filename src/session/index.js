"use strict";

const complexSession = require("./ComplexSession");
const channelSession = require("./ChannelSession");//TODO:

const Telegraf = require("telegraf");

module.exports = (sessionRef, opts) => Telegraf.branch((ctx) => ctx.from, complexSession(sessionRef, opts), channelSession(sessionRef, opts));
module.exports.complex = complexSession;
module.exports.channel = channelSession;
