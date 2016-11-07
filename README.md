# PackagePlatform

个人实现的一个自动打包的工具，希望把打包的工作释放出来。目前该工程只是创建了相关的API。

### 安装
1. 安装node
2. 安装nodegit       
    本项目中的项目的拉取都是使用nodegit的
3. 安装mongodb   
    项目中使用的数据库是mongodb
4. 在项目目录下创建以下目录：   
    git_repo、task、db
5. 在db目录下执行下面的命令   
    ```
    mongod --dbpath .
    ```
6. 还有其他的步骤，以后再写吧


### todo
* UI界面
* 代码逻辑优化
* 使用node-canvas修改icon打包
* 支持branch 打包
* 更好的错误处理