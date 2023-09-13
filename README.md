# qrng
#### Quantum Random Number Generator in JavaScript using ANU

Simple interface to ANU's quantum random number generator API written in pure JavaScript.

### Usage

Create a QRNG object for specific quantum random functions
```
q = new QRNG();
q.getInteger();
q.getFloat()
q.getHexadecimal()
```

Replace Math.random with QRNG.getFloat and add quantum randomness to every single random event on the page
```
QRNG.replaceMath();
```

### Methods

new QRNG(cacheSize = 2048)
* Creates a new object with a default cache size of 2048 hexadecimal characters
* Optionally, specify a greater cache size if you're going to be doing lots of
  randomness

getInteger(min = 0, max = 256)
* Returns an integer between the specified min (inclusive) and max (exclusive)

getAverageInteger(min = 0, max = 256, iterations = 10)
* Returns the average of "iterations" number of integers between the specified
  min (inclusive) and max (exclusive)

getFloat()
* Returns a 64-bit (0xFFFFFFFFFFFFFFFF) float between 0 and 1

getAverageFloat(iterations = 10)
* Returns the average of "iterations" number of 64-bit (0xFFFFFFFFFFFFFFFF)
  floats between 0 and 1

getHexadecimal(length = 6)
* By default returns a 6 character hexidecimal string
* Optionally specify a length

getBoolean()
* Returns a random boolean

getChoice(array)
* Returns a random element from the specified array

getChoices(array, num = 1)
* Returns an array of "num" random elements from the specified array
* Duplicate elements are allowed

getUniqueChoices(array, num = 1)
* Returns an array of "num" random elements from the specified array
* Duplicate elements are not allowed

shuffle(array)
* Returns a shuffled version of the specified array

onReady(f)
* Run f() after the first successful cache update

onCacheUpdate(f)
* Run f() each time the cache updates (including the first)

onUpdateFailed(f)
* Run f(err, xhr) if an update fails. "err" is the error object from the
  XMLHttpRequest, and xhr is the... XMLHttpRequest

static replaceMath()
* QRNG.replaceMath() creates a new QRNG object with a cache of 1024 (the maximum
  allowed by ANU). It then replaces Math.random with QRNG.getFloat(). All
  subsequent calls to Math.random() will thus be based on quantum randomness
  (read: every single random event on the page, even those having nothing to do
  with qrng.js, will become quantumizedified).

### Notes

ANU has updated their API to require a license. A free license grants you 100
requests, and a $3/month paid license grants unlimited requests. You can obtain
a license by going to their QRNG homepage: https://qrng.anu.edu.au/

Because ANU's API doesn't allow cross-origin requests, qrng.js currently uses a
proxy server to get around this. At some point, I'll open source the proxy, but
essentially it just sets up CORS headers and forwards the request to ANU. If I
get hit by a car, and you need to set up your own proxy, you can do those
things.

At present, all of the `get___()` methods expect the cache to be filled. Filling
the cache takes ~3 seconds depending on internets and the configured cache size
and the alignment of the stars. This means that if you call `get___()` before
the cache is filled, nothing will hapen (I should probably at least set it up
to throw an error). You can use the `onReady()` method to run a function once
the cache is filled. You can also use the `onCacheUpdate()` method to run a
function each time the cache is updated. At some point, I intend to set up the
`get___()` functions to return promises or something, but I haven't figured out
how I want to implement that sort of thing yet.

### TODO

- [x] Format this README :p
- [ ] Create a method for specifying a min and max range for hexadecimal numbers
- [ ] ANU only allows 1,024 numbers be sent at a time. Implement a loop if a
      larger size is requested.
- [ ] Add a settings constructor to allow more fine tuned control over behavior
- [x] Add an onReady() method to be called once the cache is filled
- [ ] Add more qrng sources
- [ ] Add more comments

Huge credit to the guys over at Australian National University! You should
definitely check them out
https://qrng.anu.edu.au/API/api-demo.php
