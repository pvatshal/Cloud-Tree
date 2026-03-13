import cron from 'node-cron';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import Member from '../models/Member.js';
import Notification from '../models/Notification.js';
import dotenv from 'dotenv';
dotenv.config();

const ses = new SESClient({ region: process.env.SES_REGION || 'us-east-2' });

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

cron.schedule('0 8 * * *', async () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day   = today.getDate();

  try {
    const members = await Member.find({});

    for (const member of members) {
      // Birthday check
      if (member.dob) {
        const dob = new Date(member.dob);
        if (dob.getMonth() + 1 === month && dob.getDate() === day) {
          if (member.email) {
            await sendEmail(member.email, `🎂 Happy Birthday ${member.name}!`,
              `Wishing ${member.name} a very Happy Birthday from CloudTree! 🌳`);
          }
          await Notification.create({
            user: member.userId,
            type: 'birthday',
            message: `🎂 Today is ${member.name}'s birthday!`,
            memberId: member._id,
          });
        }
      }

      // Anniversary check
      if (member.anniversary) {
        const ann = new Date(member.anniversary);
        if (ann.getMonth() + 1 === month && ann.getDate() === day) {
          if (member.email) {
            await sendEmail(member.email, `💍 Happy Anniversary ${member.name}!`,
              `Wishing ${member.name} a wonderful Anniversary from CloudTree! 🌳`);
          }
          await Notification.create({
            user: member.userId,
            type: 'anniversary',
            message: `💍 Today is ${member.name}'s anniversary!`,
            memberId: member._id,
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Cron job error:', err);
  }
});