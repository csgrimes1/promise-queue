### Promise Queue Code Challenge

* The specification is the test suite in test/test.js

#### To Run:
```bash
$ npm -s test
```

To run the suite I developed against:
```
$ npm run -s devtest
```

#### Basic Strategy for Solution

The solution depends on function composition. Every
task is "wrapped" with some promise logic before it's
scheduled. The scheduler is the NPM module `throat`, a
semaphore implementation used here to keep concurrency at one. The wrapping of each task ensures that the function is counted before invoking, and the count is
decremented after fulfillment of its returned promise.

Pausing and waiting features depend on a custom module
called `stoplight`. The module uses a promise that, when pending, maps to a red light state. When fulfilled, it maps to a green light. To illustrate, pausing puts a stoplight instance in a red state, and resuming puts it back to green. The promise associated with this stoplight is obeyed in the "wrapping" of each composed task function.
