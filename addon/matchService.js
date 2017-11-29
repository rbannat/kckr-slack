const fs = require('fs');
const RatingService = require('./ratingService');

const dbPath = './data/mySuperSecureMatchDb.json';

class MatchService {
  constructor() {
    this.matches = [];
  }

}

module.exports = MatchService;