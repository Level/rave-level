'use strict'

const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const tmp = require('os').tmpdir()

// We previously used https://www.npmjs.com/package/tempy but it
// returns directories that are too long. On Mac, the maximum length
// of a unix domain socket is 104 bytes. Exceeding that can result
// in EADDRINUSE errors.
exports.directory = function () {
  const dir = path.join(tmp, crypto.randomBytes(10).toString('hex'))
  fs.mkdirSync(dir)
  return dir
}
