#!/usr/bin/env node

var nyam = require('./nyam')
  , ConfigObj = require('./config')
  , config = new ConfigObj()
  , opts = require('nomnom')
  , colors = require('colors');
  



var needSetup = function(error){
	console.log('Error:\n'.bold)
	console.log(error.data?error.data.red:(error +'').red)
	console.log('\nHave you run "yam setup" ?'.yellow.bold)
	console.log("\nCheck yammer ops:".grey);
	console.log("\t - http://twitter.com/#!/yammerops".grey);
	console.log("\t - http://status.yammer.com/".grey);
  console.log("\nthis could also be a bad authentication tokens, need to re-initialize".grey);
  console.log("\trun: $> yam setup\n".grey);
}


var withKeys = function(func){
  return function(){
    try{
      func.apply(this, arguments)
    } catch (e) {
      needSetup(e);
    }
  }  
}



opts.command('setup')
  .callback(nyam.setup)
  .help("Setup oauth")

opts.command('feed')
  .callback(withKeys(nyam.feed))
  .options({
    'group' : {help : "Filter by group"}
  })
  .help("Get recent messages")

opts.command('post')
  .callback(withKeys(nyam.post_update))
  .help("Send a message")

opts.command('notifications')
  .callback(withKeys(nyam.notifications))
  .help("View outstanding notifications")

opts.command('search')
  .callback(withKeys(nyam.search))
  .help("Search for a term")


opts.parse()