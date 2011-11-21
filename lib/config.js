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
    
    
    if (fs.realpathSync(this.path)){
      this.load()
    }
    
    
    /*
    var core_config_exits = true
    , override = false
    , config
    , keys;

    // handle core config
    utils.file_exists(false,PATH_CONFIG, function(success, file, err){
        if(success) config = file; 
        else core_config_exits = false
    });

    // handle keys override 
    utils.file_exists(false,process.env.HOME + '/.nyam_keys', function(success, file, err){
        if(success){
          keys = file;
          override = true;
        } else {
          keys = JSON.parse(fs.readFileSync(PATH_KEYS,"utf8"));}
    });

    // consumer keys
    this.app_consumer_key = 
    (core_config_exits && !override) ? config.app_consumer_key : 
    this.app_consumer_key || keys.app_consumer_key;
    // consumer secret
    this.app_consumer_secret = 
        (core_config_exits && !override) ? config.app_consumer_secret : 
        this.app_consumer_secret || keys.app_consumer_secret;

    // access token
    this.oauth_access_token = 
        (core_config_exits) ? config.oauth_access_token : 
        this.oauth_access_token || "";

    // token secret
    this.oauth_token_secret = 
        (core_config_exits) ? config.oauth_token_secret : 
        this.oauth_token_secret || "";

    this.base_url = keys.base_url || 'https://www.yammer.com';

    this.override_status = (override) ? '\n[ Using override config at ~/.nyam_keys'.blue +' ]'.blue : '\n[ Using default keys config at '.blue + PATH_KEYS.blue + ' - to override see Readme ]'.blue;
    this.path = PATH_CONFIG;
    */
    
    
};
/**
 * Save data.
 *
 * @param {Function} fn
 * @api public
 */
Config.prototype.save = function(fn){
  var data = JSON.stringify(this);
  console.log("!!", data)
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
