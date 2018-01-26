"use strict"

class Config {
    constructor(map) {
        this.properties = map;
    }

    get(key) {
        return this.properties[key];
    }

}

function canonHeader(h) {
    return h.replace("_", "-").split("-").map((h) => {
        if (h) {
            let last = h.substr(1);
            let first = h.substr(0, 1);
            return first.toUpperCase() + last.toLowerCase();
        }
    }).join("-");
}

class HttpProtocol {
    constructor(payload, out) {
        this.payload = payload;
        this.out = out;
    }

    get type() {
        return 'http';
    }

    get request_url() {
        return this.payload.request_url;
    }

    get method() {
        return this.payload.method;
    }

    get headers() {
        let h = Object.assign({}, this.payload.headers);
        return h;
    }

    header(key) {
        let val = this.payload.headers[canonHeader(key)];
        if (val) {
            return val[0];
        }
        return null;
    }

    setStatusCode(status) {
        this.out.status_code = status;
    }

    setOutputHeader(k, v) {
        this.out.headers[canonHeader(k)] = [v];
    }

    addOutputHeader(k, v) {
        let c_header = canonHeader(k);
        if (this.out.headers[c_header]) {
            this.out.headers[c_header] = [v];
        } else {
            this.out.headers[c_header].push(v);
        }
    }
}

class Context {
    constructor(config, payload, proto, ctxout) {
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

    get body() {
        return this.payload.body;
    }

    get content_type() {
        return this.payload.content_type || "";
    }

    get protocol() {
        return this._proto;
    }

    getConfig(key) {
        return this.config.get(key);
    }

    setContentType(contentType) {
        out.content_type = contentType;
    }
}

class DefaultContext extends Context {

    constructor(body, properties, out) {

        let configProperties = {};
        let payload = {
            body: body
        };
        let protoProperties = {headers: {}};

        for (let propertyName in properties) {
            if (properties.hasOwnProperty(propertyName)) {

                let ctxKey = propertyName;
                let val = properties[propertyName];
                if (propertyName.startsWith("FN_HEADER_")) {
                    let header = canonHeader(propertyName.substr(9));
                    protoProperties.headers[header] = [val];
                    if (header === 'Content-Type') {
                        payload.content_type = val;
                    }
                } else if (propertyName === "FN_METHOD") {
                    protoProperties.method = val;
                } else if (propertyName === "FN_REQUEST_URL") {
                    protoProperties.request_url = val;
                } else if (propertyName.startsWith("FN_")) {
                    ctxKey = propertyName.substr(3, propertyName.length - 1).toLowerCase();
                    payload[ctxKey] = properties[propertyName];
                } else {
                    configProperties[ctxKey] = properties[propertyName];
                }
            }
        }

        super(
            new Config(configProperties),
            payload,
            new HttpProtocol(protoProperties, {}),
            out);

    }

}

class JSONContext extends Context {

    constructor(request, proto_out, out) {
        let configProperties = {};
        // header properties
        let headers = request.protocol.headers;
        let payload = request;
        let protoProperties = {
            headers: {}
        };

        for (let propertyName in headers) {
            if (headers.hasOwnProperty(propertyName)) {
                let ch = canonHeader(propertyName);
                let val = headers[propertyName];
                if (ch === 'Fn-Deadline') {
                    payload.deadline = val;
                } else if (ch === 'Fn-Method') {
                    protoProperties.method = val;
                } else if (ch.startsWith("Fn-")) {
                } else {
                    protoProperties.headers[ch] = val;
                }
            }
        }

        super(new Config(configProperties), payload, new HttpProtocol(protoProperties, proto_out),
              out);

    }

}

module.exports.DefaultContext = DefaultContext;
module.exports.JSONContext = JSONContext;
