import nodemailer from "nodemailer";
import config from "../config";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export const sendOTPEmail = async (
  to: string,
  otp: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: config.email.user,
      to,
      subject: "OTP for ZIA Herbal Pro",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f6fff0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
            
            <div style="background-color: #364A28; padding: 20px; color: #ffffff; text-align: center;">
              <h2 style="margin: 0;">Verify Your Email</h2>
            </div>

            <div style="padding: 30px; text-align: center;">
              <p style="font-size: 16px; color: #333333;">Your OTP code is:</p>

              <div style="margin: 20px 0;">
                <span style="display: inline-block; padding: 10px 20px; background-color: #364A28; color: #ffffff; font-size: 24px; border-radius: 5px; letter-spacing: 4px;">
                  ${otp}
                </span>
              </div>

              <p style="font-size: 14px; color: #777777;">
                Valid for 10 minutes. Do not share with anyone.
              </p>
            </div>

            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
              © ${new Date().getFullYear()} ZIA Herbal Pro. All rights reserved.
            </div>

          </div>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
};