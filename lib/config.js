/**
 * Module dependencies.
 */
var fs = require('fs')
  , path = require('path')
  , _ = require('underscore')

/**
 * Expose constructor.
 */
module.exports = Config;

/**
 * Initialize a new `Config`.
 *
 * @param {Object} conf
 * @api public
 */
function Config(cpath) {
    this.path = cpath || path.join(process.env.HOME, '.nyam')
    var self = this
    
    this.base_url = 'https://www.yammer.com'
    
    if (fs.realpathSync(this.path)){
      this.load()
    }
    
};
/**
 * Save data.
 *
 * @param {Function} fn
 * @api public
 */
Config.prototype.save = function(fn){
  var data = JSON.stringify(this);
  fs.writeFile(this.path, data, fn || function(){});
  return this;
};

/**
 * Load data.
 *
 * @param {Function} fn
 * @api public
 */
Config.prototype.load = function(fn){
  var file = fs.readFileSync(this.path, 'utf8')
    , json = JSON.parse(file)
    , self = this;
    
    _.each(json, function(v,k){
      self[k] = v
    })
    
  return this;
};
