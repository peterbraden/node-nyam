var fs = require('fs')
    , sys = require('sys')
    , _ = require('underscore')
    , sys= require('sys')
    , OAuth = require('oauth').OAuth
    , ConfigObj = require('./config')
    , config = new ConfigObj()
    , nyam = require('./nyam')
    , colors = require('colors');
 

var oa = new OAuth(
    config.base_url+'/oauth/request_token',
    config.base_url+'/oauth/access_token',
    config.app_consumer_key,
    config.app_consumer_secret,
    '2.0',null,'HMAC-SHA1'
);


// Wrap text to a certain length with optional indent
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
      
      var group = list[i].group?(list[i].group.full_name + '> ').red : ''
      
      sys.puts('\n'+ indent_str + group + list[i].from.full_name.blue + " : " +
         ("" + new Date(list[i].created_at)).grey 
         + "\n" + wrap(list[i].body.plain, 50, indent_str).green);
      
      if (list[i].replies)   
        view_yams(list[i].replies, 5)
    }
  } else {
    if (!indent)
      sys.puts("-- No New Messages --".yellow)
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

var apiReq = function(method, endpoint, payload, cb){
  var wcb = function(err, resp){
    if (err){
      return console.log("Error:".red, err)
    }
    if (cb) cb(resp)
  }

  if (!config.oauth_access_token) {
    throw "No Auth Token"
  }

  return oa[method](config.base_url + endpoint
    ,config.oauth_access_token
    , config.oauth_token_secret
    , (method == 'get')? wcb : payload
    , method == 'post' ? wcb : undefined)
}

/**
 * Setup yammer
 *
 * @param {Pointer} callback
 * @api public
 */
exports.setup = function(opts, callback){
  oa.getOAuthRequestToken(
    function(error, oauth_token, oauth_token_secret, results){
      if(error)  
        return console.log("OAuth Setup Error:", error)
        
      sys.puts('\nWe need to authenticate with your yammer account.\n'.green.bold);
      sys.puts('\nNavigate to: '.green + (config.base_url + '/oauth/authorize?oauth_token='+ oauth_token).yellow.bold + '\n');
      return input("Enter authorization code: ".green, function(oauth_verifier){
        oa.getOAuthAccessToken(
        oauth_token, 
        oauth_token_secret, 
        oauth_verifier,
        function(error, oauth_access_token, oauth_access_token_secret, results2) {
          if(error){
            return console.log("OAuth Setup Error (2): ", error)
          }
          config.oauth_access_token = oauth_access_token;
          config.oauth_token_secret = oauth_access_token_secret;
          config.save();

          sys.puts('\nYay! it worked...\n'.green.bold)  
        });
      });
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
  // Message is all positional args, or stdin
  var message = opts._.slice(1).join(' ') || fs.readFileSync('/dev/stdin').toString()
    , data = {body: message}
    
  apiReq('post', '/api/v1/messages.json?access_token=' + config.oauth_access_token, data, callback);
}


exports.postActivity = function(opts, callback){
  // Message is all positional args, or stdin
  var message = opts._.slice(1).join(' ') || fs.readFileSync('/dev/stdin').toString()
    , data = {type: "text", text: message}
    
  apiReq('post', '/api/v1/streams/activities.json?access_token=' + config.oauth_access_token, data, callback);
}


var processResults = function(json){
  var feed = JSON.parse(json)
    , refs = feed.references
    , user_information = {}
    , groups = {}
    , max_id = 0
  
  for (var i in refs) {
      if(refs[i].type=='user' && refs[i].id) {
          user_information[refs[i].id] = refs[i];
      }
      
      if (refs[i].type=='group' && refs[i].id){
        groups[refs[i].id] = refs[i]
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
      
      if (result.group_id)
        result.group = groups[result.group_id]
  }
  
  _.each(feed.threaded_extended, function(v, k){
    v = v && v[0]
    v.from = user_information[v.sender_id];
    if (id_to_m[v.thread_id]){
      id_to_m[v.thread_id].replies.push(v)
    }
  })
  
  config.newer_than = feed.meta.last_seen_message_id
  config.save()
  
  view_yams(r.reverse());
}


/**
 * Get latest yams
 *
 * @param {Pointer} callback
 * @api public
 */
exports.feed = function(opts, callback){	
    var endpoint = '/api/v1/messages/algo.json'
    
    if (opts.group)
      endpoint = '/api/v1/messages/in_group/' + '.json' //TODO
  
    apiReq('get'
      , '/api/v1/messages/algo.json?newer_than='+ (config.newer_than ||0) + "&threaded=extended"
      , {}
      , processResults)

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
    
    apiReq('get', '/api/v1/search.json?search='+keyword+'&num_per_page=2',
      function(json) {
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

exports.placeholderRegex = /\[\[([a-z]*)\:([0-9]*)\]\]/gi

exports.notifications = function(opts){
  apiReq('get','/api/v1/streams/notifications.json?mark_seen=true&count=20',{}, function(res){
    var json = JSON.parse(res)
      , items = json.items
      , refs = {}
      , unseenitems = []

    _.each(items, function(i){
      if (i.unseen) unseenitems.push(i)})
    items = unseenitems 
     
    _.each(json.references, function(i){
      refs[i.type+'-' + i.id] = i
    })
    
    _.each(json.objects, function(i,k){
      _.each(i, function(j){ 
        refs[k+'-' + j.id] = j
      })
    })
    
    if (!items.length){
      return console.log("No unread notifications".yellow)
    } 
     
    for (var i=0; i<items.length; i++){
      items[i].message = items[i].message.replace(exports.placeholderRegex, function(match, t,i){
        if (refs[t+'-'+i])
          return refs[t+'-'+i].full_name
        else return "?"  
      })

      console.log(items[i].message.red)
      _.each(items[i].objects, function(o){
        var x = refs[o.type+'-' + o.id]
        if (x){
          if (o.type == 'message')
            console.log(wrap(x.body.plain, 50, '   ').yellow)
        }
      })  
    }
     
  })
  
}

