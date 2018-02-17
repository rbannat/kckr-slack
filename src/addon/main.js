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
    // let self = this;
    // setTimeout(() => {
      
      //   self.register('Paul', 'Berlin');
      //   self.register('Jens', 'Berlin');
      //   self.register('Rene', 'Berlin');
      //   self.register('Stefan', 'Berlin');
      //   self.register('Paul.Jens', 'Berlin', 'Paul', 'Jens');
      //   self.register('Rene.Stefan', 'Berlin', 'Rene', 'Stefan');
      //   self.challenge('new', {challenger: 'Paul.Jens', opponent: 'Rene.Stefan'});
      //   self.challenge('change', {opponent: 'Rene.Stefan'});
      //   self.challenge('accept', {opponent: 'Paul.Jens'});
      //   self.challenge('enterResult', {party: 'Rene.Stefan', result: '2:1', party2: 'Paul.Jens'});
      //   let match = self.challenge('enterResult', {party: 'Paul.Jens', result: '1:2', party2: 'Rene.Stefan'});
      //   console.log(match);
      //   console.log('alluser', self.userService.getAllUsers());
      //   console.log('allTeams', self.teamService.getAllTeams());
      //   console.log(this);
    // }, 500);
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
  
  getPlayerScores() {
    let players = this.userService.getAllUsers();
    let rankedPlayers = [];
    for (let player in players) {
      if (players.hasOwnProperty(player)) {
        rankedPlayers.push(players[player]);
      }
    }
    return rankedPlayers.sort(function (a, b) {
      return b.rating - a.rating;
    });
  }
  
  getTeamScores() {
    let teams = this.teamService.getAllTeams();
    let rankedTeams = [];
    for (let team in teams) {
      if (teams.hasOwnProperty(team)) {
        rankedTeams.push(teams[team]);
      }
    }
    return rankedTeams.sort(function (a, b) {
      return b.rating - a.rating;
    });
  }
  
  play() {
    
  }
}

module.exports = new Main();
