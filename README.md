# qrng
#### Quantum Random Number Generator in JavaScript using ANU

Simple interface to ANU's quantum random number generator API written in pure JavaScript.

### Usage

```
q = new QRNG();
q.getInteger();
q.getFloat()
q.getHexadecimal()
```

### Methods

new QRNG(cacheSize)
* Creates a new object (duh) with a default cacheSize of 100
* Optionally, specify a greater cache size if you're going to be doing lots of randomness

getInteger(min, max)
* By default returns an integer between 0 and 4,294,967,295 ("0xFFFFFFFF")
* Optionally, specify a range. If no max is given, min will be ignored.

getFloat()
* Returns a float between 0 and 1

getHexadecimal(length)
* By default returns an 8 character hexidecimal string
* Optionally, you can specify another length

onReady(f)
* Run f() after the first successful cache update

onCacheUpdate(f)
* Run f() each time the cache updates (including the first)

onUpdateFailed(f)
* Run f(err, xhr) if an update fails. "err" is the error object from the XMLHttpRequest, and xhr is the... XMLHttpRequest

replaceMath()
* Static method. QRNG.replaceMath() creates a new QRNG object with a cache of 1024 (the maximum allowed by ANU). It then replaces Math.random with the QRNG.getFloat(). All subsequent calls to Math.random() will thus be based on quantum randomness (read: every single random event on the page, even those having nothing to do with qrng.js, will become quantumizedified).

### Notes

I didn't even think this would be possible due to cross-domain policies, but apparently the guys over at ANU are awesome about sharing their data! Making an xhr request is no issue.

With that in mind, *we are making an xhr request*, and we don't want to do that every single time we want to generate a random number. So a cache is used with a default size of 100. Once it hits 50, it sends another request to the server to refill its cache in the background.

When you first create a QRNG object, before you call any methods, it automatically fills its cache. However, this process will take some amount of time depending on internet connection, alignment of the stars, etc... (usually about 2 seconds for me) ~~So if you need it NOW, well... that's life.~~ So you might want to use the .onReady() function before you first use it. It gets called after the first successful cache update (and only the first).

### TODO

- [x] Format this README :p
- [ ] Create a method for specifying a min and max range for hexadecimal numbers
- [ ] ANU only allows 1,024 numbers be sent at a time. Implement a loop if a larger size is requested.
- [ ] Add a settings constructor to allow more fine tuned control over behavior
- [x] Add an onReady() method to be called once the cache is filled
- [ ] Add more qrng sources
- [ ] Add more comments

Huge credit to the guys over at Australian National University! You should definitely check them out
https://qrng.anu.edu.au/API/api-demo.php
