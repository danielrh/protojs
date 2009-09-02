!Sirikata && Sirikata = {};
!Sirikata.Protocol && Sirikata.Protocol = {};


Sirikata.Protocol.NewObj = PROTO.Message("NewObj", {
        object_uuid_evidence: {
            number: PROTO.optional,
            type: PBJ.uuid,
            id: 2},
        requested_object_loc: {
            number: PROTO.optional,
            type: Sirikata.Protocol.ObjLoc,
            id: 3},
        bounding_sphere: {
            number: PROTO.optional,
            type: PBJ.boundingsphere3f,
            id: 4},
    });
Sirikata.Protocol.MessageBody = PROTO.Message({
        message_names: {
            number: PROTO.repeated,
            type: PROTO.string,
            id: 7},
    });
