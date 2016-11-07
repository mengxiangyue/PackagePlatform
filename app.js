const Koa = require('koa');
const views = require('koa-views');
const convert = require('koa-convert');
const bodyParser = require('koa-bodyparser');
const json = require("koa-json")
const logger = require('koa-logger');
const mongoose = require("mongoose");
const router = require("koa-router")()
const mail = require("./service/email_service").MailService
// import GitService from './service/git_service'
const GitService = require('./service/git_service').GitService
// import TaskService from './service/task_service'
const TaskService = require('./service/task_service').TaskService


const Project = require('./model').Project
const Scheme = require('./model').Scheme
const Profile = require('./model').Profile
const Task = require('./model').Task

const app = new Koa();

app.use(bodyParser())
app.use(convert(json({ pretty: false, param: 'pretty' })));
app.use(views(__dirname + '/views', { extension: 'ejs' }));

app.use(convert(logger()));
// logger
app.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

app.use(convert(require('koa-static')(__dirname + '/public')));

router.all('/add_project', async (ctx, next) => {
    const url = ctx.request.body.url
    const username = ctx.request.body.username
    const password = ctx.request.body.password
    const startupFile = ctx.request.body.startupFile
    const isFource = ctx.request.body.isFource || '0'
    if (url == undefined || username == undefined || password == undefined || startupFile == undefined) {
        ctx.body = {
            code: 100,
            msg: '参数错误'
        }
        return
    }
    try {
        const existProject = await Project.findOne({ $or: [{ url: url, result: 1 }, { url: url, result: 0 }] })
        if (existProject != undefined) {
            if (isFource == '0') {
                ctx.body = {
                    code: 101,
                    msg: '该项目已经存在',
                    data: existProject
                }
                return
            } else {
                existProject.remove()

            }
        }

        const projectName = url.substring(url.lastIndexOf('/') + 1).replace('.git', '');
        let project = new Project({
            url: url,
            name: projectName,
            startupFile: startupFile,
            username: username,
            password: password
        })
        let savedProject = await project.save()
        let body = {
            code: 0,
            id: savedProject.id,
            result: savedProject.result
        }

        setTimeout(() => {
            const gitService = new GitService()
            // const result = await gitUtil.clone(url, username, password)
            gitService.clone(url, username, password)
                .then(result => {
                    let resultCode = 0
                    if (result == true) {
                        resultCode = 1
                    } else {
                        resultCode = -1
                    }
                    console.log('完成了 回調了', result, resultCode, savedProject.id)
                    try {
                        Project.update({ id: savedProject.id }, { result: resultCode }, error => {
                            if (error) {
                                console.log('更新失败', error)
                            }
                        })
                    } catch (error) {
                        console.log('更新失败')
                    }

                })
                .catch(error => {
                    console.log('麻蛋的失败了')
                })


        }, 0)
        ctx.body = body
        return
    } catch (error) {
        console.log('创建项目失败', error)
        ctx.body = {
            code: 1,
            msg: '创建项目失败'
        }
    }
})

router.all('/get_project_status', async (ctx, next) => {
    const projectId = ctx.request.body.projectId
    if (projectId == undefined) {
        ctx.body = {
            code: 100,
            msg: '参数错误'
        }
        return
    }
    const project = await Project.findOne({ id: projectId })
    if (project == undefined) {
        ctx.body = {
            code: 103,
            msg: '项目不存在'
        }
    } else {
        ctx.body = {
            code: 0,
            data: project
        }
    }

})

