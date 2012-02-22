## Touchy.js
### Because some things just need to be touched.

Touchy.js is a simple light-weight (1.98 kb compressed) JavaScript library for dealing with touch events in the browser. With no dependencies, just add the script to your page and start hacking.


## Quick example

``` javascript
// The HTML element that to watch for touches
var touchMe = document.getElementById('touch-me');

// Touchy.js creates a single global object called 'Touchy'
var toucher = Touchy(touchMe, function (hand, finger) {
	// this === toucher
	// toucher.stop() : stop  watching element for touch events
	// toucher.start(): start watching element for touch events

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
		// 'point' is a coordinate of the following form:
		// { id: <string>, x: <number>, y: <number>, time: <date> }
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


# Event handling

``` javascript
var touchMe = document.getElementById('touch-me');

Touchy(touchMe, function (hand, finger) {
	function startFinger () {
		// ...
	}

	finger.on('start', startFinger);  // Attach startFinger to the start event

	finger.off('start', startFinger); // Detach startFinger from the start event

	finger.once('start', startFinger); // One-time-use handler for start event

	finger.trigger('start', arg1, ..); // Trigger the start event with arguments
});
```


# Mouse simulation

``` javascript
var touchMe = document.getElementById('touch-me');

// When the second invocation argument is set to true Touchy will pick up mouse
// events along with touch events. This is good for testing on desktop.
Touchy(touchMe, true, callback); // For all finger events
Touchy(touchMe, true, { one: ..., two: ... }); // For multi-touch finger events
```


# Plugin support

``` javascript
// Define a plugin
Touchy.plugin('myPlugin', function (elem, settings) {
	// Write your plugin here.
	// This will be executed each time the plugin is applied to an element.

	// 'elem' is the element being touched
	// 'settings' is the the object passed during usage of the plugin

	// Return an object to setup Touchy for the element.
	// This is equivalent to Touchy(elem, { one: ..., two: ... });
	return { one: ..., two: ... };
});

// Use a plugin
var touchMe = document.getElementById('touch-me');
Touchy(touchMe, {
	myPlugin: { these: 'are', your: 'settings' }
});
```


# jQuery wrapper

``` javascript
var touchMe = document.getElementById('touch-me');
Touchy(touchMe, { one: ..., two: ... });

// This is equivalent to the following jQuery code:
$('#touch-me').touchy({ one: ..., two: ... });
```
