var assert = require('chai').assert;
var sinon = require('sinon');
var Cache = require('./cache').Cache;

describe('Cache', function() {
  describe('#constructor', function() {
    it('builds params from defaults', function() {
      var cache = new Cache('test', {});
      assert.deepEqual(cache.params, {
        clientId: 'test',
        path: '',
        storage: 'memory',
        writePerms: '0644',
        indexLimit: 1000
      });
    });

    it('builds params from options', function() {
      var cache = new Cache('test', {
        path: '/',
        storage: 'memory',
        writePerms: '1234',
        indexLimit: 1
      });
      assert.deepEqual(cache.params, {
        clientId: 'test',
        path: '/',
        storage: 'memory',
        writePerms: '1234',
        indexLimit: 1
      });
    });

    it('throws an error on invalid storage', function() {
      try {
        var cache = new Cache('test', {
          storage: 'fail'
        });
        assert.fail('oops');
      } catch (err) {
        assert.equal(err.message, 'fail storage is not currently supported');
      }
    });
  });

  describe('#get', function() {
    var cache;

    beforeEach(function() {
      cache = new Cache('test');
    });

    it('returns null when cache index not found', function() {
      var result = cache.get('/', {});
      assert.isNull(result);
    });

    it('returns response object when cache index found', function() {
      cache.put('/', {}, {
        $data: 'foo',
        $collection: 'bar',
        $cached: { 'bar': 1 }
      });
      var result = cache.get('/', {});
      assert.deepEqual(result, {
        $data: 'foo',
        $collection: 'bar',
        $cached: true
      });
    });
  });

  describe('#getKey', function() {
    it('returns a predictable key for request args', function() {
      var cache = new Cache('test');
      var key1 = cache.getKey('/test1', true);
      var key2 = cache.getKey('/test1', true);
      var key3 = cache.getKey('/test1', false);
      var key4 = cache.getKey('/other');
      var key5 = cache.getKey(' other/ ', null);
      assert.ok(key1 && key2 && key3 && key4 && key5);
      assert.equal(key1, key2);
      assert.notEqual(key1, key3);
      assert.notEqual(key1, key4);
      assert.equal(key4, key5);
    });
  });

  describe('#getPath', function() {
    it('returns a cache path with arg', function() {
      var cache = new Cache('test');
      var path = cache.getPath('index');
      assert.equal(path, '/client.test.index');
    });

    it('returns a cache path with multiple args', function() {
      var cache = new Cache('test');
      var path = cache.getPath('result', '12345');
      assert.equal(path, '/client.test.result.12345');
    });

    it('returns a cache path with path param prepended', function() {
      var cache = new Cache('test', { path: '/test' });
      var path = cache.getPath('result', '12345');
      assert.equal(path, '/test/client.test.result.12345');
    });
  });

  describe('#getVersions', function() {
    it('sets and returns version cache', function() {
      var cache = new Cache('test');
      assert.isNull(cache.versions);
      var versions = cache.getVersions();
      assert.deepEqual(versions, {});
    });

    it('sets and returns version cached earlier', function() {
      var cache = new Cache('test');
      cache.putVersion('test', 1);
      var versions = cache.getVersions();
      assert.ok(cache.versions === versions);
      assert.deepEqual(versions, {
        test: 1
      });
    });
  });

  describe('#getIndex', function() {
    it('sets and returns index cache', function() {
      var cache = new Cache('test');
      assert.isNull(cache.indexes);
      var indexes = cache.getIndex();
      assert.deepEqual(indexes, {});
    });

    it('sets and returns index cached earlier', function() {
      var cache = new Cache('test');
      cache.putIndex('test', '12345', 100);
      var indexes = cache.getIndex();
      assert.ok(cache.indexes === indexes);
      assert.deepEqual(indexes, {
        test: { '12345': 100 }
      });
    });
  });

  describe('#put', function() {
    var cache, response;

    beforeEach(function() {
      cache = new Cache('test');
      response = {
        $data: 'foo',
        $collection: 'bar',
        $cached: { 'bar': 1 }
      };
    });

    it('sets index, version and result cache', function() {
      cache.put('/', {}, response);
      assert.deepEqual(cache.getIndex(), {
        bar: { '58cd6550e4fe03ea78ee22cf52c759b7': 50 }
      });
      assert.deepEqual(cache.getVersions(), {
        bar: 1
      });
      assert.deepEqual(cache.get('/', {}), {
        $data: 'foo',
        $collection: 'bar',
        $cached: true
      });
    });
  });

  describe('#putIndex', function() {
    it('sets index cache with collection version and size', function() {
      var cache = new Cache('test');
      cache.putIndex('bar', '12345', 100);
      var indexes = cache.getIndex();
      assert.deepEqual(indexes, {
        bar: { '12345': 100 }
      });
      cache.putIndex('bar2', '123456', 1001);
      var indexes2 = cache.getIndex();
      assert.deepEqual(indexes2, {
        bar: { '12345': 100 },
        bar2: { '123456': 1001 }
      });
    });

    it('resets existing item in index cache', function() {
      var cache = new Cache('test');
      cache.putIndex('bar', '12345', 100);
      var indexes = cache.getIndex();
      assert.deepEqual(indexes, {
        bar: { '12345': 100 }
      });
      cache.putIndex('bar', '12345', 1001);
      var indexes2 = cache.getIndex();
      assert.deepEqual(indexes2, {
        bar: { '12345': 1001 },
      });
    });
  });

  describe('#remove', function() {
    it('removes an entry from result cache', function() {
      var cache = new Cache('test');
      cache.put('/', {}, {
        $data: 'foo',
        $collection: 'bar',
        $cached: { 'bar': 1 }
      });
      assert.deepEqual(cache.get('/', {}), {
        $data: 'foo',
        $collection: 'bar',
        $cached: true
      });
      cache.remove('/', {});
      assert.deepEqual(cache.get('/', {}), null);
    });
  });
});
