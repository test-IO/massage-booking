const request = require('request');

function sendMessageToSlackResponseUrl(responseUrl, jsonMessage, callback) {
  const postOptions = {
    uri: responseUrl,
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    json: jsonMessage,
  };

  request(postOptions, callback);
}


class MacysBooking {
  constructor(slackWebClient) {
    this.slackWebClient = slackWebClient;
  }

  bookMassage(payload, callback) {
    const attachments = [
      {
        text: 'There is one spot available at HH:MM, do you want to reserve it?',
        fallback: "Shame... buttons aren't supported in this land",
        callback_id: 'book-massage',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: [
          {
            name: 'reserve',
            text: 'Yes, reserve',
            type: 'button',
            value: 'HH:MM',
          },
          {
            name: 'cancel',
            text: 'Cancel',
            type: 'button',
            value: 'cancel',
          },
        ],
      },
    ];

    sendMessageToSlackResponseUrl(payload.response_url, { attachments }, callback);


    // web.chat.postMessage(payload.channel_id, 'Test', { attachments }, (err, res) => {
    //   if (err) {
    //     console.log('Error:', err);
    //   } else {
    //     console.log('Message sent: ', res);
    //   }
    // });
  }

  actionHandler(payload, callback) {
    const message = {
      attachments: [
        {
          text: `${payload.user.name} clicked: ${payload.actions[0].name}`,
        },
      ],
      replace_original: true,
    };

    sendMessageToSlackResponseUrl(payload.response_url, message, callback);


    // web.chat.update(payload.channel.id, 'Test', payload.message_ts, (err, res) => {
    //   if (err) {
    //     console.log('Error:', err);
    //   } else {
    //     console.log('Message sent: ', res);
    //   }
    // });
  }
}

module.exports = MacysBooking;
