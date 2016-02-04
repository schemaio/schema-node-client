/**
 * Client
 */

var events = require('events');
var crypto = require('crypto');
var inherits = require('util').inherits;

var Schema = require('./schema');
Schema.Connection = require('./connection').Connection;

var DEFAULT_HOST = 'api.schema.io';
var DEFAULT_PORT = 8443;
var DEFAULT_VERIFY_CERT = true;
var DEFAULT_VERSION = 1;

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

    if (clientId) {
        this.init(clientId, clientKey, options);
    }
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
 */
Client.prototype.init = function(clientId, clientKey, options) {

    options = options || {};

    if (typeof clientKey === 'object') {
        options = clientKey;
        clientKey = undefined;
    } else if (typeof clientId === 'object') {
        options = clientId;
        clientId = undefined;
    }

    this.params = {
        clientId: clientId || options.id,
        clientKey: clientKey || options.key,
        host: options.host || DEFAULT_HOST,
        port: options.port || DEFAULT_PORT,
        clear: options.clear !== undefined ? options.clear : false, // only for local proxy
        verifyCert: options.verifyCert !== undefined ? options.verifyCert : DEFAULT_VERIFY_CERT,
        version: options.version || DEFAULT_VERSION,
        session: options.session
    };

    if (!this.params.clientId) {
        throw 'Schema client `id` is required to initialize';
    }
    if (!this.params.clientKey) {
        throw 'Schema client `key` is required to initialize';
    }
};

/**
 * Connect to server
 *
 * @param  function callback
 */
Client.prototype.connect = function(callback) {

    var self = this;
    this.server = new Schema.Connection(
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
    this.server.on('close', function() {
        self.emit('close');
    });
    this.server.on('error', function(err) {
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
};

/**
 * Client request handler
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
    this.server.request(method, url, data, function(response) {
        if (response.$auth) {
            if (response.$end) {
                // Connection ended, retry auth
                return self.request(method, url, data.$data, callback);
            } else {
                self.authed = true;
                return self.auth(response.$auth, function(response) {
                    return self.respond(method, url, response, callback);
                });
            }
        } else {
            return self.respond(method, url, response, callback);
        }
    });

    // TODO: implement rescue request flow
};

/**
 * Client response handler
 *
 * @param  string method
 * @param  string url
 * @param  mixed response
 * @param  function callback
 */
Client.prototype.respond = function(method, url, response, callback) {

    var err = undefined;
    var data = undefined;

    if (response) {
        if (response.$error) {
            err = response.$error;
        }
        if (response.$data && (typeof response.$data === 'object')) {
            data = Client.createResource(response.$url, response, this);
        } else {
            data = response.$data;
        }
    } else {
        response = {$error: 'Empty response from server', $status: 500};
        err = response.$error;
    }
    return callback && callback.call(this, err, data, response);
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

    if (this.server) {
        this.server.close();
    }
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
 * Create a resource from response data
 *
 * @param  string url
 * @param  mixed response
 * @param  Client client
 * @return Resource
 */
Client.createResource = function(url, response, client) {
    if (response && response.$data && 'count' in response.$data && response.$data.results) {
        return new Schema.Collection(url, response, client);
    }
    return new Schema.Record(url, response, client);
};

// Exports
module.exports = Schema;
module.exports.Client = Client;
module.exports.createClient = Client.create;
