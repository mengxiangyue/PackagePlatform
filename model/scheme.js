const mongoose = require("mongoose");
const Schema    = mongoose.Schema;
const ObjectId  = Schema.ObjectId;

const SchemeSchema = Schema({
  projectId: { type:ObjectId, ref: 'Project'},
  name: String,
  createDate: { type: Date, default: Date.now },
});

SchemeSchema.index({ projectId: 1, name: 1}, { unique: true });

mongoose.model("Scheme", SchemeSchema);
