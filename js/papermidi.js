var numBalls = 5;

function randInt(min, max) {
    return min + Math.floor(Math.random()*(max - min + 1));
}

function Ball(id, r, p, v) {
	this.id = id;
	this.note = randInt(40,80);
	this.radius = r;
	this.point = p;
	this.vector = v;
	this.maxVec = 15;
	this.numSegment = Math.floor(r / 3 + 2);
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

var balls = [];

paper.install(window);

window.onload = function() {

    MIDI.loadPlugin({
        soundfontUrl: "./soundfont/",
        instruments: [ "acoustic_grand_piano", "synth_drum" ],
        callback: function () {
            MIDI.programChange(0, 0); // Grand piano
            paper.setup('myCanvas');

			for (var i = 0; i < numBalls; i++) {
				var position = Point.random().multiply(view.size);
				var vector = new Point({
					angle: 360 * Math.random(),
					length: Math.random() * 10
				});
				var radius = Math.random() * 60 + 60;
				balls.push(new Ball(i, radius, position, vector));
			}

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
        }
    });
}