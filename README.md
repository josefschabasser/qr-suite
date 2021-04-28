# @qr-suite

This will be a bunch of QR code related libraries and tools written in (or ported to) TypeScript.  
The goal is to be highly modular (don't want the terminal stuff, then don't install it).

## @qr-suite/matrix

This is a port of [qr-image](https://github.com/Short-io/qr-image)'s base and matrix features to TypeScript.  
Currently it supports encoding, generating error correction codes and matrices.  
Encoding supports alphanumeric strings, numbers, binary data (8 bits/char) and URLs (https only, experimental).

## @qr-suite/terminal

This is a library to display QR codes on a terminal using bundled [@qr-suite/matrix](https://github.com/josefschabasser/qr-suite/tree/develop/packages/matrix).  
Currently it supports small/medium/large mode, error correction levels, borders (experimental) and optimizing the QR code for URLs (experimental).  
Small QR codes are experimental, too (highly distorted, must be converted to medium to be usable, but saves characters).
