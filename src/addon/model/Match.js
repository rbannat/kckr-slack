module.exports = class Match {
  constructor(challenger, opponent) {
    this.challenger = challenger;
    this.opponent = opponent;
    this.status = 'pending';
    this.result = null;
    this.finalResult = '';
  }

  enterResult(party, score, party2) {
    let newResult = score;

    if (this.challenger.name === party2) {
      newResult = score.split(':').reverse().join(':');
    } 
    if (this.result) {
      if (this.result === newResult) {
        this.status = 'finished';
        this.finalResult = newResult;
      } else {
        this.status = 'failed';
        this.resetResult();
      }
    } else {
      this.result = newResult;
      this.status = 'waiting';
    }
  }

  accept() {
    this.status = 'active';
  }

  switchParties() {
    const opponent = this.opponent;
    this.opponent = this.challenger;
    this.challenger = opponent;
  }

  resetResult() {
    this.result = null;
  }

  getWinner() {
    let scoreArray = this.finalResult.split(':');
    if (scoreArray[0] > scoreArray[1]) {
      return this.challenger;
    }
    return this.opponent;
  }

  getLoser() {
    let scoreArray = this.finalResult.split(':');
    if (scoreArray[0] > scoreArray[1]) {
      return this.opponent;
    }
    return this.challenger;
  }
};