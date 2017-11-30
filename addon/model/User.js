const RatingService = require('../ratingService');

module.exports = class User {

  constructor(name, location, rating, stats, teams) {
    this.name = name;
    this.location = location;
    this.rating = rating || RatingService.getInitialRating();
    this.type = 'user';
    this.stats = stats || {
      solo: {
        win: 0,
        lose: 0
      },
      team: {
        win: 0,
        lose: 0
      }
    };
    this.teams = teams || [];
  }

  addTeam(name) {
    this.teams.push(name);
  }

  addRating(rating) {
    this.rating = this.rating + rating;
  }

  addWin(withTeam) {
    if (withTeam) {
      this.stats.team.win++;
    } else {
      this.stats.solo.win++;
    }
  }

  addLose(withTeam) {
    if (withTeam) {
      this.stats.team.lose++;
    } else {
      this.stats.solo.lose++;
    }
  }

};