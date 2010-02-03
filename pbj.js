var PBJ = {};

function vectorGenerator(num,datatype) {
    return {
        Convert:function Convert(vec) {
            if (vec instanceof Array && vec.length==num) {
                return vec;
            } else if (num==2&&vec.x!==undefined && vec.y!==undefined){
                return [vec.x,vec.y];
            } else if (num==3&&vec.x!==undefined && vec.y!==undefined && vec.z!==undefined){
                return [vec.x,vec.y,vec.z];
            } else if (num==4&&vec.x!==undefined && vec.y!==undefined && vec.z!==undefined&&vec.w!==undefined){
                return [vec.x,vec.y,vec.z,vec.w];
            } else {
                console.error("Vector_in_invalid_format: "+vec+"; expect "+num+" elements.");
                return new Array(num);
            }
        },
        toString: function toString(vec) {
            var ret = '<'+vec[0];
            for (var i = 1; i < num; i++) {
                ret += ', '+vec[i];
            }
            ret += '>';
            return ret;
        },
        wiretype: datatype.wiretype,
        SerializeToStream: datatype.SerializeToStream,
        ParseFromStream: datatype.ParseFromStream,
        cardinality:num          
    };
};

PBJ.vector2d=vectorGenerator(2,PROTO.Double);
PBJ.vector2f=vectorGenerator(2,PROTO.Float);

PBJ.vector3d=vectorGenerator(3,PROTO.Double);
PBJ.vector3f=vectorGenerator(3,PROTO.Float);

PBJ.vector4d=vectorGenerator(4,PROTO.Double);
PBJ.vector4f=vectorGenerator(4,PROTO.Float);

PBJ.normal=vectorGenerator(2,PROTO.Float);
PBJ.quaternion=vectorGenerator(3,PROTO.Float);

PBJ.duration = PROTO.sfixed64;

PBJ.time = PROTO.clone(PROTO.fixed64)
PBJ.time.toString = function(arg) {
    var us1970Approx = arg.toNumber();
    var ms1970 = Math.floor(us1970Approx/1000);
    var sec1970 = Math.floor(us1970Approx/1000000);
    var us = arg.sub(PROTO.I64.fromNumber(sec1970*1000000)).toNumber();
    if (us < 0) { us += 1000000; }
    return "[" + new Date(ms1970).toUTCString() + "]." +
        (1000000+us).toString().substr(1);
}

PBJ.sha256 = PROTO.clone(PROTO.bytes);
PBJ.sha256.toString = function(arg) {
    var str = '';
    for (var i = 0; i < arg.length; i++) {
        str += (256+arg[i]).toString(16).substr(1);
    }
    return str;
}

PBJ.uuid = PROTO.clone(PROTO.bytes);
PBJ.uuid.toString = function(arg) {
    var str = '';
    for (var i = 0; i < arg.length; i++) {
        if (i == 4 || i == 6 || i == 8 || i == 10) {
            str += '-'
        }
        str += (256+arg[i]).toString(16).substr(1);;
    }
    return str;
}

PBJ.angle = PROTO.Float;

PBJ.boundingsphere3f=vectorGenerator(4,PROTO.Float);
PBJ.boundingsphere3d=vectorGenerator(4,PROTO.Double);
PBJ.boundingbox3f3f=vectorGenerator(6,PROTO.Float);
PBJ.boundingbox3d3f=vectorGenerator(6,PROTO.Double);
