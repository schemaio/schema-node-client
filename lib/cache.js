var inherits = require('util').inherits;
var events = require('events');
var crypto = require('crypto');
var fs = require('fs');

var DEFAULT_STORAGE = 'memory';
var DEFAULT_WRITE_PERMS = '0644';
var DEFAULT_INDEX_LIMIT = 1000;

/**
 * Cache constructor
 *
 * @param  string clientId
 * @param  array options
 */
var Cache = function(clientId, options) {
  events.EventEmitter.call(this);

  this.versions = null;
  this.indexes = null;
  this.memory = {};

  options = options || {};
  if (typeof options === 'string') {
    options = { path: options };
  }
  this.params = {
    clientId: clientId,
    path: options.path ? String(options.path) : '',
    storage: options.storage || DEFAULT_STORAGE,
    writePerms: options.writePerms || DEFAULT_WRITE_PERMS,
    indexLimit: options.indexLimit || DEFAULT_INDEX_LIMIT
  };

  if (this.params.storage !== 'memory') {
    throw new Error(this.params.storage + ' storage is not currently supported');
  }
};

inherits(Cache, events.EventEmitter);

/**
 * Get result from cache by url/data
 *
 * @param  string url
 * @param  mixed data
 */
Cache.prototype.get = function(url, data) {
  data = data || null;

  var cacheKey = this.getKey(url, data);
  var result = this.getCache(cacheKey, 'result');

  if (result) {
    // Ensure cache_key exists in index
    this.getIndex();
    if (result.$collection !== undefined) {
      var collection = result.$collection;
      if (this.indexes[collection] && this.indexes[collection][cacheKey]) {
        return result;
      }
    }

    // Not found in proper index, then clear?
    var resultCollections = this.resultCollections(result);
    for (var i = 0; i < resultCollections.length; i++) {
      var collection = resultCollections[i];
      var where = {};
      where[collection] = cacheKey;
      this.clearIndexes(where);
    }
  }

  return null;
};

/**
 * Get a cache key
 *
 * @param  string url
 * @param  mixed data
 * @return string
 */
Cache.prototype.getKey = function(url, data) {
  data = data || null;
  var saneUrl = String(url).trim().replace(/^\/|\/$/g, '');
  var keyData = JSON.stringify([ saneUrl, data ]);
  return crypto.createHash('md5').update(keyData).digest('hex');
};

/**
 * Get path to a cache file
 *
 * @return string
 */
Cache.prototype.getPath = function(url, data) {
  return this.params.path.replace(/\/$/, '') +
    '/client.' +
    this.params.clientId +
    '.' +
    Array.prototype.slice.call(arguments).join('.');
};

/**
 * Get cache version info
 *
 * @return array
 */
Cache.prototype.getVersions = function() {
  if (!this.versions) {
    this.versions = this.getCache('versions') || {};
  }
  return this.versions;
};

/**
 * Get cache index info
 *
 * @return array
 */
Cache.prototype.getIndex = function() {
  if (!this.indexes) {
    this.indexes = this.getCache('index') || {};
  }
  return this.indexes;
};

/**
 * Put cache result in storage atomicly
 *
 * @param  string url
 * @param  mixed data
 * @param  mixed result
 */
Cache.prototype.put = function(url, data, result) {
  if (result.$data === undefined) {
    result.$data = null; // Allows for null response
  }

  this.getVersions();

  var cacheContent = {};
  var keys = Object.keys(result);
  for (var i = 0; i < keys.length; i++) {
    cacheContent[keys[i]] = result[keys[i]];
  }
  cacheContent.$cached = true;

  var cacheKey = this.getKey(url, data);
  var cachePath = this.getPath(cacheKey, 'result');

  var size = this.writeCache(cachePath, cacheContent);

  if (size > 0) {
    if (result.$cached !== undefined) {
      var cached = result.$cached;
      var resultCollections = this.resultCollections(result);
      for (var i = 0; i < resultCollections.length; i++) {
        var collection = resultCollections[i];
        // Collection may not be cacheable
        if (cached[collection] === undefined && this.versions[collection] === undefined) {
          continue;
        }
        this.putIndex(collection, cacheKey, size);
        if (cached[collection] !== undefined) {
          this.putVersion(collection, cached[collection]);
        }
      }
    }
  }
};

/**
 * Update/write the cache index
 *
 * @param  string collection
 * @param  string key
 * @param  string size
 */
Cache.prototype.putIndex = function(collection, key, size) {
  this.getIndex();

  // Limit size of index per client/collection
  if (this.indexes[collection] !== undefined) {
    if (Object.keys(this.indexes[collection]).length >= this.params.indexLimit) {
      this.truncateIndex(collection);
    }
  }

  this.indexes[collection] = this.indexes[collection] || {};
  this.indexes[collection][key] = size;

  var indexPath = this.getPath('index');

  return this.writeCache(indexPath, this.indexes);
};

