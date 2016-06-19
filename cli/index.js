#!/usr/bin/env node

var pkg = require('../package');
var commands = require('./commands.js');
var commander = require('commander');

commander.version(pkg.version);

commander.option('--dir <directory>', 'specific path to a config directory');

for (var key in commands) {
  var i = commands[key];
  var command = commander.command(i.cmd);
  command.description(i.description);
  if (i.options) {
    i.options.forEach(function(opt) {
      command.option(opt[0], opt[1]);
    });
  }
  command.action(i.action);
}

if (!process.argv.slice(2).length) {
  commander.help();
}

commander.parse(process.argv);
