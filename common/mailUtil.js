/**
 * Created by Administrator on 2017/10/12.
 */
var mailer = require('nodemailer');
var transporter = mailer.createTransport({service: 'QQ', auth: {user: '', pass: ''}});
var opt = {
    from: '1249836965@qq.com',
    to: '收件人',
    subject: '主题',
    html: '内容'
};

module.exports = {
    /**
     * 发送邮件
     * @param addressee 收件人
     * @param subject 主题
     * @param content 内容
     * @param attachments [{filename: '文件名', path: '文件路径'}]
     * @param callback
     */
    send: function(addressee, subject, content, attachments, callback) {
        if (!addressee || !subject || !content) {
            return;
        }
        opt.to = addressee;
        opt.subject = subject;
        opt.html = content;
        if (typeof attachments == "function") {
            callback = attachments;
        }
        if (typeof attachments == "object") {
            opt.attachments = attachments;
        }
        transporter.sendMail(opt, callback);
    }
};