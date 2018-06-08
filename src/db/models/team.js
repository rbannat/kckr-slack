const mongoose = require('mongoose');

const {
  Schema,
  Schema: {
    Types: { ObjectId }
  }
} = mongoose;

const TeamSchema = new Schema(
  {
    slackTeamId: { type: String, required: true },
    player1: { type: ObjectId, ref: 'Player', required: true },
    player2: { type: ObjectId, ref: 'Player', required: true },
    rating: { type: Number, default: 1500 }
  },
  {
    timestamps: true
  }
);

const m = mongoose.model('Team', TeamSchema);

module.exports = {
  upsert: ({ player1Id, player2Id, slackTeamId }) =>
    m
      .findOneAndUpdate(
        {
          slackTeamId,
          $or: [
            { player1: player1Id, player2: player2Id },
            { player1: player2Id, player2: player1Id }
          ]
        },
        { slackTeamId, player1: player1Id, player2: player2Id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      .populate('player1')
      .populate('player2'),
  findById: id =>
    m
      .findById(id)
      .populate('player1')
      .populate('player2')
};
