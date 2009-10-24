//var PBJ = {};


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
                throw "Vector in invalid format";
            }
        },
        wiretype: datatype.wiretype,
        SerializeToStream: datatype.SerializeToStream,
        ParseFromStream: datatype.ParseFromStream,
        cardinality:num          
    };
};

//PBJ.vector2d=vectorGenerator(2,PROTO.double);