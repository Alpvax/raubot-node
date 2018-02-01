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
debugScene.hears(/^(context|ctx)/i, (ctx) =>
{
  let res = {};
  for(let key of Object.keys(ctx))
  {
    if(typeof ctx[key] !== "function")
    {
      res[key] = ctx[key];
    }
  }
  //ctx.reply(res);
  console.log(res);
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
