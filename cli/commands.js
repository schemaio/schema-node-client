var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var readlineSync = require('readline-sync');
var schema = require('../index');

var INFO_FILE = '.schema';
var CONFIG_DIR = '/schema';
var CONFIG_TYPES = [
  'models', 'layouts', 'notifications'
]

var resetAuth = false;
var clientInstance = null;

var commands = module.exports;

// TODO: commands.login (email, password)

commands.auth = {
  cmd: 'auth',
  description: 'set client auth credentials',
  action: function(act) {
    resetAuth = true;
    ensureSetup(act.parent.dir);
  }
};

commands.pull = {
  cmd: 'pull [type]',
  description: 'retrieve config files from the server',
  action: function(type, act) {
    ensureSetup(act.parent.dir, function(info) {
      pullConfigs(info, type);
    });
  }
};

commands.push = {
  cmd: 'push [files...]',
  description: 'deploy config files to the server',
  action: function(files, act) {
    ensureSetup(act.parent.dir, function(info) {
      pushConfigs(info, files);
    });
  }
};

commands.watch = {
  cmd: 'watch [files...]',
  description: 'auto-deploy config files when changes are detected',
  action: function(files, act) {
    console.log('actions.watch', files);
  }
};

commands.reset = {
  cmd: 'reset [files...]',
  description: 'reset local config file from the server',
  action: function(files, act) {
    console.log('actions.reset', files);
  }
};

commands.get = {
  'cmd': 'get <url> [query...]',
  description: 'GET request',
  action: function(url, query, act) {
    clientRequest('get', url, query, act);
  }
};

commands.put = {
  cmd: 'put <url> [query...]',
  description: 'PUT request',
  action: function(url, query, act) {
    clientRequest('put', url, query, act);
  }
};

commands.post = {
  cmd: 'post <url> [query...]',
  description: 'POST request',
  action: function(url, query, act) {
    clientRequest('post', url, query, act);
  }
};

commands.delete = {
  cmd: 'delete <url> [query...]',
  description: 'DELETE request',
  action: function(url, query, act) {
    clientRequest('delete', url, query, act);
  }
};

commands.env = {
  cmd: 'env [key] [value]',
  description: 'get/set schema environment variables',
  action: function(key, value, act) {
    var dir = act.parent.dir;
    var root = ensureRoot(dir);
    var info = ensureInfo(root, dir);

    if (key) {
      if (value !== undefined) {
        if (key === 'secretKey') {
          value = encryptSecret(value);
        }
        var extra = {};
        extra[key] = value;
        writeInfo(info, extra);
      } else {
        if (key === 'secretKey') {
          info.secretKey = decryptSecret(info.secretKey);
        }
        console.log(info[key]);
        return;
      }
    }

    if (info.secretKey) {
      info.secretKey = decryptSecret(info.secretKey);
    }
    console.log(info);
  }
};

/**
 * Init and return a client instance using auth
 *
 */
function client(info) {
  if (!clientInstance) {
    clientInstance = new schema.Client(info.clientId, decryptSecret(info.secretKey), {
      host: info.host,
      port: info.port
    });
  }
  return clientInstance;
}

/**
 * Perform an ad-hoc client request
 *
 * @param  string method
 * @param  string url
 * @param  mixed data
 * @param  object act
 */
function clientRequest(method, url, data, act) {
  ensureSetup(act.parent.dir, function(info) {
    if (data.length) {
      try {
        data = data.join('');
        eval('data = ' + data);
      } catch (err) {
        exitError(err.toString() + ': ' + data);
      }
    }
    return client(info)[method](url, data || {}).then(function(result) {
      console.log(result);
      process.exit();
    }).catch(function(err) {
      exitError('Error: ' + err.toString());
    })
  });
}

/**
 * Ensure schema directory and params are setup
 *
 * @param  function callback
 */
function ensureSetup(dir, callback) {
  var root = ensureRoot(dir);
  var info = ensureInfo(root, dir);
  ensureDirectory(root, info);
  callback && callback(info);
}

/**
 * Ensure command is called from a proper root path
 *
 * @param  string dir
 * @return root
 */
function ensureRoot(dir) {
  var cwd = dir || process.cwd();
  var root = findRoot(cwd);

  if (!root || typeof root !== 'string') {
    exitError(
      'Error: Current path is not inside a module (' + cwd +')'
      + '\n(Note: Use --dir to specify a config directory within a module)'
    );
  }

  return root;
}

/**
 * Ensure config directory exists or create it
 *
 * @param  string root
 */
function ensureDirectory(root, info) {
  if (!fs.existsSync(info.dir)) {
    var shouldCreate = readlineSync.question(
      'Config directory does not exist (' + info.dir + '). Do you want to create it? (Y/n) >'
    );
    if (shouldCreate === '' || shouldCreate.toLowerCase() === 'y') {
      fs.mkdirSync(info.dir);
    } else {
      exitError(
        'Note: You may use --dir to specify a config directory'
      );
    }
  }
}

