nyam
=====

nyam is a node.js CLI tool for easy posting and reading of Yammer feeds. 

Installation
------------

With [npm](http://github.com/isaacs/npm):

    npm install nyam

== Setup ==
First you need to get a copy of the app's keys and put it at

    ~/.nyam

Then you need to authenticate with your yammer account:

    nyam setup

And follow the instructions.


== Examples ==

$> nyam feed

$> nyam post "to:yamjsteam team,"

$> echo "#shamehat" | nyam post

$> nyam notifications



For developers
-------------------------------------

  * Fork this project
  * Clone your fork
  * Check out: http://developer.yammer.com/api/
  * Add some code
  * Test!
  * Send pull request

Also check out our issues area for things people are requesting or bugs (not many right now hehe) 

Don't be shy! :-)



