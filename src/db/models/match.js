const mongoose = require('mongoose');

const { Schema } = mongoose;

const MatchSchema = new Schema(
  {
    slackTeamId: { type: String, required: true },
    createdBy: { type: Schema.ObjectId, ref: 'Player', required: true },
    team1Id: { type: Schema.ObjectId, required: true },
    team2Id: { type: Schema.ObjectId, required: true },
    mode: { type: String, enum: ['1vs1', '2vs2'], required: true },
    status: {
      type: String,
      enum: ['draft', 'confirmed'],
      default: 'draft',
      required: true
    },
    winner: { type: Schema.ObjectId },
    winnerScore: Number,
    loserScore: Number
  },
  {
    timestamps: true
  }
);

const m = mongoose.model('Match', MatchSchema);

module.exports = {
  saveMatch: match => m.create(match),
  deleteMatch: ({ id }) => m.findByIdAndRemove(id),
  updateMatch: ({ id, data }) => m.findByIdAndUpdate(id, data, { new: true })
};
