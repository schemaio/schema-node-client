var inherits = require('util').inherits;
var events = require('events');
var fs = require('fs');

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

  options = options || {};
  if (typeof options === 'string') {
    options = { path: options };
  }
  this.params = {
    clientId: clientId,
    path: options.path,
    writePerms: options.writePerms || DEFAULT_WRITE_PERMS,
    indexLimit: options.indexLimit || DEFAULT_INDEX_LIMIT
  };
};

inherits(Cache, events.EventEmitter);

/**
 * Get result from cache by url/data
 *
 * @param  string url
 * @param  mixed data
 */
Cache.prototype.get = function(url, data) {

};

/**
 * Get a cache key
 *
 * @param  string url
 * @param  mixed data
 * @return string
 */
Cache.prototype.getKey = function(url, data) {

};

/**
 * Get path to a cache file
 *
 * @return string
 */
Cache.prototype.getPath = function(url, data) {

};

/**
 * Get cache version info
 *
 * @return array
 */
Cache.prototype.getVersions = function() {

};

/**
 * Get cache index info
 *
 * @return array
 */
Cache.prototype.getIndex = function() {

};

/**
 * Put cache result in storage atomicly
 *
 * @param  string url
 * @param  mixed data
 * @param  mixed result
 */
Cache.prototype.put = function(url, data, result) {

};

/**
 * Update/write the cache index
 *
 * @param  string collection
 * @param  string key
 * @param  string size
 */
Cache.prototype.putIndex = function(collection, key, size) {

};

/**
 * Remove an entry from cache base on url and data
 * This is mostly used for caching variables as opposed to client results
 *
 * @param  string url
 * @param  mixed data
 */
Cache.prototype.remove = function(url, data) {

};

/**
 * Truncate the cache index (usually by 1)
 * Prefers to eject the smallest cache content first
 *
 * @param  string collection
 * @return bool
 */
Cache.prototype.truncateIndex = function(collection) {

};

/**
 * Update/write the cache version file
 *
 * @param  string collection
 * @param  string cacheKey
 * @return number
 */
Cache.prototype.putVersion = function(collection, cacheKey) {

};

/**
 * Clear all cache entries made invalid by result
 *
 * @param  string url
 * @param  mixed data
 * @param  mixed result
 */
Cache.prototype.clear = function(url, data, result) {

};

/**
 * Clear cache index for a certain collection
 *
 * @param  array invalid
 */
Cache.prototype.clearIndexes = function(invalid) {

};

/**
 * Get cache content
 *
 * @return string
 */
Cache.prototype.getCache = function() {

};

/**
 * Write to cache atomically
 *
 * @param  string cachePath
 * @param  mixed content
 * @return number
 */
Cache.prototype.writeCache = function(cachePath, content) {

};

/**
 * Clear a cache path
 *
 * @param  string cachePath
 */
Cache.prototype.clearCache = function(cachePath) {

};

/**
 * Get array of collections affected by a result
 *
 * @param  array result
 * @return array
 */
Cache.prototype.resultCollections = function(result) {

};


// Exports
exports.Cache = Cache;
