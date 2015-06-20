/**
 * Connection
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
 * @param  int port
 * @param  object options
 * @param  function callback
 */
var Connection = function(host, port, options, callback) {
    
    events.EventEmitter.call(this);

    this.stream = null;
    this.connected = false;
    this.buffer = [];
    this.responders = [];

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
    this.stream.on('error', this.emit.bind(this, 'error.network'));
    this.stream.on('close', this.close.bind(this));
    this.stream.on('data', this.receive.bind(this));
    this.stream.setEncoding('utf8');
};

/**
 * Call remote server method
 *
 * @param  string method
 * ...
 * @param  function response (last argument)
 */
Connection.prototype.request = function(method) {

    if (!this.stream) {
        this.emit('error.network', 'Unable to execute '+method+' (Error: Connection closed)');
        return;
    }
    var args = new Array(arguments.length - 1);
    for (var i = 0; i < arguments.length - 1; i++) {
        args[i] = arguments[i];
    }
    var request = JSON.stringify(args);
    var response = arguments[arguments.length-1];
    this.responders.push(response);
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

    if (!response || typeof response !== 'object') {
        this.emit('error.protocol', 'Invalid response from server ('+data+')');
        return;
    }

    if (response.$error) {
        this.emit('error.server', response.$error);
        return;
    }
    if (response.$end) {
        this.close();
    }
    // Note: responses always return in same order as sent
    if (typeof this.responders[0] === 'function') {
        var responder = this.responders.shift();
        responder(response);
    }
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
