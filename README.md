digital asset wallet for the world

## Setup

### NVM

install NVM to manage node versions

https://github.com/creationix/nvm

```shell
set nvm to use node 8.0.0
```

### Atom

install Atom Text Editor: https://atom.io/

run `./atom-setup.sh` to install atom plugins

Close and reopen Atom after plugin installs. Then set atom Prettier plugin to format code on-save.

## Running Scripts

Run with babel-node to support full ES6 syntax and Flow

```shell
./node_modules/.bin/babel-node <script path>
```
