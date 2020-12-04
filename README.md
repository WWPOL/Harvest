![harvest](https://static.wikia.nocookie.net/jjba/images/4/4d/Harvest.png/revision/latest?cb=20150523152239)

# PROJECT: GREEDY BEETLE (aka Harvest)
Discord bot to fetch torrents.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)
- [Operation](#operation)

# Overview
Currently thinking of this as a 2 part project, one is the discord bot that 
handles the commands and notifications and the other will be a plugin to a 
torrent client (thinking Deluge for now) that kicks off downloads and tells the 
bot to respond to in Discord.

# Development
Uses NodeJs and Yarn. Uses environment variables for configuration.

Install dependencies:

```
yarn install
```

Set environment variables (See  the [Operation - Configuration](#configuration)
section).

Start the server:

```
yarn start
```

# Operation
## Configuration
Set configuration through environment variables. All values except the Discord 
configuration variables can be left blank for development.

**Discord**:  

- `HARVEST_DISCORD_TOKEN` (string)

**Transmission RPC**:  

- `HARVEST_TRANSMISSION_HOST` (string, default `127.0.0.1`)
- `HARVEST_TRANSMISSION_PORT` (integer, default `9091`)
- `HARVEST_TRANSMISSION_USERNAME` (string, default empty string)
- `HARVEST_TRANSMISSION_PASSWORD` (string, default empty string)
- `HARVEST_TRANSMISSION_SSL` (boolean, default `false`)
- `HARVEST_TRANSMISSION_URL` (string, default `/transmission/rpc`)

**Download Directory**:  
- `HARVEST_DOWNLOAD_DIR` (string, default `./dev-resource-dl`)
- `HARVEST_DOWNLOAD_DIR_MAX_BYTES` (integer, default `5,368,706,371` 5 Giga*Bytes*)

**MongoDB**:  

- `HARVEST_MONGO_URI` (string, default `mongodb://127.0.0.1`)
- `HARVEST_MONGO_DB_NAME` (string, default `dev-harvest`)
