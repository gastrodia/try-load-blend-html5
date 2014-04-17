/**
 * Created by ELatA on 2014/4/17.
 */


define(["buffer"], function (bf) {
    function _error() {
        return { error: Array.prototype.slice.call(arguments) };
    }

    function toBuffer(ab) {
        var buffer = new bf.Buffer(ab.byteLength);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buffer.length; ++i) {
            buffer[i] = view[i];
        }
        return buffer;
    }

    function readUrlAsBuffer(url, callback) {
        var req = new XMLHttpRequest();
        req.responseType = 'arraybuffer';
        var length = 0;
        req.addEventListener("progress", updateProgress, false);
        req.addEventListener("load", transferComplete, false);
        req.addEventListener("error", transferFailed, false);
        req.addEventListener("abort", transferCanceled, false);

        function updateProgress(evt) {
            if (evt.lengthComputable) {
                var percentComplete = evt.loaded / evt.total;
                console.log(url + " loading..", (percentComplete * 100) + "%");
            } else {
                // Unable to compute progress information since the total size is unknown
            }
        }

        function transferComplete(evt) {
            console.log("The transfer is complete.");
            callback(toBuffer(req.response));
        }

        function transferFailed(evt) {
            console.log("can't load " + url + ",maybe someting err", evt);
        }

        function transferCanceled(evt) {
            alert("Getting " + url + ",but the transfer has been canceled by the user.");
        }

        req.open('GET', url, true);
        req.send(null);

    }


    var Blender = function () {

    };
    Blender.prototype.read = function (url, callback) {
        console.log("read", url);
        var blender = this;
        readUrlAsBuffer(url, function (buffer) {
            var reader = new Reader(buffer);
            var header = blender.readHeader(reader);
            if (!header.error) {
                reader.header = header;
                blender.setReadMethods(reader, header.pointerSize, header.littleEndian);
                reader.readBlocks();
                callback(null, reader);
            } else {
                callback({error: header.error});
            }
        });
    };

    Blender.prototype.readHeader = function (reader) {
        var header = {};

        // The header is always 12 bytes long.
        var buffer = reader.readBuffer(12);
        buffer.length = buffer.length || buffer.byteLength;
        if (buffer.length < 12)
            return _error("HeaderBufferTooSmall", buffer.length);
        var identifier = buffer.slice(0, 7).toString();
        if (identifier != "BLENDER")
            return _error("HeaderIdentifierIncorrect", identifier);
        header.identifier = identifier;

        // The next character indicates the size of pointers in the file.
        // Blender dumps the data structures directly to the file, so this
        // is dependent on the system that saved the file.
        switch (String.fromCharCode(buffer[7])) {
            case "_":
                header.pointerSize = 4;
                break;
            case "-":
                header.pointerSize = 8;
                break;
            default:
                return _error("HeaderInvalidPointerSize", buffer[7]);
        }

        // Endianness - again, dependent on the system saving the file.
        switch (String.fromCharCode(buffer[8])) {
            case "v":
                header.littleEndian = true;
                break;
            case "V":
                header.littleEndian = false;
                break;
            default:
                return _error("HeaderInvalidEndianness", String.fromCharCode(buffer[8]));
        }

        // The final three bytes are the version number
        header.version = buffer.slice(9, 12).toString();

        return header;
    };

    Blender.prototype.setReadMethods = function (reader, pointerSize, littleEndian) {
        // Using lambdas for the core read functions *can't* be efficient at run-time,
        // but this is a good way to quickly get the code working.
        function genReadUInt(bytes, suffix) {
            var funcName = "readUInt" + (bytes * 8) + suffix;
            return function () {
                var i = this._pos;
                this._pos += bytes;
                return this._buffer[funcName](i);
            };
        }

        function genReadAddress(bytes, littleEndian) {
            // Javascript doesn't natively handle 64-bit integers.  There are modules
            // that add such support - but for now, we're simply not handling any
            // files that *require* 64-bit addresses correctly.
            return function () {
                var i = this._pos;
                var j = this._pos += bytes;
                var s = this._buffer.slice(i, j).toString("hex");
                var n = parseInt(s, 16);
                if (s !== ("0000000000000000" + n.toString(16)).slice(-s.length))
                    throw new Error("Can't handle file with large addresses! " + s);
                return n;
            }
        }

        function genConvert(type, suffix) {
            var name = "read" + type + suffix;
            return function (buffer, index) {
                index = index || 0;
                return buffer[name](index);
            };
        }

        function genConvertAddress(bytes, littleEndian) {
            // Javascript doesn't natively handle 64-bit integers.  There are modules
            // that add such support - but for now, we're simply not handling any
            // files that *require* 64-bit addresses correctly.
            return function (buffer) {
                var s = buffer.toString("hex");
                var n = parseInt(s, 16);
                if (s !== ("0000000000000000" + n.toString(16)).slice(-s.length))
                    throw new Error("Can't handle file with large addresses! " + s);
                return n;
            }
        }


        var suffix = littleEndian ? "LE" : "BE";
        reader.readUInt8 = genReadUInt(1, "");
        reader.readUInt16 = genReadUInt(2, suffix);
        reader.readUInt32 = genReadUInt(4, suffix);
        reader.readAddress = genReadAddress(pointerSize, littleEndian);

        reader.convertInt8 = genConvert("Int8", "");
        reader.convertInt16 = genConvert("Int16", suffix);
        reader.convertInt32 = genConvert("Int32", suffix);
        reader.convertFloat = genConvert("Float", suffix);
        reader.convertAddress = genConvertAddress(pointerSize, littleEndian);
    };




//-----------------------------------------------------------------------------------//
// DNA
//-----------------------------------------------------------------------------------//

    /*
     Build up an index of the blender "DNA" file structure.  This is not a 1:1
     mapping of the data in the file, but rather a set of mappings to make loading
     the data a bit more convenient.
     */
    function DNA() {
        this.blockIndex = [];
        this.blockMap = {};
        this.blockAddr = {};
        this.structIndex = [];
        this.structMap = {};

        this.objects = {};
    };

//-----------------------------------------------------------------------------------//
// Reader
//-----------------------------------------------------------------------------------//

    function Object() {

    };

    function Block() {
        this.id = null;     // string identifier
        this.size = null;     // number
        this.address = null;     // address
        this.dnaIndex = null;     // array index into the file DNA array
        this.count = null;     // number

        this.position = null;     // position in the file buffer of the start of the block
    };

    function Structure() {
        this.fields = [];       // Fields in order
        this.fieldMap = {};       // Fields by name
    };

    function Field() {
    };

    function Reader(buffer) {
        this.header = {};
        this.dna = new DNA();

        // This are set after the header is read depending on the format of the
        // data in the file.
        this.readUInt8 = null;
        this.readUInt16 = null;
        this.readUInt32 = null;
        this.readAddress = null;

        this._buffer = buffer;
        this._pos = 0;
    };
    (function (methods) {

        methods.tell = function () {
            return this._pos;
        };
        methods.seek = function (pos) {
            this._pos = pos;
        };
        methods.skip = function (bytes) {
            this._pos += bytes;
        };
        methods.align = function (alignment) {
            var offset = (alignment - (this._pos % alignment)) % alignment;
            this._pos += offset;
        };

        methods.readBuffer = function (bytes) {
            var i = this._pos;
            var j = (this._pos += bytes);
            return this._buffer.slice(i, j)
        };
        methods.readString = function (bytes) {
            return this.readBuffer(bytes).toString();
        };
        methods.readStringArray = function () {
            var count = this.readUInt32();
            var names = [];

            for (var i = 0; i < count; ++i) {
                var s = this._pos;
                var t = s;
                while (this._buffer[t++]) {
                }

                var current = this._buffer.slice(s, t - 1).toString();
                names.push(current);
                this._pos = t;
            }
            return names;
        };

        methods.readBlocks = function () {
            var done = false;
            while (!done) {
                var block = new Block();
                block.id = this.readString(4);
                block.size = this.readUInt32();
                block.address = this.readAddress();
                block.dnaIndex = this.readUInt32();
                block.count = this.readUInt32();

                block.position = this.tell();

                var next = block.position + block.size;

                this.dna.blockIndex.push(block);

                switch (block.id) {
                    case "ENDB":
                        done = true;
                        break;
                    case "DNA1":
                        this.readBlockDNA1();
                        break;
                }

                this.seek(next);
            }

            //
            // Create the block cross-referencing index
            //
            for (var i = 0; i < this.dna.blockIndex.length; ++i) {
                var block = this.dna.blockIndex[i];


                block.struct = this.dna.structIndex[block.dnaIndex];
                this.dna.blockMap[block.struct.name] = this.dna.blockMap[block.struct.name] || [];
                /*         console.log(block.struct.name)*/
                this.dna.blockMap[block.struct.name].push(block);
                this.dna.blockAddr[block.address] = block;
            }
        };


        methods.readBlockDNA1 = function () {
            var sdna = this.readString(4);

            console.log("sdna", sdna);

            var name = this.readString(4);

            var names = this.readStringArray();
            this.align(4);
            console.log("name", name);
            console.log("names.length", names.length);
            var type = this.readString(4);
            var types = this.readStringArray();
            console.log("type", type);
            console.log("types.length", types.length);
            this.align(4);

            var tlen = this.readString(4);
            console.log("tlen", tlen);

            var sizes = [];
            for (var i = 0; i < types.length; ++i)
                sizes.push(this.readUInt16());
            this.align(4);

            console.log("size.length", sizes.length);

            var strc = this.readString(4);

            console.log("strc", strc);

            var count = this.readUInt32();

            console.log("count", count);
            for (var i = 0; i < count; ++i) {
                var struct = new Structure();

                var type = this.readUInt16();
                struct.name = types[type];
                struct.size = sizes[type];
                //console.log(struct);
                var fields = this.readUInt16();
                var fieldOffset = 0;
                for (var j = 0; j < fields; ++j) {
                    var typeIndex = this.readUInt16();
                    var nameIndex = this.readUInt16();

                    // "ref" is the field name without the pointer indirection or array indicators.
                    // Might be better named "basename" or "key".
                    var field = new Field();
                    field.type = types[typeIndex];
                    field.name = names[nameIndex];
                    field.ref = field.name.replace(/^\*+/, "").replace(/\[.*$/, "");
                    field.pointer = false;
                    field.dim = 1;
                    field.offset = fieldOffset;

                    // Find the total dimension from the nested array notation [][]
                    var m = field.name.match(/\[[0-9]+\]/g);
                    if (m) {
                        var dim = 1;
                        for (var k = 0; k < m.length; ++k)
                            dim *= parseInt(m[k].substr(1, m[k].length - 2));
                        field.dim = dim;
                    }

                    // Set the size
                    if (field.name[0] == "*") {
                        field.pointer = true;
                        field.size = this.header.pointerSize;
                    }
                    else
                        field.size = sizes[typeIndex] * field.dim;

                    // Add the field and move on
                    struct.fields.push(field);
                    struct.fieldMap[field.ref] = field;
                    fieldOffset += field.size;
                }

                this.dna.structIndex.push(struct);
                this.dna.structMap[struct.name] = struct;
            }
        };

        methods.readMVert = function(address){
            var block = this.dna.blockAddr[address];
            var mesh = this.readObject(address);
        }

        methods.readObject = function (address, offset) {
            offset = offset || 0;

            var obj = this.dna.objects[address + offset];
            if (obj)
                return obj;
            else
                obj = new Object();

            var block = this.dna.blockAddr[address];
            if (!block)
                return null;

            var struct = block.struct;

            //
            // Read each field in as a Buffer, then cover to a JS type if
            // possible.
            //
            var nested = [];
            this.seek(block.position + offset);
     ;
            for (var i = 0; i < struct.fields.length; ++i) {
                var field = struct.fields[i];
                var val = this.readBuffer(field.size);

                if (field.pointer) {
                    val = this.convertAddress(val);
                    if(field.type == "MVert"){
                        console.log("mvert",field);
                        //var mvert = this.readMVert(val);
                    }
                }else if (field.dim == 1) {
                    switch (field.type) {
                        case "char"     :
                            val = this.convertInt8(val);
                            break;
                        case "short"    :
                            val = this.convertInt16(val);
                            break;
                        case "int"      :
                            val = this.convertInt32(val);
                            break;
                        case "float"    :
                            val = this.convertFloat(val);
                            break;
                        default         :

                            val = [ field.type, field.dim, val ];
                            break;
                    }
                    ;
                }
                else if (field.dim > 1) {
                    var a = [];
                    var elementSize = field.size / field.dim;
                    var offset = 0;
                    for (var j = 0; j < field.dim; ++j) {
                        var e;
                        switch (field.type) {
                            case "char"     :
                                e = this.convertInt8(val, offset);
                                break;
                            case "short"    :
                                e = this.convertInt16(val, offset);
                                break;
                            case "int"      :
                                e = this.convertInt32(val, offset);
                                break;
                            case "float"    :
                                e = this.convertFloat(val, offset);
                                break;
                            default         :
                                console.log(field.type);
                                e = val.slice(offset, offset + elementSize);
                                break;
                        }
                        ;
                        a.push(e);
                        offset += elementSize;
                    }
                    val = a;
                }
                else
                    val = [ field.type, field.dim, val ];

                obj[field.ref] = val;
            }
            this.dna.objects[address + offset] = obj;

            return obj;
        };

        methods.readObjects = function (address, count) {
            var block = this.dna.blockAddr[address];

            var offset = 0;
            var result = [];
            for (var i = 0; i < count; ++i) {
                var obj = this.readObject(address, offset);
                offset += block.struct.size;
                result.push(obj);
            }
            return result;
        };

        methods.getStructure = function (name) {
            return this.dna.structMap[name];
        };

        methods.getBlocks = function (type) {
            return this.dna.blockMap[type];
        };

    })(Reader.prototype);
    return new Blender();
})
