rivets.configure({
  prefix: 'rv',
  preloadData: true,
  rootInterface: '.',
  templateDelimiters: ['{', '}'],
  iterationAlias : function(modelName) {
    return '%' + modelName + '%';
  },
  handler: function(target, event, binding) {
    this.call(target, event, binding.view.models)
  },
  executeFunctions: false
})

rivets.formatters.eq = function(val, arg){
  return val == arg
}

rivets.formatters.date = function(value){
  return moment(value).fromNow();
}

var state = {
  running: false,
  empty: true,
  current_booking: { user: { realName: 'loading...' } },
  upcoming_bookings: []
}

var update = function() {
  return "";
  $.get('/bookings', function(data, status){
    window.state.empty = data.bookings.length == 0;
    window.state.current_booking = data.bookings.shift();
    window.state.upcoming_bookings = data.bookings;
    if (typeof window.state.current_booking != "undefined") {
      var start = moment(window.state.current_booking.dateRange.start);
      var end = moment(window.state.current_booking.dateRange.end);
      window.state.running = (start < moment() && end > moment());
    } else {
      window.state.running = false;
    }
  });
}

$(function() {
  rivets.bind($('body'), state);
  update();
  setInterval(update, 10000);
});
