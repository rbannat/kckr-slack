const fs = require('fs');
const Team = require('./model/Team');
const UserService = require('./userService');

const dbPath = './data/mySuperSecureTeamDb.json';

class TeamServiceModel {
  constructor() {
    var self = this;
    this.teams = {};
    this.serializeDataFromDb();
  }
  
  serializeDataFromDb(callback) {
    let self = this;
    let serializedTeams = {};
    fs.readFile(dbPath, 'utf8', (error, data) => {
      if(error) {
        throw new Error('fs.readfile in TeamService throws an error', error);
      }

      let teams = JSON.parse(data);

      for (var key in teams) {
        let currentTeam = teams[key];
        serializedTeams[key] = new Team(currentTeam.name, currentTeam.location, currentTeam.rating, currentTeam.stats, currentTeam.member);
      }

      self.teams = serializedTeams;
      self.initialized = true;

      if (typeof callback === 'function') {
        callback.call();
      }
    });
  }

  static writeDb(data) {
    fs.writeFile(dbPath, JSON.stringify(data), (error) => {
      if(error !== null) {
        throw new Error('fs.writeFile in Teamservice throws an error', error);
      }
    })
  }

  addTeam(name, location, member1, member2) {
    let response = {
      status: 'failed',
      data: {},
      message: ''
    };
    if (typeof this.teams[name] === 'undefined') {
      let teamMembers = [member1, member2];
      let data = new Team(name, location, teamMembers);
      this.teams[name] = data;
      this.constructor.writeDb(this.teams);

      for(var i = 0; i < teamMembers.length; i++) {
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
      response.data = this.teams[name];
      response.message = 'Team already registered'
    }
    return response;
  }

  getTeam(name) {
    return this.teams[name];
  }

  getAllTeams() {
    return this.teams;
  }
}

const TeamService = new TeamServiceModel();

module.exports = TeamService;