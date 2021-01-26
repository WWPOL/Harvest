import { ScriptsConfiguration } from "https://deno.land/x/velociraptor@1.0.0-beta.16/mod.ts";

const entry = "src/mod.ts";
const runArgs = [
  "--allow-env",
  "--allow-net",
  "--allow-read",
  "--allow-write",
].join(" ");

export default <ScriptsConfiguration>{
  scripts: {
    start: {
      desc: "Starts farmer server.",
      cmd: `deno run ${runArgs} ${entry}`,
    },
    watch: {
      desc: "Starts farmer server and reloads on changes",
      cmd: `deno run ${runArgs} --unstable ${entry}`,
      watch: true,
    },
  },
};
