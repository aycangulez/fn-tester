fn-tester is a tiny utility to record function calls and define test doubles for JavaScript/Node.js. It has no dependencies and can be used with virtually all testing frameworks.

## Installation

### Node.js

```bash
npm install --save-dev fn-tester
```

### Browsers

Install as above and use the `fn-tester.js` file found in the node_modules directory:

```html
<script src="./node_modules/fn-tester/fn-tester.js"></script>
```

## Usage

fn-tester is a simple as it gets. It has only three options and one method to use. fn-tester requires running functions indirectly by using a variation of the Command design pattern, which is necessary to intercept all function calls and preserve the value of "this".

```js
const fn = require('fn-tester');

// Instead of parentObj.methodName(argument1, argument2, ...), use:
fn.run(parentObj, 'methodName', argument1, argument2, ...);

// For simple functions, use:
fn.run(myFunction, null, argument1, argument2, ...);
```

It may be argued that changing all function calls isn’t simple at all, but there is no need to change every single function call. In a typical Model-View-Controller (MVC) application, modifying controller-level functions that deal with running multiple services should mostly be sufficient. Services that deal with databases and remote APIs need to have test doubles in any case.

fn-tester can be configured by simply changing the **test** property, and the defaults are:

```js
fn.test = { enabled: false, calls: [], doubles: [] };
```

When **enabled** is true, fn-tester starts to record function calls in **calls**. It also runs the test double functions stored in **doubles** (if any) instead of the originals.

Here is how to define test doubles for a simple user account creation controller:

```js
// (...)

const userService = {
    hashPassword: function (password) {
        return bcrypt.hash(password, 8);
    },

    getUserByEmail: function (email) {
        return db('user').where('email', email).then(_.head);
    },

    insertUser: function (email, name, password) {
        return db('user').insert({ email, name, password }).returning('id');
    },
};

function createUser(email, name, password) {
    return fn.run(userService, 'getUserByEmail', email).then((existingUser) => {
        if (existingUser) {
            return Promise.reject('error.duplicateEmail');
        }
        return fn
            .run(userService, 'hashPassword', password)
            .then((passwordHash) => fn.run(userService, 'insertUser', email, name, passwordHash));
    });
}

fn.test = {
    enabled: true,
    calls: [],
    doubles: [
        function getUserByEmail() {
            return Promise.resolve();
        },
        function hashPassword() {
            return Promise.resolve('hash');
        },
        function insertUser() {
            return Promise.resolve(1);
        },
    ],
};

fn.run(createUser, null, 'some@email', 'name', 'pass').then(() => console.log(fn.test.calls));
```

When fn-tester finds a function in **test.doubles** with the same name as the function called, runs the test double instead of the original. **test.calls** contains the function calls complete with the arguments passed.

```js
[
    ['createUser', 'some@email', 'name', 'pass'],
    ['getUserByEmail', 'some@email'],
    ['hashPassword', 'pass'],
    ['insertUser', 'some@email', 'name', 'hash'],
];
```

**test.calls** is useful to determine if a function is called and has received the correct arguments.

Finally, here is an example how fn-tester can be used with Chai and Mocha:

```js
const fn = require('fn-tester');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(chaiAsPromised).should();

// (...)

describe('createUser', function () {
    it('should go through with account creation', async function () {
        fn.test = {
            enabled: true,
            calls: [],
            doubles: [
                function getUserByEmail() {
                    return Promise.resolve();
                },
                function hashPassword() {
                    return Promise.resolve('hash');
                },
                function insertUser() {
                    return Promise.resolve(1);
                },
            ],
        };

        const result = await fn.run(createUser, null, 'some@email', 'name', 'pass');
        fn.test.calls.should.be
            .an('array')
            .that.deep.includes(['getUserByEmail', 'some@email'])
            .and.that.deep.includes(['hashPassword', 'pass'])
            .and.that.deep.includes(['insertUser', 'some@email', 'name', 'hash']);
    });
});
```
