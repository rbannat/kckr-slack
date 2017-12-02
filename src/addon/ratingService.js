class RatingServiceModel {
  constructor() {
    this._initialRating = 1500;
    this.KFactor = 32;
  }

  getInitialRating() {
    return this._initialRating;
  }

  getRatingChange(playerRating, opponentRating, hasWon) {
    if(typeof hasWon === 'undefined') {
      throw new Error('Rating cannot be calculated');
    }

    let difference = playerRating - opponentRating;
    let percentage = 1 / (1 + Math.pow(10, difference / 400));

    if(hasWon) {
      return Math.round(this.KFactor * (1 - percentage));
    } else {
      return Math.round(this.KFactor * (0 - percentage))
    }
  }

}

const RatingService = new RatingServiceModel();

module.exports = RatingService;