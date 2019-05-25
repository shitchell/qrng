class QRNG
{
	_cache;
	_cacheSize;
	_lock;
	_isReady;
		
	constructor(cacheSize)
	{
		this._cache = [];
		this._lock = false;
		if (typeof cacheSize === "number")
		{
			this._cacheSize = Math.floor(cacheSize);
		}
		else
		{
			this._cacheSize = 100;
		}
		this._isReady = false;
		this._fillCache(this._cacheSize);
	}

	_fillCache(length, wait, blocks)
	{
		var self = this;

		if (self._lock)
		{
			return;
		}
		
		if (typeof length !== "number")
		{
			var length = this._cacheSize;
		}
		length = Math.floor(length);

		if (typeof blocks !== "number")
		{
			var blocks = 4;
		}
		
		let url = `https://qrng.anu.edu.au/API/jsonI.php?length=${length}&type=hex16&size=${blocks}`;
		let xhr = new XMLHttpRequest();
		xhr.open("GET", url, !wait);
		xhr.onload = function(e)
		{
			console.log(xhr.responseText);
			let response = JSON.parse(xhr.responseText);

			// Check that ANU validated our query
			if (!response.success)
			{
				throw "Invalid query";
			}
			let data = response.data;
			
			// Prepend the new values to the appropriate cache
			self._cache = data.concat(self._cache);

			// Ready stuffs
			if (!self._isReady)
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
			self.onUpdateFailed(e, xhr);
		}
		if (!wait)
		{
			xhr.timeout = function(e)
			{
				self.onUpdateFailed(e, xhr);
			}
		}
		
		console.log("Requesting URL", url);
		self._lock = true;
		xhr.send();
	}

	onReady() { }

	onUpdateCache(f) { }

	onUpdateFailed() { }

	get _cacheMinimum()
	{
		return Math.floor(this._cacheSize * 0.25);
	}

	_getRandom(blocks)
	{
		// If we have less than 0 numbers in the cache, wait for a refill
		if (this._cache.length <= 0)
		{
			console.log("waiting");
			this._fillCache(this._cacheSize, true, blocks);
		}
		// If we have less than 30% of our cache, refill in the background
		else if (this._cache.length < this._cacheMinimum)
		{
			this._fillCache(this._cacheSize, false, blocks);
		}

		return this._cache.pop();
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
				num = min + num;			return num.substring(0, length);
							return num.substring(0, length);
							return num.substring(0, length);
							return num.substring(0, length);
							return num.substring(0, length);
				
			}
		}

		return num;
	}

	getInteger(min, max)
	{
		let num = this._getRandom();
		num = parseInt(num, 16);
		
		return this._numToRange(min, max, num);
	}

	getHexadecimal(length)
	{
		var num = this._getRandom();
		
		if (typeof length === "number")
		{
			while (num.length < length)
			{
				num += this._getRandom();
			}
		}

		return num.substring(0, length);
	}

	getFloat()
	{
		let num = this.getInteger();
		let digits = this._getNumberOfDigits(num);

		return num / (10 ** digits);
	}
}
