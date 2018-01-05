// const nock = require('nock');

// nock.disableNetConnect();
// nock.recorder.rec();

// const { WebClient } = require('@slack/client');

// const token = process.env.SLACK_API_TOKEN || '';
// const web = new WebClient(token);

// web.users.info('U25PP0KEE', (err, res) => {
//   if (err) {
//     console.log('Error:', err);
//   } else {
//     console.log(res);
//     console.log(res.user.id);
//     console.log(res.user.name);
//     console.log(res.user.display_name);
//     console.log(res.user.real_name);
//   }
// });

// web.users.list((err, res) => {
//   if (err) {
//     console.log('Error:', err);
//   } else {
//     console.log(res);
//   }
// });

// web.chat.postMessage('U25PP0KEE', 'The chair is waiting for you, go get your massage :massage:', (err, res) => {
//   if (err) {
//     console.log('Error:', err);
//   } else {
//     console.log('Message sent: ', res);
//   }
// });

// const { WebClient } = require('@slack/client');

// const token = process.env.SLACK_API_TOKEN || '';
// const web = new WebClient(token);

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
