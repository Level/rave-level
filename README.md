# rave-level

Open a leveldb handle multiple times, transparently upgrading to use
[`many-level`](https://github.com/Level/many-level) when more than 1 process try to use the same leveldb data directory at once and re-electing a new master when the primary unix socket goes down.

[![level badge][level-badge]](https://github.com/Level/awesome)
[![npm](https://img.shields.io/npm/v/rave-level.svg)](https://www.npmjs.com/package/rave-level)
[![Node version](https://img.shields.io/node/v/rave-level.svg)](https://www.npmjs.com/package/rave-level)
[![Test](https://img.shields.io/github/workflow/status/Level/rave-level/Test?label=test)](https://github.com/Level/rave-level/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/codecov/c/github/Level/rave-level?label=&logo=codecov&logoColor=fff)](https://codecov.io/gh/Level/rave-level)
[![Standard](https://img.shields.io/badge/standard-informational?logo=javascript&logoColor=fff)](https://standardjs.com)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)
[![Donate](https://img.shields.io/badge/donate-orange?logo=open-collective&logoColor=fff)](https://opencollective.com/level)

## Example

Normally with [`level`](https://npmjs.org/package/level), when you try to open
a database handle from more than one process you will get a locking error:

```
events.js:72
        throw er; // Unhandled 'error' event
              ^
OpenError: IO error: lock /home/substack/projects/rave-level/example/data/LOCK: Resource temporarily unavailable
    at /home/substack/projects/rave-level/node_modules/level/node_modules/level-packager/node_modules/levelup/lib/levelup.js:114:34
```

With `rave-level`, the database open will automatically drop down to using
multilevel over a unix socket using metadata placed into the level data
directory transparently.

This means that if you have 2 programs, 1 that gets:

```js
const level = require('rave-level')
const db = level(__dirname + '/data', { valueEncoding: 'json' })

setInterval(function () {
  db.get('a', function (err, value) {
    console.log('a=', value)
  })
}, 250)
```

And 1 that puts:

```js
const level = require('rave-level')
const db = level(__dirname + '/data', { valueEncoding: 'json' })

const n = Math.floor(Math.random() * 100000)

setInterval(function () {
  db.put('a', n + 1)
}, 1000)
```

and you start them up in any order, everything will just work! No more
`IO error: lock` exceptions.

```
$ node put.js & sleep 0.2; node put.js & sleep 0.2; node put.js & sleep 0.2; node put.js & sleep 0.2
[1] 3498
[2] 3502
[3] 3509
[4] 3513
$ node get.js
a= 35340
a= 31575
a= 37639
a= 58874
a= 35341
a= 31576
$ node get.js
a= 35344
a= 31579
a= 37643
a= 58878
a= 35345
^C
```

Hooray!

## Seamless failover

rave-level does seamless failover. This means that if you create a read-stream
and the leader goes down while you are reading that stream rave-level will resume your stream on the new leader.

This disables [snapshot guarantees](https://github.com/Level/abstract-level#iterator) so if your app relies on this you should disable this by setting `opts.retry = false`:

```js
const db = level('./data', { retry: false }) // will not retry streams / gets / puts if the leader goes down
```

## Windows support

`rave-level` works on Windows as well using named pipes.

## API

### `db = level(...)`

The arguments are exactly the same as [`level`](https://npmjs.org/package/level). You will sometimes get a real leveldb handle and sometimes get a `many-level` handle back in the response.

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
