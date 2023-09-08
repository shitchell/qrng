/*
 * QRNG.js
 * A simple quantum random number generator
 * 
 * Author: shitchell
 * License: wtfpl
 */

class QRNG
{
	constructor(cacheSize)
	{
		// Determine if we can use localStorage
		this._usingLocalStorage = this._isLocalStorageEnabled();

		// Set the cache size
		if (typeof cacheSize === "number")
		{
			this._cacheSize = Math.floor(cacheSize);
		} else {
			this._cacheSize = 1000;
		}

		// Check if our cache needs to be filled
		if (this._cache.length < this._cacheMinimum) {
			this._isReady = false;
			this._fillCache();
		} else {
			this._isReady = true;
		}
	}

	_debug() {
		if (QRNG._DEBUG) {
			// prepend the arguments with a timestamp and label
			const timestamp = new Date().toISOString().replace("T", " ").replace(/\..*/, "");
			const args = Array.prototype.slice.call(arguments);
			args.unshift(`[qrng.js] ${timestamp} --`);

			// call console.log with the new args
			console.log.apply(null, args);
		}
	}

	_isLocalStorageEnabled()
	{
		try {
			const key = "__storage__test";
			window.localStorage.setItem(key, null);
			window.localStorage.removeItem(key);
			return true;
		} catch (e) {
			return false;
		}
	}

	// A "smart" cache which uses either an instance attribute or localStorage depending on
	// localStorage's availability
	get _cache() {
		let cache;
		if (this._usingLocalStorage) {
			cache = localStorage._qrng_cache;
		} else {
			cache = this.__cache;
		}
		this._debug(`getting cache (localStorage = ${this._usingLocalStorage})`, cache);
		return cache || "";
	}
	set _cache(value) {
		let cache = this._usingLocalStorage ? localStorage._qrng_cache : this.__cache;
		this._debug(`setting cache (localStorage = ${this._usingLocalStorage}))`, cache, "=", value);
		if (this._usingLocalStorage) {
			localStorage._qrng_cache = value;
		} else {
			this.__cache = value;
		}
	}

	_fillCache()
	{
		const self = this;

		if (self._lock)
		{
			return;
		}
		else
		{
			self._lock = true;
		}

		var size = this._calculateBlockSize();
		var length = size['size'];
		var blocks = size['blocks'];

		let url = `https://api.shitchell.com/qrng?length=${length}&type=hex16&size=${blocks}`;
		let xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		xhr.onload = function(e)
		{
			let response = JSON.parse(xhr.responseText);

			// Check that ANU validated our query
			if (!response.status === "success")
			{
				throw "Invalid query";
			}
			let data = response.payload.data;
			self._debug("filling cache with:", data)

			// Append the new values to the cache
			self._cache += data.join("");

			// Ready stuffs
			if (!self.isReady())
			{
				self._isReady = true;
				self.onReady();
			}
			self.onUpdateCache();
		}
		xhr.onreadystatechange = function(e)
		{
			self._lock = false;
		}
		xhr.onerror = function(e)
		{
			self._lock = false;
			self.onUpdateFailed(e, xhr);
		}
		xhr.timeout = function(e)
		{
			self._lock = false;
			self.onUpdateFailed(e, xhr);
		}

		this._debug("requesting URL", url);
		xhr.send();
	}

	onReady() { }

	onCacheEmpty() { }

	onUpdateCache() { }

	onUpdateFailed(e, xhr) {
		this._debug("cache update failed:", e);
	}

	get _cacheMinimum()
	{
		return Math.floor(this._cacheSize * 0.25);
	}

	// Calculate the required block size needed to get the cache size requested
	_calculateBlockSize()
	{
		var blockSize = 1;
		var arraySize;
		
		while (blockSize <= QRNG.MAX_BLOCK_SIZE) // Maximum block size
		{
			let testArraySize = this._cacheSize / (2 * blockSize);

			if (testArraySize > QRNG.MAX_ARRAY_SIZE)
			{
				blockSize++;
				continue;
			}
			
			if (testArraySize * 2 * blockSize >= this._cacheSize)
			{
				arraySize = testArraySize;
				break;
			}
			else
			{
				blockSize++;
			}
		}

		if (typeof arraySize === "undefined")
		{
			arraySize = QRNG.MAX_ARRAY_SIZE;
			blockSize = QRNG.MAX_BLOCK_SIZE;
		}

		return {blocks: blockSize, size: Math.floor(arraySize)};
	}

	// Return the minimum number of hex characters required to satisfy a given range
	// (eg: for a range of 1,000 you would need 3 base-16 characters)
	_rangeToHexLength(range)
	{
		return Math.ceil(Math.log(range) / Math.log(16));
	}

	_cachePop(length)
	{
		// Check if we can use the localStorage cache first
		var substr = this._cache.substring(0, length);
		this._cache = this._cache.substring(length);
		return substr;
	}