router.all('/config_project', async (ctx, next) => {
    const projectId = ctx.request.body.projectId
    let schemes = ctx.request.body.scheme
    let profiles = ctx.request.body.profile
    if (projectId == undefined || schemes == undefined || profiles == undefined) {
        ctx.body = {
            code: 100,
            msg: '参数错误'
        }
        return
    }
    if (typeof schemes == 'string') {
        schemes = [schemes]
    }
    if (typeof profiles == 'string') {
        profiles = [profiles]
    }

    const project = await Project.findOne({ id: projectId })
    if (project == undefined) {
        ctx.body = {
            code: 103,
            msg: '项目不存在'
        }
    } else {
        for (let i = 0; i < schemes.length; i++) {
            const scheme = new Scheme({
                projectId: project._id,
                name: schemes[i]
            })
            scheme.save()
        }
        for (let i = 0; i < profiles.length; i++) {
            const profile = new Profile({
                projectId: project._id,
                name: profiles[i]
            })
            profile.save()
        }
        ctx.body = {
            code: 0
        }
    }

    // Project.update({ 'id': 44 }, { result: 1 })
    // var cmdStr = 'open "./git_repo/BlueGoGo_iOS/bluegogo.xcworkspace" \nsleep 2 \nkillall Xcode';
    // exec(cmdStr, { maxBuffer: 5000 * 1024 }, function (err, stdout, stderr) {
    //     if (err) {
    //         console.log('get weather api error:' + err);
    //     } else {
    //         console.log(stdout)
    //     }
    // });
})

router.all('/branchs', async (ctx, next) => {
    // const project = await Scheme.findOne({ _id: '581b61decfcb5eec7052da29' }).populate('projectId')
    // ctx.body = project
    // const project = await Project.findOne({id: 1})
    // const gitService = new GitService()
    // const result = await gitService.pull(project)
    // ctx.body = result 
    const gitService = new GitService()
    gitService.pushPlistProject()
    
})

router.all('/tasks', async (ctx, next) => {
    let task = Task.findOne({ id: 19 })
    Task.update({ id: 19 }, { result: 1111 }, error => {
        console.log('errrrrr', error)
    })
    console.log(task)
})

router.all('/add_task', async (ctx, next) => {
    const projectId = ctx.request.body.projectId
    const profile = ctx.request.body.profile
    const scheme = ctx.request.body.scheme
    if (projectId == undefined || profile == undefined || scheme == undefined) {
        ctx.body = {
            code: 100,
            msg: '参数错误'
        }
        return
    }
    const taskService = new TaskService()
    const result = await taskService.addTask(projectId, scheme, profile)
    console.log('add_task result:', result)
    if (result.success == true) {
        ctx.body = {
            code: 0,
            msg: '添加成功'
        }
    } else {
        ctx.body = {
            code: 105,
            msg: '添加失败',
            error: result.error
        }
    }

})

// router.get('/test', async function(ctx, next) {
//     var result = await MockItem.findOne().exec().then(doc => {
//         // ctx.body = "test page" + doc
//         return doc
//     }).catch(error => {
//         // ctx.body = "test page error" + error
//         return error
//     });
//     ctx.body = "test page" + result
// })
// router.get('/test/a', async(ctx, next) => {
//     ctx.body = "test/a"
// })
// router.get('/json', async(ctx, next) => {
//     ctx.body = {
//         "a": 2
//     }
// })

// router.get('/sendmail', async(ctx, next) => {
//     try {
//         const result = await mail.send("测试主题", "598660766@qq.com", "nihao 哈")
//         console.log("result", result);
//     } catch (err) {
//         console.log(err);
//     }

// })

app.use(router.routes()).use(router.allowedMethods());
app.use(async ctx => {
    await ctx.render('wealcom', { "user": "世界1" })
});

// mongoose.Promise = require('bluebird');
// mongoose.connect("mongodb://localhost/mshare");
// var db = mongoose.connection;
// db.on('error', console.error.bind(console, '... connection error ...'));
// db.once('open', function callback() {
//     console.info("... db open ...");
// });
//
// var MockItemSchema = mongoose.Schema({
//   id: Number,
//   name: String
// });
// var MockItem = mongoose.model("MockItem", MockItemSchema);
//
// var item = new MockItem({
//   id: 2,
//   name: "fff"
// })

// item.save(function(err, dbItem) {
//   if (!err) {
//     console.log("存储成功了");
//   }
// })

app.listen(3000);
console.log("server started and linsten port 3000");
