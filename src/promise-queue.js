'use strict';

const stoplight = require('./stoplight')
const bluebird = require('bluebird')

function deferTask (taskFunction, runCounter) {
  runCounter(1) //Count as queued, then decrement below after it runs
  return {
    run: () => bluebird.try(taskFunction)
      .then(result => runCounter(-1) || result)
      .catch(err => runCounter(-1) || Promise.reject(err))
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

  _count (addend) {
    this.count = this.count + addend
    if (addend < 0)//Function ran, so we're un-counting it
    this._checkWaiters()
  }

  add (... tasks) {
    if (tasks.length <= 0 )
      return Promise.resolve();

    this.waitblocker.setRed()
    const waitOutThePause = () => this.pauser.obey()
    const runCounter = (addend) => this._count(addend)
    const newTasks = tasks.map(task => {
      const deferredTask = deferTask(task, runCounter)
      const waitThenRun = () => {
        return waitOutThePause().then(deferredTask.run)
      }
      return this.serializeConcurrency(waitThenRun)
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
