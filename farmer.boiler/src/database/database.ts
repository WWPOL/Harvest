import { Sabr, SabrTable } from "../../deps.ts";
import {
  User,
  Resource,
  ResourceRequest
} from "./schemas.ts";

const db = await dbClient.database(cfg.mongo.db);
const users = db.collection<User>("users");
const resources = db.collection<Resource>("resources");
const resourceRequests = db.collection<ResourceRequest>("resource_requests");

export default {
  db, users, resources, resourceRequests,
};
