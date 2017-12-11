'use strict';

const fs = require('fs');
const path = require('path');
const User = require('./model/User');

const dbPath = 'data/mySuperSecureUserDb.json';

class UserServiceModel {
  constructor() {
    this.initialized = false;
    this.users = {};
    this.serializeDataFromDb();
  }

  serializeDataFromDb(callback) {
    let self = this;
    let serializedUsers = {};
    fs.readFile(path.join(__dirname, dbPath), (error, data) => {
      if(error) {
        throw new Error('fs.readfile in UserService throws an error', error);
      }

      let users = JSON.parse(data);

      for (let key in users) {
        let currentUser = users[key];
        serializedUsers[key] = new User(currentUser.name, currentUser.location, currentUser.rating, currentUser.stats, currentUser.teams);
      }

      self.users = serializedUsers;

      self.initialized = true;
      if (typeof callback === 'function') {
        callback.call();
      }
    });
  }

  writeDb() {
    let self = this;
    if (this.initialized === true) {
      let data = JSON.stringify(this.users);
      fs.writeFile(path.join(__dirname, dbPath), data, (error) => {
        if (error) {
          throw new Error('fs.writeFile in Userservice throws an error', error);
        }
      });
    } else {
      throw new Error('UserService.writeDB can only be executed when service is already initialized.');
    }
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
      }
    } else {
      response = {
        data: this.users[name],
        message: 'User already registered'
      }
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