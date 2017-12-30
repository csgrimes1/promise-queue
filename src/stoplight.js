'use strict'

const green = Symbol(),
  red = Symbol()
const defer = require('./defer')

function create (state = green) {
  let deferred = state === red ? defer() : null
  const checkState = () => deferred ? red : green

  let stoplight = {
    checkState,
    setRed: () => {
      if (checkState() === green)
        deferred = defer()
    },
    setGreen: () => {
      if (checkState() === red) {
        deferred.resolve()
        deferred = null
      }
    },
    obey: () => deferred ? deferred.promise : Promise.resolve()
  }
  return stoplight
}

module.exports = {
  create,
  green,
  red
}
