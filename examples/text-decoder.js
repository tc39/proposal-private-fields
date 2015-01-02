class Decoder {

    @encoding;
    @charBuffer = new Buffer(6);
    @charOffset = 0;
    @charLength = 0;
    @surrogateSize = 0;

    constructor(encoding = "utf8") {

        @encoding = encoding
            .toLowerCase()
            .replace(/[-_]/, "")
            .replace(/^usc2$/, "utf16le");

        switch (@encoding) {

            case "utf8": @surrogateSize = 3; break;
            case "utf16le": @surrogateSize = 2; break;
            case "base64": @surrogateSize = 3; break;
        }
    }

    decodeBuffer(buffer) {

        if (@surrogateSize === 0)
            return buffer.toString(@encoding);

        let value = "",
            charCode = 0,
            offset = 0,
            size,
            len,
            end;

        // If the last write ended with an incomplete character...
        while (@charLength) {

            // Attempt to fill the char buffer
            len = Math.min(@charLength - @charOffset, buffer.length);
            buffer.copy(@charBuffer, @charOffset, offset, len);

            @charOffset += (len - offset);
            offset = len;

            // If the char buffer is still not filled, exit and wait for more data
            if (@charOffset < @charLength)
                return null;

            // Get the character that was split
            value = @charBuffer.slice(0, @charLength).toString(@encoding);
            charCode = value.charCodeAt(value.length - 1);

            // If character is the first of a surrogate pair...
            if (charCode >= 0xD800 && charCode <= 0xDBFF) {

                // Extend the char buffer and attempt to fill it
                value = "";
                @charLength += @surrogateSize;
                continue;
            }

            // Reset the char buffer
            @charOffset =
            @charLength = 0;

            // If there are no more bytes in this buffer, exit
            if (len === buffer.length)
                return value;

            buffer = buffer.slice(len);
            break;
        }

        len = this::_detectIncomplete(buffer);
        end = buffer.length;

        if (@charLength) {

            // Put incomplete character data into the char buffer
            buffer.copy(@charBuffer, 0, buffer.length - len, end);
            @charOffset = len;
            end -= len;
        }

        value += buffer.toString(@encoding, 0, end);
        end = value.length;

        // Get the last character in the string
        charCode = value.charCodeAt(value.length - 1);

        // If character is a lead surrogate...
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {

            end = value.length - 1;
            size = @surrogateSize;

            // Add surrogate data to the char buffer
            @charLength += size;
            @charOffset += size;
            @charBuffer.copy(@charBuffer, size, 0, size);
            @charBuffer.write(value.charAt(end), @encoding);
        }

        return value.slice(0, end);
    }

    finalize() {

        if (@charOffset)
            return @charBuffer.slice(0, @charOffset).toString(@encoding);

        return null;
    }

    function _detectIncomplete(buffer) {

        switch (@encoding) {

            case "utf8": return this::_detectIncompleteUTF8(buffer);
            case "utf16le": return this::_detectIncompleteUTF16(buffer);
            case "base64": return this::_detectIncompleteBase64(buffer);
            default: throw new Error("Invalid encoding");
        }
    }

    function _detectIncompleteUTF8(buffer) {

        let c, i;

        for (i = Math.min(buffer.length, 3); i > 0; i--) {

            c = buffer[buffer.length - i];

            if (i == 1 && c >> 5 === 0x06) { // 110XXXXX

                @charLength = 2;
                break;
            }

            if (i <= 2 && c >> 4 === 0x0E) { // 1110XXXX

                @charLength = 3;
                break;
            }

            if (i <= 3 && c >> 3 === 0x1E) { // 11110XXX

                @charLength = 4;
                break;
            }
        }

        return i;
    }

    function _detectIncompleteUTF16(buffer) {

        @charOffset = buffer.length % 2;
        @charLength = @charOffset ? 2 : 0;
        return @charOffset;
    }

    function _detectIncompleteBase64(buffer) {

        @charOffset = buffer.length % 3;
        @charLength = @charOffset ? 3 : 0;
        return @charOffset;
    }

}
