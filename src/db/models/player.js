const mongoose = require('mongoose');

const { Schema } = mongoose;

const PlayerSchema = new Schema(
  {
    slackTeamId: { type: String, required: true },
    slackUserId: { type: String, required: true },
    rating: { type: Number, default: 1500, required: true }
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
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
  findOne: query => m.findOne(query),
  findById: id => m.findById(id),
  findByIdAndUpdate: ({ id, data }) =>
    m.findByIdAndUpdate(id, data, { new: true }),
  findByRating: () => m.find({}, {}, { sort: { rating: -1 }, limit: 10 })
};
