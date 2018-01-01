const assert = require('assert');
const Booking = require('../../models/booking');
const DateRange = require('../../models/date_range');
const faker = require('faker');
const MassageBooking = require('../../services/massage_booking');
const nock = require('nock');
const timekeeper = require('timekeeper');
const User = require('../../models/user');
const { WebClient } = require('@slack/client');

nock.disableNetConnect();

function nockFetchUser(userPayload) {
  return nock('https://slack.com:443', { encodedQueryParams: true })
    .post('/api/users.info', `user=${userPayload.id}&token=${process.env.SLACK_API_TOKEN}`)
    .reply(200, { ok: true, user: userPayload });
}

function nockSlackCall(path, payload) {
  return nock('https://hooks.slack.com:443', { encodedQueryParams: true }).post(path, payload).reply(200, 'ok');
}

describe('MassageBooking', () => {
  let massageBooking;
  let now;

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

  describe('#actionHandler()', () => {
    context('book-massage', () => {
      context('reserve', () => {
        it('clicked on reserve button and the time is available', (done) => {
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
            attachments: [{ text: 'Thanks for your booking at 17:33 -> 17:53' }],
            replace_original: true,
          });

          nockFetchUser({
            id: 'U25PP0KEE',
            team_id: 'T25MRFT3M',
            name: 'simon',
            real_name: 'Simon Lacroix',
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');
            assert.equal(reservation.user.realName, 'Simon Lacroix');

            const dateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 33),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 53),
            );
            assert(reservation.dateRange.isEqual(dateRange));

            done();
          });
        });

        it('selected a time and the time is available', (done) => {
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290870923474/D5EQmPpOCph5nhjxCVUnXC6n', {
            attachments: [{ text: 'Thanks for your booking at 15:45 -> 16:05' }],
            replace_original: true,
          });

          nockFetchUser({
            id: 'U25PP0KEE',
            team_id: 'T25MRFT3M',
            name: 'simon',
            real_name: 'Simon Lacroix',
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');
            assert.equal(reservation.user.realName, 'Simon Lacroix');

            const dateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 45),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 5),
            );
            assert(reservation.dateRange.isEqual(dateRange));

            done();
          });
        });

        it('clicked on reserve button and the time is not available anymore', (done) => {
          const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 35, 0, 0),
          );

          massageBooking.reservations.push(new Booking(user, dateRange));
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '14:00' }],
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
            attachments: [{ text: 'Sorry but this time is not available anymore.' }],
            replace_original: true,
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, user.id);
            assert.equal(reservation.user.name, user.name);
            assert.equal(reservation.user.realName, user.realName);

            assert(reservation.dateRange.isEqual(dateRange));

            done();
          });
        });

        it('update the user reservation', (done) => {
          const user = new User('U25PP0KEE');
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 35, 0, 0),
          );
          massageBooking.reservations.push(new Booking(user, dateRange));

          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '14:00' }],
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
            attachments: [{ text: 'Your booking as been successfully updated to 14:00 -> 14:20' }],
            replace_original: true,
          });

          nockFetchUser({
            id: 'U25PP0KEE',
            team_id: 'T25MRFT3M',
            name: 'simon',
            real_name: 'Simon Lacroix',
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');
            assert.equal(reservation.user.realName, 'Simon Lacroix');

            const newDateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 20, 0, 0),
            );
            assert(reservation.dateRange.isEqual(newDateRange));

            done();
          });
        });

        it('ignore past reservations', (done) => {
          const user = new User('U25PP0KEE');
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 20, 0, 0),
          );
          massageBooking.reservations.push(new Booking(user, dateRange));

          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '14:00' }],
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
            attachments: [{ text: 'Thanks for your booking at 14:00 -> 14:20' }],
            replace_original: true,
          });

          nockFetchUser({
            id: 'U25PP0KEE',
            team_id: 'T25MRFT3M',
            name: 'simon',
            real_name: 'Simon Lacroix',
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');
            assert.equal(reservation.user.realName, 'Simon Lacroix');

            const newDateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 20, 0, 0),
            );
            assert(reservation.dateRange.isEqual(newDateRange));

            done();
          });
        });

        it('clean past reservations', (done) => {
          const user = new User(faker.random.uuid());
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 20, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 40, 0, 0),
          );
          massageBooking.reservations.push(new Booking(user, dateRange));

          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '14:00' }],
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
            attachments: [{ text: 'Thanks for your booking at 14:00 -> 14:20' }],
            replace_original: true,
          });

          nockFetchUser({
            id: 'U25PP0KEE',
            team_id: 'T25MRFT3M',
            name: 'simon',
            real_name: 'Simon Lacroix',
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');
            assert.equal(reservation.user.realName, 'Simon Lacroix');

            const newDateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 20, 0, 0),
            );
            assert(reservation.dateRange.isEqual(newDateRange));

            done();
          });
        });
      });
    });
  });

  describe('#bookMassage()', () => {
    describe('no params', () => {
      it('return find the earliest available time', (done) => {
        let user = new User(faker.random.uuid());
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 20, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 35, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 55, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

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

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          {
            text: 'There is one spot available at 11:40, do you want to reserve it?',
            color: '#36a64f',
            callback_id: 'book-massage',
            attachment_type: 'default',
            actions: [
              {
                name: 'reserve',
                text: 'Yes, reserve 11:40 -> 12:00',
                type: 'button',
                value: '11:40',
              },
              {
                name: 'reserve',
                text: 'Pick a another time...',
                type: 'select',
                options: [
                  { text: '11:40 -> 12:00', value: '11:40' },
                  { text: '12:20 -> 12:40', value: '12:20' },
                  { text: '12:25 -> 12:45', value: '12:25' },
                  { text: '12:30 -> 12:50', value: '12:30' },
                  { text: '12:35 -> 12:55', value: '12:35' },
                  { text: '12:40 -> 13:00', value: '12:40' },
                  { text: '12:45 -> 13:05', value: '12:45' },
                  { text: '12:50 -> 13:10', value: '12:50' },
                  { text: '12:55 -> 13:15', value: '12:55' },
                  { text: '13:00 -> 13:20', value: '13:00' },
                  { text: '13:05 -> 13:25', value: '13:05' },
                  { text: '13:10 -> 13:30', value: '13:10' },
                  { text: '13:15 -> 13:35', value: '13:15' },
                  { text: '13:55 -> 14:15', value: '13:55' },
                  { text: '14:00 -> 14:20', value: '14:00' },
                  { text: '14:05 -> 14:25', value: '14:05' },
                  { text: '14:10 -> 14:30', value: '14:10' },
                  { text: '14:15 -> 14:35', value: '14:15' },
                  { text: '14:20 -> 14:40', value: '14:20' },
                  { text: '14:25 -> 14:45', value: '14:25' },
                  { text: '14:30 -> 14:50', value: '14:30' },
                  { text: '14:35 -> 14:55', value: '14:35' },
                  { text: '14:40 -> 15:00', value: '14:40' },
                  { text: '14:45 -> 15:05', value: '14:45' },
                  { text: '14:50 -> 15:10', value: '14:50' },
                ],
              },
            ],
          },
        ];
        const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });

      it('ignore user reservations', (done) => {
        let user = new User(faker.random.uuid());
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User('U25PP0KEE');
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));


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

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          {
            text: 'There is one spot available at 10:50, do you want to reserve it?',
            color: '#36a64f',
            callback_id: 'book-massage',
            attachment_type: 'default',
            actions: [
              {
                name: 'reserve',
                text: 'Yes, reserve 10:50 -> 11:10',
                type: 'button',
                value: '10:50',
              },
              {
                name: 'reserve',
                text: 'Pick a another time...',
                type: 'select',
                options: [
                  { text: '10:50 -> 11:10', value: '10:50' },
                  { text: '10:55 -> 11:15', value: '10:55' },
                  { text: '11:00 -> 11:20', value: '11:00' },
                  { text: '11:05 -> 11:25', value: '11:05' },
                  { text: '11:10 -> 11:30', value: '11:10' },
                  { text: '11:15 -> 11:35', value: '11:15' },
                  { text: '11:20 -> 11:40', value: '11:20' },
                  { text: '11:25 -> 11:45', value: '11:25' },
                  { text: '11:30 -> 11:50', value: '11:30' },
                  { text: '11:35 -> 11:55', value: '11:35' },
                  { text: '11:40 -> 12:00', value: '11:40' },
                  { text: '11:45 -> 12:05', value: '11:45' },
                  { text: '11:50 -> 12:10', value: '11:50' },
                  { text: '11:55 -> 12:15', value: '11:55' },
                  { text: '12:00 -> 12:20', value: '12:00' },
                  { text: '12:05 -> 12:25', value: '12:05' },
                  { text: '12:10 -> 12:30', value: '12:10' },
                  { text: '12:15 -> 12:35', value: '12:15' },
                  { text: '12:20 -> 12:40', value: '12:20' },
                  { text: '12:25 -> 12:45', value: '12:25' },
                  { text: '12:30 -> 12:50', value: '12:30' },
                  { text: '12:35 -> 12:55', value: '12:35' },
                  { text: '12:40 -> 13:00', value: '12:40' },
                  { text: '12:45 -> 13:05', value: '12:45' },
                  { text: '12:50 -> 13:10', value: '12:50' },
                ],
              },
            ],
          },
          {
            text: 'Note: You already have a booking for 11:00 -> 11:20.\nMaking a new booking will cancel the previous ones.',
            color: '#ffcc00',
          },
        ];
        const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });

      it('ignore past reservations', (done) => {
        const user = new User('U25PP0KEE');
        const dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 10, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

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

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          {
            text: 'There is one spot available at 10:25, do you want to reserve it?',
            color: '#36a64f',
            callback_id: 'book-massage',
            attachment_type: 'default',
            actions: [
              {
                name: 'reserve',
                text: 'Yes, reserve 10:25 -> 10:45',
                type: 'button',
                value: '10:25',
              },
              {
                name: 'reserve',
                text: 'Pick a another time...',
                type: 'select',
                options: [
                  { text: '10:25 -> 10:45', value: '10:25' },
                  { text: '10:30 -> 10:50', value: '10:30' },
                  { text: '10:35 -> 10:55', value: '10:35' },
                  { text: '10:40 -> 11:00', value: '10:40' },
                  { text: '10:45 -> 11:05', value: '10:45' },
                  { text: '10:50 -> 11:10', value: '10:50' },
                  { text: '10:55 -> 11:15', value: '10:55' },
                  { text: '11:00 -> 11:20', value: '11:00' },
                  { text: '11:05 -> 11:25', value: '11:05' },
                  { text: '11:10 -> 11:30', value: '11:10' },
                  { text: '11:15 -> 11:35', value: '11:15' },
                  { text: '11:20 -> 11:40', value: '11:20' },
                  { text: '11:25 -> 11:45', value: '11:25' },
                  { text: '11:30 -> 11:50', value: '11:30' },
                  { text: '11:35 -> 11:55', value: '11:35' },
                  { text: '11:40 -> 12:00', value: '11:40' },
                  { text: '11:45 -> 12:05', value: '11:45' },
                  { text: '11:50 -> 12:10', value: '11:50' },
                  { text: '11:55 -> 12:15', value: '11:55' },
                  { text: '12:00 -> 12:20', value: '12:00' },
                  { text: '12:05 -> 12:25', value: '12:05' },
                  { text: '12:10 -> 12:30', value: '12:10' },
                  { text: '12:15 -> 12:35', value: '12:15' },
                  { text: '12:20 -> 12:40', value: '12:20' },
                  { text: '12:25 -> 12:45', value: '12:25' },
                ],
              },
            ],
          },
        ];
        const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });
    });

    describe('list', () => {
      it('return list of reservations', (done) => {
        const realNames = Array.from(Array(6), () => faker.name.findName());

        let user = new User(faker.random.uuid(), faker.internet.userName(), realNames[0]);
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[1]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 20, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User('U25PP0KEE', faker.internet.userName(), realNames[2]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[3]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 20, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 40, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[4]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[5]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
        );
        massageBooking.reservations.push(new Booking(user, dateRange));

        const payload = {
          token: '',
          team_id: 'T25MRFT3M',
          channel_id: 'C8HTS5MEC',
          user_id: 'U25PP0KEE',
          command: '/book-massage',
          text: 'list',
          response_url: 'https://hooks.slack.com/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb',
          trigger_id: '290064239264.73739537123.0cb6e21b315eff944b90b083405e102c',
        };

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          { text: `10:30 -> 10:50   ${realNames[0]}` },
          { text: `11:00 -> 11:20   ${realNames[2]}`, color: '#36a64f' },
          { text: `11:20 -> 11:40   ${realNames[4]}` },
          { text: `11:40 -> 12:00   ${realNames[5]}` },
          { text: `12:00 -> 12:20   ${realNames[1]}` },
        ];
        const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });

      it('return a nice message if there is no reservations yet', (done) => {
        const payload = {
          token: '',
          team_id: 'T25MRFT3M',
          channel_id: 'C8HTS5MEC',
          user_id: 'U25PP0KEE',
          command: '/book-massage',
          text: 'list',
          response_url: 'https://hooks.slack.com/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb',
          trigger_id: '290064239264.73739537123.0cb6e21b315eff944b90b083405e102c',
        };

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          { text: 'There is no booking yet, book a massage!', color: '#36a64f' },
        ];
        const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });
    });
  });
});
