var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var readlineSync = require('readline-sync');
var schema = require('../index');

var INFO_FILE = '.schema';
var CONFIG_DIR = '/schema';

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
  cmd: 'pull',
  description: 'retrieve config files from the server',
  action: function(act) {
    ensureSetup(act.parent.dir, function(info) {
      console.log('actions.pull', decryptSecret(info.secretKey));
    });
  }
};

commands.push = {
  cmd: 'push [files...]',
  description: 'deploy config files to the server',
  action: function(files, act) {
    console.log('actions.push', files);
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
