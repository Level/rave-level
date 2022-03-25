'use strict'

// TODO: rename file

const test = require('tape')
const level = require('..')
const datadir = require('tempy').directory()

test('sublevel on rave-level', function (t) {
  t.plan(9)

  const a = level(datadir)
  const b = level(datadir)
  const asub = a.sublevel('test', { valueEncoding: 'json' })
  const bsub = b.sublevel('test')
  const obj = { test: Math.floor(Math.random() * 100000) }

  asub.put('a', obj, function (err) {
    t.ifError(err)

    asub.get('a', function (err, value) {
      t.ifError(err)
      t.same(value, obj)
    })
    bsub.get('a', function (err, value) {
      t.ifError(err)
      t.same(value, JSON.stringify(obj))
    })
    asub.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [['a', obj]])
    })
    bsub.iterator().all(function (err, entries) {
      t.ifError(err)
      t.same(entries, [['a', JSON.stringify(obj)]])
    })
  })

  t.on('end', function () {
    // TODO: await
    a.close()
    b.close()
  })
})
