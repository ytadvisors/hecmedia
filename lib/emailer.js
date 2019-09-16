import AWS from "aws-sdk";

export default ({ to, subject, message }) => {
  const {
    GATSBY_SMTP_USERNAME,
    GATSBY_SMTP_PASSWORD,
    GATSBY_SMTP_REGION
  } = process.env;
  AWS.config.update({
    accessKeyId: GATSBY_SMTP_USERNAME,
    secretAccessKey: GATSBY_SMTP_PASSWORD,
    region: GATSBY_SMTP_REGION
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
