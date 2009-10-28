if (PBJ === undefined) {
    var PBJ = {};
}

function vectorGenerator(num,datatype) {
    return {
        Convert:function (vec) {
            if (vec instanceof Array && vec.length==num) {
                return vec;
            } else if (num==2&&vec.x!==undefined && vec.y!==undefined){
                return [vec.x,vec.y];
            } else if (num==3&&vec.x!==undefined && vec.y!==undefined && vec.z!==undefined){
                return [vec.x,vec.y,vec.z];
            } else if (num==4&&vec.x!==undefined && vec.y!==undefined && vec.z!==undefined,vec.w!==undefined){
                return [vec.x,vec.y,vec.z,vec.w];
            } else {
                Vector_in_invalid_format.x;
            }
        },
        wiretype: datatype.wiretype,
        SerializeToStream: datatype.SerializeToStream,
        ParseFromStream: datatype.ParseFromStream,
        cardinality:num          
    };
};

PBJ.vector2d=vectorGenerator(2,PROTO.double);
PBJ.vector2f=vectorGenerator(2,PROTO.float);

PBJ.vector3d=vectorGenerator(3,PROTO.double);
PBJ.vector3f=vectorGenerator(3,PROTO.float);

PBJ.vector4d=vectorGenerator(4,PROTO.double);
PBJ.vector4f=vectorGenerator(4,PROTO.float);

PBJ.normal=vectorGenerator(2,PROTO.float);
PBJ.quaternion=vectorGenerator(3,PROTO.float);

PBJ.duration = PROTO.sfixed64;
PBJ.time = PROTO.fixed64;
