/*! schema.js (Version 1.1.4) 2015-11-12 */

// Promise 6.0.0 (source: https://www.promisejs.org/polyfills/promise-6.0.0.js)
(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;
        if (!u && a) return a(o, !0);
        if (i) return i(o, !0);
        var f = new Error("Cannot find module '" + o + "'");
        throw f.code = "MODULE_NOT_FOUND", f;
      }
      var l = n[o] = {
        exports: {}
      };
      t[o][0].call(l.exports, function(e) {
        var n = t[o][1][e];
        return s(n ? n : e);
      }, l, l.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = typeof require == "function" && require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s;
})({
  1: [ function(require, module, exports) {
    var process = module.exports = {};
    process.nextTick = function() {
      var canSetImmediate = typeof window !== "undefined" && window.setImmediate;
      var canPost = typeof window !== "undefined" && window.postMessage && window.addEventListener;
      if (canSetImmediate) {
        return function(f) {
          return window.setImmediate(f);
        };
      }
      if (canPost) {
        var queue = [];
        window.addEventListener("message", function(ev) {
          var source = ev.source;
          if ((source === window || source === null) && ev.data === "process-tick") {
            ev.stopPropagation();
            if (queue.length > 0) {
              var fn = queue.shift();
              fn();
            }
          }
        }, true);
        return function nextTick(fn) {
          queue.push(fn);
          window.postMessage("process-tick", "*");
        };
      }
      return function nextTick(fn) {
        setTimeout(fn, 0);
      };
    }();
    process.title = "browser";
    process.browser = true;
    process.env = {};
    process.argv = [];
    function noop() {}
    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;
    process.binding = function(name) {
      throw new Error("process.binding is not supported");
    };
    process.cwd = function() {
      return "/";
    };
    process.chdir = function(dir) {
      throw new Error("process.chdir is not supported");
    };
  }, {} ],
  2: [ function(require, module, exports) {
    "use strict";
    var asap = require("asap");
    module.exports = Promise;
    function Promise(fn) {
      if (typeof this !== "object") throw new TypeError("Promises must be constructed via new");
      if (typeof fn !== "function") throw new TypeError("not a function");
      var state = null;
      var value = null;
      var deferreds = [];
      var self = this;
      this.then = function(onFulfilled, onRejected) {
        return new self.constructor(function(resolve, reject) {
          handle(new Handler(onFulfilled, onRejected, resolve, reject));
        });
      };
      function handle(deferred) {
        if (state === null) {
          deferreds.push(deferred);
          return;
        }
        asap(function() {
          var cb = state ? deferred.onFulfilled : deferred.onRejected;
          if (cb === null) {
            (state ? deferred.resolve : deferred.reject)(value);
            return;
          }
          var ret;
          try {
            ret = cb(value);
          } catch (e) {
            deferred.reject(e);
            return;
          }
          deferred.resolve(ret);
        });
      }
      function resolve(newValue) {
        try {
          if (newValue === self) throw new TypeError("A promise cannot be resolved with itself.");
          if (newValue && (typeof newValue === "object" || typeof newValue === "function")) {
            var then = newValue.then;
            if (typeof then === "function") {
              doResolve(then.bind(newValue), resolve, reject);
              return;
            }
          }
          state = true;
          value = newValue;
          finale();
        } catch (e) {
          reject(e);
        }
      }
      function reject(newValue) {
        state = false;
        value = newValue;
        finale();
      }
      function finale() {
        for (var i = 0, len = deferreds.length; i < len; i++) handle(deferreds[i]);
        deferreds = null;
      }
      doResolve(fn, resolve, reject);
    }
    function Handler(onFulfilled, onRejected, resolve, reject) {
      this.onFulfilled = typeof onFulfilled === "function" ? onFulfilled : null;
      this.onRejected = typeof onRejected === "function" ? onRejected : null;
      this.resolve = resolve;
      this.reject = reject;
    }
    function doResolve(fn, onFulfilled, onRejected) {
      var done = false;
      try {
        fn(function(value) {
          if (done) return;
          done = true;
          onFulfilled(value);
        }, function(reason) {
          if (done) return;
          done = true;
          onRejected(reason);
        });
      } catch (ex) {
        if (done) return;
        done = true;
        onRejected(ex);
      }
    }
  }, {
    asap: 4
  } ],
  3: [ function(require, module, exports) {
    "use strict";
    var Promise = require("./core.js");
    var asap = require("asap");
    module.exports = Promise;
    function ValuePromise(value) {
      this.then = function(onFulfilled) {
        if (typeof onFulfilled !== "function") return this;
        return new Promise(function(resolve, reject) {
          asap(function() {
            try {
              resolve(onFulfilled(value));
            } catch (ex) {
              reject(ex);
            }
          });
        });
      };
    }
    ValuePromise.prototype = Promise.prototype;
    var TRUE = new ValuePromise(true);
    var FALSE = new ValuePromise(false);
    var NULL = new ValuePromise(null);
    var UNDEFINED = new ValuePromise(undefined);
    var ZERO = new ValuePromise(0);
    var EMPTYSTRING = new ValuePromise("");
    Promise.resolve = function(value) {
      if (value instanceof Promise) return value;
      if (value === null) return NULL;
      if (value === undefined) return UNDEFINED;
      if (value === true) return TRUE;
      if (value === false) return FALSE;
      if (value === 0) return ZERO;
      if (value === "") return EMPTYSTRING;
      if (typeof value === "object" || typeof value === "function") {
        try {
          var then = value.then;
          if (typeof then === "function") {
            return new Promise(then.bind(value));
          }
        } catch (ex) {
          return new Promise(function(resolve, reject) {
            reject(ex);
          });
        }
      }
      return new ValuePromise(value);
    };
    Promise.all = function(arr) {
      var args = Array.prototype.slice.call(arr);
      return new Promise(function(resolve, reject) {
        if (args.length === 0) return resolve([]);
        var remaining = args.length;
        function res(i, val) {
          try {
            if (val && (typeof val === "object" || typeof val === "function")) {
              var then = val.then;
              if (typeof then === "function") {
                then.call(val, function(val) {
                  res(i, val);
                }, reject);
                return;
              }
            }
            args[i] = val;
            if (--remaining === 0) {
              resolve(args);
            }
          } catch (ex) {
            reject(ex);
          }
        }
        for (var i = 0; i < args.length; i++) {
          res(i, args[i]);
        }
      });
    };
    Promise.reject = function(value) {
      return new Promise(function(resolve, reject) {
        reject(value);
      });
    };
    Promise.race = function(values) {
      return new Promise(function(resolve, reject) {
        values.forEach(function(value) {
          Promise.resolve(value).then(resolve, reject);
        });
      });
    };
    Promise.prototype["catch"] = function(onRejected) {
      return this.then(null, onRejected);
    };
  }, {
    "./core.js": 2,
    asap: 4
  } ],
  4: [ function(require, module, exports) {
    (function(process) {
      var head = {
        task: void 0,
        next: null
      };
      var tail = head;
      var flushing = false;
      var requestFlush = void 0;
      var isNodeJS = false;
      function flush() {
        while (head.next) {
          head = head.next;
          var task = head.task;
          head.task = void 0;
          var domain = head.domain;
          if (domain) {
            head.domain = void 0;
            domain.enter();
          }
          try {
            task();
          } catch (e) {
            if (isNodeJS) {
              if (domain) {
                domain.exit();
              }
              setTimeout(flush, 0);
              if (domain) {
                domain.enter();
              }
              throw e;
            } else {
              setTimeout(function() {
                throw e;
              }, 0);
            }
          }
          if (domain) {
            domain.exit();
          }
        }
        flushing = false;
      }
      if (typeof process !== "undefined" && process.nextTick) {
        isNodeJS = true;
        requestFlush = function() {
          process.nextTick(flush);
        };
      } else if (typeof setImmediate === "function") {
        if (typeof window !== "undefined") {
          requestFlush = setImmediate.bind(window, flush);
        } else {
          requestFlush = function() {
            setImmediate(flush);
          };
        }
      } else if (typeof MessageChannel !== "undefined") {
        var channel = new MessageChannel();
        channel.port1.onmessage = flush;
        requestFlush = function() {
          channel.port2.postMessage(0);
        };
      } else {
        requestFlush = function() {
          setTimeout(flush, 0);
        };
      }
      function asap(task) {
        tail = tail.next = {
          task: task,
          domain: isNodeJS && process.domain,
          next: null
        };
        if (!flushing) {
          flushing = true;
          requestFlush();
        }
      }
      module.exports = asap;
    }).call(this, require("_process"));
  }, {
    _process: 1
  } ],
  5: [ function(require, module, exports) {
    if (typeof Promise.prototype.done !== "function") {
      Promise.prototype.done = function(onFulfilled, onRejected) {
        var self = arguments.length ? this.then.apply(this, arguments) : this;
        self.then(null, function(err) {
          setTimeout(function() {
            throw err;
          }, 0);
        });
      };
    }
  }, {} ],
  6: [ function(require, module, exports) {
    var asap = require("asap");
    if (typeof Promise === "undefined") {
      Promise = require("./lib/core.js");
      require("./lib/es6-extensions.js");
    }
    require("./polyfill-done.js");
  }, {
    "./lib/core.js": 2,
    "./lib/es6-extensions.js": 3,
    "./polyfill-done.js": 5,
    asap: 4
  } ]
}, {}, [ 6 ]);
/**
 * Client library, card tokenizer, and drop-in replacement for Stripe.js
 */
