// const { WebClient } = require('@slack/client');

// const token = process.env.SLACK_API_TOKEN || '';
// const web = new WebClient(token);

// web.chat.postMessage('slack-bots', 'Hello there', (err, res) => {
//   if (err) {
//     console.log('Error:', err);
//   } else {
//     console.log('Message sent: ', res);
//   }
// });

// web.channels.list((err, info) => {
//   if (err) {
//     console.log('Error:', err);
//   } else {
//     for (const i in info.channels) {
//       console.log(info.channels[i].name);
//     }
//   }
// });

// const { CLIENT_EVENTS, RTM_EVENTS, RtmClient } = require('@slack/client');

// const bot_token = process.env.SLACK_BOT_TOKEN || '';

// const rtm = new RtmClient(bot_token);

// let channel;

// rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
//   for (const c of rtmStartData.channels) {
//     if (c.is_member && c.name === 'slack-bots') { channel = c.id; }
//   }
// });

// rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
//   rtm.sendMessage('Hello!', channel);
// });

// rtm.on(RTM_EVENTS.MESSAGE, (message) => {
//   console.log('Message:', message);
// });

// rtm.start();
