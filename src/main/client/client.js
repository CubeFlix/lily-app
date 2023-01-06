// client.js

import * as tls from "tls";
import { concatenate, decodeString } from "./bytes.js";
import { Request, Chunks } from "./request.js";
import * as BSON from 'bson';

export class Client {
    constructor(host, port, tlsOptions) {
      this.host = host;
      this.port = port;
      this.tlsOptions = tlsOptions;
    }

    requestNoChunks(request) {
        const host = this.host;
        const port = this.port;
        const tlsOptions = this.tlsOptions;
        return new Promise(function(resolve, reject) {
            var client = tls.connect(port, host, tlsOptions, function() {
                client.write(request.asBytes());
                const chunks = new Chunks([]);
                client.write(chunks.headerAsBytes());
                client.write(chunks.footerAsBytes());
                var response = new Buffer.alloc(0);
                client.on('data', (data) => {
                    response = concatenate(response, data);
                });
                client.on('end', () => {
                    const bufferView = new DataView(response.buffer);
                    if (response.slice(0, 5).toString() != "LILY0") {
                        reject("invalid protocol");
                        return;
                    }
                    var pos = 5;
                
                    // Recieve and ignore empty chunk data.
                    const chunkListLength = bufferView.getUint16(pos, true);
                    pos += 2;
                    var chunkInfo = [];
                    for (let i = 0; i < chunkListLength; i++) {
                        let nameStr = decodeString(response, pos);
                        pos += 2 + nameStr.length;
                        let numChunks = bufferView.getUint16(pos, true);
                        pos += 2;
                        chunkInfo.push({name: nameStr, numChunks: numChunks});
                    }
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    pos += 3;
                    for (let i = 0; i < chunkInfo.length; i++) {
                        for (let j = 0; j < chunkInfo[i].numChunks; j++) {
                            let nameStr = decodeString(response, pos);
                            pos += 2 + nameStr.length;
                            let chunkLen = bufferView.getBigUint64(pos, true);
                            pos += 8 + Number(chunkLen);
                            if (response.slice(pos, pos+3).toString() != "END") {
                                reject("invalid protocol");
                                return;
                            }
                            pos += 3;
                        }
                    }
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    pos += 3;
                
                    // Receive the response data.
                    pos += 2;
                    const respCode = bufferView.getUint32(pos, true);
                    pos += 4;
                    const respStr = decodeString(response, pos);
                    pos += 2 + respStr.length;
                    const dataLength = bufferView.getUint16(pos, true);
                    pos += 2;
                    const data = response.slice(pos, pos+dataLength);
                    pos += dataLength;
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    resolve({code: respCode, str: respStr, data: BSON.deserialize(data)});
                });
            });
            client.on('error', function(ex) {
                reject(ex);
                return;
            });
        });
    }

    download(auth, drive, path) {
        const host = this.host;
        const port = this.port;
        const tlsOptions = this.tlsOptions;
        const request = new Request("readfiles", auth, {drive: drive, paths: [path]});
        return new Promise(function(resolve, reject) {
            var client = tls.connect(port, host, tlsOptions, function() {
                client.write(request.asBytes());
                const chunks = new Chunks([]);
                client.write(chunks.headerAsBytes());
                client.write(chunks.footerAsBytes());
                var response = new Buffer.alloc(0);
                client.on('data', (data) => {
                    response = concatenate(response, data);
                });
                client.on('end', () => {
                    const bufferView = new DataView(response.buffer);
                    if (response.slice(0, 5).toString() != "LILY0") {
                        reject("invalid protocol");
                        return;
                    }
                    var content = Buffer.alloc(0);
                    var pos = 5;
                
                    // Recieve and ignore empty chunk data.
                    const chunkListLength = bufferView.getUint16(pos, true);
                    pos += 2;
                    var chunkInfo = [];
                    for (let i = 0; i < chunkListLength; i++) {
                        let nameStr = decodeString(response, pos);
                        pos += 2 + nameStr.length;
                        let numChunks = bufferView.getUint16(pos, true);
                        pos += 2;
                        chunkInfo.push({name: nameStr, numChunks: numChunks});
                    }
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    pos += 3;
                    for (let i = 0; i < chunkInfo.length; i++) {
                        for (let j = 0; j < chunkInfo[i].numChunks; j++) {
                            let nameStr = decodeString(response, pos);
                            pos += 2 + nameStr.length;
                            let chunkLen = bufferView.getBigUint64(pos, true);
                            pos += 8;
                            content = concatenate(content, response.slice(pos, pos+Number(chunkLen)));
                            pos += Number(chunkLen);
                            if (response.slice(pos, pos+3).toString() != "END") {
                                reject("invalid protocol");
                                return;
                            }
                            pos += 3;
                        }
                    }
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    pos += 3;
                
                    // Recieve the response data.
                    pos += 2;
                    const respCode = bufferView.getUint32(pos, true);
                    pos += 4;
                    const respStr = decodeString(response, pos);
                    pos += 2 + respStr.length;
                    const dataLength = bufferView.getUint16(pos, true);
                    pos += 2;
                    const data = response.slice(pos, pos+dataLength);
                    pos += dataLength;
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    resolve({code: respCode, str: respStr, data: BSON.deserialize(data), content: content});
                });
            });
            client.on('error', function(ex) {
                reject(ex);
                return;
            });
        });
    }

