const { MongoClient } = require("mongodb");

/**
 * Connect to MongoDB.
 * @param cfg Application configuration.
 * @returns Object with database collection handle(s): .requests.
 */
async function connectToDB(cfg) {
  const dbConn = await MongoClient.connect(cfg.mongo.uri, {
	  useUnifiedTopology: true
  });
  const dbClient = await dbConn.db(cfg.mongo.dbName);
  
  return {
    requests: await dbClient.collection("requests"),
  };
}

module.exports = connectToDB;