(function() {

var Schema = this.Schema = {
    publicUrl: 'https://api.schema.io',
    vaultUrl: 'https://vault.schema.io',
    publicKey: null
};

/**
 * Set public key used to identify client in API calls
 *
 * @param  string key
 */
Schema.setPublicKey = function(key) {
    this.publicKey = key;
    delete this._vaultClient;
    delete this._publicClient;
};

/**
 * Alias for stripe.js compatibility
 *
 * @param  string key
 */
Schema.setPublishableKey = function(key) {
    return Schema.setPublicKey(key);
};

/**
 * Alias card namespace
 */
Schema.card = {};

/**
 * Create a token from card details
 *
 * @param  object card
 * @param  function callback
 * @return void
 */
Schema.createToken = function(card, callback) {

    var error = null;
    var param = null
    if (!card) {
        error = 'Card details are missing in `Schema.createToken(card, callback)`';
        param = '';
    }
    if (!callback) {
        error = 'Callback function missing in `Schema.createToken(card, callback)`';
        param = '';
    }
    if (!Schema.card.validateCardNumber(card.number)) {
        error = 'Card number appears to be invalid';
        param = 'number';
    }
    if (card.exp) {
        var exp = Schema.cardExpiry(card.exp);
        card.exp_month = exp.month;
        card.exp_year = exp.year;
    }
    if (!Schema.card.validateExpiry(card.exp_month, card.exp_year)) {
        error = 'Card expiry appears to be invalid';
        param = 'exp_month';
    }
    if (!Schema.card.validateCVC(card.cvc)) {
        error = 'Card CVC code appears to be invalid';
        param = 'exp_cvc';
    }
    if (error) {
        setTimeout(function() {
            callback(402, {error: {message: error, param: param}});
        }, 1);
        return;
    }

    if (!card.billing) {
        card.billing = {};
    }
    if (card.address_line1) {
        card.billing.address1 = card.address_line1;
    }
    if (card.address_line2) {
        card.billing.address2 = card.address_line2;
    }
    if (card.address_city) {
        card.billing.city = card.address_city;
    }
    if (card.address_state) {
        card.billing.state = card.address_state;
    }
    if (card.address_zip) {
        card.billing.zip = card.address_zip;
    }
    if (card.address_country) {
        card.billing.country = card.address_country;
    }

    // Get a token from Schema Vault
    Schema.vault().post('/tokens', card, function(result, headers) {
        var response = result || {};
        if (headers.$error) {
            response.error = {message: headers.$error};
        } else if (response.errors) {
            var param = Object.keys(result.errors)[0];
            response.error = result.errors[param];
            response.error.param = param;
            headers.$status = 402;
        } else if (result.toObject) {
            response = result.toObject();
        }
        return callback(headers.$status, response);
    });
};
Schema.card.createToken = function() {
    return Schema.createToken.apply(this, arguments);
};

/**
 * Parse card expiry from a string value
 *
 * @param  string value
 * @return object {month: int, year: int}
 */
Schema.cardExpiry = function(value) {

    if (value && value.month && value.year) {
        return value;
    }

    var parts = new String(value).split(/[\s\/\-]+/, 2);
    var month = parts[0];
    var year = parts[1];

    // Convert 2 digit year
    if (year && year.length === 2 && /^\d+$/.test(year)) {
        var prefix = (new Date).getFullYear().toString().substring(0, 2);
        year = prefix + year;
    }

    return {
        month: ~~month,
        year: ~~year
    };
};

/**
 * Determine card type
 */
Schema.cardType = function() {
    return Schema.Stripe.card.cardType.apply(Schema.Stripe, arguments);
};
Schema.card.cardType = function() {
    return Schema.cardType.apply(this, arguments);
};

/**
 * Validate card number
 */
Schema.validateCardNumber = function() {
    return Schema.Stripe.card.validateCardNumber.apply(Schema.Stripe, arguments);
};
Schema.card.validateCardNumber = function() {
    return Schema.validateCardNumber.apply(this, arguments);
};

/**
 * Validate card expiry
 */
Schema.validateExpiry = function() {
    return Schema.Stripe.card.validateExpiry.apply(Schema.Stripe, arguments);
};
Schema.card.validateExpiry = function() {
    return Schema.validateExpiry.apply(this, arguments);
};

/**
 * Validate card CVC code
 */
Schema.validateCVC = function() {
    return Schema.Stripe.card.validateCVC.apply(Schema.Stripe, arguments);
};
Schema.card.validateCVC = function() {
    return Schema.validateCVC.apply(this, arguments);
};

/**
 * Get a public client instance if public key is defined
 *
 * @return Schema.Client
 */
Schema.client = function() {

    if (this._publicClient) {
        return this._publicClient;
    }
    if (!this.publicKey) {
        throw "Error: Public key must be set Schema.setPublicKey()";
    }

    this._publicClient = new Schema.Client(this.publicKey, {hostUrl: this.publicUrl});

    return this._publicClient;
};

/**
 * Get a vault client instance if public key is defined
 *
 * @return Schema.Client
 */
Schema.vault = function() {

    if (this._vaultClient) {
        return this._vaultClient;
    }
    if (!this.publicKey) {
        throw "Error: Public key must be set Schema.setPublicKey()";
    }

    this._vaultClient = new Schema.Client(this.publicKey, {hostUrl: this.vaultUrl});

    return this._vaultClient;
};


/**
 * Include Stripe (v2)
 * Use for validation and Stripe specific tokenization
 */
(function() {
    var e, t, n, r, i, s = {}.hasOwnProperty,
        o = function(e, t) {
            function r() {
                this.constructor = e
            }
            for (var n in t) s.call(t, n) && (e[n] = t[n]);
            return r.prototype = t.prototype, e.prototype = new r, e.__super__ = t.prototype, e
        },
        u = this;
    this.Stripe = function() {
        function e() {}
        return e.version = 2, e.endpoint = "https://api.stripe.com/v1", e.setPublishableKey = function(t) {
            e.key = t
        }, e.complete = function(t, n) {
            return function(r, i, s) {
                var o;
                if (r !== "success") return o = Math.round((new Date)
                        .getTime() / 1e3), (new Image)
                    .src = "https://q.stripe.com?event=stripejs-error&type=" + r + "&key=" + e.key + "&timestamp=" + o, typeof t == "function" ? t(500, {
                        error: {
                            code: r,
                            type: r,
                            message: n
                        }
                    }) : void 0
            }
        }, e
    }.call(this), e = this.Stripe, this.Stripe.token = function() {
        function t() {}
        return t.validate = function(e, t) {
            if (!e) throw t + " required";
            if (typeof e != "object") throw t + " invalid"
        }, t.formatData = function(t, n) {
            return e.utils.isElement(t) && (t = e.utils.paramsFromForm(t, n)), e.utils.underscoreKeys(t), t
        }, t.create = function(t, n) {
            return t.key || (t.key = e.key || e.publishableKey), e.utils.validateKey(t.key), e.ajaxJSONP({
                url: "" + e.endpoint + "/tokens",
                data: t,
                method: "POST",
                success: function(e, t) {
                    return typeof n == "function" ? n(t, e) : void 0
                },
                complete: e.complete(n, "A network error has occurred, and you have not been charged. Please try again."),
                timeout: 4e4
            })
        }, t.get = function(t, n) {
            if (!t) throw "token required";
            return e.utils.validateKey(e.key), e.ajaxJSONP({
                url: "" + e.endpoint + "/tokens/" + t,
                data: {
                    key: e.key
                },
                success: function(e, t) {
                    return typeof n == "function" ? n(t, e) : void 0
                },
                complete: e.complete(n, "A network error has occurred loading data from Stripe. Please try again."),
                timeout: 4e4
            })
        }, t
    }.call(this), this.Stripe.card = function(t) {
        function n() {
            return n.__super__.constructor.apply(this, arguments)
        }
        return o(n, t), n.tokenName = "card", n.whitelistedAttrs = ["number", "cvc", "exp_month", "exp_year", "name", "address_line1", "address_line2", "address_city", "address_state", "address_zip", "address_country"], n.createToken = function(t, r, i) {
            var s;
            return r == null && (r = {}), e.token.validate(t, "card"), typeof r == "function" ? (i = r, r = {}) : typeof r != "object" && (s = parseInt(r, 10), r = {}, s > 0 && (r.amount = s)), r[n.tokenName] = e.token.formatData(t, n.whitelistedAttrs), e.token.create(r, i)
        }, n.getToken = function(t, n) {
            return e.token.get(t, n)
        }, n.validateCardNumber = function(e) {
            return e = (e + "")
                .replace(/\s+|-/g, ""), e.length >= 10 && e.length <= 16 && n.luhnCheck(e)
        }, n.validateCVC = function(t) {
            return t = e.utils.trim(t), /^\d+$/.test(t) && t.length >= 3 && t.length <= 4
        }, n.validateExpiry = function(t, n) {
            var r, i;
            return t = e.utils.trim(t), n = e.utils.trim(n), /^\d+$/.test(t) ? /^\d+$/.test(n) ? parseInt(t, 10) <= 12 ? (i = new Date(n, t), r = new Date, i.setMonth(i.getMonth() - 1), i.setMonth(i.getMonth() + 1, 1), i > r) : !1 : !1 : !1
        }, n.luhnCheck = function(e) {
            var t, n, r, i, s, o;
            r = !0, i = 0, n = (e + "")
                .split("")
                .reverse();
            for (s = 0, o = n.length; s < o; s++) {
                t = n[s], t = parseInt(t, 10);
                if (r = !r) t *= 2;
                t > 9 && (t -= 9), i += t
            }
            return i % 10 === 0
        }, n.cardType = function(e) {
            return n.cardTypes[e.slice(0, 2)] || "Unknown"
        }, n.cardTypes = function() {
            var e, t, n, r;
            t = {};
            for (e = n = 40; n <= 49; e = ++n) t[e] = "Visa";
            for (e = r = 50; r <= 59; e = ++r) t[e] = "MasterCard";
            return t[34] = t[37] = "American Express", t[60] = t[62] = t[64] = t[65] = "Discover", t[35] = "JCB", t[30] = t[36] = t[38] = t[39] = "Diners Club", t
        }(), n
    }.call(this, this.Stripe.token), this.Stripe.bankAccount = function(t) {
        function n() {
            return n.__super__.constructor.apply(this, arguments)
        }
        return o(n, t), n.tokenName = "bank_account", n.whitelistedAttrs = ["country", "routing_number", "account_number"], n.createToken = function(t, r, i) {
            return r == null && (r = {}), e.token.validate(t, "bank account"), typeof r == "function" && (i = r, r = {}), r[n.tokenName] = e.token.formatData(t, n.whitelistedAttrs), e.token.create(r, i)
        }, n.getToken = function(t, n) {
            return e.token.get(t, n)
        }, n.validateRoutingNumber = function(t, r) {
            t = e.utils.trim(t);
            switch (r) {
                case "US":
                    return /^\d+$/.test(t) && t.length === 9 && n.routingChecksum(t);
                case "CA":
                    return /\d{5}\-\d{3}/.test(t) && t.length === 9;
                default:
                    return !0
            }
        }, n.validateAccountNumber = function(t, n) {
            t = e.utils.trim(t);
            switch (n) {
                case "US":
                    return /^\d+$/.test(t) && t.length >= 1 && t.length <= 17;
                default:
                    return !0
            }
        }, n.routingChecksum = function(e) {
            var t, n, r, i, s, o;
            r = 0, t = (e + "")
                .split(""), o = [0, 3, 6];
            for (i = 0, s = o.length; i < s; i++) n = o[i], r += parseInt(t[n]) * 3, r += parseInt(t[n + 1]) * 7, r += parseInt(t[n + 2]);
            return r !== 0 && r % 10 === 0
        }, n
    }.call(this, this.Stripe.token), this.Stripe.bitcoinReceiver = function() {
        function t() {}
        return t._whitelistedAttrs = ["amount", "currency", "email", "description"], t.createReceiver = function(t, n) {
            var r;
            return e.token.validate(t, "bitcoin_receiver data"), r = e.token.formatData(t, this._whitelistedAttrs), r.key = e.key || e.publishableKey, e.utils.validateKey(r.key), e.ajaxJSONP({
                url: "" + e.endpoint + "/bitcoin/receivers",
                data: r,
                method: "POST",
                success: function(e, t) {
                    return typeof n == "function" ? n(t, e) : void 0
                },
                complete: e.complete(n, "A network error has occurred while creating a Bitcoin address. Please try again."),
                timeout: 4e4
            })
        }, t.getReceiver = function(t, n) {
            var r;
            if (!t) throw "receiver id required";
            return r = e.key || e.publishableKey, e.utils.validateKey(r), e.ajaxJSONP({
                url: "" + e.endpoint + "/bitcoin/receivers/" + t,
                data: {
                    key: r
                },
                success: function(e, t) {
                    return typeof n == "function" ? n(t, e) : void 0
                },
                complete: e.complete(n, "A network error has occurred loading data from Stripe. Please try again."),
                timeout: 4e4
            })
        }, t._activeReceiverPolls = {}, t._clearReceiverPoll = function(e) {
            return delete t._activeReceiverPolls[e]
        }, t._pollInterval = 1500, t.pollReceiver = function(e, t) {
            if (this._activeReceiverPolls[e] != null) throw "You are already polling receiver " + e + ". Please cancel that poll before polling it again.";
            return this._activeReceiverPolls[e] = {}, this._pollReceiver(e, t)
        }, t._pollReceiver = function(e, n) {
            t.getReceiver(e, function(r, i) {
                var s, o;
                if (t._activeReceiverPolls[e] == null) return;
                return r === 200 && i.filled ? (t._clearReceiverPoll(e), typeof n == "function" ? n(r, i) : void 0) : r >= 400 && r < 500 ? (t._clearReceiverPoll(e), typeof n == "function" ? n(r, i) : void 0) : (s = r === 500 ? 5e3 : t._pollInterval, o = setTimeout(function() {
                    return t._pollReceiver(e, n)
                }, s), t._activeReceiverPolls[e].timeoutId = o)
            })
        }, t.cancelReceiverPoll = function(e) {
            var n;
            n = t._activeReceiverPolls[e];
            if (n == null) throw "You are not polling receiver " + e + ".";
            n["timeoutId"] != null && clearTimeout(n.timeoutId), t._clearReceiverPoll(e)
        }, t
    }.call(this), t = ["createToken", "getToken", "cardType", "validateExpiry", "validateCVC", "validateCardNumber"];
    for (r = 0, i = t.length; r < i; r++) n = t[r], this.Stripe[n] = this.Stripe.card[n];
    typeof module != "undefined" && module !== null && (module.exports = this.Stripe), typeof define == "function" && define("stripe", [], function() {
        return u.Stripe
    })
})
.call(this),
    function() {
        var e, t, n, r = [].slice;
        e = encodeURIComponent, t = (new Date)
            .getTime(), n = function(t, r, i) {
                var s, o;
                r == null && (r = []);
                for (s in t) o = t[s], i && (s = "" + i + "[" + s + "]"), typeof o == "object" ? n(o, r, s) : r.push("" + s + "=" + e(o));
                return r.join("&")
                    .replace(/%20/g, "+")
            }, this.Stripe.ajaxJSONP = function(e) {
                var i, s, o, u, a, f;
                return e == null && (e = {}), o = "sjsonp" + ++t, a = document.createElement("script"), s = null, i = function(t) {
                    var n;
                    return t == null && (t = "abort"), clearTimeout(s), (n = a.parentNode) != null && n.removeChild(a), o in window && (window[o] = function() {}), typeof e.complete == "function" ? e.complete(t, f, e) : void 0
                }, f = {
                    abort: i
                }, a.onerror = function() {
                    return f.abort(), typeof e.error == "function" ? e.error(f, e) : void 0
                }, window[o] = function() {
                    var t;
                    t = 1 <= arguments.length ? r.call(arguments, 0) : [], clearTimeout(s), a.parentNode.removeChild(a);
                    try {
                        delete window[o]
                    } catch (n) {
                        window[o] = void 0
                    }
                    return typeof e.success == "function" && e.success.apply(e, t), typeof e.complete == "function" ? e.complete("success", f, e) : void 0
                }, e.data || (e.data = {}), e.data.callback = o, e.method && (e.data._method = e.method), a.src = e.url + "?" + n(e.data), u = document.getElementsByTagName("head")[0], u.appendChild(a), e.timeout > 0 && (s = setTimeout(function() {
                    return f.abort("timeout")
                }, e.timeout)), f
            }
    }.call(this),
    function() {
        var e = [].indexOf || function(e) {
            for (var t = 0, n = this.length; t < n; t++)
                if (t in this && this[t] === e) return t;
            return -1
        };
        this.Stripe.utils = function() {
            function t() {}
            return t.trim = function(e) {
                return (e + "")
                    .replace(/^\s+|\s+$/g, "")
            }, t.underscore = function(e) {
                return (e + "")
                    .replace(/([A-Z])/g, function(e) {
                        return "_" + e.toLowerCase()
                    })
                    .replace(/-/g, "_")
            }, t.underscoreKeys = function(e) {
                var t, n, r;
                r = [];
                for (t in e) n = e[t], delete e[t], r.push(e[this.underscore(t)] = n);
                return r
            }, t.isElement = function(e) {
                return typeof e != "object" ? !1 : typeof jQuery != "undefined" && jQuery !== null && e instanceof jQuery ? !0 : e.nodeType === 1
            }, t.paramsFromForm = function(t, n) {
                var r, i, s, o, u, a, f, l, c, h;
                n == null && (n = []), typeof jQuery != "undefined" && jQuery !== null && t instanceof jQuery && (t = t[0]), s = t.getElementsByTagName("input"), u = t.getElementsByTagName("select"), a = {};
                for (f = 0, c = s.length; f < c; f++) {
                    i = s[f], r = this.underscore(i.getAttribute("data-stripe"));
                    if (e.call(n, r) < 0) continue;
                    a[r] = i.value
                }
                for (l = 0, h = u.length; l < h; l++) {
                    o = u[l], r = this.underscore(o.getAttribute("data-stripe"));
                    if (e.call(n, r) < 0) continue;
                    o.selectedIndex != null && (a[r] = o.options[o.selectedIndex].value)
                }
                return a
            }, t.validateKey = function(e) {
                if (!e || typeof e != "string") throw new Error("You did not set a valid publishable key. Call Stripe.setPublishableKey() with your publishable key. For more info, see https://stripe.com/docs/stripe.js");
                if (/\s/g.test(e)) throw new Error("Your key is invalid, as it contains whitespace. For more info, see https://stripe.com/docs/stripe.js");
                if (/^sk_/.test(e)) throw new Error("You are using a secret key with Stripe.js, instead of the publishable one. For more info, see https://stripe.com/docs/stripe.js")
            }, t
        }()
    }.call(this),
    function() {
        var e = [].indexOf || function(e) {
            for (var t = 0, n = this.length; t < n; t++)
                if (t in this && this[t] === e) return t;
            return -1
        };
        this.Stripe.validator = {
            "boolean": function(e, t) {
                if (t !== "true" && t !== "false") return "Enter a boolean string (true or false)"
            },
            integer: function(e, t) {
                if (!/^\d+$/.test(t)) return "Enter an integer"
            },
            positive: function(e, t) {
                if (!(!this.integer(e, t) && parseInt(t, 10) > 0)) return "Enter a positive value"
            },
            range: function(t, n) {
                var r;
                if (r = parseInt(n, 10), e.call(t, r) < 0) return "Needs to be between " + t[0] + " and " + t[t.length - 1]
            },
            required: function(e, t) {
                if (e && (t == null || t === "")) return "Required"
            },
            year: function(e, t) {
                if (!/^\d{4}$/.test(t)) return "Enter a 4-digit year"
            },
            birthYear: function(e, t) {
                var n;
                n = this.year(e, t);
                if (n) return n;
                if (parseInt(t, 10) > 2e3) return "You must be over 18";
                if (parseInt(t, 10) < 1900) return "Enter your birth year"
            },
            month: function(e, t) {
                if (this.integer(e, t)) return "Please enter a month";
                if (this.range([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], t)) return "Needs to be between 1 and 12"
            },
            choices: function(t, n) {
                if (e.call(t, n) < 0) return "Not an acceptable value for this field"
            },
            email: function(e, t) {
                if (!/^[^@<\s>]+@[^@<\s>]+$/.test(t)) return "That doesn't look like an email address"
            },
            url: function(e, t) {
                if (!/^https?:\/\/.+\..+/.test(t)) return "Not a valid url"
            },
            usTaxID: function(e, t) {
                if (!/^\d{2}-?\d{1}-?\d{2}-?\d{4}$/.test(t)) return "Not a valid tax ID"
            },
            ein: function(e, t) {
                if (!/^\d{2}-?\d{7}$/.test(t)) return "Not a valid EIN"
            },
            ssnLast4: function(e, t) {
                if (!/^\d{4}$/.test(t)) return "Not a valid last 4 digits for an SSN"
            },
            ownerPersonalID: function(e, t) {
                var n;
                n = function() {
                    switch (e) {
                        case "CA":
                            return /^\d{3}-?\d{3}-?\d{3}$/.test(t);
                        case "US":
                            return !0
                    }
                }();
                if (!n) return "Not a valid ID"
            },
            bizTaxID: function(e, t) {
                var n, r, i, s, o, u, a, f;
                u = {
                    CA: ["Tax ID", [/^\d{9}$/]],
                    US: ["EIN", [/^\d{2}-?\d{7}$/]]
                }, o = u[e];
                if (o != null) {
                    n = o[0], s = o[1], r = !1;
                    for (a = 0, f = s.length; a < f; a++) {
                        i = s[a];
                        if (i.test(t)) {
                            r = !0;
                            break
                        }
                    }
                    if (!r) return "Not a valid " + n
                }
            },
            zip: function(e, t) {
                var n;
                n = function() {
                    switch (e.toUpperCase()) {
                        case "CA":
                            return /^[\d\w]{6}$/.test(t != null ? t.replace(/\s+/g, "") : void 0);
                        case "US":
                            return /^\d{5}$/.test(t) || /^\d{9}$/.test(t)
                    }
                }();
                if (!n) return "Not a valid zip"
            },
            bankAccountNumber: function(e, t) {
                if (!/^\d{1,17}$/.test(t)) return "Invalid bank account number"
            },
            usRoutingNumber: function(e) {
                var t, n, r, i, s, o, u;
                if (!/^\d{9}$/.test(e)) return "Routing number must have 9 digits";
                s = 0;
                for (t = o = 0, u = e.length - 1; o <= u; t = o += 3) n = parseInt(e.charAt(t), 10) * 3, r = parseInt(e.charAt(t + 1), 10) * 7, i = parseInt(e.charAt(t + 2), 10), s += n + r + i;
                if (s === 0 || s % 10 !== 0) return "Invalid routing number"
            },
            caRoutingNumber: function(e) {
                if (!/^\d{5}\-\d{3}$/.test(e)) return "Invalid transit number"
            },
            routingNumber: function(e, t) {
                switch (e.toUpperCase()) {
                    case "CA":
                        return this.caRoutingNumber(t);
                    case "US":
                        return this.usRoutingNumber(t)
                }
            },
            phoneNumber: function(e, t) {
                var n;
                n = t.replace(/[^0-9]/g, "");
                if (n.length !== 10) return "Invalid phone number"
            },
            bizDBA: function(e, t) {
                if (!/^.{1,23}$/.test(t)) return "Statement descriptors can only have up to 23 characters"
            },
            nameLength: function(e, t) {
                if (t.length === 1) return "Names need to be longer than one character"
            }
        }
    }.call(this);

// Alias Stripe for node compatibility
this.Schema.Stripe = this.Stripe;

/**
 * Aliases for compatibility between Stripe v1 and v2
 */
this.Stripe.createToken = function() {
    return this.card.createToken.apply(arguments);
};
this.Stripe.cardType = function() {
    return this.card.cardType.apply(arguments);
};
this.Stripe.validateCardNumber = function() {
    return this.card.validateCardNumber.apply(arguments);
};
this.Stripe.validateExpiry = function() {
    return this.card.validateExpiry.apply(arguments);
};
this.Stripe.validateCVC = function() {
    return this.card.validateCVC.apply(arguments);
};

// Exports
if (typeof module !== 'undefined') {
    module.exports = this.Schema;
}

}).call(this);


