'use strict'

const test = require('tape')
const tempy = require('./util/tempy')
const { once } = require('events')
const { fork } = require('child_process')
const { RaveLevel } = require('..')

if (process.argv[2] === 'child') {
  const [location, key, value] = process.argv.slice(3)
  const db = new RaveLevel(location)

  db.put(key, value, function (err) {
    if (err) throw err
  })
} else {
  // Repeat because we have/had random issues here
  for (let i = 0; i < 20; i++) {
    test(`multiple processes (${i})`, async function (t) {
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
      t.same(await new RaveLevel(location).iterator().all(), entries)
    })
  }
}
