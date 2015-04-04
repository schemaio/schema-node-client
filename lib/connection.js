/**
 * Forward/Connection
 */

var crypto = require('crypto');
var inherits = require('util').inherits;
var events = require('events');
var tls = require('tls');
var net = require('net');

/**
 * Connection constructor
 *
 * @param  string host
 * @param  int port,
 * @param  function callback
 */
var Connection = function(host, port, options, callback) {
    
    events.EventEmitter.call(this);

    this.stream = null;
    this.connected = false;
    this.lastRequestId = null;
    this.buffer = [];
    this.responders = {};

    this.host = host;
    this.port = port;

    options = options || {};
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    this.options = options;

    this.connect(callback);
};

inherits(Connection, events.EventEmitter);

/**
 * Initiate stream connection.
 *
 * @param  function callback
 */
Connection.prototype.connect = function(callback) {

    var self = this;
    var proto = this.options.clear ? net : tls;

    this.stream = proto.connect({
        host: this.host,
        port: this.port,
        rejectUnauthorized: this.options.verifyCert === false ? false : true
    }, function(stream) {
        self.connected = true;
        callback && callback(self);
    });
    this.stream.on('error', function(err) {
        self.emit('error.network', err);
    });
    this.stream.on('close', function(err) {
        self.close();
    });
    this.stream.on('data', function(buffer) {
        self.receive(buffer);
    });
    this.stream.setEncoding('utf8');
};

/**
 * Call remote server method
 *
 * @param  string method
 * @param  array args
 * @param  string id
 * @param  function response
 */
Connection.prototype.request = function(method, args, response) {

    if (!this.stream) {
        this.emit('error.network', 'Unable to execute '+method+' (Error: Connection closed)');
        return;
    }
    var reqId = this.requestId(true);
    var request = JSON.stringify([reqId, method, args]);
    this.responders[reqId] = response;
    this.stream.write(request + "\n");
};

/**
 * Receive data from the server
 *
 * @param  object buffer
 */
Connection.prototype.receive = function(buffer) {

    // split buffer data on newline char
    for (var i = 0, j = 0; i < buffer.length; i++) {
        if (buffer[i] === '\n') {
            this.buffer.push(buffer.slice(j, i));

            var data = this.buffer.join('');

            this.buffer = [];
            this.receiveResponse(data);

            j = i + 1;
        }
    }
    if (j < buffer.length) {
        this.buffer.push(buffer.slice(j, buffer.length));
    }
};

/**
 * Handle server response data (JSON string)
 *
 * @param  string data
 */
Connection.prototype.receiveResponse = function(data) {

    var response;

    try {
        response = JSON.parse(data);
    } catch (err) {
        this.emit('error.protocol', 'Unable to parse response from server ('+data+')');
        return;
    }

    if (!(response instanceof Array) || !response[0]) {
        this.emit('error.protocol', 'Invalid response from server ('+data+')');
        return;
    }

    var reqId = response[0];
    var result = response[1];

    if (result.$error) {
        this.emit('error.server', result.$error);
        return;
    }

    if (result.$end) {
        this.close();
    }

    if (typeof this.responders[reqId] === 'function') {
        this.responders[reqId](result);
        delete this.responders[reqId];
    }
};

/**
 * Get or create a unique request identifier
 *
 * @param  string $method
 * @param  string $url
 * @param  array $data
 * @return mixed
 */
Connection.prototype.requestId = function(reset) {

    if (reset) {
        var hashId = crypto.pseudoRandomBytes(32).toString();
        this.lastRequestId = crypto.createHash('md5')
            .update(hashId)
            .digest('hex');
    }
    return this.lastRequestId;
};

/**
 * Close this connection
 */
Connection.prototype.close = function() {

    if (this.stream) {
        this.stream.end();
    }
    this.stream = null;
    this.connected = false;
    this.emit('close');
};

// Exports
exports.Connection = Connection;
