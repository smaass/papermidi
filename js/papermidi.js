var numBalls = 10;
var minNote = 21;
var maxNote = 92;
var minRadius = 20;
var maxRadius = 60;

var sqrtMinN = Math.sqrt(minNote);
var sqrtDiff = Math.sqrt(maxNote) - Math.sqrt(minNote);

function randInt(min, max) {
    return min + Math.floor(Math.random()*(max - min + 1));
}

function Ball(id, n, p, v) {
	this.id = id;
	this.note = n;
	this.radius = (1 - ((Math.sqrt(n) - sqrtMinN) / sqrtDiff)) * (maxRadius - minRadius) + minRadius;
	this.point = p;
	this.vector = v;
	this.maxVec = 15;
	this.numSegment = Math.floor(this.radius / 3 + 2);
	this.boundOffset = [];
	this.boundOffsetBuff = [];
	this.sidePoints = [];
	this.collidingWith = [];
	this.path = new Path({
		fillColor: {
			hue: Math.random() * 360,
			saturation: 1,
			brightness: 1
		},
		blendMode: 'screen'
	});

	for (var i = 0; i < this.numSegment; i ++) {
		this.boundOffset.push(this.radius);
		this.boundOffsetBuff.push(this.radius);
		this.path.add(new Point());
		this.sidePoints.push(new Point({
			angle: 360 / this.numSegment * i,
			length: 1
		}));
	}

	for (var i = 0; i < this.numSegment; i++) {
		this.collidingWith.push(false);
	}
}

Ball.prototype = {
	iterate: function() {
		this.checkBorders();
		if (this.vector.length > this.maxVec)
			this.vector.length = this.maxVec;
		this.point = this.point.add(this.vector);
		this.updateShape();
	},

	checkBorders: function() {
		var size = view.size;
		if (this.point.x < -this.radius)
			this.point.x = size.width + this.radius;
		if (this.point.x > size.width + this.radius)
			this.point.x = -this.radius;
		if (this.point.y < -this.radius)
			this.point.y = size.height + this.radius;
		if (this.point.y > size.height + this.radius)
			this.point.y = -this.radius;
	},

	updateShape: function() {
		var segments = this.path.segments;
		for (var i = 0; i < this.numSegment; i ++)
			segments[i].point = this.getSidePoint(i);

		this.path.smooth();
		for (var i = 0; i < this.numSegment; i ++) {
			if (this.boundOffset[i] < this.radius / 4)
				this.boundOffset[i] = this.radius / 4;
			var next = (i + 1) % this.numSegment;
			var prev = (i > 0) ? i - 1 : this.numSegment - 1;
			var offset = this.boundOffset[i];
			offset += (this.radius - offset) / 15;
			offset += ((this.boundOffset[next] + this.boundOffset[prev]) / 2 - offset) / 3;
			this.boundOffsetBuff[i] = this.boundOffset[i] = offset;
		}
	},

	react: function(b) {
		var dist = this.point.getDistance(b.point);
		if (dist < this.radius + b.radius && dist != 0) {
			var overlap = this.radius + b.radius - dist;
			var direc = (this.point.subtract(b.point)).normalize(overlap * 0.015);
			this.vector = this.vector.add(direc);
			b.vector = b.vector.subtract(direc);

			this.calcBounds(b);
			b.calcBounds(this);
			this.updateBounds();
			b.updateBounds();

			if (!this.collidingWith[b.id]) {
				this.playNote();
				b.playNote();
				this.collidingWith[b.id] = true;
				b.collidingWith[this.id] = true;
			}
		}
		else {
			this.collidingWith[b.id] = false;
			b.collidingWith[this.id] = false;
		}
	},

	playNote: function() {
		MIDI.noteOn(0, this.note, 127, 0);
	},

	getBoundOffset: function(b) {
		var diff = this.point.subtract(b);
		var angle = (diff.angle + 180) % 360;
		return this.boundOffset[Math.floor(angle / 360 * this.boundOffset.length)];
	},

	calcBounds: function(b) {
		for (var i = 0; i < this.numSegment; i ++) {
			var tp = this.getSidePoint(i);
			var bLen = b.getBoundOffset(tp);
			var td = tp.getDistance(b.point);
			if (td < bLen) {
				this.boundOffsetBuff[i] -= (bLen  - td) / 2;
			}
		}
	},

	getSidePoint: function(index) {
		//return this.point + this.sidePoints[index] * this.boundOffset[index];
		return this.point.add(this.sidePoints[index].multiply(this.boundOffset[index]));
	},

	updateBounds: function() {
		for (var i = 0; i < this.numSegment; i ++)
			this.boundOffset[i] = this.boundOffsetBuff[i];
	}
};

var selectedScale;

var Scale = function(name, shape) {
    this.name = name;
    this.shape = shape;
    this.isSelected = function () {
    	return this == selectedScale;
    }
};

var modes = [
	new Scale("Ionian", [0, 2, 4, 5, 7, 9, 11]),
	new Scale("Dorian", [0, 2, 3, 5, 7, 9, 10]),
	new Scale("Phrygian", [0, 1, 3, 5, 7, 8, 10]),
	new Scale("Lydian", [0, 2, 4, 6, 7, 9, 11]),
	new Scale("Mixolydian", [0, 2, 4, 5, 7, 9, 10]),
	new Scale("Aeolian", [0, 2, 3, 5, 7, 8, 10]),
	new Scale("Locrian", [0, 1, 3, 5, 6, 8, 10])
];

var randomScale =  function() {
	selectedScale = modes[ Math.floor(modes.length * Math.random()) ];
	return generateScale(selectedScale.shape);
}

var generateScale = function (scaleShape) {
	var base = Math.floor(Math.random() * 12) + 21;
	var scale = [].concat.apply([], scaleShape.map(function(n) {
		var f = n + base;
		return [f, f+12, f+24, f+36, f+48, f+60];
	}));
	return scale;
}

var scale = randomScale();
var balls = [];

var addBalls = function () {
	for (var i = 0; i < numBalls; i++) {
		var position = Point.random().multiply(view.size);
		var vector = new Point({
			angle: 360 * Math.random(),
			length: Math.random() * 10
		});
		var note = scale[ Math.floor(scale.length * Math.random()) ];
		balls.push(new Ball(i, note, position, vector));
	}
}

paper.install(window);

window.onload = function() {

	var viewModel = {
	    modes: ko.observableArray(modes)
	};
	ko.applyBindings(viewModel);

	MIDI.loader = new widgets.Loader("Loading...");

    MIDI.loadPlugin({
        soundfontUrl: "./soundfont/",
        instruments: [ "acoustic_grand_piano" ],
        callback: function () {
            MIDI.programChange(0, 0); // Grand piano
            paper.setup('myCanvas');
            addBalls();

			view.onFrame = function() {
				for (var i = 0; i < balls.length - 1; i++) {
					for (var j = i + 1; j < balls.length; j++) {
						balls[i].react(balls[j]);
					}
				}
				for (var i = 0, l = balls.length; i < l; i++) {
					balls[i].iterate();
				}
			}

			view.draw();
			MIDI.loader.stop();
        }
    });

    $('#button-go').click(function () {
    	var scaleIndex = $('#modes select option:selected').data('id');
    	scale = generateScale(modes[scaleIndex].shape);

    	for (var i = 0; i < balls.length; i++) {
    		balls[i].path.remove();
    	}
    	balls = [];
    	addBalls();
	});
}