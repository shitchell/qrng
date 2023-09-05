class QRNG
{
	constructor(cacheSize)
	{
		// Determine if we can use localStorage
		this._usingLocalStorage = this._isLocalStorageEnabled();

		// Start in a non-ready state
		this._isReady = false;

		// Set the cache size
		if (typeof cacheSize === "number")
		{
			this._cacheSize = Math.floor(cacheSize);
		} else {
			this._cacheSize = 1000;
		}

		// Check if our cache needs to be filled
		if (this._cache.length < this._cacheMinimum) {
			await this._fillCache();
		}
	}

	_isLocalStorageEnabled()
	{
		try {
			const key = `__storage__test`;
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
		let cache = "";
		if (this._usingLocalStorage) {
			cache = localStorage._qrng_cache;
		} else {
			cache = this.__cache;
		}
		console.log(`[qrng.js] getting cache (using localStorage = {this._usingLocalStorage}))`, cache);
		return cache || "";
	}
	set _cache(value) {
		console.log(`[qrng.js] setting cache (using localStorage = {this._usingLocalStorage}))`, cache, "=", value);
		if (this._usingLocalStorage) {
			localStorage._qrng_cache = value;
		} else {
			this.__cache = value;
		}
	}

	async _fillCache()
	{
		// Calculate how big of a request we need to make
		let size = this._calculateBlockSize();		
		let length = size['size'];
		let blocks = size['blocks'];

		// Request some quantum randomness
		let url = `https://api.shitchell.com/qrng?length=${length}&type=hex16&size=${blocks}`;
		let response = await fetch(url);

		// Check if the response thinks it's valid
		if (!response.status === "success")
		{
			this.onUpdateFailed();
			throw "Invalid query";
		}
		
		// Check if the data is valid
		let data = response.payload.data;
		if (!data || data.length <= 0)
		{
			throw "No quantum data retrieved";
		}

		// Update the cache
		console.log("[qrng.js] filling cache with:", data)
		self._cache += data.join("");

		// Run the onUpdateCache() event now that the cache has been updated
		this.onUpdateCache();

		// If we were previously not ready, now we are, so run that event, too
		if (!this._isReady) {
			this._isReady = true;
			this.onReady();
		}
	}

	onReady() { }

	onCacheEmpty() { }

	onUpdateCache() { }

	onUpdateFailed(e, xhr) {
		console.log("QRNG: Cache update failed.", e);
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
	
	_getRandom(rangeSize)
	{
		if (typeof rangeSize !== "number")
		{
			rangeSize = 256;
		}

		var hexLength = this._rangeToHexLength(rangeSize);

		// Add to the cache if we are below our minimum limit or if we don't have enough
		// to grab the requested range size
		while (this._cache.length < hexLength || this._cache.length < this._cacheMinimum)
		{
			await this._fillCache();
		}
		var num = this._cachePop(hexLength);
		
		// Check to see if we got the last number in the cache
		if (this._cache.length == 0)
		{
			this.onCacheEmpty();
			this._isReady = false;
		}

		return num;
	}

	_getNumberOfDigits(num)
	{
		return Math.floor(Math.log10(num)) + 1;
	}
	
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
		if (typeof length !== "number")
		{
			length = 6;
		}

		return this._cachePop(length);
	}

	// Returns a number between 0 and 1 between 0x00000 and 0xFFFFF
	getFloat()
	{
		let num = this.getHexadecimal(5);
		num = parseInt(num, 16);
		let digits = this._getNumberOfDigits(num);

		return num / (10 ** digits);
	}

	static replaceMath()
	{
		var generator = new QRNG(QRNG.MAX_BLOCK_SIZE * QRNG.MAX_ARRAY_SIZE * 2); // Maximum cache size
		Math.qrng = generator;
		Math.random = function() {
			return generator.getFloat();
		}
	}
}

QRNG.MAX_BLOCK_SIZE = 10;
QRNG.MAX_ARRAY_SIZE = 1024;
