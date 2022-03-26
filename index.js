'use strict'

const { Level } = require('level')
const { pipeline } = require('readable-stream')
const { ManyLevelHost, ManyLevelGuest } = require('many-level')
const ModuleError = require('module-error')
const fs = require('fs')
const net = require('net')
const path = require('path')

module.exports = function (location, options) {
  const sockPath = process.platform === 'win32'
    ? '\\\\.\\pipe\\rave-level\\' + path.resolve(location)
    : path.join(location, 'rave-level.sock')

  // Create guest database as our public interface
  const guest = new ManyLevelGuest({ retry: true, ...options })

  guest.open(function tryConnect () {
    // Check database status every step of the way
    if (guest.status !== 'open') {
      return
    }

    // Attempt to connect to leader as follower
    const socket = net.connect(sockPath)

    // Track whether we succeeded to connect
    let connected = false
    const onconnect = () => { connected = true }
    socket.once('connect', onconnect)

    // Pass socket as the ref option so we don't hang the event loop.
    pipeline(socket, guest.createRpcStream({ ref: socket }), socket, function () {
      // Disconnected. Cleanup events
      socket.removeListener('connect', onconnect)

      if (guest.status !== 'open') {
        return
      }

      // Attempt to open db as leader
      const db = new Level(location, options)

      db.open(function (err) {
        // If already locked, another process became the leader
        if (err && err.cause && err.cause.code === 'LEVEL_LOCKED') {
          // TODO: This can cause an invisible retry loop that never completes
          // and leads to memory leaks.
          if (connected) {
            return tryConnect()
          } else {
            return setTimeout(tryConnect, 100)
          }
        } else if (err) {
          return error(err)
        }

        // We're the leader now
        fs.unlink(sockPath, function (err) {
          if (guest.status !== 'open') {
            return
          }

          if (err && err.code !== 'ENOENT') {
            return error(err)
          }

          // Create host to expose db
          const host = new ManyLevelHost(db)
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
          guest.attachResource({ close: shutdown })
          guest.attachResource(db)

          // Bypass socket
          // TODO: changes order of operations, because we only later flush previous operations (below)
          guest.forward(db)
          guest.emit('leader')

          // Edge case if a 'leader' event listener closes the db
          if (guest.status !== 'open') {
            return
          }

          server.listen(sockPath, onlistening)
          server.on('error', error)

          function shutdown (cb) {
            for (const sock of sockets) {
              sock.destroy()
            }

            server.removeListener('error', error)
            server.close(cb)
          }

          function onlistening () {
            server.unref()

            if (guest.status !== 'open' || guest.isFlushed()) {
              return
            }

            // Connect to ourselves to flush pending requests
            const sock = net.connect(sockPath)
            const onflush = () => { sock.destroy() }

            pipeline(sock, guest.createRpcStream(), sock, function (err) {
              guest.removeListener('flush', onflush)

              // Socket should only close because of a guest.close()
              if (!guest.isFlushed() && guest.status === 'open') {
                error(new ModuleError('Did not flush', { cause: err }))
              }
            })

            guest.once('flush', onflush)
          }
        })
      })
    })
  })

  function error (err) {
    // TODO: close?
    guest.emit('error', err)
  }

  return guest
}
