
var fs = require('fs')
    , sys = require('sys')
    , _ = require('underscore')
    , path = require('path')
    , querystring = require('querystring')
    , url = require('url')
    , sys= require('sys')
    , OAuth = require('oauth').OAuth
    , ConfigObj = require('./config')
    , config = new ConfigObj()
    , utils = require('./utils')
    , nyam = require('./nyam')
    , colors = require('colors');
 
/**
 * Class variables.
 */
var max_id = 0
    , get_latest
    , config_exists
    , input
    , get_latest_view
    , debug = false
    , is_created = false
    , Settings
    , users = [];

var oa = new OAuth(
    config.base_url+'/oauth/request_token',
    config.base_url+'/oauth/access_token',
    config.app_consumer_key,
    config.app_consumer_secret,
    '1.0',null,'HMAC-SHA1'
);

function User(id,full_name,body){
  this.id = id;
  this.full_name = full_name;
  this.body = body;
}
function Response(err,success,json){
  this.err = err;
  this.success = success;
  this.json = json;
}


var wrap = function(string, cols, indent_str){  
  var segs = string.split(' ')
    , out = ''
    , line = ''
  
  
  
  while(segs.length > 0){
    var x = segs.shift()
    if ((line.length + x.length + 2) < cols){
      line += x + ' '
    } else {
      out += line + '\n'
      line = x + ' '
    }
  }
  out = indent_str + ((out + line).replace(/\n/g, '\n' + indent_str))
  return out  
}

/**
 * View / template
 *
 * @param {Array} list
 * @param {String} title
 * @param {Pointer} callback
 * @api private
 */
var view_yams = function(list, indent){
  var indent_str = ''
  for(var i=0;i<indent;i++){indent_str += ' '}
  
  if (list.length) {
    for (var i in list){
      sys.puts('\n'+ indent_str + list[i].from.full_name.blue + " : " +
         ("" + new Date(list[i].created_at)).grey 
         + "\n" + wrap(list[i].body.plain, 50, indent_str).green);
      
      if (list[i].replies)   
        view_yams(list[i].replies, 5)
    }
    sys.puts('\n')
  } else {
    if (indent == 0)
      sys.put("-- No New Messages --")
  } 
}
var view_yam = function(from, body){
  console.log(from.green + ": " + body.grey + '\n');
}



/**
 * Input Utility
 *
 * @param {String} message
 * @param {Pointer} callback
 * @api private
 */
input = function(message, callback){
    var stdin = process.openStdin()
    , stdio = process.binding("stdio")
    , data = "";
    stdio.setRawMode();
    console.log(message);
    stdin.on("data", function (c) {
        c = c + "";
        switch (c) {
            case "\n": case "\r": case "\u0004":
                stdio.setRawMode(false);
                callback(data);
                stdin.pause();
                break
            case "\u0003":
                process.exit();
                break
            default:
                data += c;
                break
        }
    })	
}
/**
 * Setup yammer
 *
 * @param {Pointer} callback
 * @api public
 */
exports.setup = function(verbose, callback){
    oa.getOAuthRequestToken(
        function(error, oauth_token, oauth_token_secret, results){
            if(error) { utils.display_error(error);
            } else {
                if (verbose) console.log('oauth_token :' + oauth_token);
                if (verbose) console.log('oauth_token_secret :' + oauth_token_secret);
                if (verbose) console.log('requestoken results :' + sys.inspect(results));
                console.log('\n:::::: we need to give this CLI tool access to yammer :::::::\n'.green.bold);
                console.log('\nNavigate to: '.green + (config.base_url + '/oauth/authorize?oauth_token=').grey.bold+ oauth_token.grey.bold+'\n');
                return input("Enter authorization code: ".green, function(oauth_verifier){
                    oa.getOAuthAccessToken(
                    oauth_token, 
                    oauth_token_secret, 
                    oauth_verifier,
                    function(error, oauth_access_token, oauth_access_token_secret, results2) {
                        if(error){ utils.display_error(error);
                        } else {
                            config.oauth_access_token = oauth_access_token;
                            config.oauth_token_secret = oauth_access_token_secret;
                            config.save();

                            console.log('\n:::::::: setup complete! now go use nyam!!! :::::::: \n'.green.bold)
                        }
                    });
                });
        }
    });
}
/**
 * Post update
 *
 * @param {String} data
 * @param {Pointer} callback
 * @api public
 */
