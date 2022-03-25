'use strict'

const test = require('tape')
const bytewise = require('bytewise')
const datadir = require('tempy').directory()
const level = require('..')

const lopts = { keyEncoding: bytewise, valueEncoding: 'json' }

test('bytewise key encoding', function (t) {
  t.plan(7)

  const adb = level(datadir, lopts)
  const bdb = level(datadir, lopts)
  const value = Math.floor(Math.random() * 100000)

  adb.put(['a'], value, function (err) {
    t.ifError(err)

    bdb.get(['a'], function (err, x) {
      t.ifError(err)
      t.is(x, value)
    })

    adb.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [[['a'], value]], 'a got correct entries')
    })
    bdb.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [[['a'], value]], 'b got correct entries')
    })
  })

  t.on('end', function () {
    // TODO: await
    adb.close()
    bdb.close()
  })
})
