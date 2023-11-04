<div align="center">
<img src="https://cdn.clytage.org/images/logo.png" alt="Clytage Logo" width="152px" height="152px"/>

# @clytage/firewalld-mechanique-danalyse-cardinale

Manage your FirewallD's configuration easily from Discord bot.

[![GitHub](https://img.shields.io/github/license/clytage/firewalld-mechanique-danalyse-cardinale)](https://github.com/clytage/firewalld-mechanique-danalyse-cardinale/blob/main/LICENSE)
[![Discord](https://discord.com/api/guilds/972407605295198258/embed.png)](https://clytage.org/discord)

</div>

# Installation
1. Clone this repository
1. Rename `.env_example` to `.env`
1. Fill out the `.env` file
1. Install the dependencies
```bash
pnpm install 
# or npm
npm install
```
5. Run the bot
```bash
npm start
```

## with NixOS
1. Fill out the env file
1. Install dependencies
```bash
nix-shell -A install
```
3. Run the bot
```bash
nix-shell -A run
```
