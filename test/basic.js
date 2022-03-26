'use strict'

const test = require('tape')
const tempy = require('tempy')
const level = require('..')

test('two databases', function (t) {
  t.plan(5)

  const location = tempy.directory()
  const db1 = level(location, { valueEncoding: 'json' })
  const db2 = level(location, { valueEncoding: 'json' })
  const value = Math.floor(Math.random() * 100000)

  db1.put('a', value, function (err) {
    t.ifError(err)

    db2.get('a', function (err, x) {
      t.ifError(err)
      t.is(x, value)

      db1.close(function (err) {
        t.ifError(err)

        db2.close(function (err) {
          t.ifError(err)
        })
      })
    })
  })
})
