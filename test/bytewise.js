'use strict'

const test = require('tape')
const bytewise = require('bytewise')
const tempy = require('tempy')
const level = require('..')

test('bytewise key encoding', function (t) {
  t.plan(7)

  const location = tempy.directory()
  const db1 = level(location, { keyEncoding: bytewise, valueEncoding: 'json' })
  const db2 = level(location, { keyEncoding: bytewise, valueEncoding: 'json' })
  const value = Math.floor(Math.random() * 100000)

  db1.put(['a'], value, function (err) {
    t.ifError(err)

    db2.get(['a'], function (err, x) {
      t.ifError(err)
      t.is(x, value)
    })

    db1.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [[['a'], value]], 'a got correct entries')
    })
    db2.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [[['a'], value]], 'b got correct entries')
    })
  })

  t.on('end', function () {
    // TODO: await
    db1.close()
    db2.close()
  })
})
