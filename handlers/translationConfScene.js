"use strict";

const Scene = require("telegraf/scenes/base");


const translationScene = new Scene("translationconfig");

translationScene.hears(/^except(?:ions?)?(.*)$/i, (ctx) =>
{
  let exclude = ctx.session.exclude || [];
  let argStr = ctx.match[1];
  console.log(argStr);
  let list = /*!argStr ||*/ argStr.match(/(?:(?:-l)|(?:--)?list)(.*)/ig);
  console.log(list);
  if(list)
  {
    ctx.longReply(exclude.join("\n"));
  }
});

module.exports = translationScene;
