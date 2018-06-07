const Team = require('./model/Team');
const UserService = require('./userService');

class TeamServiceModel {
  constructor() {
    this.teams = {};
  }

  addTeam(name, location, member1, member2) {
    const response = {
      status: 'failed',
      data: {},
      message: ''
    };
    const team =
      this.teams[name] ||
      this.teams[
        name
          .split('.')
          .reverse()
          .join('.')
      ];
    if (!team) {
      const teamMembers = [member1, member2];
      const data = new Team(`${member1}.${member2}`, location, teamMembers);
      this.teams[name] = data;
      this.writeDb();

      for (let i = 0; i < teamMembers.length; ++i) {
        const m1 = UserService.getUser(teamMembers[i]);
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
    return (
      this.teams[name] ||
      this.teams[
        name
          .split('.')
          .reverse()
          .join('.')
      ]
    );
  }

  getAllTeams() {
    return this.teams;
  }
}

const TeamService = new TeamServiceModel();

module.exports = TeamService;
