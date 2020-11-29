import express from "express";

/**
 * Like Array.map but for objects.
 * @param obj To process.
 * @param callback Called on each top level key of the object, expected to return a new
 *     value for that key.
 * @returns Object with same top level keys but values returned by callback.
 */
function objMap(obj: {[index: string]: any}, callback: ((key: string, value: any) => any)): {[index: string]: any} {
    let res: {[index: string]: any} = {};
    Object.keys(obj).forEach((k: string) => {
        res[k] = callback(k, obj[k]);
    });
    return res;
}


/**
 * Creates a configuration object from environment variables.
 * @param prefix Prefix to prepend to every environment variable name in the def argument.
 * @param def Definition of configuration, keys names of corresponding keys in the
 *     resulting object and values are tuples in the 
 *     form [envKey: string, type: string, default: any?].
 * @throws {string} If an error occurrs parsing the configuration.
 */
function EnvConfig(prefix: string, def: object) {
    let missingEnvs = new Set();

    function resolve(def: object): object {
        return objMap(def, (k: string, v: any): any => {
            // If we need to call recursively
            if (Array.isArray(v) === false) {
                return resolve(v);
            }

            // Otherwise process as tuple definition
            const envKey = prefix + v[0];
            const envType = v[1];
            
            let envValue: any = process.env[envKey];
            if (envValue === undefined) {
                // Use defined default value
                if (v.length === 3) {
                    envValue = v[2];
                } else {
                    // If no default value record as missing
                    missingEnvs.add(envKey);
                    return undefined;
                }
            }

            try {
                switch (envType) {
                    case "string":
                        envValue = envValue.toString();
                        break;
                    case "integer":
                        envValue = parseInt(envValue);
                        break;
                    default:
                        throw `Unknown type in definition, the type "${envType}" is not valid`;
                }
            } catch (e) {
                throw `Failed to cast configuration key "${k}" (Environment variable "${envKey}"): ${e}`;
            }

            return envValue;
        });
    }

    let config = resolve(def);

    if (missingEnvs.size > 0) {
        throw `Missing environment variable(s): ${Array.from(missingEnvs).join(", ")}`;
    }

    return config;
}

const cfg = EnvConfig("APP_", {
    http: {
        port: ["HTTP_PORT", "string", 8000],
    },
})

console.log(cfg);
