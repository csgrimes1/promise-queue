'use strict';

const defer = require('./defer')
const stoplight = require('./stoplight')
const bluebird = require('bluebird')

function deferTask (taskFunction, runCounter) {
  const deferred = defer();
  const taskPromisified = bluebird.method(taskFunction)
  runCounter(1) //Count as queued, then decrement below after it runs
  return {
    run: () => taskPromisified()
      .then(result => runCounter(-1) || deferred.resolve(result))
      .catch(err => runCounter(-1) || deferred.reject(err)),
    promise: deferred.promise
  }
}

class PromiseQueue {
  constructor () {
    this.waitblocker = stoplight.create()
    this.count = 0
    this.serializeConcurrency = require('throat')(1)
    this.pauser = stoplight.create()
  }

  pause () {
    this.pauser.setRed()
  }

  resume () {
    this.pauser.setGreen()
  }

  add (... tasks) {
    if (tasks.length <= 0 )
      return Promise.resolve();

    this.waitblocker.setRed()
    const waitOutThePause = () => this.pauser.obey()
    const runCounter = (addend) => {
      this.count = this.count + addend
    }
    const checkWaiters = this._checkWaiters.bind(this)
    const newTasks = tasks.map(task => {
      const deferredTask = deferTask(task, runCounter)
      const waitThenRun = () => {
        return waitOutThePause().then(deferredTask.run)
      }
      this.serializeConcurrency(waitThenRun)
      return deferredTask.promise.then((result) => checkWaiters() || result)
    });
    return newTasks.length === 1 ? newTasks[0] : Promise.all(newTasks)
  }

  _checkWaiters () {
    if (this.length <= 0)
      this.waitblocker.setGreen()
  }

  wait () {
    return this.waitblocker.obey()
  }

  get length () {
    return this.count
  }
};

module.exports = PromiseQueue;
