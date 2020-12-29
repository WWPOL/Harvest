import { MongoClient, Bson } from "https://deno.land/x/mongo@v0.20.1/mod.ts";
import { parse as parsePath } from "https://deno.land/std@0.82.0/path/mod.ts";
//import m3u8Parser from "https://dev.jspm.io/m3u8-parser";
import Hls from "https://cdn.pika.dev/hls.js";
import { Command } from "https://deno.land/x/cliffy@v0.16.0/command/mod.ts";

/*
declare module "https://dev.jspm.io/m3u8-parser" {
  export default {
  };
}
*/

const env = Deno.env.toObject();
const cfg = {
  mongo: {
    uri: env.MONGO_URI,
    db: env.MONGO_DB,
  },
};

// Connect to DB
const dbClient = new MongoClient();
dbClient.connect(cfg.mongo.uri);

const db = dbClient.database(cfg.mongo.db);

interface DbId {
  _id: { $oid: string },
}

enum ResourceStatus {
  Verifying,
  Downloading,
  Success,
  Failure,
}

interface Resource extends DbId {
  uri: string,
  status: ResourceStatus,
}

const dbResources = db.collection<Resource>("resources");

type ResourceSubFn = (res: Resource) => void;

class Subscribable {
  subs: ResourceSubFn[];
  
  constructor(subs: ResourceSubFn[]) {
    this.subs = subs;
  }

  async pushUpdate(res: Resource) {
    await Promise.all(this.subs.map(async (sub: ResourceSubFn) => {
      return sub(res);
    }));
  }
}

class M3UFetcher extends Subscribable {
  res: Resource;
  
  constructor(res: Resource, subs: ResourceSubFn[]) {
    super(subs);
    this.res = res;
  }

  static isCompatible(uri: string): boolean {
    const u = new URL(uri);
    const p = parsePath(u.pathname);
    return ["http:", "https:"].indexOf(u.protocol) !== -1 &&
      ["m3u", "m3u8"].indexOf(p.ext) !== -1;
  }

  async fetch() {
    // Get manifest
    /*
    const manifestReq = await fetch(this.res.uri);
    const manifestTxt = await manifestReq.text();

    const manifestParser = new m3u8Parser.Parser();
    manifestParser.push(manifestTxt);
    manifestParser.end();
    const manifest = manifestParser.manifest;

    this.res.status = ResourceStatus.Downloading;
    await this.pushUpdate(this.res);
    */
    const hls = new Hls();
    hls.loadSource(this.res.uri);
    await new Promise((resolve, reject) => {
      hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
        console.log("loaded manfest", event, data);
        resolve();
      });
    });
  }
}

const cmd = new Command().name("rake").version("0.1.0").description("Manage farmer resources");

await cmd.parse(Deno.args);