/**
 * Remove an entry from cache base on url and data
 * This is mostly used for caching variables as opposed to client results
 *
 * @param  string url
 * @param  mixed data
 */
Cache.prototype.remove = function(url, data) {
  data = data || null;
  var cacheKey = this.getKey(url, data);
  var cachePath = this.getPath(cacheKey, 'result');
  this.clearCache(cachePath);
};

/**
 * Truncate the cache index (usually by 1)
 * Prefers to eject the smallest cache content first
 *
 * @param  string collection
 * @return bool
 */
Cache.prototype.truncateIndex = function(collection) {
  this.getIndex();
  if (this.indexes[collection] === undefined) {
    return;
  }
  var keys = Object.keys(this.indexes[collection]);
  var lastKey = keys[keys.length - 1];
  var invalid = {};
  invalid[collection] = lastKey;
  this.clearIndexes(invalid);
};

/**
 * Update/write the cache version file
 *
 * @param  string collection
 * @param  number version
 * @return number
 */
Cache.prototype.putVersion = function(collection, version) {
  if (!version) {
    return;
  }
  this.getVersions();
  this.versions[collection] = version;
  var versionPath = this.getPath('versions');
  this.writeCache(versionPath, this.versions);
};

/**
 * Clear all cache entries made invalid by result
 *
 * @param  mixed result
 */
Cache.prototype.clear = function(result) {
  if (result.$cached === undefined) {
    return;
  }

  this.getVersions();

  var invalid = {};
  var cachedCollections = Object.keys(result.$cached);
  for (var i = 0; i < cachedCollections.length; i++) {
    var collection = cachedCollections[i];
    var version = result.$cached[collection];
    if (this.versions[collection] === undefined || version !== this.versions[collection]) {
      this.putVersion(collection, version);
      invalid[collection] = true;
      // Hack to make admin.settings affect other api.settings
      // TODO: figure out how to do this on the server side
      if (collection === 'admin.settings') {
        var versionCollections = Object.keys(this.versions);
        for (var j = 0; j < versionCollections.length; j++) {
          var verCollection = versionCollections[j];
          if (String(verCollection).match(/\.settings$/)) {
            invalid[verCollection] = true;
          }
        }
      }
    }
  }

  if (Object.keys(invalid).length > 0) {
    this.clearIndexes(invalid);
  }
};

/**
 * Clear cache index for a certain collection
 *
 * @param  array invalid
 */
Cache.prototype.clearIndexes = function(invalid) {
  if (!invalid || Object.keys(invalid).length === 0) {
    return;
  }

  this.getIndex();
  var invalidCollections = Object.keys(invalid);
  for (var i = 0; i < invalidCollections.length; i++) {
    var collection = invalidCollections[i];
    if (this.indexes[collection] !== undefined) {
      if (invalid[collection] === true) {
        // Clear all indexes per collection
        var cacheKeys = Object.keys(this.indexes[collection]);
        for (var j = 0; j < cacheKeys.length; j++) {
          var key = cacheKeys[j];
          var cachePath = this.getPath(key, 'result');
          this.clearCache(cachePath);
          delete this.indexes[collection][key];
        }
      } else if (invalid[collection] && this.indexes[collection][invalid[collection]] !== undefined) {
        // Clear a single index element by key
        var key = invalid[collection];
        var cachePath = this.getPath(key, 'result');
        this.clearCache(cachePath);
        delete this.indexes[collection][key];
      }
    }
  }

  var indexPath = this.getPath('index');
  this.writeCache(indexPath, this.indexes);
};

/**
 * Get cache content
 *
 * @return string
 */
Cache.prototype.getCache = function() {
  var cachePath = this.getPath.apply(this, arguments);
  if (this.memory[cachePath] !== undefined) {
    return JSON.parse(this.memory[cachePath]);
  }
  return null;
};

/**
 * Write to cache atomically
 *
 * @param  string cachePath
 * @param  mixed content
 * @return number
 */
Cache.prototype.writeCache = function(cachePath, content) {
  var cacheContent = JSON.stringify(content);
  var cacheSize = cacheContent.length;

  // TODO: file system storage
  this.memory[cachePath] = cacheContent;

  return cacheSize;
};

/**
 * Clear a cache path
 *
 * @param  string cachePath
 */
Cache.prototype.clearCache = function(cachePath) {
  delete this.memory[cachePath];
};

/**
 * Get array of collections affected by a result
 *
 * @param  array result
 * @return array
 */
Cache.prototype.resultCollections = function(result) {
  var collections = result.$collection !== undefined ? [ result.$collection ] : [];
  // Combine $collection and $expanded headers
  if (result.$expanded !== undefined) {
    for (var i = 0; i < result.$expanded.length; i++) {
      var expCollection = result.$expanded[i];
      if (collections.indexOf(expCollection) === -1) {
        collections.push(expCollection);
      }
    }
  }
  return collections;
};


// Exports
exports.Cache = Cache;
