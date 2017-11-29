var RatingService = require('../ratingService');

module.exports = class Team {

  constructor(name, location, member, rating, stats) {
    this.name = name;
    this.location = location;
    this.member = member;
    this.rating = rating || RatingService.getInitialRating();
    this.stats = stats || {
      win: 0,
      lose: 0
    };
  }
};