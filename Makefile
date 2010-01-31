ALLSOURCES=$(wildcard protocol/*.pbj)

ALLOUTPUTS=$(patsubst protocol/%,%.js,$(ALLSOURCES))

all: $(ALLOUTPUTS) pbj

%.pbj.js: protocol/%.pbj pbj
	./pbj $< $@

pbj : main.cpp ProtoJSLexer.o ProtoJSParser.o ProtoJSParseUtil.o
	g++ -std=c++98 -Wall -static -g2 -o pbj -Iantlr-3.1.2/include -Lantlr-3.1.2/lib -I/usr/local/include -L/usr/local/lib main.cpp ProtoJSLexer.o ProtoJSParser.o ProtoJSParseUtil.o -lantlr3c || g++ -o pbj -Iantlr-3.1.2/include -Lantlr-3.1.2/lib -I/usr/local/include -L/usr/local/lib -g2 main.cpp ProtoJSLexer.o ProtoJSParser.o ProtoJSParseUtil.o antlr-3.1.2/lib/libantlr3c.a || g++ -o pbj -Iantlr-3.1.2/include -Lantlr-3.1.2/lib -I/usr/local/include -L/usr/local/lib -g2 main.cpp ProtoJSLexer.o ProtoJSParser.o ProtoJSParseUtil.o -lantlr3c

ProtoJSLexer.c : ProtoJS.g
	java -jar antlr-3.1.3.jar ProtoJS.g

ProtoJSParser.c : ProtoJS.g
	java -jar antlr-3.1.3.jar ProtoJS.g

ProtoJSLexer.h : ProtoJS.g
	java -jar antlr-3.1.3.jar ProtoJS.g

ProtoJSParser.h : ProtoJS.g
	java -jar antlr-3.1.3.jar ProtoJS.g

ProtoJSLexer.o : ProtoJSLexer.h ProtoJSLexer.c
	gcc -c -g2 -Wall -Iantlr-3.1.2/include -I/usr/local/include -o ProtoJSLexer.o ProtoJSLexer.c

ProtoJSParser.o : ProtoJSParser.h ProtoJSParser.c
	gcc -c -g2 -Wall -Iantlr-3.1.2/include -I/usr/local/include -o ProtoJSParser.o ProtoJSParser.c

ProtoJSParseUtil.o : ProtoJSParseUtil.h ProtoJSParseUtil.cpp
	g++ -c -g2 -Wall -Iantlr-3.1.2/include -I/usr/local/include -o ProtoJSParseUtil.o ProtoJSParseUtil.cpp

clean:
	rm -f ProtoJSParseUtil.o ProtoJSLexer.o ProtoJSParser.o ProtoJSLexer.c ProtoJSParser.c main.o
