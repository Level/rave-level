'use strict'

const test = require('tape')
const tempy = require('./util/tempy')
const path = require('path')
const events = require('events')
const { RaveLevel } = require('..')

test('two databases', function (t) {
  t.plan(5)

  const location = tempy.directory()
  const db1 = new RaveLevel(location, { valueEncoding: 'json' })
  const db2 = new RaveLevel(location, { valueEncoding: 'json' })
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

test('two locations do not conflict', async function (t) {
  const db1 = new RaveLevel(tempy.directory())
  const db2 = new RaveLevel(tempy.directory())

  await db1.put('a', '1')
  await db2.put('a', '2')

  t.is(await db1.get('a'), '1')
  t.is(await db2.get('a'), '2')

  return Promise.all([db1.close(), db2.close()])
})

process.platform === 'win32' && test('cannot use nested location', async function (t) {
  const location = tempy.directory()
  const db1 = new RaveLevel(location)

  await events.once(db1, 'leader')

  const db2 = new RaveLevel(path.join(location, 'foo'))
  const [err] = await events.once(db2, 'error')

  t.is(err.code, 'EACCES', 'failed to create named pipe server')

  return Promise.all([db1.close(), db2.close()])
})
