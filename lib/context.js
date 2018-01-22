"use strict"

class Config {
  constructor(map) {
    this.properties = map;
  }

  get(key) {
    return this.properties[key];
  }

}

class Context {
  constructor() {
    this.config;
    this.payload = {};
  }

  get request_url() {
    return this.payload.request_url;
  }
  
  get deadline() {
    return this.payload.deadline;
  }
  
  get call_id() {
    return this.payload.call_id;
  }
  get app_name() {
    return this.payload.app_name;
  }

  get param_app() {
    return this.payload.param_app;
  }
  
  get param_route() {
    return this.payload.param_route;
  }
  
  get path() {
    return this.payload.path;
  }
                  
  get method() {
    return this.payload.method;
  }

  get format() {
    return this.payload.format;
  }

  get memory() {
    return this.payload.memory;
  }
       
  get type() {
    return this.payload.type;
  }
  
  getConfig(key) {
    return this.config.get(key);
  }

}


class DefaultContext extends Context {

  constructor(properties) {
    super();
    var configProperties = {};
    for (var propertyName in properties) {
      var ctxKey = propertyName;
      if (propertyName.startsWith("FN_")) {
        ctxKey = propertyName.substr(3,propertyName.length -1);
        this.payload[ctxKey.toLowerCase()] = properties[propertyName];
      } else {
        configProperties[ctxKey] = properties[propertyName];
      }
    }
    this.config = new Config(configProperties);
  }

}

class JSONContext extends Context {

  constructor(request) {
    super();
    var configProperties = {};
    // header properties
    var headers = request.protocol.headers;
    for (var propertyName in headers) {
      var ctxKey = propertyName;
      if (propertyName.startsWith("Fn_")) {
        ctxKey = propertyName.substr(3,propertyName.length -1);
        this.payload[ctxKey] = headers[propertyName][0];
      } else {
        configProperties[ctxKey] = headers[propertyName][0];
      }
    }
    this.config = new Config(configProperties);
  }

}

module.exports.DefaultContext = DefaultContext;
module.exports.JSONContext = JSONContext;
