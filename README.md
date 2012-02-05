## Touchy.js
### Because some things just need to be touched.

Touchy.js is a simple light-weight (1.15 kb compressed) JavaScript library for dealing with touch events in the browser. With no dependencies, just add the script to your page and start hacking.


## Quick example

``` javascript
// The HTML element that to watch for touches
var touchMe = document.getElementById('touch-me');

// Touchy.js creates a single global object called 'Touchy'
Touchy(touchMe, function (hand, finger) {
	// This function will be called for every finger that touches the screen
	// regardless of what other fingers are currently interacting.

	// 'finger' is an object representing the entire path of a finger
	// on the screen. So a touch-drag-release by a single finger would be
	// encapsulated into this single object.

	// 'hand' is an object holding all fingers currently interacting with the
	// screen.
	// 'hand.fingers' returns an Array of fingers currently on the screen
	// including this one.
	// In this case we are only listening to a single finger at a time.
	if (hand.fingers.length > 1) {
		return;
	}

	// This callback is fired when the finger initially touches the screen.
	finger.on('start', function (point) {
		// 'point' is a coordinate of the form { id: <string>, x: <number>, y: <number>, time: <date> }
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


# Multi-touch example

``` javascript
var touchMe = document.getElementById('touch-me');

Touchy(touchMe, {
	one: function (hand, finger) {
		// Full touchy style event system, run only when exactly one finger
		// on screen.

		// In these cases 'hand' is only alive for the duration of touches that
		// have the exact number of simulataneous touches (unlike in the
		// previous example).
	},

	two: function (hand, finger1, finger2) {
		// Only run when exactly two fingers on screen
		hand.on('move', function (points) {
			// 'points' is an Array of point objects (same as finger.on point object)
		});
	}

	// 'three', 'four', 'five' are supported as well.
	// 'any' is the same as the previous example.
});
```
