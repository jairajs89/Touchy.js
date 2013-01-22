/*
	Touchy.js
	Socket-style finger management for touch events

	Jairaj Sethi
	http://creativecommons.org/licenses/by/3.0/
*/



(function (window, document, clik, Zepto, jQuery) {
	window = window || {};



	/* Make sure I can itereate through arrays */
	var forEach = function () {
		if (Array.prototype.forEach) {
			return function (arr, callback, self) {
				Array.prototype.forEach.call(arr, callback, self);
			};
		}

		else {
			return function (arr, callback, self) {
				for (var i=0, len=arr.length; i<len; i++) {
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

	/* Make sure I can filter arrays */
	var filter = function () {
		if (Array.prototype.filter) {
			return function (arr, func, self) {
				return Array.prototype.filter.call(arr, func, self);
			};
		}

		else {
			return function (arr, func, self) {
				var filterArr = [];

				for (var val, i=0, len=arr.length; i<len; i++) {
					val = arr[i];

					if ((i in arr) && func.call(self, val, i, arr)) {
						filterArr.push(val);
					}
				}

				return filterArr;
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
				if ((boundEvents[eID].name === eventName) &&
						(boundEvents[eID].callback === callback)) {
					elem.detachEvent(eID);
					delete boundEvents[eID];
				}
			}
		}
	}

	/* Simple inheritance */
	function inheritsFrom (func, parent) {
		var proto = func.prototype,
			superProto = parent.prototype,
			oldSuper;

		for (var prop in superProto) {
			proto[prop] = superProto[prop];
		}

		function superMethod (name) {
			var args = Array.prototype.slice.call(arguments, 1);

			if ( superProto[name] ) {
				return superProto[name].apply(this, args);
			}
		}

		if (proto._super) {
			oldSuper = proto._super;

			proto._super = function () {
				oldSuper.call(this, arguments);
				superMethod.call(this, arguments);
			};
		}

		else {
			proto._super = superMethod;
		}
	}



	/* Event bus to handle finger event listeners */
	function EventBus () {
		this.onEvents = {};
		this.onceEvents = {};
	}

	/* Attach a handler to listen for an event */
	EventBus.prototype.on = function (name, callback) {
		if ( !callback ) {
			return;
		}

		if (name in this.onEvents) {
			var index = indexOf(this.onEvents[name], callback);

			if (index != -1) {
				return;
			}
		}

		else {
			this.onEvents[name] = [];
		}

		if (name in this.onceEvents) {
			var index = indexOf(this.onceEvents[name], callback);

			if (index != -1) {
				this.onceEvents.splice(index, 1);
			}
		}

		this.onEvents[name].push(callback);
	};

	/* Attach a one-time-use handler to listen for an event */
	EventBus.prototype.once = function (name, callback) {
		if ( !callback ) {
			return;
		}

		if (name in this.onceEvents) {
			var index = indexOf(this.onceEvents[name], callback);

			if (index != -1) {
				return;
			}
		}

		else {
			this.onceEvents[name] = [];
		}

		if (name in this.onEvents) {
			var index = indexOf(this.onEvents[name], callback);

			if (index != -1) {
				this.onEvents.splice(index, 1);
			}
		}

		this.onceEvents[name].push(callback);
	};

	/* Detach a handler from listening for an event */
	EventBus.prototype.off = function (name, callback) {
		if ( !callback ) {
			return;
		}

		if (name in this.onEvents) {
			var index = indexOf(this.onEvents[name], callback);

			if (index != -1) {
				this.onEvents.splice(index, 1);
				return;
			}
		}

		if (name in this.onceEvents) {
			var index = indexOf(this.onceEvents[name], callback);

			if (index != -1) {
				this.onceEvents.splice(index, 1);
				return;
			}
		}
	};

	/* Fire an event, triggering all handlers */
	EventBus.prototype.trigger = function (name) {
		var args = Array.prototype.slice.call(arguments, 1),
			callbacks = (this.onEvents[name] || []).concat(this.onceEvents[name] || []),
			callback;

		while (callback = callbacks.shift()) {
			callback.apply(this, args);
		}
	};



	/* Object to manage a single-finger interactions */
	function Finger (id) {
		this._super('constructor');
		this.id        = id;
		this.lastPoint = null;
	}
	inheritsFrom(Finger, EventBus);



	/* Object to manage multiple-finger interactions */
	function Hand (ids) {
		this._super('constructor');

		this.fingers = !ids ? [] : map(ids, function (id) {
			return new Finger(id);
		});
	}
	inheritsFrom(Hand, EventBus);

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

	function domMouseToObj (mouseEvent, mouseID) {
		return [{
			id: mouseID,
			x: mouseEvent.pageX,
			y: mouseEvent.pageY,
			time: mouseEvent.timeStamp
		}];
	}



	/* Controller object to handle Touchy interactions on an element */
	function TouchController (elem, handleMouse, settings) {
		if (typeof settings == 'undefined') {
			settings = handleMouse;
			handleMouse = false;
		}

		if (typeof settings == 'function') {
			settings = { any: settings };
		}

		for (var name in plugins) {
			if (name in settings) {
				var updates = plugins[name](elem, settings[name]);

				if (typeof updates == 'function') {
					updates = { any: updates };
				}

				for (var handlerType in updates) {
					if (handlerType in settings) {
						settings[handlerType] = (function (handler1, handler2) {
							return function () {
								handler1.call(this, arguments);
								handler2.call(this, arguments);
							};
						})(settings[handlerType], updates[handlerType]);
					}

					else {
						settings[handlerType] = updates[handlerType];
					}
				}
			}
		}

		this.running = false;
		this.elem = elem;
		this.handleMouse = !!handleMouse;
		this.settings = settings || {};
		this.mainHand = new Hand();
		this.multiHand = null;
		this.mouseID = null;

		this.start();
	};

	/* Start watching element for touch events */
	TouchController.prototype.start = function () {
		if (this.running) {
			return;
		}
		this.running = true;

		bind(this.elem, 'touchstart' , this.touchstart());
		bind(this.elem, 'touchmove'  , this.touchmove() );
		bind(this.elem, 'touchcancel', this.touchend()  );
		bind(this.elem, 'touchend'   , this.touchend()  );

		if ( this.handleMouse ) {
			bind(this.elem, 'mousedown', this.mousedown());
			bind(this.elem, 'mouseup'  , this.mouseup()  );
			bind(this.elem, 'mouseout' , this.mouseup()  );
			bind(this.elem, 'mousemove', this.mousemove());
		}
	};

	/* Stop watching element for touch events */
	TouchController.prototype.stop = function () {
		if ( !this.running ) {
			return;
		}
		this.running = false;

		unbind(this.elem, 'touchstart' , this.touchstart());
		unbind(this.elem, 'touchmove'  , this.touchmove() );
		unbind(this.elem, 'touchend'   , this.touchend()  );
		unbind(this.elem, 'touchcancel', this.touchend()  );

		unbind(this.elem, 'mousedown', this.mousedown());
		unbind(this.elem, 'mouseup'  , this.mouseup()  );
		unbind(this.elem, 'mouseout' , this.mouseup()  );
		unbind(this.elem, 'mousemove', this.mousemove());
	};

	/* Return a handler for DOM touchstart event */
	TouchController.prototype.touchstart = function () {
		if ( !this._touchstart ) {
			var self = this;
			this._touchstart = function (e) {
				var touches = domTouchToObj(e.touches, e.timeStamp),
					changedTouches = domTouchToObj(e.changedTouches, e.timeStamp);

				self.mainHandStart(changedTouches);
				self.multiHandStart(changedTouches, touches);
			};
		}

		return this._touchstart;
	};

	/* Return a handler for DOM touchmove event */
	TouchController.prototype.touchmove = function () {
		if ( !this._touchmove ) {
			var self = this;
			this._touchmove = function (e) {
				var touches = domTouchToObj(e.touches, e.timeStamp),
					changedTouches = domTouchToObj(e.changedTouches, e.timeStamp);

				self.mainHandMove(changedTouches);
				self.multiHandMove(changedTouches, touches);
			};
		}

		return this._touchmove;
	};

	/* Return a handler for DOM touchend event */
	TouchController.prototype.touchend = function () {
		if ( !this._touchend ) {
			var self = this;
			this._touchend = function (e) {
				var touches = domTouchToObj(e.touches, e.timeStamp),
					changedTouches = domTouchToObj(e.changedTouches, e.timeStamp);

				self.mainHandEnd(changedTouches);
				self.multiHandEnd(changedTouches, touches);
			};
		}

		return this._touchend;
	};

	/* Return a handler for DOM mousedown event */
	TouchController.prototype.mousedown = function () {
		if ( !this._mousedown ) {
			var self = this;
			this._mousedown = function (e) {
				var touches;

				if ( self.mouseID ) {
					touches = domMouseToObj(e, self.mouseID);
					self.mainHandEnd(touches);
					self.multiHandEnd(touches, touches);
					self.mouseID = null;
				}

				self.mouseID = Math.random() + '';

				touches = domMouseToObj(e, self.mouseID);
				self.mainHandStart(touches);
				self.multiHandStart(touches, touches);
			};
		}

		return this._mousedown;
	};

	/* Return a handler for DOM mouseup event */
	TouchController.prototype.mouseup = function () {
		if ( !this._mouseup ) {
			var self = this;
			this._mouseup = function (e) {
				if (e.type === 'mouseout') {
					var elem = e.relatedTarget || e.toElement;
					while (elem) {
						if (elem === self.elem) {
							return;
						}
						elem = elem.parentNode;
					}
				}

				var touches;

				if ( self.mouseID ) {
					touches = domMouseToObj(e, self.mouseID);
					self.mainHandEnd(touches);
					self.multiHandEnd(touches, touches);
					self.mouseID = null;
				}
			};
		}

		return this._mouseup;
	};

	/* Return a handler for DOM mousemove event */
	TouchController.prototype.mousemove = function () {
		if ( !this._mousemove ) {
			var self = this;
			this._mousemove = function (e) {
				var touches;

				if ( self.mouseID ) {
					touches = domMouseToObj(e, self.mouseID);
					self.mainHandMove(touches);
					self.multiHandMove(touches, touches);
				}
			};
		}

		return this._mousemove;
	};

	/* Handle the start of an individual finger interaction */
	TouchController.prototype.mainHandStart = function (changedTouches) {
		var self = this,
			newFingers = [];

		forEach(changedTouches, function (touch) {
			var finger = new Finger(touch.id);
			finger.lastPoint = touch;
			newFingers.push([ finger, touch ]);
			self.mainHand.fingers.push(finger);
		});

		forEach(newFingers, function (data) {
			self.settings.any && self.settings.any.call(self, self.mainHand, data[0]);
			data[0].trigger('start', data[1]);
		});

		self.mainHand.trigger('start', changedTouches);
	};

	/* Handle the movement of an individual finger interaction */
	TouchController.prototype.mainHandMove = function (changedTouches) {
		var self = this,
			movedFingers = [];

		forEach(changedTouches, function (touch) {
			var finger = self.mainHand.get(touch.id);

			if ( !finger ) {
				return;
			}

			finger.lastPoint = touch;
			movedFingers.push([ finger, touch ]);
		});

		forEach(movedFingers, function (data) {
			data[0].trigger('move', data[1]);
		});

		self.mainHand.trigger('move', changedTouches);
	};

	/* Handle the end of an individual finger interaction */
	TouchController.prototype.mainHandEnd = function (changedTouches) {
		var self = this,
			endFingers = [];

		forEach(changedTouches, function (touch) {
			var finger = self.mainHand.get(touch.id),
				index;

			if ( !finger ) {
				return;
			}

			finger.lastPoint = touch;
			endFingers.push([ finger, touch ]);

			index = indexOf(self.mainHand.fingers, finger);
			self.mainHand.fingers.splice(index, 1);
		});

		forEach(endFingers, function (data) {
			data[0].trigger('end', data[1]);
		});

		self.mainHand.trigger('end', changedTouches);
	};

	/* Handle the start of a multi-touch interaction */
	TouchController.prototype.multiHandStart = function (changedTouches, touches) {
		this.multiHandDestroy();
		this.multiHandRestart(touches);
	};

	/* Handle the movement of a multi-touch interaction */
	TouchController.prototype.multiHandMove = function (changedTouches, touches) {
		var self = this,
			movedFingers = [];

		forEach(changedTouches, function (touch) {
			var finger = self.multiHand.get(touch.id);

			if( !finger ) {
				return;
			}

			finger.lastPoint = touch;
			movedFingers.push([ finger, touch ]);
		});

		forEach(movedFingers, function (data) {
			data[0].trigger('move', data[1]);
		});

		self.multiHand.trigger('move', changedTouches);
	};

	/* Handle the end of a multi-touch interaction */
	TouchController.prototype.multiHandEnd = function (changedTouches, touches) {
		this.multiHandDestroy();

		var remainingTouches = filter(touches, function (touch) {
			var unChanged = true;

			forEach(changedTouches, function (changedTouch) {
				if (changedTouch.id == touch.id) {
					unChanged = false;
				}
			});

			return unChanged;
		});

		this.multiHandRestart(remainingTouches);
	};

	/* Create a new hand based on the current touches on the screen */
	TouchController.prototype.multiHandRestart = function (touches) {
		var self = this;

		if (touches.length == 0) {
			return;
		}

		self.multiHand = new Hand();
		var newFingers = [];

		forEach(touches, function (touch) {
			var finger = new Finger(touch.id);

			finger.lastPoint = touch;
			newFingers.push([ finger, touch ]);
			self.multiHand.fingers.push(finger);
		});

		var func = self.settings[ {
			1: 'one',
			2: 'two',
			3: 'three',
			4: 'four',
			5: 'five'
		}[ self.multiHand.fingers.length ] ];

		func && func.apply(self, [ self.multiHand ].concat( self.multiHand.fingers ));

		forEach(newFingers, function (data) {
			data[0].trigger('start', data[1]);
		});

		self.multiHand.trigger('start', touches);
	};

	/* Destroy the current hand regardless of fingers on the screen */
	TouchController.prototype.multiHandDestroy = function () {
		if ( !this.multiHand ) {
			return;
		}

		var points = [];

		forEach(this.multiHand.fingers, function (finger) {
			var point = finger.lastPoint;
			points.push(point);
			finger.trigger('end', point);
		});

		this.multiHand.trigger('end', points);

		this.multiHand = null;
	};

	/* Socket-style finger management for multi-touch events */
	function Touchy (elem, handleMouse, settings) {
		return new TouchController(elem, handleMouse, settings);
	}

	/* Plugin support for custom touch handling */
	var plugins = {};
	Touchy.plugin = function (name, callback) {
		if (name in plugins) {
			throw 'Touchy: ' + name + ' plugin already defined';
		}

		plugins[name] = callback;
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

	if (clik) {
		clik.plugin('touchy', function () {
			Touchy.apply(window, arguments);
		});
	}

	if (Zepto) {
		Zepto.extend(Zepto.fn, {
			touchy : function () {
				var args = Array.prototype.slice.call(arguments);

				this.forEach(function (elem) {
					var thisArgs = args.slice();
					thisArgs.unshift(this);
					Touchy.apply(window, thisArgs);
				});
				return this;
			}
		});
	}

	if (jQuery) {
		jQuery.fn.touchy = function () {
			var args = Array.prototype.slice.call(arguments);

			this.each(function () {
				var thisArgs = args.slice();
				thisArgs.unshift(this);
				Touchy.apply(window, thisArgs);
			});
		};
	}
})(window, document, window.clik, window.Zepto, window.jQuery);
