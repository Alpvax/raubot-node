"use strict";

const AdvancedBot = require("./src/bot");
const session = require("./src/session");
const firebase = require("firebase-admin");

firebase.initializeApp({
  credential: firebase.credential.cert(require("./firebase-rau-firebase-adminsdk-qo49p-1bd84e14ab.json")),
  databaseURL: "https://rau.firebaseio.com"
});

const database = firebase.database();

const botStateRef = database.ref("telegram/bot_state");

const bot = new AdvancedBot(process.env.BOT_TOKEN, {
  version:require("./package.json").version,
  prevVer:botStateRef.child("version").once("value").then((snap) => snap.val())
});
bot.onVersionChange((newVer, prevVer) =>
{
  console.log(`Updated from v${prevVer} to v${newVer}`);
  botStateRef.child("version").set(newVer);
});
bot.lifecycleBus.on("start", () =>
{
  botStateRef.child("running").set(true);
  database.ref("telegram/rauChannel").once("value").then((snap) =>
  {
    //bot.telegram.editMessageText(snap.child("chat_id").val(), snap.child("pinned_message_id").val(), undefined, `RauBot version ${bot.version} running`);
    bot.telegram.sendMessage(snap.child("chat_id").val(), `RauBot version ${bot.version} running`);
  });
});
bot.lifecycleBus.on("stop", () =>
{
  botStateRef.child("running").set(false);
  database.ref("telegram/rauChannel").once("value").then((snap) =>
  {
    //bot.telegram.editMessageText(snap.child("chat_id").val(), snap.child("pinned_message_id").val(), undefined, "RauBot not running");
    bot.telegram.sendMessage(snap.child("chat_id").val(), "RauBot not running");
  });
});

bot.use(session(database.ref("telegram/sessions")));

/*bot.defineSessionProperties((session, ctx) =>
{
  session.defineUserValue("__scenes");
  session.defineUserValue("translateMyself");
  session.defineUnsavedProperty("chatLangs", {
    get()
    {
      return Object.entries(session.allUsers)
        .filter(([uid, user]) => (ctx.chat.type == "private" || session.translateMyself || uid != ctx.from.id) && "userLangs" in user)
        .map(([uid, user]) =>
        {
          return Object.entries(user.userLangs)
            .filter(([k, v]) => v)
            .map(([k, v]) => k);
        })
        .reduce((a, v) =>
        {
          v.forEach((l) =>
          {
            if(l in a)
            {
              a[l]++;
            }
            else
            {
              a[l] = 1;
            }
          });
          return a;
        }, {});
    }
  });
});*/

console.log("Starting bot");
bot.startPolling();
