import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
const ses = new SESClient({ region: 'us-east-2' });

export const handler = async (event) => {
  const { ownerName, inviteeEmail, role, token, appUrl } =
    JSON.parse(event.Records[0].Sns.Message);

  const acceptUrl = `${appUrl}/accept/${token}`;
  const roleLabel = role === 'editor'
    ? 'Editor (can add & edit members)'
    : 'Viewer (read-only)';

  await ses.send(new SendEmailCommand({
    Source:      'vatsalpatel9876@gmail.com',
    Destination: { ToAddresses: [inviteeEmail] },
    Message: {
      Subject: { Data: `${ownerName} invited you to their CloudTree family tree 🌳` },
      Body: {
        Html: { Data: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#f0fdf4;border-radius:16px;">
            <h1 style="font-family:Georgia,serif;color:#1a4731;">🌳 You're invited!</h1>
            <p style="color:#374151;font-size:1rem;line-height:1.6;">
              <strong>${ownerName}</strong> has invited you to view their CloudTree family tree.
            </p>
            <p>Your role: <strong>${roleLabel}</strong></p>
            <a href="${acceptUrl}" style="display:inline-block;margin-top:1rem;padding:0.85rem 2rem;background:linear-gradient(135deg,#16a34a,#166534);color:white;text-decoration:none;border-radius:12px;font-weight:600;">
              Accept Invitation →
            </a>
            <p style="color:#9ca3af;font-size:0.8rem;margin-top:2rem;">
              No account? You'll be prompted to create one first.
            </p>
          </div>
        `},
        Text: { Data: `${ownerName} invited you.\nRole: ${roleLabel}\nAccept: ${acceptUrl}` },
      },
    },
  }));

  return { statusCode: 200 };
};