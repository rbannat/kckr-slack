class RatingServiceModel {
  constructor() {
    this.initialRating = 1500;
    this.KFactor = 32;
  }

  getInitialRating() {
    return this.initialRating;
  }

  getRatingChange(playerRating, opponentRating, hasWon) {
    if (typeof hasWon === 'undefined') {
      throw new Error('Rating cannot be calculated');
    }

    const difference = opponentRating - playerRating;
    const percentage = 1 / (1 + 10 ** (difference / 400));

    if (hasWon) {
      return Math.round(this.KFactor * (1 - percentage));
    }
    return Math.round(this.KFactor * (0 - percentage));
  }
}

const RatingService = new RatingServiceModel();

module.exports = RatingService;
