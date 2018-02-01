"use strict";

const Telegraf = require("telegraf");
const translate = require("google-translate-api");
const firebaseSession = require("telegraf-session-firebase");
const firebase = require("firebase-admin");

var serviceAccount = require("./firebase-rau-firebase-adminsdk-qo49p-1bd84e14ab.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://rau.firebaseio.com"
});

const database = firebase.database();

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(firebaseSession(database.ref("telegram/sessions")));

bot.start((ctx) =>
{
  console.log("started:", ctx.from.id);
  return ctx.reply(`Welcome, ${ctx.from.first_name}!`);
});

bot.command("help", (ctx) => ctx.reply("Help coming soon..."));
bot.command("echo", (ctx, next) =>
{
  ctx.reply(ctx.message.text.substring(ctx.message.entities[0].length).trim());
  if (ctx.message.text.match(/(-|=)+>$/))
  {
    next();
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
bot.command("debug", Telegraf.acl(221944186, (ctx) =>
{
  if (ctx.message.text.match(/keyboard|kbd/i))
  {
    ctx.reply("Keyboard removed.", {
      reply_markup: {
        remove_keyboard: true
      }
    });
  }
  else
  {
    ctx.reply(ctx.message);
  }
}));
//bot.hears("hi", (ctx) => ctx.reply("Hey there!"));
//bot.hears(/echo/i, (ctx) => ctx.reply("Did someone say \"echo\"?"));
//bot.on("sticker", (ctx) => ctx.reply("👍"));

console.log("Starting bot");
bot.startPolling();
