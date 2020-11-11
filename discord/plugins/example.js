// import a search module or write one yourself
const searchModule = (query) => new Promise((resolve) => {
     setTimeout(() => {
       resolve([
        {
          name: query + "_1",
          link: "https://stackoverflow.com/questions/30047205/how-can-i-check-if-an-environment-variable-is-set-in-node-js"
        },
        {
          name: query.toUpperCase() + "_2",
          link: "https://stackoverflow.com/questions/58858782/using-the-dynamic-import-function-on-node-js"
        },
        {
          name: query + "_3",
          link: "https://stackoverflow.com/questions/31354559/using-node-js-require-vs-es6-import-export/31367852#31367852"
        }
      ]);
     }, 3000);
   });

const search = async (query) => {
  // change query to new format if needed
  const transformed = query.toLowerCase();

  // get results from your search module
  const results = await searchModule(transformed);

  // make sure results is an object of form [{name: string, url: string}]
  return results.map(({name, link}) => ({name, url: link}));
}

module.exports = search;