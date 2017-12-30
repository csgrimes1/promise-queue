'use strict';

const defer = require('../src/defer');
const assert = require('assert')
const sinon = require('sinon')

describe('defer function', () => {
  it('should resolve and return a promise', () => {
    const deferred = defer()
    return deferred.resolve(1)
      .then(result => {
        assert.equal(result, 1);
      })
  })

  it('should reject and return rejected promise', () => {
    const catchSpy = sinon.spy()
    const deferred = defer()
    const result = 'bad'

    return deferred.reject(result)
      .catch(err => {
        catchSpy()
        assert.equal(err, result)
      })
      //Next line always called
      .then(() => {
        assert(catchSpy.called)
      })
  })
});
