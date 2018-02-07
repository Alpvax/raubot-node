"use strict";

const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const {ArgumentParser} = require("argparse");
const {languages} = (function()
{
  let l = require("google-translate-api").languages;
  return {
    languages: Object.entries(l).filter(([k, v]) => typeof v == "string" && k != "auto"),
    getLangCode: l.getCode
  };
})();

const parser = new ArgumentParser({
  addHelp:true,
  description: "Translation Configuration"
});
const subparsers = parser.addSubparsers({title: "commands"});
const exclude = subparsers.addParser(
  "exclude",
  {
    aliases:["exclusions","except","exceptions"],
    addHelp:true
  }
);
exclude.addArgument(["-l", "--list"], {
  action: "store",
  type: getPattern,
  nargs: "?",
  help: "List existing exclusions",
  dest: "filter"
});

/*function langSelectionURL(page,userLangs, numPerPage = 10)
{
  userLangs = userLangs || [];
  let maxPages = Math.ceil(languages.length / numPerPage) - 1;
  page = Math.max(Math.min(page, maxPages), 0); //Force between 0 and maxPages
  let start = page * numPerPage;
  let end = Math.min(start + numPerPage, languages.length);
  let langs = languages.slice(start, end);
  console.log("Page: %d/%d; Length: %d; Splice: %d - %d; Langs: %s", page, maxPages, languages.length, start, end, langs);
  let text = "Page " + (page + 1) + "/" + (maxPages + 1) + "\n" + langs.map((l) => (userLangs.includes(l) ? "\u2714 " : "\u274C") + l).join("\n");
  return [text, Markup.inlineKeyboard([
    Markup.callbackButton("Previous", page - 1, page == 0),
    Markup.callbackButton("Next", page + 1, page == maxPages)
  ]).extra()];
}*/

function chunkArray(arr, size)
{
  let res = [];
  for(let i = 0; i < arr.length; i += size)
  {
    res.push(arr.slice(i, i+size));
  }
  return res;
}

const langMap = new Map(languages);

function langSelection(page,userLangs, numPerPage = 20)
{
  userLangs = userLangs && Object.keys(userLangs) || [];
  let maxPages = Math.ceil(languages.length / numPerPage) - 1;
  page = Math.max(Math.min(page, maxPages), 0); //Force between 0 and maxPages
  let start = page * numPerPage;
  let end = Math.min(start + numPerPage, languages.length);
  let langs = languages.slice(start, end).map(([k, l]) => [k, (userLangs.includes(k) ? "\u2714 " : "\u274C") + l, userLangs.includes(k)]);
  let text = "Currently enabled translations:\n" + (userLangs.length < 1 ? "None" : userLangs.map((k) => langMap.get(k)).join("\n")) + "\n\nPage " + (page + 1) + "/" + (maxPages + 1);
  let btns = chunkArray(langs.map(([k, l, u]) => Markup.callbackButton(l, "lang:" + k + ":" + u + ";page:" + page)), 2);
  btns.push([
    Markup.callbackButton("Previous", "page:" + (page - 1), page == 0),
    Markup.callbackButton("Next", "page:" + (page + 1), page == maxPages)
  ]);
  return [text, Markup.inlineKeyboard(btns).extra()];
}

const translationScene = new Scene("translationconfig");

translationScene.hears(/^lang(uage)?s?/i, (ctx) =>
{
  let l = langSelection(0, ctx.session.userLangs);
  ctx.reply(...l);
});

function setLang(ctx, lang, enabled)
{
  if(enabled)
  {
    delete ctx.session.userLangs[lang];
  }
  else
  {
    ctx.session.userLangs[lang] = true;
  }
  console.log("Set lang:\nuSession: %O\ncSession: %O", ctx.session.userLangs, ctx.session.chatLangs);
}

translationScene.on("callback_query", (ctx) =>
{
  let data = ctx.callbackQuery.data;
  let match = /(?:lang:(\w+):(true|false);)?page:(\d+)/.exec(data);
  if(match)
  {
    let page = parseInt(match[3]);
    let lang = match[1];
    if(lang)
    {
      setLang(ctx, lang, match[2] == "true");
    }
    return ctx.editMessageText(...langSelection(page, ctx.session.userLangs));
  }
  console.log(ctx.callbackQuery.data);

});

translationScene.hears(/^translatem(?:e|yself)([:=\s]?(?:((?:t(?:rue)?)|on)|((?:f(?:alse)?)|off)))?/i, (ctx) =>
{
  if(ctx.match[1])
  {
    if(ctx.match[2])
    {
      ctx.session.translateMyself = true;
    }
    else
    {
      delete ctx.session.translateMyself;
    }
  }
  ctx.reply("Self translation: " + (ctx.session.translateMyself ? "ON" : "OFF"));
});

/*translationScene.on("text", (ctx) =>
{
  let args = parser.parseKnownArgs(ctx.message.text.split(/\s+/));
  console.log(args);
});*/

/*translationScene.hears(/^except(?:ions?)?(.*)$/i, (ctx) =>
{
  let exclude = ctx.session.exclude || [/p(ah)+a?/i, /a(ha)+/i];
  let argStr = ctx.match[1];
  let list = /(?:(?:-l)|(?:--)?list)\s*(.*)/ig.exec(argStr);
  if(!argStr || list)
  {
    let pattern = list && getPattern(list[1]);
    console.log(pattern);
    ctx.longReply(exclude.filter((e) =>
    {
      if(!pattern)
      {
        return true;
      }
      console.log(e.source);
      let p = pattern.exec(e.source);
      console.log(p);
      return p;
    }).join("\n"));
  }
});*/

function getPattern(input)
{
  return input ? (/^\/.*\/(g?i?m?u?y?)$/.test(input) ? eval(input) : new RegExp(input, "i")) : null;
}

module.exports = translationScene;
