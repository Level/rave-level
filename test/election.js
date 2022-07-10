'use strict'

const test = require('tape')
const { once } = require('events')
const tempy = require('./util/tempy')
const { RaveLevel } = require('..')

test('basic failover', async function (t) {
  const location = tempy.directory()
  const db1 = new RaveLevel(location)
  await once(db1, 'leader')

  const db2 = new RaveLevel(location)
  const values = new Array(100).fill(0).map((_, i) => String(i))
  const promises = values.map(v => db2.put(v.padStart(3, '0'), v))

  await Promise.all([db1.close(), once(db2, 'leader'), ...promises])

  t.same(await db2.values().all(), values)
})

test('failover election party', function (t) {
  const location = tempy.directory()
  const keys = ['a', 'b', 'c', 'e', 'f', 'g']
  const len = keys.length
  t.plan(len * (len + 1) / 2)
  let pending = keys.length
  const databases = {}

  keys.forEach(function (key) {
    const h = open(key)
    h.on('open', function () {
      if (--pending === 0) spinDown()
    })
  })

  function open (key) {
    const h = databases[key] = new RaveLevel(location, { valueEncoding: 'json' })
    return h
  }

  function spinDown () {
    const alive = keys.slice();
    (function next () {
      if (alive.length === 0) return

      check(alive, function () {
        const key = alive.shift()
        databases[key].close()
        next()
      })
    })()
  }

  function check (keys, cb) {
    let pending = keys.length
    if (pending === 0) return cb()
    for (let i = 0; i < keys.length; i++) {
      (function (a, b) {
        const value = Math.random()
        databases[a].put(a, value, function (err) {
          if (err) t.fail(err)
          databases[b].get(a, function (err, x) {
            if (err) t.fail(err)
            t.equal(x, value)
            if (--pending === 0) cb()
          })
        })
      })(keys[i], keys[(i + 1) % keys.length])
    }
  }
})
