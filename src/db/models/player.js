const mongoose = require('mongoose');

const { Schema } = mongoose;

const PlayerSchema = new Schema(
  {
    slackTeamId: { type: String, required: true },
    slackUserId: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

const m = mongoose.model('Player', PlayerSchema);

module.exports = {
  upsert: ({ slackTeamId, slackUserId }) =>
    m.findOneAndUpdate(
      { slackTeamId, slackUserId },
      { slackTeamId, slackUserId },
      { upsert: true, new: true }
    ),
  findOne: query => m.findOne(query),
  findById: id => m.findById(id)
};