/**
 * Ensure config info is set
 *
 * @param  string dirPath
 */
function ensureInfo(root, dir) {
  var info = {};
  var infoPath = path.join(root, INFO_FILE);
  var dirPath = path.resolve(dir || path.join(root, CONFIG_DIR));

  if (fs.existsSync(infoPath)) {
    info = JSON.parse(fs.readFileSync(infoPath)) || {};
  } else {
    console.log('Creating ' + infoPath + ' -- please add it to .gitignore if applicable');
  }

  if (info.root !== root) {
    writeInfo(info, { root: root });
  }

  if (info.dir !== dirPath) {
    writeInfo(info, { dir: dirPath });
  }

  if (!info.clientId || resetAuth) {
    var clientId = readlineSync.question(
      'Enter your client ID: '
    );
    writeInfo(info, { clientId: clientId });
  }

  if (!info.secretKey || resetAuth) {
    var secretKey = readlineSync.question(
      'Enter your client secret key: ', {
        hideEchoBack: true
      }
    );
    // Encrypt key just in case it gets committed or shared
    writeInfo(info, { secretKey: encryptSecret(secretKey) });
  }

  resetAuth = false;

  return info;
}

/**
 * Write to info cache
 *
 * @param  object info
 * @param  object extra
 */
function writeInfo(info, extra) {
  if (extra) {
    for (var key in extra) {
      info[key] = extra[key];
    }
  }
  var infoJson = JSON.stringify(info, null, 2);
  fs.writeFileSync(info.root + '/' + INFO_FILE, infoJson);
}

/**
 * Exit program with an error
 *
 * @param  string error
 */
function exitError(error) {
  console.log('\x1b[33m' + error + '\x1b[0m');
  process.exit(1);
}

/**
 * Find root path of the current node module
 *
 * @param  string start
 * @return string
 */
function findRoot(start) {
  start = start || process.cwd();

  if (typeof start === 'string') {
    start = path.resolve(start);
    if (start[start.length-1] !== path.sep) {
      start += path.sep
    }
    start = start.split(path.sep);
  }

  if (!start.length) {
    return null;
  }

  start.pop()

  var dir = start.join(path.sep);
  try {
    fs.statSync(path.join(dir, 'package.json'));
    return dir;
  } catch (e) {}

  return findRoot(start);
}

/**
 * Encrypt a secret
 *
 * @param  string secret
 * @param  string
 */
function encryptSecret(secret) {
  var password = require('os').hostname();
  var cipher = crypto.createCipher('aes-256-ctr', password);
  var secretEncrypted = cipher.update(secret, 'utf8', 'hex');
  secretEncrypted += cipher.final('hex');
  return secretEncrypted;
}

/**
 * Decrypt a secret
 *
 * @param  string secretEncrypted
 * @return string
 */
function decryptSecret(secretEncrypted) {
  var password = require('os').hostname();
  var decipher = crypto.createDecipher('aes-256-ctr', password);
  var secret = decipher.update(secretEncrypted, 'hex', 'utf8');
  secret += decipher.final('utf8');
  return secret;
}

/**
 * Pull configs from the server
 *
 * @param  object info
 * @param  string type
 */
function pullConfigs(info, type) {
  var types = type ? [type] : CONFIG_TYPES;

  if (type && CONFIG_TYPES.indexOf(type) === -1) {
    exitError(
      'Invalid config type \'' + type + '\''
      + ' - Must be one of [' + CONFIG_TYPES.join(', ') + ']'
    );
  }

  var totalCount = 0;
  var startTime = Date.now();
  var promise = schema.Promise.bind(this);

  types.forEach(function(configType) {
    promise = promise.then(function() {
      var configPath = path.join(info.dir, configType);
      console.log('\x1b[32m\nPulling :' + configType + '\x1b[0m');
      return client(info).get('/:' + configType, {
        limit: null
      }).then(function(res) {
        if (!res || !res.results.length) {
          return;
        }
        if (!fs.existsSync(configPath)) {
          fs.mkdirSync(configPath);
        }
        res.results.forEach(function(record) {
          var baseId = record.client_id ? (record.client_id + '.' + record.api) : record.api;
          var recordFile = record.id.split(baseId)[1]
            .replace(/\./g, '/')
            .replace(/\:/g, '/')
            + '.json';
          //var recordFile = '/' + record.name + '.json';
          console.log('    > \x1b[1m' + configType + recordFile + '\x1b[0m');
          writeFilePathSync(configPath + recordFile, JSON.stringify(record.toObject(), null, 2));
          totalCount++;
        });
      }).catch(function(err) {
        console.log(err.stack);
        exitError(err.toString());
      });
    });
  });

  promise.then(function() {
    totalSeconds = ((Date.now() - startTime) / 1000) + ' seconds';
    console.log('\n\x1b[32mOK. Retrieved ' + totalCount + ' configurations in ' + totalSeconds + '\x1b[0m');
    process.exit();
  });

  return promise;
}

