"use strict";

function deepFreezeFirebase(snapshot)
{
  if(!snapshot.exists())
  {
    return Object.freeze({});
  }
  else if(snapshot.hasChildren())
  {
    let obj = {};
    snapshot.forEach((child) =>
    {
      obj[child.key] = deepFreezeFirebase(child);
    });
    return Object.freeze(obj);
  }
  else
  {
    return Object.freeze(snapshot.val());
  }
}

module.exports = (sessionRef, opts) =>
{
  const options = Object.assign({
    property: "session",
    chatKey: "shared",
    forceDefine: true
  }, opts);

  function loadSession(cid, uid)
  {
    return sessionRef.child(cid).once("value")
      .then((snapshot) =>
      {
        if(!snapshot.exists())
        {
          return {user:{}, chat:{}, allUsers:{}};
        }
        let u = snapshot.child(uid);
        let user = u.exists() ? u.val() : {};
        let c = snapshot.child(options.chatKey);
        let chat = c.exists() ? c.val() : {};
        let a = {};
        snapshot.forEach((snap) =>
        {
          let key = snap.key;
          if(key == uid)
          {
            //Object.defineProperty(a, key, {enumerable:true, get: () => user});
            a[key] = user;
          }
          else if(key != options.chatKey)
          {
            a[key] = deepFreezeFirebase(snap);
          }
        });
        return {
          user,
          chat,
          allUsers: Object.freeze(a)
        };
      });
  }

  function saveSession(cid, uid, chat, user)
  {
    let ref = sessionRef.child(cid);
    return Promise.all([ref.child(options.chatKey).set(chat), ref.child(uid).set(user)]);
  }

  const propertyMap = new Map();
  function setPropertyMap(key, sessionType)
  {
    if(propertyMap.has(key))
    {
      let location = propertyMap.get(key);
      if(location != sessionType)
      {
        throw new TypeError(`Property ${key} is already defined to come from ${location}, not ${sessionType}`);
      }
    }
    propertyMap.set(key, sessionType);
  }

  function dbTraps(sessionType)
  {
    let handler = {
      //deleteProperty(target, key){}//Remove key from propertyMap?
    };
    for(let trapKey of ["set", "defineProperty"])
    {
      handler[trapKey] = function(target, key)
      {
        setPropertyMap(key, sessionType);
        return Reflect[trapKey](...arguments);
      };
    }
    return handler;
  }

  function makeSession(sessionProps)
  {
    let session = {};
    for(let [sessionType, prop] of Object.entries(sessionProps))
    {
      let m = sessionType.match(/(\w)(\w+)/);
      let st = m[1].toUpperCase() + m[2];
      //console.log(`Creating ${st} methods`);
      Object.defineProperties(session, {
        [sessionType]:
        {
          value: new Proxy(prop, dbTraps(sessionType))
        },
        [`define${st}Property`]:
        {
          value(key, descriptor)
          {
            if(sessionType == "unsaved")
            {
              descriptor.configurable = true;//Fix Proxy invariant issue
            }
            /*if(!descriptor.enumerable)
            {
              descriptor.enumerable = true;//Override Default to make enumerable
            }*/
            return Object.defineProperty(session[sessionType], key, descriptor);
          }
        },
        [`define${st}Value`]:
        {
          value(key, initialValue)
          {
            if(!["string", "symbol"].includes(typeof key))
            {
              throw new TypeError(`Key: ${key} must be either a string or a symbol.`);
            }
            if(initialValue === undefined)
            {
              setPropertyMap(key, sessionType);
            }
            else
            {
              session[sessionType][key] = initialValue;
            }
          }
        }
      });
    }
    return session;
  }

  function makeSessionProxy(session)
  {
    return new Proxy(session, new Proxy({
      ownKeys(target)
      {
        return Reflect.ownKeys(target).concat(Reflect.ownKeys(target.user), Reflect.ownKeys(target.chat), Reflect.ownKeys(target.unsaved));
      }
    }, {
      get(handler, trapKey, ...handlerArgs)
      {
        if([
          "getOwnPropertyDescriptor",
          "defineProperty",
          "has",
          "get",
          "set",
          "deleteProperty"
        ].includes(trapKey))//Limit to traps which pass in a key
        {
          return function(target, key, ...args)
          {
            /*target = key in session ?
              target :
              (propertyMap.has(key) ?
                session[propertyMap.get(key)] :
                (options.forceDefine ?
                  //{} ://Return empty object rather than throwing an error
                  session.unsaved));*/
            if(!(key in session))
            {
              if(propertyMap.has(key))
              {
                target = session[propertyMap.get(key)];
              }
              else if(options.forceDefine)
              {
                target = {}; //Return empty object rather than throwing an error
                console.warn("Tried to [%s] undefined property [%s] on %O", trapKey.toUpperCase(), key.toString(), session);
                //throw new TypeError(`Tried to [${trapKey}] undefined property [${key.toString()}] on ${target}`);
              }
              else
              {
                target = session.unsaved;
              }
            }
            return Reflect[trapKey](target, key, ...args);
          };
        }
        return Reflect.get(...arguments);
      }
    }));
  }

  return (ctx, next) =>
  {
    let chatID = ctx.from && ctx.chat && ctx.chat.id;
    if(!chatID)
    {
      return next();
    }
    loadSession(chatID, ctx.from.id).then(({user, chat, allUsers}) =>
    {
      let unsaved = {};
      //console.log("\nLoaded settings:\nUser settings: %O;\nChat settings: %O;\nUnsaved settings: %O;\n", user, chat, unsaved);
      let session = makeSession({user, chat, unsaved});
      for(let key of Object.keys(user))
      {
        session.defineUserValue(key);
      }
      for(let key of Object.keys(chat))
      {
        session.defineChatValue(key);
      }
      Object.defineProperty(session, "allUsers", {value:allUsers});
      let sessionProxy = makeSessionProxy(session);
      //console.log("Session (proxy): %O", sessionProxy);
      //console.log("Properties: %O", propertyMap);
      Object.defineProperty(ctx, options.property, {value:sessionProxy});
      return next().then(() =>
      {
        console.log("\nSaving session:");
        //console.log("\tFull: %O;", sessionProxy);
        console.log("\tUser settings: %O;", user);
        console.log("\tChat settings: %O;", chat);
        console.log("\tUnsaved settings: %O;\n", unsaved);

        return saveSession(chatID, ctx.from.id, chat, user);
      });
    });
  };
};
