


var PROTO = {};

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
    convertToUnsigned: function() {
        var local_lsw;
        if (this.sign<0) {
            local_lsw=this.lsw+2147483647;
        }else {
            local_lsw=this.lsw;
        }
        var local_msw;
        if (this.sign<0) {
            local_msw=this.msw+2147483647;
        }else {
            local_msw=this.msw;
        }
        return new PROTO.I64(local_msw,local_lsw,1);
    },
    convertToZigzag: function() {
        var local_lsw;
        if (this.sign<0) {
            local_lsw=this.lsw*2-1;
        }else {
            local_lsw=this.lsw*2;
        }
        var local_msw=this.msw*2+((local_lsw>2147483647)?1:0);
        return new PROTO.I64(local_msw,local_lsw,1);
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
    serializeToLEBase128: function() {
        var arr = new Array(8);
        var temp=this.lsw;
        for (var i = 0; i < 4; i++) {
            arr[i] = (temp&127);
            temp=(temp>>7);
        }
        
        arr[4] = (temp&15) | ((this.msw&7)<<4);
        temp=this.msw;
        temp=(temp>>3);
        for (var i = 5; i < 9; i++) {
            arr[i] = (temp&127);
            temp=(temp>>7);
        }
        return arr;
    },
    unsigned_add:function(other) {
        var temp=this.lsw+other.lsw;
        var local_msw=this.msw+other.msw;
        var local_lsw=temp&4294967295;
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
    var lsw = (mynum&4294967295);
    var msw = ((mynum-lsw)/4294967296);
    return new PROTO.I64(msw, lsw, sign);
};

PROTO.I64.from32pair = function(msw, lsw, sign) {
    return new PROTO.I64(msw, lsw, sign);
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
        r[r.length] = n;
        return (this.bigEndian ? r.reverse() : r);
    };
    p.encodeInt = function(number, bits, signed){
        var max = Math.pow(2, bits), r = [];
        (number >= max || number < -(max >> 1)) && this.warn("encodeInt::overflow") && (number = 0);
        number < 0 && (number += max);
        for(; number; r[r.length] = String.fromCharCode(number % 256), number = Math.floor(number / 256));
        for(bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0");
        return (this.bigEndian ? r.reverse() : r).join("");
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
PROTO.array =
    (function() {
        var SUPER = Array;
        function ProtoArray(datatype) {
            this.datatype_ = datatype
        };
        ProtoArray.IsInitialized = function IsInitialized(val) {
            return val.length > 0;
        }
        ProtoArray.prototype = new SUPER();
        ProtoArray.prototype.append = function add(value) {
            if (value === undefined) {
                var newval = new this.datatype_;
                if (this.datatype_.composite) {
                    this.add(newval);
                    return newval;
                } else {
                    throw "Called add(undefined) for a non-composite";
                }
            }
            SUPER.append(this.datatype_.valueOf(value));
        }
        return ProtoArray;
    })();

PROTO.string = {

    // SEE: http://www.webtoolkit.info/javascript-utf8.html

    valueOf: function(str) {
        return String.valueOf(str);
    },
    IsInitialized: function(str) {
        return (str !== undefined);
    }
};

PROTO.bytes = {
    valueOf: function(stream) {
        if (stream instanceof Stream) {
            return stream;
        } else {
            throw "Not a Stream: "+stream;
        }
    },
    IsInitialized: function(str) {
        return (str !== undefined);
    }
};

/* [s]fixed64 may be constrained by the accuracy of doubles.
   Fixme: perhaps an array of two 32-bit integers is necessary? or a hex string?
 */
(function() {
    function makeclass(bits, allowSigned) {
        var myclass = {
            valueOf: function(str) {
                var n = parseInt(str);
                if (n == NaN) {
                    throw "not a number: "+str;
                }
                if (!allowSigned && n < 0) {
                    throw "fixed"+bits+" does not allow negative: "+n;
                }
                if (bits == 32) {
                    if (allowSigned && (n > 2147483647 || n < -2147483648)) {
                        throw "sfixed32 out of bounds: "+n;
                    }
                    if (!allowSigned && (n > 4294967295)) {
                        throw "fixed32 out of bounds: "+n;
                    }
                    // bounds for 64-bit not well defined if using doubles internally.
                }
                return n;
            },
            IsInitialized: function(n) {
                return (n !== undefined);
            }
        };
        return myclass;
    }
    PROTO.sfixed32 = makeclass(32, true);
    PROTO.fixed32 = makeclass(32, false);
    PROTO.sfixed64 = makeclass(64, true);
    PROTO.fixed64 = makeclass(64, false);
})();

(function() {
    function makeclass(bits, allowSigned, efficientSigned) {
        var myclass = {
            valueOf: function(str) {
                var n = parseInt(str);
                if (n == NaN) {
                    throw "not a number: "+str;
                }
                return n;
            },
            IsInitialized: function(n) {
                return (n !== undefined);
            },
            SerializeToStream: function(thisVal, stream) {
            }
        };
        return myclass;
    }
    PROTO.int32 = makeclass(32, true, false);
    PROTO.int64 = makeclass(64, true, false);
    PROTO.sint32 = makeclass(32, true, true);
    PROTO.sint64 = makeclass(64, true, true);
    PROTO.uint32 = makeclass(32, false);
    PROTO.uint64 = makeclass(64, false);
})();

PROTO.bool = {
    valueOf: function(bool) {
        if (bool) {
            return true;
        } else {
            return false;
        }
    },
    IsInitialized: function(b) {
        return (b !== undefined);
    },
    SerializeToStream: PROTO.uint32.SerializeToStream,
    ParseFromStream: PROTO.uint32.ParseFromStream,
};


(function() {
    function makeclass(bits) {
        var myclass = {
            valueOf: function(str) {
                var n = parseFloat(str);
                if (n == NaN) {
                    throw "not a number: "+str;
                }
                return n;
            },
            IsInitialized: function(n) {
                return (n !== undefined);
            }
        };
        return myclass;
    }
    PROTO.float32 = makeclass(32); // Not called "float" because it is a keyword.
    PROTO.float64 = makeclass(64); // Not called "double" because it is a keyword.
})();

PROTO.Message = function(name, properties) {
    Composite = function() {
        this.properties_ = properties;
        this.message_type_ = name;
        if (!DefineProperty) {
            this.values_ = this;
        } else {
            this.values_ = {};
        }
        this.has_fields_ = {};
        this.Clear();
    };
    Composite.composite = true
    Composite.IsInitialized = function(prop, value) {
        return prop.IsInitialized(value);
    }
    Composite.valueOf = function valueOf(val) {
        if (!(val instanceof Composite)) {
            throw "Value not instanceof "+name+": "+val;
        }
        return val;
    }
    Composite.prototype = {
        Clear: function Clear() {
            for (var prop in this.values_) {
                ClearField(prop);
            }
        },
        IsInitialized: function IsInitialized() {
            for (var key in this.properties_) {
                if (this.values_[key] !== undefined) {
                    var descriptor = this.properties_[key];
                    if (descriptor.number == PROTO.repeated) {
                        if (PROTO.array.IsInitialized(this.values_[key])) {
                            return true;
                        }
                    } else {
                        if (descriptor.type.IsInitialized(this.values_[key])) {
                            return true;
                        }
                    }
                }
            }
            return false;
        },
        ParseFromStream: function Parse(stream) {
            this.Clear();
            this.Merge(stream);
        },
        MergeFromStream: function Merge(stream) {
            PROTO.mergeProperties(this.properties_, stream, this.values_);
        },
        SerializeToStream: function Serialize(outstream) {
            PROTO.serializeProperties(this.properties_, stream, this.values_);
        },
        // Not implemented:
        // CopyFrom, MergeFrom, RegisterExtension, SerializePartialToX, IsInitialized??, Extensions, ClearExtension
        ClearField: function ClearField(propname) {
            var descriptor = this.properties_[propname];
            if (descriptor.number == PROTO.repeated) {
                this.values_[propname] = new PROTO.ProtoArray(this.properties_[propname]);
            } else {
                if (descriptor.type.composite) {
                    this.values_[propname] = new this.properties_[propname].type;
                } else {
                    this.values_[propname] = undefined;
                }
            }
            this.has_fields_[propname] = undefined;
        },
        ListFields: function ListFields() {
            ret = [];
            for (var f in this.has_fields_) {
                ret.append(f);
            }
            return ret;
        },
        GetField: function GetField(propname) {
            return this.properties_[propname];
        },
        SetField: function SetField(propname, value) {
            if (value === undefined) {
                ClearField(this.values_[propname]);
            } else {
                this.values_[propname] = this.datatype_.valueOf(value);
                this.has_fields_[propname] = true;
            }
        },
        HasField: function HasField(propname) {
            if (this.values_[propname] !== undefined) {
            }
        },
        toString: function toString(level) {
            var spaces = "";
            var str = "";
            if (level) {
                str = "{\n";
                for (var i = 0 ; i < level*2; i++) {
                    spaces += " ";
                }
            }
            for (propname in this.has_fields_) {
                str += spaces + propname;
                if (this.properties_[propname].type.composite) {
                    str += " " + this.values_[propname].toString(level+1);
                } else if (typeof this.values_[propname] == 'string') {
                    var myval = this.values_[propname];
                    myval = myval.replace("\"", "\\\"").replace("\n", "\\n").replace("\r","\\r");
                    str += ": \"" + myval + "\"\n";
                } else {
                    str += ": " + this.values_[propname].toString() + "\n";
                }
            }
            if (level) {
                str += "}\n";
            }
        },
    };
    if (DefineProperty) {
        for (var prop in this.properties_) {
            DefineProperty(Composite, prop,
                           function() { this.GetField(prop); },
                           function(newval) { this.SetField(prop, newval); });
        }
    }
    return Composite;
}


PROTO.Enum = function (name, values) {
    var reverseValues = {};
    for (var key in values) {
        reversevalues[values[key] ] = key;
    }
    var enumobj = {
        valueOf : function valueOf(s) {
            if (typeof s == 'number') {
                // (reverseValues[s] !== undefined)
                return s;
            }
            if (values[s] !== undefined) {
                return values[s]; // Convert string -> int
            }
            throw "Not a valid "+name+" enumeration value: "+s;
        },
        IsInitialized: function IsInitialized(s) {
            return s !== undefined;
        }
    };
    return enumobj;
}

