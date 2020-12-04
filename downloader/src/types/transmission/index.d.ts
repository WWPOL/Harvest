declare module "transmission" {
    export type Callback = (err: any, arg: any) => void;
    
    export interface ConnOpts {
        port?: number,
        host?: string,
        username?: string,
        password?: string,
    }
    
    export default class Transmission {
        constructor(opts: ConnOpts);

        addUrl(url: string, options?: object, cb: Callback);
    }
}
