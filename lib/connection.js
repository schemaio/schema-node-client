/**
 * Connection
 */

var inherits = require('util').inherits;
var events = require('events');
var tls = require('tls');
var net = require('net');

var DEFAULT_NETWORK_ERROR = 'Server unexpectedly closed network connection.';

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
  this.requestBuffer = [];

  this.host = host;
  this.port = port;

  options = options || {};
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  this.options = options;

  if (callback) {
    this.connect(callback);
  }
};

inherits(Connection, events.EventEmitter);

/**
 * Initiate stream connection
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
  }, function() {
    self.connected = true;
    self.flushRequestBuffer();
    callback && callback(self);
    self.emit('connect');
  });
  this.stream.on('error', this.close.bind(this));
  this.stream.on('data', this.receive.bind(this));
  this.stream.on('close', this.close.bind(this));
  this.stream.on('timeout', this.close.bind(this));
  this.stream.setEncoding('utf8');
  this.stream.setTimeout(10000);
};

/**
 * Call remote server method
 *
 * @param  string method
 * ...
 * @param  function response (last argument)
 */
Connection.prototype.request = function() {

  // Copy args to avoid leaking
  var args = new Array(arguments.length);
  for (var i = 0; i < arguments.length; i++) {
    args[i] = arguments[i];
  }

  this.requestBuffer.push(args);

  if (!this.connected) {
    if (!this.stream) {
      this.connect();
    }
    return;
  }

  var request = JSON.stringify(args.slice(0, -1));
  this.stream.write(request + "\n");
};

/**
 * Receive data from the server
 *
 * @param  object buffer
 */
Connection.prototype.receive = function(buffer) {

  // Split buffer data on newline char
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
  var request = this.requestBuffer.shift();
  var responder = request && request.pop();

  if (responder === undefined) {
    return;
  }

  try {
    response = JSON.parse(data);
  } catch (err) {
    response = 'Unable to parse response from server ('+data+')';
    this.emit('error.protocol', response);
    return responder({
      $status: 500,
      $error: response
    });
  }

  if (!response || typeof response !== 'object') {
    response = 'Invalid response from server ('+data+')';
    this.emit('error.protocol', response);
    return responder({
      $status: 500,
      $error: response
    });
  }

  if (response.$error) {
    this.emit('error.server', response.$error);
  }
  if (response.$end) {
    this.close();
  }

  // Note: response always returns in the same order as request
  if (typeof responder === 'function') {
    responder(response);
  }
};

/**
 * Close this connection
 */
Connection.prototype.close = function(error) {

  if (!this.connected) {
    return;
  }

  if (this.stream && this.stream.writable) {
    this.stream.end();
  }

  this.connected = false;
  this.stream = null;
  this.emit('close');

  var hasRequests = this.requestBuffer.length;
  if (error || hasRequests) {
    this.emit('error.network', error || DEFAULT_NETWORK_ERROR);
  }

  var responder;
  while (--hasRequests >= 0) {
    responder = this.requestBuffer.shift().pop();
    responder({
      $status: 500,
      $error: error || DEFAULT_NETWORK_ERROR
    });
  }
};

/**
 * Flush local request buffer when connected
 *
 * @return void
 */
Connection.prototype.flushRequestBuffer = function() {

  if (!this.connected) {
    return;
  }

  var hasRequests = this.requestBuffer.length;
  while (--hasRequests >= 0) {
    this.request.apply(this, this.requestBuffer.shift());
  }
};

// Exports
exports.Connection = Connection;
