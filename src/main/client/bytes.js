// bytes.js

// Concatenate bytes.
export function concatenate(...arrays) {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new Buffer.alloc(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

// Encode Lily string.
export function encodeString(text) {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, text.length, true);
    return concatenate(Buffer.from(buffer), Buffer.from(text, 'utf8'));
}

// Encode Lily array.
export function encodeArray(array) {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, array.length, true);
    return concatenate(Buffer.from(buffer), ...array);
}

// Decode Lily string.
export function decodeString(buffer, start) {
    const length = new DataView(buffer.buffer).getInt16(start, true);
    return buffer.slice(start+2, start+2+length).toString();
}