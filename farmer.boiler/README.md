# Farmer
Server component of Harvest.

# Table Of Contents
- [Overview](#overview)

# Overview
Provides the Harvest API which implements all backend features.

4. Start the bot `deno run -A --quiet mod.ts`

**Note:** To run the bot with [PM2](https://github.com/Unitech/pm2): `pm2 start mod.ts --interpreter="deno" --interpreter-args="run -A --quiet -r" `

## Features

## Beginner Developers

Don't worry a lot of developers start out coding their first projects as a Discord bot(I did 😉) and it is not so easy. With Discordeno, I tried to build it in a way that solved all the headaches I had when first starting out coding bots. If you are a beginner developer, please use this boilerplate.

**Modular commands, arguments, events, inhibitors, monitors, tasks.**

- Clean and powerful commands system
  - Powerful argument handling including validating, parsing and modifications.
  - Easily create custom arguments for your specific needs.
  - Command aliases.
  - Cooldowns and allowed uses before cooldown triggers.
  - Author and bot permission checks in server AND in channel!
- Clean and powerful events system
  - Simple functions that are called when an event occurs.
  - Easily reloadable!
  - No possible memory leaks due to incorrect EventEmitter usage!
  - Useful events available to help debug!
- Clean and powerful inhibitors system
  - Stops a command from running if a requirement fails.
  - Easily add custom inhibitors!
- Clean and powerful monitors system.
  - Runs a function on every message sent. Useful for stuff like auto-moderation or tags.
  - Easily ignore bots, users, edits, dms.
  - Powerful permission checks.
- Clean and powerful tasks system.
  - Runs a function at a certain interval. Useful for things like unmute and updating bot lists etc.
  - Can be used for cache sweeping to keep your cache optimized for exactly what you want.
  - Botlists code already made for most botlists. Just add your api tokens for each site and magic!
- Clean and powerful languages system.
  - Built in multi-lingual support.
  - Uses i18next, one of the best localization tools available.
  - Supports nested folders to keep cleaner translation files

**Hot Reloadable**

- Easily update your code without having to restart the bot everytime.

**Step By Step Guide**

- There is a step by step walkthrough to learn how to create Discord bots with Discordeno on our website! https://discordeno.mod.land/stepbystep
