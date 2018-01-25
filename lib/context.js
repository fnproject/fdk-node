"use strict"

class Config {
    constructor(map) {
        this.properties = map;
    }

    get(key) {
        return this.properties[key];
    }

}

class HttpProtocol {
    constructor() {

    }

    get request_url() {
        return this.payload.request_url;
    }

    get method() {
        return this.payload.method;
    }
}

class Context {
    constructor(config, payload, proto) {
        this.config = config;
        this.payload = payload;
        this._proto = proto;
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

    get format() {
        return this.payload.format;
    }

    get memory() {
        return this.payload.memory;
    }

    get type() {
        return this.payload.type;
    }

    get content_type() {
        return this.payload.content_type || "";
    }

    get proto() {
        return this._proto;
    }

    getConfig(key) {
        return this.config.get(key);
    }

}

class DefaultContext extends Context {

    constructor(properties) {

        let configProperties = {};
        let payload = {};
        let headers = {};

        for (let propertyName in properties) {
            if (properties.hasOwnProperty(propertyName)) {

                let ctxKey = propertyName;
                if (propertyName.startsWith("FN_")) {
                    if (propertyName.startsWith("FN_HEADER_")) {
                        let header = propertyName.substr(9).toLowerCase().replace("_", "-");
                        headers[header] = [properties[propertyName]];
                    } else {
                        ctxKey = propertyName.substr(3, propertyName.length - 1).replace("-", "_");
                        payload[ctxKey.toLowerCase()] = properties[propertyName];

                    }
                } else {
                    configProperties[ctxKey] = properties[propertyName];
                }
            }

        }
        super(new Config(configProperties), payload, {});
    }

}

class JSONContext extends Context {

    constructor(request) {
        let configProperties = {};
        // header properties
        let headers = request.protocol.headers;
        let payload = request;

        let header_props = new Set();
        header_props.add("fn_deadline");
        header_props.add("fn_call_id");
        header_props.add("fn_call_id");
        for (let propertyName in headers) {
            if (headers.hasOwnProperty(propertyName)) {
                let ctxKey = propertyName;
                if (propertyName.toLowerCase().startsWith("fn_")) {
                    ctxKey =
                        propertyName.substr(3, propertyName.length - 1).toLowerCase().replace("-",
                                                                                              "_");
                    payload[ctxKey] = headers[propertyName][0];
                } else {
                    configProperties[ctxKey] = headers[propertyName][0];
                }
            }
        }

        super(new Config(configProperties), payload, new HttpProtocol());

    }

}

module.exports.DefaultContext = DefaultContext;
module.exports.JSONContext = JSONContext;
