const User = require('./model/User');

class UserServiceModel {
  constructor() {
    this.initialized = false;
    this.users = {};
  }

  addUser(name, location) {
    let response = {
      status: 'failed',
      data: {},
      message: ''
    };
    if (typeof this.users[name] === 'undefined') {
      this.users[name] = new User(name, location);
      this.writeDb();
      response = {
        data: this.users[name],
        status: 'success',
        message: 'Added a new user'
      };
    } else {
      response = {
        data: this.users[name],
        message: 'User already registered'
      };
    }
    return response;
  }

  getUser(name) {
    return this.users[name];
  }

  getAllUsers() {
    return this.users;
  }
}

const UserService = new UserServiceModel();

module.exports = UserService;
