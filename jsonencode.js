
function encode(json) {
    out = "";
    if (typeof json == "object") {
        if (typeof json.length == typeof 0) {
            out += "[";
            for (var i = 0; i < json.length; i++) {
                if (i != 0) {
                    out += ", ";
                }
                out += encode(json[i]);
            }
            out += "]";
        } else {
            out += "{";
            var comma = "";
            for (var key in json) {
                out += comma + '\"' + escape(key).replace(/%/g,'\\u00') + '\"';
                out += " : " + encode(json[key]);
                comma = ", ";
            }
            out += "}";
        }
    } else if (typeof json == "string") {
        out += '\"' + escape(json).replace(/%/g,'\\u00') + '\"';
    } else {
        out += json;
    }
    return out;
}
