extern "C" {
#include "ProtoJSParser.h"
#include "ProtoJSLexer.h"
#include "ProtoJSParseUtil.h"
}
#include <sstream>
#include <iostream>
#include <fstream>

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
