Faster.js
=========

Boost Javascript performance

If you've ever spent much time on jsperf.com you quickly notice that the fastest way of doing something in one browser is often not the fastest in another. To make things worse, this often changes not just with the browser, but just with the browser version you are using. The purpose of Faster.js is to resolve this by overriding native functions where possible to implement the fastest method of doing things for every platform (Node.js included).

This does not exclude the possibility of implementing performant versions of common operations that are not found in native functions and in fact, I would hope that the project encompasses many such functions in the future.

I would like to keep the core of Faster.js limited to functions that already exist in Javascript and keep all extra functions in separate libraries that can be optionally included. There will likely be an extra file included with this repo that includes a lot of useful common functions that people use.

This goes really well with other libraries, like Underscore, that try to use native versions of functions where they're available. Underscore will try to use the native versions of functions and if Faster.js has defined those native versions then they will be called by everything, thus making things faster!

Usage
-----

On your website
```html
<script type="text/javascript" src="faster.mins.js"></script>
```

Node.js
```
npm install faster
```

```js
require('faster');
```

That's it! Faster.js will now go through and replace countless functions with a version of the function that works fastest on whatever platform you are on. It will also add extra functionality to platforms that may be missing functions that Faster.js provides.

Complete Documentation
----------------------

[Faster.js API](doc/fasterjs-api.md)  
[Developing function maps](doc/function-maps.md)  
[Developing Faster.js core](doc/developing-fjs.md)  

Contribute
----------

Maintaining the platform and version to function mappings is a monumental task and any help is appreciated. More importantly, Faster.js is in its early stages and needs as many useful function maps as possible contributed. If you contribute anything significant or on a regular basis I will happily add your name to the contributors below and link to anywhere you want.

I'm looking for people that can become collaborators on the project. If you submit some pull requests with good code and are able to contribute on a regular basis, I would love to add you as a collaborator.

Contributors
------------

Justin Warkentin (creator)

# License: [MIT License](LICENSE)