/**
 * Utils
 */
(function() {

var Promise = this.Promise;

/**
 * Static utils
 */
var util = this.Schema.util = {};

/**
 * Inheritance helper
 *
 * @param  object baseObj
 * @param  object superObj
 */
util.inherits = function(baseObj, superObj) {
    baseObj._base = superObj;
    var tempObj = function(){};
    tempObj.prototype = superObj.prototype;
    baseObj.prototype = new tempObj();
    baseObj.prototype.constructor = baseObj;
};

/**
 * Inspect a variable and output to console
 */
util.inspect = function(arg, options) {
	if (require !== undefined) {
		// NodeJS
		return require('util').inspect(arg, options);
	} else {
		// Browser
		return console.log(arg);
	}
};

// Exports
if (typeof exports !== 'undefined') {
    exports.util = this.Schema.util;
}

}).call(this);
/**
 * Resource
 */
(function() {

var util = this.Schema.util;

/**
 * Resource constructor
 *
 * @param  string url
 * @param  mixed result
 * @param  Client client
 */
var Resource = this.Schema.Resource = function(url, result, client) {

    this.__url = url;
    this.__client = client;
    this.__data = null;

    if (result) {
        if (result.$links) {
            this.$links = Resource.$links[url] = result.$links;
        } else if (Resource.$links[url]) {
            this.$links = Resource.$links[url];
        }
        if (result.$data) {
            this.__initData(result.$data);
        }
    }
};

/**
 * Resource links by url
 * @var object
 */
Resource.$links = {};

/**
 * Initialize resource data
 *
 * @param  object data
 */
Resource.prototype.__initData = function(data) {

    if (!data || typeof data !== 'object') {
        return;
    }
    this.__data = data;
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!data.hasOwnProperty(key)) {
            continue;
        }
        this[key] = data[key];
    }
};

