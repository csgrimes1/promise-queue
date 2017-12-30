'use strict'
const bluebird = require('bluebird')
const sinon = require('sinon')
const assert = require('assert')
const stoplight = require('../src/stoplight')

describe('stoplight', () => {

  it('should block on a red light', () => {
    const signal = stoplight.create(stoplight.red)
    const catchSpy = sinon.spy()
    const longPromise = bluebird.delay(30000)
    const bbPromise = bluebird.join(signal.obey(), (x) => x)
    return bbPromise.timeout(100)
      .catch((x) => {
          assert(x instanceof bluebird.TimeoutError)
          catchSpy()
      })
      .then((r) => {
        assert(catchSpy.called)
      })
  })

  it('should not block on a green light', () => {
    const signal = stoplight.create()
    assert.equal(signal.checkState(), stoplight.green)
    return signal.obey()
  })

  it('should unblock on a switch from red to green', () => {
    const signal = stoplight.create(stoplight.red)
    const p = signal.obey()

    assert.equal(signal.checkState(), stoplight.red)
    signal.setGreen()
    assert.equal(signal.checkState(), stoplight.green)
    return p
  })

})
