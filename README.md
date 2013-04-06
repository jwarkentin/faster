Faster.js
=========

Boost Javascript performance

If you've ever spent much time on jsperf.com you quickly notice that the fastest way of doing something in one browser is often not the fastest in another. To make things worse, this often changes not just with the browser, but just with the browser version you are using. The purpose of Faster.js is to resolve this by overriding native functions where possible to implement the fastest method of doing things for every platform (Node.js included).

This does not exclude the possibility of implementing performant versions of common operations that are not found in native functions and in fact, I would hope that the project encompasses many such functions in the future.

I would like to keep the core of Faster.js limited to functions that already exist in Javascript and keep all extra functions in separate libraries that can be optionally included. There will likely be an extra file included with this repo that includes a lot of useful common functions that people use.

This goes really well with other libraries, like Underscore, that try to use native versions of functions where they're available.

Usage
-----

On your website
```html
<script type="text/javascript" src="faster.js"></script>
```

Node.js
```
npm install faster
```

```js
require('faster');
```

Contribute
----------

Maintaining the browser and version to function mappings is a monumental task and any help is appreciated.
