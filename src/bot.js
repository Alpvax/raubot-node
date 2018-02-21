"use strict";

const Telegraf = require("telegraf");
const EventEmitter = require("events");

class AdvancedBot extends Telegraf
{
  constructor(token, opts)
  {
    super(token, opts);
    this.lifecycleBus = new EventEmitter();
    this.version = this.options.version;
    this.updatedFrom = false;
    if("prevVer" in this.options)
    {
      let prevVer = Promise.resolve(this.options.prevVer);
      delete this.options.prevVer;
      prevVer.then((value) =>
      {
        console.log(`version: ${this.version}; prev: ${value}`);
        if(value != this.version)
        {
          this.updatedFrom = value;
          this.lifecycleBus.emit("versionChange");
        }
      });
    }
    Object.assign(this.context, {
      botVersion: this.version,
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
    this.chatHandlers = new Map();
    this.use(Telegraf.lazy((ctx) => Promise.resolve(ctx.chat.type).then((chatType) => this.chatHandlers.get(chatType) || Telegraf.safePassThru())));
  }
  onVersionChange(handler)
  {
    if(this.updatedFrom)
    {
      handler(this.version, this.updatedFrom);
    }
    this.lifecycleBus.on("versionChange", () => handler(this.version, this.updatedFrom));
  }
  addChatHandler(chatTypes, ...handlers)
  {
    let comp;
    let use;
    if(!chatTypes || chatTypes.match(/\*/))
    {
      comp = this;
      use = true;
    }
    else
    {
      chatTypes = Telegraf.normalizeTriggers(chatTypes);
      if(chatTypes.length == 1)
      {
        let ct = chatTypes[0];
        if(!this.chatHandlers.has(ct))
        {
          this.chatHandlers.set(ct, new Telegraf.Composer());
        }
        comp = this.chatHandlers.get(ct);
        use = false;
      }
      else
      {
        comp = new Telegraf.Composer();
        use = (ctx) =>
        {
          for(let trigger of chatTypes)
          {
            if(trigger(ctx.chat.type, ctx))
            {
              return comp.middleware();
            }
          }
        };
      }
    }
    for(let func of handlers)
    {
      if(typeof func == "function")
      {
        func(comp);
      }
    }
    if(use)
    {
      this.use(typeof use === "function" ? use : comp.middleware());
    }
  }
  startPolling()
  {
    this.lifecycleBus.emit("start", {type: "polling"});
    return super.startPolling(...arguments);
  }
  startWebhook()
  {
    this.lifecycleBus.emit("start", {type: "webhook"});
    return super.startWebhook(...arguments);
  }
  stop()
  {
    this.lifecycleBus.emit("stop");
    return super.stop(...arguments);
  }
  /*privateChatHandler(...handlers)
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
  }*/
  /*defineSessionProperties(...definers)
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
  }*/
}

for(let ct of ["Private", "Group", "SuperGroup", "Channel"])
{
  AdvancedBot.prototype[`add${ct}Handler`] = function(...handlers)
  {
    this.addChatHandler(ct.toLowerCase(), ...handlers);
  };
}

module.exports = AdvancedBot;
