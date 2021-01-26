import { ScriptsConfiguration } from "https://deno.land/x/velociraptor@1.0.0-beta.16/mod.ts";

const runArgs = [
  "--allow-env",
  "--allow-net",
  "--allow-read",
  "--allow-write",
].join(" ");

export default <ScriptsConfiguration>{
  scripts: {
    start: {
      desc: "Starts the bot.",
      cmd: `deno run ${runArgs} mod.ts`,
    },
    dev: {
      desc: "Starts the bot.",
      cmd: `deno run ${runArgs} --unstable mod.ts`,
      watch: true,
    },
    /*
    reload: {
      desc: "Reloads the source code cache and starts the bot.",
      cmd: "deno run ${runArgs} -r mod.ts",
    },
    update: {
      desc: "Reloads the cached library modules",
      cmd: "deno cache --reload mod.ts",
    },
    dev: {
      desc: "Reloads the cache and then starts the bot.",
      cmd: "vr update && vr start",
    },
    */
  },
};
