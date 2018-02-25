const config = require('../config/default');
const fs = require('fs');
const path = require('path');
const Team = require('./model/Team');
const UserService = require('./userService');

const dbPath = config.db.teamDBPath;

class TeamServiceModel {
  constructor() {
    this.teams = {};
    this.serializeDataFromDb();
  }
  
  serializeDataFromDb(callback) {
    let self = this;
    let serializedTeams = {};
    fs.readFile(path.join(__dirname, dbPath), (error, data) => {
      if(error) {
        throw new Error('fs.readfile in TeamService throws an error', error);
      }

      let teams = JSON.parse(data);

      for (let key in teams) {
        let currentTeam = teams[key];
        serializedTeams[key] = new Team(currentTeam.name, currentTeam.location, currentTeam.member, currentTeam.rating, currentTeam.stats);
      }

      self.teams = serializedTeams;
      self.initialized = true;

      if (typeof callback === 'function') {
        callback.call();
      }
    });
  }

  writeDb() {
    let data = JSON.stringify(this.teams);
    fs.writeFile(path.join(__dirname, dbPath), data, (error) => {
      if(error) {
        throw new Error('fs.writeFile in Teamservice throws an error', error);
      }
    });
  }

  addTeam(name, location, member1, member2) {
    let response = {
      status: 'failed',
      data: {},
      message: ''
    };
    let team = this.teams[name] || this.teams[name.split('.').reverse().join('.')];
    if (!team) {
      let teamMembers = [member1, member2];
      let data = new Team(member1 + '.' + member2, location, teamMembers);
      this.teams[name] = data;
      this.writeDb();

      for(let i = 0; i < teamMembers.length; i++) {
        let m1 = UserService.getUser(teamMembers[i]);
        if (m1) {
          m1.addTeam(name);
        } else {
          UserService.addUser(teamMembers[i], location);
          UserService.getUser(teamMembers[i]).addTeam(name);
        }
      }

      response.data = data;
      response.status = 'success';
      response.message = 'Added a new team';
    } else {
      response.data = this.teams[team.name];
      response.message = 'Team already registered';
    }
    return response;
  }

  getTeam(name) {
    return this.teams[name] || this.teams[name.split('.').reverse().join('.')];
  }

  getAllTeams() {
    return this.teams;
  }
}

const TeamService = new TeamServiceModel();

module.exports = TeamService;