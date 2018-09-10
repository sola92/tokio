digital asset wallet for the world

## Setup

### NVM

install NVM to manage node versions

https://github.com/creationix/nvm

set nvm to use `node 8.9.0`

```shell
nvm install 8.9.0
nvm use 8.9.0
```

### NPM Install (through Yarn)

Yarn is a faster, more predictable version of `npm`. Set it up as a global command

```
npm install -g yarn
```

Install project dependencies with by running

```
yarn
```

### Setup bash profile

Append this to your `.bashrc` or `.bash_profile`

```shell
export TOKIO_ROOT=/Users/solaogunsakin/Downloads/buyer

tokionode() {
	${TOKIO_ROOT}/node_modules/.bin/babel-node "$@"
}

export -f tokionode
```

## Running Scripts

Run with tokionode to support full ES6 syntax and Flow

```shell
tokionode <script path>
```

### Atom

install Atom Text Editor: https://atom.io/

run `./atom-setup.sh` to install atom plugins

Close and reopen Atom after plugin installs. Then set atom Prettier plugin to format code on-save.
