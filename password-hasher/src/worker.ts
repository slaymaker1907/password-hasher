/// <reference path="./scrypt-async.d.ts" />
import scrypt = require("scrypt-async");

declare function postMessage(arg: any): void;

onmessage = e => {
    const args: any = e.data;
    scrypt(args.password, args.salt, args.options, hash => postMessage(hash));
};
