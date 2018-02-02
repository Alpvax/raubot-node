"use strict";

const Telegraf = require("telegraf");
const Stage = require("telegraf/stage");
const translate = require("google-translate-api");
const firebaseSession = require("telegraf-session-firebase");
const firebase = require("firebase-admin");
const prose = require("rau-prose-gen");

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

bot.command("prose", (ctx) =>
{
  let text = ctx.message.text;
  let start = ctx.message.entities[0].length;
  let args = [20];
  if(text.length > start)
  {
    args = text.substring(start).trim().split(" ").filter((n) => n).map(parseInt);
  }
  async function messageLoop(string)
  {
    let parts = string.match(/[\s\S]{1,4096}/g) || [];
    //parts.map((p) => {() => console.log(p);ctx.reply(p);}).reduce((p, c) => p.next(c), Promise.resolve());
    for(let part of parts)
    {
      await ctx.reply(part);
    }
  }
  messageLoop(prose(...args));
});

bot.on("text", (ctx, next) =>
{
  translate(ctx.message.text, {
    to: "en"
  }).then((res) =>
  {
    if (res.from.language.iso !== "en")
    {
      ctx.reply(res.text, {
        reply_to_message_id: ctx.message.message_id
      });
    }
  }).catch((err) =>
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
