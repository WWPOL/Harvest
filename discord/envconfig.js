/**
 * I'm making this into a seperate NPM package bc I like it. But until I get it published
 * right I'm just moving the og implementation here so the NPM package is not a blocker 
 * for this.
 */

/**
 * Like Array.map but for objects.
 * @param obj To process.
 * @param callback Called on each top level key of the object, expected to return a new
 *     value for that key.
 * @returns Object with same top level keys but values returned by callback.
 */
function objMap(obj, callback) {
  let res = {};
  Object.keys(obj).forEach((k) => {
    res[k] = callback(k, obj[k]);
  });
  return res;
}

/**
 * Creates a configuration object with values from environment variables. The structure and
 * keys of the resulting configuration object will be the same the def argument's. The 
 * values of these keys will be determined by the EnvConfigPropDef.
 * @param prefix Prefix to prepend to every environment variable name in the def argument.
 *     If you don't want any prefix just pass an empty string.
 * @param def Definition of resulting configuration object. Keys names are preserved in
 *     the returned object. Values are tuples defining which environment variables to
 *     get get values from, and how to process them.
 * @throws {string} If an error occurrs parsing the configuration.
 */
function EnvConfig(prefix, def) {
  let missingEnvs = new Set();

  function resolve(def) {
    return objMap(def, (k, v) {
      // If we need to call recursively
      if (Array.isArray(v) === false) {
        return resolve(v);
      }

      // Otherwise process as tuple definition
      const envKey = prefix + v[0];
      const envType = v[1];
      
      let envValue = process.env[envKey];
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
        case "boolean":
          if (["true", "false"].indexOf(envValue) === -1) {
            throw "boolean value must be \"true\" or \"false\"";
          }
          
          envValue = envValue === "true";
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


module.exports = EnvConfig;
