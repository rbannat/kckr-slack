const UserService = require('./userService');
const TeamService = require('./teamService');
const RatingService = require('./ratingService');
const MatchService = require('./matchService');

class Main {

  constructor() {
    this.userService = UserService;
    this.teamService = TeamService;
    this.ratingService = RatingService;
    this.matchService = MatchService;

    // testing methods
    let self = this;
    setTimeout(() => {

      self.register('Paul', 'Berlin');
      self.register('Jens', 'Berlin');
      self.register('Rene', 'Berlin');
      self.register('Stefan', 'Berlin');
      self.register('Bumsfallarah', 'Berlin', 'Paul', 'Jens');
      self.register('Kloetentroeten', 'Berlin', 'Rene', 'Stefan');
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

  challenge(challenger, team, time) {

  }

  rank() {

  }

  rankTeam() {

  }

  play() {

  }
}

const kickrExt = new Main();