    upload(auth, drive, path, content, chunkSize=4096, settings=null) {
        const host = this.host;
        const port = this.port;
        const tlsOptions = this.tlsOptions;
        const me = this;
        const request = new Request("writefiles", auth, {drive: drive, paths: [path], clear: [true]});
        return new Promise(function(resolve, reject) {
            var promise = null;
            if (settings != null) {
                promise = me.requestNoChunks(new Request("createfiles", auth, {drive: drive, paths: [path], settings: settings}));
            } else {
                promise = me.requestNoChunks(new Request("createfiles", auth, {drive: drive, paths: [path]}));
            }
            promise.then(() => {
            var client = tls.connect(port, host, tlsOptions, function() {
                // Calculate the chunks.
                const numChunks = Math.ceil(content.length / chunkSize);

                client.write(request.asBytes());
                const chunks = new Chunks([{name: path, numChunks: numChunks}]);
                client.write(chunks.headerAsBytes());
                for (let i = 0; i < numChunks; i++) {
                    if (i == numChunks-1) {
                        client.write(chunks.chunkAsBytes(path, content.slice(i * chunkSize)));
                    } else {
                        client.write(chunks.chunkAsBytes(path, content.slice(i * chunkSize, (i + 1) * chunkSize)));
                    }
                }
                client.write(chunks.footerAsBytes());
                var response = new Buffer.alloc(0);
                client.on('data', (data) => {
                    response = concatenate(response, data);
                });
                client.on('end', () => {
                    const bufferView = new DataView(response.buffer);
                    if (response.slice(0, 5).toString() != "LILY0") {
                        reject("invalid protocol");
                        return;
                    }
                    var pos = 5;
                
                    // Recieve and ignore empty chunk data.
                    const chunkListLength = bufferView.getUint16(pos, true);
                    pos += 2;
                    var chunkInfo = [];
                    for (let i = 0; i < chunkListLength; i++) {
                        let nameStr = decodeString(response, pos);
                        pos += 2 + nameStr.length;
                        let numChunks = bufferView.getUint16(pos, true);
                        pos += 2;
                        chunkInfo.push({name: nameStr, numChunks: numChunks});
                    }
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    pos += 3;
                    for (let i = 0; i < chunkInfo.length; i++) {
                        for (let j = 0; j < chunkInfo[i].numChunks; j++) {
                            let nameStr = decodeString(response, pos);
                            pos += 2 + nameStr.length;
                            let chunkLen = bufferView.getBigUint64(pos, true);
                            pos += 8 + Number(chunkLen);
                            if (response.slice(pos, pos+3).toString() != "END") {
                                reject("invalid protocol");
                                return;
                            }
                            pos += 3;
                        }
                    }
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    pos += 3;
                
                    // Recieve the response data.
                    pos += 2;
                    const respCode = bufferView.getUint32(pos, true);
                    pos += 4;
                    const respStr = decodeString(response, pos);
                    pos += 2 + respStr.length;
                    const dataLength = bufferView.getUint16(pos, true);
                    pos += 2;
                    const data = response.slice(pos, pos+dataLength);
                    pos += dataLength;
                    if (response.slice(pos, pos+3).toString() != "END") {
                        reject("invalid protocol");
                        return;
                    }
                    resolve({code: respCode, str: respStr, data: BSON.deserialize(data)});
                });
            });
            client.on('error', function(ex) {
                reject(ex);
                return;
            });});
        });
    }
}