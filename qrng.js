class QRNG
{
	constructor(cacheSize)
	{
		if (localStorage._qrng_cache === undefined)
		{
			localStorage._qrng_cache = "";
		}
		this._cache = localStorage._qrng_cache;
		this._lock = false;
		if (typeof cacheSize === "number")
		{
			this._cacheSize = Math.floor(cacheSize);
		}
		else
		{
			this._cacheSize = 1000;
		}
		this._isReady = false;
		this.onCacheEmpty(); // Run this on the onset since our cache is...empty
		this._fillCache();
	}

	_fillCache()
	{
		var self = this;

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
		
		let url = `https://qrng.anu.edu.au/API/jsonI.php?length=${length}&type=hex16&size=${blocks}`;
		let xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		xhr.onload = function(e)
		{
			let response = JSON.parse(xhr.responseText);

			// Check that ANU validated our query
			if (!response.success)
			{
				throw "Invalid query";
			}
			let data = response.data;
			
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
		
		console.log("QRNG: Requesting URL", url);
		xhr.send();
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

		return {size: blockSize, blocks: Math.floor(arraySize)};
	}

	// Return the minimum number of hex characters required to satisfy a given range
	// (eg: for a range of 1,000 you would need 3 base-16 characters)
	_rangeToHexLength(range)
	{
		return Math.ceil(Math.log(range) / Math.log(16));
	}

	_cachePop(length)
	{
		var substr = this._cache.substring(0, length);
		this._cache = this._cache.substring(length);
		return substr;
	}
	
	_getRandom(rangeSize)
	{
		// If we have less than 25% of our cache, refill in the background
		if (this._cache.length < this._cacheMinimum)
		{
			this._fillCache();
		}

		if (typeof rangeSize !== "number")
		{
			rangeSize = 256;
		}

		var hexLength = this._rangeToHexLength(rangeSize);
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
