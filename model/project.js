const mongoose = require("mongoose");
const Schema    = mongoose.Schema;
const Sequence = require('./sequence');

const ProjectSchema = Schema({
    id: Number, 
    url: String, // git地址
    name: String, // 项目名称
    startupFile: String, // 项目启动文件
    username: String,
    password: String,
    result: {type: Number, default: 0}, // 0 无结果 1 成功 -1 失败
    error: String,
    createDate: { type: Date, default: Date.now },
});

// ProjectSchema.pre('save', next => {
//     if (this.isNew) {
//         Sequence.increment('Project', (err, result) => {
//             if (err) {
//                 throw err;
//             }
//             this.iid = result.next
//             next()
//         })
//     } else {
//         next()
//     }
// })
ProjectSchema.pre('save', function (next) {
    var self = this;
    if (self.isNew) {
        Sequence.increment('Project', function (err, result) {
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
mongoose.model("Project", ProjectSchema);