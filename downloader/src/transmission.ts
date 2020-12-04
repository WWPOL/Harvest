import Transmission, { Callback, ConnOpts } from "transmission";

/**
 * Promise version of Transmission client.
 */
export default class AsyncTransmission {
    base: Transmission;
    
    constructor(opts: ConnOpts) {
        this.base = new Transmission(opts);
    }

    _promisify<T>(cb: (autoPromCb: Callback) => void): Promise<T> {
        return new Promise((resolve, reject) => {
            cb.bind((err: any, arg: any) => {
                if (err !== undefined && err !== null) {
                    return reject(err.toString());
                }

                return resolve(arg);
            });
        });
    };

    async addUrl(url: string, opts?: object): Promise<object> {
        return this._promisify((cb: Callback) => {
            this.base.addUrl(url, opts, cb);
        });
    }
}
