/*! schema.js (Version 1.0.2) 2015-07-22 */

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
    publicKey: null, // Used for standard API calls
    publishableKey: null // Used for card gateway API calls
};

/**
 * Set public key used to identify client in API calls
 *
 * @param  string key
 */
Schema.setPublicKey = function(key) {
    this.publicKey = key;
};

/**
 * Set publishable key for gateway requests (Stripe only)
 *
 * @param  string key
 */
Schema.setPublishableKey = function(key) {
    this.publishableKey = key;
};

/**
 * Schema card methods
 */
Schema.card = {};

/**
 * Create a token from card details
 *
 * @param  object card
 * @param  string gateway
 * @param  function callback
 * @return void
 */
Schema.card.createToken = function(card, gateway, callback) {

    if (typeof gateway === 'function') {
        callback = gateway;
        gateway = 'test_card';
    }

    var error = null;
    if (!card) {
        error = 'Card details are missing';
    }
    if (!Schema.card.validateCardNumber(card.number)) {
        error = 'Card number appears to be invalid';
    }
    if (!Schema.card.validateExpiry(card.exp_month, card.exp_year)) {
        error = 'Card expiry appears to be invalid';
    }
    if (!Schema.card.validateCVC(card.cvc)) {
        error = 'Card CVC code appears to be invalid';
    }
    if (!['test_card', 'stripe'].indexOf(gateway) === -1) {
        error = 'Gateway not yet supported: '+gateway;
    }
    if (error) {
        setTimeout(function() {
            callback(200, {error: error});
        }, 10);
        return;
    }

    if (gateway === 'stripe') {
        var stripeCard = {
            number: card.number,
            cvc: card.cvc,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            name: card.billing.name,
            address_line1: card.billing.address1,
            address_line2: card.billing.address2,
            address_city: card.billing.city,
            address_state: card.billing.state,
            address_zip: card.billing.zip,
            address_country: card.billing.country
        };
        Stripe.setPublishableKey(Schema.publishableKey);
        Stripe.card.createToken(stripeCard, function(status, response) {
            if (response.error || status != 200) {
                callback(status, response);
                return;
            }
            var response2 = {
                card: {
                    token: response.id,
                    brand: response.card.brand,
                    last4: card.number.substring(-4, 4),
                    gateway: gateway,
                    exp_month: card.exp_month,
                    exp_year: card.exp_year
                    // TODO: return fingerprint?
                }
            };
            if (!response.livemode) {
                response2.card.test = true;
            }
            callback(status, response2);
        });
    } else {
        // TODO: integrate with card vault
        setTimeout(function() {
            callback(200, {
                card: {
                    // Note: just for testing
                    token: 'test_card_token_'+(new Date().getTime()),
                    brand: 'Visa',
                    last4: card.number.substring(-4, 4),
                    gateway: 'test_card',
                    exp_month: card.exp_month,
                    exp_year: card.exp_year,
                    test: true
                }
            });
        }, 1000);
    }
};
Schema.createToken = function() {
    return Schema.card.createToken.apply(this, arguments);
};

/**
 * Determine card type
 */
Schema.card.cardType = function() {
    return Stripe.card.cardType.apply(Stripe, arguments);
};
Schema.cardType = function() {
    return Schema.card.cardType.apply(this, arguments);
};

/**
 * Validate card number
 */
Schema.card.validateCardNumber = function() {
    return Stripe.card.validateCardNumber.apply(Stripe, arguments);
};
Schema.validateCardNumber = function() {
    return Schema.card.validateCardNumber.apply(this, arguments);
};

/**
 * Validate card expiry
 */
Schema.card.validateExpiry = function() {
    return Stripe.card.validateExpiry.apply(Stripe, arguments);
};
Schema.validateExpiry = function() {
    return Schema.card.validateExpiry.apply(this, arguments);
};

/**
 * Validate card CVC code
 */
Schema.card.validateCVC = function() {
    return Stripe.card.validateCVC.apply(Stripe, arguments);
};
Schema.validateCVC = function() {
    return Schema.card.validateCVC.apply(this, arguments);
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
util.inspect = function(arg) {
	if (require !== undefined) {
		// NodeJS
		return require('util').inspect(arg);
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
Resource.prototype.inspect = function() {

    var props = this.toObject();
    if (this.$links) {
        props.$links = this.$links;
    }
    return util.inspect(props);
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
    for (var key in links) {
        if (!links.hasOwnProperty(key)) {
            continue;
        }
        (function(res, key) {
            var url = res.__linkUrl(key);
            // record.link(...)
            res[key] = function(callback) {
                if (typeof callback !== 'function') return;
                res.__client.get(url, null, callback);
                return this;
            };
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
        }(this, key));
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
Record.prototype.__linkUrl = function(field) {

    var url = this.__url;
    var qpos = this.__url.indexOf('?');
    if (qpos !== -1) {
        url = url.substring(0, qpos);
    }
    return url.replace(/\/$/, '') + '/' + field;
};

/**
 * Record as inspected
 *
 * @return object
 */
Record.prototype.inspect = function() {

    var props = this.toObject();
    if (this.$links) {
        if (!this.collection) {
            props.$links = this.$links;
        }
    }
    return util.inspect(props);
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
Collection.prototype.inspect = function() {

    var props = this.toObject();
    if (this.$links) {
        props.$links = this.$links;
    }
    return util.inspect(props);
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
var Client = this.Schema.Client = function(clientId, publicKey, options) {

    if (typeof publicKey === 'object') {
        options = publicKey;
        publicKey = clientId;
    } else if (typeof clientId === 'object') {
        options = clientId;
        clientId = undefined;
    }
    this.options = {
        clientId: clientId || options.clientId,
        publicKey: publicKey || options.publicKey || this.Schema.publicKey,
        apiUrl: options.apiUrl || 'https://api.schema.io',
        vaultUrl: options.vaultUrl || 'https://vault.schema.io',
        verifyCert: options.verifyCert || true,
        version: options.version || 1
    };
};

}).call(this);

