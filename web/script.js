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

var state = {
  current_booking: { realName: 'loading...' },
  upcoming_bookings: []
}

var update = function() {
  $.get('/bookings', function(data, status){
    window.state.current_bookings = data.bookings.shift();
    window.state.upcoming_bookings = data.bookings;
  });
}

$(function() {
  rivets.bind($('body'), state);
  update();
  setInterval(update, 10000);
});
