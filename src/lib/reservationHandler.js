const moment = require('moment');

let reservedMatches = [];
const MAX_PLAYER = 4;

module.exports = {
  reserveMatch(timeString, userId, userName) {
    const time = timeString ? moment(timeString, 'HH:mm') : moment();

    if (timeString.length !== 0 && this.checkTimeString(timeString)) {
      return {
        text: 'Oops, du musst eine gültige Zeit im Format HH:mm eingeben',
        replace_original: true
      };
    }

    if (timeString.length > 0 && time.isBefore(moment())) {
      return {
        text: 'Oops, wähle einen Zeitpunkt in der Zunkunft',
        replace_original: true
      };
    }

    const runningMatch = this.getRunningMatch(time);

    if (runningMatch) {
      return {
        text: `Sorry, um ${time.format(
          'HH:mm'
        )} Uhr ist der Raum bereits von ${this.getUserObject(
          runningMatch.createdBy
        )} belegt!`,
        attachments: [
          {
            fallback: 'Upgrade your Slack client to use messages like these.',
            color: '#67a92f',
            attachment_type: 'default',
            callback_id: 'select_times',
            actions: [
              {
                name: 'times_list',
                text: 'Wähle eine andere Zeit!',
                type: 'select',
                options: this.getFreeSlots()
              }
            ],
            response_url: `${process.env.HOST}/kickr/reserve`
          }
        ]
      };
    }

    const newMatchId = time.format('x');
    reservedMatches.push({
      id: newMatchId,
      time,
      createdBy: {
        userId: userId || 'anonymous',
        userName: userName || 'anonymous'
      },
      players: [
        {
          userId: userId || 'anonymous',
          userName: userName || 'anonymous'
        }
      ]
    });

    return {
      response_type: 'in_channel',
      text: `${this.getUserObject({
        userId,
        userName
      })} hat von ${time.format('HH:mm')} Uhr bis ${moment(time)
        .add(20, 'minutes')
        .format('HH:mm')} Uhr den Kicker reserviert! Bist du dabei?`,
      attachments: [
        {
          fallback: 'You are unable to choose a game',
          callback_id: 'match_actions',
          color: '#67a92f',
          attachment_type: 'default',
          actions: [
            {
              name: 'yes',
              text: 'Bin dabei',
              type: 'button',
              value: newMatchId,
              style: 'primary'
            },
            {
              name: 'cancel',
              text: 'Spiel absagen',
              type: 'button',
              value: newMatchId,
              style: 'danger'
            }
          ]
        }
      ]
    };
  },
  getMatchList() {
    if (!reservedMatches.length) {
      return {
        text: 'Keine Reservierungen für heute'
      };
    }

    let list = 'Reservierungen:\n';
    list += reservedMatches.map(
      (match, index) =>
        `\n${index + 1}. ${match.time.format(
          'HH:mm'
        )} Uhr, Teilnehmer:  ${match.players
          .map(player => this.getUserObject(player))
          .join(' ')}`
    );

    return {
      text: list
    };
  },
  cancelMatch(matchId, userId) {
    const match = reservedMatches.find(
      reservedMatch => reservedMatch.id === matchId
    );

    if (!match) {
      return {
        text: 'Match nicht vorhanden.',
        replace_original: false
      };
    }
    // check owner
    if (match.createdBy.userId === userId) {
      // delete match
      reservedMatches = reservedMatches.filter(
        reservedMatch => reservedMatch.createdBy.userId !== userId
      );
      return {
        text: `Hey ${match.players
          .map(player => this.getUserObject(player))
          .join(', ')}, das Match um ${match.time.format(
          'HH:mm'
        )} Uhr wurde abgesagt!`
      };
    }
    return {
      text: 'Du kannst nur Spiele absagen, die du selbst angelegt hast!',
      replace_original: false
    };
  },
  joinMatch(matchId, userId, userName) {
    const match = reservedMatches.find(
      reservedMatch => parseInt(reservedMatch.id, 10) === parseInt(matchId, 10)
    );

    if (!match) {
      return {
        text: 'ID falsch'
      };
    }

    if (match.createdBy.userId === userId) {
      return {
        text: 'Du kannst deinem eigenen Spiel nicht beitreten.',
        replace_original: false
      };
    }

    if (match.players.find(player => player.userId === userId)) {
      return {
        text: 'Du bist bereits für das Spiel eingetragen!',
        replace_original: false
      };
    }

    if (match.players.length === MAX_PLAYER) {
      let text = 'Perfekt, ihr seid vollständig!\n';
      text += `Teilnehmer: ${match.players
        .map(player => this.getUserObject(player))
        .join(', ')}, `;
      text += `${this.getUserObject({
        userName,
        userId
      })} \n`;
      text += `Uhrzeit: ${match.time.format('HH:mm')} Uhr`;

      return {
        text,
        replace_original: true,
        attachments: [
          {
            callback_id: 'match_actions',
            color: '#67a92f',
            attachment_type: 'default',
            actions: [
              {
                name: 'cancel',
                text: 'Spiel absagen',
                type: 'button',
                value: matchId,
                style: 'danger'
              }
            ]
          }
        ]
      };
    }

    match.players.push({
      userId,
      userName
    });
    reservedMatches[matchId] = match;

    return {
      response_type: 'in_channel',
      replace_original: false,
      text: `${this.getUserObject({
        userName,
        userId
      })} spielt mit ${match.players
        .filter(player => player.userId !== userId)
        .map(player => this.getUserObject(player))
        .join(', ')}`
    };
  },
  checkTimeString(timeString) {
    return !/[0-2]?[0-9]:[0-5][0-9]/.test(timeString);
  },
  getRunningMatch(matchTime) {
    const requiredMatchTime = matchTime.format('x');

    return reservedMatches.find(match => {
      const matchStart = moment(match.time).format('x');
      const matchEnd = moment(match.time)
        .add(20, 'minutes')
        .format('x');
      return requiredMatchTime >= matchStart && requiredMatchTime <= matchEnd;
    });
  },
  getFreeSlots() {
    const nextSlot = this.nearestFutureMinutes(20, moment());
    const freeSlots = [];
    let time;

    do {
      nextSlot.add(20, 'minutes');
      if (!this.getRunningMatch(nextSlot)) {
        time = nextSlot.format('HH:mm');
        freeSlots.push({
          text: `${time} Uhr`,
          value: time
        });
      }
    } while (nextSlot.isBefore(moment().endOf('day')));

    return freeSlots;
  },
  nearestFutureMinutes(interval, someMoment) {
    const roundedMinutes = Math.ceil(someMoment.minute() / interval) * interval;
    return someMoment
      .clone()
      .minute(roundedMinutes)
      .second(0);
  },
  getUserObject(user) {
    return `<@${user.userId}|${user.userName}>`;
  }
};
