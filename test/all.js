var fn = require('fn-tester');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var should = chai.should();
chai.use(chaiAsPromised).should();

var userService = {
    hashPassword: function (password) {
        return bcrypt.hash(password, 8);
    },

    getUserByEmail: function (email) {
        return db('user').where('email', email);
    },

    insertUser: function (email, name, password) {
        return db('user')
            .insert({
                email,
                name,
                password,
            })
            .returning('id');
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

function thisExample() {
    this.prop1 = 'here';
    this.getProp = function (prop) {
        return this[prop];
    };
}

describe('run', function () {
    it('should preserve "this"', function () {
        fn.test = { enabled: false, calls: [], doubles: [] };
        let obj = new thisExample();
        fn.run(obj, 'getProp', 'prop1').should.equal('here');
    });

    it("should not save function calls or check for test doubles when tests aren't enabled", function () {
        fn.test = { enabled: false, calls: [], doubles: [function getProp() {}] };
        let obj = new thisExample();
        fn.run(obj, 'getProp', 'prop1').should.equal('here');
        fn.test.calls.should.have.a.lengthOf(0);
    });

    it('should run one test double', async function () {
        fn.test = {
            enabled: true,
            calls: [],
            doubles: [
                function getUserByEmail() {
                    return Promise.resolve({ id: 1, email: 'some@email', name: 'name', pass: 'hash' });
                },
            ],
        };
        await fn
            .run(createUser, null, 'some@email', 'name', 'pass')
            .should.be.rejectedWith('error.duplicateEmail')
            .then(() => {
                fn.test.calls.should.be.an('array').that.deep.includes(['getUserByEmail', 'some@email']);
            });
    });

    it('should run three test doubles', async function () {
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
        await fn
            .run(createUser, null, 'some@email', 'name', 'pass')
            .then(() =>
                fn.test.calls.should.be
                    .an('array')
                    .that.deep.includes(['getUserByEmail', 'some@email'])
                    .and.that.deep.includes(['hashPassword', 'pass'])
                    .and.that.deep.includes(['insertUser', 'some@email', 'name', 'hash'])
            );
    });
});
