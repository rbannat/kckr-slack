module.exports = class Match {
  constructor(challenger, opponent) {
    this.challenger = challenger;
    this.challengerResult = '';
    this.opponent = opponent;
    this.opponentResult = '';
    this.status = 'pending';
    this.finalResult = '';
  }

  enterResult(party, result, party2) {
    let newResult = '';


    if(this.challenger.name === party2) {
      newResult = result.split(':').reverse().join(':');
    } else {
      newResult = result;
    }

    if(party === this.challenger.name) {
      this.challengerResult = newResult;
      if(this.opponentResult !== '') {
        this.checkResult();
      } else {
        this.status = 'waiting';
      }
    } else {
      this.opponentResult = newResult;
      if(this.challengerResult !== '') {
        this.checkResult();
      } else {
        this.status = 'waiting';
      }
    }
  }

  checkResult() {
    if(this.challengerResult === this.opponentResult) {
      this.status = 'finished';
      this.finalResult = this.challengerResult;
    } else {
      this.status = 'failed';
      this.resetResult();
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
    this.challengerResult = '';
    this.opponentResult = '';
  }

  getWinner() {
    let checkResultArray = this.finalResult.split(';');
    if(checkResultArray[0] > checkResultArray[1]) {
      return this.challenger;
    }
    return this.opponent;
  }

  getLoser() {
    let checkResultArray = this.finalResult.split(';');
    if(checkResultArray[0] > checkResultArray[1]) {
      return this.opponent;
    }
    return this.challenger;
  }
};