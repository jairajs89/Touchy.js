/*
	Touchy.js
	Socket-style finger management for touch events

	Jairaj Sethi
*/



(function () {
	/* Make sure I can itereate through arrays */
	var forEach = function () {
		if (Array.prototype.forEach) {
			return function (arr, callback, self) {
				Array.prototype.forEach.call(arr, callback, self);
			};
		}

		else {
			return function (arr, callback, self) {
				for (var i=0, l=arr.length; i<l; i++) {
					if (i in arr) {
						callback.call(self, arr[i], i, arr);
					}
				}
			};
		}
	}();

	/* Make sure I can search through arrays */
	var indexOf = function () {
		if (Array.prototype.indexOf) {
			return function (arr, item, startIndex) {
				return Array.prototype.indexOf.call(arr, item, startIndex);
			};
		}

		else {
			return function (arr, item, startIndex) {
				for (var i=startIndex || 0, len=arr.length; i<len; i++) {
					if ((i in arr) && (arr[i] === item)) {
						return i;
					}
				}

				return -1;
			};
		}
	}();

	/* Make sure I can map arrays */
	var map = function () {
		if (Array.prototype.map) {
			return function (arr, callback, self) {
				return Array.prototype.map.call(arr, callback, self);
			};
		}

		else {
			return function (arr, callback, self) {
				var len = arr.length,
					mapArr = new Array(len);

				for (var i=0; i<len; i++) {
					if (i in arr) {
						mapArr[i] = callback.call(self, arr[i], i, arr);
					}
				}

				return mapArr;
			};
		}
	}();

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

		forEach(this.callbacks[name], function (callback) {
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
		this.fingers = !ids ? [] : map(ids, function (id) {
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
		var index = indexOf(this.fingers, finger);

		if (index == -1) {
			this.fingers.push(finger);
		}
	};

	/* Remove an inactive finger from the hand */
	Hand.prototype.remove = function (finger) {
		var index = indexOf(this.fingers, finger);

		if (index != -1) {
			this.fingers.splice(index, 1);
		}
	};

	/* Return the number of active fingers */
	Hand.prototype.count = function () {
		return this.fingers.length;
	};

	/* Get finger by id */
	Hand.prototype.get = function (id) {
		var foundFinger;

		forEach(this.fingers, function (finger) {
			if (finger.id == id) {
				foundFinger = finger;
			}
		});

		return foundFinger;
	};

	/* Check if finger-id is associated with multi-finger interaction */
	Hand.prototype.has = function (id) {
		var found = false;

		forEach(this.fingers, function (finger) {
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
			points = map(that.fingers, function (finger) {
				return finger.points[ finger.points.length - 1 ];
			});

		forEach(this.callbacks[name], function (callback) {
			callback.call(that, points);
		});
	};

	/* Construct generic finger movement event trigger */
	function handEvent (eventName) {
		Hand.prototype[eventName + 'Event'] = function (touches) {
			var self = this;

			forEach(touches, function (touch) {
				forEach(self.fingers, function (finger) {
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
		return map(touches, function (touch) {
			return {
				id: touch.identifier,
				x: touch.pageX,
				y: touch.pageY,
				time: time
			};
		});
	}


	/* Socket-style finger management for multi-touch events */
	function Touchy (elem, settings) {
		if (typeof settings == 'function') {
			settings = { any: settings };
		}

		var hand,
			mainHand = new Hand(),
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

			// Separate hand management for independent finger eventing
			forEach(touches, function (touch) {
				var finger = mainHand.get(touch.id);

				// End event for finger
				if (end) {
					if ( finger ) {
						finger.endEvent(touch);
						mainHand.remove(finger);
					}
				}

				// Move event for finger
				else if (finger) {
					finger.moveEvent(touch);
				}

				// Start event for finger
				else {
					finger = new Finger( touch.id );
					mainHand.add(finger);

					settings.any && settings.any(mainHand, finger);

					finger.startEvent(touch);
				}
			});

			// Check for new fingers
			if ( !hasNewFingers ) {
				forEach(touches, function (touch) {
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
					endTouches = map(hand.fingers, function (finger) {
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
					map(touches, function (touch) {
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
