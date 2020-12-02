import HTTPAPI from "./index";

process.on("unhandledRejection", (error: any) => {
    console.error(`${new Date().toISOString()} ERR Unhandled promise rejection`);
    console.trace(error);
});

const api = new HTTPAPI();
api.run()
    .then(() => {
        console.log("Done")
        process.exit(0);
    })
    .catch((e: any) => {
        console.error(`Error: ${e}`);
        console.error("Exiting");
        process.exit(1);
    });
