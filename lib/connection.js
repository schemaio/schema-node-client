const inherits = require('util').inherits;
const events = require('events');
const tls = require('tls');
const net = require('net');

const DEFAULT_NETWORK_ERROR = 'Server unexpectedly closed network connection.';
const DEFAULT_TIMEOUT = 60000;
const RETRY_TIME = 3000;

const Connection = function(host, port, options, callback) {
  events.EventEmitter.call(this);

  this.stream = null;
  this.connected = false;
  this.connectingTimeout = null;
  this.connectingRetryTimeout = null;
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

Connection.prototype.connect = function(callback) {
  var proto = this.options.clear ? net : tls;
  var timeoutMs = this.options.timeout || DEFAULT_TIMEOUT;

  if (!this.connectingTimeout) {
    this.connectingTimeout = setTimeout(() => {
      this.stream = null;
      this.connected = false;
      this.connectingTimeout = null;
      this.flushRequestBufferWithError(`Connection timed out (${timeoutMs} ms)`);
    }, timeoutMs);
  }

  this.stream = proto.connect(
    {
      host: this.host,
      port: this.port,
      rejectUnauthorized: this.options.verifyCert === false ? false : true,
    },
    () => {
      this.connected = true;
      clearTimeout(this.connectingTimeout);
      this.connectingTimeout = null;
      this.flushRequestBuffer();
      callback && callback(this);
      this.emit('connect');
    },
  );
  this.stream.on('error', this.error.bind(this));
  this.stream.on('data', this.receive.bind(this));
  this.stream.on('close', this.close.bind(this));
  this.stream.on('timeout', this.timeout.bind(this));
  this.stream.setEncoding('utf8');
  this.stream.setTimeout(timeoutMs);
};

Connection.prototype.request = function() {
  // Copy args to avoid leaking
  var args = new Array(arguments.length);
  for (var i = 0; i < arguments.length; i++) {
    args[i] = arguments[i];
  }

  this.requestBuffer.push(args);

  if (!this.connected || !this.stream) {
    if (!this.stream) {
      this.connect();
    }
    return;
  }

  var request = JSON.stringify(args.slice(0, -1));
  this.stream.write(request + '\n');
};

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

Connection.prototype.receiveResponse = function(data) {
  let response;
  const request = this.requestBuffer.shift();
  const responder = request && request.pop();

  if (responder === undefined) {
    return;
  }

  try {
    response = JSON.parse(data);
  } catch (err) {
    response = 'Unable to parse response from server (' + data + ')';
    this.emit('error.protocol', response);
    return responder({
      $status: 500,
      $error: response,
    });
  }

  if (!response || typeof response !== 'object') {
    response = 'Invalid response from server (' + data + ')';
    this.emit('error.protocol', response);
    return responder({
      $status: 500,
      $error: response,
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

Connection.prototype.error = function(error) {
  const shouldReconnect =
    !this.connected && this.stream && this.requestBuffer.length > 0 && !this.connectingRetryTimeout;
  if (shouldReconnect) {
    this.connectingRetryTimeout = setTimeout(() => {
      this.connectingRetryTimeout = null;
      this.connect();
    }, RETRY_TIME);
  }
  this.emit('error', error);
};

Connection.prototype.close = function() {
  if (!this.connected) {
    this.stream = null;
    return;
  }

  if (this.stream && this.stream.writable) {
    this.stream.end();
  }

  this.connected = false;
  this.stream = null;
  this.emit('close');

  if (this.requestBuffer.length > 0) {
    this.connect();
  }
};

// Handle timeout by closing if no requests are pending
Connection.prototype.timeout = function(error) {
  if (this.requestBuffer.length) {
    return;
  }
  this.close();
};

// FLush all requests when connected
Connection.prototype.flushRequestBuffer = function() {
  if (!this.connected) {
    return;
  }
  let hasRequests = this.requestBuffer.length;
  while (--hasRequests >= 0) {
    this.request.apply(this, this.requestBuffer.shift());
  }
};

// Flush all requests when a connection error occurs
Connection.prototype.flushRequestBufferWithError = function(error) {
  let hasRequests = this.requestBuffer.length;
  while (--hasRequests >= 0) {
    const request = this.requestBuffer.shift();
    const responder = request && request.pop();
    if (typeof responder === 'function') {
      responder({
        $status: 500,
        $error: error,
      });
    }
  }
};

exports.Connection = Connection;
