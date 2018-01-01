const assert = require('assert');
const Booking = require('../../models/booking');
const BookingRepository = require('../../services/booking_repository');
const DateRange = require('../../models/date_range');
const faker = require('faker');
const User = require('../../models/user');

function newBooking() {
  const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
  const dateRange = new DateRange(new Date(), new Date());
  return new Booking(user, dateRange);
}

describe('BookingRepository', () => {
  beforeEach((done) => {
    new BookingRepository().flush().then(done).catch(done);
  });

  describe('#all()', () => {
    it('persist data so all repository have the same', (done) => {
      const booking = newBooking();

      new BookingRepository().add(booking).then(() => {
        new BookingRepository().all().then((bookings) => {
          assert(bookings.find(b => b.isEqual(booking)));
          done();
        }).catch(done);
      }).catch(done);
    });
  });

  describe('#add()', () => {
    it('allow to add new booking', (done) => {
      const repository = new BookingRepository();
      const booking = newBooking();

      repository.add(booking).then(() => {
        repository.all().then((bookings) => {
          assert(bookings.find(b => b.isEqual(booking)));
          done();
        }).catch(done);
      }).catch(done);
    });
  });
});
