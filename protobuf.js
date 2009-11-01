var PROTO = {};

PROTO.DefineProperty = (function () {
        if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) {
            function DefineProperty(prototype, property, getter, setter) {
                if (typeof getter !== 'undefined') {
                    prototype.__defineGetter__(property, getter);
                }
                if (typeof setter !== 'undefined') {
                    prototype.__defineSetter__(property, setter);
                }
            }
            return DefineProperty;
        } else if (Object.defineProperty) {
            function DefineProperty(prototype, property, getter, setter) {
                Object.defineProperty(prototype, property, {'get': getter, 'set': setter});
            }
            return DefineProperty;
        }
})();

PROTO.wiretypes = {
    varint: 0,
    fixed64: 1,
    lengthdelim: 2,
    fixed32: 5,
};

PROTO.optional = 'optional';
PROTO.repeated = 'repeated';
PROTO.required = 'required';

PROTO.I64 = function (msw, lsw, sign) {
    this.msw = msw;
    this.lsw = lsw;
    if (sign === true) sign = -1;
    if (!sign) sign = 1;
    this.sign = sign;
};

PROTO.I64.prototype = {
    toNumber: function() {
        return (this.msw*4294967296 + this.lsw)*this.sign;
    },
    toString: function() {
        //return this.toNumber();
        function zeros(len){
            var retval="";
            for (var i=0;i<len;++i) {
                retval+="0";
            }
            return retval;
        }
        var firstHalf=this.msw.toString(16);
        var secondHalf=this.lsw.toString(16);
        var sign = (this.sign==-1 ? "-" : "");
        return sign+"0x"+zeros(8-firstHalf.length)+firstHalf+zeros(8-secondHalf.length)+secondHalf;
    },
    convertToUnsigned: function() {
        var local_lsw;
        local_lsw=this.lsw;
        var local_msw;
        if (this.sign<0) {
            local_msw=this.msw+2147483648;
        }else {
            local_msw=this.msw;
        }
        return new PROTO.I64(local_msw,local_lsw,1);
    },
    convertFromUnsigned:function() {
        if(this.msw>=2147483648) {
            return new PROTO.I64(this.msw-2147483648,this.lsw,-1);
        }
        return new PROTO.I64(this.msw,this.lsw,1);
    },
    convertToZigzag: function() {
        var local_lsw;
        if (this.sign<0) {
            local_lsw=this.lsw*2+1;
        }else {
            local_lsw=this.lsw*2;
        }
        var local_msw=this.msw*2;
        if (local_lsw>4294967295){
            local_msw+=1;
            local_lsw-=4294967296;
        }
        return new PROTO.I64(local_msw,local_lsw,1);
    },
    convertFromZigzag:function() {
        if(this.msw&1) {
            return new PROTO.I64((this.msw>>>1),
                                 2147483648+(this.lsw>>>1),
                                 (this.lsw&1)?-1:1);
        }
        return new PROTO.I64((this.msw>>>1),
                             (this.lsw>>>1),
                             (this.lsw&1)?-1:1);
    },
    serializeToLEBase256: function() {
        var arr = new Array(8);
        var temp=this.lsw;
        for (var i = 0; i < 4; i++) {
            arr[i] = (temp&255);
            temp=(temp>>8);
        }
        temp = this.msw;
        for (var i = 4; i < 8; i++) {
            arr[i] = (temp&255);
            temp=(temp>>8);
        }
        return arr;
    },
    serializeToLEVar128: function() {
        var arr = new Array(1);
        var temp=this.lsw;
        for (var i = 0; i < 4; i++) {
            arr[i] = (temp&127);
            temp=(temp>>>7);
            if(temp==0&&this.msw==0) return arr;
            arr[i]+=128;
        }        
        arr[4] = (temp&15) | ((this.msw&7)<<4);
        temp=(this.msw>>>3);
        if (temp==0) return arr;
        arr[4]+=128;
        for (var i = 5; i<10; i++) {
            arr[i] = (temp&127);
            temp=(temp>>>7);
            if(temp==0) return arr;
            
            arr[i]+=128;
        }
        return arr;
    },
    unsigned_add:function(other) {
        var temp=this.lsw+other.lsw;
        var local_msw=this.msw+other.msw;
        var local_lsw=temp%4294967296;
        temp-=local_lsw;
        local_msw+=temp/4294967296;
        return new PROTO.I64(local_msw,local_lsw,this.sign);
    },
    sub : function(other) {
        if (other.sign!=this.sign) {
            return this.unsigned_add(other);
        }
        if (other.msw>this.msw || (other.msw==this.msw&&other.lsw>this.msw)) {
            var retval=other.sub(this);
            retval.sign=-this.sign;
            return retval;
        }
        var local_lsw=this.lsw-other.lsw;
        var local_msw=this.msw-other.msw;       
        if (local_lsw<0) {
            local_lsw+=4294967296;
            local_msw-=1;
        }
        return new PROTO.I64(local_msw,local_lsw,this.sign);        
    },
    add : function(other) {
        if (other.sign<0 && this.sign>=0)
            return this.sub(new PROTO.I64(other.msw,other.lsw,-other.sign));
        if (other.sign>=0 && this.sign<0)
            return other.sub(new PROTO.I64(this.msw,this.lsw,-this.sign));
        return this.unsigned_add(other);
    }
};

PROTO.I64.fromNumber = function(mynum) {
    var sign = (mynum < 0) ? -1 : 1;
    mynum *= sign;
    var lsw = (mynum%4294967296);
    var msw = ((mynum-lsw)/4294967296);
    return new PROTO.I64(msw, lsw, sign);
};

