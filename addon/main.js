var UserService = require('./userService');
var TeamService = require('./TeamService');
var RatingService = require('./ratingService');

class Main {

  constructor() {
    this.userService = UserService;
    this.teamService = TeamService;
    this.ratingService = RatingService;
    this.matchService = null;

    // testing methods
    let self = this;
    setTimeout(() => {

      self.userService.addUser('Paul', 'Berlin');
      self.userService.addUser('Jens', 'Berlin');
      self.userService.addUser('Rene', 'Berlin');
      self.userService.addUser('Stefan', 'Berlin');
      self.teamService.addTeam('Bumsfallarah', 'Berlin', 'Paul', 'Jens');
      self.teamService.addTeam('Kloetentroeten', 'Berlin', 'Rene', 'Stefan');
      console.log('alluser', UserSerice.getAllUsers());
      console.log('allTeams', TeamSerice.getAllTeams());
    }, 500);
  }

  register(name, location, member1, member2) {
    if (member1 && member2) {
      this.teamService.addTeam(name, location, member1, member2);
    } else {
      this.userService.addUser(name, location);
    }
  }

  challange(challenger, team, time) {

  }

  rank() {

  }

  rankTeam() {

  }

  play() {

  }
}

const kickrExt = new Main();
