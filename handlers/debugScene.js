"use strict";

const Scene = require("telegraf/scenes/base");

const git = require("simple-git/promise")();
const {version} = require("../package.json");

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
debugScene.hears(/^version/i, (ctx) => ctx.reply(version));
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
  console.log(obj);
});
debugScene.hears(/^session/i, (ctx) => ctx.reply(ctx.session));
//debugScene.hears(/^exit/i, Stage.leave());

debugScene.hears(/^(?:(?:update([- ]?check)?)|(?:(check[- ]?)?update))/i, (ctx) =>
{
  let checkOnly = Boolean(ctx.match[1] || ctx.match[2]);
  let chatMessage = ctx.reply("Checking for updates...");
  /*
  function fetch(){ return new Promise((s,f) => true ? s("Fetch success") : f(Error({error: true})))};
  function status(){ return new Promise((s,f) => true ? s("Status success") : f(Error({error: true})))};
  function pull(){ return new Promise((s,f) => true ? s("Pull success") : f(Error({error: true})))};
  function err(msg){
    return (error) => {
      let res = error instanceof Error ? {msg: msg, err:error} : error;
      console.log(res);
      return Promise.reject(res)
    }
  }
  fetch()
  .then(status, err("fetch"))
  .then(pull, err("status"))
  .then((res) => console.log("Success", res), err("pull"))
  .catch(console.log)
   */
  function gitError(message)
  {
    return (err) =>
    {
      return Promise.reject(err instanceof Error ? {message: message, errorObj:err} : err);
    };
  }
  git.fetch()
    .then((res) => git.status(), gitError("Error fetching updates: "))
    .then((res) =>
    {
      if(res.behind < 1)
      {
        return Promise.reject({message: "\u2714 Already up to date"});
      }
      else if(checkOnly)
      {
        return Promise.reject({message: "🆕 New version available"});
      }
      else
      {
        return Promise.resolve();
      }
    }, gitError("Error checking for updates"))
    .then((res) => git.pull())
    .then((res) => Promise.reject({message: "\u2714 Updated."}), gitError("Error downloading update."))
    .catch(({message, errorObject}) =>
    {
      console.log(message, errorObject);
      if(errorObject)
      {
        message = "\u2757 " + message;
      }
      return chatMessage.then((msg) => ctx.tg.editMessageText(msg.chat.id, msg.message_id, undefined, msg.text + "\n\n" + message));
    });
});
/*{
    if(err)
    {
      ctx.reply("Error fetching updates: " + err);
    }
    else
    {
      if(!res.raw)
      {
        ctx.reply("Already up to date");
      }
      else
      {
        console.log(res);
        ctx.reply("Update available: ");
        if(!checkOnly)
        {
          git.pull((err, res) =>
          {
            if(err)
            {
              ctx.reply("Error updating: " + err);
            }
            else
            {
              console.log(res);
              ctx.reply("Bot updated.");
            }
          });
        }
      }
    }
  });*/


//debugScene.hears(/^conf(ig)?/i, (ctx) => ctx.reply(ctx.session));

// Echo scene
/*const echoScene = new Scene("echo");
echoScene.enter((ctx) => ctx.reply("echo scene"));
echoScene.leave((ctx) => ctx.reply("exiting echo scene"));
echoScene.command("back", Stage.leave());
echoScene.on("text", (ctx) => ctx.reply(ctx.message.text));
echoScene.on("message", (ctx) => ctx.reply("Only text messages please"));*/

module.exports = debugScene;