/**
 * Get raw resource data
 *
 * @return object
 */
Resource.prototype.toObject = function() {

    var data = {};
    if (this.__data) {
        var keys = Object.keys(this.__data);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            data[key] = this.__data[key];
        }
    }
    return data;
};

/**
 * Get raw resource data
 *
 * @return object
 */
Resource.prototype.toJSON = function() {

    return JSON.stringify(this.toObject());
};

/**
 * Resource as a string representing request url
 *
 * @return string
 */
Resource.prototype.toString = function() {

    return this.__url;
};

/**
 * Resource as inspected
 *
 * @return object
 */
Resource.prototype.inspect = function(depth) {

    var props = this.toObject();
    if (this.$links) {
        props.$links = this.$links;
    }
    return util.inspect(props, {depth: depth, colors: true});
};


// Exports
if (typeof exports !== 'undefined') {
    exports.Resource = this.Schema.Resource;
}

}).call(this);

/**
 * Record
 */
(function() {

var util = this.Schema.util;
var Resource = this.Schema.Resource;

/**
 * Record constructor
 *
 * @param  string url
 * @param  mixed result
 * @param  Client client
 * @param  Collection Collection
 */
var Record = this.Schema.Record = function(url, result, client, collection) {

    Resource.call(this, url, result, client);

    if (this.$links) {
        this.__initLinks(this.$links);
    }

    this.collection = collection;
};

util.inherits(Record, Resource);

/**
 * Initialize record links
 *
 * @param  links
 */
Record.prototype.__initLinks = function(links) {

    var self = this;
    this.__forEachLink(links, function(link, key, res, path) {
        var url = self.__linkUrl(path);
        // expanded?
        if (res[key]) {
            return;
        }
        // record.link(...)
        res[key] = function(callback) {
            if (typeof callback !== 'function') return;
            res.__client.get(url, null, callback);
            return this;
        };
        if (res[key] === undefined) {
          return;
        }
        // record.link.each(...)
        res[key].each = function(callback, then) {
            if (typeof callback !== 'function') return;
            res[key](function(result) {
                if (result && result.results) {
                    for (var i = 0; i < result.results.length; i++) {
                        callback(result.results[i]);
                    }
                } else {
                    callback(result);
                }
                if (typeof then === 'function') {
                    then(result);
                }
            });
        };
        // record.link.get(...)
        res[key].get = self.__linkRequest.bind(self, 'get', url);
        // record.link.put(...)
        res[key].put = self.__linkRequest.bind(self, 'put', url);
        // record.link.post(...)
        res[key].post = self.__linkRequest.bind(self, 'post', url);
        // record.link.delete(...)
        res[key].post = self.__linkRequest.bind(self, 'delete', url);
        // api.put(record.link, ...)
        res[key].toString = function() {
            return url;
        };
    });
};

/**
 * Iterate over link fields
 *
 * @param  function callback (link, key, res)
 */
Record.prototype.__forEachLink = function(links, res, path, callback) {

    if (typeof res === 'function') {
        callback = res;
        res = this;
        path = '';
    } else if (typeof path === 'function') {
        callback = path;
        path = '';
    }
    if (!res) {
        return;
    }
    var keys = Object.keys(links);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var link = links[key];
        var keyPath = path+'/'+key;
        if (link.url) {
            callback(link, key, res, keyPath);
        }
        if (link.links) {
            if (link.links['*']) {
                if (!(res[key] instanceof Array)) continue;
                for (var j = 0; j < res[key].length; j++) {
                    if (!res[key][j]) continue;
                    keyPath += '/'+(res[key][j].id || j);
                    this.__forEachLink(link.links['*'], res[key][j], keyPath, callback);
                }
            } else {
                this.__forEachLink(link.links, res[key], keyPath, callback);
            }
        }
    }
};

/**
 * Build a link url for client request
 *
 * @param  string field
 * @return string
 */
Record.prototype.__linkRequest = function(method, url, relUrl, relData, callback) {

    if (typeof relUrl === 'function') {
        callback = relUrl;
        relUrl = null;
    } else if (typeof relData === 'function') {
        callback = relData;
        relData = null;
    }
    if (typeof relUrl === 'object') {
        relData = relUrl;
        relUrl = null;
        if (typeof relData === 'function') {
            callback = relData;
            relData = null;
        }
    }
    if (typeof callback !== 'function') return;
    if (relUrl) {
        url = url + '/' + relUrl.replace(/^\//, '');
    }
    return this.__client[method](url, relData, callback);
};

/**
 * Build a link url for client request
 *
 * @param  string field
 * @return string
 */
Record.prototype.__linkUrl = function(path) {

    var url = this.__url;
    var qpos = this.__url.indexOf('?');
    if (qpos !== -1) {
        url = url.substring(0, qpos);
    }
    return url.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
};

/**
 * Record as inspected
 *
 * @return object
 */
Record.prototype.inspect = function(depth) {

    var props = this.toObject();
    if (this.$links) {
        if (!this.collection) {
            props.$links = this.$links;
        }
    }
    return util.inspect(props, {depth: depth, colors: true});
};

// Exports
if (typeof exports !== 'undefined') {
    exports.Record = this.Schema.Record;
}

}).call(this);
/**
 * Collection
 */
