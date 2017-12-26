const assert = require('assert');
const DateRange = require('../../models/date_range');
const faker = require('faker');
const MassageBooking = require('../../services/massage_booking');
const nock = require('nock');
const Reservation = require('../../models/reservation');
const timekeeper = require('timekeeper');
const User = require('../../models/user');
const { WebClient } = require('@slack/client');

nock.disableNetConnect();

// .filteringRequestBody((body) => {
//   jsonBody = JSON.parse(body);
//   delete jsonBody.attachments[0].text;
//   return jsonBody;
// })

describe('MassageBooking', () => {
  let massageBooking,
    now;

  beforeEach(() => {
    const slackWebClient = new WebClient(process.env.SLACK_API_TOKEN);
    massageBooking = new MassageBooking(slackWebClient);

    now = new Date();
    now.setHours(9);
    now.setMinutes(0);
    timekeeper.freeze(now);
  });

  afterEach(() => {
    timekeeper.reset();
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

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');

            const dateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 33),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 53),
            );
            assert(reservation.dateRange.isEqual(dateRange));

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

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');

            const dateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 45),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 5),
            );
            assert(reservation.dateRange.isEqual(dateRange));

            done();
          });
        });
      });
    });
  });

  describe('#bookMassage', () => {
    describe('without providing any parameters', () => {
      it('return find the earliest available time', (done) => {
        const user = new User(faker.random.alphaNumeric(), faker.internet.userName());
        const dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 45),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 5),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));

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

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 2));
        const nextAvailability = '9:00';
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

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });
    });
  });
});
