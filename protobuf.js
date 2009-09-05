


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
};

PROTO.I64.fromNumber = function(mynum) {
    var sign = (mynum < 0) ? -1 : 1;
    mynum *= sign;
    var lsw = (mynum&4294967295);
    var msw = ((mynum-(mynum&4294967295))/4294967296);
    return new PROTO.I64(msw, lsw, sign);
};

PROTO.I64.from32pair = function(msw, lsw, sign) {
    return new PROTO.I64(msw, lsw, sign);
};


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

