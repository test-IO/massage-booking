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

  describe('#actionHandler', () => {
    context('book-massage', () => {
      context('reserve', () => {
        it('clicked on reserve button', (done) => {
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '17:33' }],
            callback_id: 'book-massage',
            team: { id: 'T25MRFT3M' },
            channel: { id: 'C8HTS5MEC' },
            user: { id: 'U25PP0KEE', name: 'simon' },
            action_ts: '1514046806.960158',
            message_ts: '1514046805.000007',
            attachment_id: '1',
            is_app_unfurl: false,
            response_url: 'https://hooks.slack.com/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t',
            trigger_id: '291932495047.73739537123.5a0db0f14d1768425d6c498ffe0eac72',
          };

          const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
            .post('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
              attachments: [{ text: 'simon clicked: reserve' }],
              replace_original: true,
            })
            .reply(200, 'ok');

          macysBooking.actionHandler(payload, () => {
            slackCall.done();
            done();
          });
        });

        it('selected a time', (done) => {
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'select', selected_options: [{ value: '15:45' }] }],
            callback_id: 'book-massage',
            team: { id: 'T25MRFT3M' },
            channel: { id: 'C8HTS5MEC' },
            user: { id: 'U25PP0KEE', name: 'simon' },
            action_ts: '1514046813.882252',
            message_ts: '1514046811.000025',
            attachment_id: '1',
            is_app_unfurl: false,
            response_url: 'https://hooks.slack.com/actions/T25MRFT3M/290870923474/D5EQmPpOCph5nhjxCVUnXC6n',
            trigger_id: '290793622739.73739537123.14c350eed428152158ecf12061041e20',
          };

          const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
            .post('/actions/T25MRFT3M/290870923474/D5EQmPpOCph5nhjxCVUnXC6n', {
              attachments: [{ text: 'simon clicked: reserve' }],
              replace_original: true,
            })
            .reply(200, 'ok');

          macysBooking.actionHandler(payload, () => {
            slackCall.done();
            done();
          });
        });
      });
    });
  });

  describe('#bookMassage', () => {
    it('send a form to reserve the current time (for now)', (done) => {
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

      const nextAvailability = macysBooking.nextAvailability();
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
      const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
        .post('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments })
        .reply(200, 'ok');

      macysBooking.bookMassage(payload, () => {
        slackCall.done();
        done();
      });
    });
  });
});
