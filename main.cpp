extern "C" {
#include "ProtoJSParser.h"
#include "ProtoJSLexer.h"
#include "ProtoJSParseUtil.h"
}
#include <sstream>
#include <iostream>
#include <fstream>
char* parsePackage (const char*filename, const char * outputInternalNamespace, const char*outputExternalNamespace) {
    
    pANTLR3_INPUT_STREAM input = antlr3AsciiFileStreamNew((pANTLR3_UINT8)filename);

    if ( input == NULL ) {
        fprintf(stderr, "Failed to open file %s\n", (char *)filename);
        exit(1);
    }

    pProtoJSLexer lxr = ProtoJSLexerNew(input);
    if ( lxr == NULL ) {
        fprintf(stderr, "Unable to create the lexer due to malloc() failure1\n");
        exit(1);
    }

    pANTLR3_COMMON_TOKEN_STREAM tstream = antlr3CommonTokenStreamSourceNew(ANTLR3_SIZE_HINT, TOKENSOURCE(lxr));
    if (tstream == NULL) {
	fprintf(stderr, "Out of memory trying to allocate token stream\n");
	exit(1);
    }
    pProtoJSParser ctx;
    pProtoJSParser psr = ctx = ProtoJSParserNew(tstream);
    if (psr == NULL) {
        fprintf(stderr, "Out of memory trying to allocate parser\n");
        exit(ANTLR3_ERR_NOMEM);
    }
    SCOPE_TYPE(NameSpace) ns=NameSpacePush(ctx);
    ctx->pProtoJSParser_NameSpaceTop=ns;
    ns->filename=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    ns->filename->append8(SCOPE_TOP(NameSpace)->filename,(const char*)filename);
    ns->internalNamespace=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    ns->internalNamespace->append8(ns->internalNamespace,(const char*)outputInternalNamespace);
    ns->externalNamespace=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    ns->externalNamespace->append8(SCOPE_TOP(NameSpace)->externalNamespace,(const char*)outputExternalNamespace);
    if (strlen(outputExternalNamespace)) {
        ns->externalNamespace->append8(ns->externalNamespace,".");        
    }
    initNameSpace(ctx,ns);
    ProtoJSParser_protocol_return pbjAST=psr->protocol(psr);
    char *retval=strdup((const char*)ns->package->chars);
    freeNameSpace(ns);
    return retval;
}
ProtoJSParser_protocol_return parseTypes (const char*filename, const char *outputFilename,const char * outputInternalNamespace, const char*outputExternalNamespace, const char*package,pANTLR3_HASH_TABLE typeTable) {
    
    pANTLR3_INPUT_STREAM input = antlr3AsciiFileStreamNew((pANTLR3_UINT8)filename);

    if ( input == NULL ) {
        fprintf(stderr, "Failed to open file %s\n", (char *)filename);
        exit(1);
    }
    pProtoJSLexer lxr = ProtoJSLexerNew(input);
    if ( lxr == NULL ) {
        fprintf(stderr, "Unable to create the lexer due to malloc() failure1\n");
        exit(1);
    }

    pANTLR3_COMMON_TOKEN_STREAM tstream = antlr3CommonTokenStreamSourceNew(ANTLR3_SIZE_HINT, TOKENSOURCE(lxr));
    if (tstream == NULL) {
	fprintf(stderr, "Out of memory trying to allocate token stream\n");
	exit(1);
    }

    pProtoJSParser ctx;
    pProtoJSParser psr = ctx = ProtoJSParserNew(tstream);
    if (psr == NULL) {
        fprintf(stderr, "Out of memory trying to allocate parser\n");
        exit(ANTLR3_ERR_NOMEM);
    }
    SCOPE_TYPE(NameSpace) ns=NameSpacePush(ctx);
    ctx->pProtoJSParser_NameSpaceTop=ns;
    ns->filename=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    ns->filename->append8(SCOPE_TOP(NameSpace)->filename,(const char*)filename);
    ns->internalNamespace=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    ns->internalNamespace->append8(ns->internalNamespace,(const char*)outputInternalNamespace);
    ns->externalNamespace=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    ns->externalNamespace->append8(SCOPE_TOP(NameSpace)->externalNamespace,(const char*)outputExternalNamespace);
    if (strlen(outputExternalNamespace)) {
        ns->externalNamespace->append8(ns->externalNamespace,".");        
    }
    initNameSpace(ctx,ns);
    pANTLR3_HASH_TABLE tempTable=ns->qualifiedTypes;
    ns->package->set8(ns->package,package);
    ns->packageDot->set8(ns->packageDot,package);
    ns->packageDot->append8(ns->packageDot,".");
    ns->qualifiedTypes=typeTable;
    ProtoJSParser_protocol_return pbjAST=psr->protocol(psr);
    ns->qualifiedTypes=tempTable;
    freeNameSpace(ns);
    return pbjAST;
}
int main(int argc, char *argv[])
{
    
    pANTLR3_UINT8 filename;
    pANTLR3_INPUT_STREAM input=NULL;
    pProtoJSLexer lxr;
    pANTLR3_COMMON_TOKEN_STREAM tstream;
    pProtoJSParser psr,ctx;
    ProtoJSParser_protocol_return     pbjAST;
    if (argc < 2 || argv[1] == NULL)
        filename = (pANTLR3_UINT8)"./input";
    else
        filename = (pANTLR3_UINT8)argv[1];
    const char * outputFilename="output";
    if (argc>=3) {
        outputFilename=argv[2];
    }
    char * csOut=NULL;
    char * cppOut=NULL;
    char * cppInclude=NULL;
    int argindex;
    const char *outputInternalNamespace="_ProtoJS_Internal";
    const char *outputExternalNamespace="";
    for (argindex=3;argindex<argc;++argindex) {
        
        if (strncmp(argv[argindex],"--cpp=",6)==0) {
            cppOut=argv[argindex]+6;
        }
        if (strncmp(argv[argindex],"--cs=",5)==0) {
            csOut=argv[argindex]+5;
        }
        if (strncmp(argv[argindex],"--include=",10)==0) {
            cppInclude=argv[argindex]+10;
        }
        if (strncmp(argv[argindex],"--inamespace=",13)==0) {
            outputInternalNamespace=argv[argindex]+13;
        }
        if (strncmp(argv[argindex],"--namespace=",12)==0) {
            outputExternalNamespace=argv[argindex]+12;
        }
    }
    char*package=parsePackage((const char*)filename,outputInternalNamespace,outputExternalNamespace);
    pANTLR3_HASH_TABLE qualifiedTypes=antlr3HashTableNew(11);
    parseTypes((const char*)filename,outputFilename,outputInternalNamespace,outputExternalNamespace,package,qualifiedTypes);
    parseTypes((const char*)filename,outputFilename,outputInternalNamespace,outputExternalNamespace,package,qualifiedTypes);
    input = antlr3AsciiFileStreamNew(filename);

    if ( input == NULL ) {
        fprintf(stderr, "Failed to open file %s\n", (char *)filename);
        exit(1);
    }

    lxr = ProtoJSLexerNew(input);
    if ( lxr == NULL ) {
        fprintf(stderr, "Unable to create the lexer due to malloc() failure1\n");
        exit(1);
    }

    tstream = antlr3CommonTokenStreamSourceNew(ANTLR3_SIZE_HINT, TOKENSOURCE(lxr));
    if (tstream == NULL) {
	fprintf(stderr, "Out of memory trying to allocate token stream\n");
	exit(1);
    }

    psr = ctx = ProtoJSParserNew(tstream);
    if (psr == NULL) {
        fprintf(stderr, "Out of memory trying to allocate parser\n");
        exit(ANTLR3_ERR_NOMEM);
    }
    ctx->pProtoJSParser_NameSpaceTop=NameSpacePush(ctx);
    SCOPE_TOP(NameSpace)->filename=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    SCOPE_TOP(NameSpace)->filename->append8(SCOPE_TOP(NameSpace)->filename,(const char*)outputFilename);
    SCOPE_TOP(NameSpace)->internalNamespace=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    SCOPE_TOP(NameSpace)->internalNamespace->append8(SCOPE_TOP(NameSpace)->internalNamespace,(const char*)outputInternalNamespace);
    SCOPE_TOP(NameSpace)->externalNamespace=tstream->tstream->tokenSource->strFactory->newRaw(tstream->tstream->tokenSource->strFactory);
    SCOPE_TOP(NameSpace)->externalNamespace->append8(SCOPE_TOP(NameSpace)->externalNamespace,(const char*)outputExternalNamespace);
    if (strlen(outputExternalNamespace)) {
        SCOPE_TOP(NameSpace)->externalNamespace->append8(SCOPE_TOP(NameSpace)->externalNamespace,".");        
    }
    initNameSpace(ctx,SCOPE_TOP(NameSpace));
    pbjAST=psr->protocol(psr);
    
    if (psr->pParser->rec->getNumberOfSyntaxErrors(psr->pParser->rec) > 0)
    {
        ANTLR3_FPRINTF(stderr, "The parser returned %d errors, tree walking aborted.\n", psr->pParser->rec->getNumberOfSyntaxErrors(psr->pParser->rec));
 
    }
    else
    {
        pANTLR3_COMMON_TREE_NODE_STREAM    nodes;
        nodes   = antlr3CommonTreeNodeStreamNewTree(pbjAST.tree, ANTLR3_SIZE_HINT); // sIZE HINT WILL SOON BE DEPRECATED!!
        pANTLR3_STRING s = nodes->stringFactory->newRaw(nodes->stringFactory);
        grammarToString(nodes->tnstream,nodes->root,NULL,s);
        FILE*fp=fopen(outputFilename,"w");
        if (s->size>1)
            fwrite(s->chars,s->size-1,1,fp);
        fclose(fp);
        stringFree(s);
        nodes   ->free  (nodes);        nodes   = NULL;
    }
/*
    if (SCOPE_TOP(NameSpace)->output->cpp)
        fclose(SCOPE_TOP(NameSpace)->output->cpp);
    if (SCOPE_TOP(NameSpace)->output->cs)
        fclose(SCOPE_TOP(NameSpace)->output->cs);
*/
    NameSpacePop(ctx);
    psr->free(psr);
    psr = NULL;

    tstream->free(tstream);
    tstream = NULL;


    lxr->free(lxr);
    lxr = NULL;

    input->close(input);
    input = NULL;

    return 0;
}
