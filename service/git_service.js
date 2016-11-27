var nodegit = require("nodegit")
const fs = require('fs-extra')

const config = require('../config')
const plistConfig = require('../plist_config').plist
const Project = require('../model').Project

class GitService {
    constructor() {
        // super()
    }
    async clone(url, username, password) {
        const project = url.substring(url.lastIndexOf('/')).replace('.git', '');
        const clonePath = config.gitConfig.localPath + project;
        if (fs.existsSync(clonePath)) {
            fs.removeSync(clonePath)
        }
        let retryTimes = 0
        var cloneOptions = {};
        let progress = 0
        cloneOptions.fetchOpts = {
            callbacks: {
                certificateCheck: function () { return 1; },
                credentials: function (url, userName) {
                    if (retryTimes++ > 3) {
                        return nodegit.Cred.defaultNew()
                    }
                    console.log(arguments, url, userName);
                    // return NodeGit.Cred.sshKeyFromAgent(userName);
                    return nodegit.Cred.userpassPlaintextNew(
                        username,
                        password);
                },
                transferProgress: function () {
                    return console.log('progress', progress++);
                }
            },
        };
        try {

            const result = await nodegit.Clone(url, clonePath, cloneOptions)
            return true
        } catch (error) {
            return error
        }
    }

    async pull(project) {
        try {
            const clonePath = config.gitConfig.localPath + '/' + project.name;
            const repo = await nodegit.Repository.open(clonePath)
            await repo.fetch('origin', {
                callbacks: {
                    credentials: function (url, userName) {
                        return nodegit.Cred.userpassPlaintextNew(project.username, project.password);
                    },
                    certificateCheck: function () {
                        return 1;
                    }
                },
                updateFetchhead: 1
            });
            await repo.mergeBranches("master", "origin/master");
            const commit = await repo.getBranchCommit("master");
            console.log('commit -----', commit.toString(), commit.author().toString(), commit.message().toString())
            return true
        } catch (error) {
            console.log('git pull error: ', error)
            return false
        }
    }
    getAllBranches() {
        return ['master', 'test']
    }

    async pushPlistProject(task) {
      const project = await Project.findOne({_id: task.projectId})
      console.log('mxy---------', project)
      // const project = await Scheme.findOne({ _id: '581b61decfcb5eec7052da29' }).populate('projectId')
      // const project = Project.find()
      const plistContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
          	<key>items</key>
          	<array>
          		<dict>
          			<key>assets</key>
          			<array>
          				<dict>
          					<key>kind</key>
          					<string>software-package</string>
          					<key>url</key>
          					<string>http://192.168.1.101:3000/task_folder/${task.id}/${project.name}.ipa</string>
          				</dict>
          				<dict>
          					<key>kind</key>
          					<string>full-size-image</string>
          					<key>needs-shine</key>
          					<false/>
          					<key>url</key>
          					<string>http://mobile.smartdot.com.cn:15000/store/images/smartdotGOMPortal96.png</string>
          				</dict>
          				<dict>
          					<key>kind</key>
          					<string>display-image</string>
          					<key>needs-shine</key>
          					<false/>
          					<key>url</key>
          					<string>http://mobile.smartdot.com.cn:15000/store/images/smartdotGOMPortal96.png</string>
          				</dict>
          			</array>
          			<key>metadata</key>
          			<dict>
          				<key>bundle-identifier</key>
          				<string>com.beastbike.bluegogo</string>
          				<key>kind</key>
          				<string>software</string>
          				<key>subtitle</key>
          				<string>${project.name}</string>
          				<key>title</key>
          				<string>${project.name}</string>
          			</dict>
          		</dict>
          	</array>
          </dict>
          </plist>`
        if (task == undefined) {
            return
        }
        try {
            const plistFileName = task.id + '.plist'
            const repo = await nodegit.Repository.open(plistConfig.localPath)
            fs.writeFileSync(repo.workdir() + plistFileName, plistContent)
            const index = await repo.refreshIndex()
            await index.addByPath(plistFileName)
            await index.write()
            const oid = await index.writeTree()
            const head = await nodegit.Reference.nameToId(repo, "HEAD");
            const parent = await repo.getCommit(head);
            const author = nodegit.Signature.create("Scott Chacon",
                "schacon@gmail.com", new Date().getTime(), 60);
            const committer = nodegit.Signature.create("Scott A Chacon",
                "scott@github.com", new Date().getTime(), 90);
            const commitId = await repo.createCommit("HEAD", author, committer, "message", oid, [parent]);
            const remote = await repo.getRemote('origin')
            let retryTimes = 0
            await remote.push(
                ["refs/heads/master:refs/heads/master"],
                {
                    callbacks: {
                        credentials: function (url, userName) {
                            if (retryTimes++ > 3) {
                                return nodegit.Cred.defaultNew()
                            }
                            return nodegit.Cred.userpassPlaintextNew(
                                plistConfig.username,
                                plistConfig.password);
                        }
                    }
                }
            );
        } catch (error) {
            console.log('pushPlistProject error: ', error)
        }

    }


}

// export default GitService
// module.export = GitService
exports.GitService = GitService
