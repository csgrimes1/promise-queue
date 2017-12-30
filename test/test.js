'use strict'

const PromiseQueue = require('../src/promise-queue')
const Promise = require('bluebird')
const expect = require('chai').expect

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
    it('should return a promise that resolves and rejects appropriately', () => {
      const pq = new PromiseQueue()

      const p = pq.add(() => {
        throw new Error('p')
      })
      .then(() => {
        expect(true).to.equal('We should never get here')
      }).catch(err => {
        expect(err.message).to.equal('p')
      })

      const p2 = pq.add(() => {
        return Promise.reject(new Error('p2'))
      })
      .then(() => {
        expect(true).to.equal('We should never get here')
      }).catch(err => {
        expect(err.message).to.equal('p2')
      })

      const p3 = pq.add(() => {
        return 'p3'
      })
      .then(val => {
        expect(val).to.equal('p3')
      }).catch((x) => {
        expect(true).to.equal('We should never get here')
      })

      const p4 = pq.add(() => {
        return Promise.resolve('p4')
      })
      .then(val => {
        expect(val).to.equal('p4')
      }).catch(() => {
        expect(true).to.equal('We should never get here')
      })
      //Next line added to prevent false positive test results
      return Promise.all([p, p2, p3, p4])
        .then(() => pq.wait());
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

  describe('length', () => {
    it('should increase and decrease as items are added and completed', () => {
      const pq = new PromiseQueue()
      const totalToProcess = 20
      let num = 0
      let promises = []
      for (let i = 0; i < totalToProcess; i++) {
        promises.push(pq.add(() => {
          return new Promise((resolve, reject) => {
            const ms = Math.floor(Math.random() * 50)
            const func = Math.random() < 0.5 ? resolve : reject
            setTimeout(func, ms)
          })
        }).then(() => {
          num -= 1
          expect(pq.length).to.equal(num)
        }).catch(() => {
        }))
        num += 1
        expect(pq.length).to.equal(num)
      }

      return Promise.all(promises)
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
