// Staging-only kill switch for all form callbacks. It is deliberately opt-in.
const formsAreNoSend = () => process.env.HECMEDIA_NO_SEND_FORMS === "true";

export default formsAreNoSend;
