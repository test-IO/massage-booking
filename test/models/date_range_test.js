const assert = require('assert');
const DateRange = require('../../models/date_range');

describe('DateRange', () => {
  describe('#isEqual()', () => {
    it('return true if the start and end date are the same', (done) => {
      const dateRange = new DateRange(
        new Date(2017, 11, 29, 9, 0),
        new Date(2017, 11, 29, 10, 0),
      );

      assert(dateRange.isEqual(new DateRange(
        new Date(2017, 11, 29, 9, 0),
        new Date(2017, 11, 29, 10, 0),
      )));

      assert(!dateRange.isEqual(new DateRange(
        new Date(2017, 11, 29, 9, 0),
        new Date(2017, 11, 29, 11, 0),
      )));

      assert(!dateRange.isEqual(new DateRange(
        new Date(2017, 11, 29, 8, 0),
        new Date(2017, 11, 29, 10, 0),
      )));

      assert(!dateRange.isEqual(new DateRange(
        new Date(2017, 11, 29, 8, 0),
        new Date(2017, 11, 29, 11, 0),
      )));

      done();
    });
  });

  describe('#isIntersecting()', () => {
    it('return true if the date ranges intesect in time', (done) => {
      const dateRange = new DateRange(
        new Date(2017, 11, 29, 9, 0),
        new Date(2017, 11, 29, 11, 0),
      );

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 9, 0),
        new Date(2017, 11, 29, 11, 0),
      )), 'when the same');

      assert(!dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 12, 0),
        new Date(2017, 11, 29, 14, 0),
      )), 'when not intersecting');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 8, 0),
        new Date(2017, 11, 29, 11, 0),
      )), 'when start before but end the same');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 10, 0),
        new Date(2017, 11, 29, 11, 0),
      )), 'when start after but end the same');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 8, 0),
        new Date(2017, 11, 29, 11, 0),
      )), 'when end before but start the same');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 10, 0),
        new Date(2017, 11, 29, 11, 0),
      )), 'when end after but start the same');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 8, 0),
        new Date(2017, 11, 29, 10, 0),
      )), 'when cutting the beginning');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 10, 0),
        new Date(2017, 11, 29, 12, 0),
      )), 'when cutting the end');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 9, 30),
        new Date(2017, 11, 29, 10, 30),
      )), 'when included');

      assert(dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 8, 0),
        new Date(2017, 11, 29, 12, 0),
      )), 'when including');

      assert(!dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 7, 0),
        new Date(2017, 11, 29, 9, 0),
      )), 'when touching the beginning');

      assert(!dateRange.isIntersecting(new DateRange(
        new Date(2017, 11, 29, 11, 0),
        new Date(2017, 11, 29, 13, 0),
      )), 'when touching the end');

      done();
    });
  });
});
