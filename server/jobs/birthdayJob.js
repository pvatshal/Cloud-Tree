import cron from 'node-cron';
import nodemailer from 'nodemailer';
import Member from '../models/Member.js';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

// Runs every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  try {
    const members = await Member.find({ email: { $exists: true, $ne: '' } });

    members.forEach(member => {
      // Birthday check
      if (member.dob) {
        const dob = new Date(member.dob);
        if (dob.getMonth() + 1 === month && dob.getDate() === day) {
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: member.email,
            subject: `🎂 Happy Birthday ${member.name}!`,
            text: `Wishing ${member.name} a very Happy Birthday from CloudTree! 🌳`
          });
          console.log(`Birthday email sent to ${member.name}`);
        }
      }

      // Anniversary check
      if (member.anniversary) {
        const ann = new Date(member.anniversary);
        if (ann.getMonth() + 1 === month && ann.getDate() === day) {
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: member.email,
            subject: `💍 Happy Anniversary ${member.name}!`,
            text: `Wishing ${member.name} a wonderful Anniversary from CloudTree! 🌳`
          });
          console.log(`Anniversary email sent to ${member.name}`);
        }
      }
    });
  } catch (err) {
    console.error('Cron job error:', err);
  }
});