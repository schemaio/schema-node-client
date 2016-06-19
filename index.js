var scjs = require('./lib/schema');

var schema = module.exports;

// Core resources
schema.Promise = require('bluebird');
schema.Client = require('./lib/client').Client;
schema.Connection = require('./lib/connection');
schema.Record = scjs.Record;
schema.Resource = scjs.Resource;
schema.util = scjs.util;
schema.api = scjs.api;
schema.setClientKey = scjs.setClientKey;
