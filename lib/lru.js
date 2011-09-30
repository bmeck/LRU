var util = require('util');
exports.DatabaseLRUCache = DatabaseLRUCache;
exports.LRUCache = LRUCache;

function DatabaseLRUCache(options) {
    options = options || {};
    this.cache = new LRUCache();
    this.database = options.database;
    if(options.interval) {
        this.timer = setInterval(this.refresh.bind(this), options.interval);
    }
    this.refreshid = 0;
}
util.inherits(DatabaseLRUCache, LRUCache);

DatabaseLRUCache.prototype.get = function get(key, callback) {
    var self = this;
    if(self.cache.lastHits[key]) {
        callback && callback(false, self.cache.objects[key]);
        return true;
    }
    else {
        this.database.get(key, callback);
        return false;
    }
}
DatabaseLRUCache.prototype.set = function set(key, value, callback) {
    var self = this;
    self.cache.set(key, value, callback);
    this.database.set(key, value, function onSet(err) {
        if(err) {
          return self.emit('error', err);
        }
    });
}
DatabaseLRUCache.prototype.refresh = function refresh() {
    this.refreshid++;
    var refreshid = this.refreshid;
    var self = this;
    for(var key in this.cache.objects) {
        this.database.get(key, function onGetValue(err, value) {
            //
            // If a new refresh was called after this, don't update, wait on the new one
            //
            if(self.refreshid !== refreshid) {
                return;
            }
            //
            // If the key is still cached update value but do not add a hit
            //
            if(self.cache.objects[key]) {
                self.cache.objects[key] = value;
            }
        });
    }
}

function LRUCache(options) {
    options = options || {};
    this.maxSize = options.maxSize || 1000;
    this.index = 0;
    this.size = 0;
    this.hits = {};
    this.objects = {};
    this.lastHits = {};
    this.onremove = options.onremove;
    this.onadd = options.onadd;
    this.onset = options.onset;
}
util.inherits(LRUCache, EventEmitter);

LRUCache.prototype.set = function set(key, value, callback) {
    this.index++;
    this.hits[this.index] = key;
    if(this.lastHits[key]) {
        delete this.hits[this.lastHits[key]];
    }
    else {
        this.size++;
        this.onadd && this.onadd(key, value);
    }
    if(this.objects[key]) {
        this.onset && this.onset(key, this.objects[key], value);
    }
    this.objects[key] = value;
    this.lastHits[key] = this.index;
    var dead = [];
    while(this.size > this.maxSize) {
        //
        // preservation of numeric order at top lets us do this in 1 iteration
        //
        for(var hit in this.hits) {
            var oldkey = this.hits[hit];
            var oldvalue = this.objects[oldkey];
            delete this.hits[hit];
            dead.push(oldvalue);
            delete this.objects[oldkey];
            delete this.lastHits[oldkey];
            this.size--;
            this.onremove && this.onremove(oldkey, oldvalue);
            break;
        };
    }
    callback && callback(false, dead);
    return true;
}
LRUCache.prototype.get = function get(key, callback) {
    this.index++;
    this.hits[this.index] = key;
    if(this.lastHits[key]) {
        delete this.hits[this.lastHits[key]];
    }
    this.lastHits[key] = this.index;
    callback && callback(false, this.objects[key]);
    return true;
}