(function() {

var util = this.Schema.util;
var Resource = this.Schema.Resource;
var Record = this.Schema.Record;

/**
 * Collection constructor
 *
 * @param  string url
 * @param  object result
 * @param  Client client
 */
var Collection = this.Schema.Collection = function(url, result, client) {

    this.count = 0;
    this.page = 0;
    this.pages = {};
    this.length = 0;

    if (result && result.$data) {
        this.count = result.$data.count;
        this.page = result.$data.page;
        this.pages = result.$data.pages || {};
        this.length = result.$data.results ? result.$data.results.length : 0;
    }

    result.$data = result.$data.results;
    result = this.__buildRecords(url, result, client);

    Resource.call(this, url, result, client);

    this.results = [];
    for (var i = 0; i < this.length; i++) {
        this.results[i] = this[i];
    }
};

util.inherits(Collection, Resource);

/**
 * Build collection result data into Record resources
 *
 * @param  string url
 * @param  object result
 * @param  Client client
 * @return array
 */
Collection.prototype.__buildRecords = function(url, result, client) {

    if (!(result.$data instanceof Array)) {
        return null;
    }

    var parentUrl = url;
    var qpos = url.indexOf('?');
    if (qpos !== -1) {
        url = url.substring(0, qpos);
    }

    url = '/' + url.replace(/^\//, '').replace(/\/$/, '');
    for (var i = 0; i < result.$data.length; i++) {
        var record = result.$data[i];
        var recordUrl = url + '/' + record.id;
        result.$data[i] = new Record(
            recordUrl,
            {$data: record, $links: result.$links},
            client,
            this
        );
    }

    return result;
};

/**
 * Iterate over results array style
 *
 * @param  function callback
 */
Collection.prototype.each = function(callback) {

    for (var i = 0; i < this.length; i++) {
        callback.call(this, this[i]);
    }
};

/**
 * Get raw collection data
 *
 * @return object
 */
Collection.prototype.toObject = function() {

    var results = [];
    if (this.results) {
        for (var i = 0; i < this.results.length; i++) {
            results[i] = this.results[i].toObject();
        }
    }
    return {
        count: this.count,
        results: results,
        page: this.page,
        pages: this.pages
    };
};

/**
 * Collection as inspected
 *
 * @return object
 */
Collection.prototype.inspect = function(depth) {

    var props = this.toObject();
    if (this.$links) {
        props.$links = this.$links;
    }
    return util.inspect(props, {depth: depth, colors: true});
};

// Exports for Node
if (typeof exports !== 'undefined') {
    exports.Collection = this.Schema.Collection;
}

}).call(this);
/**
 * Schema API Client for JS
 */
(function() {

// Not relevant for Node
if (typeof module !== 'undefined' && module.exports) {
    return;
}

var util = this.Schema.util;

/**
 * @param  string clientId
 * @param  string publicKey
 * @param  object options
 */
var Client = this.Schema.Client = function(publicKey, options) {

    if (typeof publicKey === 'object') {
        options = publicKey;
        publicKey = undefined;
    } else {
        options = options || {};
    }
    this.options = {
        publicKey: publicKey || options.publicKey || this.Schema.publicKey,
        hostUrl: options.hostUrl || this.Schema.publicUrl,
        timeout: options.timeout || 15000,
        version: options.version,
        session: options.session,
        api: options.api
    };
};

/**
 * Execute a client request using JSONP
 *
 * @param  string method
 * @param  string url
 * @param  mixed data
 * @param  function callback
 */
Client.prototype.request = function(method, url, data, callback) {

    if (typeof data === 'function') {
        callback = data;
        data = null;
    }

    // TODO: implement $cached

    var requestId = Client.generateRequestId();

    url = url && url.toString ? url.toString() : '';
    data = {
        $jsonp: {
            method: method,
            callback: 'Schema.Client.response'+requestId,
        },
        $data: data,
        $key: this.options.publicKey
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = this.options.hostUrl
        + '/' + url.replace(/^\//, '')
        + '?' + Client.serializeData(data);

    var self = this;
    var errorTimeout = setTimeout(function() {
        Schema.Client['response'+requestId]({
            $error: 'Request timed out after '+(self.options.timeout/1000)+' seconds',
            $status: 500
        });
    }, self.options.timeout);

    Schema.Client['response'+requestId] = function(response) {
        clearTimeout(errorTimeout);
        self.response(method, url, response, callback);
        delete Schema.Client['response'+requestId];
        script.parentNode.removeChild(script);
    };

    document.getElementsByTagName("head")[0].appendChild(script);
};

/**
 * Client response handler
 *
 * @param  string method
 * @param  string url
 * @param  mixed result
 * @param  function callback
 */
Client.prototype.response = function(method, url, result, callback) {

    var actualResult = null;

    if (result
    && result.$data
    && (typeof result.$data === 'object')) {
        actualResult = Client.createResource(result.$url, result, this);
    } else {
        actualResult = result.$data;
    }
    return callback && callback.call(this, actualResult, result);
};

/**
 * GET a resource
 *
 * @param  string url
 * @param  mixed data
 * @param  function callback
 */
Client.prototype.get = function(url, data, callback) {
    return this.request('get', url, data, callback);
};

/**
 * PUT a resource
 *
 * @param  string url
 * @param  mixed data
 * @param  function callback
 */
Client.prototype.put = function(url, data, callback) {
    return this.request('put', url, data, callback);
};

/**
 * POST a resource
 *
 * @param  string url
 * @param  mixed data
 * @param  function callback
 */
Client.prototype.post = function(url, data, callback) {
    return this.request('post', url, data, callback);
};

/**
 * DELETE a resource
 *
 * @param  string url
 * @param  mixed data
 * @param  function callback
 */
Client.prototype.delete = function(url, data, callback) {
    return this.request('delete', url, data, callback);
};

/**
 * Generate a unique request ID for response callbacks
 *
 * @return number
 */
Client.generateRequestId = function() {

    window.__schema_client_request_id = window.__schema_client_request_id || 0;
    window.__schema_client_request_id++;
    return window.__schema_client_request_id;
};

/**
 * Serialize data into a query string
 * Mostly copied from jQuery.param
 *
 * @param  mixed data
 * @return string
 */
Client.serializeData = function(data) {

    var key;
    var s = [];
    var add = function(key, value) {
        // If value is a function, invoke it and return its value
        if (typeof value === 'function') {
            value = value();
        } else if (value == null) {
            value = '';
        }
        s[s.length] = encodeURIComponent(key) + '=' + encodeURIComponent(value);
    };
    for (key in data) {
        buildParams(key, data[key], add);
    }
    return s.join('&').replace(' ', '+');
};
var rbracket = /\[\]$/;
function buildParams(key, obj, add) {
    var name;
    if (obj instanceof Array) {
        for (var i = 0; i < obj.length; i++) {
            if (rbracket.test(key) ) {
                // Treat each array item as a scalar.
                add(key, v);
            } else {
                // Item is non-scalar (array or object), encode its numeric index.
                buildParams(
                    key + '[' + (typeof v === 'object' && v != null ? i : '') + ']',
                    v,
                    add
                );
            }
        }
    } else if (obj && typeof obj === 'object') {
        // Serialize object item.
        for (name in obj) {
            buildParams(key + '[' + name + ']', obj[name], add);
        }
    } else {
        // Serialize scalar item.
        add(key, obj);
    }
}

/**
 * Client create/init helper
 *
 * @param  string publicKey
 * @param  object options
 * @return Client
 */
Client.create = function(publicKey, options) {
    return new Client(publicKey, options);
};

/**
 * Create a resource from result data
 *
 * @param  string url
 * @param  mixed result
 * @param  Client client
 * @return Resource
 */
Client.createResource = function(url, result, client) {
    if (result && result.$data && 'count' in result.$data && result.$data.results) {
        return new Schema.Collection(url, result, client);
    }
    return new Schema.Record(url, result, client);
};

}).call(this);


/**
 * Form
 */
(function() {

var Schema = this.Schema;
var Form = Schema.Form = Schema.form = {};

/**
 * Validate and tokenize card data for payment forms
 *
 * @param  object params
 *  string publicKey (Required)
 *      - Public/publishable key for tokenization
 *  HTMLFormElement form (Optional) (Default: first form element)
 *      - Represents the form to capture data
 *  string name (Optional) (Default: 'card')
 *      - Name of the card submission parameter
 *      - Id of the payment gateway to use for tokenization
 *  function onError (Optional)
 *      - Handler for card errors triggered on submit
 */
Form.onSubmitCard = function(params) {

    Form._validateCardParams(params);

    Form._addEventListener(params.form, 'submit', Form._onSubmitCard.bind(this, params));

};

/**
 * Handle card form submission event
 */
Form._onSubmitCard = function(params, event) {

    // Card expiry is { month: 00, year: 0000 }
    var cardExpiry;
    if (params.fields.cardExp) {
        cardExpiry = Schema.cardExpiry(params.fields.cardExp.value);
    } else {
        cardExpiry = {
            month: params.fields.cardExpMonth.value,
            year: params.fields.cardExpYear.value
        };
    }

    // Assemble card info
    var data = {
        number: params.fields.cardNumber.value,
        cvc: params.fields.cardCVC.value,
        exp_month: cardExpiry.month,
        exp_year: cardExpiry.year,
        billing: {}
    };
    // Billing info is optional
    if (params.fields.billing) {
        data.billing = {
            name: params.fields.billingName && params.fields.billingName.value,
            address1: params.fields.billingAddress1 && params.fields.billingAddress1.value,
            address2: params.fields.billingAddress2 && params.fields.billingAddress2.value,
            city: params.fields.billingCity && params.fields.billingCity.value,
            state: params.fields.billingState && params.fields.billingState.value,
            zip: params.fields.billingZip && params.fields.billingZip.value,
            country: params.fields.billingCountry && params.fields.billingCountry.value
        }
    };

    // Trigger submit handler
    if (typeof params.onSubmit === 'function') {
        // Return false to prevent default
        if (params.onSubmit(data) === false) {
            return;
        }
    }

    // Card values are serialized and validated on change
    var dataSerialized = JSON.stringify(data);

    // Return if card data is not changed
    if (params.form.__cardData === dataSerialized) {
        return;
    }

    // Prevent form submission
    Form._preventDefault(event);

    // Validate card data
    var fieldsValid = true;
    if (!Schema.validateCVC(data.cvc)) {
        fieldsValid = false;
        Form._triggerFieldError(
            params.onError, params.fields.cardCVC, ''
        );
    }
    if (!Schema.validateExpiry(data.exp_month, data.exp_year)) {
        fieldsValid = false;
        if (params.fields.cardExp) {
            Form._triggerFieldError(
                params.onError, params.fields.cardExp, ''
            );
        }
        if (params.fields.cardExpMonth) {
            Form._triggerFieldError(
                params.onError, params.fields.cardExpMonth, ''
            );
        }
        if (params.fields.cardExpYear) {
            Form._triggerFieldError(
                params.onError, params.fields.cardExpYear, ''
            );
        }
    }
    if (!Schema.validateCardNumber(data.number) || !data.number) {
        fieldsValid = false;
        Form._triggerFieldError(
            params.onError, params.fields.cardNumber, ''
        );
    }
    if (!fieldsValid) {
        return;
    }

    // Card data is valid, continue to process
    params.form.__cardData = dataSerialized;

    Schema.setPublicKey(params.publicKey);
    Schema.card.createToken(data, function(status, response) {
        if (response.errors) {
            params.form.__cardData = null;
            for (var key in response.errors) {
                var field;
                switch (key) {
                    case 'exp_month': field = params.fields.cardExp || params.fields.cardExpMonth; break;
                    case 'exp_year': field = params.fields.cardExp || params.fields.cardExpYear; break;
                    case 'cvc': field = params.fields.cardCVC; break;
                    case 'number':
                    default:
                        field = params.fields.cardNumber; break;
                }
                Form._triggerFieldError(
                    params.onError, field, response.errors[key].message
                );
            }
        } else if (status > 200) {
            Form._triggerFieldError(
                params.onError, params.fields.cardNumber, 'Unknown gateway error, please try again'
            );
        } else {
            // Clear previous data fields first
            var els = document.getElementsByClassName('x-card-response-data');
            for (var i = 0; i < els.length; i++) {
                els[i].parentNode.removeChild(els[i]);
            }
            // Append card response fields to form
            var fieldName = params.name;
            for (var key in response) {
                if (typeof response[key] === 'object') {
                    continue;
                }
                var el = document.createElement('input');
                el.type = 'hidden';
                el.className = 'x-card-response-data';
                el.name = params.name + '['+key+']';
                el.value = response[key];
                params.form.appendChild(el);
            }
            params.form.submit();
        }
    });
};

/**
 * Make sure params are valid
 *
 * @return object
 */
Form._validateCardParams = function(params) {

    params || {};

    params.publicKey = params.publicKey || Schema.publicKey;
    if (!params.publicKey) {
        throw "Form.onSubmitCard(): publicKey required";
    }

    // Ensure valid form element
    if (!params.form) {
        params.form = Form._findDefaultFormElement();
    } else {
        params.form = Form._sanitizeElement(params.form);
    }
    if (params.form === null) {
        throw "Form.onSubmitCard(): form not found with .card-number field";
    }

    // Get valid card input fields
    var fields = params.fields || {};
    fields.cardNumber = Form._sanitizeElement(fields.cardNumber || '.card-number');
    if (!fields.cardNumber) {
        throw "Form.onSubmitCard(): card number field not found";
    }
    fields.cardExp = Form._sanitizeElement(fields.cardExp || '.card-exp');
    fields.cardExpMonth = Form._sanitizeElement(fields.cardExpMonth || '.card-exp-month');
    if (!fields.cardExp && !fields.cardExpMonth) {
        throw "Form.onSubmitCard(): card expiration field not found";
    }
    fields.cardExpYear = Form._sanitizeElement(fields.cardExpYear || '.card-exp-year');
    if (!fields.cardExp && !fields.cardExpYear) {
        throw "Form.onSubmitCard(): card expiration year field not found";
    }
    fields.cardCVC = Form._sanitizeElement(fields.cardCvc || fields.cardCVC || '.card-cvc');
    if (!fields.cardCVC) {
        throw "Form.onSubmitCard(): card cvc field not found";
    }
    fields.billingName = Form._sanitizeElement(fields.billingName || '.billing-name');
    fields.billingAddress1 = Form._sanitizeElement(fields.billingAddress2 || '.billing-address1');
    fields.billingAddress2 = Form._sanitizeElement(fields.billingAddress2 || '.billing-address2');
    fields.billingCity = Form._sanitizeElement(fields.billingCity || '.billing-city');
    fields.billingState = Form._sanitizeElement(fields.billingState || '.billing-state');
    fields.billingZip = Form._sanitizeElement(fields.billingZip || '.billing-zip');
    fields.billingCountry = Form._sanitizeElement(fields.billingCountry || '.billing-country');
    fields.billing = !!(
        fields.billingName ||
        fields.billingAddress1 ||
        fields.billingAddress2 ||
        fields.billingCity ||
        fields.billingState ||
        fields.billingZip ||
        fields.billingCountry
    );

    params.fields = fields;

    // Default submit parameter name
    params.name = params.name || 'card';
};

/**
 * Get a clean HTMLElement reference
 * May be passed by jQuery, ID, or class name
 *
 * @param  mixed el
 * @return HTMLElement
 */
Form._sanitizeElement = function(el) {

    if (jQuery) {
        // By jQuery reference
        return jQuery(el).get(0);
    } else if (typeof el === 'string') {
        if (el[0] === '.') {
            // By class name
            return document.getElementsByClassName(el.substring(1))[0];
        } else {
            // By ID
            return document.getElementById(el);
        }
    } else if (typeof el === 'object' && el !== null) {
        if (el.toString().indexOf('[object HTML') === 0) {
            // By direct reference
            return el;
        }
    }
    // Not valid
    return null;
}

/**
 * Find the first form element with card-number input
 *
 * @return HTMLFormElement
 */
Form._findDefaultFormElement = function() {

    var field = document.getElementsByClassName('card-number')[0];
    if (field) {
        while (true) {
            if (field = field.parentNode) {
                if (field.tagName === 'FORM') {
                    return field;
                }
            } else {
                break;
            }
        }
    }
    return null;
};

/**
 *
 */
Form._triggerFieldError = function(handler, field, message) {

    if (typeof handler === 'function') {
        return handler(field, message);
    }
    if (field && field.className.indexOf('error') === -1) {
        field.className = field.className + ' error';
    }
};

/**
 * Add a DOM event listener, cross browser
 *
 * @param  HTMLElement el
 * @param  string event
 * @param  function handler
 */
Form._addEventListener = function(el, event, handler) {

    if (el.addEventListener) {
        el.addEventListener(event, handler, false);
    } else {
        el.attachEvent('on' + event, function() {
            // set the this pointer same as addEventListener when fn is called
            return handler.call(el, window.event);   
        });
    }
};

/**
 * Prevent default event behavior, cross browser
 *
 * @param  HTMLEvent event
 */
Form._preventDefault = function(event) {

    if (event.preventDefault) { 
        event.preventDefault();
    } else {
        event.returnValue = false; 
    }
    return;
};

}).call(this);