exports.post_update = function(opts, callback){
  var data = opts
  
  oa.post(config.base_url+'/api/v1/messages.json'
      ,config.oauth_access_token
      , config.oauth_token_secret
      , { body: data }, function(error, data) {
    if (error){
      console.log("Error:" , error)
      return
    } 
    if (callback) callback(data);
  });
}
/**
 * Get latest yams
 *
 * @param {Pointer} callback
 * @api public
 */
exports.get_latest = function(opts, callback){	
    oa.get(config.base_url+'/api/v1/messages/algo.json?newer_than='+ (config.newer_than ||0) + "&threaded=extended",
        config.oauth_access_token,
        config.oauth_token_secret,
        function(err,json) {
            if(err) {
                console.log("ERROR", err)
                return;
            } 
            var feed = JSON.parse(json);
            var references = feed.references;
            var user_information = {};
            for (var i in references) {
                if(references[i].type=='user') {
                    user_information[references[i].id] = references[i];
                }
            }
            var r = []
              , id_to_m = {}
              
            for (var i in feed.messages) {
                var result = feed.messages[i];
                max_id = (result.id > max_id) ? result.id : max_id;
                result.from = user_information[result.sender_id];
                result.replies = []
                r.push(result);
                id_to_m[result.id] = result
            }
            
            _.each(feed.threaded_extended, function(v, k){
              v = v && v[0]
              v.from = user_information[result.sender_id];
              if (id_to_m[v.replied_to_id]){
                id_to_m[v.replied_to_id].replies.push(v)
              }
            })
            
            config.newer_than = feed.meta.last_seen_message_id
            config.save()
            
            console.log('\n::: latest yams ::::\n'.green);
            return view_yams(r.reverse(), callback);
    });	
}
/**
 * Search yams
 *
 * @param {Pointer} callback
 * @param {String} keyword
 * @api public
 */
exports.search = function(opts, callback){	
    var keyword = opts._.slice(1).join(' ')
    
    oa.get(config.base_url+'/api/v1/search.json?search='+keyword+'&num_per_page=2',
        config.oauth_access_token,
        config.oauth_token_secret,
        function(err,json) {
            if(err) {
                callback(err, false);
            } else {
                var messages = [] 
                  , feed = JSON.parse(json)
                  , references = feed.messages.messages
                  , search_results = [];
                for (var i in references) {
                    if(references[i].sender_type=='user') {
                      search_results.push(references[i]);
                    }
                } 
                console.log(('\n::: search results for "' + keyword + '" ::::\n').green);
                for (var item in search_results.reverse()){
                  var result = search_results[item];
                  (function(r){ 
                    oa.get(config.base_url+'/api/v1/users/'+r.sender_id+'.json',
                       config.oauth_access_token,
                       config.oauth_token_secret,
                       function(err,json) {
                           if(err) {
                              console.log(err)
                           } else {
                              var usr = JSON.parse(json);
                              view_yam(usr.full_name,r.body.plain);
                           }
                    });
                  })(result); 
                }
            }
    });	
}
/**
 * Get yam user
 *
 * @param {Boolean} verbose
 * @param {Integer} id
 * @api public
 */
exports.get_user = function(verbose, id, callback){	
  oa.get(config.base_url+'/api/v1/users/'+id+'.json',
      config.oauth_access_token,
      config.oauth_token_secret,
      function(err,json) {
          if(err) {
              callback(err,false,null)
          } else {
              var feed = JSON.parse(json);
              callback(null,true,feed);
          }
  });	
}


