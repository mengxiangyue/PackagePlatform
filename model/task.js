const mongoose = require("mongoose");
const Schema    = mongoose.Schema;
const ObjectId  = Schema.ObjectId;
const Sequence = require('./sequence');

const TaskSchema = Schema({
  id: Number,
  projectId: { type:ObjectId, ref: 'Project'},
  scheme: String,
  profile: String,
  result: {type: Number, default: 0}, // 0 等待打包 1 成功 -1 失败
  isBuilding: {type: Boolean, default: false}, 
  msg: String,
  createDate: { type: Date, default: Date.now },
});
TaskSchema.pre('save', function (next) {
    var self = this;
    if (self.isNew) {
        Sequence.increment('Task', function (err, result) {
            if (err) {
                throw err;
            }
            self.id = result.value.next;
            next();
        });
    } else {
        next();
    }
})
mongoose.model("Task", TaskSchema);
