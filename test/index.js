// Global `helpers`
global.helpers = module.exports;

// Global `assert`
global.assert = require('chai').assert;

// Global sinon
global.sinon = require('sinon');

// Global `dump`
helpers.dump = global.dump = function() {
  return console.log.apply(this, arguments);
};

// Require modules from base path
helpers.requireBase = function(path) {
  return require('../' + path)
};