/**
 * Push configs to the server
 *
 * @param  object info
 * @param  array files
 */
function pushConfigs(info, filesOrTypes) {
  var filesByType = resolveFilesByType(info, filesOrTypes);

  var totalCount = 0;
  var startTime = Date.now();
  var promise = schema.Promise.bind(this);

  var configDataByPath = {};
  for (var configType in filesByType) {
    filesByType[configType].forEach(function(filePath) {
      try {
        configDataByPath[filePath] = require(filePath);
      } catch (err) {
        exitError(
          'Unable to load ' + filePath.replace(info.dir, '')
          + '. Maybe a syntax error?'
        );
      }
      if (!configDataByPath[filePath] || !configDataByPath[filePath].id) {
        exitError(
          'Configuration missing `id` property in ' + filePath.replace(info.dir, '')
        );
      }
    });
  }

  for (var configType in filesByType) {
    promise = promise.then((function(configType) {
      console.log('\x1b[32m\nPushing :' + configType + '\x1b[0m');
      var promise2 = schema.Promise.bind(this);
      filesByType[configType].forEach(function(filePath) {
        promise2 = promise2.then(function() {
          var configUrl = '/:' + configType + '/{id}';
          var configData = configDataByPath[filePath];
          return client(info).put(configUrl, configData).then(function(record) {
            if (!record) {
              console.log('\x1b[31mError: Invalid response from PUT '+ configUrl + '\x1b[0m');
              return;
            }
            var recordFile = filePath.replace(info.dir + '/', '');
            var change = configData.version === record.version ? '(no change)' : '(now ' + record.version + ')';
            console.log('    > \x1b[1m' + recordFile + '\x1b[0m ' + change);
            writeFilePathSync(filePath, JSON.stringify(record.toObject(), null, 2));
            totalCount++;
          }).catch(function(err) {
            console.log(filePath);
            exitError(err.toString());
          });
        });
      });
      return promise2;
    }).bind(this, configType));
  }

  promise.then(function() {
    totalSeconds = ((Date.now() - startTime) / 1000) + ' seconds';
    console.log('\n\x1b[32mOK. Pushed ' + totalCount + ' configurations in ' + totalSeconds + '\x1b[0m');
    process.exit();
  });

  return promise;
}

/**
 *
 */
function resolveFilesByType(info, files) {
  var filesByType = {};

  if (!files || !files.length) {
    files = [ info.dir ];
  }

  files.forEach(function(file) {
    // Can be an explicit type
    var type = file;
    if (CONFIG_TYPES.indexOf(type) !== -1) {
      var configPath = path.join(info.dir, type);
      filesByType[type] = findFiles(configPath, info.dir + '/' + type);
      return;
    }

    // Or file
    var filePath = path.resolve(file);
    if (filePath.indexOf(info.dir) !== 0 || !fs.existsSync(filePath)) {
      exitError('Error: Not a valid config file path: ' + file);
    }

    file = filePath.replace(info.dir + '/', '').split('/');
    var type = file.shift();

    if (type.length) {
      filesByType[type] = filesByType[type] || [];
      if (fs.statSync(filePath).isDirectory()) {
        filesByType[type] = filesByType[type].concat(
          findFiles(filePath, info.dir + '/' + type)
        );
      } else {
        filesByType[type].push(filePath);
      }
    } else {
      CONFIG_TYPES.forEach(function(type) {
        var configPath = path.join(info.dir, type);
        filesByType[type] = findFiles(configPath, info.dir + '/' + type);
      });
    }
  });

  return filesByType;
}

/**
 *
 */
function findFiles(dir, root, results) {
  var files = fs.readdirSync(dir);
  var results = results || [];
  files.forEach(function(file) {
    var filePath = dir + '/' + file;
    if (fs.statSync(filePath).isDirectory()) {
      results = findFiles(filePath, root, results);
    } else {
      results.push(filePath);
    }
  });
  return results;
};

/**
 * Write a file and directory structure if not exists
 *
 * @param  string filePath
 * @param  mixed data
 */
function writeFilePathSync(filePath, data, isDir) {
  ensureDirectoryExists(filePath);
  return fs.writeFileSync(filePath, data);

  function ensureDirectoryExists(filePath) {
    var dirPath = path.dirname(filePath);
    if (dirPath === '/') return;
    if (!fs.existsSync(dirPath)) {
      ensureDirectoryExists(dirPath);
      fs.mkdirSync(dirPath);
    }
  }
};
