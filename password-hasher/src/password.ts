import { BigInteger } from "big-integer";
import bigInt = require("big-integer");

export const MaxEntropy = 128;

interface ScryptOptions {
    N: number;
    r: number;
    p: number;
    dkLen: number;
    encoding: string;
}

export interface Range {
    size: number;
    name?: string;
    draw(ind: number): string;
}

class CharRange implements Range {
    public readonly size: number;
    private start: number;

    name = "Special characters";

    constructor(start: number, end: number) {
        this.size = end - start;
        this.start = start;
    }

    draw(ind: number) {
        return String.fromCharCode(ind + this.start);
    }
}

async function getWordRange() {
    const resp = await fetch("google-10000-english-usa.txt");
    const plainText = await resp.text();
    const words = plainText.split("\n").map(word => {
        word = word.trim();
        return word.substr(0, 1).toUpperCase() + word.substr(1).toLowerCase();
    });

    return {
        size: words.length,
        draw: (ind: number) => words[ind],
        name: "English words"
    };
}

function combineRanges(name: string, ...ranges: CharRange[]): Range {
    const size = ranges.reduce((total, current) => total + current.size, 0);
    const draw = (ind: number): string => {
        for (const range of ranges) {
            if (range.size > ind) {
                return range.draw(ind);
            }
            ind -= range.size;
        }

        throw Error("Index out of bounds.");
    };

    return {
        size,
        draw,
        name
    };
}

const numberRange: Range = {
    size: 10,
    draw: (ind: number) => ind.toString(),
    name: "Numbers"
};
const specialRange = new CharRange(33, 127);
const alphaNumRange = combineRanges("Alphanumeric",
    new CharRange(48, 58), new CharRange(65, 91), new CharRange(97, 122));
export const defaultRange = specialRange;

export const ranges = getWordRange().then(wordRange => {
    return [
        specialRange,
        alphaNumRange,
        wordRange,
        numberRange
    ];
});

declare var process: any;
const worker = process.env.NODE_ENV === "production" ? new Worker("worker.js") : new Worker("build/worker.js");
let workerLocked = false;

function sleepPromise(time: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, time);
    });
}

async function withWorker<T>(func: (worker: Worker) => Promise<T>): Promise<T> {
    while (workerLocked) {
        await sleepPromise(10);
    }

    workerLocked = true;
    try {
        return await func(worker);
    } finally {
        workerLocked = false;
    }
}

function scryptProm(password: string, salt: string, options: ScryptOptions): Promise<string> {
    return withWorker(worker => {
        const result = new Promise<string>(resolve => {
            worker.onmessage = e => resolve(e.data);
            worker.postMessage({
                password,
                salt,
                options
            });
        });

        return result;
    });
}

export async function hashPassword(id: string, password: string) {
    const options: ScryptOptions = {
        N: 16384,
        r: 8,
        p: 1,
        dkLen: MaxEntropy / 8,
        encoding: "hex"
    };
    const result = await scryptProm(password, id, options);
    return bigInt(result, 16);
}

export function selectFrom(num: BigInteger, range: Range): [BigInteger, string] {
    const result = num.divmod(range.size);
    return [result.quotient, range.draw(result.remainder.toJSNumber())];
}

export function entropy(num: BigInteger): number {
    return num.compare(bigInt(1)) > 0 ? num.toString(2).length : 0;
}
