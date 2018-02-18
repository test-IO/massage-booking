const app = require('../app');
const Booking = require('../models/booking');
const BookingRepository = require('../services/booking_repository');
const chai = require('chai');
const chaiHttp = require('chai-http');
const DateRange = require('../models/date_range');
const faker = require('faker');
const User = require('../models/user');


const { assert } = chai;


chai.use(chaiHttp);


function addMinutes(date, minutes) {
  return new Date(date.getTime() + (60000 * minutes));
}


describe('API', () => {
  let bookingRepository;

  beforeEach((done) => {
    bookingRepository = new BookingRepository({ host: process.env.REDIS_HOST, prefix: 'test' });
    bookingRepository.flush().then(done).catch(done);
  });

  describe('GET /bookings', () => {
    it('return a 200 with auth to false', async () => {
      const bookings = [];
      let user;
      let dateRange;

      user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      dateRange = new DateRange(
        addMinutes(new Date(), 20),
        addMinutes(new Date(), 40),
      );
      const futureBooking = new Booking(user, dateRange);
      bookings.push(futureBooking);

      user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      dateRange = new DateRange(
        addMinutes(new Date(), -30),
        addMinutes(new Date(), -10),
      );
      const pastBooking = new Booking(user, dateRange);
      bookings.push(pastBooking);

      user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      dateRange = new DateRange(
        addMinutes(new Date(), -10),
        addMinutes(new Date(), 10),
      );
      const currentBooking = new Booking(user, dateRange);
      bookings.push(currentBooking);

      await Promise.all(bookings.map(booking => bookingRepository.add(booking)));

      await chai.request(app)
        .get('/bookings')
        .then((response) => {
          assert.equal(200, response.status);

          assert.equal(2, response.body.bookings.length);

          assert.equal(currentBooking.user.id, response.body.bookings[0].user.id);
          assert.equal(currentBooking.user.name, response.body.bookings[0].user.name);
          assert.equal(currentBooking.user.realName, response.body.bookings[0].user.realName);

          assert.equal(futureBooking.user.id, response.body.bookings[1].user.id);
          assert.equal(futureBooking.user.name, response.body.bookings[1].user.name);
          assert.equal(futureBooking.user.realName, response.body.bookings[1].user.realName);
        });
    });
  });
});
