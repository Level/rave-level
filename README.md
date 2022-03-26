# rave-level

**Use a LevelDB database from multiple processes with seamless failover.** Normally with [`level`](https://github.com/Level/level) opening the same location more than once would result in a [`LEVEL_LOCKED`](https://github.com/Level/abstract-level#errors) error. With `rave-level` the first process that succeeds in taking the LevelDB lock becomes the "leader" and creates a [`many-level`](https://github.com/Level/many-level) host to which other processes connect over a unix socket (Linux and Mac) or named pipe (Windows), transparently electing a new leader when it goes down. Pending database operations are then retried and iterators resumed at the last visited key as if nothing happened.

> :pushpin: Which module should I use? What happened to [`level-party`](https://github.com/Level/party)? Head over to the [FAQ](https://github.com/Level/community#faq).

[![level badge][level-badge]](https://github.com/Level/awesome)
[![npm](https://img.shields.io/npm/v/rave-level.svg)](https://www.npmjs.com/package/rave-level)
[![Node version](https://img.shields.io/node/v/rave-level.svg)](https://www.npmjs.com/package/rave-level)
[![Test](https://img.shields.io/github/workflow/status/Level/rave-level/Test?label=test)](https://github.com/Level/rave-level/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/codecov/c/github/Level/rave-level?label=&logo=codecov&logoColor=fff)](https://codecov.io/gh/Level/rave-level)
[![Standard](https://img.shields.io/badge/standard-informational?logo=javascript&logoColor=fff)](https://standardjs.com)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)
[![Donate](https://img.shields.io/badge/donate-orange?logo=open-collective&logoColor=fff)](https://opencollective.com/level)

## Usage

```js
const { RaveLevel } = require('rave-level')
const db = new RaveLevel('./db')
```

## API

### `db = new RaveLevel(location[, options])`

The arguments are the same as [`level`](https://github.com/Level/level) (v8.0.0 and above) as is the API of the returned database, making `rave-level` a drop-in replacement for `level` for when you need to read and write to the given `location` from multiple processes simultaneously. It has one additional option:

- `retry` (boolean, default `true`): if true, operations are retried upon connecting to a new leader. The `db` cannot provide [snapshot guarantees](https://github.com/Level/abstract-level#iterator) in this case because new iterators (and thus snapshots) will be created by the leader. If false, operations are aborted upon disconnect, which means to yield an error on e.g. `db.get()`.

The database opens itself but (unlike `level`) cannot be re-opened once `db.close()` has been called. Calling `db.open()` would then yield a [`LEVEL_NOT_SUPPORTED`](https://github.com/Level/abstract-level#errors) error. Closing the database or exiting the process triggers re-election in other processes.

### Events

A database will only emit [events](https://github.com/Level/abstract-level#events) that are the result of its own operations (rather than other processes). There's one additional event, emitted when `db` has been elected as the leader:

```js
db.on('leader', function () {
  console.log('I am the leader now')
})
```

## Install

With [npm](https://npmjs.org) do:

```
npm install rave-level
```

## Contributing

[`Level/rave-level`](https://github.com/Level/rave-level) is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [Contribution Guide](https://github.com/Level/community/blob/master/CONTRIBUTING.md) for more details.

## Donate

Support us with a monthly donation on [Open Collective](https://opencollective.com/level) and help us continue our work.

## License

[MIT](LICENSE)

[level-badge]: https://leveljs.org/img/badge.svg
