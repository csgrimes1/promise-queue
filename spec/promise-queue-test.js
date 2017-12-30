'use strict'

const PromiseQueue = require('../src/promise-queue')
const Promise = require('bluebird')
const expect = require('chai').expect
const sinon = require('sinon')
const assert = require('assert')

describe('PromiseQueue', function () {
  this.slow(3000)
  this.timeout(15000)

  describe('constructor', () => {
    it('should create a stopped queue with length 0', () => {
      const pq = new PromiseQueue()
      expect(pq.length).to.equal(0)
    })
  })

  describe('add (single)', () => {
    it('should reject a throw of a synchronous error', () => {
      const catchSpy = sinon.spy()
      const pq = new PromiseQueue()
      const message = 'synchronous error'

      return pq.add(() => {
        throw new Error(message)
      })
        .catch(err => {
          catchSpy()
          assert.equal(err.message, message)
        })
        .then(() => {
          assert(catchSpy.called)
        })
    })
    it('should reject an asynchronous error', () => {
      const catchSpy = sinon.spy()
      const pq = new PromiseQueue()
      const message = 'asynchronous error'

      return pq.add(() =>
        Promise.reject(new Error(message))
      )
        .catch(err => {
          catchSpy()
          assert.equal(err.message, message)
        })
        .then(() => {
          assert(catchSpy.called)
        })
    })
    it('should resolve a synchronous result', () => {
      const pq = new PromiseQueue()
      const result = 'abcdefg'
      return pq.add(() => result)
        .then((val) => {
          assert.equal(val, result)
        })
    })
    it('should resolve an asynchronous result', () => {
      const pq = new PromiseQueue()
      const result = 'abcdefg'
      return pq.add(() => Promise.resolve(result))
        .then((val) => {
          assert.equal(val, result)
        })
    })
  })

  describe('add (batch)', () => {
    it('should process items in order and return a promise that resolves to an array of return values', () => {
      const pq = new PromiseQueue()
      const totalToProcess = 20
      const maxTaskMs = 20
      let numProcessed = 0
      const task = val => {
        return Promise.delay(Math.random() * maxTaskMs).then(() => {
          expect(val).to.equal(numProcessed++)
          return `Resolved: ${val}`
        })
      }
      const tasks = []
      for (let i = 0; i < totalToProcess; i++) {
        tasks.push(() => task(i))
      }
      return pq.add(...tasks).then(ret => {
        expect(numProcessed).to.equal(totalToProcess)
        expect(pq.length).to.equal(0)
        ret.forEach((str, idx) => {
          expect(str).to.equal(`Resolved: ${idx}`)
        })
      })
    })
  })

  function *generate(size) {
    for(let i=0; i<size; i++)
      yield i
  }

  describe('length', () => {
    it('should increase and decrease as items are added and completed', () => {
      const pq = new PromiseQueue()
      const totalToProcess = 20
      let num = 0
      const items = Array.from(generate(totalToProcess))
      .map(i => {
        const ms = Math.floor(Math.random() * 10)
        const doResolve = Math.random() < 0.5
        pq.add(() => {
          return Promise.delay(ms)
            .then(() => {
              if (doResolve)
                return i
              else {
                throw new Error(`Throwing at ${i}`)
              }
            })
        }).then((result) => {
          assert(doResolve)
          assert.equal(result, i)
        }).catch((x) => {
          assert(!doResolve)
        }).then(() => {
          num -= 1
          expect(pq.length).to.equal(num)
        })
        num += 1
        expect(pq.length).to.equal(num)
      })

      return Promise.all(items)
    })

    it('should not be settable', () => {
      const pq = new PromiseQueue()
      const fn = () => {
        pq.length = 3
      }
      expect(fn).to.throw(Error)
    })
  })

  describe('pause/resume', () => {
    const pq = new PromiseQueue()
    let val = 0
    it('should allow pausing a queue', () => {
      for (let i = 0; i < 10; i++) {
        pq.add(() => {
          return Promise.delay(i * 10).then(() => {
            val++
            if (val === 5) pq.pause()
          })
        })
      }
      return Promise.delay(600).then(() => {
        expect(val).to.equal(5)
      })
    })
    it('should allow resuming a queue', () => {
      pq.resume()
      return Promise.delay(600).then(() => {
        expect(val).to.equal(10)
      })
    })
  })

  describe('wait', () => {
    it('should allow waiting for a queue', () => {
      const pq = new PromiseQueue()
      let val = 0

      for (let i = 0; i < 10; i++) {
        pq.add(() => Promise.delay(i * 10).then(() => val++))
      }

      pq.wait().then(() => {
        expect(val).to.equal(30)
      })

      Promise.delay(100).then(() => {
        pq.add(() => Promise.delay(200).then(() => (val += 20)))
      })

      return pq.wait().then(() => {
        expect(val).to.equal(30)
      })
    })

    it('should allow waiting on an empty queue', () => {
      const pq = new PromiseQueue()
      return pq.wait()
    })
  })
})
