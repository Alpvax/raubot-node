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
    this.use(Telegraf.compose([
      Telegraf.optional((ctx) => ctx.chat.type == "private", this.privateComposer.middleware()),
      Telegraf.optional((ctx) => ctx.chat.type == "channel", this.channelComposer.middleware()),
      Telegraf.optional((ctx) => ctx.chat.type == "group", this.groupComposer.middleware()),
      Telegraf.optional((ctx) => ctx.chat.type == "supergroup", this.superGroupComposer.middleware())
    ]));
  }
  privateChatHandler(...handlers)
  {
    if(!this.privateComposer)
    {
      this.privateComposer = new Telegraf.Composer();
    }
    for(let func of handlers)
    {
      if(typeof func == "function")
      {
        func(this.privateComposer);
      }
    }
  }
  channelHandler(...handlers)
  {
    if(!this.channelComposer)
    {
      this.channelComposer = new Telegraf.Composer();
    }
    for(let func of handlers)
    {
      if(typeof func == "function")
      {
        func(this.channelComposer);
      }
    }
  }
  groupHandler(...handlers)
  {
    if(!this.groupComposer)
    {
      this.groupComposer = new Telegraf.Composer();
    }
    for(let func of handlers)
    {
      if(typeof func == "function")
      {
        func(this.groupComposer);
      }
    }
  }
  superGroupHandler(...handlers)
  {
    if(!this.superGroupComposer)
    {
      this.superGroupComposer = new Telegraf.Composer();
    }
    for(let func of handlers)
    {
      if(typeof func == "function")
      {
        func(this.superGroupComposer);
      }
    }
  }
  defineSessionProperties(...definers)
  {
    return Telegraf.optional((ctx) => ctx.session.user !== undefined, (ctx, next) =>
    {
      for(let func of definers)
      {
        if(typeof func == "function")
        {
          func(ctx.session, ctx);
        }
      }
      return next();
    });
  }
}

module.exports = AdvancedBot;
