// request.js

import * as BSON from 'bson';
import { concatenate, encodeString, encodeArray } from "./bytes.js";

// Request class.
export class Request {
    constructor(name, auth, args) {
        this.name = name;
        this.auth = auth;
        this.args = args;
    }

    asBytes() {
        const args = BSON.serialize(this.args);
        const lengthOfArgs = new ArrayBuffer(2);
        new DataView(lengthOfArgs).setInt16(0, args.length, true);
        const data = concatenate(this.auth.asBytes(), encodeString(this.name), Buffer.from(lengthOfArgs), args, Buffer.from("END", 'utf8'));
        const buffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, data.length, true);
        return concatenate(Buffer.from("LILY", 'utf8'), Buffer.from(buffer), Buffer.from("0", 'utf8'), data);
    }
}

// Chunk data class.
export class Chunks {
    constructor(chunks) {
        this.chunks = chunks
    }

    headerAsBytes() {
        return concatenate(encodeArray(this.chunks.map(function(item) {
            const buffer = new ArrayBuffer(2);
            new DataView(buffer).setInt16(0, item.numChunks, true);
            return concatenate(encodeString(item.name), Buffer.from(buffer));
        })), Buffer.from("END", 'utf8'));
    }

    chunkAsBytes(name, data) {
        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setBigUint64(0, BigInt(data.length), true);
        return concatenate(encodeString(name), Buffer.from(buffer), data, Buffer.from("END", 'utf8'));
    }

    footerAsBytes() {
        return Buffer.from("END", 'utf8');
    }
}