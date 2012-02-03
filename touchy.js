/*
	Touchy.js
	Socket-style finger management for touch events

	Jairaj Sethi
*/



(function () {
	/* Make sure I can itereate through arrays */
	if ( !Array.prototype.forEach ) {
		Array.prototype.forEach = function (callback, self) {
			for (var i=0, l=this.length; i<l; i++) {
				if (i in this) {
					callback.call(self, this[i], i, this);
				}
			}
		};
	}

	/* Make sure I can search through arrays */
	if ( !Array.prototype.indexOf ) {
		Array.prototype.indexOf = function (item, startIndex) {
			for (var i=startIndex || 0, len=this.length; i<len; i++) {
				if ((i in this) && (this[i] === item)) {
					return i;
				}
			}

			return -1;
		};
	}

	/* Bind event listener to element */
	var boundEvents = {};

	function bind (elem, eventName, callback) {
		if (elem.addEventListener) {
			elem.addEventListener(eventName, callback, false);
		}

		else if (elem.attachEvent) {
			var eID = elem.attachEvent('on'+eventName, callback);
			boundEvents[eID] = { name: eventName, callback: callback };
		}
	}

	function unbind (elem, eventName, callback) {
		if (elem.removeEventListener) {
			elem.removeEventListener(eventName, callback, false);
		}

		else if (elem.detachEvent) {
			for (var eID in boundEvents) {
				if ((boundEvents[eID].name === eventName)
						&& (boundEvents[eID].callback === callback)) {
					elem.detachEvent(eID);
					delete boundEvents[eID];
				}
			}
		}
	}



	/* Simple object to hold all current touch interaction on an element */
	function TouchWindow () {
		this.fingers = [];
	}

	/* Returns the number of fingers touching the element */
	TouchWindow.prototype.count = function () {
		return this.fingers.length;
	};

	/* New finger touching the element */
	TouchWindow.prototype.add = function (finger) {
		var index = this.fingers.indexOf(finger);

		if (index == -1)
			this.fingers.push(finger);
	};

	/* Finger no longer touching the element */
	TouchWindow.prototype.remove = function (finger) {
		var index = this.fingers.indexOf(finger);

		if (index != -1)
			this.fingers.splice(index, 1);
	};



	/* Object to manage a single finger interaction */
	function Finger (id) {
		this.id        = id;
		this.points    = [];
		this.callbacks = {
			'start': [],
			'move' : [],
			'end'  : []
		};
	}

	/* Bind event listeners to finger movements */
	Finger.prototype.on = function (name, callback) {
		this.callbacks[name].push(callback);
	};

	/* Trigger finger movement event */
	Finger.prototype.trigger = function (name) {
		var that = this,
			point = that.points[ that.points.length - 1 ];

		this.callbacks[name].forEach(function (callback) {
			callback.call(that, point);
		});
	};

	/* Construct generic finger movement event trigger */
	function fingerEvent (eventName) {
		return function (x, y, time) {
			this.points.push({ x: x, y: y, time: time });
			this.trigger(eventName);
		};
	}
	Finger.prototype.startEvent = fingerEvent('start');
	Finger.prototype.moveEvent = fingerEvent('move');
	Finger.prototype.endEvent = fingerEvent('end');



	/* Socket-style finger management for touch events */
	function Touchy (elem, func) {
		var fingers = {},
			touchWindow = new TouchWindow();

		bind(elem, 'touchstart', touchstart);
		bind(elem, 'touchmove' , touchmove );
		bind(elem, 'touchend'  , touchend  );

		/* Register finger and start listening for movement */
		function touchstart (e) {
			Array.prototype.forEach.call(e.touches, function (touch) {
				if ( fingers[ touch.identifier ] ) {
					// Identifier is already registered
					return;
				}

				var finger = new Finger( touch.identifier );
				fingers[ touch.identifier ] = finger;
				touchWindow.add(finger);

				func(finger, touchWindow);

				finger.startEvent(touch.pageX, touch.pageY, e.timeStamp);
			});
		}

		/* Register finger movement */
		function touchmove (e) {
			Array.prototype.forEach.call(e.touches, function (touch) {
				if ( ! fingers[ touch.identifier ] ) {
					// Identifier is not registered
					return;
				}

				var finger = fingers[ touch.identifier ];

				finger.moveEvent(touch.pageX, touch.pageY, e.timeStamp);
			});
		}

		/* Register finger release and end of input */
		function touchend (e) {
			Array.prototype.forEach.call(e.changedTouches, function (touch) {
				if ( ! fingers[ touch.identifier ] ) {
					// Identifier is not registered
					return;
				}

				var finger = fingers[ touch.identifier ];
				touchWindow.remove(finger);

				finger.endEvent(touch.pageX, touch.pageY, e.timeStamp);
			});
		}
	}



	/* Prevent window movement (iOS fix) */
	var preventDefault = function (e) { e.preventDefault() };

	Touchy.stopWindowBounce = function () {
		bind(window, 'touchmove', preventDefault);
	};

	Touchy.startWindowBounce = function () {
		unbind(window, 'touchmove', preventDefault);
	};



	/* Publicise object */
	window.Touchy = Touchy;
})();
