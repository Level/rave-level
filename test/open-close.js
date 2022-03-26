'use strict'

const test = require('tape')
const { once } = require('events')
const tempy = require('tempy')
const level = require('..')

test('self-flush', async function (t) {
  const db = level(tempy.directory())

  // Don't await
  db.put('abc', 'xyz')

  await once(db, 'leader')
  await once(db, 'flush')

  t.is(await db.get('abc'), 'xyz')
})

test('self-flush canceled by db.close()', function (t) {
  t.plan(3)

  const db = level(tempy.directory())

  db.put('abc', 'xyz').catch((err) => {
    t.is(err.code, 'LEVEL_DATABASE_NOT_OPEN')
    t.is(err.message, 'Aborted on database close()')
  })

  db.once('leader', () => {
    // Don't give leader a chance to flush
    db.close(t.ifError.bind(t))
  })
})

test('self-flush canceled by db.close() with different timing', async function (t) {
  t.plan(2)

  const db = level(tempy.directory())

  db.put('abc', 'xyz').catch((err) => {
    t.is(err.code, 'LEVEL_DATABASE_NOT_OPEN')
    t.is(err.message, 'Aborted on database close()')
  })

  await once(db, 'leader')

  // Don't give leader a chance to flush
  await db.close()
})

test('immediate close', function (t) {
  t.plan(2)

  const db = level(tempy.directory())

  db.put('abc', 'xyz').catch((err) => {
    t.is(err.code, 'LEVEL_DATABASE_NOT_OPEN')
    t.is(err.message, 'Aborted on database close()')
  })

  return db.close()
})

test('failure to open', function (t) {
  t.plan(1)

  const db = level(tempy.directory(), { createIfMissing: false })

  db.once('error', function (err) {
    t.is(err.code, 'LEVEL_DATABASE_NOT_OPEN')
  })
})