#!/bin/sh

if [ x"$1" = x ]; then
	echo "Usage: '$0' /path/to/sirikata" >&2
	exit 1
fi
if [ -e antlr-3.1.3.jar ]; then
	true
else
	echo "Unable to find antlr-3.1.3.jar in this directory."
	echo "Downloading ANTLR 3.1.3 from http://www.antlr.org/download.html"
	curl http://www.antlr.org/download/antlr-3.1.3.jar > tmp && \
	mv tmp antlr-3.1.3.jar || \
	echo "Failed to download ANTLR. Aborting."
fi
if [ -e antlr-3.1.3.jar ]; then
	true
else
	exit 1
fi
rm -f antlr-3.1.2 && ln -s "$1/dependencies" antlr-3.1.2
rm -f protocol && ln -s "$1/libcore/protocol" protocol

echo "Type 'make' to compile javascript files."
