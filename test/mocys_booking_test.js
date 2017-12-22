require('should');
const MacysBooking = require('../macys_booking');
const nock = require('nock');
const { WebClient } = require('@slack/client');

nock.disableNetConnect();

describe('MacysBooking', () => {
  let macysBooking;

  beforeEach(() => {
    const slackWebClient = new WebClient(process.env.SLACK_API_TOKEN);
    macysBooking = new MacysBooking(slackWebClient);
  });

  describe('#bookMassage', () => {
    it('should send a form to slack', (done) => {
      const payload = {
        token: '',
        team_id: 'T25MRFT3M',
        channel_id: 'C8HTS5MEC',
        user_id: 'U25PP0KEE',
        command: '/book-massage',
        text: '',
        response_url: 'https://hooks.slack.com/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb',
        trigger_id: '290064239264.73739537123.0cb6e21b315eff944b90b083405e102c',
      };

      const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
        .post('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', {
          attachments: [{
            text: 'There is one spot available at HH:MM, do you want to reserve it?',
            fallback: "Shame... buttons aren't supported in this land",
            callback_id: 'book-massage',
            color: '#3AA3E3',
            attachment_type: 'default',
            actions: [{
              name: 'reserve', text: 'Yes, reserve', type: 'button', value: 'HH:MM',
            }, {
              name: 'cancel', text: 'Cancel', type: 'button', value: 'cancel',
            }],
          }],
        })
        .reply(200, 'ok');

      macysBooking.bookMassage(payload, () => {
        slackCall.done();
        done();
      });
    });
  });
});
