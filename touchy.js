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
	function Hand (ids) {
		this.fingers = !ids ? [] : ids.map(function (id) {
			return new Finger(id);
		});

		this.callbacks = {
			'start': [],
			'move' : [],
			'end'  : []
		};
	}

	/* Add an active finger to the hand */
	Hand.prototype.add = function (finger) {
		var index = this.fingers.indexOf(finger);

		if (index == -1) {
			this.fingers.push(finger);
		}
	};

	/* Remove an inactive finger from the hand */
	Hand.prototype.remove = function (finger) {
		var index = this.fingers.indexOf(finger);

		if (index != -1) {
			this.fingers.splice(index, 1);
		}
	};

	/* Return the number of active fingers */
	Hand.prototype.count = function () {
		return this.fingers.length;
	};

	/* Check if finger-id is associated with multi-finger interaction */
	Hand.prototype.has = function (id) {
		var found = false;

		this.fingers.forEach(function (finger) {
			if (finger.id == id) {
				found = true;
			}
		});

		return found;
	};

	/* Bind event listeners to finger movements */
	Hand.prototype.on = function (name, callback) {
		this.callbacks[name].push(callback);
	};

	/* Trigger finger movement event */
	Hand.prototype.trigger = function (name) {
		var that = this,
			points = that.fingers.map(function (finger) {
				return finger.points[ finger.points.length - 1 ];
			});

		this.callbacks[name].forEach(function (callback) {
			callback.call(that, points);
		});
	};

	/* Construct generic finger movement event trigger */
	function handEvent (eventName) {
		Hand.prototype[eventName + 'Event'] = function (touches) {
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
	handEvent('start');
	handEvent('move');
	handEvent('end');



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
			hand = new Hand([]);

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
				hand.add(finger);

				func(hand, finger);

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
				hand.remove(finger);

				finger.endEvent(touch);
			});
		}
	}



	/* Socket-style finger management for multi-touch events */
	Touchy.multi = function (elem, settings) {
		var hand,
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
					if ( !hand.has(touch.id) ) {
						hasNewFingers = true;
					}
				});
			}

			// Trigger move event for fingers
			if ( !hasNewFingers ) {
				hand.moveEvent(touches);
			}

			// Trigger end event for old fingers and destroy handler
			if (hand && (hasNewFingers || end)) {
				var endTouches = touches;

				if ( !end ) {
					endTouches = hand.fingers.map(function (finger) {
						return finger.points[ finger.points.length - 1 ];
					});
				}

				hand.endEvent(touches);
				hand = null;
				count = 0;
			}

			// Create new finger handler and trigger start
			if (hasNewFingers) {
				hand = new Hand(
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
				}[count] ];
				func && func.apply(window, [hand].concat(hand.fingers));

				hand.startEvent(touches);
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
