# Upgrade Guide

This document describes breaking changes and how to upgrade. For a complete list of changes including minor and patch releases, please refer to the [changelog](CHANGELOG.md).

## 1.0.0

**Introducing `rave-level`: a fork of [`level-party`](https://github.com/Level/party) that replaces `multileveldown` and `level@7` with [`many-level`](https://github.com/Level/many-level) and [`classic-level`](https://github.com/Level/classic-level). The latter could also have been `level@8` as that now merely re-exports `classic-level`. These new modules use the [`abstract-level`](https://github.com/Level/abstract-level) interface instead of `abstract-leveldown` and `levelup`. For `rave-level` this means it has the same familiar API including encodings, promises and events but excluding streams. In addition, you can now choose to use Uint8Array instead of Buffer. Sublevels are builtin.**

We've put together several upgrade guides for different modules. See the [FAQ](https://github.com/Level/community#faq) to find the best upgrade guide for you. This one describes how to replace `level-party` with `rave-level`. If you're already familiar with `level@8` and `classic-level` you can skip reading this guide.

Support of Node.js 10 has been dropped.

### What's new here

Courtesy of `many-level`:

- Throughput of iterators has doubled
- Reverse iterators have been fixed to support retry
- Supports `iterator.seek()` (across retries too).

### What is not covered here

If you are using any of the following, please also read the upgrade guide of [`abstract-level@1`](https://github.com/Level/abstract-level/blob/main/UPGRADING.md#100) which goes into more detail about these:

- Not-found errors on `db.get()` (replaced by error codes)
- Sublevels created with [`subleveldown`](https://github.com/Level/subleveldown) (now built-in)
- The `db.iterator().end()` method (renamed to `close()`, with `end()` as an alias)
- Zero-length keys and range options (now valid)
- Chained batches (must now be closed if not committed).

### Changes to initialization

We started using classes, which means using `new` is now required. If you previously did:

```js
const level = require('level-party')
const db = level('db')
```

You must now do:

```js
const { RaveLevel } = require('rave-level')
const db = new RaveLevel('db')
```

Arguments and options are the same, except that `rave-level` is explicit about which options it supports. Meaning `level-party` would implicitly forward some `leveldown` specific options if it was the leader, while `rave-level` only takes options that are relevant for both leader and followers. Namely encoding options and `retry`.

### Creating the location recursively

To align behavior between platforms, `classic-level` and therefore `rave-level` creates the location directory recursively. While `leveldown` and therefore `level-party` would only do so on Windows. In the following example, the `foo` directory does not have to exist beforehand:

```js
const db = new RaveLevel('foo/bar')
```

This new behavior may break expectations, given typical filesystem behavior, or it could be a convenient feature, if the database is considered to abstract away the filesystem. We're [collecting feedback](https://github.com/Level/classic-level/issues/7) to determine what to do in a next (major) version. Your vote is most welcome!

### Streams have moved

Node.js readable streams must now be created with a new standalone module called [`level-read-stream`](https://github.com/Level/read-stream) rather than database methods like `db.createReadStream()`. To offer an alternative to `db.createKeyStream()` and `db.createValueStream()`, two new types of iterators have been added: `db.keys()` and `db.values()`.

### There is only encodings

Encodings have a new home in `abstract-level` and are now powered by [`level-transcoder`](https://github.com/Level/transcoder). The main change is that logic from the existing public API has been expanded down into the storage layer. There are however a few differences from `level-party`. Some breaking:

- The lesser-used `'id'`, `'ascii'`, `'ucs2'` and `'utf16le'` encodings are not supported
- The undocumented `encoding` option (as an alias for `valueEncoding`) is not supported.

And some non-breaking:

- The `'binary'` encoding has been renamed to `'buffer'`, with `'binary'` as an alias
- The `'utf8'` encoding previously did not touch Buffers. Now it will call `buffer.toString('utf8')` for consistency. Consumers can use the `'buffer'` encoding to avoid this conversion.

Uint8Array data is now supported too, although `rave-level` internally uses Buffers. It's a separate encoding called `'view'` that can be used interchangeably:

```js
const db = new RaveLevel('db', { valueEncoding: 'view' })

await db.put('elena', new Uint8Array([97, 98, 99]))
await db.get('elena') // Uint8Array
await db.get('elena', { valueEncoding: 'utf8' }) // 'abc'
await db.get('elena', { valueEncoding: 'buffer' }) // Buffer
```

### Changes to lesser-used properties and methods

The following properties and methods can no longer be accessed, as they've been removed, renamed or replaced with internal [symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol).

| Object   | Property or method | Original module      | New module       |
| :------- | :----------------- | :------------------- | :--------------- |
| iterator | `_nexting`         | `abstract-leveldown` | `abstract-level` |
| iterator | `_ended`           | `abstract-leveldown` | `abstract-level` |

The following properties are now read-only getters.

| Object        | Property | Original module | New module       |
| :------------ | :------- | :-------------- | :--------------- |
| chained batch | `length` | `levelup`       | `abstract-level` |

---

_For earlier releases, before `rave-level` was forked from `level-party` (v5.1.1), please see [the upgrade guide of `level-party`](https://github.com/Level/party/blob/HEAD/UPGRADING.md)._
