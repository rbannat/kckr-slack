class RatingServiceModel {
  constructor() {
    this._initialRating = 1500;
  }

  getInitialRating() {
    return this._initialRating;
  }
}

const RatingService = new RatingServiceModel();

module.exports = RatingService;