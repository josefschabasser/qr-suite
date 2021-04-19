# @qr-suite

This will be a bunch of QR code related libraries and tools, but mostly ports to TypeScript.  
The goal is to be highly modular (don't want the terminal stuff, then don't install it).

## @qr-suite/matrix

This is a port of [qr-image](https://github.com/Short-io/qr-image)'s base and matrix features to TypeScript.  
Currently it supports encoding, generating error correction codes and matrices.  
Encoding supports alphanumeric strings, numbers, binary data (8 bits/char) and URLs (https only, experimental).

## @qr-suite/terminal

This is a library to display QR codes on a terminal using [chalk](https://github.com/chalk/chalk) and bundled [@qr-suite/matrix](https://github.com/josefschabasser/qr-suite/tree/develop/packages/matrix).  
Currently it supports normal and small mode, changing colors and borders (experimental).
