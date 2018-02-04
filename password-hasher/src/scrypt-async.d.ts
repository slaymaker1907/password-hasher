declare module "scrypt-async" {
    interface ScryptOptions {
        N: number;
        r: number;
        p: number;
        dkLen: number;
        encoding: string;
    }

    function scrypt(password: string, salt: string, options: ScryptOptions, cb: (hash: string) => void): void;
    export = scrypt;
}
