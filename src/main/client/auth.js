// auth.js

import { concatenate, encodeString } from "./bytes.js"
import { parse as uuidParse } from 'uuid';

// Authentication class.
export class Auth {
    constructor() {}
    asBytes() {}
}

// Null authentication.
export class NullAuth {
    constructor() {}
    asBytes() {
        return Buffer.from("NEND", 'utf8');
    }
}

// User authentication.
export class UserAuth {
    constructor(username, password) {
        this.username = username;
        this.password = password;
    }
    asBytes() {
        return concatenate(Buffer.from("U", 'utf8'), encodeString(this.username), encodeString(this.password), Buffer.from("END", 'utf8'));
    }
}

// Session authentication.
export class SessionAuth {
    constructor(username, id) {
        this.username = username;
        this.id = id;
    }
    asBytes() {
        return concatenate(Buffer.from("S", 'utf8'), encodeString(this.username), Buffer.from(uuidParse(this.id)), Buffer.from("END", 'utf8'));
    }
}