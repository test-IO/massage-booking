const request = require('request');
// const { DateRange, Reservation, User } = require('./models');

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
    this.reservations = [];
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

  bookMassage(payload, callback) {
    const nextAvailability = this.nextAvailability();
    const attachments = [
      {
        text: `There is one spot available at ${nextAvailability}, do you want to reserve it?`,
        callback_id: 'book-massage',
        attachment_type: 'default',
        actions: [
          {
            name: 'reserve',
            text: `Yes, reserve ${nextAvailability}`,
            type: 'button',
            value: nextAvailability,
          },
          {
            name: 'reserve',
            text: 'Pick a another time...',
            type: 'select',
            options: [
              { text: '14:30', value: '14:30' },
              { text: '15:45', value: '15:45' },
            ],
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

  nextAvailability() {
    const currentTimeInMs = Date.now();
    const currentTime = new Date(currentTimeInMs);
    return `${currentTime.getHours()}:${currentTime.getMinutes()}`;
  }
}

module.exports = MacysBooking;
