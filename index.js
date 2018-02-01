"use strict";

const Telegraf = require("telegraf");
const Stage = require("telegraf/stage");
const translate = require("google-translate-api");
const firebaseSession = require("telegraf-session-firebase");
const firebase = require("firebase-admin");

const stages = require("./handlers/stages.js");

var serviceAccount = require("./firebase-rau-firebase-adminsdk-qo49p-1bd84e14ab.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://rau.firebaseio.com"
});

const database = firebase.database();

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(firebaseSession(database.ref("telegram/sessions")));

bot.use(new Stage([stages.main, stages.debug]).middleware());
bot.command("debug", Stage.enter("debug"));
bot.hears(/^exit/i, (ctx) => Stage.leave());

bot.telegram.getMe().then((botInfo) =>//supergroup support
{
  bot.options.username = botInfo.username;
});

bot.start((ctx) =>
{
  console.log("started:", ctx.from.id);
  return ctx.reply(`Welcome, ${ctx.from.first_name}!`);
});

bot.command("help", (ctx) => ctx.reply("Help coming soon..."));
bot.command("echo", (ctx, next) =>
{
  let text = ctx.message.text;
  let start = ctx.message.entities[0].length;
  if(text.length > start)
  {
    ctx.reply(text.substring(start).trim());
    if (text.match(/(-|=)+>$/))
    {
      next();
    }
  }
});

bot.on("text", (ctx, next) =>
{
  translate(ctx.message.text, {
    to: "en"
  }).then(res =>
  {
    if (res.from.language.iso !== "en")
    {
      ctx.reply(res.text, {
        reply_to_message_id: ctx.message.message_id
      });
    }
  }).catch(err =>
  {
    console.error(err);
  });
  next();
});
//bot.hears("hi", (ctx) => ctx.reply("Hey there!"));
//bot.hears(/echo/i, (ctx) => ctx.reply("Did someone say \"echo\"?"));
//bot.on("sticker", (ctx) => ctx.reply("👍"));

console.log("Starting bot");
bot.startPolling();
