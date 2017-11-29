var RatingService = require('../ratingService');

module.exports = class User {

  constructor(name, location, rating, stats, teams) {
    this.name = name;
    this.location = location;
    this.rating = rating || RatingService.getInitialRating();
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

};