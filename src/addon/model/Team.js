const RatingService = require('../ratingService');

module.exports = class Team {

  constructor(name, location, member, rating, stats) {
    this.name = name;
    this.location = location;
    this.type = 'team';
    this.member = member;
    this.rating = rating || RatingService.getInitialRating();
    this.stats = stats || {
      win: 0,
      lose: 0
    };
  }

  addRating(rating) {
    this.rating = this.rating + rating;
  }

  addWin() {
    this.stats.win += 1;
  }

  addLose() {
    this.stats.lose += 1;
  }
};