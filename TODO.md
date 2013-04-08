- Unit tests
- Document how to build 3rd party extensions and platform/version detection and comparison
- Look at user agent strings for different mobile browsers and support those separate from the desktop versions in both the platform detection and the function maps

- Build benchmark suite on top of 'benchmark' available through NPM (also works in the browser) from jsperf.com. This will be used to test which version of a function is faster for all objects when run on a given platform. It can generate new maps.
- Build out performance enhancements at least for the created files in 'src/'
- Enhance beautification of dev version and add comments to separate files from each other in dev version