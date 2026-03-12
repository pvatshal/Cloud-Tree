import cron from 'node-cron';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import Member from '../models/Member.js';
import dotenv from 'dotenv';
dotenv.config();

const ses = new SESClient({ region: process.env.S3_REGION || 'us-east-2' });

const sendEmail = async (to, subject, body) => {
  const command = new SendEmailCommand({
    Source: process.env.EMAIL_USER,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: body } },
    },
  });
  await ses.send(command);
};

// Runs every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  try {
    const members = await Member.find({ email: { $exists: true, $ne: '' } });

    for (const member of members) {
      // Birthday check
      if (member.dob) {
        const dob = new Date(member.dob);
        if (dob.getMonth() + 1 === month && dob.getDate() === day) {
          await sendEmail(
            member.email,
            `🎂 Happy Birthday ${member.name}!`,
            `Wishing ${member.name} a very Happy Birthday from CloudTree! 🌳`
          );
          console.log(`✅ Birthday email sent to ${member.name}`);
        }
      }

      // Anniversary check
      if (member.anniversary) {
        const ann = new Date(member.anniversary);
        if (ann.getMonth() + 1 === month && ann.getDate() === day) {
          await sendEmail(
            member.email,
            `💍 Happy Anniversary ${member.name}!`,
            `Wishing ${member.name} a wonderful Anniversary from CloudTree! 🌳`
          );
          console.log(`✅ Anniversary email sent to ${member.name}`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Cron job error:', err);
  }
});