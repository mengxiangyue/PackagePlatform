const mongoose = require("mongoose");
const Schema    = mongoose.Schema;
const ObjectId  = Schema.ObjectId;

const ProfileSchema = Schema({
  projectId: { type:ObjectId, ref: 'Project'},
  name: String,
  createDate: { type: Date, default: Date.now },
});
ProfileSchema.index({ projectId: 1, name: 1}, { unique: true });
ProfileSchema.on('index', function(error) {
  // "_id index cannot be sparse"
  console.log('ProfileSchema index error', error.message);
});

mongoose.model("Profile", ProfileSchema);
