import axios from "axios";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export function captchaIsConfigured() {
  return Boolean(process.env.RE_CAPTCHA_SECRET_KEY);
}

export async function verifyCaptcha(token, remoteIp) {
  if (!captchaIsConfigured() || !token || typeof token !== "string") {
    return false;
  }

  const params = new URLSearchParams();
  params.append("secret", process.env.RE_CAPTCHA_SECRET_KEY);
  params.append("response", token);
  if (remoteIp) params.append("remoteip", remoteIp);

  try {
    const response = await axios.post(VERIFY_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 5000
    });
    return response.data && response.data.success === true;
  } catch (err) {
    return false;
  }
}
