"use strict";

const Telegraf = require("telegraf");

class AdvancedBot extends Telegraf
{
  constructor(token, version, options)
  {
    super(token, options);
    this.version = version;
    Object.assign(this.context, {
      botVersion: version,
      longReply: async function(string, msgOptions, head = "", foot = "")
      {
        let hfLen = head.length + foot.length;
        let pattern = new RegExp("[\\s\\S]{1," + (4096 - hfLen) + "}", "g");
        let parts = string.match(pattern) || [];
        for(let part of parts)
        {
          await this.reply(head + part + foot, msgOptions);
        }
      }
    });
  }
  defineSessionProperties(...definers)
  {
    return Telegraf.optional((ctx) => ctx.session.user !== undefined, (ctx, next) =>
    {
      for(let func of definers)
      {
        if(typeof func !== "function")
        {
          func(ctx.session, ctx);
        }
      }
      return next();
    });
  }
}

module.exports = AdvancedBot;