PROTO.I64.from32pair = function(msw, lsw, sign) {
    return new PROTO.I64(msw, lsw, sign);
};
PROTO.I64.parseLEVar128 = function (stream) {
    var n = 0;
    var endloop = false;
    var offset=1;
    for (var i = 0; !endloop && i < 5; i++) {
        var byt = stream.readByte();
        if (byt >= 128) {
            byt -= 128;
        } else {
            endloop = true;
        }
        n += offset*byt;
        offset *= 128;
    }
    var lsw=n%4294967296
    var msw = 0;    
    offset=8;
    for (var i = 0; !endloop && i < 5; i++) {
        var byt = stream.readByte();
        if (byt >= 128) {
            byt -= 128;
        } else {
            endloop = true;
        }
        msw += offset*byt;
        offset *= 128;
    }
    return new PROTO.I64(msw%4294967296,lsw,1);
};

PROTO.I64.parseLEBase256 = function (stream) {
    var n = 0;
    var endloop = false;
    var offset=1;
    for (var i = 0; i < 4; i++) {
        var byt = stream.readByte();
        n += offset*byt;
        offset *= 256;
    }
    var lsw=n;
    var msw=0;
    offset=1;
    for (var i = 0; i < 4; i++) {
        var byt = stream.readByte();
        msw += offset*byt;
        offset *= 256;
    }
    return new PROTO.I64(msw,lsw,1);
};

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/classes/binary-parser [rev. #1]

PROTO.BinaryParser = function(bigEndian, allowExceptions){
    this.bigEndian = bigEndian, this.allowExceptions = allowExceptions;
};
with({p: PROTO.BinaryParser.prototype}){
    p.encodeFloat = function(number, precisionBits, exponentBits){
        var bias = Math.pow(2, exponentBits - 1) - 1, minExp = -bias + 1, maxExp = bias, minUnnormExp = minExp - precisionBits,
        status = isNaN(n = parseFloat(number)) || n == -Infinity || n == +Infinity ? n : 0,
        exp = 0, len = 2 * bias + 1 + precisionBits + 3, bin = new Array(len),
        signal = (n = status !== 0 ? 0 : n) < 0, n = Math.abs(n), intPart = Math.floor(n), floatPart = n - intPart,
        i, lastBit, rounded, j, result;
        for(i = len; i; bin[--i] = 0);
        for(i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2));
        for(i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0) && --floatPart);
        for(i = -1; ++i < len && !bin[i];);
        if(bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]){
            if(!(rounded = bin[lastBit]))
                for(j = lastBit + 2; !rounded && j < len; rounded = bin[j++]);
            for(j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
        }
        for(i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];);

        (exp = bias + 1 - i) >= minExp && exp <= maxExp ? ++i : exp < minExp &&
            (exp != bias + 1 - len && exp < minUnnormExp && this.warn("encodeFloat::float underflow"), i = bias + 1 - (exp = minExp - 1));
        (intPart || status !== 0) && (this.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status),
            exp = maxExp + 1, i = bias + 2, status == -Infinity ? signal = 1 : isNaN(status) && (bin[i] = 1));
        for(n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1);
        for(n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = [];
            i; n += (1 << j) * result.charAt(--i), j == 7 && (r[r.length] = n, n = 0), j = (j + 1) % 8);
        
        return (this.bigEndian ? r.reverse() : r);
    };
    p.encodeInt = function(number, bits, signed){
        var max = Math.pow(2, bits), r = [];
        (number >= max || number < -(max >> 1)) && this.warn("encodeInt::overflow") && (number = 0);
        number < 0 && (number += max);
        for(; number; r[r.length] = number % 256, number = Math.floor(number / 256));
        for(bits = -(-bits >> 3) - r.length; bits--;);
        return (this.bigEndian ? r.reverse() : r);
    };
    p.decodeFloat = function(data, precisionBits, exponentBits){
        var b = ((b = new this.Buffer(this.bigEndian, data)).checkBuffer(precisionBits + exponentBits + 1), b),
            bias = Math.pow(2, exponentBits - 1) - 1, signal = b.readBits(precisionBits + exponentBits, 1),
            exponent = b.readBits(precisionBits, exponentBits), significand = 0,
            divisor = 2, curByte = b.buffer.length + (-precisionBits >> 3) - 1,
            byteValue, startBit, mask;
        do
            for(byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
                mask >>= 1; (byteValue & mask) && (significand += 1 / divisor), divisor *= 2);
        while(precisionBits -= startBit);
        return exponent == (bias << 1) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity
            : (1 + signal * -2) * (exponent || significand ? !exponent ? Math.pow(2, -bias + 1) * significand
            : Math.pow(2, exponent - bias) * (1 + significand) : 0);
    };
    p.decodeInt = function(data, bits, signed){
        var b = new this.Buffer(this.bigEndian, data), x = b.readBits(0, bits), max = Math.pow(2, bits);
        return signed && x >= max / 2 ? x - max : x;
    };
    with({p: (p.Buffer = function(bigEndian, buffer){
        this.bigEndian = bigEndian || 0, this.buffer = [], this.setBuffer(buffer);
    }).prototype}){
        p.readBits = function(start, length){
            //shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)
            function shl(a, b){
                for(++b; --b; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1);
                return a;
            }
            if(start < 0 || length <= 0)
                return 0;
            this.checkBuffer(start + length);
            for(var offsetLeft, offsetRight = start % 8, curByte = this.buffer.length - (start >> 3) - 1,
                lastByte = this.buffer.length + (-(start + length) >> 3), diff = curByte - lastByte,
                sum = ((this.buffer[ curByte ] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1))
                + (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[ lastByte++ ] & ((1 << offsetLeft) - 1))
                << (diff-- << 3) - offsetRight : 0); diff; sum += shl(this.buffer[ lastByte++ ], (diff-- << 3) - offsetRight)
            );
            return sum;
        };
        p.setBuffer = function(data){
            if(data){
                for(var l, i = l = data.length, b = this.buffer = new Array(l); i; b[l - i] = data[--i]);
                this.bigEndian && b.reverse();
            }
        };
        p.hasNeededBits = function(neededBits){
            return this.buffer.length >= -(-neededBits >> 3);
        };
        p.checkBuffer = function(neededBits){
            if(!this.hasNeededBits(neededBits))
                throw new Error("checkBuffer::missing bytes");
        };
    }
    p.warn = function(msg){
        if(this.allowExceptions)
            throw new Error(msg);
        return 1;
    };
    p.toSmall = function(data){return this.decodeInt(data, 8, true);};
    p.fromSmall = function(number){return this.encodeInt(number, 8, true);};
    p.toByte = function(data){return this.decodeInt(data, 8, false);};
    p.fromByte = function(number){return this.encodeInt(number, 8, false);};
    p.toShort = function(data){return this.decodeInt(data, 16, true);};
    p.fromShort = function(number){return this.encodeInt(number, 16, true);};
    p.toWord = function(data){return this.decodeInt(data, 16, false);};
    p.fromWord = function(number){return this.encodeInt(number, 16, false);};
    p.toInt = function(data){return this.decodeInt(data, 32, true);};
    p.fromInt = function(number){return this.encodeInt(number, 32, true);};
    p.toDWord = function(data){return this.decodeInt(data, 32, false);};
    p.fromDWord = function(number){return this.encodeInt(number, 32, false);};
    p.toFloat = function(data){return this.decodeFloat(data, 23, 8);};
    p.fromFloat = function(number){return this.encodeFloat(number, 23, 8);};
    p.toDouble = function(data){return this.decodeFloat(data, 52, 11);};
    p.fromDouble = function(number){return this.encodeFloat(number, 52, 11);};
}
PROTO.binaryParser = new PROTO.BinaryParser(false,false);


