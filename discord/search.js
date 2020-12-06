const crypto = require("crypto");

/**
 * Searches for a torrent and returns array of objects with the
 * keys: { name: string, size: int, seeders: int, url: string }.
*/
const searchModule = (query) => {
  
};

async function(query) {
  // change query to new format if needed
  const transformed = query.toLowerCase();

  // get results from your search module
  const results = await searchModule(transformed);

  console.log(results);

  // make sure results is an object of form [{name: string, size: string, seeders: int, url: string}], and no more than 10 items
  return results.slice(0, 3).map(({ name, link }) => ({ name, url: link }));
};

module.exports = search;
