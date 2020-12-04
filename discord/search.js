const crypto = require("crypto");

/**
 * Searches for a torrent and returns array of objects with the
 * keys: { name: string, size: int, seeders: int, url: string }.
*/
const searchModule = (query) =>
  new Promise((resolve) => {
    const separators = [" ", ".", "-", "_"];
    const randomSep = () =>
      separators[Math.floor(Math.random() * separators.length)];
    const genName = () =>
      query
        .split("")
        .map((c) => {
          if (separators.includes(c)) {
            return randomSep();
          } else if (Math.random() > 0.5) {
            return c.toUpperCase();
          } else {
            return c.toLowerCase();
          }
        })
        .join("");

    const magStart = "magnet:?xt=urn:btih:";
    const genLink = () => magStart + crypto.randomBytes(32).toString("hex");

    const genItem = () => ({ name: genName(), link: genLink() });
    setTimeout(() => {
      resolve(Array.from({ length: 15 }, genItem));
    }, 3000);
  });

const search = async (query) => {
  // change query to new format if needed
  const transformed = query.toLowerCase();

  // get results from your search module
  const results = await searchModule(transformed);

  console.log(results);

  // make sure results is an object of form [{name: string, size: string, seeders: int, url: string}], and no more than 10 items
  return results.slice(0, 3).map(({ name, link }) => ({ name, url: link }));
};

module.exports = search;
