/*  ProtoJS Parsing Grammar
 *  ProtoJS.g
 *
 *  Copyright (c) 2009, Daniel Reiter Horn
 *  All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are
 *  met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of Sirikata nor the names of its contributors may
 *    be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

grammar ProtoJS;

options
{
    output = AST;
    language = C;
    ASTLabelType = pANTLR3_BASE_TREE;
}

tokens
{
    PROTO;
}

scope NameSpace {
    struct LanguageOutputStruct* output;
    pANTLR3_STRING filename;
    pANTLR3_STRING externalNamespace;
    pANTLR3_STRING internalNamespace;
    pANTLR3_STRING package;
    pANTLR3_STRING packageDot;
    pANTLR3_STRING jsPackageDefinition;
    pANTLR3_LIST imports;
    pANTLR3_HASH_TABLE qualifiedTypes;
    void*parent;
}

scope Symbols {
    pANTLR3_STRING message;
    pANTLR3_LIST required_advanced_fields;
    pANTLR3_HASH_TABLE types;
    pANTLR3_HASH_TABLE flag_sizes;
    pANTLR3_HASH_TABLE enum_sizes;
    pANTLR3_HASH_TABLE flag_values;
    pANTLR3_HASH_TABLE flag_all_on;
    pANTLR3_HASH_TABLE enum_values;
    int *reserved_range_start;
    int *reserved_range_end;
    int num_reserved_ranges;
    int *extension_range_start;
    int *extension_range_end;
    int num_extension_ranges;
    struct CsStreams *cs_streams;
}

@members {
    #include "ProtoJSParseUtil.h"
}
protocol
    scope Symbols;
    @init {
        initSymbolTable(SCOPE_TOP(Symbols),NULL,0);
    }
    : protoroot ->IDENTIFIER[$NameSpace::jsPackageDefinition->chars] protoroot
    ;

protoroot
    scope NameSpace;
    @init {
        initNameSpace(ctx,SCOPE_TOP(NameSpace));
    }
	:	(importrule|message)* (package (importrule|message)*)?
    {
    }
	;

package
    
    : ( PACKAGELITERAL packagename ITEM_TERMINATOR -> WS["\n"])
        {
            jsPackageDefine($NameSpace::jsPackageDefinition,$packagename.text);
        }
	;
packagename : QUALIFIEDIDENTIFIER 
    {
            definePackage( ctx, $QUALIFIEDIDENTIFIER.text);
    }
    ;
importrule
   :   ( IMPORTLITERAL STRING_LITERAL ITEM_TERMINATOR -> IMPORTLITERAL WS[" "] STRING_LITERAL ITEM_TERMINATOR WS["\n"] )
        {
            defineImport( ctx, $STRING_LITERAL.text );
        }
	;


message
    scope {
        int isExtension;
        pANTLR3_STRING messageName;
    }
    :   ( message_or_extend message_identifier BLOCK_OPEN message_elements BLOCK_CLOSE 
           -> {ctx->pProtoJSParser_SymbolsStack_limit<=1}?
                  IDENTIFIER[$NameSpace::packageDot->chars] message_identifier WS[" "] EQUALS["="] WS[" "] QUALIFIEDIDENTIFIER["PROTO.Message"] PAREN_OPEN["("] QUOTE["\""] message_identifier QUOTE["\""] COMMA[","] BLOCK_OPEN WS["\n"] message_elements BLOCK_CLOSE PAREN_CLOSE[")"] ITEM_TERMINATOR[";"] WS["\n"]
                  -> message_identifier WS[" "] COLON[":"] WS[" "] QUALIFIEDIDENTIFIER["PROTO.Message"] PAREN_OPEN["("] QUOTE["\""] message_identifier QUOTE["\""] COMMA[","] BLOCK_OPEN WS["\n"] message_elements BLOCK_CLOSE PAREN_CLOSE[")"] COMMA[","] WS["\n"] )
        {
            if(!$message::isExtension) {
                defineType( ctx, $message::messageName ,TYPE_ISMESSAGE);
            }
            stringFree($message::messageName);
        }
	;

message_or_extend : 
        MESSAGE {$message::isExtension=0;}
        |
        EXTEND {$message::isExtension=1;}
        ;

message_identifier
    : IDENTIFIER
    {
        $message::messageName=stringDup($IDENTIFIER.text);
        if ($message::isExtension) {
            defineExtension(ctx, $message::messageName);
        }else {
            defineMessage(ctx, $message::messageName);
        }
    }
    ;

message_elements
    scope Symbols;
    @init
    {
        initSymbolTable(SCOPE_TOP(Symbols), $message::messageName, $message::isExtension);  
    }
	:	message_element*
    {
        if($message::isExtension) {
            defineExtensionEnd(ctx, $message::messageName);
        }else {
            defineMessageEnd(ctx, $message::messageName);
        }
    }
    ;

message_element
	:	field
	|	message
	|	enum_def
	|	flags_def
    |   extensions
    |   reservations
	;

extensions
        : 
        ( EXTENSIONS integer TO integer_inclusive ITEM_TERMINATOR -> WS["\n"] ) //WS["\t"] EXTENSIONS WS[" "] integer WS[" "] TO WS[" "] integer_inclusive ITEM_TERMINATOR WS["\n"] 
        {
            defineExtensionRange(ctx, $integer.text, $integer_inclusive.text);
        }
        ;

reservations : (RESERVE integer TO integer_inclusive ITEM_TERMINATOR -> )
        {
            defineReservedRange(ctx, $integer.text, $integer_inclusive.text);
        }
        ;

integer_inclusive : integer 
        {
            
        }
        ;

enum_def
    scope {
        pANTLR3_STRING enumName;
        pANTLR3_LIST enumList;
    }
    @init {
        $enum_def::enumList=antlr3ListNew(1);
    }
	:	( ENUM enum_identifier BLOCK_OPEN enum_element+ BLOCK_CLOSE -> WS["\t"] enum_identifier COLON[":"] WS[" "] BLOCK_OPEN WS["\n"] (WS["\t"] enum_element)+ WS["\t"] BLOCK_CLOSE COMMA[","]WS["\n"] )
        {
            defineEnum( ctx, $message::messageName, $enum_def::enumName, $enum_def::enumList);
            $enum_def::enumList->free($enum_def::enumList);
            stringFree($enum_def::enumName);
        }
	;

enum_element
	:	(IDENTIFIER EQUALS integer ITEM_TERMINATOR -> WS["\t"] IDENTIFIER WS[" "] COLON[":"] integer COMMA[","] WS["\n"] )
        {
            defineEnumValue( ctx, $message::messageName, $enum_def::enumName, $enum_def::enumList, $IDENTIFIER.text, $integer.text );
        }
	;
enum_identifier
    : IDENTIFIER
      {
            $enum_def::enumName=stringDup($IDENTIFIER.text);
      }
      ;

flags_def
    scope
    {
        pANTLR3_STRING flagName;
        pANTLR3_LIST flagList;
        int flagBits;
    }
    @init {
        $flags_def::flagList=antlr3ListNew(1);
        
    }
	:	( flags flag_identifier BLOCK_OPEN flag_element+ BLOCK_CLOSE -> WS["\t"] flag_identifier COLON[":"] WS[" "] BLOCK_OPEN WS["\n"] (WS["\t"] flag_element)+ WS["\t"] BLOCK_CLOSE COMMA[","] WS["\n"] )
        {
            defineFlag( ctx, $message::messageName, $flags_def::flagName, $flags_def::flagList, $flags_def::flagBits);
            $flags_def::flagList->free($flags_def::flagList);
            stringFree($flags_def::flagName);
        }
	;

flag_identifier 
	:	IDENTIFIER
        {
            $flags_def::flagName=stringDup($IDENTIFIER.text);
        }
	;

flag_element
	:	( IDENTIFIER EQUALS integer ITEM_TERMINATOR -> WS["\t"] IDENTIFIER WS[" "] COLON[":"] WS[" "] integer COMMA[","] WS["\n"])
        {
            defineFlagValue( ctx, $message::messageName, $flags_def::flagName, $flags_def::flagList, $IDENTIFIER.text , $integer.text);
        }
	;

field
    scope{
        pANTLR3_STRING fieldType;
        pANTLR3_STRING fieldName;
        ///protobuf value if it is an advanced_type or default kind of type...  C++ value if it's a multiplicitve type
        pANTLR3_STRING defaultValue;
        int fieldOffset;
        int isNumericType;
    }
    @init {$field::defaultValue=NULL; $field::isNumericType=0;}
    :
      ( ( (ProtoJSOPTIONAL|REQUIRED|REPEATED) (multiplicitive_type|field_type) field_name EQUALS field_offset (default_value|none) ITEM_TERMINATOR )  
       -> WS["\t"] field_name COLON[":"] WS[" "] BLOCK_OPEN["{"] WS["\n\t\t"] IDENTIFIERCOLON["default_value:"] WS[" "] default_value none COMMA[","] WS["\n\t\t"] IDENTIFIERCOLON["multiplicity:"] WS[" "] QUALIFIEDIDENTIFIER["PROTO."] ProtoJSOPTIONAL REQUIRED REPEATED COMMA[","] WS["\n\t\t"] IDENTIFIERCOLON["type:"] WS[" "] IDENTIFIER["function"] PAREN_OPEN["("]PAREN_CLOSE[")"] BLOCK_OPEN["{"] IDENTIFIER["return"] WS[" "] multiplicitive_type field_type ITEM_TERMINATOR[";"] BLOCK_CLOSE["}"] COMMA[","] WS["\n\t\t"] IDENTIFIERCOLON["id:"] WS[" "] field_offset WS["\n\t"] BLOCK_CLOSE["}"] COMMA[","] WS["\n"])
    { 
        if (($REQUIRED||$REPEATED)&&$field::defaultValue&&$field::defaultValue->len) {
           fprintf(stderr,"ERROR on line BLEH: default not allowed for repeated or optional elements in field \%s : \%s\n",$field::fieldName->chars,$field::defaultValue->chars);
        }
        defineField(ctx, $field::fieldType,$field::fieldName,$field::defaultValue,$field::fieldOffset,$REPEATED==NULL,$REQUIRED!=NULL,0);
        stringFree($field::fieldName);
        stringFree($field::fieldType);
        stringFree($field::defaultValue);
    }
	;
none : (DOT?)->IDENTIFIER["null"] ;
field_offset
    : integer
    {
        
        $field::fieldOffset=atoi((char*)($integer.text->chars));
    }
    ;

field_name
    : IDENTIFIER
    {
        $field::fieldName=stringDup($IDENTIFIER.text);
    }
    ;

field_type
    : (numeric_type ->QUALIFIEDIDENTIFIER["PROTO."] numeric_type)
    {
        $field::isNumericType=1;
        $field::fieldType=stringDup($numeric_type.text);
    }
    | (array_type -> QUALIFIEDIDENTIFIER["PROTO."] array_type)
    {
        $field::isNumericType=0;
        $field::fieldType=stringDup($array_type.text);
    }
    | (advanced_numeric_type -> QUALIFIEDIDENTIFIER["PBJ."] advanced_numeric_type)
    {
       $field::isNumericType=1;
       $field::fieldType=stringDup($advanced_numeric_type.text);
    }
    | (advanced_array_type -> QUALIFIEDIDENTIFIER["PBJ."] advanced_array_type)
    {
       $field::isNumericType=0;
       $field::fieldType=stringDup($advanced_array_type.text);
    }
    | ( IDENTIFIER ->  IDENTIFIER[qualifyType( ctx, $IDENTIFIER.text )] )
    {
       $field::isNumericType=(isEnum(ctx,$IDENTIFIER.text)||
                              isFlag(ctx,$IDENTIFIER.text));
       $field::fieldType=stringDup($IDENTIFIER.text);
    }
    ;
multiplicitive_type
    : 
    (multiplicitive_advanced_type -> QUALIFIEDIDENTIFIER["PBJ."] multiplicitive_advanced_type)
    {
       $field::fieldType=stringDup($multiplicitive_advanced_type.text);        
    }
    ;

array_spec
	:	SQBRACKET_OPEN integer? SQBRACKET_CLOSE
	;

default_value
	:	(SQBRACKET_OPEN DEFAULT EQUALS default_literal_value SQBRACKET_CLOSE -> STRING_LITERAL[$default_literal_value.text->setS($default_literal_value.text,$field::defaultValue)])
    {

    }
	;
default_literal_value : literal_value
  {
        $field::defaultValue=defaultValuePreprocess(ctx, $field::fieldType, $literal_value.text);
  }
  ;

numeric_type:		UINT32
	|	INT32
	|	SINT32
	|	FIXED32
	|	SFIXED32
	|	UINT64
	|	INT64
	|	SINT64
	|	FIXED64
	|	SFIXED64
	|	FLOAT
	|	DOUBLE
	|	BOOL
	;
array_type:	STRING
	|	BYTES
	;

multiplicitive_advanced_type 
    :   NORMAL 
    |   VECTOR2F
    |   VECTOR2D
    |   VECTOR3F
    |   VECTOR3D
    |   VECTOR4F
    |   VECTOR4D
    |   QUATERNION 
    |   BOUNDINGSPHERE3F 
    |   BOUNDINGSPHERE3D 
    |   BOUNDINGBOX3F3F 
    |   BOUNDINGBOX3D3F 
    ;

advanced_numeric_type:	UINT8 
	|	INT8 
	|	SINT8
	|	FIXED8
	|	SFIXED8
	|	INT16 
	|	SINT16 
	|	FIXED16
	|	SFIXED16
    |   UINT16 
    |   ANGLE 
    |   TIME 
    |   DURATION 
    ; 

advanced_array_type:	   UUID 
    |   SHA256 
    ; 

literal_value
	:	HEX_LITERAL
    |   DECIMAL_LITERAL
    |   OCTAL_LITERAL
    |   FLOATING_POINT_LITERAL
    |   BOOL_LITERAL
    |   STRING_LITERAL
    ;

PACKAGELITERAL :    'package';
IMPORTLITERAL :     'import';

DOT :  '.';
// Message elements
MESSAGE	:	'message';
EXTEND	:	'extend';
EXTENSIONS : 'extensions';
RESERVE : 'reserve';
TO : 'to';
// Enum elements
ENUM	:	'enum';

flags : 
     FLAGS8
     {
        $flags_def::flagBits=8;
     }
     |
     FLAGS16
     {
        $flags_def::flagBits=16;
     }
     |
     FLAGS32
     {
        $flags_def::flagBits=32;
     }
     |
     FLAGS64
     {
        $flags_def::flagBits=64;
     }

     ;
// Flags elements
FLAGS8	:	'flags8';
FLAGS16	:	'flags16';
FLAGS32	:	'flags32';
FLAGS64	:	'flags64';

// Field elements
REQUIRED:	'required';
ProtoJSOPTIONAL:	'optional';
REPEATED:	'repeated';

DEFAULT	:	'default';


EQUALS	:	'=';

// Common block elements
BLOCK_OPEN	:	'{';
BLOCK_CLOSE	:	'}';

ITEM_TERMINATOR
	:	';';

// Type elements
UINT8	:	'uint8';
INT8	:	'int8';
SINT8	:	'sint8';
FIXED8	:	'fixed8';
SFIXED8	:	'sfixed8';
UINT16	:	'uint16';
INT16	:	'int16';
SINT16	:	'sint16';
FIXED16	:	'fixed16';
SFIXED16:	'sfixed16';
UINT32	:	'uint32';
INT32	:	'int32';
SINT32	:	'sint32';
FIXED32	:	'fixed32';
SFIXED32:	'sfixed32';
UINT64	:	'uint64';
INT64	:	'int64';
SINT64	:	'sint64';
FIXED64	:	'fixed64';
SFIXED64:	'sfixed64';
FLOAT	:	'float';
DOUBLE	:	'double';
BOOL	:	'bool';
BYTES   :   'bytes';
STRING   :   'string';

UUID : 'uuid';
SHA256 : 'sha256';
ANGLE : 'angle';
TIME : 'time';
DURATION : 'duration';
NORMAL : 'normal';
VECTOR2F : 'vector2f';
VECTOR2D : 'vector2d';
VECTOR3F : 'vector3f';
VECTOR3D : 'vector3d';
VECTOR4F : 'vector4f';
VECTOR4D : 'vector4d';
QUATERNION : 'quaternion';
BOUNDINGSPHERE3F : 'boundingsphere3f';
BOUNDINGSPHERE3D : 'boundingsphere3d';
BOUNDINGBOX3F3F : 'boundingbox3f3f';
BOUNDINGBOX3D3F : 'boundingbox3d3f';


SQBRACKET_OPEN	:	'[';
SQBRACKET_CLOSE	:	']';

integer
    : DECIMAL_LITERAL
    | HEX_LITERAL
    | OCTAL_LITERAL
    ;

STRING_LITERAL
    :  '"' STRING_GUTS '"'
    ;

fragment
STRING_GUTS :	( EscapeSequence | ~('\\'|'"') )* ;

BOOL_LITERAL
    : 'true'
    | 'false'
    ;

HEX_LITERAL : '0' ('x'|'X') HexDigit+ ;

DECIMAL_LITERAL : ('0' | '1'..'9' '0'..'9'*) ;

OCTAL_LITERAL : '0' ('0'..'7')+ ;

fragment
HexDigit : ('0'..'9'|'a'..'f'|'A'..'F') ;


FLOATING_POINT_LITERAL
    :   ('0'..'9')+ '.' ('0'..'9')* Exponent?
    |   '.' ('0'..'9')+ Exponent?
    |   ('0'..'9')+ Exponent
    ;

fragment
Exponent : ('e'|'E') ('+'|'-')? ('0'..'9')+ ;


fragment
EscapeSequence
    :   '\\' ('b'|'t'|'n'|'f'|'r'|'\"'|'\''|'\\')
    |   OctalEscape
    ;

fragment
OctalEscape
    :   '\\' ('0'..'3') ('0'..'7') ('0'..'7')
    |   '\\' ('0'..'7') ('0'..'7')
    |   '\\' ('0'..'7')
    ;

fragment
UnicodeEscape
    :   '\\' 'u' HexDigit HexDigit HexDigit HexDigit
    ;


IDENTIFIER : ('a'..'z' |'A'..'Z' |'_' ) ('a'..'z' |'A'..'Z' |'_' |'0'..'9' )* ;


QUALIFIEDIDENTIFIER : ('a'..'z' |'A'..'Z' |'_' ) ('a'..'z' |'A'..'Z' |'_' | '.' |'0'..'9' )* ;

IDENTIFIERCOLON : ('a'..'z' |'A'..'Z' |'_' ) ('a'..'z' |'A'..'Z' |'_' | '0'..'9' )* ':';

COMMENT	: '//' .* '\n' {$channel=HIDDEN;}
        | '/*' ( options {greedy=false;} : . )* '*/' {$channel=HIDDEN;}
        ;

WS       : (' '|'\t'|'\n'|'\r')+ {$channel=HIDDEN;} ;

PAREN_OPEN : '(' ;

PAREN_CLOSE : ')' ;

QUOTE : '"' ;

COMMA : ',' ;

COLON : ':' ;
