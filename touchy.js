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

	/* Make sure I can map arrays */
	if ( !Array.prototype.map ) {
		Array.prototype.map = function (callback, self) {
			var len = this.length,
				arr = new Array(len);

			for (var i=0; i<len; i++) {
				if (i in this) {
					arr[i] = callback.call(self, this[i], i, this);
				}
			}

			return arr;
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



	/* Object to manage a single-finger interactions */
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
		// Finger.prototype[eventName + 'Event'] = function (x, y, time) {
		Finger.prototype[eventName + 'Event'] = function (touch) {
			this.points.push(touch);
			this.trigger(eventName);
		};
	}
	fingerEvent('start');
	fingerEvent('move');
	fingerEvent('end');



	/* Object to manage multiple-finger interactions */
	function MultiFinger (ids) {
		this.fingers = ids.map(function (id) {
			return new Finger(id);
		});

		this.callbacks = {
			'start': [],
			'move' : [],
			'end'  : []
		};
	}

	/* Check if finger-id is associated with multi-finger interaction */
	MultiFinger.prototype.has = function (id) {
		var found = false;

		this.fingers.forEach(function (finger) {
			if (finger.id == id) {
				found = true;
			}
		});

		return found;
	};

	/* Bind event listeners to finger movements */
	MultiFinger.prototype.on = function (name, callback) {
		this.callbacks[name].push(callback);
	}

	/* Trigger finger movement event */
	MultiFinger.prototype.trigger = function (name) {
		var that = this,
			points = that.fingers.map(function (finger) {
				return finger.points[ finger.points.length - 1 ];
			});

		this.callbacks[name].forEach(function (callback) {
			callback.call(that, points);
		});
	}

	/* Construct generic finger movement event trigger */
	function multiFingerEvent (eventName) {
		MultiFinger.prototype[eventName + 'Event'] = function (touches) {
			var self = this;

			touches.forEach(function (touch) {
				self.fingers.forEach(function (finger) {
					if (finger.id == touch.id) {
						finger[eventName + 'Event'](touch);
					}
				});
			});

			this.trigger(eventName);
		};
	}
	multiFingerEvent('start');
	multiFingerEvent('move');
	multiFingerEvent('end');



	/* Convert DOM touch event object to simple dictionary style object */
	function domTouchToObj (touches, time) {
		return Array.prototype.map.call(touches, function (touch) {
			return {
				id: touch.identifier,
				x: touch.pageX,
				y: touch.pageY,
				time: time
			};
		});
	}


	/* Socket-style finger management for touch events */
	function Touchy (elem, func) {
		var fingers = {},
			touchWindow = new TouchWindow();

		bind(elem, 'touchstart', touchstart);
		bind(elem, 'touchmove' , touchmove );
		bind(elem, 'touchend'  , touchend  );

		/* Register finger and start listening for movement */
		function touchstart (e) {
			domTouchToObj(e.touches, e.timeStamp).forEach(function (touch) {
				if ( fingers[ touch.id ] ) {
					// Identifier is already registered
					return;
				}

				var finger = new Finger( touch.id );
				fingers[ touch.id ] = finger;
				touchWindow.add(finger);

				func(finger, touchWindow);

				finger.startEvent(touch);
			});
		}

		/* Register finger movement */
		function touchmove (e) {
			domTouchToObj(e.touches, e.timeStamp).forEach(function (touch) {
				if ( ! fingers[ touch.id ] ) {
					// Identifier is not registered
					return;
				}

				var finger = fingers[ touch.id ];

				finger.moveEvent(touch);
			});
		}

		/* Register finger release and end of input */
		function touchend (e) {
			domTouchToObj(e.changedTouches, e.timeStamp).forEach(function (touch) {
				if ( ! fingers[ touch.id ] ) {
					// Identifier is not registered
					return;
				}

				var finger = fingers[ touch.id ];
				touchWindow.remove(finger);

				finger.endEvent(touch);
			});
		}
	}



	/* Socket-style finger management for multi-touch events */
	Touchy.multi = function (elem, settings) {
		var fingers,
			count = 0;

		bind(elem, 'touchstart', touchstart);
		bind(elem, 'touchmove' , touchmove );
		bind(elem, 'touchend'  , touchend  );

		function touchstart (e) {
			updateFingers(e, false);
		}

		function touchmove (e) {
			updateFingers(e, false);
		}

		function touchend (e) {
			updateFingers(e, true);
		}

		function updateFingers (e, end) {
			var touches = domTouchToObj(
					e[end ? 'changedTouches' : 'touches'],
					e.timeStamp
				),
				newCount = touches.length,
				hasNewFingers = newCount != count;

			// Check for new fingers
			if ( !hasNewFingers ) {
				touches.forEach(function (touch) {
					if ( !fingers.has(touch.id) ) {
						hasNewFingers = true;
					}
				});
			}

			// Trigger move event for fingers
			if ( !hasNewFingers ) {
				fingers.moveEvent(touches);
			}

			// Trigger end event for old fingers and destroy handler
			if (fingers && (hasNewFingers || end)) {
				var endTouches = touches;

				if ( !end ) {
					endTouches = fingers.fingers.map(function (finger) {
						return finger.points[ finger.points.length - 1 ];
					});
				}

				fingers.endEvent(touches);
				fingers = null;
				count = 0;
			}

			// Create new finger handler and trigger start
			if (hasNewFingers) {
				fingers = new MultiFinger(
					touches.map(function (touch) {
						return touch.id;
					})
				);
				count = newCount;

				var func = settings[ {
					1: 'one',
					2: 'two',
					3: 'three',
					4: 'four',
					5: 'five'
				}[count] ]
				func && func(fingers);

				fingers.startEvent(touches);
			}
		}
	};



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
