## Touchy.js
### Because some things just need to be touched.

Touchy.js is a simple light-weight (1.02 kb compressed) JavaScript library for dealing with touch events in the browser. With no dependencies, just add the script to your page and start hacking.


## Quick example

``` javascript
// The HTML element that to watch for touches
var touchMe = document.getElementById('touch-me');

// Touchy.js creates a single global object called 'Touchy'
Touchy(touchMe, function (finger, hand) {
	// 'finger' is an object representing the entire path of a finger
	// on the screen. So a touch-drag-release by a single finger would be
	// encapsulated into this single object.

	// 'hand' is an object holding all fingers currently interacting with the
	// screen.
	// 'hand.count()' returns the number of fingers currently on the screen
	// including this one.
	// In this case we are only listening to a single finger at a time.
	if (hand.count() > 1) {
		return;
	}

	// This callback is fired when the finger initially touches the screen.
	finger.on('start', function (point) {
		// 'point' is a coordinate of the form { x: <number>, y: <number>, time: <date> }
	});

	// This callback is fired when finger moves.
	finger.on('move', function (point) {
		console.log('finger is moving');
	});

	// This callback is fired when finger is released from the screen.
	finger.on('end', function (point) {
		// 'finger.points' holds the entire path that the finger moved through.
		finger.points.forEach(function (point) {
			console.log('time:', point.time);
			console.log('left:', point.x   );
			console.log(' top:', point.y   );
		});
	});
});
```
