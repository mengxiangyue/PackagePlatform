const nodegit = require('nodegit')
const fs = require('fs-extra')
const Task = require('../model').Task
const Project = require('../model').Project
const MailService = require('./email_service').MailService
const spawn = require('child_process').spawn;
const Canvas = require('canvas'),
    Image = Canvas.Image

const config = require('../config')
    // import GitService from './git_service'
const GitService = require('./git_service').GitService

class TaskService {
    async addTask(projectId, scheme, profile) {
        try {
            const project = await Project.findOne({
                id: projectId
            })
            if (project == undefined) {
                return {
                    success: false,
                    error: '项目不存在'
                }
            }
            let task = new Task({
                projectId: project._id,
                profile: profile,
                scheme: scheme
            })
            task = await task.save()
            const buildCount = await Task.count({
                projectId: project._id,
                isBuilding: true
            })
            console.log('正在进行中的task:' + buildCount)
            if (buildCount == 0) {
                this.package(task, project, scheme, profile)
            }

            return {
                success: true,
                data: task
            }
        } catch (error) {
            return {
                success: false,
                error: error
            }
        }
    }

    // 需要优化 简化参数传递
    async package(task, project, scheme, profile) {
        const dir = config.gitConfig.localPath + "/" + project.name + "/" + project.name + "/Assets.xcassets/AppIcon.appiconset/"
            // const json = require(dir + "Contents.json")
        const json = fs.readJsonSync(dir + "Contents.json")
        const images = json.images
        let needModifyImageNames = []
        for (var i = 0; i < images.length; i++) {
            const dict = images[i]
            if (dict.size == "60x60" && dict.scale == '2x') {
                const filename = dict.filename
                needModifyImageNames.push(filename)
                fs.copySync(dir + filename, dir + filename + 'bak')
            } else if (dict.size == "60x60" && dict.scale == '3x') {
                const filename = dict.filename
                needModifyImageNames.push(filename)
                fs.copySync(dir + filename, dir + filename + 'bak')
            }
        }
        console.log("mxy", needModifyImageNames)

        const gitService = new GitService()
        const result = await gitService.pull(project)
        if (result) {
            // 将本次打包节点更新到数据库
        }
        // todo
        this.addDateOnIcon(dir, needModifyImageNames)
        Task.update({
            id: task.id
        }, {
            isBuilding: true
        }, error => {
            console.log('更新数据 ---------', error);
        })
        const taskFolder = config.taskFolderPath + '/' + task.id
        const projectPath = config.gitConfig.localPath + '/' + project.name + '/' + project.startupFile
        fs.ensureDirSync(taskFolder)
        const logfile = taskFolder + '/log.txt'
        fs.ensureFileSync(logfile)
        const archiveFileName = project.startupFile.replace('xcworkspace', '').replace('xcodeproj', '').replace('\.', '') + '.xcarchive'
        const archiveFilePath = taskFolder + '/' + archiveFileName
        console.log('projectPath', projectPath)
        const command = spawn('xcodebuild', ['-workspace', projectPath, '-scheme', scheme, '-archivePath', archiveFilePath, 'archive'], {
            shell: true
        });

        command.stdout.on('data', (data) => {
            fs.appendFile(logfile, data, 'utf-8', function(error) {
                if (error) {
                    console.log('log file:' + task.id)
                }
            })
        });

        command.stderr.on('data', (data) => {
            // console.log('stderr:' + data);
            fs.appendFile(logfile, data, 'utf-8', function(error) {
                if (error) {
                    console.log('log file:' + task.id)
                }
            })
        });

        command.on('close', (code) => {
            console.log('child process exited with code ' + code);
            if (code == 0) {
                const exportFileName = project.startupFile.replace('xcworkspace', '').replace('xcodeproj', '').replace('\.', '') + '.ipa'
                const exportFilePath = taskFolder + '/' + exportFileName
                    // xcodebuild -exportArchive -exportFormat IPA -archivePath ./build/bluegogo.xcarchive -exportPath bluegogo.ipa -exportProvisioningProfile 'BlueGoGo_Development'
                const exportCommand = spawn('xcodebuild', ['-exportArchive', '-exportFormat', 'IPA', '-archivePath', archiveFilePath, '-exportPath', exportFilePath, '-exportProvisioningProfile', profile], {
                    shell: true
                });
                exportCommand.stdout.on('data', (data) => {
                    fs.appendFile(logfile, data, 'utf-8', function(error) {
                        if (error) {
                            console.log('log file:' + task.id)
                        }
                    })
                });

                exportCommand.stderr.on('data', (data) => {
                    fs.appendFile(logfile, data, 'utf-8', function(error) {
                        if (error) {
                            console.log('log file:' + task.id)
                        }
                    })
                });

                exportCommand.on('close', (code) => {
                    // todo
                    for (let filename of needModifyImageNames) {
                        try {
                            fs.removeSync(dir + filename)
                            fs.copySync(dir + filename + 'bak', dir + filename)
                            fs.removeSync(dir + filename + 'bak')
                            console.log("success!")
                        } catch (err) {
                            console.error(err)
                        }
                    }
                    if (code == 0) {
                        console.log('export Success')
                        this.updateTaskResult(task, 1)
                    } else {
                        console.log('export failure')
                        this.updateTaskResult(task, -1)
                    }
                    Task.update({
                        id: task.id
                    }, {
                        isBuilding: false
                    }, error => {

                    })
                });
            } else {
                Task.update({
                    id: task.id
                }, {
                    isBuilding: false
                }, error => {

                })
            }
        });
    }

    updateTaskResult(task, flag) {
      const mailService = new MailService()
      let topic = "打包" + (flag == 1 ? "成功" : "失败")
      mailService.send(topic, 'xiangyue.meng@speedx.com', '具体参看日志')
      // mailService.send("打包" + (flag == 1 ? "成功" : "失败"), "xiangyue.meng@speedx.com", "具体参看日志"）
        if (flag == 1) {
            const gitService = new GitService()
            gitService.pushPlistProject(task)
        }
        Task.update({
            id: task.id
        }, {
            result: flag
        }, error => {
            if (error) {
                console.log('更新任务结果失败', error)
            } else {
                this.startNextTask(task)
            }
        })
    }

    async startNextTask(currentTask) {
        try {
            const nextTask = await Task.findOne({
                result: 0,
                isBuilding: false
            }).populate('projectId')
            if (nextTask == undefined) {
                console.log('没有下一个Task了')
                return
            }
            const project = nextTask.projectId
            console.log('nextTask', nextTask, project)

            this.package(nextTask, project, nextTask.scheme, nextTask.profile)

        } catch (error) {
            console.log('startNextTask error', error)
        }
    }

    addDateOnIcon(dir, files) {
        for (let filePath of files) {
            fs.readFile(dir + filePath, function(err, squid) {
                if (err) throw err;
                let img = new Image;
                img.src = squid;

                const canvas = new Canvas(img.width, img.height)
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);

                let dateString = ""
                const date = new Date()
                dateString += date.getMonth() + 1
                dateString += '/' + date.getDate()
                dateString += ' ' + date.getHours()
                dateString += ':' + date.getMinutes()


                ctx.fillStyle = '#000'
                if (img.width == 120) {
                    ctx.font = '15px Impact';
                    ctx.fillText(dateString, 20, 25);
                } else if (img.width == 180) {
                    ctx.font = '25px Impact';
                    ctx.fillText(dateString, 30, 30);
                }
                canvas.createPNGStream().pipe(fs.createWriteStream(dir + filePath))
            });
        }
    }
}

// module.export = TaskService
exports.TaskService = TaskService
