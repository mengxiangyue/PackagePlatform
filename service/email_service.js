const nodemailer = require('nodemailer');

const emailFrom = '"Fred Foo 👥" <mengxiangyue1990@163.com>'

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport('smtps://mengxiangyue1990@163.com:445566m@smtp.163.com');

class MailService {
    async send(subject, to, content) {
        var mailOptions = {
            from: emailFrom, // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            text: content, // plaintext body
        };
        return new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    reject(error)
                    return
                }
                console.log('Message sent: ' + info.response);
                // return true
                resolve(info.response)
            });
        });

    }
}

// export default MailService
// module.export = MailService
exports.MailService = MailService
