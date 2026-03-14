// Replace at top:
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
const sns = new SNSClient({ region: process.env.SES_REGION || 'us-east-2' });

// Replace the ses.send() block with:
await sns.publish(new PublishCommand({
  TopicArn: process.env.SNS_INVITE_TOPIC,
  Message: JSON.stringify({
    ownerName:    owner.name,
    inviteeEmail: email.toLowerCase(),
    role,
    token:        invite.token,
    appUrl:       process.env.APP_URL,
  }),
}));