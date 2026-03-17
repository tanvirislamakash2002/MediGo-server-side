import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.APP_USER,
        pass: process.env.APP_PASSWORD,
    },
});

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite", // or "mysql", "postgresql", ...etc
    }),
    trustedOrigins: [process.env.APP_URL!],
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "CUSTOMER",
                required: false
            },
            phone: {
                type: "string",
                required: false
            },
            address: {
                type: "string",
                required: false
            },
            isActive: {
                type: "boolean",
                defaultValue: true,
                required: false
            },
        }
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        requireEmailVerification: true
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            try {
                const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`
                const info = await transporter.sendMail({
                    from: '"MediGo" <medigo.support@gmail.com>',
                    to: user.email,
                    subject: "Verify Your Email ✔",
                    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - MediGo</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <!-- Header -->
        <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">MediGo</h1>
                <p style="color: #e0e7ff; margin: 5px 0 0; font-size: 16px;">Your Trusted Online Medicine Shop</p>
            </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
            <td style="padding: 40px;">
                <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px;">Verify Your Email Address</h2>
                
                <p style="color: #666666; line-height: 1.6; margin: 0 0 15px;">Hello ${user.name},</p>
                
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">Thank you for signing up with <strong style="color: #667eea;">MediGo</strong>! To complete your registration and start exploring our wide range of medicines, please verify your email address by clicking the button below:</p>
                
                <!-- Verification Button -->
                <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50px; text-align: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Verify Email Address</a>
                        </td>
                    </tr>
                </table>
                
                <!-- Alternative Link -->
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">Or copy and paste this link into your browser:</p>
                <p style="background-color: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; word-break: break-all; margin: 0 0 20px;">
                    <a href="${verificationUrl}" style="color: #667eea; text-decoration: none; font-size: 14px;">${verificationUrl}</a>
                </p>
                
                <!-- Expiry Notice -->
                <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 25px 0;">
                    <p style="color: #e65100; margin: 0; font-size: 14px;">
                        <strong>⚠️ Link Expires in 24 Hours</strong><br>
                        This verification link will expire in 24 hours for security reasons.
                    </p>
                </div>
                
                <!-- Alternative Instructions -->
                <p style="color: #666666; line-height: 1.6; margin: 20px 0 0;">If you didn't create an account with MediGo, you can safely ignore this email.</p>
            </td>
        </tr>
        
        <!-- Benefits Section -->
        <tr>
            <td style="padding: 0 40px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="border-top: 1px solid #eaeef2; padding-top: 25px;">
                            <h3 style="color: #333333; margin: 0 0 20px; font-size: 18px; text-align: center;">What you can do with MediGo:</h3>
                            
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="33%" style="text-align: center; padding: 10px;">
                                        <div style="background-color: #f0f4ff; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; margin: 0 auto 10px; font-size: 24px;">💊</div>
                                        <p style="color: #666666; margin: 0; font-size: 14px;">Browse Medicines</p>
                                    </td>
                                    <td width="33%" style="text-align: center; padding: 10px;">
                                        <div style="background-color: #f0f4ff; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; margin: 0 auto 10px; font-size: 24px;">🚚</div>
                                        <p style="color: #666666; margin: 0; font-size: 14px;">Fast Delivery</p>
                                    </td>
                                    <td width="33%" style="text-align: center; padding: 10px;">
                                        <div style="background-color: #f0f4ff; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; margin: 0 auto 10px; font-size: 24px;">💰</div>
                                        <p style="color: #666666; margin: 0; font-size: 14px;">Best Prices</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="background-color: #2d3748; padding: 30px 40px; border-radius: 0 0 10px 10px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="text-align: center;">
                            <p style="color: #a0aec0; margin: 0 0 10px; font-size: 14px;">© 2026 MediGo. All rights reserved.</p>
                            <p style="color: #a0aec0; margin: 0 0 15px; font-size: 14px;">123 Health Street, Wellness City, HC 12345</p>
                            
                            <!-- Social Links -->
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px;">
                                <tr>
                                    <td style="padding: 0 8px;">
                                        <a href="#" style="color: #a0aec0; text-decoration: none; font-size: 14px;">Facebook</a>
                                    </td>
                                    <td style="padding: 0 8px;">
                                        <a href="#" style="color: #a0aec0; text-decoration: none; font-size: 14px;">Twitter</a>
                                    </td>
                                    <td style="padding: 0 8px;">
                                        <a href="#" style="color: #a0aec0; text-decoration: none; font-size: 14px;">Instagram</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #718096; margin: 0; font-size: 12px;">This email was sent to {{email}}. If you didn't create an account, please ignore this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
                });

                console.log("Message sent:", info.messageId);
            } catch (error) {
                console.error(error);
                throw error
            }
        },
    },
    socialProviders: {
        google: {
            prompt: "select_account consent",
            accessType: "offline",
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
        }
    }
});

