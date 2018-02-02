"use strict";

const Scene = require("telegraf/scenes/base");
const Stage = require("telegraf/stage");

// Main scene
const mainScene = new Scene("main");

// Debug scene
const debugScene = new Scene("debug");
debugScene.enter((ctx) => ctx.reply("Entering debugging mode."));
debugScene.leave((ctx) => ctx.reply("Exiting debug mode."));
debugScene.hears(/^uid/i, (ctx) => ctx.reply(ctx.from.id));
debugScene.hears(/^cid/i, (ctx) => ctx.reply(ctx.message.chat.id));
debugScene.hears(/^m(essage|msg)/i, (ctx) => ctx.reply(ctx.message));
debugScene.hears(/^keyboard|kbd/i, (ctx) =>
{
  ctx.reply("Keyboard removed.", {
    reply_markup: {
      remove_keyboard: true
    }
  });
});
debugScene.hears(/^(?:context|ctx)((?:\.\w+)+)?/i, (ctx) =>
{
  let obj = ctx;
  let res = "ctx";
  if(ctx.match[1])
  {
    for(let key of ctx.match[1].split(/\./).filter((x) => x))
    {
      if(obj[key] !== undefined)
      {
        obj = obj[key];
        res += "." + key;
      }
      else
      {
        res += " does not have property: \"" + key + "\"\n" + res;
      }
    }
  }
  res += ":\n" + JSON.stringify(obj, (k,v) =>
  {
    return (k && v && typeof v === "object") ? v.toString(): v;
  }, 2);
  ctx.reply(res);
});
debugScene.hears(/^session/i, (ctx) => ctx.reply(ctx.session));
//debugScene.hears(/^conf(ig)?/i, (ctx) => ctx.reply(ctx.session));
debugScene.hears(/^exit/i, (ctx) => Stage.leave());

// Echo scene
/*const echoScene = new Scene("echo");
echoScene.enter((ctx) => ctx.reply("echo scene"));
echoScene.leave((ctx) => ctx.reply("exiting echo scene"));
echoScene.command("back", Stage.leave());
echoScene.on("text", (ctx) => ctx.reply(ctx.message.text));
echoScene.on("message", (ctx) => ctx.reply("Only text messages please"));*/

module.exports = {main: mainScene, debug: debugScene};
