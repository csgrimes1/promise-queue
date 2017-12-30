'use strict';

module.exports = function defer () {
    let _resolve, _reject;
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
    return Object.assign({}, promise, {
      resolve: (val) => _resolve(val) || promise,
      reject: (err) => _reject(err) || promise,
      promise
    });
}
