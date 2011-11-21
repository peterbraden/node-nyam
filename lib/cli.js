#!/usr/bin/env node

var nyam = require('./nyam')
  , ConfigObj = require('./config')
  , config = new ConfigObj()
  , opts = require('nomnom')
    

opts.command('setup')
  .callback(nyam.setup)
  .help("Setup oauth")

opts.command('feed')
  .callback(nyam.get_latest)
  .options({
    'group' : {help : "Filter by group"}
  })
  .help("Get recent messages")

opts.command('post')
  .callback(nyam.post_update)
  .help("Send a message")

opts.command('search')
  .callback(nyam.search)
  .help("Search for a term")

opts.parse()