	_verifyCache(length) {
		if (typeof length !== "number")
		{
			length = 16;
		}

		// Add to the cache if we are below our minimum limit or if we don't have enough
		// to grab the requested range size
		if (this._cache.length < length || this._cache.length < this._cacheMinimum)
		{
			this._fillCache();
		}
	}

	static _isBase16Compatible(rangeSize) {
		switch (rangeSize) {
			case 1:
			case 2:
			case 4:
			case 8:
			    // for these numbers, just return true (they divide evenly into 16)
				return true;
			default:
				// for all other numbers, return whether % 16 is 0
				return rangeSize % 16 == 0;
		}
	}

	// TODO: Fix this to work uniformly with a range not divisible by 16
	_getRandom(rangeSize)
	{
		// If rangeSize is 1, we can just return 0
		if (rangeSize == 1) {
			return 0;
		}

		// Check if the range is a power of 16
		if (!QRNG._isBase16Compatible(rangeSize)) {
			console.warn(`QRNG: rangeSize (${rangeSize}) is not a power of 16! This will cause bias towards lower numbers pending a fix.`);
		}

		// Verify that we have enough in the cache to satisfy the range size
		var hexLength = this._rangeToHexLength(rangeSize);
		this._verifyCache(hexLength);

		var num = this._cachePop(hexLength + 1);

		// Check to see if we got the last number in the cache
		if (this._cache.length == 0)
		{
			this.onCacheEmpty();
			this._isReady = false;
			this._fillCache();
		}

		return num;
	}

	_getNumberOfDigits(num)
	{
		return Math.floor(Math.log10(num)) + 1;
	}
	
	// Accepts a number and returns it within the range of min and max
	_numToRange(min, max, num)
	{
		if (typeof min !== "undefined" && typeof max !== "undefined")
		{
			if (num < min || num >= max)
			{
				let range = max - min;
				num = num % range;
				num = min + num;
			}
		}

		return num;
	}

	isReady()
	{
		return this._isReady;
	}

	getInteger(min, max)
	{
		if (typeof min === "undefined" && typeof max === "undefined")
		{
			min = 0;
			max = 256;
		}
		else if (typeof min === "undefined" && typeof max === "number")
		{
			min = max - 256; // Set the range to 256 (2 hex chars) if no min is given
		}
		else if (typeof min === "number" && typeof max === "undefined")
		{
			max = min + 256; // Same thing but for the max
		}

		if (typeof min !== "number" || typeof max !== "number")
		{
			return NaN;
		}
		
		let num = this._getRandom(max - min);
		num = parseInt(num, 16);
		
		return this._numToRange(min, max, num);
	}

	getHexadecimal(length)
	{
		// Verify that we have enough in the cache to satisfy the range size
		this._verifyCache(length);

		if (typeof length !== "number")
		{
			length = 6;
		}

		return this._cachePop(length);
	}

	// Returns a number between 0 and 1 between 0x00000 and 0xFFFFF
	getFloat()
	{
		// Javascript uses 64-bit floats, so we will grab a 64-bit number and
		// divide it by the maximum 64-bit number
		let num = this._getRandom(0xFFFFFFFFFFFFFFFF);
		num = parseInt(num, 16);
		let digits = this._getNumberOfDigits(num);

		return num / (10 ** digits);
	}

	// Returns the average of multiple calls to getInteger()
	getAverageInteger(min, max, iterations)
	{
		if (typeof iterations !== "number")
		{
			iterations = 10;
		}

		let total = 0;
		for (let i = 0; i < iterations; i++)
		{
			total += this.getInteger(min, max);
		}

		return Math.round(total / iterations);
	}

	// Returns the average of multiple calls to getFloat()
	getAverageFloat(iterations)
	{
		if (typeof iterations !== "number")
		{
			iterations = 10;
		}

		let total = 0;
		for (let i = 0; i < iterations; i++)
		{
			total += this.getFloat();
		}

		return total / iterations;
	}

	// Returns a random selection from an array
	getChoice(arr)
	{
		let index = this.getInteger(0, arr.length);
		return arr[index];
	}

	// Returns a random boolean
	getBoolean()
	{
		return this.getInteger(0, 2) == 1;
	}

	// Randomize / shuffle the elements of an array
	shuffle(arr)
	{
		let newArr = [];
		while (arr.length > 0)
		{
			let index = this.getInteger(0, arr.length);
			newArr.push(arr.splice(index, 1)[0]);
		}

		return newArr;
	}

	static replaceMath()
	{
		var generator = new QRNG(QRNG.MAX_BLOCK_SIZE * QRNG.MAX_ARRAY_SIZE * 2); // Maximum cache size
		Math.qrng = generator;
		Math.random = function() { return Math.qrng.getFloat(); }
	}
}

QRNG.MAX_BLOCK_SIZE = 10;
QRNG.MAX_ARRAY_SIZE = 1024;
QRNG._DEBUG = false;
