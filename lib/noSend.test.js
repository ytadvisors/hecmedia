import formsAreNoSend from "./noSend";

describe("formsAreNoSend", () => {
  const original = process.env.HECMEDIA_NO_SEND_FORMS;

  afterEach(() => {
    if (original === undefined) delete process.env.HECMEDIA_NO_SEND_FORMS;
    else process.env.HECMEDIA_NO_SEND_FORMS = original;
  });

  it("requires the explicit staging no-send value", () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "true";
    expect(formsAreNoSend()).toBe(true);
    process.env.HECMEDIA_NO_SEND_FORMS = "false";
    expect(formsAreNoSend()).toBe(false);
  });
});
