'use strict'

const test = require('tape')
const tempy = require('tempy')
const level = require('..')

test('sublevel', function (t) {
  t.plan(9)

  const location = tempy.directory()
  const db1 = level(location)
  const db2 = level(location)
  const sub1 = db1.sublevel('test', { valueEncoding: 'json' })
  const sub2 = db2.sublevel('test')
  const obj = { test: Math.floor(Math.random() * 100000) }

  sub1.put('a', obj, function (err) {
    t.ifError(err)

    sub1.get('a', function (err, value) {
      t.ifError(err)
      t.same(value, obj)
    })
    sub2.get('a', function (err, value) {
      t.ifError(err)
      t.same(value, JSON.stringify(obj))
    })
    sub1.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [['a', obj]])
    })
    sub2.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [['a', JSON.stringify(obj)]])
    })
  })

  t.on('end', function () {
    // TODO: await
    db1.close()
    db2.close()
  })
})
