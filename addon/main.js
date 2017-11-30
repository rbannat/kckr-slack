const UserService = require('./userService');
const TeamService = require('./teamService');
const RatingService = require('./ratingService');
const MatchService = require('./matchService');
const http = require('http');

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
      self.challenge('new', {challenger: 'Bumsfallarah', opponent: 'Kloetentroeten'});
      self.challenge('change', {opponent: 'Kloetentroeten'});
      self.challenge('accept', {opponent: 'Bumsfallarah'});
                  self.challenge('enterResult', {party: 'Bumsfallarah', result: '2:1', party2: 'Kloetentroeten'});
      self.challenge('enterResult', {party: 'Kloetentroeten', result: '2:1', party2: 'Bumsfallarah'});
      self.challenge('enterResult', {party: 'Kloetentroeten', result: '2:1', party2: 'Bumsfallarah'});
      let match = self.challenge('enterResult', {party: 'Bumsfallarah', result: '1:2', party2: 'Kloetentroeten'});
      console.log(match);
      // console.log('alluser', self.userService.getAllUsers());
      // console.log('allTeams', self.teamService.getAllTeams());
      console.log(this);
    }, 500);
  }

  register(name, location, member1, member2) {
    if (member1 && member2) {
      return this.teamService.addTeam(name, location, member1, member2);
    } else {
      return this.userService.addUser(name, location);
    }
  }

  challenge(action, param) {
    switch(action) {
      case 'new': return this.matchService.createMatch(param.challenger, param.opponent);
      case 'change': return this.matchService.changeMatch(param.opponent);
      case 'accept': return this.matchService.createMatch(param.opponent);
      case 'decline': return this.matchService.declineMatch(param.opponent);
      case 'enterResult': return this.matchService.enterResult(param.party, param.result, param.party2);
    }
  }

  rank() {

  }

  rankTeam() {

  }

  play() {

  }
}

const kickrExt = new Main();
