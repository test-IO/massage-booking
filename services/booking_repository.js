const redis = require('redis');
const Booking = require('../models/booking.js');

class BookingRepository {
  constructor() {
    this.redisOptions = { host: 'redis', prefix: 'test' };
  }

  add(booking, callback) {
    const redisClient = this.createRedisClient();

    redisClient.lpush('bookings', booking.toJson(), () => {
      callback();
      redisClient.quit();
    });
  }

  all(callback) {
    const redisClient = this.createRedisClient();

    redisClient.lrange('bookings', 0, -1, (err, replies) => {
      callback(replies.map(reply => Booking.parseJson(reply)));
      redisClient.quit();
    });
  }

  createRedisClient() {
    return redis.createClient(this.redisOptions);
  }

  flush(callback) {
    const redisClient = this.createRedisClient();

    redisClient.del('bookings', () => {
      callback();
      redisClient.quit();
    });
  }
}

module.exports = BookingRepository;
