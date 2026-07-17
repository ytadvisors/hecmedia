import AWS from "aws-sdk";
import emailer from "./emailer";

const sendEmail = jest.fn((params, callback) => callback());

jest.mock("aws-sdk", () => ({
  config: { update: jest.fn() },
  SES: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
  AWS.SES.mockImplementation(() => ({ sendEmail }));
});

describe("emailer", () => {
  it("configures the SES client from the SMTP env vars", () => {
    process.env.SMTP_USERNAME = "key";
    process.env.SMTP_PASSWORD = "secret";
    process.env.SMTP_REGION = "us-east-1";

    emailer({ to: "a@b.com", subject: "Hi", message: "<p>Hello</p>" });

    expect(AWS.config.update).toHaveBeenCalledWith({
      accessKeyId: "key",
      secretAccessKey: "secret",
      region: "us-east-1"
    });
  });

  it("wraps a single recipient in an array and derives the text body from the html", () => {
    emailer({ to: "a@b.com", subject: "Hi", message: "<p>Hello</p>" });

    const [params] = sendEmail.mock.calls[0];

    expect(params.Source).toBe("info@hectv.org");
    expect(params.Destination.ToAddresses).toEqual(["a@b.com"]);
    expect(params.Message.Subject.Data).toBe("Hi");
    expect(params.Message.Body.Html.Data).toBe("<p>Hello</p>");
    // The text body strips everything between the first "<" and the last ">"
    // (a greedy regex), not just individual tags — this locks in that real,
    // slightly surprising behavior rather than the "ideal" stripped text.
    expect(params.Message.Body.Text.Data).toBe("");
  });

  it("only strips from the first tag to the last tag, leaving text outside them intact", () => {
    emailer({
      to: "a@b.com",
      subject: "Hi",
      message: "before <b>bold</b> after"
    });

    const [params] = sendEmail.mock.calls[0];

    expect(params.Message.Body.Text.Data).toBe("before  after");
  });

  it("passes an array of recipients through unchanged", () => {
    emailer({ to: ["a@b.com", "c@d.com"], subject: "Hi", message: "text" });

    const [params] = sendEmail.mock.calls[0];

    expect(params.Destination.ToAddresses).toEqual(["a@b.com", "c@d.com"]);
  });

  it("throws when SES reports an error", () => {
    sendEmail.mockImplementationOnce((params, callback) =>
      callback(new Error("boom"))
    );

    expect(() =>
      emailer({ to: "a@b.com", subject: "Hi", message: "text" })
    ).toThrow("There was an error: boom");
  });
});
