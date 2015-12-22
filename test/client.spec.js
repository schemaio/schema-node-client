var assert = require('chai').assert;
var sinon = require('sinon');
var Schema = require('../lib/client');

describe('Client', function() {
  var serverConnectStub;

  before(function() {
    serverConnectStub = sinon.stub(Schema.Connection.prototype, 'connect');
  });
  beforeEach(function() {
    serverConnectStub.reset();
  });
  after(function() {
    serverConnectStub.restore();
  });

  describe('#constructor', function() {
    var initStub;
    var connectStub;

    before(function() {
      initStub = sinon.stub(Schema.Client.prototype, 'init');
      connectStub = sinon.stub(Schema.Client.prototype, 'connect');
    });

    beforeEach(function() {
      initStub.reset();
      connectStub.reset();
    });

    after(function() {
      initStub.restore();
      connectStub.restore();
    });

    it('construct without init', function() {
      new Schema.Client();

      assert.strictEqual(initStub.calledOnce, false);
      assert.strictEqual(connectStub.called, false);
    });

    it('init with options - callback', function() {
      new Schema.Client('id', 'key', {});

      assert.strictEqual(initStub.calledOnce, true);
      assert.strictEqual(initStub.args[0][0], 'id');
      assert.strictEqual(initStub.args[0][1], 'key');
      assert.deepEqual(initStub.args[0][2], {});
      assert.strictEqual(connectStub.called, false);
    });

    it('init with options + callback', function() {
      new Schema.Client('id', 'key', {}, function(){});

      assert.strictEqual(initStub.calledOnce, true);
      assert.strictEqual(connectStub.called, true);
    });
  });

  describe('#init', function() {
    var client;
    var testParams;

    beforeEach(function() {
      client = new Schema.Client();

      testParams = {
        clientId: 'id',
        clientKey: 'key',
        host: 'api.schema.io',
        port: 8443,
        clear: false,
        verifyCert: true,
        version: 1,
        session: undefined
      };
    });

    it('initialize params with defaults', function() {
      client.init('id', 'key');

      assert.strictEqual(client.params.clientId, 'id');
      assert.strictEqual(client.params.clientKey, 'key');
      assert.deepEqual(client.params, testParams);
    });

    it('initialize params with options', function() {
      testParams.clientId = 'testId';
      testParams.clientKey = 'testKey';
      client.init({id: 'testId', key: 'testKey'});

      assert.deepEqual(client.params, testParams);
    });

    it('initialize params with credentials + options', function() {
      testParams.clientId = 'id2';
      testParams.clientKey = 'key2';
      testParams.host = 'api2';
      client.init(
        testParams.clientId,
        testParams.clientKey,
        {host: testParams.host}
      );

      assert.strictEqual(client.params.clientId, 'id2');
      assert.strictEqual(client.params.clientKey, 'key2');
      assert.deepEqual(client.params, testParams);
    });

    it('initialize throws without client id', function() {
      try {
        client.init();
      } catch (err) {
        assert(/required/.test(err));
      }
    });

    it('initialize throws without client key', function() {
      try {
        client.init('id');
      } catch (err) {
        assert(/required/.test(err));
      }
    });
  });

  describe('#connect', function() {
    var client;
    var serverSpy;

    before(function() {
      serverSpy = sinon.spy(Schema, 'Connection');
    });

    beforeEach(function() {
      client = new Schema.Client('id', 'key');
      serverSpy.reset();
    });

    after(function() {
      serverSpy.restore();
    });

    it('connect params', function() {
      client.connect();

      assert.strictEqual(serverSpy.called, true);
      assert.strictEqual(serverSpy.args[0][0], client.params.host);
      assert.strictEqual(serverSpy.args[0][1], client.params.port);
    });

    it('connect with callback', function() {
      client.connect(sinon.stub());

      assert.strictEqual(serverSpy.called, true);
      assert.strictEqual(serverConnectStub.called, true);
      assert.strictEqual(typeof serverSpy.args[0][3], 'function');
    });

    it('proxy connection events', function() {
      var onSpy = sinon.spy(Schema.Connection.prototype, 'on');
      client.connect();

      assert.strictEqual(onSpy.args[0][0], 'close');
      assert.strictEqual(onSpy.args[1][0], 'error');
      assert.strictEqual(onSpy.args[2][0], 'error.network');
      assert.strictEqual(onSpy.args[3][0], 'error.protocol');
      assert.strictEqual(onSpy.args[4][0], 'error.server');

      onSpy.restore();
    });
  });

  describe('#request', function() {
    var client;
    var serverSpy;
    var connectSpy;
    var responseStub;
    var serverRequestStub;

    before(function() {
      serverSpy = sinon.spy(Schema, 'Connection');
      connectSpy = sinon.spy(Schema.Client.prototype, 'connect');
      responseStub = sinon.spy(Schema.Client.prototype, 'response');
      serverRequestStub = sinon.stub(Schema.Connection.prototype, 'request');
    });

    beforeEach(function() {
      client = new Schema.Client('id', 'key');
      serverSpy.reset();
      connectSpy.reset();
      responseStub.reset();
      serverRequestStub.reset();
    });

    after(function() {
      serverSpy.restore();
      connectSpy.restore();
      responseStub.restore();
      serverRequestStub.restore();
    });

    it('connect on first request', function() {
      client.request('get', 'url');
      client.request('get', 'url');

      assert(!!client.server);
      assert.strictEqual(connectSpy.calledOnce, true);
      assert.strictEqual(serverRequestStub.calledTwice, true);
    });

    it('build request headers - authed', function() {
      client.authed = true;
      client.request('get', 'url', 'data');

      assert.strictEqual(serverRequestStub.args[0][0], 'get');
      assert.strictEqual(serverRequestStub.args[0][1], 'url');
      assert.deepEqual(serverRequestStub.args[0][2], {
        $data: 'data'
      });
    });

    it('build request headers + authed', function() {
      client.authed = false;
      client.request('get', 'url', 'data');

      assert.strictEqual(serverRequestStub.args[0][0], 'get');
      assert.strictEqual(serverRequestStub.args[0][1], 'url');
      assert.deepEqual(serverRequestStub.args[0][2], {
        $client: 'id',
        $key: 'key',
        $data: 'data'
      });
    });

    it('handle result $auth', function() {
      var authStub = sinon.stub(Schema.Client.prototype, 'auth');
      serverRequestStub.onCall(0).callsArgWith(3, {
        $auth: true
      });
      client.request('get', 'url', 'data');

      assert.strictEqual(authStub.called, true);

      authStub.restore();
    });

    it('handle result $auth + $end retry', function() {
      var authStub = sinon.stub(Schema.Client.prototype, 'auth');
      var requestSpy = sinon.spy(Schema.Client.prototype, 'request');
      serverRequestStub.onCall(0).callsArgWith(3, {
        $auth: true,
        $end: true
      });
      client.request('get', 'url', 'data');

      assert.strictEqual(authStub.called, false);
      assert.strictEqual(requestSpy.calledTwice, true);

      authStub.restore();
      requestSpy.restore();
    });

    it('handle result response', function() {
      serverRequestStub.onCall(0).callsArgWith(3, {
        $status: 200,
        $data: 'success'
      });
      client.request('get', 'url', 'data');

      assert.strictEqual(responseStub.called, true);
      assert.deepEqual(responseStub.args[0][2], {
        $status: 200,
        $data: 'success'
      });
    });
  });

  describe('#response', function() {
    var client;

    beforeEach(function() {
      client = new Schema.Client();
    });

    it('respond with resource result', function() {
      var result = {
        $url: '/resource/foo',
        $data: {
          id: 1,
          name: 'foo'
        }
      };

      client.response('get', 'url', result, function(resource) {
        assert(resource instanceof Schema.Resource);
        assert.strictEqual(resource.toString(), result.$url);
        assert.strictEqual(resource.id, result.$data.id);
        assert.strictEqual(resource.name, result.$data.name);
        assert.strictEqual(this, client);
      });
    });

    it('respond with null result', function() {
      var result = {
        $data: null
      };

      client.response('get', 'url', result, function(result) {
        assert.strictEqual(result, null);
        assert.strictEqual(this, client);
      });
    });
  });

  describe('#get/put/post/delete', function() {
    var client;
    var requestStub;
    var requestArgs;

    before(function() {
      requestStub = sinon.stub(Schema.Client.prototype, 'request');
      requestArgs = ['url', 'data', 'callback'];
      client = new Schema.Client();
    });

    beforeEach(function() {
      requestStub.reset();
    });

    after(function() {
      requestStub.restore();
    });

    it('get request', function() {
      client.get.apply(client, requestArgs);

      assert.strictEqual(requestStub.calledOnce, true);
      assert.deepEqual(requestStub.args[0][0], 'get');
      assert.deepEqual(requestStub.args[0].slice(1), requestArgs);
    });

    it('put request', function() {
      client.put.apply(client, requestArgs);

      assert.strictEqual(requestStub.calledOnce, true);
      assert.deepEqual(requestStub.args[0][0], 'put');
      assert.deepEqual(requestStub.args[0].slice(1), requestArgs);
    });

    it('post request', function() {
      client.post.apply(client, requestArgs);

      assert.strictEqual(requestStub.calledOnce, true);
      assert.deepEqual(requestStub.args[0][0], 'post');
      assert.deepEqual(requestStub.args[0].slice(1), requestArgs);
    });

    it('delete request', function() {
      client.delete.apply(client, requestArgs);

      assert.strictEqual(requestStub.calledOnce, true);
      assert.deepEqual(requestStub.args[0][0], 'delete');
      assert.deepEqual(requestStub.args[0].slice(1), requestArgs);
    });
  });

  describe('#auth', function() {
    var client;
    var connectSpy;
    var serverRequestStub;

    before(function() {
      connectSpy = sinon.spy(Schema.Client.prototype, 'connect');
      serverRequestStub = sinon.stub(Schema.Connection.prototype, 'request');
    });

    beforeEach(function() {
      client = new Schema.Client('id', 'key');
      connectSpy.reset();
      serverRequestStub.reset();
    });

    after(function() {
      connectSpy.restore();
      serverRequestStub.restore();
    });

    it('connect on first request', function() {
      client.auth();
      client.auth();

      assert(!!client.server);
      assert.strictEqual(connectSpy.calledOnce, true);
      assert.strictEqual(serverRequestStub.calledTwice, true);
    });

    it('request nonce if not provided', function() {
      client.auth();

      assert.strictEqual(serverRequestStub.calledOnce, true);
      assert.strictEqual(serverRequestStub.args[0][0], 'auth');
      assert.strictEqual(typeof serverRequestStub.args[0][1], 'function');
    });

    it('request auth with credentials encrypted by nonce', function() {
      client.auth('nonce');

      assert.strictEqual(serverRequestStub.calledOnce, true);
      assert.strictEqual(serverRequestStub.args[0][0], 'auth');
      assert.deepEqual(serverRequestStub.args[0][1], {
        $v: 1,
        client: 'id',
        key: 'db519c8947922ea94bdd541f8612f3fe'
      });
    });
  });

  describe('#close', function() {
    it('close server connection', function() {
      var closeStub = sinon.stub(Schema.Connection.prototype, 'close');
      var client = new Schema.Client('id', 'key');
      client.connect();
      client.close();

      assert.strictEqual(closeStub.calledOnce, true);

      closeStub.restore();
    });
  });

  describe('#create', function() {
    it('return a new client instance', function() {
      var client = Schema.Client.create('id', 'key');

      assert(client instanceof Schema.Client);
      assert.strictEqual(client.params.clientId, 'id');
      assert.strictEqual(client.params.clientKey, 'key');
    });
  });

  describe('#createResource', function() {
    var client;

    before(function() {
      client = new Schema.Client();
    });

    it('return a new collection resource', function() {
      var result = {
        $data: {
          count: 1,
          results: [{}]
        }
      };
      var resource = Schema.Client.createResource('url', result, client);

      assert(resource instanceof Schema.Collection);
    });

    it('return a new record resource', function() {
      var result = {
        $data: {}
      };
      var resource = Schema.Client.createResource('url', result, client);

      assert(resource instanceof Schema.Record);
    });
  });
});