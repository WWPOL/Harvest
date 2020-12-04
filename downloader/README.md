# Downloader
Receives requests to download resources and saves them onto disk.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)

# Overview
A NodeJs HTTP API server written in Typescript.

# Development
Install dependencies:

```
yarn install
```

Run the Transmission Torrent Daemon:

```
./transmission-daemon
```

Start automatically reloading server:

```
yarn dev
```

To compile the Typescript into Javascript and run the server "normally":

```
yarn build # Result in lib/ directory
yarn start
```
