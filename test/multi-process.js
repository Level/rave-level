'use strict'

const test = require('tape')
const tempy = require('tempy')
const { once } = require('events')
const { fork } = require('child_process')
const level = require('..')

if (process.argv[2] === 'child') {
  const [location, key, value] = process.argv.slice(3)
  const db = level(location)

  db.put(key, value, function (err) {
    if (err) throw err
  })
} else {
  test('multiple processes', async function (t) {
    const location = tempy.directory()
    const entries = []
    const promises = []
    const exits = []

    for (let i = 0; i < 10; i++) {
      const key = String(i).padStart(5, '0')
      const value = String(Math.random())
      const argv = ['child', location, key, value]
      const child = fork(__filename, argv, { timeout: 30e3 })

      entries.push([key, value])
      promises.push(once(child, 'exit'))
      exits.push([0, null])
    }

    t.same(await Promise.all(promises), exits)
    t.same(await level(location).iterator().all(), entries)
  })
}