// Note: This might not work for unicode characters between 0x10000 and 0x10FFFF.
// See http://www.codesimple.net/2006_10_01_archive.html
// http://cogteeth.com/res/mpsupport.js

/**
*
*  UTF-8 data encode / decode
*  http://www.webtoolkit.info/
*
*  From: http://www.webtoolkit.info/javascript-utf8.html
*
**/
PROTO.Utf8 = {
	// public method for url encoding
	encode : function (string) {
		var utftext = [];
		for (var n = 0; n < string.length; n++) {
			var c = string.charCodeAt(n);
			if (c < 128) {
				utftext.push(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext.push((c >> 6) | 192);
				utftext.push((c & 63) | 128);
			}
			else {
				utftext.push((c >> 12) | 224);
				utftext.push(((c >> 6) & 63) | 128);
				utftext.push((c & 63) | 128);
			}
		}
		return utftext;
	},

	// public method for url decoding
	decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
		while ( i < utftext.length ) {
			c = utftext[i];
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext[i+1];
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext[i+1];
				c3 = utftext[i+2];
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return string;
	}
};

PROTO.Stream = function () {
    this.write_pos_ = 0;
    this.read_pos_ = 0;
};
PROTO.Stream.prototype = {
    read: function(amt) {
        var result = [];
        for (var i = 0; i < amt; ++i) {
            var byte = this.readByte();
            if (byte === null) {
                break;
            }
            result.push(byte);
        }
        return result;
    },
    write: function(array) {
        for (var i = 0; i < array.length; i++) {
            this.writeByte(array[i]);
        }
    },
    readByte: function() {
        return null;
    },
    writeByte: function(byte) {
        write_pos_ += 1;
    },
    valid: function() {
        return false;
    }
};

PROTO.ByteArrayStream = function(arr) {
    this.array_ = arr || new Array();
    this.read_pos_ = 0;
    this.write_pos_ = arr.length;
};
PROTO.ByteArrayStream.prototype = new PROTO.Stream();
PROTO.ByteArrayStream.prototype.read = function(amt) {
    var ret = this.array_.slice(this.read_pos_, this.read_pos_+amt);
    this.read_pos_ += amt;
    return ret;
};
PROTO.ByteArrayStream.prototype.write = function(arr) {
    Array.prototype.push.apply(this.array_, arr);
    this.write_pos_ = this.array_.length;
};
PROTO.ByteArrayStream.prototype.readByte = function() {
    return this.array_[this.read_pos_ ++];
};
PROTO.ByteArrayStream.prototype.writeByte = function(byte) {
    this.array_.push(byte);
    this.write_pos_ = this.array_.length;
};
PROTO.ByteArrayStream.prototype.valid = function() {
    return this.read_pos_ < this.array_.length;
};
PROTO.ByteArrayStream.prototype.getArray = function() {
    return this.array_;
}

PROTO.Base64Stream = function(b64string) {
    this.string_ = b64string || '';
    this.read_pos_ = 0;
    this.read_incomplete_value_ = 0;
    this.read_needed_bits_ = 8;
    this.write_extra_bits_ = 0;
    this.write_incomplete_value_ = 0;
    this.fixString();
}
PROTO.Base64Stream.prototype = new PROTO.Stream();
(function(prototype){
    var FromB64AlphaMinus43=[
        62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,
        -1,-1,-1,-1,-1,-1,-1,
        0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
        17,18,19,20,21,22,23,24,25,
        -1,-1,-1,-1,-1,-1,
        26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
        41,42,43,44,45,46,47,48,49,50,51];
    var ToB64Alpha=[
        'A','B','C','D','E','F','G','H','I','J','K','L','M',
        'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
        'a','b','c','d','e','f','g','h','i','j','k','l','m',
        'n','o','p','q','r','s','t','u','v','w','x','y','z',
        '0','1','2','3','4','5','6','7','8','9','+','/'];
    prototype.fixString = function() {
        var len = this.string_.length;
        if (this.string_[len-1]=='=') {
            var n = 4;
            var cutoff = 2;
            if (this.string_[len-2]=='=') {
                n = 2;
                cutoff = 3;
            }
            this.write_extra_bits_ = n;
            this.write_incomplete_value_ = FromB64AlphaMinus43[
                this.string_.charCodeAt(len-3)-43];
            this.write_incomplete_value_ >>= (6-n);
            this.string_ = this.string_.substring(0,len-cutoff);
        }
    }
    prototype.readByte = function readByte() {
        var next6bits;
        while (next6bits == undefined || next6bits == -1) {
            if (this.read_pos_ >= this.string_.length) {
                if (this.valid()) {
                    next6bits = this.write_incomplete_value_;
                    this.read_pos_++;
                    break;
                } else {
                    return null;
                }
            }
            next6bits = FromB64AlphaMinus43[
                this.string_.charCodeAt(this.read_pos_++)-43];
        }
        var n = this.read_needed_bits_;
        if (n == 8) {
            this.read_incomplete_value_ = next6bits;
            this.read_needed_bits_ = 2;
            return this.readByte();
        }
        var ret = this.read_incomplete_value_<<n;
        ret |= next6bits>>(6-n);
        this.read_incomplete_value_ = next6bits&((1<<(6-n))-1);
        this.read_needed_bits_ += 2;
        return ret;
    }

    prototype.writeByte = function writeByte(byte) {
        this.write_extra_bits_ += 2;
        var n = this.write_extra_bits_;
        this.string_ += ToB64Alpha[
                byte>>n | this.write_incomplete_value_<<(8-n)];
        this.write_incomplete_value_ = (byte&((1<<n)-1));
        if (n == 6) {
            this.string_ += ToB64Alpha[this.write_incomplete_value_];
            this.write_extra_bits_ = 0;
            this.write_incomplete_value_ = 0;
        }
        if (this.string_.length%77==76) {
            this.string_ += "\n";
        }
    }

    prototype.getString = function getString() {
        var len = this.string_.length;
        var retstr = this.string_;
        var n = this.write_extra_bits_;
        if (n > 0) {
            retstr += ToB64Alpha[this.write_incomplete_value_<<(6-n)];
            if (n==2) {
                retstr += "==";
            } else if (n==4) {
                retstr += "=";
            }
        }
        return retstr;
    }
    prototype.valid = function valid() {
        return (this.read_pos_ < this.string_.length) ||
               (this.read_pos_==this.string_.length && this.write_extra_bits_);
    }
})(PROTO.Base64Stream.prototype);

PROTO.array =
    (function() {
        function ProtoArray(datatype, input) {
            this.datatype_ = datatype.type();
            this.array_ = new Array;
            this.length = 0;
            if (input instanceof Array) {
                for (var i=0;i<input.length;++i) {
                    this.push(input[i]);
                }
            }
        };
        ProtoArray.IsInitialized = function IsInitialized(val) {
            return val.length > 0;
        }
        ProtoArray.prototype = {};
        ProtoArray.prototype.push = function add() {
            if (arguments.length === 0) {
                if (this.datatype_.composite) {
                    var newval = new this.datatype_;
                    this.array_.push(newval);
                    this[this.length] = newval;
                    this.length += 1;
                    return newval;
                } else {
                    throw "Called add(undefined) for a non-composite";
                }
            } else {
                for (var i = 0; i < arguments.length; i++) {
                    var newval = this.datatype_.Convert(arguments[i]);
                    this.array_.push(newval);
                    this[this.length] = newval;
                }
                this.length = this.array_.length;
            }
            return arguments[0];
        }
        return ProtoArray;
    })();

PROTO.string = {
    Convert: function(str) {
        return ''+str;
    },
    wiretype: PROTO.wiretypes.lengthdelim,
    SerializeToStream: function(str, stream) {
        var arr = PROTO.Utf8.encode(str);
        return PROTO.bytes.SerializeToStream(arr, stream);
    },
    ParseFromStream: function(stream) {
        var arr = PROTO.bytes.ParseFromStream(stream);
        return PROTO.Utf8.decode(arr);
    },
    toString: function(str) {return str;}
};

PROTO.bytes = {
    Convert: function(arr) {
        if (arr instanceof Array) {
            return arr;
        } else {
            throw "Not a Byte Array: "+arr;
        }
    },
    wiretype: PROTO.wiretypes.lengthdelim,
    SerializeToStream: function(arr, stream) {
        PROTO.int32.SerializeToStream(arr.length, stream);
        stream.write(arr);
    },
    ParseFromStream: function(stream) {
        var len = PROTO.int32.ParseFromStream(stream);
        return stream.read(len);
    },
    toString: function(bytes) {return '['+bytes+']';}
};

(function() {
    function makeclass(converter, serializer, parser) {
        var myclass = {
            Convert: converter,
            wiretype: 0,
            SerializeToStream: serializer,
            ParseFromStream: parser,
            toString: function(val) {return "" + val}
        };
        return myclass;
    };
    function convertU32(n) { //unsigned
        if (n == NaN) {
            throw "not a number: "+str;
        }
        n = Math.round(n);
        if (n < 0) {
            throw "uint32/fixed32 does not allow negative: "+n;
        }
        if (n > 4294967295) {
            throw "uint32/fixed32 out of bounds: "+n;
        }
        return n;
    };
    function convertS32(n) { // signed
        if (n == NaN) {
            throw "not a number: "+str;
        }
        n = Math.round(n);
        if (n > 2147483647 || n < -2147483648) {
            throw "sfixed32/[s]int32 out of bounds: "+n;
        }
        return n;
    };
    function serializeFixed32(n, stream) {
        if (n<0) n += 4294967296;
        var arr = new Array(4);
        for (var i = 0; i < 4; i++) {
            arr[i] = n%256;
            n >>>= 8;
        }
        stream.write(arr);
    };
    function parseSFixed32(stream) {
        var n = 0;
        var offset=1;
        for (var i = 0; i < 4; i++) {
            n += offset*stream.readByte();
            offset *= 256;
        }
        return n;
    };
    function parseFixed32(stream) {
        var n = parseSFixed32(stream);
        if (n > 2147483647) {
            n -= 4294967296;
        }
        return n;
    };
    function serializeInt32(n, stream) {
        if (n < 0) {
            n += 4294967296;
        }
        // Loop once regardless of whether n is 0.
        for (var i = 0; i==0 || (n && i < 5); i++) {
            var byt = n%128;
            n >>>= 7;
            if (n) {
                byt += 128;
            }
            stream.writeByte(byt);
        }
    };
    function serializeSInt32(n, stream) {
        if (n < 0) {
            n = n*2-1;
        } else {
            n = n*2;
        }
        serializeInt32(n, stream);
    };
    function parseUInt32(stream) {
        var n = 0;
        var endloop = false;
        var offset=1;
        for (var i = 0; !endloop && i < 5; i++) {
            var byt = stream.readByte();
            if (byt >= 128) {
                byt -= 128;
            } else {
                endloop = true;
            }
            n += offset*byt;
            offset *= 128;
        }
        return n;
    };
    function parseInt32(stream) {
        var n = parseUInt32(stream);
        if (n > 2147483647) {
            n -= 4294967296;
        }
        return n;
    };
    function parseSInt32(stream) {
        var n = parseUInt32(stream);
        if (n & 1) {
            return (n+1) / -2;
        }
        return n / 2;
    }
    PROTO.sfixed32 = makeclass(convertS32, serializeFixed32, parseSFixed32);
    PROTO.fixed32 = makeclass(convertU32, serializeFixed32, parseFixed32);
    PROTO.sfixed32.wiretype = PROTO.wiretypes.fixed32;
    PROTO.fixed32.wiretype = PROTO.wiretypes.fixed32;
    PROTO.int32 = makeclass(convertS32, serializeInt32, parseInt32);
    PROTO.sint32 = makeclass(convertS32, serializeSInt32, parseSInt32);
    PROTO.uint32 = makeclass(convertU32, serializeInt32, parseUInt32);

    function convert64(n) {
        if (n instanceof PROTO.I64) {
            return n;
        }
        throw "64-bit integers must be PROTO.I64 objects!";
    };
    function serializeInt64(n, stream) {
        stream.write(n.convertToUnsigned().serializeToLEVar128());
    }
    function serializeSInt64(n, stream) {
        stream.write(n.convertToZigzag().serializeToLEVar128());
    }
    function serializeUInt64(n, stream) {
        stream.write(n.serializeToLEVar128());
    }
    function serializeSFixed64(n, stream) {
        stream.write(n.convertToUnsigned().serializeToLEBase256());
    }
    function serializeFixed64(n, stream) {
        stream.write(n.serializeToLEBase256());
    }
    function parseSFixed64(stream) {
        return PROTO.I64.parseLEBase256(stream).convertFromUnsigned();
    }
    function parseFixed64(stream) {
        return PROTO.I64.parseLEBase256(stream);
    }
    function parseSInt64(stream) {
        return PROTO.I64.parseLEVar128(stream).convertFromZigzag();
    }
    function parseInt64(stream) {
        return PROTO.I64.parseLEVar128(stream).convertFromUnsigned();
    }
    function parseUInt64(stream) {
        return PROTO.I64.parseLEVar128(stream);
    }
    PROTO.sfixed64 = makeclass(convert64, serializeSFixed64, parseSFixed64);
    PROTO.fixed64 = makeclass(convert64, serializeFixed64, parseFixed64);
    PROTO.sfixed64.wiretype = PROTO.wiretypes.fixed64;
    PROTO.fixed64.wiretype = PROTO.wiretypes.fixed64;
    PROTO.int64 = makeclass(convert64, serializeInt64, parseInt64);
    PROTO.sint64 = makeclass(convert64, serializeSInt64, parseSInt64);
    PROTO.uint64 = makeclass(convert64, serializeUInt64, parseUInt64);

    PROTO.bool = makeclass(function(bool) {return bool?true:false;},
                           serializeInt32,
                           parseUInt32);

    function convertFloatingPoint(f) {
        var n = parseFloat(f);
        if (n == NaN) {
            throw "not a number: "+f;
        }
        return n;
    };
    function writeFloat(flt, stream) {
        stream.write(PROTO.binaryParser.fromFloat(flt));
    };
    function readFloat(stream) {
        var arr = stream.read(4);
        return PROTO.binaryParser.toFloat(arr);
    };
    function writeDouble(flt, stream) {
        stream.write(PROTO.binaryParser.fromDouble(flt));
    };
    function readDouble(stream) {
        var arr = stream.read(8);
        return PROTO.binaryParser.toDouble(arr);
    };
    PROTO.float = makeclass(convertFloatingPoint, writeFloat, readFloat);
    PROTO.double = makeclass(convertFloatingPoint, writeDouble, readDouble);
    PROTO.float.wiretype = PROTO.wiretypes.fixed32;
    PROTO.double.wiretype = PROTO.wiretypes.fixed64;
})();


PROTO.mergeProperties = function(properties, stream, values) {
    var fidToProp = {};
    for (var key in properties) {
        fidToProp[properties[key].id] = key;
    }
    var nextfid, nexttype, nextprop, nextval, nextpropname;
    var incompleteTuples = {};
    while (stream.valid()) {
        nextfid = PROTO.int32.ParseFromStream(stream);
//        console.log(""+stream.read_pos_+" ; "+stream.array_.length);
        nexttype = nextfid % 8;
        nextfid >>>= 3;
        nextpropname = fidToProp[nextfid];
        nextprop = nextpropname && properties[nextpropname];
        nextval = undefined;
        switch (nexttype) {
        case PROTO.wiretypes.varint:
//        console.log("read varint field is "+nextfid);
            if (nextprop) {
                nextval = nextprop.type().ParseFromStream(stream);
            } else {
                PROTO.int64.ParseFromStream(stream);
            }
            break;
        case PROTO.wiretypes.fixed64:
//        console.log("read fixed64 field is "+nextfid);
            if (nextprop) {
                //console.log(nextprop.type);
                nextval = nextprop.type().ParseFromStream(stream);
            } else {
                PROTO.fixed64.ParseFromStream(stream);
            }
            break;
        case PROTO.wiretypes.lengthdelim:
//        console.log("read lengthdelim field is "+nextfid);
            if (nextprop) {
                if (nextprop.options.packed) {
                    var tup;
                    if (nextprop.type().cardinality>1) {
                        if (incompleteTuples[nextpropname]===undefined) {
                            incompleteTuples[nextpropname]=new Array();
                        }
                        tup = incompleteTuples[nextpropname];
                    }
                    var bytearr = PROTO.bytes.ParseFromStream(stream);
                    var bas = new PROTO.ByteArrayStream(bytearr);
                    for (var j = 0; j < bytearr.length && bas.valid(); j++) {
                        var toappend = nextprop.type().ParseFromStream(bas);

                        if (nextprop.type().cardinality>1) {
                            tup.push(toappend);
                            if (tup.length==nextprop.type().cardinality) {
                                if (nextprop.multiplicity == PROTO.repeated) {
                                    values[nextpropname].push(tup);
                                } else {
                                    values[nextpropname] =
                                        nextprop.type().Convert(tup);
                                }
                                incompleteTuples[nextpropname]=new Array();
                                tup = incompleteTuples[nextpropname];
                            }
                        }else {
                            values[nextpropname].push(toappend);
                        }
                    }
                } else {
                    nextval = nextprop.type().ParseFromStream(stream);
                }
            } else {
                PROTO.bytes.ParseFromStream(stream);
            }
            break;
        case PROTO.wiretypes.fixed32:
//        console.log("read fixed32 field is "+nextfid);
            if (nextprop) {
                nextval = nextprop.type().ParseFromStream(stream);
            } else {
                PROTO.fixed32.ParseFromStream(stream);
            }
            break;
        default:
        console.log("ERROR: Unknown type "+nexttype+" for "+nextfid);
            break;
        }
        if (nextval !== undefined) {
            if (values[nextpropname] === undefined && nextprop.type().cardinality>1) {
                values[nextpropname] = {};
            }
            if (nextprop.type().cardinality>1) {
                var tup;
                if (incompleteTuples[nextpropname]===undefined) {
                    incompleteTuples[nextpropname]=new Array();
                    tup = incompleteTuples[nextpropname];
                }
                tup.push(nextval);
                if (tup.length==nextprop.type().cardinality) {
                    if (nextprop.multiplicity == PROTO.repeated) {
                        values[nextpropname].push(tup);
                    } else {
                        values[nextpropname] = nextprop.type().Convert(tup);
                    }
                    incompleteTuples[nextpropname] = undefined;
                }
            } else if (nextprop.multiplicity === PROTO.repeated) {
                values[nextpropname].push(nextval);
            } else {
                values[nextpropname] = nextprop.type().Convert(nextval);
            }
        }
    }
};

/*
    var str = '{';
    for (var key in property) {
        str+=key+': '+property[key]+', ';
    }
    str+='}';
    throw str;
*/

PROTO.serializeTupleProperty = function(property, stream, value) {
    var fid = property.id;
    var wiretype = property.type().wiretype;
    var wireId = fid * 8 + wiretype;
//    console.log("Serializing property "+fid+" as "+wiretype+" pos is "+stream.write_pos_);
    if (property.options.packed) {
        var bytearr = new Array();
        // Don't know length beforehand.
        var bas = new PROTO.ByteArrayStream(bytearr);
        if (property.multiplicity == PROTO.repeated) {
            for (var i = 0; i < value.length; i++) {
                var val = property.type().Convert(value[i]);
                for (var j=0;j<property.type().cardinality;++j) {
                    property.type().SerializeToStream(val[j], bas);
                }
            }
        }else {
            var val = property.type().Convert(value);
            for (var j=0;j<property.type().cardinality;++j) {
                property.type().SerializeToStream(val[j], bas);
            }
        }
        wireId = fid * 8 + PROTO.wiretypes.lengthdelim;
        PROTO.int32.SerializeToStream(wireId, stream);
        PROTO.bytes.SerializeToStream(bytearr, stream);
    } else {
        if (property.multiplicity == PROTO.repeated) {
            for (var i = 0; i < value.length; i++) {
                var val = property.type().Convert(value[i]);
                for (var j=0;j<property.type().cardinality;++j) {
                    PROTO.int32.SerializeToStream(wireId, stream);
                    property.type().SerializeToStream(val[j], stream);
                }
            }
        }else {
            var val = property.type().Convert(value);
            for (var j=0;j<property.type().cardinality;++j) {
                PROTO.int32.SerializeToStream(wireId, stream);
                property.type().SerializeToStream(val[j], stream);
            }
        }
    }
};
PROTO.serializeProperty = function(property, stream, value) {
    var fid = property.id;
    if (!property.type()) return;
    if (property.type().cardinality>1) {
        PROTO.serializeTupleProperty(property,stream,value);
        return;
    }
    var wiretype = property.type().wiretype;
    if (property.type().composite) {
        wiretype = PROTO.wiretypes.lengthdelim;
    }
    var wireId = fid * 8 + wiretype;
//    console.log("Serializing property "+fid+" as "+wiretype+" pos is "+stream.write_pos_);
    if (property.multiplicity == PROTO.repeated) {
        if (property.options.packed) {
            var bytearr = new Array();
            // Don't know length beforehand.
            var bas = new PROTO.ByteArrayStream(bytearr);
            for (var i = 0; i < value.length; i++) {
                var val = property.type().Convert(value[i]);
                property.type().SerializeToStream(val, bas);
            }
            wireId = fid * 8 + PROTO.wiretypes.lengthdelim;
            PROTO.int32.SerializeToStream(wireId, stream);
            PROTO.bytes.SerializeToStream(bytearr, stream);
        } else {
            for (var i = 0; i < value.length; i++) {
                PROTO.int32.SerializeToStream(wireId, stream);
                var val = property.type().Convert(value[i]);
                property.type().SerializeToStream(val, stream);
            }
        }
    } else {
        PROTO.int32.SerializeToStream(wireId, stream);
        var val = property.type().Convert(value);
        property.type().SerializeToStream(val, stream);
    }
};


PROTO.Message = function(name, properties) {
    var Composite = function() {
        this.properties_ = Composite.properties_;
        if (!PROTO.DefineProperty) {
            this.values_ = this;
        } else {
            this.values_ = {};
        }
        this.has_fields_ = {};
        this.Clear();
        this.message_type_ = name;
    };
    Composite.properties_ = {};
    for (var key in properties) {
        // HACK: classes are currently included alongside properties.
        if (properties[key].isType) {
            Composite[key] = properties[key];
        } else {
            Composite.properties_[key] = properties[key];
        }
    }
    Composite.isType = true;
    Composite.composite = true;
    Composite.IsInitialized = function(value) {
        return value && value.IsInitialized();
    };
    Composite.Convert = function Convert(val) {
        if (!(val instanceof Composite)) {
            throw "Value not instanceof "+name+": "+typeof(val)+" : "+val;
        }
        return val;
    };
    Composite.SerializeToStream = function(value, stream) {
        var bytearr = new Array();
        var bas = new PROTO.ByteArrayStream(bytearr)
        value.SerializeToStream(bas);
        return PROTO.bytes.SerializeToStream(bytearr, stream);
    };
    Composite.ParseFromStream = function(stream) {
        var bytearr = PROTO.bytes.ParseFromStream(stream);
        var bas = new PROTO.ByteArrayStream(bytearr);
        var ret = new Composite;
        ret.ParseFromStream(bas);
        return ret;
    };
    Composite.prototype = {
        computeHasFields: function computeHasFields() {
            for (var key in this.properties_) {
                if (this.HasField(key)) {
                    this.has_fields_[key] = true;
                } else {
                    delete this.has_fields_[key];
                }
            }
        },
        Clear: function Clear() {
            for (var prop in this.properties_) {
                this.ClearField(prop);
            }
        },
        IsInitialized: function IsInitialized() {
            for (var key in this.properties_) {
                if (this.values_[key] !== undefined) {
                    var descriptor = this.properties_[key];
                    if (!descriptor.type()) continue;
                    if (descriptor.multiplicity == PROTO.repeated) {
                        if (PROTO.array.IsInitialized(this.values_[key])) {
                            return true;
                        }
                    } else {
                        if (!descriptor.type().IsInitialized ||
                            descriptor.type().IsInitialized(this.values_[key]))
                        {
                            return true;
                        }
                    }
                }
            }
            return false;
        },
        ParseFromStream: function Parse(stream) {
            this.Clear();
            this.MergeFromStream(stream);
        },
        MergeFromStream: function Merge(stream) {
            PROTO.mergeProperties(this.properties_, stream, this.values_);
        },
        SerializeToStream: function Serialize(outstream) {
            this.computeHasFields();
            for (var key in this.has_fields_) {
                var val = this.values_[key];
                PROTO.serializeProperty(this.properties_[key], outstream, val);
            }
        },
        // Not implemented:
        // CopyFrom, MergeFrom, SerializePartialToX,
        // RegisterExtension, Extensions, ClearExtension
        ClearField: function ClearField(propname) {
            var descriptor = this.properties_[propname];
            delete this.has_fields_[propname];
            if (descriptor.multiplicity == PROTO.repeated) {
                this.values_[propname] = new PROTO.array(descriptor);
            } else {
                var type = descriptor.type();
                if (type && type.composite) {
                    this.values_[propname] = new type();
                } else {
                    delete this.values_[propname];
                }
            }
        },
        ListFields: function ListFields() {
            ret = [];
            for (var f in this.has_fields_) {
                ret.push(f);
            }
            return ret;
        },
        GetField: function GetField(propname) {
            //console.log(propname);
            if (this.values_[propname] === undefined) {
                this.ClearField(propname);
            }
            return this.values_[propname];
        },
        SetField: function SetField(propname, value) {
            //console.log(propname+"="+value);
            if (value === undefined) {
                this.ClearField(propname);
            } else {
                var prop = this.properties_[propname];
                if (prop.multiplicity == PROTO.repeated) {
                    this.ClearField(propname);
                    for (var i = 0; i < value.length; i++) {
                        this.values_[propname].append(i);
                    }
                } else {
                    this.values_[propname] = prop.type().Convert(value);
                }
                this.has_fields_[propname] = true;
            }
        },
        HasField: function HasField(propname) {
            if (this.values_[propname] !== undefined) {
                var descriptor = this.properties_[propname];
                if (!descriptor.type()) {
                    return false;
                }
                if (descriptor.multiplicity == PROTO.repeated) {
                    return PROTO.array.IsInitialized(this.values_[propname]);
                } else {
                    if (!descriptor.type().IsInitialized ||
                        descriptor.type().IsInitialized(
                            this.values_[propname]))
                    {
                        return true;
                    }
                }
            }
            return false;
        },
        formatValue: function(level, spaces, propname, val) {
            var str = spaces + propname;
            var type = this.properties_[propname].type();
            if (type.composite) {
                str += " " + val.toString(level+1);
            } else if (typeof val == 'string') {
                var myval = val;
                myval = myval.replace("\"", "\\\"")
                             .replace("\n", "\\n")
                             .replace("\r","\\r");
                str += ": \"" + myval + "\"\n";
            } else if (type.toString) {
                var myval = type.toString(val);
                str += ": " + myval + "\n";
            } else {
                str += ": " + val + "\n";
            }
            return str;
        },
        toString: function toString(level) {
            var spaces = "";
            var str = "";
            if (level) {
                str = "{\n";
                for (var i = 0 ; i < level*2; i++) {
                    spaces += " ";
                }
            } else {
                level = 0;
            }
            for (var propname in this.properties_) {
                if (!this.properties_[propname].type()) {
                    continue; // HACK:
                }
                if (!this.HasField(propname)) {
                    continue;
                }
                if (this.properties_[propname].multiplicity == PROTO.repeated) {
                    var arr = this.values_[propname];
                    for (var i = 0; i < arr.length; i++) {
                        str += this.formatValue(level, spaces, propname, arr[i]);
                    }
                } else {
                    str += this.formatValue(level, spaces, propname,
                                            this.values_[propname]);
                }
            }
            if (level) {
                str += "}\n";
            }
            return str;
        },
    };
    if (PROTO.DefineProperty !== undefined) {
        for (var prop in Composite.properties_) {
            (function(prop){
            PROTO.DefineProperty(Composite.prototype, prop,
                           function GetProp() { return this.GetField(prop); },
                           function SetProp(newval) { this.SetField(prop, newval); });
            })(prop);
        }
    }
    return Composite;
};

PROTO.Enum = function (name, values, bits) {
    if (!bits) {
        bits = 32;
    }
    var reverseValues = {};
     enumobj = {};
    enumobj.isType = true;
    for (var key in values) {
        reverseValues[values[key] ] = key;
        enumobj[key] = values[key];
        enumobj[values[key]] = key;
    }
    enumobj.values = values;
    enumobj.reverseValues = reverseValues;

    enumobj.Convert = function Convert(s) {
        if (typeof s == 'number') {
            // (reverseValues[s] !== undefined)
            return s;
        }
        if (values[s] !== undefined) {
            return values[s]; // Convert string -> int
        }
        throw "Not a valid "+name+" enumeration value: "+s;
    };
    enumobj.toString = function toString(num) {
        if (reverseValues[num]) {
            return reverseValues[num];
        }
        return "" + num;
    };
    enumobj.ParseFromStream = function(a,b) {
        var e = PROTO.int32.ParseFromStream(a,b);
        return e;
    }
    enumobj.SerializeToStream = function(a,b) {
        return PROTO.int32.SerializeToStream(a,b);
    }
    enumobj.wiretype = PROTO.wiretypes.varint;

    return enumobj;
};
PROTO.Flags = function(bits, name, values) {
    return PROTO.Enum(name, values, bits);
};

PROTO.Extend = function(parent, newproperties) {
    for (var key in newproperties) {
        parent.properties_[key] = newproperties[key];
    }
    return parent;
};

//////// DEBUG
if (typeof(console)=="undefined") console = {};
if (typeof(console.log)=="undefined") console.log = function(message){
    if (document && document.body)
        document.body.appendChild(document.createTextNode(message+"..."));
};

