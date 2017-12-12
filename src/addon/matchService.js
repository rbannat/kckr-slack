const UserService = require('./userService');
const TeamService = require('./teamService');
const RatingService = require('./ratingService');
const Match = require('./model/Match');

function getModelByName(name) {
  let userModel = UserService.getUser(name);
  if (typeof userModel === 'undefined') {
    return TeamService.getTeam(name);
  }
  return userModel;
}

class MatchServiceModel {
  constructor() {
    this.currentlyChallenged = {};
  }

  createMatch(challenger, opponent) {
    let respond = {
      status: 'failed',
      data: {},
      message: ''
    };
    if (typeof this.currentlyChallenged[challenger] !== 'undefined') {
      respond.message = challenger + ' already challenged';
      return respond;
    }
    if (typeof this.currentlyChallenged[opponent] !== 'undefined') {
      respond.message = opponent + ' already challenged';
      return respond;
    }

    let challengerModel = getModelByName(challenger);
    let opponentModel = getModelByName(opponent);

    if (typeof challengerModel === 'undefined') {
      respond.message = 'Player ' + challenger + ' not found!';
      return respond;
    }
    if (typeof opponentModel === 'undefined') {
      respond.message = 'Player ' + opponent + ' not found!';
      return respond;
    }

    let match = new Match(challengerModel, opponentModel);
    this.currentlyChallenged[challenger] = match;
    this.currentlyChallenged[opponent] = match;
    respond.data = match;
    respond.status = 'success';
    respond.message = 'created new match';
    return respond;
  }

  acceptMatch(opponent) {
    let match = this.currentlyChallenged[opponent];
    let respond = {
      status: 'failed',
      data: {},
      message: ''
    };
    if (typeof match === 'undefined') {
      respond.message = opponent + ' not challenged';
      return respond;
    }

    if (match.opponent.name !== this.currentlyChallenged[opponent]) {
      respond.message = opponent + ' is the challenger. He cannot accept the match.';
      return respond;
    }
    match.accept();
    respond.status = 'success';
    respond.data = match;
    respond.message = 'Match accepted';
    return respond;
  }

  declineMatch(opponent) {
    let match = this.currentlyChallenged[opponent];
    let respond = {
      status: 'failed',
      data: {},
      message: ''
    };
    if (typeof match === 'undefined') {
      respond.message = opponent + ' not challenged';
      return respond;
    }

    if (match.opponent.name !== this.currentlyChallenged[opponent]) {
      respond.message = opponent + ' is the challenger. He cannot decline the match.';
      return respond;
    }
    this.removeMatch(match);
    respond.status = 'success';
    respond.data = match;
    respond.message = 'Match removed';
    return respond;
  }

  changeMatch(opponent) {
    let match = this.currentlyChallenged[opponent];
    let respond = {
      status: 'failed',
      data: {},
      message: ''
    };
    if (typeof match === 'undefined') {
      respond.message = opponent + ' not challenged';
      return respond;
    }
    if (match.opponent.name !== opponent) {
      respond.message = opponent + ' is the challenger. He cannot change the match.';
      return respond;
    }

    match.switchParties();
  }

  enterResult(party, result, party2) {
    let match = this.currentlyChallenged[party];
    let respond = {
      status: 'failed',
      data: {},
      message: ''
    };
    if (typeof match === 'undefined') {
      respond.message = party + ' has no active match.';
      return respond;
    }
    match.enterResult(party, result, party2);
    if (match.status === 'waiting') {
      respond.status = 'success';
      respond.data = match;
      respond.message = 'Result entered. Waiting for other';
    } else if (match.status === 'failed') {
      respond.data = match;
      respond.message = 'Entered results don\'t match. Resetting results.';
    } else if (match.status === 'finished') {
      this.constructor.finishMatch(match);
      respond.status = 'success';
      respond.data = match;
      respond.message = 'Match finished';
    }
    return respond;
  }

  static finishMatch(match) {
    let winner = match.getWinner();
    let loser = match.getLoser();
    let winnerRating = RatingService.getRatingChange(winner.rating, loser.rating, true);
    let loserRating = RatingService.getRatingChange(winner.rating, loser.rating, false);
    winner.addRating(winnerRating);
    loser.addRating(loserRating);
    if (winner.type === 'team') {
      winner.addWin();
      for (let i = 0; i < winner.member.length; i++) {
        UserService.getUser(winner.member[i]).addWin(true);
      }
    } else {
      winner.addWin(false);
    }
    if (loser.type === 'team') {
      loser.addLose();
      for (let i = 0; i < winner.member.length; i++) {
        UserService.getUser(loser.member[i]).addLose(true);
      }
    } else {
      loser.addLose(false);
    }
    UserService.writeDb();
    TeamService.writeDb();
  }

  removeMatch(match) {
    delete this.currentlyChallenged[match.challenger];
    delete this.currentlyChallenged[match.opponent];
  }
}

const MatchService = new MatchServiceModel();

module.exports = MatchService;