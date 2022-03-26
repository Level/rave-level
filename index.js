'use strict'

const { Level } = require('level')
const { pipeline } = require('readable-stream')
const { ManyLevelHost, ManyLevelGuest } = require('many-level')
const ModuleError = require('module-error')
const fs = require('fs')
const net = require('net')
const path = require('path')

const kLocation = Symbol('location')
const kSocketPath = Symbol('socketPath')
const kOptions = Symbol('options')
const kConnect = Symbol('connect')
const kDestroy = Symbol('destroy')

exports.RaveLevel = class RaveLevel extends ManyLevelGuest {
  constructor (location, options = {}) {
    super({ retry: true, ...options })

    this[kLocation] = path.resolve(location)
    this[kSocketPath] = socketPath(this[kLocation])
    this[kOptions] = options
    this[kConnect] = this[kConnect].bind(this)
    this[kDestroy] = this[kDestroy].bind(this)

    this.open(this[kConnect])
  }

  [kConnect] () {
    // Check database status every step of the way
    if (this.status !== 'open') {
      return
    }

    // Attempt to connect to leader as follower
    const socket = net.connect(this[kSocketPath])

    // Track whether we succeeded to connect
    let connected = false
    const onconnect = () => { connected = true }
    socket.once('connect', onconnect)

    // Pass socket as the ref option so we don't hang the event loop.
    pipeline(socket, this.createRpcStream({ ref: socket }), socket, () => {
      // Disconnected. Cleanup events
      socket.removeListener('connect', onconnect)

      if (this.status !== 'open') {
        return
      }

      // Attempt to open db as leader
      const db = new Level(this[kLocation], this[kOptions])

      // TODO: refactor to unnest functions
      db.open((err) => {
        // If already locked, another process became the leader
        if (err && err.cause && err.cause.code === 'LEVEL_LOCKED') {
          // TODO: This can cause an invisible retry loop that never completes
          // and leads to memory leaks.
          if (connected) {
            return this[kConnect]()
          } else {
            return setTimeout(this[kConnect], 100)
          }
        } else if (err) {
          return this[kDestroy](err)
        }

        // We're the leader now
        fs.unlink(this[kSocketPath], (err) => {
          if (this.status !== 'open') {
            return
          }

          if (err && err.code !== 'ENOENT') {
            return this[kDestroy](err)
          }

          // Create host to expose db
          const host = new ManyLevelHost(db)
          const self = this
          const sockets = new Set()

          // Start server for followers
          const server = net.createServer(function (sock) {
            sock.unref()
            sockets.add(sock)

            pipeline(sock, host.createRpcStream(), sock, function () {
              sockets.delete(sock)
            })
          })

          // When guest db is closed, close server and db.
          // TODO: wait until listening?
          this.attachResource({ close: shutdown })
          this.attachResource(db)

          // Bypass socket
          // TODO: changes order of operations, because we only later flush previous operations (below)
          this.forward(db)
          this.emit('leader')

          // Edge case if a 'leader' event listener closes the db
          if (this.status !== 'open') {
            return
          }

          server.listen(this[kSocketPath], onlistening)
          server.on('error', this[kDestroy])

          function shutdown (cb) {
            for (const sock of sockets) {
              sock.destroy()
            }

            server.removeListener('error', self[kDestroy])
            server.close(cb)
          }

          function onlistening () {
            server.unref()

            if (self.status !== 'open' || self.isFlushed()) {
              return
            }

            // Connect to ourselves to flush pending requests
            const sock = net.connect(self[kSocketPath])
            const onflush = () => { sock.destroy() }

            pipeline(sock, self.createRpcStream(), sock, function (err) {
              self.removeListener('flush', onflush)

              // Socket should only close because of a self.close()
              if (!self.isFlushed() && self.status === 'open') {
                self[kDestroy](new ModuleError('Did not flush', { cause: err }))
              }
            })

            self.once('flush', onflush)
          }
        })
      })
    })
  }

  [kDestroy] (err) {
    // TODO: close?
    this.emit('error', err)
  }
}

/* istanbul ignore next */
const socketPath = function (location) {
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\rave-level\\' + location
  } else {
    return path.join(location, 'rave-level.sock')
  }
}
