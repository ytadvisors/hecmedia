import AWS from "aws-sdk";

export default ({ to, subject, message }) => {
  AWS.config.update({
    accessKeyId: process.env.SMTP_USERNAME,
    secretAccessKey: process.env.SMTP_PASSWORD,
    region: process.env.SMTP_REGION
  });

  const ses = new AWS.SES();
  const toUser = Array.isArray(to) ? to : [to];

  // this must relate to a verified SES account
  const from = `info@hectv.org`;

  const params = {
    Source: from,
    Destination: { ToAddresses: toUser },
    Message: {
      Subject: {
        Data: subject
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: message
        },
        Text: {
          Charset: "UTF-8",
          Data: message.replace(/<.+>/gi, "")
        }
      }
    }
  };
  // this sends the email
  // @todo - add HTML version
  ses.sendEmail(params, err => {
    if (err) {
      throw new Error(`There was an error: ${err.message}`);
    }

    return "Email sent";
  });
};
