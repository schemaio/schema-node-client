/**
 * Client
 */

var events = require('events');
var crypto = require('crypto');
var inherits = require('util').inherits;

var Connection = require('./connection').Connection;
var Schema = require('./schema');
var Collection = Schema.Collection;
var Record = Schema.Record;

var defaults = {
    host: 'api.schema.io',
    port: 8443,
    verifyCert: true,
    version: 1
};

/**
 * Client constructor
 *
 * @param  string clientId
 * @param  string clientKey
 * @param  object options
 * @param  function callback
 */
var Client = function(clientId, clientKey, options, callback) {

    events.EventEmitter.call(this);

    this.server = null;

    this.init(clientId, clientKey, options, callback);

    if (callback) {
        this.connect(callback);
    }
};

inherits(Client, events.EventEmitter);

/**
 * Initialize client parameters
 *
 * @param  string clientId
 * @param  string clientKey
 * @param  object options
 * @param  function callback
 */
Client.prototype.init = function(clientId, clientKey, options) {

    options = options || {};

    if (typeof options === 'function') {
        callback = options;
        options = {};
    } else if (typeof clientKey === 'function') {
        callback = clientKey;
        options = {};
    }
    if (typeof clientKey === 'object') {
        options = clientKey;
        clientKey = undefined;
    } else if (typeof clientId === 'object') {
        options = clientId;
        clientId = undefined;
    }

    this.params = {
        host: options.host || defaults.host,
        port: options.port || defaults.port,
        clientId: clientId || options.id,
        clientKey: clientKey || options.key,
        clear: options.clear !== undefined ? options.clear : defaults.clear,
        verifyCert: options.verifyCert !== undefined ? options.verifyCert : defaults.verifyCert,
        version: options.version || defaults.version,
        session: options.session,
        api: options.api
    };
};

/**
 * Connect to server
 *
 * @param  function callback
 */
Client.prototype.connect = function(callback) {

    var self = this;
    this.server = new Connection(
        this.params.host,
        this.params.port,
        {
            clear: this.params.clear,
            verifyCert: this.params.verifyCert
        },
        function() {
            callback && callback(self);
            self.emit('connect', self);
        }
    );
    this.server.on('error', function(err, type) {
        self.emit('error', 'Error: '+err);
    });
    this.server.on('error.network', function(err) {
        self.emit('error', 'Network Error: '+err, 'network');
    });
    this.server.on('error.protocol', function(err) {
        self.emit('error', 'Protocol Error: '+err, 'protocol');
    });
    this.server.on('error.server', function(err) {
        self.emit('error', 'Server Error: '+err, 'server');
    });

    // Fallback handler
    this.on('error', function(err) {
        var lcount = events.EventEmitter.listenerCount(self, 'error');
        if (lcount === 1) {
            throw 'Schema Client: '+err;
        }
    });
};

/**
 * Client request helper
 *
 * @param  string method
 * @param  string url
 * @param  mixed data
 * @param  function callback
 */
Client.prototype.request = function(method, url, data, callback) {

    if (typeof data === 'function') {
        callback = data;
        data = null;
    }

    // TODO: implement $cached

    if (!this.server) {
        this.connect();
    }

    // Prepare url and data for request
    url = url && url.toString ? url.toString() : '';
    data = {$data: data};
    if (!this.authed) {
        data.$client = this.params.clientId;
        // Perform basic auth by default for secure requests
        if (!this.server.options.clear) {
            data.$key = this.params.clientKey;
        }
    }

    var self = this;
    this.server.request(method, url, data, function(result) {
        if (result.$auth) {
            if (result.$end) {
                // Connection ended, retry
                return self.request(method, url, data.$data, callback);
            } else {
                self.authed = true;
                return self.auth(result.$auth, function(result) {
                    return self.response(method, url, result, callback);
                });
            }
        } else {
            return self.response(method, url, result, callback);
        }
    });

    // TODO: implement rescue request flow
};

/**
 * Client response handler
 *
 * @param  string method
 * @param  string url
 * @param  mixed result
 * @param  function callback
 */
Client.prototype.response = function(method, url, result, callback) {

    var actualResult = null;

    if (result
    && result.$data
    && (typeof result.$data === 'object')) {
        // TODO: use a header to determine url of a new record
        if (method.toLowerCase() === 'post') {
            url = url.replace(/\/$/, '') + '/' + result.$data.id;
        }
        actualResult = Client.createResource(url, result, this);
    } else {
        actualResult = result.$data;
    }
    return callback && callback.call(this, actualResult, result);
};

/**
 * Client GET request
 *
 * @param  string url
 * @param  object data
 * @param  function callback
 * @return mixed
 */
Client.prototype.get = function(url, data, callback) {
    return this.request('get', url, data, callback);
};

/**
 * Client PUT request
 */
Client.prototype.put = function(url, data, callback) {
    return this.request('put', url, data, callback);
};

/**
 * Client POST request
 */
Client.prototype.post = function(url, data, callback) {
    return this.request('post', url, data, callback);
};

/**
 * Client DELETE request
 */
Client.prototype.delete = function(url, data, callback) {
    return this.request('delete', url, data, callback);
};

/**
 * Client auth request
 *
 * @param  object params
 * @param  function callback
 * @return mixed;
 */
Client.prototype.auth = function(nonce, callback) {

    var self = this;
    var clientId = this.params.clientId;
    var clientKey = this.params.clientKey;

    if (typeof nonce === 'function') {
        callback = nonce;
        nonce = null;
    }

    if (!this.server) {
        this.connect();
    }

    // 1) Get nonce
    if (!nonce) {
        return this.server.request('auth', function(nonce) {
            self.auth(nonce, callback);
        });
    }

    // 2) Create key hash
    var keyHash = crypto.createHash('md5')
        .update(clientId + "::" + clientKey)
        .digest('hex');

    // 3) Create auth key
    var authKey = crypto.createHash('md5')
        .update(nonce + clientId + keyHash)
        .digest('hex');

    // 4) Authenticate with client creds and options
    var creds = {
        client: clientId,
        key: authKey
    };
    if (this.params.api) {
        creds.$api = this.params.api;
    }
    if (this.params.version) {
        creds.$v = this.params.version;
    }
    if (this.params.session) {
        creds.$session = this.params.session;
    }

    // TODO: send local $ip address

    return this.server.request('auth', creds, callback);
};

/**
 * Close server connection
 *
 * @return void
 */
Client.prototype.close = function() {

    this.server.close();
};

/**
 * Client create/init helper
 *
 * @param  string clientId
 * @param  string clientKey
 * @param  object options
 * @param  function callback
 * @return Client
 */
Client.create = function(clientId, clientKey, options, callback) {
    return new Client(clientId, clientKey, options, callback);
};

/**
 * Create a resource from result data
 *
 * @param  string url
 * @param  mixed result
 * @param  Client client
 * @return Resource
 */
Client.createResource = function(url, result, client) {
    if (result && result.$data && 'count' in result.$data && result.$data.results) {
        return new Collection(url, result, client);
    }
    return new Record(url, result, client);
};

// Exports
module.exports = Schema;
module.exports.Client = Client;
module.exports.Connection = Connection;
module.exports.defaults = defaults;
module.exports.createClient = Client.create;
