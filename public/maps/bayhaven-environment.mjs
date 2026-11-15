// \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n, r, i, a, o, s, c, l, u, d = 1e3, f = 1001, p = 1002, m = 1003, h = 1006, g = 1008, _ = 1009, v = 1015, y = 1023, b = 1028, x = 2300, S = 2301, C = 2302, w = 2303, T = 2400, E = 2401, D = 2402, O = "srgb", k = "srgb-linear", A = "linear", ee = "srgb", te = 7680, ne = 35044, re = 2e3;
function ie(e) {
	for (let t = e.length - 1; t >= 0; --t) if (e[t] >= 65535) return !0;
	return !1;
}
function ae(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
function oe(e) {
	return document.createElementNS("http://www.w3.org/1999/xhtml", e);
}
var se = {};
function ce(...e) {
	let t = "THREE." + e.shift();
	console.log(t, ...e);
}
function le(e) {
	let t = e[0];
	if (typeof t == "string" && t.startsWith("TSL:")) {
		let t = e[1];
		t && t.isStackTrace ? e[0] += " " + t.getLocation() : e[1] = "Stack trace not available. Enable \"THREE.Node.captureStackTrace\" to capture stack traces.";
	}
	return e;
}
function j(...e) {
	e = le(e);
	let t = "THREE." + e.shift();
	{
		let n = e[0];
		n && n.isStackTrace ? console.warn(n.getError(t)) : console.warn(t, ...e);
	}
}
function M(...e) {
	e = le(e);
	let t = "THREE." + e.shift();
	{
		let n = e[0];
		n && n.isStackTrace ? console.error(n.getError(t)) : console.error(t, ...e);
	}
}
function ue(...e) {
	let t = e.join(" ");
	t in se || (se[t] = !0, j(...e));
}
var de = class {
	addEventListener(e, t) {
		this._listeners === void 0 && (this._listeners = {});
		let n = this._listeners;
		n[e] === void 0 && (n[e] = []), n[e].indexOf(t) === -1 && n[e].push(t);
	}
	hasEventListener(e, t) {
		let n = this._listeners;
		return n !== void 0 && n[e] !== void 0 && n[e].indexOf(t) !== -1;
	}
	removeEventListener(e, t) {
		let n = this._listeners;
		if (n === void 0) return;
		let r = n[e];
		if (r !== void 0) {
			let e = r.indexOf(t);
			e !== -1 && r.splice(e, 1);
		}
	}
	dispatchEvent(e) {
		let t = this._listeners;
		if (t === void 0) return;
		let n = t[e.type];
		if (n !== void 0) {
			e.target = this;
			let t = n.slice(0);
			for (let n = 0, r = t.length; n < r; n++) t[n].call(this, e);
			e.target = null;
		}
	}
}, N = /* @__PURE__ */ "00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff".split(".");
function fe() {
	let e = Math.random() * 4294967295 | 0, t = Math.random() * 4294967295 | 0, n = Math.random() * 4294967295 | 0, r = Math.random() * 4294967295 | 0;
	return (N[e & 255] + N[e >> 8 & 255] + N[e >> 16 & 255] + N[e >> 24 & 255] + "-" + N[t & 255] + N[t >> 8 & 255] + "-" + N[t >> 16 & 15 | 64] + N[t >> 24 & 255] + "-" + N[n & 63 | 128] + N[n >> 8 & 255] + "-" + N[n >> 16 & 255] + N[n >> 24 & 255] + N[r & 255] + N[r >> 8 & 255] + N[r >> 16 & 255] + N[r >> 24 & 255]).toLowerCase();
}
function P(e, t, n) {
	return Math.max(t, Math.min(n, e));
}
function pe(e, t) {
	return (e % t + t) % t;
}
function me(e, t, n) {
	return (1 - n) * e + n * t;
}
function he(e) {
	switch (e.constructor) {
		case Uint32Array: return 4294967295;
		case Uint16Array: return 65535;
		case Uint8Array:
		case Uint8ClampedArray: return 255;
		case Int32Array: return 2147483647;
		case Int16Array: return 32767;
		case Int8Array: return 127;
		default: return;
	}
}
function ge(e, t) {
	if (t.constructor === Float32Array) return e;
	let n = he(t);
	if (n === void 0) throw Error("THREE.MathUtils: Invalid component type.");
	return Math.max(e / n, -1);
}
function _e(e, t) {
	if (t.constructor === Float32Array) return e;
	let n = he(t);
	if (n === void 0) throw Error("THREE.MathUtils: Invalid component type.");
	return Math.round(e * n);
}
c = Symbol.iterator;
var F = class {
	constructor(e = 0, t = 0) {
		this.x = e, this.y = t;
	}
	get width() {
		return this.x;
	}
	set width(e) {
		this.x = e;
	}
	get height() {
		return this.y;
	}
	set height(e) {
		this.y = e;
	}
	set(e, t) {
		return this.x = e, this.y = t, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			default: throw Error("THREE.Vector2: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			default: throw Error("THREE.Vector2: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = e.elements;
		return this.x = r[0] * t + r[3] * n + r[6], this.y = r[1] * t + r[4] * n + r[7], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this;
	}
	clamp(e, t) {
		return this.x = P(this.x, e.x, t.x), this.y = P(this.y, e.y, t.y), this;
	}
	clampScalar(e, t) {
		return this.x = P(this.x, e, t), this.y = P(this.y, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(P(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y;
	}
	cross(e) {
		return this.x * e.y - this.y * e.x;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	angle() {
		return Math.atan2(-this.y, -this.x) + Math.PI;
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(P(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y;
		return t * t + n * n;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this;
	}
	rotateAround(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = this.x - e.x, a = this.y - e.y;
		return this.x = i * n - a * r + e.x, this.y = i * r + a * n + e.y, this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this;
	}
	*[c]() {
		yield this.x, yield this.y;
	}
};
n = F, n.prototype.isVector2 = !0;
var ve = class {
	constructor(e = 0, t = 0, n = 0, r = 1) {
		this.isQuaternion = !0, this._x = e, this._y = t, this._z = n, this._w = r;
	}
	static slerpFlat(e, t, n, r, i, a, o) {
		let s = n[r + 0], c = n[r + 1], l = n[r + 2], u = n[r + 3], d = i[a + 0], f = i[a + 1], p = i[a + 2], m = i[a + 3];
		if (u !== m || s !== d || c !== f || l !== p) {
			let e = s * d + c * f + l * p + u * m;
			e < 0 && (d = -d, f = -f, p = -p, m = -m, e = -e);
			let t = 1 - o;
			if (e < .9995) {
				let n = Math.acos(e), r = Math.sin(n);
				t = Math.sin(t * n) / r, o = Math.sin(o * n) / r, s = s * t + d * o, c = c * t + f * o, l = l * t + p * o, u = u * t + m * o;
			} else {
				s = s * t + d * o, c = c * t + f * o, l = l * t + p * o, u = u * t + m * o;
				let e = 1 / Math.sqrt(s * s + c * c + l * l + u * u);
				s *= e, c *= e, l *= e, u *= e;
			}
		}
		e[t] = s, e[t + 1] = c, e[t + 2] = l, e[t + 3] = u;
	}
	static multiplyQuaternionsFlat(e, t, n, r, i, a) {
		let o = n[r], s = n[r + 1], c = n[r + 2], l = n[r + 3], u = i[a], d = i[a + 1], f = i[a + 2], p = i[a + 3];
		return e[t] = o * p + l * u + s * f - c * d, e[t + 1] = s * p + l * d + c * u - o * f, e[t + 2] = c * p + l * f + o * d - s * u, e[t + 3] = l * p - o * u - s * d - c * f, e;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get w() {
		return this._w;
	}
	set w(e) {
		this._w = e, this._onChangeCallback();
	}
	set(e, t, n, r) {
		return this._x = e, this._y = t, this._z = n, this._w = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._w);
	}
	copy(e) {
		return this._x = e.x, this._y = e.y, this._z = e.z, this._w = e.w, this._onChangeCallback(), this;
	}
	setFromEuler(e, t = !0) {
		let n = e._x, r = e._y, i = e._z, a = e._order, o = Math.cos, s = Math.sin, c = o(n / 2), l = o(r / 2), u = o(i / 2), d = s(n / 2), f = s(r / 2), p = s(i / 2);
		switch (a) {
			case "XYZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "YXZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "ZXY":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "ZYX":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "YZX":
				this._x = d * l * u + c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "XZY":
				this._x = d * l * u - c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u + d * f * p;
				break;
			default: j("Quaternion: .setFromEuler() encountered an unknown order: " + a);
		}
		return t === !0 && this._onChangeCallback(), this;
	}
	setFromAxisAngle(e, t) {
		let n = t / 2, r = Math.sin(n);
		return this._x = e.x * r, this._y = e.y * r, this._z = e.z * r, this._w = Math.cos(n), this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e) {
		let t = e.elements, n = t[0], r = t[4], i = t[8], a = t[1], o = t[5], s = t[9], c = t[2], l = t[6], u = t[10], d = n + o + u;
		if (d > 0) {
			let e = .5 / Math.sqrt(d + 1);
			this._w = .25 / e, this._x = (l - s) * e, this._y = (i - c) * e, this._z = (a - r) * e;
		} else if (n > o && n > u) {
			let e = 2 * Math.sqrt(1 + n - o - u);
			this._w = (l - s) / e, this._x = .25 * e, this._y = (r + a) / e, this._z = (i + c) / e;
		} else if (o > u) {
			let e = 2 * Math.sqrt(1 + o - n - u);
			this._w = (i - c) / e, this._x = (r + a) / e, this._y = .25 * e, this._z = (s + l) / e;
		} else {
			let e = 2 * Math.sqrt(1 + u - n - o);
			this._w = (a - r) / e, this._x = (i + c) / e, this._y = (s + l) / e, this._z = .25 * e;
		}
		return this._onChangeCallback(), this;
	}
	setFromUnitVectors(e, t) {
		let n = e.dot(t) + 1;
		return n < 1e-8 ? (n = 0, Math.abs(e.x) > Math.abs(e.z) ? (this._x = -e.y, this._y = e.x, this._z = 0, this._w = n) : (this._x = 0, this._y = -e.z, this._z = e.y, this._w = n)) : (this._x = e.y * t.z - e.z * t.y, this._y = e.z * t.x - e.x * t.z, this._z = e.x * t.y - e.y * t.x, this._w = n), this.normalize();
	}
	angleTo(e) {
		return 2 * Math.acos(Math.abs(P(this.dot(e), -1, 1)));
	}
	rotateTowards(e, t) {
		let n = this.angleTo(e);
		if (n === 0) return this;
		let r = Math.min(1, t / n);
		return this.slerp(e, r), this;
	}
	identity() {
		return this.set(0, 0, 0, 1);
	}
	invert() {
		return this.conjugate();
	}
	conjugate() {
		return this._x *= -1, this._y *= -1, this._z *= -1, this._onChangeCallback(), this;
	}
	dot(e) {
		return this._x * e._x + this._y * e._y + this._z * e._z + this._w * e._w;
	}
	lengthSq() {
		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
	}
	length() {
		return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
	}
	normalize() {
		let e = this.length();
		return e === 0 ? (this._x = 0, this._y = 0, this._z = 0, this._w = 1) : (e = 1 / e, this._x *= e, this._y *= e, this._z *= e, this._w *= e), this._onChangeCallback(), this;
	}
	multiply(e) {
		return this.multiplyQuaternions(this, e);
	}
	premultiply(e) {
		return this.multiplyQuaternions(e, this);
	}
	multiplyQuaternions(e, t) {
		let n = e._x, r = e._y, i = e._z, a = e._w, o = t._x, s = t._y, c = t._z, l = t._w;
		return this._x = n * l + a * o + r * c - i * s, this._y = r * l + a * s + i * o - n * c, this._z = i * l + a * c + n * s - r * o, this._w = a * l - n * o - r * s - i * c, this._onChangeCallback(), this;
	}
	slerp(e, t) {
		let n = e._x, r = e._y, i = e._z, a = e._w, o = this.dot(e);
		o < 0 && (n = -n, r = -r, i = -i, a = -a, o = -o);
		let s = 1 - t;
		if (o < .9995) {
			let e = Math.acos(o), c = Math.sin(e);
			s = Math.sin(s * e) / c, t = Math.sin(t * e) / c, this._x = this._x * s + n * t, this._y = this._y * s + r * t, this._z = this._z * s + i * t, this._w = this._w * s + a * t, this._onChangeCallback();
		} else this._x = this._x * s + n * t, this._y = this._y * s + r * t, this._z = this._z * s + i * t, this._w = this._w * s + a * t, this.normalize();
		return this;
	}
	slerpQuaternions(e, t, n) {
		return this.copy(e).slerp(t, n);
	}
	random() {
		let e = 2 * Math.PI * Math.random(), t = 2 * Math.PI * Math.random(), n = Math.random(), r = Math.sqrt(1 - n), i = Math.sqrt(n);
		return this.set(r * Math.sin(e), r * Math.cos(e), i * Math.sin(t), i * Math.cos(t));
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._w === this._w;
	}
	fromArray(e, t = 0) {
		return this._x = e[t], this._y = e[t + 1], this._z = e[t + 2], this._w = e[t + 3], this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._w, e;
	}
	fromBufferAttribute(e, t) {
		return this._x = e.getX(t), this._y = e.getY(t), this._z = e.getZ(t), this._w = e.getW(t), this._onChangeCallback(), this;
	}
	toJSON() {
		return this.toArray();
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._w;
	}
};
l = Symbol.iterator;
var I = class {
	constructor(e = 0, t = 0, n = 0) {
		this.x = e, this.y = t, this.z = n;
	}
	set(e, t, n) {
		return n === void 0 && (n = this.z), this.x = e, this.y = t, this.z = n, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			default: throw Error("THREE.Vector3: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw Error("THREE.Vector3: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this;
	}
	multiplyVectors(e, t) {
		return this.x = e.x * t.x, this.y = e.y * t.y, this.z = e.z * t.z, this;
	}
	applyEuler(e) {
		return this.applyQuaternion(be.setFromEuler(e));
	}
	applyAxisAngle(e, t) {
		return this.applyQuaternion(be.setFromAxisAngle(e, t));
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[3] * n + i[6] * r, this.y = i[1] * t + i[4] * n + i[7] * r, this.z = i[2] * t + i[5] * n + i[8] * r, this;
	}
	applyNormalMatrix(e) {
		return this.applyMatrix3(e).normalize();
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements, a = 1 / (i[3] * t + i[7] * n + i[11] * r + i[15]);
		return this.x = (i[0] * t + i[4] * n + i[8] * r + i[12]) * a, this.y = (i[1] * t + i[5] * n + i[9] * r + i[13]) * a, this.z = (i[2] * t + i[6] * n + i[10] * r + i[14]) * a, this;
	}
	applyQuaternion(e) {
		let t = this.x, n = this.y, r = this.z, i = e.x, a = e.y, o = e.z, s = e.w, c = 2 * (a * r - o * n), l = 2 * (o * t - i * r), u = 2 * (i * n - a * t);
		return this.x = t + s * c + a * u - o * l, this.y = n + s * l + o * c - i * u, this.z = r + s * u + i * l - a * c, this;
	}
	project(e) {
		return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix);
	}
	unproject(e) {
		return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld);
	}
	transformDirection(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[4] * n + i[8] * r, this.y = i[1] * t + i[5] * n + i[9] * r, this.z = i[2] * t + i[6] * n + i[10] * r, this.normalize();
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this;
	}
	clamp(e, t) {
		return this.x = P(this.x, e.x, t.x), this.y = P(this.y, e.y, t.y), this.z = P(this.z, e.z, t.z), this;
	}
	clampScalar(e, t) {
		return this.x = P(this.x, e, t), this.y = P(this.y, e, t), this.z = P(this.z, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(P(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this;
	}
	cross(e) {
		return this.crossVectors(this, e);
	}
	crossVectors(e, t) {
		let n = e.x, r = e.y, i = e.z, a = t.x, o = t.y, s = t.z;
		return this.x = r * s - i * o, this.y = i * a - n * s, this.z = n * o - r * a, this;
	}
	projectOnVector(e) {
		let t = e.lengthSq();
		if (t === 0) return this.set(0, 0, 0);
		let n = e.dot(this) / t;
		return this.copy(e).multiplyScalar(n);
	}
	projectOnPlane(e) {
		return ye.copy(this).projectOnVector(e), this.sub(ye);
	}
	reflect(e) {
		return this.sub(ye.copy(e).multiplyScalar(2 * this.dot(e)));
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(P(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y, r = this.z - e.z;
		return t * t + n * n + r * r;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y) + Math.abs(this.z - e.z);
	}
	setFromSpherical(e) {
		return this.setFromSphericalCoords(e.radius, e.phi, e.theta);
	}
	setFromSphericalCoords(e, t, n) {
		let r = Math.sin(t) * e;
		return this.x = r * Math.sin(n), this.y = Math.cos(t) * e, this.z = r * Math.cos(n), this;
	}
	setFromCylindrical(e) {
		return this.setFromCylindricalCoords(e.radius, e.theta, e.y);
	}
	setFromCylindricalCoords(e, t, n) {
		return this.x = e * Math.sin(t), this.y = n, this.z = e * Math.cos(t), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this;
	}
	setFromMatrixScale(e) {
		let t = this.setFromMatrixColumn(e, 0).length(), n = this.setFromMatrixColumn(e, 1).length(), r = this.setFromMatrixColumn(e, 2).length();
		return this.x = t, this.y = n, this.z = r, this;
	}
	setFromMatrixColumn(e, t) {
		return this.fromArray(e.elements, t * 4);
	}
	setFromMatrix3Column(e, t) {
		return this.fromArray(e.elements, t * 3);
	}
	setFromEuler(e) {
		return this.x = e._x, this.y = e._y, this.z = e._z, this;
	}
	setFromColor(e) {
		return this.x = e.r, this.y = e.g, this.z = e.b, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this;
	}
	randomDirection() {
		let e = Math.random() * Math.PI * 2, t = Math.random() * 2 - 1, n = Math.sqrt(1 - t * t);
		return this.x = n * Math.cos(e), this.y = t, this.z = n * Math.sin(e), this;
	}
	*[l]() {
		yield this.x, yield this.y, yield this.z;
	}
};
r = I, r.prototype.isVector3 = !0;
var ye = /*@__PURE__*/ new I(), be = /*@__PURE__*/ new ve(), xe = class {
	constructor(e, t, n, r, i, a, o, s, c) {
		this.elements = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r, i, a, o, s, c);
	}
	set(e, t, n, r, i, a, o, s, c) {
		let l = this.elements;
		return l[0] = e, l[1] = r, l[2] = o, l[3] = t, l[4] = i, l[5] = s, l[6] = n, l[7] = a, l[8] = c, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1), this;
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], this;
	}
	extractBasis(e, t, n) {
		return e.setFromMatrix3Column(this, 0), t.setFromMatrix3Column(this, 1), n.setFromMatrix3Column(this, 2), this;
	}
	setFromMatrix4(e) {
		let t = e.elements;
		return this.set(t[0], t[4], t[8], t[1], t[5], t[9], t[2], t[6], t[10]), this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[3], s = n[6], c = n[1], l = n[4], u = n[7], d = n[2], f = n[5], p = n[8], m = r[0], h = r[3], g = r[6], _ = r[1], v = r[4], y = r[7], b = r[2], x = r[5], S = r[8];
		return i[0] = a * m + o * _ + s * b, i[3] = a * h + o * v + s * x, i[6] = a * g + o * y + s * S, i[1] = c * m + l * _ + u * b, i[4] = c * h + l * v + u * x, i[7] = c * g + l * y + u * S, i[2] = d * m + f * _ + p * b, i[5] = d * h + f * v + p * x, i[8] = d * g + f * y + p * S, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[3] *= e, t[6] *= e, t[1] *= e, t[4] *= e, t[7] *= e, t[2] *= e, t[5] *= e, t[8] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8];
		return t * a * l - t * o * c - n * i * l + n * o * s + r * i * c - r * a * s;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = l * a - o * c, d = o * s - l * i, f = c * i - a * s, p = t * u + n * d + r * f;
		if (p === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
		let m = 1 / p;
		return e[0] = u * m, e[1] = (r * c - l * n) * m, e[2] = (o * n - r * a) * m, e[3] = d * m, e[4] = (l * t - r * s) * m, e[5] = (r * i - o * t) * m, e[6] = f * m, e[7] = (n * s - c * t) * m, e[8] = (a * t - n * i) * m, this;
	}
	transpose() {
		let e, t = this.elements;
		return e = t[1], t[1] = t[3], t[3] = e, e = t[2], t[2] = t[6], t[6] = e, e = t[5], t[5] = t[7], t[7] = e, this;
	}
	getNormalMatrix(e) {
		return this.setFromMatrix4(e).invert().transpose();
	}
	transposeIntoArray(e) {
		let t = this.elements;
		return e[0] = t[0], e[1] = t[3], e[2] = t[6], e[3] = t[1], e[4] = t[4], e[5] = t[7], e[6] = t[2], e[7] = t[5], e[8] = t[8], this;
	}
	setUvTransform(e, t, n, r, i, a, o) {
		let s = Math.cos(i), c = Math.sin(i);
		return this.set(n * s, n * c, -n * (s * a + c * o) + a + e, -r * c, r * s, -r * (-c * a + s * o) + o + t, 0, 0, 1), this;
	}
	scale(e, t) {
		return ue("Matrix3: .scale() is deprecated. Use .makeScale() instead."), this.premultiply(Se.makeScale(e, t)), this;
	}
	rotate(e) {
		return ue("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."), this.premultiply(Se.makeRotation(-e)), this;
	}
	translate(e, t) {
		return ue("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."), this.premultiply(Se.makeTranslation(e, t)), this;
	}
	makeTranslation(e, t) {
		return e.isVector2 ? this.set(1, 0, e.x, 0, 1, e.y, 0, 0, 1) : this.set(1, 0, e, 0, 1, t, 0, 0, 1), this;
	}
	makeRotation(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, n, t, 0, 0, 0, 1), this;
	}
	makeScale(e, t) {
		return this.set(e, 0, 0, 0, t, 0, 0, 0, 1), this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 9; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 9; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e;
	}
	clone() {
		return new this.constructor().fromArray(this.elements);
	}
};
i = xe, i.prototype.isMatrix3 = !0;
var Se = /*@__PURE__*/ new xe(), Ce = /*@__PURE__*/ new xe().set(.4123908, .3575843, .1804808, .212639, .7151687, .0721923, .0193308, .1191948, .9505322), we = /*@__PURE__*/ new xe().set(3.2409699, -1.5373832, -.4986108, -.9692436, 1.8759675, .0415551, .0556301, -.203977, 1.0569715);
function Te() {
	let e = {
		enabled: !0,
		workingColorSpace: k,
		spaces: {},
		convert: function(e, t, n) {
			return this.enabled === !1 || t === n || !t || !n || (this.spaces[t].transfer === "srgb" && (e.r = De(e.r), e.g = De(e.g), e.b = De(e.b)), this.spaces[t].primaries !== this.spaces[n].primaries && (e.applyMatrix3(this.spaces[t].toXYZ), e.applyMatrix3(this.spaces[n].fromXYZ)), this.spaces[n].transfer === "srgb" && (e.r = Oe(e.r), e.g = Oe(e.g), e.b = Oe(e.b))), e;
		},
		workingToColorSpace: function(e, t) {
			return this.convert(e, this.workingColorSpace, t);
		},
		colorSpaceToWorking: function(e, t) {
			return this.convert(e, t, this.workingColorSpace);
		},
		getPrimaries: function(e) {
			return this.spaces[e].primaries;
		},
		getTransfer: function(e) {
			return e === "" ? A : this.spaces[e].transfer;
		},
		getToneMappingMode: function(e) {
			return this.spaces[e].outputColorSpaceConfig.toneMappingMode || "standard";
		},
		getLuminanceCoefficients: function(e, t = this.workingColorSpace) {
			return e.fromArray(this.spaces[t].luminanceCoefficients);
		},
		define: function(e) {
			Object.assign(this.spaces, e);
		},
		_getMatrix: function(e, t, n) {
			return e.copy(this.spaces[n].fromXYZ).multiply(this.spaces[t].toXYZ);
		},
		_getDrawingBufferColorSpace: function(e) {
			return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace;
		},
		_getUnpackColorSpace: function(e = this.workingColorSpace) {
			return this.spaces[e].workingColorSpaceConfig.unpackColorSpace;
		}
	}, t = [
		.64,
		.33,
		.3,
		.6,
		.15,
		.06
	], n = [
		.2126,
		.7152,
		.0722
	], r = [.3127, .329];
	return e.define({
		[k]: {
			primaries: t,
			whitePoint: r,
			transfer: A,
			toXYZ: Ce,
			fromXYZ: we,
			luminanceCoefficients: n,
			workingColorSpaceConfig: { unpackColorSpace: O },
			outputColorSpaceConfig: { drawingBufferColorSpace: O }
		},
		[O]: {
			primaries: t,
			whitePoint: r,
			transfer: ee,
			toXYZ: Ce,
			fromXYZ: we,
			luminanceCoefficients: n,
			outputColorSpaceConfig: { drawingBufferColorSpace: O }
		}
	}), e;
}
var Ee = /*@__PURE__*/ Te();
function De(e) {
	return e < .04045 ? e * .0773993808 : (e * .9478672986 + .0521327014) ** 2.4;
}
function Oe(e) {
	return e < .0031308 ? e * 12.92 : 1.055 * e ** .41666 - .055;
}
var ke, Ae = class {
	static getDataURL(e, t = "image/png") {
		if (/^data:/i.test(e.src) || typeof HTMLCanvasElement > "u") return e.src;
		let n;
		if (e instanceof HTMLCanvasElement) n = e;
		else {
			ke === void 0 && (ke = oe("canvas")), ke.width = e.width, ke.height = e.height;
			let t = ke.getContext("2d");
			e instanceof ImageData ? t.putImageData(e, 0, 0) : t.drawImage(e, 0, 0, e.width, e.height), n = ke;
		}
		return n.toDataURL(t);
	}
	static sRGBToLinear(e) {
		if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap) {
			let t = oe("canvas");
			t.width = e.width, t.height = e.height;
			let n = t.getContext("2d");
			n.drawImage(e, 0, 0, e.width, e.height);
			let r = n.getImageData(0, 0, e.width, e.height), i = r.data;
			for (let e = 0; e < i.length; e++) i[e] = De(i[e] / 255) * 255;
			return n.putImageData(r, 0, 0), t;
		}
		if (e.data) {
			let t = e.data.slice(0);
			for (let e = 0; e < t.length; e++) t instanceof Uint8Array || t instanceof Uint8ClampedArray ? t[e] = Math.floor(De(t[e] / 255) * 255) : t[e] = De(t[e]);
			return {
				data: t,
				width: e.width,
				height: e.height
			};
		}
		return j("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), e;
	}
}, je = 0, Me = class {
	constructor(e = null) {
		this.isTextureSource = !0, Object.defineProperty(this, "id", { value: je++ }), this.uuid = fe(), this.data = e, this.dataReady = !0, this.version = 0;
	}
	getSize(e) {
		let t = this.data;
		return typeof HTMLVideoElement < "u" && t instanceof HTMLVideoElement ? e.set(t.videoWidth, t.videoHeight, 0) : typeof VideoFrame < "u" && t instanceof VideoFrame ? e.set(t.displayWidth, t.displayHeight, 0) : t === null ? e.set(0, 0, 0) : e.set(t.width || 0, t.height || 0, t.depth || 0), e;
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.images[this.uuid] !== void 0) return e.images[this.uuid];
		let n = {
			uuid: this.uuid,
			url: ""
		}, r = this.data;
		if (r !== null) {
			let e;
			if (Array.isArray(r)) {
				e = [];
				for (let t = 0, n = r.length; t < n; t++) r[t].isDataTexture ? e.push(Ne(r[t].image)) : e.push(Ne(r[t]));
			} else e = Ne(r);
			n.url = e;
		}
		return t || (e.images[this.uuid] = n), n;
	}
};
function Ne(e) {
	return typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap ? Ae.getDataURL(e) : e.data ? {
		data: Array.from(e.data),
		width: e.width,
		height: e.height,
		type: e.data.constructor.name
	} : (j("Texture: Unable to serialize Texture."), {});
}
var Pe = 0, Fe = /*@__PURE__*/ new I(), Ie = class e extends de {
	constructor(t = e.DEFAULT_IMAGE, n = e.DEFAULT_MAPPING, r = f, i = f, a = h, o = g, s = y, c = _, l = e.DEFAULT_ANISOTROPY, u = "") {
		super(), this.isTexture = !0, Object.defineProperty(this, "id", { value: Pe++ }), this.uuid = fe(), this.name = "", this.source = new Me(t), this.mipmaps = [], this.mapping = n, this.channel = 0, this.wrapS = r, this.wrapT = i, this.magFilter = a, this.minFilter = o, this.anisotropy = l, this.format = s, this.internalFormat = null, this.type = c, this.offset = new F(0, 0), this.repeat = new F(1, 1), this.center = new F(0, 0), this.rotation = 0, this.matrixAutoUpdate = !0, this.matrix = new xe(), this.generateMipmaps = !0, this.mipmapsAutoUpdate = !0, this.premultiplyAlpha = !1, this.flipY = !0, this.unpackAlignment = 4, this.colorSpace = u, this.userData = {}, this.updateRanges = [], this.version = 0, this.onUpdate = null, this.renderTarget = null, this.isRenderTargetTexture = !1, this.isArrayTexture = !!(t && t.depth && t.depth > 1), this.pmremVersion = 0, this.isPMREMTexture = !1, this.normalized = !1;
	}
	get width() {
		return this.source.getSize(Fe).x;
	}
	get height() {
		return this.source.getSize(Fe).y;
	}
	get depth() {
		return this.source.getSize(Fe).z;
	}
	get image() {
		return this.source.data;
	}
	set image(e) {
		this.source.data = e;
	}
	updateMatrix() {
		this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.name = e.name, this.source = e.source, this.mipmaps = e.mipmaps.slice(0), this.mapping = e.mapping, this.channel = e.channel, this.wrapS = e.wrapS, this.wrapT = e.wrapT, this.magFilter = e.magFilter, this.minFilter = e.minFilter, this.anisotropy = e.anisotropy, this.format = e.format, this.internalFormat = e.internalFormat, this.type = e.type, this.normalized = e.normalized, this.offset.copy(e.offset), this.repeat.copy(e.repeat), this.center.copy(e.center), this.rotation = e.rotation, this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrix.copy(e.matrix), this.generateMipmaps = e.generateMipmaps, this.mipmapsAutoUpdate = e.mipmapsAutoUpdate, this.premultiplyAlpha = e.premultiplyAlpha, this.flipY = e.flipY, this.unpackAlignment = e.unpackAlignment, this.colorSpace = e.colorSpace, this.renderTarget = e.renderTarget, this.isRenderTargetTexture = e.isRenderTargetTexture, this.isPMREMTexture = e.isPMREMTexture, this.isArrayTexture = e.isArrayTexture, this.userData = JSON.parse(JSON.stringify(e.userData)), this.needsUpdate = !0, this;
	}
	setValues(e) {
		for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				j(`Texture.setValues(): parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			r === void 0 ? j(`Texture.setValues(): property '${t}' does not exist.`) : r && n && r.isVector2 && n.isVector2 || r && n && r.isVector3 && n.isVector3 || r && n && r.isMatrix3 && n.isMatrix3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.textures[this.uuid] !== void 0) return e.textures[this.uuid];
		let n = {
			metadata: {
				version: 4.7,
				type: "Texture",
				generator: "Texture.toJSON"
			},
			uuid: this.uuid,
			name: this.name,
			image: this.source.toJSON(e).uuid,
			mapping: this.mapping,
			channel: this.channel,
			repeat: [this.repeat.x, this.repeat.y],
			offset: [this.offset.x, this.offset.y],
			center: [this.center.x, this.center.y],
			rotation: this.rotation,
			wrap: [this.wrapS, this.wrapT],
			format: this.format,
			internalFormat: this.internalFormat,
			type: this.type,
			normalized: this.normalized,
			colorSpace: this.colorSpace,
			minFilter: this.minFilter,
			magFilter: this.magFilter,
			anisotropy: this.anisotropy,
			flipY: this.flipY,
			generateMipmaps: this.generateMipmaps,
			mipmapsAutoUpdate: this.mipmapsAutoUpdate,
			premultiplyAlpha: this.premultiplyAlpha,
			unpackAlignment: this.unpackAlignment
		};
		return Object.keys(this.userData).length > 0 && (n.userData = this.userData), t || (e.textures[this.uuid] = n), n;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	transformUv(e) {
		if (this.mapping !== 300) return e;
		if (e.applyMatrix3(this.matrix), e.x < 0 || e.x > 1) switch (this.wrapS) {
			case d:
				e.x -= Math.floor(e.x);
				break;
			case f:
				e.x = e.x < 0 ? 0 : 1;
				break;
			case p: Math.abs(Math.floor(e.x) % 2) === 1 ? e.x = Math.ceil(e.x) - e.x : e.x -= Math.floor(e.x);
		}
		if (e.y < 0 || e.y > 1) switch (this.wrapT) {
			case d:
				e.y -= Math.floor(e.y);
				break;
			case f:
				e.y = e.y < 0 ? 0 : 1;
				break;
			case p: Math.abs(Math.floor(e.y) % 2) === 1 ? e.y = Math.ceil(e.y) - e.y : e.y -= Math.floor(e.y);
		}
		return this.flipY && (e.y = 1 - e.y), e;
	}
	set needsUpdate(e) {
		e === !0 && (this.version++, this.source.needsUpdate = !0);
	}
	set needsPMREMUpdate(e) {
		e === !0 && this.pmremVersion++;
	}
};
Ie.DEFAULT_IMAGE = null, Ie.DEFAULT_MAPPING = 300, Ie.DEFAULT_ANISOTROPY = 1, u = Symbol.iterator;
var Le = class {
	constructor(e = 0, t = 0, n = 0, r = 1) {
		this.x = e, this.y = t, this.z = n, this.w = r;
	}
	get width() {
		return this.z;
	}
	set width(e) {
		this.z = e;
	}
	get height() {
		return this.w;
	}
	set height(e) {
		this.w = e;
	}
	set(e, t, n, r) {
		return this.x = e, this.y = t, this.z = n, this.w = r, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this.w = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setW(e) {
		return this.w = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			case 3:
				this.w = t;
				break;
			default: throw Error("THREE.Vector4: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			case 3: return this.w;
			default: throw Error("THREE.Vector4: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z, this.w);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this.w = e.w === void 0 ? 1 : e.w, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this.w += e.w, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this.w += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this.w = e.w + t.w, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this.w += e.w * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this.w -= e.w, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this.w -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this.w = e.w - t.w, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this.w *= e.w, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this.w *= e, this;
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = this.w, a = e.elements;
		return this.x = a[0] * t + a[4] * n + a[8] * r + a[12] * i, this.y = a[1] * t + a[5] * n + a[9] * r + a[13] * i, this.z = a[2] * t + a[6] * n + a[10] * r + a[14] * i, this.w = a[3] * t + a[7] * n + a[11] * r + a[15] * i, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this.w /= e.w, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	setAxisAngleFromQuaternion(e) {
		this.w = 2 * Math.acos(e.w);
		let t = Math.sqrt(1 - e.w * e.w);
		return t < 1e-4 ? (this.x = 1, this.y = 0, this.z = 0) : (this.x = e.x / t, this.y = e.y / t, this.z = e.z / t), this;
	}
	setAxisAngleFromRotationMatrix(e) {
		let t, n, r, i, a = .01, o = .1, s = e.elements, c = s[0], l = s[4], u = s[8], d = s[1], f = s[5], p = s[9], m = s[2], h = s[6], g = s[10];
		if (Math.abs(l - d) < a && Math.abs(u - m) < a && Math.abs(p - h) < a) {
			if (Math.abs(l + d) < o && Math.abs(u + m) < o && Math.abs(p + h) < o && Math.abs(c + f + g - 3) < o) return this.set(1, 0, 0, 0), this;
			t = Math.PI;
			let e = (c + 1) / 2, s = (f + 1) / 2, _ = (g + 1) / 2, v = (l + d) / 4, y = (u + m) / 4, b = (p + h) / 4;
			return e > s && e > _ ? e < a ? (n = 0, r = .707106781, i = .707106781) : (n = Math.sqrt(e), r = v / n, i = y / n) : s > _ ? s < a ? (n = .707106781, r = 0, i = .707106781) : (r = Math.sqrt(s), n = v / r, i = b / r) : _ < a ? (n = .707106781, r = .707106781, i = 0) : (i = Math.sqrt(_), n = y / i, r = b / i), this.set(n, r, i, t), this;
		}
		let _ = Math.sqrt((h - p) * (h - p) + (u - m) * (u - m) + (d - l) * (d - l));
		return Math.abs(_) < .001 && (_ = 1), this.x = (h - p) / _, this.y = (u - m) / _, this.z = (d - l) / _, this.w = Math.acos((c + f + g - 1) / 2), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this.w = t[15], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this.w = Math.min(this.w, e.w), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this.w = Math.max(this.w, e.w), this;
	}
	clamp(e, t) {
		return this.x = P(this.x, e.x, t.x), this.y = P(this.y, e.y, t.y), this.z = P(this.z, e.z, t.z), this.w = P(this.w, e.w, t.w), this;
	}
	clampScalar(e, t) {
		return this.x = P(this.x, e, t), this.y = P(this.y, e, t), this.z = P(this.z, e, t), this.w = P(this.w, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(P(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this.w = Math.floor(this.w), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this.w = Math.ceil(this.w), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this.w = Math.round(this.w), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this.w = Math.trunc(this.w), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this.w = -this.w, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z + this.w * e.w;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this.w += (e.w - this.w) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this.w = e.w + (t.w - e.w) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z && e.w === this.w;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this.w = e[t + 3], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e[t + 3] = this.w, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this.w = e.getW(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this.w = Math.random(), this;
	}
	*[u]() {
		yield this.x, yield this.y, yield this.z, yield this.w;
	}
};
a = Le, a.prototype.isVector4 = !0;
var L = class e {
	constructor(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		this.elements = [
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h);
	}
	set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		let g = this.elements;
		return g[0] = e, g[4] = t, g[8] = n, g[12] = r, g[1] = i, g[5] = a, g[9] = o, g[13] = s, g[2] = c, g[6] = l, g[10] = u, g[14] = d, g[3] = f, g[7] = p, g[11] = m, g[15] = h, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	clone() {
		return new e().fromArray(this.elements);
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], t[9] = n[9], t[10] = n[10], t[11] = n[11], t[12] = n[12], t[13] = n[13], t[14] = n[14], t[15] = n[15], this;
	}
	copyPosition(e) {
		let t = this.elements, n = e.elements;
		return t[12] = n[12], t[13] = n[13], t[14] = n[14], this;
	}
	setFromMatrix3(e) {
		let t = e.elements;
		return this.set(t[0], t[3], t[6], 0, t[1], t[4], t[7], 0, t[2], t[5], t[8], 0, 0, 0, 0, 1), this;
	}
	extractBasis(e, t, n) {
		return this.determinantAffine() === 0 ? (e.set(1, 0, 0), t.set(0, 1, 0), n.set(0, 0, 1), this) : (e.setFromMatrixColumn(this, 0), t.setFromMatrixColumn(this, 1), n.setFromMatrixColumn(this, 2), this);
	}
	makeBasis(e, t, n) {
		return this.set(e.x, t.x, n.x, 0, e.y, t.y, n.y, 0, e.z, t.z, n.z, 0, 0, 0, 0, 1), this;
	}
	extractRotation(e) {
		if (e.determinantAffine() === 0) return this.identity();
		let t = this.elements, n = e.elements, r = 1 / Re.setFromMatrixColumn(e, 0).length(), i = 1 / Re.setFromMatrixColumn(e, 1).length(), a = 1 / Re.setFromMatrixColumn(e, 2).length();
		return t[0] = n[0] * r, t[1] = n[1] * r, t[2] = n[2] * r, t[3] = 0, t[4] = n[4] * i, t[5] = n[5] * i, t[6] = n[6] * i, t[7] = 0, t[8] = n[8] * a, t[9] = n[9] * a, t[10] = n[10] * a, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromEuler(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z, a = Math.cos(n), o = Math.sin(n), s = Math.cos(r), c = Math.sin(r), l = Math.cos(i), u = Math.sin(i);
		if (e.order === "XYZ") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = -s * u, t[8] = c, t[1] = n + r * c, t[5] = e - i * c, t[9] = -o * s, t[2] = i - e * c, t[6] = r + n * c, t[10] = a * s;
		} else if (e.order === "YXZ") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e + i * o, t[4] = r * o - n, t[8] = a * c, t[1] = a * u, t[5] = a * l, t[9] = -o, t[2] = n * o - r, t[6] = i + e * o, t[10] = a * s;
		} else if (e.order === "ZXY") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e - i * o, t[4] = -a * u, t[8] = r + n * o, t[1] = n + r * o, t[5] = a * l, t[9] = i - e * o, t[2] = -a * c, t[6] = o, t[10] = a * s;
		} else if (e.order === "ZYX") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = r * c - n, t[8] = e * c + i, t[1] = s * u, t[5] = i * c + e, t[9] = n * c - r, t[2] = -c, t[6] = o * s, t[10] = a * s;
		} else if (e.order === "YZX") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = i - e * u, t[8] = r * u + n, t[1] = u, t[5] = a * l, t[9] = -o * l, t[2] = -c * l, t[6] = n * u + r, t[10] = e - i * u;
		} else if (e.order === "XZY") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = -u, t[8] = c * l, t[1] = e * u + i, t[5] = a * l, t[9] = n * u - r, t[2] = r * u - n, t[6] = o * l, t[10] = i * u + e;
		}
		return t[3] = 0, t[7] = 0, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromQuaternion(e) {
		return this.compose(Be, e, Ve);
	}
	lookAt(e, t, n) {
		let r = this.elements;
		return We.subVectors(e, t), We.lengthSq() === 0 && (We.z = 1), We.normalize(), He.crossVectors(n, We), He.lengthSq() === 0 && (Math.abs(n.z) === 1 ? We.x += 1e-4 : We.z += 1e-4, We.normalize(), He.crossVectors(n, We)), He.normalize(), Ue.crossVectors(We, He), r[0] = He.x, r[4] = Ue.x, r[8] = We.x, r[1] = He.y, r[5] = Ue.y, r[9] = We.y, r[2] = He.z, r[6] = Ue.z, r[10] = We.z, this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[4], s = n[8], c = n[12], l = n[1], u = n[5], d = n[9], f = n[13], p = n[2], m = n[6], h = n[10], g = n[14], _ = n[3], v = n[7], y = n[11], b = n[15], x = r[0], S = r[4], C = r[8], w = r[12], T = r[1], E = r[5], D = r[9], O = r[13], k = r[2], A = r[6], ee = r[10], te = r[14], ne = r[3], re = r[7], ie = r[11], ae = r[15];
		return i[0] = a * x + o * T + s * k + c * ne, i[4] = a * S + o * E + s * A + c * re, i[8] = a * C + o * D + s * ee + c * ie, i[12] = a * w + o * O + s * te + c * ae, i[1] = l * x + u * T + d * k + f * ne, i[5] = l * S + u * E + d * A + f * re, i[9] = l * C + u * D + d * ee + f * ie, i[13] = l * w + u * O + d * te + f * ae, i[2] = p * x + m * T + h * k + g * ne, i[6] = p * S + m * E + h * A + g * re, i[10] = p * C + m * D + h * ee + g * ie, i[14] = p * w + m * O + h * te + g * ae, i[3] = _ * x + v * T + y * k + b * ne, i[7] = _ * S + v * E + y * A + b * re, i[11] = _ * C + v * D + y * ee + b * ie, i[15] = _ * w + v * O + y * te + b * ae, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[4] *= e, t[8] *= e, t[12] *= e, t[1] *= e, t[5] *= e, t[9] *= e, t[13] *= e, t[2] *= e, t[6] *= e, t[10] *= e, t[14] *= e, t[3] *= e, t[7] *= e, t[11] *= e, t[15] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[4], r = e[8], i = e[12], a = e[1], o = e[5], s = e[9], c = e[13], l = e[2], u = e[6], d = e[10], f = e[14], p = e[3], m = e[7], h = e[11], g = e[15], _ = s * f - c * d, v = o * f - c * u, y = o * d - s * u, b = a * f - c * l, x = a * d - s * l, S = a * u - o * l;
		return t * (m * _ - h * v + g * y) - n * (p * _ - h * b + g * x) + r * (p * v - m * b + g * S) - i * (p * y - m * x + h * S);
	}
	determinantAffine() {
		let e = this.elements, t = e[0], n = e[4], r = e[8], i = e[1], a = e[5], o = e[9], s = e[2], c = e[6], l = e[10];
		return t * (a * l - o * c) - n * (i * l - o * s) + r * (i * c - a * s);
	}
	transpose() {
		let e = this.elements, t;
		return t = e[1], e[1] = e[4], e[4] = t, t = e[2], e[2] = e[8], e[8] = t, t = e[6], e[6] = e[9], e[9] = t, t = e[3], e[3] = e[12], e[12] = t, t = e[7], e[7] = e[13], e[13] = t, t = e[11], e[11] = e[14], e[14] = t, this;
	}
	setPosition(e, t, n) {
		let r = this.elements;
		return e.isVector3 ? (r[12] = e.x, r[13] = e.y, r[14] = e.z) : (r[12] = e, r[13] = t, r[14] = n), this;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = e[9], d = e[10], f = e[11], p = e[12], m = e[13], h = e[14], g = e[15], _ = t * o - n * a, v = t * s - r * a, y = t * c - i * a, b = n * s - r * o, x = n * c - i * o, S = r * c - i * s, C = l * m - u * p, w = l * h - d * p, T = l * g - f * p, E = u * h - d * m, D = u * g - f * m, O = d * g - f * h, k = _ * O - v * D + y * E + b * T - x * w + S * C;
		if (k === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
		let A = 1 / k;
		return e[0] = (o * O - s * D + c * E) * A, e[1] = (r * D - n * O - i * E) * A, e[2] = (m * S - h * x + g * b) * A, e[3] = (d * x - u * S - f * b) * A, e[4] = (s * T - a * O - c * w) * A, e[5] = (t * O - r * T + i * w) * A, e[6] = (h * y - p * S - g * v) * A, e[7] = (l * S - d * y + f * v) * A, e[8] = (a * D - o * T + c * C) * A, e[9] = (n * T - t * D - i * C) * A, e[10] = (p * x - m * y + g * _) * A, e[11] = (u * y - l * x - f * _) * A, e[12] = (o * w - a * E - s * C) * A, e[13] = (t * E - n * w + r * C) * A, e[14] = (m * v - p * b - h * _) * A, e[15] = (l * b - u * v + d * _) * A, this;
	}
	scale(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z;
		return t[0] *= n, t[4] *= r, t[8] *= i, t[1] *= n, t[5] *= r, t[9] *= i, t[2] *= n, t[6] *= r, t[10] *= i, t[3] *= n, t[7] *= r, t[11] *= i, this;
	}
	getMaxScaleOnAxis() {
		let e = this.elements, t = e[0] * e[0] + e[1] * e[1] + e[2] * e[2], n = e[4] * e[4] + e[5] * e[5] + e[6] * e[6], r = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
		return Math.sqrt(Math.max(t, n, r));
	}
	makeTranslation(e, t, n) {
		return e.isVector3 ? this.set(1, 0, 0, e.x, 0, 1, 0, e.y, 0, 0, 1, e.z, 0, 0, 0, 1) : this.set(1, 0, 0, e, 0, 1, 0, t, 0, 0, 1, n, 0, 0, 0, 1), this;
	}
	makeRotationX(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(1, 0, 0, 0, 0, t, -n, 0, 0, n, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationY(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, 0, n, 0, 0, 1, 0, 0, -n, 0, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationZ(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, 0, n, t, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	makeRotationAxis(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = 1 - n, a = e.x, o = e.y, s = e.z, c = i * a, l = i * o;
		return this.set(c * a + n, c * o - r * s, c * s + r * o, 0, c * o + r * s, l * o + n, l * s - r * a, 0, c * s - r * o, l * s + r * a, i * s * s + n, 0, 0, 0, 0, 1), this;
	}
	makeScale(e, t, n) {
		return this.set(e, 0, 0, 0, 0, t, 0, 0, 0, 0, n, 0, 0, 0, 0, 1), this;
	}
	makeShear(e, t, n, r, i, a) {
		return this.set(1, n, i, 0, e, 1, a, 0, t, r, 1, 0, 0, 0, 0, 1), this;
	}
	compose(e, t, n) {
		let r = this.elements, i = t._x, a = t._y, o = t._z, s = t._w, c = i + i, l = a + a, u = o + o, d = i * c, f = i * l, p = i * u, m = a * l, h = a * u, g = o * u, _ = s * c, v = s * l, y = s * u, b = n.x, x = n.y, S = n.z;
		return r[0] = (1 - (m + g)) * b, r[1] = (f + y) * b, r[2] = (p - v) * b, r[3] = 0, r[4] = (f - y) * x, r[5] = (1 - (d + g)) * x, r[6] = (h + _) * x, r[7] = 0, r[8] = (p + v) * S, r[9] = (h - _) * S, r[10] = (1 - (d + m)) * S, r[11] = 0, r[12] = e.x, r[13] = e.y, r[14] = e.z, r[15] = 1, this;
	}
	decompose(e, t, n) {
		let r = this.elements;
		e.x = r[12], e.y = r[13], e.z = r[14];
		let i = this.determinantAffine();
		if (i === 0) return n.set(1, 1, 1), t.identity(), this;
		let a = Re.set(r[0], r[1], r[2]).length(), o = Re.set(r[4], r[5], r[6]).length(), s = Re.set(r[8], r[9], r[10]).length();
		i < 0 && (a = -a), ze.copy(this);
		let c = 1 / a, l = 1 / o, u = 1 / s;
		return ze.elements[0] *= c, ze.elements[1] *= c, ze.elements[2] *= c, ze.elements[4] *= l, ze.elements[5] *= l, ze.elements[6] *= l, ze.elements[8] *= u, ze.elements[9] *= u, ze.elements[10] *= u, t.setFromRotationMatrix(ze), n.x = a, n.y = o, n.z = s, this;
	}
	makePerspective(e, t, n, r, i, a, o = re, s = !1) {
		let c = this.elements, l = 2 * i / (t - e), u = 2 * i / (n - r), d = (t + e) / (t - e), f = (n + r) / (n - r), p, m;
		if (s) p = i / (a - i), m = a * i / (a - i);
		else if (o === 2e3) p = -(a + i) / (a - i), m = -2 * a * i / (a - i);
		else if (o === 2001) p = -a / (a - i), m = -a * i / (a - i);
		else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = d, c[12] = 0, c[1] = 0, c[5] = u, c[9] = f, c[13] = 0, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = -1, c[15] = 0, this;
	}
	makeOrthographic(e, t, n, r, i, a, o = re, s = !1) {
		let c = this.elements, l = 2 / (t - e), u = 2 / (n - r), d = -(t + e) / (t - e), f = -(n + r) / (n - r), p, m;
		if (s) p = 1 / (a - i), m = a / (a - i);
		else if (o === 2e3) p = -2 / (a - i), m = -(a + i) / (a - i);
		else if (o === 2001) p = -1 / (a - i), m = -i / (a - i);
		else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = 0, c[12] = d, c[1] = 0, c[5] = u, c[9] = 0, c[13] = f, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = 0, c[15] = 1, this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 16; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 16; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e[t + 9] = n[9], e[t + 10] = n[10], e[t + 11] = n[11], e[t + 12] = n[12], e[t + 13] = n[13], e[t + 14] = n[14], e[t + 15] = n[15], e;
	}
};
o = L, o.prototype.isMatrix4 = !0;
var Re = /*@__PURE__*/ new I(), ze = /*@__PURE__*/ new L(), Be = /*@__PURE__*/ new I(0, 0, 0), Ve = /*@__PURE__*/ new I(1, 1, 1), He = /*@__PURE__*/ new I(), Ue = /*@__PURE__*/ new I(), We = /*@__PURE__*/ new I(), Ge = /*@__PURE__*/ new L(), Ke = /*@__PURE__*/ new ve(), qe = class e {
	constructor(t = 0, n = 0, r = 0, i = e.DEFAULT_ORDER) {
		this.isEuler = !0, this._x = t, this._y = n, this._z = r, this._order = i;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get order() {
		return this._order;
	}
	set order(e) {
		this._order = e, this._onChangeCallback();
	}
	set(e, t, n, r = this._order) {
		return this._x = e, this._y = t, this._z = n, this._order = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._order);
	}
	copy(e) {
		return this._x = e._x, this._y = e._y, this._z = e._z, this._order = e._order, this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e, t = this._order, n = !0) {
		let r = e.elements, i = r[0], a = r[4], o = r[8], s = r[1], c = r[5], l = r[9], u = r[2], d = r[6], f = r[10];
		switch (t) {
			case "XYZ":
				this._y = Math.asin(P(o, -1, 1)), Math.abs(o) < .9999999 ? (this._x = Math.atan2(-l, f), this._z = Math.atan2(-a, i)) : (this._x = Math.atan2(d, c), this._z = 0);
				break;
			case "YXZ":
				this._x = Math.asin(-P(l, -1, 1)), Math.abs(l) < .9999999 ? (this._y = Math.atan2(o, f), this._z = Math.atan2(s, c)) : (this._y = Math.atan2(-u, i), this._z = 0);
				break;
			case "ZXY":
				this._x = Math.asin(P(d, -1, 1)), Math.abs(d) < .9999999 ? (this._y = Math.atan2(-u, f), this._z = Math.atan2(-a, c)) : (this._y = 0, this._z = Math.atan2(s, i));
				break;
			case "ZYX":
				this._y = Math.asin(-P(u, -1, 1)), Math.abs(u) < .9999999 ? (this._x = Math.atan2(d, f), this._z = Math.atan2(s, i)) : (this._x = 0, this._z = Math.atan2(-a, c));
				break;
			case "YZX":
				this._z = Math.asin(P(s, -1, 1)), Math.abs(s) < .9999999 ? (this._x = Math.atan2(-l, c), this._y = Math.atan2(-u, i)) : (this._x = 0, this._y = Math.atan2(o, f));
				break;
			case "XZY":
				this._z = Math.asin(-P(a, -1, 1)), Math.abs(a) < .9999999 ? (this._x = Math.atan2(d, c), this._y = Math.atan2(o, i)) : (this._x = Math.atan2(-l, f), this._y = 0);
				break;
			default: j("Euler: .setFromRotationMatrix() encountered an unknown order: " + t);
		}
		return this._order = t, n === !0 && this._onChangeCallback(), this;
	}
	setFromQuaternion(e, t, n) {
		return Ge.makeRotationFromQuaternion(e), this.setFromRotationMatrix(Ge, t, n);
	}
	setFromVector3(e, t = this._order) {
		return this.set(e.x, e.y, e.z, t);
	}
	reorder(e) {
		return Ke.setFromEuler(this), this.setFromQuaternion(Ke, e);
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._order === this._order;
	}
	fromArray(e) {
		return this._x = e[0], this._y = e[1], this._z = e[2], e[3] !== void 0 && (this._order = e[3]), this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._order, e;
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._order;
	}
};
qe.DEFAULT_ORDER = "XYZ";
var Je = class {
	constructor() {
		this.mask = 1;
	}
	set(e) {
		this.mask = 1 << e >>> 0;
	}
	enable(e) {
		this.mask |= 1 << e;
	}
	enableAll() {
		this.mask = -1;
	}
	toggle(e) {
		this.mask ^= 1 << e;
	}
	disable(e) {
		this.mask &= ~(1 << e);
	}
	disableAll() {
		this.mask = 0;
	}
	test(e) {
		return (this.mask & e.mask) !== 0;
	}
	isEnabled(e) {
		return !!(this.mask & 1 << e);
	}
}, Ye = 0, Xe = /*@__PURE__*/ new I(), Ze = /*@__PURE__*/ new ve(), Qe = /*@__PURE__*/ new L(), $e = /*@__PURE__*/ new I(), et = /*@__PURE__*/ new I(), tt = /*@__PURE__*/ new I(), nt = /*@__PURE__*/ new ve(), rt = /*@__PURE__*/ new I(1, 0, 0), it = /*@__PURE__*/ new I(0, 1, 0), at = /*@__PURE__*/ new I(0, 0, 1), ot = { type: "added" }, st = { type: "removed" }, ct = {
	type: "childadded",
	child: null
}, lt = {
	type: "childremoved",
	child: null
}, ut = class e extends de {
	constructor() {
		super(), this.isObject3D = !0, Object.defineProperty(this, "id", { value: Ye++ }), this.uuid = fe(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = e.DEFAULT_UP.clone();
		let t = new I(), n = new qe(), r = new ve(), i = new I(1, 1, 1);
		function a() {
			r.setFromEuler(n, !1);
		}
		function o() {
			n.setFromQuaternion(r, void 0, !1);
		}
		n._onChange(a), r._onChange(o), Object.defineProperties(this, {
			position: {
				configurable: !0,
				enumerable: !0,
				value: t
			},
			rotation: {
				configurable: !0,
				enumerable: !0,
				value: n
			},
			quaternion: {
				configurable: !0,
				enumerable: !0,
				value: r
			},
			scale: {
				configurable: !0,
				enumerable: !0,
				value: i
			},
			modelViewMatrix: { value: new L() },
			normalMatrix: { value: new xe() }
		}), this.matrix = new L(), this.matrixWorld = new L(), this.matrixAutoUpdate = e.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = !1, this.layers = new Je(), this.visible = !0, this.castShadow = !1, this.receiveShadow = !1, this.frustumCulled = !0, this.renderOrder = 0, this.animations = [], this.customDepthMaterial = void 0, this.customDistanceMaterial = void 0, this.static = !1, this.userData = {}, this.pivot = null;
	}
	onBeforeShadow() {}
	onAfterShadow() {}
	onBeforeRender() {}
	onAfterRender() {}
	applyMatrix4(e) {
		this.matrixAutoUpdate && this.updateMatrix(), this.matrix.premultiply(e), this.matrix.decompose(this.position, this.quaternion, this.scale), this.pivot !== null && this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot);
	}
	applyQuaternion(e) {
		return this.quaternion.premultiply(e), this;
	}
	setRotationFromAxisAngle(e, t) {
		this.quaternion.setFromAxisAngle(e, t);
	}
	setRotationFromEuler(e) {
		this.quaternion.setFromEuler(e, !0);
	}
	setRotationFromMatrix(e) {
		this.quaternion.setFromRotationMatrix(e);
	}
	setRotationFromQuaternion(e) {
		this.quaternion.copy(e);
	}
	rotateOnAxis(e, t) {
		return Ze.setFromAxisAngle(e, t), this.quaternion.multiply(Ze), this;
	}
	rotateOnWorldAxis(e, t) {
		return Ze.setFromAxisAngle(e, t), this.quaternion.premultiply(Ze), this;
	}
	rotateX(e) {
		return this.rotateOnAxis(rt, e);
	}
	rotateY(e) {
		return this.rotateOnAxis(it, e);
	}
	rotateZ(e) {
		return this.rotateOnAxis(at, e);
	}
	translateOnAxis(e, t) {
		return Xe.copy(e).applyQuaternion(this.quaternion), this.position.add(Xe.multiplyScalar(t)), this;
	}
	translateX(e) {
		return this.translateOnAxis(rt, e);
	}
	translateY(e) {
		return this.translateOnAxis(it, e);
	}
	translateZ(e) {
		return this.translateOnAxis(at, e);
	}
	localToWorld(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(this.matrixWorld);
	}
	worldToLocal(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(Qe.copy(this.matrixWorld).invert());
	}
	lookAt(e, t, n) {
		e.isVector3 ? $e.copy(e) : $e.set(e, t, n);
		let r = this.parent;
		this.updateWorldMatrix(!0, !1), et.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? Qe.lookAt(et, $e, this.up) : Qe.lookAt($e, et, this.up), this.quaternion.setFromRotationMatrix(Qe), r && (Qe.extractRotation(r.matrixWorld), Ze.setFromRotationMatrix(Qe), this.quaternion.premultiply(Ze.invert()));
	}
	add(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.add(arguments[e]);
			return this;
		}
		return e === this ? (M("Object3D.add: object can't be added as a child of itself.", e), this) : (e && e.isObject3D ? (e.removeFromParent(), e.parent = this, this.children.push(e), e.dispatchEvent(ot), ct.child = e, this.dispatchEvent(ct), ct.child = null) : M("Object3D.add: object not an instance of THREE.Object3D.", e), this);
	}
	remove(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.remove(arguments[e]);
			return this;
		}
		let t = this.children.indexOf(e);
		return t !== -1 && (e.parent = null, this.children.splice(t, 1), e.dispatchEvent(st), lt.child = e, this.dispatchEvent(lt), lt.child = null), this;
	}
	removeFromParent() {
		let e = this.parent;
		return e !== null && e.remove(this), this;
	}
	clear() {
		return this.remove(...this.children);
	}
	attach(e) {
		return this.updateWorldMatrix(!0, !1), Qe.copy(this.matrixWorld).invert(), e.parent !== null && (e.parent.updateWorldMatrix(!0, !1), Qe.multiply(e.parent.matrixWorld)), e.applyMatrix4(Qe), e.removeFromParent(), e.parent = this, this.children.push(e), e.updateWorldMatrix(!1, !0), e.dispatchEvent(ot), ct.child = e, this.dispatchEvent(ct), ct.child = null, this;
	}
	getObjectById(e) {
		return this.getObjectByProperty("id", e);
	}
	getObjectByName(e) {
		return this.getObjectByProperty("name", e);
	}
	getObjectByProperty(e, t) {
		if (this[e] === t) return this;
		for (let n = 0, r = this.children.length; n < r; n++) {
			let r = this.children[n].getObjectByProperty(e, t);
			if (r !== void 0) return r;
		}
	}
	getObjectsByProperty(e, t, n = []) {
		this[e] === t && n.push(this);
		let r = this.children;
		for (let i = 0, a = r.length; i < a; i++) r[i].getObjectsByProperty(e, t, n);
		return n;
	}
	getWorldPosition(e) {
		return this.updateWorldMatrix(!0, !1), e.setFromMatrixPosition(this.matrixWorld);
	}
	getWorldQuaternion(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(et, e, tt), e;
	}
	getWorldScale(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(et, nt, e), e;
	}
	getWorldDirection(e) {
		this.updateWorldMatrix(!0, !1);
		let t = this.matrixWorld.elements;
		return e.set(t[8], t[9], t[10]).normalize();
	}
	raycast() {}
	intersectsFrustum() {
		return !0;
	}
	traverse(e) {
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverse(e);
	}
	traverseVisible(e) {
		if (this.visible === !1) return;
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverseVisible(e);
	}
	traverseAncestors(e) {
		let t = this.parent;
		t !== null && (e(t), t.traverseAncestors(e));
	}
	updateMatrix() {
		this.matrix.compose(this.position, this.quaternion, this.scale);
		let e = this.pivot;
		if (e !== null) {
			let t = e.x, n = e.y, r = e.z, i = this.matrix.elements;
			i[12] += t - i[0] * t - i[4] * n - i[8] * r, i[13] += n - i[1] * t - i[5] * n - i[9] * r, i[14] += r - i[2] * t - i[6] * n - i[10] * r;
		}
		this.matrixWorldNeedsUpdate = !0;
	}
	updateMatrixWorld(e) {
		this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || e) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, e = !0);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].updateMatrixWorld(e);
	}
	updateWorldMatrix(e, t, n = !1) {
		let r = this.parent;
		if (e === !0 && r !== null && r.updateWorldMatrix(!0, !1), this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || n) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, n = !0), t === !0) {
			let e = this.children;
			for (let t = 0, r = e.length; t < r; t++) e[t].updateWorldMatrix(!1, !0, n);
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string", n = {};
		t && (e = {
			geometries: {},
			materials: {},
			textures: {},
			images: {},
			shapes: {},
			skeletons: {},
			animations: {},
			nodes: {}
		}, n.metadata = {
			version: 4.7,
			type: "Object",
			generator: "Object3D.toJSON"
		});
		let r = {};
		r.uuid = this.uuid, r.type = this.type, r.name = this.name, r.castShadow = this.castShadow, r.receiveShadow = this.receiveShadow, r.visible = this.visible, r.frustumCulled = this.frustumCulled, r.renderOrder = this.renderOrder, r.static = this.static, r.matrixAutoUpdate = this.matrixAutoUpdate, Object.keys(this.userData).length > 0 && (r.userData = this.userData), r.layers = this.layers.mask, r.matrix = this.matrix.toArray(), r.up = this.up.toArray(), this.pivot !== null && (r.pivot = this.pivot.toArray()), this.morphTargetDictionary !== void 0 && (r.morphTargetDictionary = Object.assign({}, this.morphTargetDictionary)), this.morphTargetInfluences !== void 0 && (r.morphTargetInfluences = this.morphTargetInfluences.slice()), this.isInstancedMesh && (r.type = "InstancedMesh", r.count = this.count, r.instanceMatrix = this.instanceMatrix.toJSON(), this.instanceColor !== null && (r.instanceColor = this.instanceColor.toJSON())), this.isBatchedMesh && (r.type = "BatchedMesh", r.perObjectFrustumCulled = this.perObjectFrustumCulled, r.sortObjects = this.sortObjects, r.drawRanges = this._drawRanges, r.reservedRanges = this._reservedRanges, r.geometryInfo = this._geometryInfo.map((e) => ({
			...e,
			boundingBox: e.boundingBox ? e.boundingBox.toJSON() : void 0,
			boundingSphere: e.boundingSphere ? e.boundingSphere.toJSON() : void 0
		})), r.instanceInfo = this._instanceInfo.map((e) => ({ ...e })), r.availableInstanceIds = this._availableInstanceIds.slice(), r.availableGeometryIds = this._availableGeometryIds.slice(), r.nextIndexStart = this._nextIndexStart, r.nextVertexStart = this._nextVertexStart, r.geometryCount = this._geometryCount, r.maxInstanceCount = this._maxInstanceCount, r.maxVertexCount = this._maxVertexCount, r.maxIndexCount = this._maxIndexCount, r.geometryInitialized = this._geometryInitialized, r.matricesTexture = this._matricesTexture.toJSON(e), r.indirectTexture = this._indirectTexture.toJSON(e), this._colorsTexture !== null && (r.colorsTexture = this._colorsTexture.toJSON(e)), this.boundingSphere !== null && (r.boundingSphere = this.boundingSphere.toJSON()), this.boundingBox !== null && (r.boundingBox = this.boundingBox.toJSON()));
		function i(t, n) {
			return t[n.uuid] === void 0 && (t[n.uuid] = n.toJSON(e)), n.uuid;
		}
		if (this.isScene) this.background && (this.background.isColor ? r.background = this.background.toJSON() : this.background.isTexture && (r.background = this.background.toJSON(e).uuid)), this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== !0 && (r.environment = this.environment.toJSON(e).uuid);
		else if (this.isMesh || this.isLine || this.isPoints) {
			r.geometry = i(e.geometries, this.geometry);
			let t = this.geometry.parameters;
			if (t !== void 0 && t.shapes !== void 0) {
				let n = t.shapes;
				if (Array.isArray(n)) for (let t = 0, r = n.length; t < r; t++) {
					let r = n[t];
					i(e.shapes, r);
				}
				else i(e.shapes, n);
			}
		}
		if (this.isSkinnedMesh && (r.bindMode = this.bindMode, r.bindMatrix = this.bindMatrix.toArray(), this.skeleton !== void 0 && (i(e.skeletons, this.skeleton), r.skeleton = this.skeleton.uuid)), this.material !== void 0) {
			if (Array.isArray(this.material)) {
				let t = [];
				for (let n = 0, r = this.material.length; n < r; n++) t.push(i(e.materials, this.material[n]));
				r.material = t;
			} else r.material = i(e.materials, this.material);
		}
		if (this.children.length > 0) {
			r.children = [];
			for (let t = 0; t < this.children.length; t++) r.children.push(this.children[t].toJSON(e).object);
		}
		if (this.animations.length > 0) {
			r.animations = [];
			for (let t = 0; t < this.animations.length; t++) {
				let n = this.animations[t];
				r.animations.push(i(e.animations, n));
			}
		}
		if (t) {
			let t = a(e.geometries), r = a(e.materials), i = a(e.textures), o = a(e.images), s = a(e.shapes), c = a(e.skeletons), l = a(e.animations), u = a(e.nodes);
			t.length > 0 && (n.geometries = t), r.length > 0 && (n.materials = r), i.length > 0 && (n.textures = i), o.length > 0 && (n.images = o), s.length > 0 && (n.shapes = s), c.length > 0 && (n.skeletons = c), l.length > 0 && (n.animations = l), u.length > 0 && (n.nodes = u);
		}
		return n.object = r, n;
		function a(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
	}
	clone(e) {
		return new this.constructor().copy(this, e);
	}
	copy(e, t = !0) {
		if (this.name = e.name, this.up.copy(e.up), this.position.copy(e.position), this.rotation.order = e.rotation.order, this.quaternion.copy(e.quaternion), this.scale.copy(e.scale), this.pivot = e.pivot === null ? null : e.pivot.clone(), this.matrix.copy(e.matrix), this.matrixWorld.copy(e.matrixWorld), this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrixWorldAutoUpdate = e.matrixWorldAutoUpdate, this.matrixWorldNeedsUpdate = e.matrixWorldNeedsUpdate, this.layers.mask = e.layers.mask, this.visible = e.visible, this.castShadow = e.castShadow, this.receiveShadow = e.receiveShadow, this.frustumCulled = e.frustumCulled, this.renderOrder = e.renderOrder, this.static = e.static, this.animations = e.animations.slice(), this.userData = JSON.parse(JSON.stringify(e.userData)), t === !0) for (let t = 0; t < e.children.length; t++) {
			let n = e.children[t];
			this.add(n.clone());
		}
		return this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
};
ut.DEFAULT_UP = /*@__PURE__*/ new I(0, 1, 0), ut.DEFAULT_MATRIX_AUTO_UPDATE = !0, ut.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0;
var dt = class extends ut {
	constructor() {
		super(), this.isGroup = !0, this.type = "Group";
	}
}, ft = {
	aliceblue: 15792383,
	antiquewhite: 16444375,
	aqua: 65535,
	aquamarine: 8388564,
	azure: 15794175,
	beige: 16119260,
	bisque: 16770244,
	black: 0,
	blanchedalmond: 16772045,
	blue: 255,
	blueviolet: 9055202,
	brown: 10824234,
	burlywood: 14596231,
	cadetblue: 6266528,
	chartreuse: 8388352,
	chocolate: 13789470,
	coral: 16744272,
	cornflowerblue: 6591981,
	cornsilk: 16775388,
	crimson: 14423100,
	cyan: 65535,
	darkblue: 139,
	darkcyan: 35723,
	darkgoldenrod: 12092939,
	darkgray: 11119017,
	darkgreen: 25600,
	darkgrey: 11119017,
	darkkhaki: 12433259,
	darkmagenta: 9109643,
	darkolivegreen: 5597999,
	darkorange: 16747520,
	darkorchid: 10040012,
	darkred: 9109504,
	darksalmon: 15308410,
	darkseagreen: 9419919,
	darkslateblue: 4734347,
	darkslategray: 3100495,
	darkslategrey: 3100495,
	darkturquoise: 52945,
	darkviolet: 9699539,
	deeppink: 16716947,
	deepskyblue: 49151,
	dimgray: 6908265,
	dimgrey: 6908265,
	dodgerblue: 2003199,
	firebrick: 11674146,
	floralwhite: 16775920,
	forestgreen: 2263842,
	fuchsia: 16711935,
	gainsboro: 14474460,
	ghostwhite: 16316671,
	gold: 16766720,
	goldenrod: 14329120,
	gray: 8421504,
	green: 32768,
	greenyellow: 11403055,
	grey: 8421504,
	honeydew: 15794160,
	hotpink: 16738740,
	indianred: 13458524,
	indigo: 4915330,
	ivory: 16777200,
	khaki: 15787660,
	lavender: 15132410,
	lavenderblush: 16773365,
	lawngreen: 8190976,
	lemonchiffon: 16775885,
	lightblue: 11393254,
	lightcoral: 15761536,
	lightcyan: 14745599,
	lightgoldenrodyellow: 16448210,
	lightgray: 13882323,
	lightgreen: 9498256,
	lightgrey: 13882323,
	lightpink: 16758465,
	lightsalmon: 16752762,
	lightseagreen: 2142890,
	lightskyblue: 8900346,
	lightslategray: 7833753,
	lightslategrey: 7833753,
	lightsteelblue: 11584734,
	lightyellow: 16777184,
	lime: 65280,
	limegreen: 3329330,
	linen: 16445670,
	magenta: 16711935,
	maroon: 8388608,
	mediumaquamarine: 6737322,
	mediumblue: 205,
	mediumorchid: 12211667,
	mediumpurple: 9662683,
	mediumseagreen: 3978097,
	mediumslateblue: 8087790,
	mediumspringgreen: 64154,
	mediumturquoise: 4772300,
	mediumvioletred: 13047173,
	midnightblue: 1644912,
	mintcream: 16121850,
	mistyrose: 16770273,
	moccasin: 16770229,
	navajowhite: 16768685,
	navy: 128,
	oldlace: 16643558,
	olive: 8421376,
	olivedrab: 7048739,
	orange: 16753920,
	orangered: 16729344,
	orchid: 14315734,
	palegoldenrod: 15657130,
	palegreen: 10025880,
	paleturquoise: 11529966,
	palevioletred: 14381203,
	papayawhip: 16773077,
	peachpuff: 16767673,
	peru: 13468991,
	pink: 16761035,
	plum: 14524637,
	powderblue: 11591910,
	purple: 8388736,
	rebeccapurple: 6697881,
	red: 16711680,
	rosybrown: 12357519,
	royalblue: 4286945,
	saddlebrown: 9127187,
	salmon: 16416882,
	sandybrown: 16032864,
	seagreen: 3050327,
	seashell: 16774638,
	sienna: 10506797,
	silver: 12632256,
	skyblue: 8900331,
	slateblue: 6970061,
	slategray: 7372944,
	slategrey: 7372944,
	snow: 16775930,
	springgreen: 65407,
	steelblue: 4620980,
	tan: 13808780,
	teal: 32896,
	thistle: 14204888,
	tomato: 16737095,
	turquoise: 4251856,
	violet: 15631086,
	wheat: 16113331,
	white: 16777215,
	whitesmoke: 16119285,
	yellow: 16776960,
	yellowgreen: 10145074
}, pt = {
	h: 0,
	s: 0,
	l: 0
}, mt = {
	h: 0,
	s: 0,
	l: 0
};
function ht(e, t, n) {
	return n < 0 && (n += 1), n > 1 && --n, n < 1 / 6 ? e + (t - e) * 6 * n : n < 1 / 2 ? t : n < 2 / 3 ? e + (t - e) * 6 * (2 / 3 - n) : e;
}
var gt = class {
	constructor(e, t, n) {
		return this.isColor = !0, this.r = 1, this.g = 1, this.b = 1, this.set(e, t, n);
	}
	set(e, t, n) {
		if (t === void 0 && n === void 0) {
			let t = e;
			t && t.isColor ? this.copy(t) : typeof t == "number" ? this.setHex(t) : typeof t == "string" && this.setStyle(t);
		} else this.setRGB(e, t, n);
		return this;
	}
	setScalar(e) {
		return this.r = e, this.g = e, this.b = e, this;
	}
	setHex(e, t = O) {
		return e = Math.floor(e), this.r = (e >> 16 & 255) / 255, this.g = (e >> 8 & 255) / 255, this.b = (e & 255) / 255, Ee.colorSpaceToWorking(this, t), this;
	}
	setRGB(e, t, n, r = Ee.workingColorSpace) {
		return this.r = e, this.g = t, this.b = n, Ee.colorSpaceToWorking(this, r), this;
	}
	setHSL(e, t, n, r = Ee.workingColorSpace) {
		if (e = pe(e, 1), t = P(t, 0, 1), n = P(n, 0, 1), t === 0) this.r = this.g = this.b = n;
		else {
			let r = n <= .5 ? n * (1 + t) : n + t - n * t, i = 2 * n - r;
			this.r = ht(i, r, e + 1 / 3), this.g = ht(i, r, e), this.b = ht(i, r, e - 1 / 3);
		}
		return Ee.colorSpaceToWorking(this, r), this;
	}
	setStyle(e, t = O) {
		function n(t) {
			t !== void 0 && parseFloat(t) < 1 && j("Color: Alpha component of " + e + " will be ignored.");
		}
		let r;
		if (r = /^(\w+)\(([^\)]*)\)/.exec(e)) {
			let i, a = r[1], o = r[2];
			switch (a) {
				case "rgb":
				case "rgba":
					if (i = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(255, parseInt(i[1], 10)) / 255, Math.min(255, parseInt(i[2], 10)) / 255, Math.min(255, parseInt(i[3], 10)) / 255, t);
					if (i = /^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(100, parseFloat(i[1])) / 100, Math.min(100, parseFloat(i[2])) / 100, Math.min(100, parseFloat(i[3])) / 100, t);
					break;
				case "hsl":
				case "hsla":
					if (i = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o)) return n(i[4]), this.setHSL(parseFloat(i[1]) / 360, parseFloat(i[2]) / 100, parseFloat(i[3]) / 100, t);
					break;
				default: j("Color: Unknown color model " + e);
			}
		} else if (r = /^\#([A-Fa-f\d]+)$/.exec(e)) {
			let n = r[1], i = n.length;
			if (i === 3) return this.setRGB(parseInt(n.charAt(0), 16) / 15, parseInt(n.charAt(1), 16) / 15, parseInt(n.charAt(2), 16) / 15, t);
			if (i === 6) return this.setHex(parseInt(n, 16), t);
			j("Color: Invalid hex color " + e);
		} else if (e && e.length > 0) return this.setColorName(e, t);
		return this;
	}
	setColorName(e, t = O) {
		let n = ft[e.toLowerCase()];
		return n === void 0 ? j("Color: Unknown color " + e) : this.setHex(n, t), this;
	}
	clone() {
		return new this.constructor(this.r, this.g, this.b);
	}
	copy(e) {
		return this.r = e.r, this.g = e.g, this.b = e.b, this;
	}
	copySRGBToLinear(e) {
		return this.r = De(e.r), this.g = De(e.g), this.b = De(e.b), this;
	}
	copyLinearToSRGB(e) {
		return this.r = Oe(e.r), this.g = Oe(e.g), this.b = Oe(e.b), this;
	}
	convertSRGBToLinear() {
		return this.copySRGBToLinear(this), this;
	}
	convertLinearToSRGB() {
		return this.copyLinearToSRGB(this), this;
	}
	getHex(e = O) {
		return Ee.workingToColorSpace(_t.copy(this), e), Math.round(P(_t.r * 255, 0, 255)) * 65536 + Math.round(P(_t.g * 255, 0, 255)) * 256 + Math.round(P(_t.b * 255, 0, 255));
	}
	getHexString(e = O) {
		return ("000000" + this.getHex(e).toString(16)).slice(-6);
	}
	getHSL(e, t = Ee.workingColorSpace) {
		Ee.workingToColorSpace(_t.copy(this), t);
		let n = _t.r, r = _t.g, i = _t.b, a = Math.max(n, r, i), o = Math.min(n, r, i), s, c, l = (o + a) / 2;
		if (o === a) s = 0, c = 0;
		else {
			let e = a - o;
			switch (c = l <= .5 ? e / (a + o) : e / (2 - a - o), a) {
				case n:
					s = (r - i) / e + (r < i ? 6 : 0);
					break;
				case r:
					s = (i - n) / e + 2;
					break;
				case i: s = (n - r) / e + 4;
			}
			s /= 6;
		}
		return e.h = s, e.s = c, e.l = l, e;
	}
	getRGB(e, t = Ee.workingColorSpace) {
		return Ee.workingToColorSpace(_t.copy(this), t), e.r = _t.r, e.g = _t.g, e.b = _t.b, e;
	}
	getStyle(e = O) {
		Ee.workingToColorSpace(_t.copy(this), e);
		let t = _t.r, n = _t.g, r = _t.b;
		return e === "srgb" ? `rgb(${Math.round(t * 255)},${Math.round(n * 255)},${Math.round(r * 255)})` : `color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`;
	}
	offsetHSL(e, t, n) {
		return this.getHSL(pt), this.setHSL(pt.h + e, pt.s + t, pt.l + n);
	}
	add(e) {
		return this.r += e.r, this.g += e.g, this.b += e.b, this;
	}
	addColors(e, t) {
		return this.r = e.r + t.r, this.g = e.g + t.g, this.b = e.b + t.b, this;
	}
	addScalar(e) {
		return this.r += e, this.g += e, this.b += e, this;
	}
	sub(e) {
		return this.r = Math.max(0, this.r - e.r), this.g = Math.max(0, this.g - e.g), this.b = Math.max(0, this.b - e.b), this;
	}
	multiply(e) {
		return this.r *= e.r, this.g *= e.g, this.b *= e.b, this;
	}
	multiplyScalar(e) {
		return this.r *= e, this.g *= e, this.b *= e, this;
	}
	lerp(e, t) {
		return this.r += (e.r - this.r) * t, this.g += (e.g - this.g) * t, this.b += (e.b - this.b) * t, this;
	}
	lerpColors(e, t, n) {
		return this.r = e.r + (t.r - e.r) * n, this.g = e.g + (t.g - e.g) * n, this.b = e.b + (t.b - e.b) * n, this;
	}
	lerpHSL(e, t) {
		this.getHSL(pt), e.getHSL(mt);
		let n = me(pt.h, mt.h, t), r = me(pt.s, mt.s, t), i = me(pt.l, mt.l, t);
		return this.setHSL(n, r, i), this;
	}
	setFromVector3(e) {
		return this.r = e.x, this.g = e.y, this.b = e.z, this;
	}
	applyMatrix3(e) {
		let t = this.r, n = this.g, r = this.b, i = e.elements;
		return this.r = i[0] * t + i[3] * n + i[6] * r, this.g = i[1] * t + i[4] * n + i[7] * r, this.b = i[2] * t + i[5] * n + i[8] * r, this;
	}
	equals(e) {
		return e.r === this.r && e.g === this.g && e.b === this.b;
	}
	fromArray(e, t = 0) {
		return this.r = e[t], this.g = e[t + 1], this.b = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.r, e[t + 1] = this.g, e[t + 2] = this.b, e;
	}
	fromBufferAttribute(e, t) {
		return this.r = e.getX(t), this.g = e.getY(t), this.b = e.getZ(t), this;
	}
	toJSON() {
		return this.getHex();
	}
	*[Symbol.iterator]() {
		yield this.r, yield this.g, yield this.b;
	}
}, _t = /*@__PURE__*/ new gt();
gt.NAMES = ft;
var vt = class e {
	constructor(e, t = 25e-5) {
		this.isFogExp2 = !0, this.name = "", this.color = new gt(e), this.density = t;
	}
	clone() {
		return new e(this.color, this.density);
	}
	toJSON() {
		return {
			type: "FogExp2",
			name: this.name,
			color: this.color.getHex(),
			density: this.density
		};
	}
}, yt = class extends ut {
	constructor() {
		super(), this.isScene = !0, this.type = "Scene", this.background = null, this.environment = null, this.fog = null, this.backgroundBlurriness = 0, this.backgroundIntensity = 1, this.backgroundRotation = new qe(), this.environmentIntensity = 1, this.environmentRotation = new qe(), this.overrideMaterial = null, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	copy(e, t) {
		return super.copy(e, t), this.background = e.background === null ? null : e.background.clone(), this.environment = e.environment === null ? null : e.environment.clone(), this.fog = e.fog === null ? null : e.fog.clone(), this.backgroundBlurriness = e.backgroundBlurriness, this.backgroundIntensity = e.backgroundIntensity, this.backgroundRotation.copy(e.backgroundRotation), this.environmentIntensity = e.environmentIntensity, this.environmentRotation.copy(e.environmentRotation), this.overrideMaterial = e.overrideMaterial === null ? null : e.overrideMaterial.clone(), this.matrixAutoUpdate = e.matrixAutoUpdate, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return this.fog !== null && (t.object.fog = this.fog.toJSON()), t.object.backgroundBlurriness = this.backgroundBlurriness, t.object.backgroundIntensity = this.backgroundIntensity, t.object.backgroundRotation = this.backgroundRotation.toArray(), t.object.environmentIntensity = this.environmentIntensity, t.object.environmentRotation = this.environmentRotation.toArray(), t;
	}
}, bt = /*@__PURE__*/ new I(), xt = /*@__PURE__*/ new I(), St = /*@__PURE__*/ new I(), Ct = /*@__PURE__*/ new I(), wt = /*@__PURE__*/ new I(), Tt = /*@__PURE__*/ new I(), Et = /*@__PURE__*/ new I(), Dt = /*@__PURE__*/ new I(), Ot = /*@__PURE__*/ new I(), kt = /*@__PURE__*/ new I(), At = /*@__PURE__*/ new Le(), jt = /*@__PURE__*/ new Le(), Mt = /*@__PURE__*/ new Le(), Nt = class e {
	constructor(e = new I(), t = new I(), n = new I()) {
		this.a = e, this.b = t, this.c = n;
	}
	static getNormal(e, t, n, r) {
		r.subVectors(n, t), bt.subVectors(e, t), r.cross(bt);
		let i = r.lengthSq();
		return i > 0 ? r.multiplyScalar(1 / Math.sqrt(i)) : r.set(0, 0, 0);
	}
	static getBarycoord(e, t, n, r, i) {
		bt.subVectors(r, t), xt.subVectors(n, t), St.subVectors(e, t);
		let a = bt.dot(bt), o = bt.dot(xt), s = bt.dot(St), c = xt.dot(xt), l = xt.dot(St), u = a * c - o * o;
		if (u === 0) return i.set(0, 0, 0), null;
		let d = 1 / u, f = (c * s - o * l) * d, p = (a * l - o * s) * d;
		return i.set(1 - f - p, p, f);
	}
	static containsPoint(e, t, n, r) {
		return this.getBarycoord(e, t, n, r, Ct) !== null && Ct.x >= 0 && Ct.y >= 0 && Ct.x + Ct.y <= 1;
	}
	static getInterpolation(e, t, n, r, i, a, o, s) {
		return this.getBarycoord(e, t, n, r, Ct) === null ? (s.x = 0, s.y = 0, "z" in s && (s.z = 0), "w" in s && (s.w = 0), null) : (s.setScalar(0), s.addScaledVector(i, Ct.x), s.addScaledVector(a, Ct.y), s.addScaledVector(o, Ct.z), s);
	}
	static getInterpolatedAttribute(e, t, n, r, i, a) {
		return At.setScalar(0), jt.setScalar(0), Mt.setScalar(0), At.fromBufferAttribute(e, t), jt.fromBufferAttribute(e, n), Mt.fromBufferAttribute(e, r), a.setScalar(0), a.addScaledVector(At, i.x), a.addScaledVector(jt, i.y), a.addScaledVector(Mt, i.z), a;
	}
	static isFrontFacing(e, t, n, r) {
		return bt.subVectors(n, t), xt.subVectors(e, t), bt.cross(xt).dot(r) < 0;
	}
	set(e, t, n) {
		return this.a.copy(e), this.b.copy(t), this.c.copy(n), this;
	}
	setFromPointsAndIndices(e, t, n, r) {
		return this.a.copy(e[t]), this.b.copy(e[n]), this.c.copy(e[r]), this;
	}
	setFromAttributeAndIndices(e, t, n, r) {
		return this.a.fromBufferAttribute(e, t), this.b.fromBufferAttribute(e, n), this.c.fromBufferAttribute(e, r), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.a.copy(e.a), this.b.copy(e.b), this.c.copy(e.c), this;
	}
	getArea() {
		return bt.subVectors(this.c, this.b), xt.subVectors(this.a, this.b), bt.cross(xt).length() * .5;
	}
	getMidpoint(e) {
		return e.addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
	}
	getNormal(t) {
		return e.getNormal(this.a, this.b, this.c, t);
	}
	getPlane(e) {
		return e.setFromCoplanarPoints(this.a, this.b, this.c);
	}
	getBarycoord(t, n) {
		return e.getBarycoord(t, this.a, this.b, this.c, n);
	}
	getInterpolation(t, n, r, i, a) {
		return e.getInterpolation(t, this.a, this.b, this.c, n, r, i, a);
	}
	containsPoint(t) {
		return e.containsPoint(t, this.a, this.b, this.c);
	}
	isFrontFacing(t) {
		return e.isFrontFacing(this.a, this.b, this.c, t);
	}
	intersectsBox(e) {
		return e.intersectsTriangle(this);
	}
	closestPointToPoint(e, t) {
		let n = this.a, r = this.b, i = this.c, a, o;
		wt.subVectors(r, n), Tt.subVectors(i, n), Dt.subVectors(e, n);
		let s = wt.dot(Dt), c = Tt.dot(Dt);
		if (s <= 0 && c <= 0) return t.copy(n);
		Ot.subVectors(e, r);
		let l = wt.dot(Ot), u = Tt.dot(Ot);
		if (l >= 0 && u <= l) return t.copy(r);
		let d = s * u - l * c;
		if (d <= 0 && s >= 0 && l <= 0 && s - l > 0) return a = s / (s - l), t.copy(n).addScaledVector(wt, a);
		kt.subVectors(e, i);
		let f = wt.dot(kt), p = Tt.dot(kt);
		if (p >= 0 && f <= p) return t.copy(i);
		let m = f * c - s * p;
		if (m <= 0 && c >= 0 && p <= 0) return o = c / (c - p), t.copy(n).addScaledVector(Tt, o);
		let h = l * p - f * u;
		if (h <= 0 && u - l >= 0 && f - p >= 0) return Et.subVectors(i, r), o = (u - l) / (u - l + (f - p)), t.copy(r).addScaledVector(Et, o);
		let g = 1 / (h + m + d);
		return a = m * g, o = d * g, t.copy(n).addScaledVector(wt, a).addScaledVector(Tt, o);
	}
	equals(e) {
		return e.a.equals(this.a) && e.b.equals(this.b) && e.c.equals(this.c);
	}
}, Pt = class {
	constructor(e = new I(Infinity, Infinity, Infinity), t = new I(-Infinity, -Infinity, -Infinity)) {
		this.isBox3 = !0, this.min = e, this.max = t;
	}
	set(e, t) {
		return this.min.copy(e), this.max.copy(t), this;
	}
	setFromArray(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t += 3) this.expandByPoint(It.fromArray(e, t));
		return this;
	}
	setFromBufferAttribute(e) {
		this.makeEmpty();
		for (let t = 0, n = e.count; t < n; t++) this.expandByPoint(It.fromBufferAttribute(e, t));
		return this;
	}
	setFromPoints(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t++) this.expandByPoint(e[t]);
		return this;
	}
	setFromCenterAndSize(e, t) {
		let n = It.copy(t).multiplyScalar(.5);
		return this.min.copy(e).sub(n), this.max.copy(e).add(n), this;
	}
	setFromObject(e, t = !1) {
		return this.makeEmpty(), this.expandByObject(e, t);
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.min.copy(e.min), this.max.copy(e.max), this;
	}
	makeEmpty() {
		return this.min.x = this.min.y = this.min.z = Infinity, this.max.x = this.max.y = this.max.z = -Infinity, this;
	}
	isEmpty() {
		return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
	}
	getCenter(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.addVectors(this.min, this.max).multiplyScalar(.5);
	}
	getSize(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.subVectors(this.max, this.min);
	}
	expandByPoint(e) {
		return this.min.min(e), this.max.max(e), this;
	}
	expandByVector(e) {
		return this.min.sub(e), this.max.add(e), this;
	}
	expandByScalar(e) {
		return this.min.addScalar(-e), this.max.addScalar(e), this;
	}
	expandByObject(e, t = !1) {
		e.updateWorldMatrix(!1, !1);
		let n = e.geometry;
		if (n !== void 0) {
			let r = n.getAttribute("position");
			if (t === !0 && r !== void 0 && e.isInstancedMesh !== !0 && e.isBatchedMesh !== !0) for (let t = 0, n = r.count; t < n; t++) e.isMesh === !0 ? e.getVertexPosition(t, It) : It.fromBufferAttribute(r, t), It.applyMatrix4(e.matrixWorld), this.expandByPoint(It);
			else e.boundingBox === void 0 ? (n.boundingBox === null && n.computeBoundingBox(), Lt.copy(n.boundingBox)) : (e.boundingBox === null && e.computeBoundingBox(), Lt.copy(e.boundingBox)), Lt.applyMatrix4(e.matrixWorld), this.union(Lt);
		}
		let r = e.children;
		for (let e = 0, n = r.length; e < n; e++) this.expandByObject(r[e], t);
		return this;
	}
	containsPoint(e) {
		return e.x >= this.min.x && e.x <= this.max.x && e.y >= this.min.y && e.y <= this.max.y && e.z >= this.min.z && e.z <= this.max.z;
	}
	containsBox(e) {
		return this.min.x <= e.min.x && e.max.x <= this.max.x && this.min.y <= e.min.y && e.max.y <= this.max.y && this.min.z <= e.min.z && e.max.z <= this.max.z;
	}
	getParameter(e, t) {
		return t.set((e.x - this.min.x) / (this.max.x - this.min.x), (e.y - this.min.y) / (this.max.y - this.min.y), (e.z - this.min.z) / (this.max.z - this.min.z));
	}
	intersectsBox(e) {
		return e.max.x >= this.min.x && e.min.x <= this.max.x && e.max.y >= this.min.y && e.min.y <= this.max.y && e.max.z >= this.min.z && e.min.z <= this.max.z;
	}
	intersectsSphere(e) {
		return this.clampPoint(e.center, It), It.distanceToSquared(e.center) <= e.radius * e.radius;
	}
	intersectsPlane(e) {
		let t, n;
		return e.normal.x > 0 ? (t = e.normal.x * this.min.x, n = e.normal.x * this.max.x) : (t = e.normal.x * this.max.x, n = e.normal.x * this.min.x), e.normal.y > 0 ? (t += e.normal.y * this.min.y, n += e.normal.y * this.max.y) : (t += e.normal.y * this.max.y, n += e.normal.y * this.min.y), e.normal.z > 0 ? (t += e.normal.z * this.min.z, n += e.normal.z * this.max.z) : (t += e.normal.z * this.max.z, n += e.normal.z * this.min.z), t <= -e.constant && n >= -e.constant;
	}
	intersectsTriangle(e) {
		if (this.isEmpty()) return !1;
		this.getCenter(Wt), Gt.subVectors(this.max, Wt), Rt.subVectors(e.a, Wt), zt.subVectors(e.b, Wt), Bt.subVectors(e.c, Wt), Vt.subVectors(zt, Rt), Ht.subVectors(Bt, zt), Ut.subVectors(Rt, Bt);
		let t = [
			0,
			-Vt.z,
			Vt.y,
			0,
			-Ht.z,
			Ht.y,
			0,
			-Ut.z,
			Ut.y,
			Vt.z,
			0,
			-Vt.x,
			Ht.z,
			0,
			-Ht.x,
			Ut.z,
			0,
			-Ut.x,
			-Vt.y,
			Vt.x,
			0,
			-Ht.y,
			Ht.x,
			0,
			-Ut.y,
			Ut.x,
			0
		];
		return !Jt(t, Rt, zt, Bt, Gt) || (t = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], !Jt(t, Rt, zt, Bt, Gt)) ? !1 : (Kt.crossVectors(Vt, Ht), t = [
			Kt.x,
			Kt.y,
			Kt.z
		], Jt(t, Rt, zt, Bt, Gt));
	}
	clampPoint(e, t) {
		return t.copy(e).clamp(this.min, this.max);
	}
	distanceToPoint(e) {
		return this.clampPoint(e, It).distanceTo(e);
	}
	getBoundingSphere(e) {
		return this.isEmpty() ? e.makeEmpty() : (this.getCenter(e.center), e.radius = this.getSize(It).length() * .5), e;
	}
	intersect(e) {
		return this.min.max(e.min), this.max.min(e.max), this.isEmpty() && this.makeEmpty(), this;
	}
	union(e) {
		return this.min.min(e.min), this.max.max(e.max), this;
	}
	applyMatrix4(e) {
		return this.isEmpty() || (Ft[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(e), Ft[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(e), Ft[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(e), Ft[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(e), Ft[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(e), Ft[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(e), Ft[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(e), Ft[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(e), this.setFromPoints(Ft)), this;
	}
	translate(e) {
		return this.min.add(e), this.max.add(e), this;
	}
	equals(e) {
		return e.min.equals(this.min) && e.max.equals(this.max);
	}
	toJSON() {
		return {
			min: this.min.toArray(),
			max: this.max.toArray()
		};
	}
	fromJSON(e) {
		return this.min.fromArray(e.min), this.max.fromArray(e.max), this;
	}
}, Ft = [
	/*@__PURE__*/ new I(),
	/*@__PURE__*/ new I(),
	/*@__PURE__*/ new I(),
	/*@__PURE__*/ new I(),
	/*@__PURE__*/ new I(),
	/*@__PURE__*/ new I(),
	/*@__PURE__*/ new I(),
	/*@__PURE__*/ new I()
], It = /*@__PURE__*/ new I(), Lt = /*@__PURE__*/ new Pt(), Rt = /*@__PURE__*/ new I(), zt = /*@__PURE__*/ new I(), Bt = /*@__PURE__*/ new I(), Vt = /*@__PURE__*/ new I(), Ht = /*@__PURE__*/ new I(), Ut = /*@__PURE__*/ new I(), Wt = /*@__PURE__*/ new I(), Gt = /*@__PURE__*/ new I(), Kt = /*@__PURE__*/ new I(), qt = /*@__PURE__*/ new I();
function Jt(e, t, n, r, i) {
	for (let a = 0, o = e.length - 3; a <= o; a += 3) {
		qt.fromArray(e, a);
		let o = i.x * Math.abs(qt.x) + i.y * Math.abs(qt.y) + i.z * Math.abs(qt.z), s = t.dot(qt), c = n.dot(qt), l = r.dot(qt);
		if (Math.max(-Math.max(s, c, l), Math.min(s, c, l)) > o) return !1;
	}
	return !0;
}
var R = /*@__PURE__*/ new I(), Yt = /*@__PURE__*/ new F(), Xt = 0, Zt = class extends de {
	constructor(e, t, n = !1) {
		if (super(), Array.isArray(e)) throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");
		this.isBufferAttribute = !0, Object.defineProperty(this, "id", { value: Xt++ }), this.name = "", this.array = e, this.itemSize = t, this.count = e === void 0 ? 0 : e.length / t, this.normalized = n, this.usage = ne, this.updateRanges = [], this.gpuType = v, this.version = 0, this._normalizationScale = e === void 0 ? void 0 : he(e);
	}
	onUploadCallback() {}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	setUsage(e) {
		return this.usage = e, this;
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	copy(e) {
		return this.name = e.name, this.array = new e.array.constructor(e.array), this.itemSize = e.itemSize, this.count = e.count, this.normalized = e.normalized, this.usage = e.usage, this.gpuType = e.gpuType, this._normalizationScale = e._normalizationScale, this;
	}
	copyAt(e, t, n) {
		e *= this.itemSize, n *= t.itemSize;
		for (let r = 0, i = this.itemSize; r < i; r++) this.array[e + r] = t.array[n + r];
		return this;
	}
	copyArray(e) {
		return this.array.set(e), this;
	}
	applyMatrix3(e) {
		if (this.itemSize === 2) for (let t = 0, n = this.count; t < n; t++) Yt.fromBufferAttribute(this, t), Yt.applyMatrix3(e), this.setXY(t, Yt.x, Yt.y);
		else if (this.itemSize === 3) for (let t = 0, n = this.count; t < n; t++) R.fromBufferAttribute(this, t), R.applyMatrix3(e), this.setXYZ(t, R.x, R.y, R.z);
		return this;
	}
	applyMatrix4(e) {
		for (let t = 0, n = this.count; t < n; t++) R.fromBufferAttribute(this, t), R.applyMatrix4(e), this.setXYZ(t, R.x, R.y, R.z);
		return this;
	}
	applyNormalMatrix(e) {
		for (let t = 0, n = this.count; t < n; t++) R.fromBufferAttribute(this, t), R.applyNormalMatrix(e), this.setXYZ(t, R.x, R.y, R.z);
		return this;
	}
	transformDirection(e) {
		for (let t = 0, n = this.count; t < n; t++) R.fromBufferAttribute(this, t), R.transformDirection(e), this.setXYZ(t, R.x, R.y, R.z);
		return this;
	}
	set(e, t = 0) {
		return this.array.set(e, t), this;
	}
	getComponent(e, t) {
		let n = this.array[e * this.itemSize + t];
		return this.normalized && (n = this._denormalize(n)), n;
	}
	setComponent(e, t, n) {
		return this.normalized && (n = this._normalize(n)), this.array[e * this.itemSize + t] = n, this;
	}
	getX(e) {
		let t = this.array[e * this.itemSize];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	setX(e, t) {
		return this.normalized && (t = this._normalize(t)), this.array[e * this.itemSize] = t, this;
	}
	getY(e) {
		let t = this.array[e * this.itemSize + 1];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	setY(e, t) {
		return this.normalized && (t = this._normalize(t)), this.array[e * this.itemSize + 1] = t, this;
	}
	getZ(e) {
		let t = this.array[e * this.itemSize + 2];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	setZ(e, t) {
		return this.normalized && (t = this._normalize(t)), this.array[e * this.itemSize + 2] = t, this;
	}
	getW(e) {
		let t = this.array[e * this.itemSize + 3];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	setW(e, t) {
		return this.normalized && (t = this._normalize(t)), this.array[e * this.itemSize + 3] = t, this;
	}
	setXY(e, t, n) {
		return e *= this.itemSize, this.normalized && (t = this._normalize(t), n = this._normalize(n)), this.array[e + 0] = t, this.array[e + 1] = n, this;
	}
	setXYZ(e, t, n, r) {
		return e *= this.itemSize, this.normalized && (t = this._normalize(t), n = this._normalize(n), r = this._normalize(r)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this;
	}
	setXYZW(e, t, n, r, i) {
		return e *= this.itemSize, this.normalized && (t = this._normalize(t), n = this._normalize(n), r = this._normalize(r), i = this._normalize(i)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this.array[e + 3] = i, this;
	}
	onUpload(e) {
		return this.onUploadCallback = e, this;
	}
	clone() {
		return new this.constructor(this.array, this.itemSize).copy(this);
	}
	toJSON() {
		let e = {
			itemSize: this.itemSize,
			type: this.array.constructor.name,
			array: Array.from(this.array),
			normalized: this.normalized
		};
		return e.name = this.name, e.usage = this.usage, e.gpuType = this.gpuType, e;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	_denormalize(e) {
		let t = this._normalizationScale;
		return t === void 0 ? ge(e, this.array) : Math.max(e / t, -1);
	}
	_normalize(e) {
		let t = this._normalizationScale;
		return t === void 0 ? _e(e, this.array) : Math.round(e * t);
	}
}, Qt = class extends Zt {
	constructor(e, t, n) {
		super(new Uint16Array(e), t, n);
	}
}, $t = class extends Zt {
	constructor(e, t, n) {
		super(new Uint32Array(e), t, n);
	}
}, en = class extends Zt {
	constructor(e, t, n) {
		super(new Float32Array(e), t, n);
	}
}, tn = /*@__PURE__*/ new Pt(), nn = /*@__PURE__*/ new I(), rn = /*@__PURE__*/ new I(), an = class {
	constructor(e = new I(), t = -1) {
		this.isSphere = !0, this.center = e, this.radius = t;
	}
	set(e, t) {
		return this.center.copy(e), this.radius = t, this;
	}
	setFromPoints(e, t) {
		let n = this.center;
		t === void 0 ? tn.setFromPoints(e).getCenter(n) : n.copy(t);
		let r = 0;
		for (let t = 0, i = e.length; t < i; t++) r = Math.max(r, n.distanceToSquared(e[t]));
		return this.radius = Math.sqrt(r), this;
	}
	copy(e) {
		return this.center.copy(e.center), this.radius = e.radius, this;
	}
	isEmpty() {
		return this.radius < 0;
	}
	makeEmpty() {
		return this.center.set(0, 0, 0), this.radius = -1, this;
	}
	containsPoint(e) {
		return e.distanceToSquared(this.center) <= this.radius * this.radius;
	}
	distanceToPoint(e) {
		return e.distanceTo(this.center) - this.radius;
	}
	intersectsSphere(e) {
		let t = this.radius + e.radius;
		return e.center.distanceToSquared(this.center) <= t * t;
	}
	intersectsBox(e) {
		return e.intersectsSphere(this);
	}
	intersectsPlane(e) {
		return Math.abs(e.distanceToPoint(this.center)) <= this.radius;
	}
	clampPoint(e, t) {
		let n = this.center.distanceToSquared(e);
		return t.copy(e), n > this.radius * this.radius && (t.sub(this.center).normalize(), t.multiplyScalar(this.radius).add(this.center)), t;
	}
	getBoundingBox(e) {
		return this.isEmpty() ? (e.makeEmpty(), e) : (e.set(this.center, this.center), e.expandByScalar(this.radius), e);
	}
	applyMatrix4(e) {
		return this.center.applyMatrix4(e), this.radius *= e.getMaxScaleOnAxis(), this;
	}
	translate(e) {
		return this.center.add(e), this;
	}
	expandByPoint(e) {
		if (this.isEmpty()) return this.center.copy(e), this.radius = 0, this;
		nn.subVectors(e, this.center);
		let t = nn.lengthSq();
		if (t > this.radius * this.radius) {
			let e = Math.sqrt(t), n = (e - this.radius) * .5;
			this.center.addScaledVector(nn, n / e), this.radius += n;
		}
		return this;
	}
	union(e) {
		return e.isEmpty() ? this : this.isEmpty() ? (this.copy(e), this) : (this.center.equals(e.center) === !0 ? this.radius = Math.max(this.radius, e.radius) : (rn.subVectors(e.center, this.center).setLength(e.radius), this.expandByPoint(nn.copy(e.center).add(rn)), this.expandByPoint(nn.copy(e.center).sub(rn))), this);
	}
	equals(e) {
		return e.center.equals(this.center) && e.radius === this.radius;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		return {
			radius: this.radius,
			center: this.center.toArray()
		};
	}
	fromJSON(e) {
		return this.radius = e.radius, this.center.fromArray(e.center), this;
	}
}, on = 0, sn = /*@__PURE__*/ new L(), cn = /*@__PURE__*/ new ut(), ln = /*@__PURE__*/ new I(), un = /*@__PURE__*/ new Pt(), dn = /*@__PURE__*/ new Pt(), fn = /*@__PURE__*/ new I(), pn = class e extends de {
	constructor() {
		super(), this.isBufferGeometry = !0, Object.defineProperty(this, "id", { value: on++ }), this.uuid = fe(), this.name = "", this.type = "BufferGeometry", this.index = null, this.indirect = null, this.indirectOffset = 0, this.attributes = {}, this.morphAttributes = {}, this.morphTargetsRelative = !1, this.groups = [], this.boundingBox = null, this.boundingSphere = null, this.drawRange = {
			start: 0,
			count: Infinity
		}, this.userData = {}, this._transformed = !1;
	}
	getIndex() {
		return this.index;
	}
	setIndex(e) {
		return this.index = Array.isArray(e) ? new (ie(e) ? $t : Qt)(e, 1) : e, this;
	}
	setIndirect(e, t = 0) {
		return this.indirect = e, this.indirectOffset = t, this;
	}
	getIndirect() {
		return this.indirect;
	}
	getAttribute(e) {
		return this.attributes[e];
	}
	setAttribute(e, t) {
		return this.attributes[e] = t, this;
	}
	deleteAttribute(e) {
		return delete this.attributes[e], this;
	}
	hasAttribute(e) {
		return this.attributes[e] !== void 0;
	}
	addGroup(e, t, n = 0) {
		this.groups.push({
			start: e,
			count: t,
			materialIndex: n
		});
	}
	clearGroups() {
		this.groups = [];
	}
	setDrawRange(e, t) {
		this.drawRange.start = e, this.drawRange.count = t;
	}
	applyMatrix4(e) {
		let t = this.attributes.position;
		t !== void 0 && (t.applyMatrix4(e), t.needsUpdate = !0);
		let n = this.attributes.normal;
		if (n !== void 0) {
			let t = new xe().getNormalMatrix(e);
			n.applyNormalMatrix(t), n.needsUpdate = !0;
		}
		let r = this.attributes.tangent;
		return r !== void 0 && (r.transformDirection(e), r.needsUpdate = !0), this.boundingBox !== null && this.computeBoundingBox(), this.boundingSphere !== null && this.computeBoundingSphere(), this._transformed = !0, this;
	}
	applyQuaternion(e) {
		return sn.makeRotationFromQuaternion(e), this.applyMatrix4(sn), this;
	}
	rotateX(e) {
		return sn.makeRotationX(e), this.applyMatrix4(sn), this;
	}
	rotateY(e) {
		return sn.makeRotationY(e), this.applyMatrix4(sn), this;
	}
	rotateZ(e) {
		return sn.makeRotationZ(e), this.applyMatrix4(sn), this;
	}
	translate(e, t, n) {
		return sn.makeTranslation(e, t, n), this.applyMatrix4(sn), this;
	}
	scale(e, t, n) {
		return sn.makeScale(e, t, n), this.applyMatrix4(sn), this;
	}
	lookAt(e) {
		return cn.lookAt(e), cn.updateMatrix(), this.applyMatrix4(cn.matrix), this;
	}
	center() {
		return this.computeBoundingBox(), this.boundingBox.getCenter(ln).negate(), this.translate(ln.x, ln.y, ln.z), this;
	}
	setFromPoints(e) {
		let t = this.getAttribute("position");
		if (t === void 0) {
			let t = [];
			for (let n = 0, r = e.length; n < r; n++) {
				let r = e[n];
				t.push(r.x, r.y, r.z || 0);
			}
			this.setAttribute("position", new en(t, 3));
		} else {
			let n = Math.min(e.length, t.count);
			for (let r = 0; r < n; r++) {
				let n = e[r];
				t.setXYZ(r, n.x, n.y, n.z || 0);
			}
			e.length > t.count && j("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."), t.needsUpdate = !0;
		}
		return this;
	}
	computeBoundingBox() {
		this.boundingBox === null && (this.boundingBox = new Pt());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) M("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.", this), this.boundingBox.set(new I(-Infinity, -Infinity, -Infinity), new I(Infinity, Infinity, Infinity));
		else {
			if (e !== void 0) {
				if (this.boundingBox.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
					let n = t[e];
					un.setFromBufferAttribute(n), this.morphTargetsRelative ? (fn.addVectors(this.boundingBox.min, un.min), this.boundingBox.expandByPoint(fn), fn.addVectors(this.boundingBox.max, un.max), this.boundingBox.expandByPoint(fn)) : (this.boundingBox.expandByPoint(un.min), this.boundingBox.expandByPoint(un.max));
				}
			} else this.boundingBox.makeEmpty();
			(isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) && M("BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The \"position\" attribute is likely to have NaN values.", this);
		}
	}
	computeBoundingSphere() {
		this.boundingSphere === null && (this.boundingSphere = new an());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) M("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.", this), this.boundingSphere.set(new I(), Infinity);
		else if (e) {
			let n = this.boundingSphere.center;
			if (un.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
				let n = t[e];
				dn.setFromBufferAttribute(n), this.morphTargetsRelative ? (fn.addVectors(un.min, dn.min), un.expandByPoint(fn), fn.addVectors(un.max, dn.max), un.expandByPoint(fn)) : (un.expandByPoint(dn.min), un.expandByPoint(dn.max));
			}
			un.getCenter(n);
			let r = 0;
			for (let t = 0, i = e.count; t < i; t++) fn.fromBufferAttribute(e, t), r = Math.max(r, n.distanceToSquared(fn));
			if (t) for (let i = 0, a = t.length; i < a; i++) {
				let a = t[i], o = this.morphTargetsRelative;
				for (let t = 0, i = a.count; t < i; t++) fn.fromBufferAttribute(a, t), o && (ln.fromBufferAttribute(e, t), fn.add(ln)), r = Math.max(r, n.distanceToSquared(fn));
			}
			this.boundingSphere.radius = Math.sqrt(r), isNaN(this.boundingSphere.radius) && M("BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The \"position\" attribute is likely to have NaN values.", this);
		}
	}
	computeTangents() {
		let e = this.index, t = this.attributes;
		if (e === null || t.position === void 0 || t.normal === void 0 || t.uv === void 0) {
			M("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");
			return;
		}
		let n = t.position, r = t.normal, i = t.uv, a = this.getAttribute("tangent");
		(a === void 0 || a.count !== n.count) && (a = new Zt(new Float32Array(4 * n.count), 4), this.setAttribute("tangent", a));
		let o = [], s = [], c = new Uint8Array(n.count);
		for (let e = 0; e < n.count; e++) o[e] = new I(), s[e] = new I();
		let l = new I(), u = new I(), d = new I(), f = new F(), p = new F(), m = new F(), h = new I(), g = new I();
		function _(e, t, r) {
			c[e] = c[t] = c[r] = 1, l.fromBufferAttribute(n, e), u.fromBufferAttribute(n, t), d.fromBufferAttribute(n, r), f.fromBufferAttribute(i, e), p.fromBufferAttribute(i, t), m.fromBufferAttribute(i, r), u.sub(l), d.sub(l), p.sub(f), m.sub(f);
			let a = 1 / (p.x * m.y - m.x * p.y);
			isFinite(a) && (h.copy(u).multiplyScalar(m.y).addScaledVector(d, -p.y).multiplyScalar(a), g.copy(d).multiplyScalar(p.x).addScaledVector(u, -m.x).multiplyScalar(a), o[e].add(h), o[t].add(h), o[r].add(h), s[e].add(g), s[t].add(g), s[r].add(g));
		}
		let v = this.groups;
		v.length === 0 && (v = [{
			start: 0,
			count: e.count
		}]);
		for (let t = 0, n = v.length; t < n; ++t) {
			let n = v[t], r = n.start, i = n.count;
			for (let t = r, n = r + i; t < n; t += 3) _(e.getX(t + 0), e.getX(t + 1), e.getX(t + 2));
		}
		let y = new I(), b = new I(), x = new I(), S = new I();
		function C(e) {
			x.fromBufferAttribute(r, e), S.copy(x);
			let t = o[e];
			y.copy(t), y.sub(x.multiplyScalar(x.dot(t))).normalize(), b.crossVectors(S, t);
			let n = b.dot(s[e]) < 0 ? -1 : 1;
			a.setXYZW(e, y.x, y.y, y.z, n);
		}
		for (let e = 0, t = n.count; e < t; ++e) c[e] && C(e);
		this._transformed = !0;
	}
	computeVertexNormals() {
		let e = this.index, t = this.getAttribute("position");
		if (t !== void 0) {
			let n = this.getAttribute("normal");
			if (n === void 0 || n.count !== t.count) n = new Zt(new Float32Array(t.count * 3), 3), this.setAttribute("normal", n);
			else for (let e = 0, t = n.count; e < t; e++) n.setXYZ(e, 0, 0, 0);
			let r = new I(), i = new I(), a = new I(), o = new I(), s = new I(), c = new I(), l = new I(), u = new I();
			if (e) for (let d = 0, f = e.count; d < f; d += 3) {
				let f = e.getX(d + 0), p = e.getX(d + 1), m = e.getX(d + 2);
				r.fromBufferAttribute(t, f), i.fromBufferAttribute(t, p), a.fromBufferAttribute(t, m), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), o.fromBufferAttribute(n, f), s.fromBufferAttribute(n, p), c.fromBufferAttribute(n, m), o.add(l), s.add(l), c.add(l), n.setXYZ(f, o.x, o.y, o.z), n.setXYZ(p, s.x, s.y, s.z), n.setXYZ(m, c.x, c.y, c.z);
			}
			else for (let e = 0, o = t.count; e < o; e += 3) r.fromBufferAttribute(t, e + 0), i.fromBufferAttribute(t, e + 1), a.fromBufferAttribute(t, e + 2), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), n.setXYZ(e + 0, l.x, l.y, l.z), n.setXYZ(e + 1, l.x, l.y, l.z), n.setXYZ(e + 2, l.x, l.y, l.z);
			this.normalizeNormals(), n.needsUpdate = !0;
		}
	}
	normalizeNormals() {
		let e = this.attributes.normal;
		for (let t = 0, n = e.count; t < n; t++) fn.fromBufferAttribute(e, t), fn.normalize(), e.setXYZ(t, fn.x, fn.y, fn.z);
	}
	toNonIndexed() {
		function t(e, t) {
			let n = e.array, r = e.itemSize, i = e.normalized, a = new n.constructor(t.length * r), o = 0, s = 0;
			for (let i = 0, c = t.length; i < c; i++) {
				o = e.isInterleavedBufferAttribute ? t[i] * e.data.stride + e.offset : t[i] * r;
				for (let e = 0; e < r; e++) a[s++] = n[o++];
			}
			return new Zt(a, r, i);
		}
		if (this.index === null) return j("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."), this;
		let n = new e(), r = this.index.array, i = this.attributes;
		for (let e in i) {
			let a = i[e], o = t(a, r);
			n.setAttribute(e, o);
		}
		let a = this.morphAttributes;
		for (let e in a) {
			let i = [], o = a[e];
			for (let e = 0, n = o.length; e < n; e++) {
				let n = o[e], a = t(n, r);
				i.push(a);
			}
			n.morphAttributes[e] = i;
		}
		n.morphTargetsRelative = this.morphTargetsRelative;
		let o = this.groups;
		for (let e = 0, t = o.length; e < t; e++) {
			let t = o[e];
			n.addGroup(t.start, t.count, t.materialIndex);
		}
		return n;
	}
	toJSON() {
		let e = { metadata: {
			version: 4.7,
			type: "BufferGeometry",
			generator: "BufferGeometry.toJSON"
		} };
		if (e.uuid = this.uuid, e.type = this.parameters !== void 0 && this._transformed === !0 ? "BufferGeometry" : this.type, e.name = this.name, Object.keys(this.userData).length > 0 && (e.userData = this.userData), this.parameters !== void 0 && this._transformed !== !0) {
			let t = this.parameters;
			for (let n in t) t[n] !== void 0 && (e[n] = t[n]);
			return e;
		}
		e.data = { attributes: {} };
		let t = this.index;
		t !== null && (e.data.index = {
			type: t.array.constructor.name,
			array: Array.prototype.slice.call(t.array)
		});
		let n = this.attributes;
		for (let t in n) {
			let r = n[t];
			e.data.attributes[t] = r.toJSON(e.data);
		}
		let r = {}, i = !1;
		for (let t in this.morphAttributes) {
			let n = this.morphAttributes[t], a = [];
			for (let t = 0, r = n.length; t < r; t++) {
				let r = n[t];
				a.push(r.toJSON(e.data));
			}
			a.length > 0 && (r[t] = a, i = !0);
		}
		i && (e.data.morphAttributes = r, e.data.morphTargetsRelative = this.morphTargetsRelative);
		let a = this.groups;
		a.length > 0 && (e.data.groups = JSON.parse(JSON.stringify(a)));
		let o = this.boundingSphere;
		return o !== null && (e.data.boundingSphere = o.toJSON()), e;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.index = null, this.attributes = {}, this.morphAttributes = {}, this.groups = [], this.boundingBox = null, this.boundingSphere = null;
		let t = {};
		this.name = e.name;
		let n = e.index;
		n !== null && this.setIndex(n.clone());
		let r = e.attributes;
		for (let e in r) {
			let n = r[e];
			this.setAttribute(e, n.clone(t));
		}
		let i = e.morphAttributes;
		for (let e in i) {
			let n = [], r = i[e];
			for (let e = 0, i = r.length; e < i; e++) n.push(r[e].clone(t));
			this.morphAttributes[e] = n;
		}
		this.morphTargetsRelative = e.morphTargetsRelative;
		let a = e.groups;
		for (let e = 0, t = a.length; e < t; e++) {
			let t = a[e];
			this.addGroup(t.start, t.count, t.materialIndex);
		}
		let o = e.boundingBox;
		o !== null && (this.boundingBox = o.clone());
		let s = e.boundingSphere;
		return s !== null && (this.boundingSphere = s.clone()), this.drawRange.start = e.drawRange.start, this.drawRange.count = e.drawRange.count, this.userData = e.userData, this._transformed = e._transformed, this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, mn = class {
	constructor(e, t) {
		this.isInterleavedBuffer = !0, this.array = e, this.stride = t, this.count = e === void 0 ? 0 : e.length / t, this.usage = ne, this.updateRanges = [], this.version = 0, this.uuid = fe();
	}
	onUploadCallback() {}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	setUsage(e) {
		return this.usage = e, this;
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	copy(e) {
		return this.array = new e.array.constructor(e.array), this.count = e.count, this.stride = e.stride, this.usage = e.usage, this;
	}
	copyAt(e, t, n) {
		e *= this.stride, n *= t.stride;
		for (let r = 0, i = this.stride; r < i; r++) this.array[e + r] = t.array[n + r];
		return this;
	}
	set(e, t = 0) {
		return this.array.set(e, t), this;
	}
	clone(e) {
		e.arrayBuffers === void 0 && (e.arrayBuffers = {});
		let t = hn(this.array);
		e.arrayBuffers[t] === void 0 && (e.arrayBuffers[t] = this.array.slice(0).buffer);
		let n = new this.array.constructor(e.arrayBuffers[t]), r = new this.constructor(n, this.stride);
		return r.setUsage(this.usage), r;
	}
	onUpload(e) {
		return this.onUploadCallback = e, this;
	}
	toJSON(e) {
		e.arrayBuffers === void 0 && (e.arrayBuffers = {});
		let t = hn(this.array);
		e.arrayBuffers[t] === void 0 && (e.arrayBuffers[t] = Array.from(new Uint32Array(this.array.slice(0).buffer)));
		let n = {
			uuid: this.uuid,
			buffer: t,
			type: this.array.constructor.name,
			stride: this.stride
		};
		return n.usage = this.usage, n;
	}
};
function hn(e) {
	return e.buffer._uuid === void 0 && (e.buffer._uuid = fe()), e.byteOffset === 0 && e.byteLength === e.buffer.byteLength ? e.buffer._uuid : e.buffer._uuid + ":" + e.byteOffset + ":" + e.byteLength;
}
var gn = /*@__PURE__*/ new I(), _n = class e {
	constructor(e, t, n, r = !1) {
		this.isInterleavedBufferAttribute = !0, this.name = "", this.data = e, this.itemSize = t, this.offset = n, this.normalized = r, this._normalizationScale = e === void 0 ? void 0 : he(e.array);
	}
	get count() {
		return this.data.count;
	}
	get array() {
		return this.data.array;
	}
	set needsUpdate(e) {
		this.data.needsUpdate = e;
	}
	applyMatrix4(e) {
		for (let t = 0, n = this.data.count; t < n; t++) gn.fromBufferAttribute(this, t), gn.applyMatrix4(e), this.setXYZ(t, gn.x, gn.y, gn.z);
		return this;
	}
	applyNormalMatrix(e) {
		for (let t = 0, n = this.count; t < n; t++) gn.fromBufferAttribute(this, t), gn.applyNormalMatrix(e), this.setXYZ(t, gn.x, gn.y, gn.z);
		return this;
	}
	transformDirection(e) {
		for (let t = 0, n = this.count; t < n; t++) gn.fromBufferAttribute(this, t), gn.transformDirection(e), this.setXYZ(t, gn.x, gn.y, gn.z);
		return this;
	}
	getComponent(e, t) {
		let n = this.array[e * this.data.stride + this.offset + t];
		return this.normalized && (n = this._denormalize(n)), n;
	}
	setComponent(e, t, n) {
		return this.normalized && (n = this._normalize(n)), this.data.array[e * this.data.stride + this.offset + t] = n, this;
	}
	setX(e, t) {
		return this.normalized && (t = this._normalize(t)), this.data.array[e * this.data.stride + this.offset] = t, this;
	}
	setY(e, t) {
		return this.normalized && (t = this._normalize(t)), this.data.array[e * this.data.stride + this.offset + 1] = t, this;
	}
	setZ(e, t) {
		return this.normalized && (t = this._normalize(t)), this.data.array[e * this.data.stride + this.offset + 2] = t, this;
	}
	setW(e, t) {
		return this.normalized && (t = this._normalize(t)), this.data.array[e * this.data.stride + this.offset + 3] = t, this;
	}
	getX(e) {
		let t = this.data.array[e * this.data.stride + this.offset];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	getY(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 1];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	getZ(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 2];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	getW(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 3];
		return this.normalized && (t = this._denormalize(t)), t;
	}
	setXY(e, t, n) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = this._normalize(t), n = this._normalize(n)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this;
	}
	setXYZ(e, t, n, r) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = this._normalize(t), n = this._normalize(n), r = this._normalize(r)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = r, this;
	}
	setXYZW(e, t, n, r, i) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = this._normalize(t), n = this._normalize(n), r = this._normalize(r), i = this._normalize(i)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = r, this.data.array[e + 3] = i, this;
	}
	clone(t) {
		if (t === void 0) {
			ce("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");
			let e = [];
			for (let t = 0; t < this.count; t++) {
				let n = t * this.data.stride + this.offset;
				for (let t = 0; t < this.itemSize; t++) e.push(this.data.array[n + t]);
			}
			return new Zt(new this.array.constructor(e), this.itemSize, this.normalized);
		}
		return t.interleavedBuffers === void 0 && (t.interleavedBuffers = {}), t.interleavedBuffers[this.data.uuid] === void 0 && (t.interleavedBuffers[this.data.uuid] = this.data.clone(t)), new e(t.interleavedBuffers[this.data.uuid], this.itemSize, this.offset, this.normalized);
	}
	toJSON(e) {
		if (e === void 0) {
			ce("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");
			let e = [];
			for (let t = 0; t < this.count; t++) {
				let n = t * this.data.stride + this.offset;
				for (let t = 0; t < this.itemSize; t++) e.push(this.data.array[n + t]);
			}
			return {
				itemSize: this.itemSize,
				type: this.array.constructor.name,
				array: e,
				normalized: this.normalized
			};
		}
		return e.interleavedBuffers === void 0 && (e.interleavedBuffers = {}), e.interleavedBuffers[this.data.uuid] === void 0 && (e.interleavedBuffers[this.data.uuid] = this.data.toJSON(e)), {
			isInterleavedBufferAttribute: !0,
			itemSize: this.itemSize,
			data: this.data.uuid,
			offset: this.offset,
			normalized: this.normalized
		};
	}
	_denormalize(e) {
		let t = this._normalizationScale;
		return t === void 0 ? ge(e, this.data.array) : Math.max(e / t, -1);
	}
	_normalize(e) {
		let t = this._normalizationScale;
		return t === void 0 ? _e(e, this.data.array) : Math.round(e * t);
	}
}, vn = /*@__PURE__*/ new I(), yn = /*@__PURE__*/ new I(), bn = /*@__PURE__*/ new xe(), xn = class {
	constructor(e = new I(1, 0, 0), t = 0) {
		this.isPlane = !0, this.normal = e, this.constant = t;
	}
	set(e, t) {
		return this.normal.copy(e), this.constant = t, this;
	}
	setComponents(e, t, n, r) {
		return this.normal.set(e, t, n), this.constant = r, this;
	}
	setFromNormalAndCoplanarPoint(e, t) {
		return this.normal.copy(e), this.constant = -t.dot(this.normal), this;
	}
	setFromCoplanarPoints(e, t, n) {
		let r = vn.subVectors(n, t).cross(yn.subVectors(e, t)).normalize();
		return this.setFromNormalAndCoplanarPoint(r, e), this;
	}
	copy(e) {
		return this.normal.copy(e.normal), this.constant = e.constant, this;
	}
	normalize() {
		let e = 1 / this.normal.length();
		return this.normal.multiplyScalar(e), this.constant *= e, this;
	}
	negate() {
		return this.constant *= -1, this.normal.negate(), this;
	}
	distanceToPoint(e) {
		return this.normal.dot(e) + this.constant;
	}
	distanceToSphere(e) {
		return this.distanceToPoint(e.center) - e.radius;
	}
	projectPoint(e, t) {
		return t.copy(e).addScaledVector(this.normal, -this.distanceToPoint(e));
	}
	intersectLine(e, t, n = !0) {
		let r = e.delta(vn), i = this.normal.dot(r);
		if (i === 0) return this.distanceToPoint(e.start) === 0 ? t.copy(e.start) : null;
		let a = -(e.start.dot(this.normal) + this.constant) / i;
		return n === !0 && (a < 0 || a > 1) ? null : t.copy(e.start).addScaledVector(r, a);
	}
	intersectsLine(e) {
		let t = this.distanceToPoint(e.start), n = this.distanceToPoint(e.end);
		return t < 0 && n > 0 || n < 0 && t > 0;
	}
	intersectsBox(e) {
		return e.intersectsPlane(this);
	}
	intersectsSphere(e) {
		return e.intersectsPlane(this);
	}
	coplanarPoint(e) {
		return e.copy(this.normal).multiplyScalar(-this.constant);
	}
	applyMatrix4(e, t) {
		let n = t || bn.getNormalMatrix(e), r = this.coplanarPoint(vn).applyMatrix4(e), i = this.normal.applyMatrix3(n).normalize();
		return this.constant = -r.dot(i), this;
	}
	translate(e) {
		return this.constant -= e.dot(this.normal), this;
	}
	equals(e) {
		return e.normal.equals(this.normal) && e.constant === this.constant;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		return {
			normal: this.normal.toArray(),
			constant: this.constant
		};
	}
	fromJSON(e) {
		return this.normal.fromArray(e.normal), this.constant = e.constant, this;
	}
}, Sn = 0, Cn = class extends de {
	constructor() {
		super(), this.isMaterial = !0, Object.defineProperty(this, "id", { value: Sn++ }), this.uuid = fe(), this.name = "", this.type = "Material", this.blending = 1, this.side = 0, this.vertexColors = !1, this.opacity = 1, this.transparent = !1, this.alphaHash = !1, this.blendSrc = 204, this.blendDst = 205, this.blendEquation = 100, this.blendSrcAlpha = null, this.blendDstAlpha = null, this.blendEquationAlpha = null, this.blendColor = new gt(0, 0, 0), this.blendAlpha = 0, this.depthFunc = 3, this.depthTest = !0, this.depthWrite = !0, this.stencilWriteMask = 255, this.stencilFunc = 519, this.stencilRef = 0, this.stencilFuncMask = 255, this.stencilFail = te, this.stencilZFail = te, this.stencilZPass = te, this.stencilWrite = !1, this.clippingPlanes = null, this.clipIntersection = !1, this.clipShadows = !1, this.shadowSide = null, this.colorWrite = !0, this.precision = null, this.polygonOffset = !1, this.polygonOffsetFactor = 0, this.polygonOffsetUnits = 0, this.dithering = !1, this.alphaToCoverage = !1, this.premultipliedAlpha = !1, this.forceSinglePass = !1, this.allowOverride = !0, this.visible = !0, this.toneMapped = !0, this.userData = {}, this.version = 0, this._alphaTest = 0;
	}
	get alphaTest() {
		return this._alphaTest;
	}
	set alphaTest(e) {
		this._alphaTest > 0 != e > 0 && this.version++, this._alphaTest = e;
	}
	onBeforeRender() {}
	onBeforeCompile() {}
	customProgramCacheKey() {
		return this.onBeforeCompile.toString();
	}
	setValues(e) {
		if (e !== void 0) for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				j(`Material: parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			r === void 0 ? j(`Material: '${t}' is not a property of THREE.${this.type}.`) : r && r.isColor ? r.set(n) : r && r.isVector2 && n && n.isVector2 || r && r.isEuler && n && n.isEuler || r && r.isVector3 && n && n.isVector3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		t && (e = {
			textures: {},
			images: {}
		});
		let n = { metadata: {
			version: 4.7,
			type: "Material",
			generator: "Material.toJSON"
		} };
		n.uuid = this.uuid, n.type = this.type, n.blending = this.blending, n.side = this.side, n.shadowSide = this.shadowSide, n.vertexColors = this.vertexColors, n.opacity = this.opacity, n.transparent = this.transparent, n.blendSrc = this.blendSrc, n.blendDst = this.blendDst, n.blendEquation = this.blendEquation, n.blendSrcAlpha = this.blendSrcAlpha, n.blendDstAlpha = this.blendDstAlpha, n.blendEquationAlpha = this.blendEquationAlpha, n.blendColor = this.blendColor.getHex(), n.blendAlpha = this.blendAlpha, n.depthFunc = this.depthFunc, n.depthTest = this.depthTest, n.depthWrite = this.depthWrite, n.colorWrite = this.colorWrite, n.clipIntersection = this.clipIntersection, n.clipShadows = this.clipShadows, n.stencilWriteMask = this.stencilWriteMask, n.stencilFunc = this.stencilFunc, n.stencilRef = this.stencilRef, n.stencilFuncMask = this.stencilFuncMask, n.stencilFail = this.stencilFail, n.stencilZFail = this.stencilZFail, n.stencilZPass = this.stencilZPass, n.stencilWrite = this.stencilWrite, n.polygonOffset = this.polygonOffset, n.polygonOffsetFactor = this.polygonOffsetFactor, n.polygonOffsetUnits = this.polygonOffsetUnits, n.dithering = this.dithering, n.alphaTest = this.alphaTest, n.alphaHash = this.alphaHash, n.alphaToCoverage = this.alphaToCoverage, n.premultipliedAlpha = this.premultipliedAlpha, n.forceSinglePass = this.forceSinglePass, n.allowOverride = this.allowOverride, n.visible = this.visible, n.toneMapped = this.toneMapped, n.name = this.name, this.color && this.color.isColor && (n.color = this.color.getHex()), this.roughness !== void 0 && (n.roughness = this.roughness), this.metalness !== void 0 && (n.metalness = this.metalness), this.sheen !== void 0 && (n.sheen = this.sheen), this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()), this.sheenRoughness !== void 0 && (n.sheenRoughness = this.sheenRoughness), this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()), this.emissiveIntensity !== void 0 && (n.emissiveIntensity = this.emissiveIntensity), this.specular && this.specular.isColor && (n.specular = this.specular.getHex()), this.specularIntensity !== void 0 && (n.specularIntensity = this.specularIntensity), this.specularColor && this.specularColor.isColor && (n.specularColor = this.specularColor.getHex()), this.shininess !== void 0 && (n.shininess = this.shininess), this.clearcoat !== void 0 && (n.clearcoat = this.clearcoat), this.clearcoatRoughness !== void 0 && (n.clearcoatRoughness = this.clearcoatRoughness), this.diffuseRoughness !== void 0 && (n.diffuseRoughness = this.diffuseRoughness), this.diffuseRoughnessMap && this.diffuseRoughnessMap.isTexture && (n.diffuseRoughnessMap = this.diffuseRoughnessMap.toJSON(e).uuid), this.clearcoatMap && this.clearcoatMap.isTexture && (n.clearcoatMap = this.clearcoatMap.toJSON(e).uuid), this.clearcoatRoughnessMap && this.clearcoatRoughnessMap.isTexture && (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(e).uuid), this.clearcoatNormalMap && this.clearcoatNormalMap.isTexture && (n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(e).uuid, n.clearcoatNormalScale = this.clearcoatNormalScale.toArray()), this.sheenColorMap && this.sheenColorMap.isTexture && (n.sheenColorMap = this.sheenColorMap.toJSON(e).uuid), this.sheenRoughnessMap && this.sheenRoughnessMap.isTexture && (n.sheenRoughnessMap = this.sheenRoughnessMap.toJSON(e).uuid), this.dispersion !== void 0 && (n.dispersion = this.dispersion), this.retroreflectivity !== void 0 && (n.retroreflectivity = this.retroreflectivity), this.iridescence !== void 0 && (n.iridescence = this.iridescence), this.iridescenceIOR !== void 0 && (n.iridescenceIOR = this.iridescenceIOR), this.iridescenceThicknessMinimum !== void 0 && (n.iridescenceThicknessMinimum = this.iridescenceThicknessMinimum), this.iridescenceThicknessMaximum !== void 0 && (n.iridescenceThicknessMaximum = this.iridescenceThicknessMaximum), this.iridescenceMap && this.iridescenceMap.isTexture && (n.iridescenceMap = this.iridescenceMap.toJSON(e).uuid), this.iridescenceThicknessMap && this.iridescenceThicknessMap.isTexture && (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(e).uuid), this.anisotropy !== void 0 && (n.anisotropy = this.anisotropy), this.anisotropyRotation !== void 0 && (n.anisotropyRotation = this.anisotropyRotation), this.anisotropyMap && this.anisotropyMap.isTexture && (n.anisotropyMap = this.anisotropyMap.toJSON(e).uuid), this.map && this.map.isTexture && (n.map = this.map.toJSON(e).uuid), this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(e).uuid), this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(e).uuid), this.lightMap && this.lightMap.isTexture && (n.lightMap = this.lightMap.toJSON(e).uuid, n.lightMapIntensity = this.lightMapIntensity), this.aoMap && this.aoMap.isTexture && (n.aoMap = this.aoMap.toJSON(e).uuid, n.aoMapIntensity = this.aoMapIntensity), this.bumpMap && this.bumpMap.isTexture && (n.bumpMap = this.bumpMap.toJSON(e).uuid, n.bumpScale = this.bumpScale), this.normalMap && this.normalMap.isTexture && (n.normalMap = this.normalMap.toJSON(e).uuid, n.normalMapType = this.normalMapType, n.normalScale = this.normalScale.toArray()), this.displacementMap && this.displacementMap.isTexture && (n.displacementMap = this.displacementMap.toJSON(e).uuid, n.displacementScale = this.displacementScale, n.displacementBias = this.displacementBias), this.roughnessMap && this.roughnessMap.isTexture && (n.roughnessMap = this.roughnessMap.toJSON(e).uuid), this.metalnessMap && this.metalnessMap.isTexture && (n.metalnessMap = this.metalnessMap.toJSON(e).uuid), this.emissiveMap && this.emissiveMap.isTexture && (n.emissiveMap = this.emissiveMap.toJSON(e).uuid), this.specularMap && this.specularMap.isTexture && (n.specularMap = this.specularMap.toJSON(e).uuid), this.specularIntensityMap && this.specularIntensityMap.isTexture && (n.specularIntensityMap = this.specularIntensityMap.toJSON(e).uuid), this.specularColorMap && this.specularColorMap.isTexture && (n.specularColorMap = this.specularColorMap.toJSON(e).uuid), this.envMap && this.envMap.isTexture && (n.envMap = this.envMap.toJSON(e).uuid, this.combine !== void 0 && (n.combine = this.combine)), this.envMapRotation !== void 0 && (n.envMapRotation = this.envMapRotation.toArray()), this.envMapIntensity !== void 0 && (n.envMapIntensity = this.envMapIntensity), this.reflectivity !== void 0 && (n.reflectivity = this.reflectivity), this.refractionRatio !== void 0 && (n.refractionRatio = this.refractionRatio), this.gradientMap && this.gradientMap.isTexture && (n.gradientMap = this.gradientMap.toJSON(e).uuid), this.transmission !== void 0 && (n.transmission = this.transmission), this.transmissionMap && this.transmissionMap.isTexture && (n.transmissionMap = this.transmissionMap.toJSON(e).uuid), this.thickness !== void 0 && (n.thickness = this.thickness), this.thicknessMap && this.thicknessMap.isTexture && (n.thicknessMap = this.thicknessMap.toJSON(e).uuid), this.attenuationDistance !== void 0 && (n.attenuationDistance = this.attenuationDistance), this.attenuationColor !== void 0 && (n.attenuationColor = this.attenuationColor.getHex()), this.size !== void 0 && (n.size = this.size), this.sizeAttenuation !== void 0 && (n.sizeAttenuation = this.sizeAttenuation), Array.isArray(this.clippingPlanes) && this.clippingPlanes.length > 0 && (n.clippingPlanes = this.clippingPlanes.map((e) => e.toJSON())), this.rotation !== void 0 && (n.rotation = this.rotation), this.depthPacking !== void 0 && (n.depthPacking = this.depthPacking), this.linewidth !== void 0 && (n.linewidth = this.linewidth), this.linecap !== void 0 && (n.linecap = this.linecap), this.linejoin !== void 0 && (n.linejoin = this.linejoin), this.dashSize !== void 0 && (n.dashSize = this.dashSize), this.gapSize !== void 0 && (n.gapSize = this.gapSize), this.scale !== void 0 && (n.scale = this.scale), this.wireframe !== void 0 && (n.wireframe = this.wireframe), this.wireframeLinewidth !== void 0 && (n.wireframeLinewidth = this.wireframeLinewidth), this.wireframeLinecap !== void 0 && (n.wireframeLinecap = this.wireframeLinecap), this.wireframeLinejoin !== void 0 && (n.wireframeLinejoin = this.wireframeLinejoin), this.flatShading !== void 0 && (n.flatShading = this.flatShading), this.fog !== void 0 && (n.fog = this.fog), Object.keys(this.userData).length > 0 && (n.userData = this.userData);
		function r(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
		if (t) {
			let t = r(e.textures), i = r(e.images);
			t.length > 0 && (n.textures = t), i.length > 0 && (n.images = i);
		}
		return n;
	}
	fromJSON(e, t) {
		if (e.uuid !== void 0 && (this.uuid = e.uuid), e.name !== void 0 && (this.name = e.name), e.color !== void 0 && this.color !== void 0 && this.color.setHex(e.color), e.roughness !== void 0 && (this.roughness = e.roughness), e.metalness !== void 0 && (this.metalness = e.metalness), e.sheen !== void 0 && (this.sheen = e.sheen), e.sheenColor !== void 0 && (this.sheenColor = new gt().setHex(e.sheenColor)), e.sheenRoughness !== void 0 && (this.sheenRoughness = e.sheenRoughness), e.emissive !== void 0 && this.emissive !== void 0 && this.emissive.setHex(e.emissive), e.specular !== void 0 && this.specular !== void 0 && this.specular.setHex(e.specular), e.specularIntensity !== void 0 && (this.specularIntensity = e.specularIntensity), e.specularColor !== void 0 && this.specularColor !== void 0 && this.specularColor.setHex(e.specularColor), e.shininess !== void 0 && (this.shininess = e.shininess), e.clearcoat !== void 0 && (this.clearcoat = e.clearcoat), e.clearcoatRoughness !== void 0 && (this.clearcoatRoughness = e.clearcoatRoughness), e.diffuseRoughness !== void 0 && (this.diffuseRoughness = e.diffuseRoughness), e.dispersion !== void 0 && (this.dispersion = e.dispersion), e.retroreflectivity !== void 0 && (this.retroreflectivity = e.retroreflectivity), e.iridescence !== void 0 && (this.iridescence = e.iridescence), e.iridescenceIOR !== void 0 && (this.iridescenceIOR = e.iridescenceIOR), e.iridescenceThicknessMinimum !== void 0 && (this.iridescenceThicknessMinimum = e.iridescenceThicknessMinimum), e.iridescenceThicknessMaximum !== void 0 && (this.iridescenceThicknessMaximum = e.iridescenceThicknessMaximum), e.iridescenceThicknessRange !== void 0 && (this.iridescenceThicknessMinimum = e.iridescenceThicknessRange[0], this.iridescenceThicknessMaximum = e.iridescenceThicknessRange[1]), e.transmission !== void 0 && (this.transmission = e.transmission), e.thickness !== void 0 && (this.thickness = e.thickness), e.attenuationDistance !== void 0 && (this.attenuationDistance = e.attenuationDistance), e.attenuationColor !== void 0 && this.attenuationColor !== void 0 && this.attenuationColor.setHex(e.attenuationColor), e.anisotropy !== void 0 && (this.anisotropy = e.anisotropy), e.anisotropyRotation !== void 0 && (this.anisotropyRotation = e.anisotropyRotation), e.fog !== void 0 && (this.fog = e.fog), e.flatShading !== void 0 && (this.flatShading = e.flatShading), e.blending !== void 0 && (this.blending = e.blending), e.combine !== void 0 && (this.combine = e.combine), e.side !== void 0 && (this.side = e.side), e.shadowSide !== void 0 && (this.shadowSide = e.shadowSide), e.opacity !== void 0 && (this.opacity = e.opacity), e.transparent !== void 0 && (this.transparent = e.transparent), e.alphaTest !== void 0 && (this.alphaTest = e.alphaTest), e.alphaHash !== void 0 && (this.alphaHash = e.alphaHash), e.depthFunc !== void 0 && (this.depthFunc = e.depthFunc), e.depthTest !== void 0 && (this.depthTest = e.depthTest), e.depthWrite !== void 0 && (this.depthWrite = e.depthWrite), e.colorWrite !== void 0 && (this.colorWrite = e.colorWrite), e.clippingPlanes !== void 0 && (this.clippingPlanes = e.clippingPlanes.map((e) => new xn().fromJSON(e))), e.clipIntersection !== void 0 && (this.clipIntersection = e.clipIntersection), e.clipShadows !== void 0 && (this.clipShadows = e.clipShadows), e.depthPacking !== void 0 && (this.depthPacking = e.depthPacking), e.blendSrc !== void 0 && (this.blendSrc = e.blendSrc), e.blendDst !== void 0 && (this.blendDst = e.blendDst), e.blendEquation !== void 0 && (this.blendEquation = e.blendEquation), e.blendSrcAlpha !== void 0 && (this.blendSrcAlpha = e.blendSrcAlpha), e.blendDstAlpha !== void 0 && (this.blendDstAlpha = e.blendDstAlpha), e.blendEquationAlpha !== void 0 && (this.blendEquationAlpha = e.blendEquationAlpha), e.blendColor !== void 0 && this.blendColor !== void 0 && this.blendColor.setHex(e.blendColor), e.blendAlpha !== void 0 && (this.blendAlpha = e.blendAlpha), e.stencilWriteMask !== void 0 && (this.stencilWriteMask = e.stencilWriteMask), e.stencilFunc !== void 0 && (this.stencilFunc = e.stencilFunc), e.stencilRef !== void 0 && (this.stencilRef = e.stencilRef), e.stencilFuncMask !== void 0 && (this.stencilFuncMask = e.stencilFuncMask), e.stencilFail !== void 0 && (this.stencilFail = e.stencilFail), e.stencilZFail !== void 0 && (this.stencilZFail = e.stencilZFail), e.stencilZPass !== void 0 && (this.stencilZPass = e.stencilZPass), e.stencilWrite !== void 0 && (this.stencilWrite = e.stencilWrite), e.wireframe !== void 0 && (this.wireframe = e.wireframe), e.wireframeLinewidth !== void 0 && (this.wireframeLinewidth = e.wireframeLinewidth), e.wireframeLinecap !== void 0 && (this.wireframeLinecap = e.wireframeLinecap), e.wireframeLinejoin !== void 0 && (this.wireframeLinejoin = e.wireframeLinejoin), e.rotation !== void 0 && (this.rotation = e.rotation), e.linewidth !== void 0 && (this.linewidth = e.linewidth), e.linecap !== void 0 && (this.linecap = e.linecap), e.linejoin !== void 0 && (this.linejoin = e.linejoin), e.dashSize !== void 0 && (this.dashSize = e.dashSize), e.gapSize !== void 0 && (this.gapSize = e.gapSize), e.scale !== void 0 && (this.scale = e.scale), e.polygonOffset !== void 0 && (this.polygonOffset = e.polygonOffset), e.polygonOffsetFactor !== void 0 && (this.polygonOffsetFactor = e.polygonOffsetFactor), e.polygonOffsetUnits !== void 0 && (this.polygonOffsetUnits = e.polygonOffsetUnits), e.dithering !== void 0 && (this.dithering = e.dithering), e.alphaToCoverage !== void 0 && (this.alphaToCoverage = e.alphaToCoverage), e.premultipliedAlpha !== void 0 && (this.premultipliedAlpha = e.premultipliedAlpha), e.forceSinglePass !== void 0 && (this.forceSinglePass = e.forceSinglePass), e.allowOverride !== void 0 && (this.allowOverride = e.allowOverride), e.visible !== void 0 && (this.visible = e.visible), e.toneMapped !== void 0 && (this.toneMapped = e.toneMapped), e.userData !== void 0 && (this.userData = e.userData), e.vertexColors !== void 0 && (this.vertexColors = typeof e.vertexColors == "number" ? e.vertexColors > 0 : e.vertexColors), e.size !== void 0 && (this.size = e.size), e.sizeAttenuation !== void 0 && (this.sizeAttenuation = e.sizeAttenuation), e.map !== void 0 && (this.map = t[e.map] || null), e.matcap !== void 0 && (this.matcap = t[e.matcap] || null), e.alphaMap !== void 0 && (this.alphaMap = t[e.alphaMap] || null), e.bumpMap !== void 0 && (this.bumpMap = t[e.bumpMap] || null), e.bumpScale !== void 0 && (this.bumpScale = e.bumpScale), e.normalMap !== void 0 && (this.normalMap = t[e.normalMap] || null), e.normalMapType !== void 0 && (this.normalMapType = e.normalMapType), e.normalScale !== void 0) {
			let t = e.normalScale;
			Array.isArray(t) === !1 && (t = [t, t]), this.normalScale = new F().fromArray(t);
		}
		return e.displacementMap !== void 0 && (this.displacementMap = t[e.displacementMap] || null), e.displacementScale !== void 0 && (this.displacementScale = e.displacementScale), e.displacementBias !== void 0 && (this.displacementBias = e.displacementBias), e.roughnessMap !== void 0 && (this.roughnessMap = t[e.roughnessMap] || null), e.metalnessMap !== void 0 && (this.metalnessMap = t[e.metalnessMap] || null), e.emissiveMap !== void 0 && (this.emissiveMap = t[e.emissiveMap] || null), e.emissiveIntensity !== void 0 && (this.emissiveIntensity = e.emissiveIntensity), e.specularMap !== void 0 && (this.specularMap = t[e.specularMap] || null), e.specularIntensityMap !== void 0 && (this.specularIntensityMap = t[e.specularIntensityMap] || null), e.specularColorMap !== void 0 && (this.specularColorMap = t[e.specularColorMap] || null), e.envMap !== void 0 && (this.envMap = t[e.envMap] || null), e.envMapRotation !== void 0 && this.envMapRotation.fromArray(e.envMapRotation), e.envMapIntensity !== void 0 && (this.envMapIntensity = e.envMapIntensity), e.reflectivity !== void 0 && (this.reflectivity = e.reflectivity), e.refractionRatio !== void 0 && (this.refractionRatio = e.refractionRatio), e.lightMap !== void 0 && (this.lightMap = t[e.lightMap] || null), e.lightMapIntensity !== void 0 && (this.lightMapIntensity = e.lightMapIntensity), e.aoMap !== void 0 && (this.aoMap = t[e.aoMap] || null), e.aoMapIntensity !== void 0 && (this.aoMapIntensity = e.aoMapIntensity), e.gradientMap !== void 0 && (this.gradientMap = t[e.gradientMap] || null), e.clearcoatMap !== void 0 && (this.clearcoatMap = t[e.clearcoatMap] || null), e.clearcoatRoughnessMap !== void 0 && (this.clearcoatRoughnessMap = t[e.clearcoatRoughnessMap] || null), e.clearcoatNormalMap !== void 0 && (this.clearcoatNormalMap = t[e.clearcoatNormalMap] || null), e.clearcoatNormalScale !== void 0 && (this.clearcoatNormalScale = new F().fromArray(e.clearcoatNormalScale)), e.diffuseRoughnessMap !== void 0 && (this.diffuseRoughnessMap = t[e.diffuseRoughnessMap] || null), e.iridescenceMap !== void 0 && (this.iridescenceMap = t[e.iridescenceMap] || null), e.iridescenceThicknessMap !== void 0 && (this.iridescenceThicknessMap = t[e.iridescenceThicknessMap] || null), e.transmissionMap !== void 0 && (this.transmissionMap = t[e.transmissionMap] || null), e.thicknessMap !== void 0 && (this.thicknessMap = t[e.thicknessMap] || null), e.anisotropyMap !== void 0 && (this.anisotropyMap = t[e.anisotropyMap] || null), e.sheenColorMap !== void 0 && (this.sheenColorMap = t[e.sheenColorMap] || null), e.sheenRoughnessMap !== void 0 && (this.sheenRoughnessMap = t[e.sheenRoughnessMap] || null), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.name = e.name, this.blending = e.blending, this.side = e.side, this.vertexColors = e.vertexColors, this.opacity = e.opacity, this.transparent = e.transparent, this.blendSrc = e.blendSrc, this.blendDst = e.blendDst, this.blendEquation = e.blendEquation, this.blendSrcAlpha = e.blendSrcAlpha, this.blendDstAlpha = e.blendDstAlpha, this.blendEquationAlpha = e.blendEquationAlpha, this.blendColor.copy(e.blendColor), this.blendAlpha = e.blendAlpha, this.depthFunc = e.depthFunc, this.depthTest = e.depthTest, this.depthWrite = e.depthWrite, this.stencilWriteMask = e.stencilWriteMask, this.stencilFunc = e.stencilFunc, this.stencilRef = e.stencilRef, this.stencilFuncMask = e.stencilFuncMask, this.stencilFail = e.stencilFail, this.stencilZFail = e.stencilZFail, this.stencilZPass = e.stencilZPass, this.stencilWrite = e.stencilWrite;
		let t = e.clippingPlanes, n = null;
		if (t !== null) {
			let e = t.length;
			n = Array(e);
			for (let r = 0; r !== e; ++r) n[r] = t[r].clone();
		}
		return this.clippingPlanes = n, this.clipIntersection = e.clipIntersection, this.clipShadows = e.clipShadows, this.shadowSide = e.shadowSide, this.colorWrite = e.colorWrite, this.precision = e.precision, this.polygonOffset = e.polygonOffset, this.polygonOffsetFactor = e.polygonOffsetFactor, this.polygonOffsetUnits = e.polygonOffsetUnits, this.dithering = e.dithering, this.alphaTest = e.alphaTest, this.alphaHash = e.alphaHash, this.alphaToCoverage = e.alphaToCoverage, this.premultipliedAlpha = e.premultipliedAlpha, this.forceSinglePass = e.forceSinglePass, this.allowOverride = e.allowOverride, this.visible = e.visible, this.toneMapped = e.toneMapped, this.userData = JSON.parse(JSON.stringify(e.userData)), this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
}, wn = class extends Cn {
	constructor(e) {
		super(), this.isSpriteMaterial = !0, this.type = "SpriteMaterial", this.color = new gt(16777215), this.map = null, this.alphaMap = null, this.rotation = 0, this.sizeAttenuation = !0, this.transparent = !0, this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.alphaMap = e.alphaMap, this.rotation = e.rotation, this.sizeAttenuation = e.sizeAttenuation, this.fog = e.fog, this;
	}
}, Tn, En = /*@__PURE__*/ new I(), Dn = /*@__PURE__*/ new I(), On = /*@__PURE__*/ new I(), kn = /*@__PURE__*/ new F(), An = /*@__PURE__*/ new F(), jn = /*@__PURE__*/ new L(), Mn = /*@__PURE__*/ new I(), Nn = /*@__PURE__*/ new I(), Pn = /*@__PURE__*/ new I(), Fn = /*@__PURE__*/ new F(), In = /*@__PURE__*/ new F(), Ln = /*@__PURE__*/ new F(), Rn = class extends ut {
	constructor(e = new wn()) {
		if (super(), this.isSprite = !0, this.type = "Sprite", Tn === void 0) {
			Tn = new pn();
			let e = new mn(new Float32Array([
				-.5,
				-.5,
				0,
				0,
				0,
				.5,
				-.5,
				0,
				1,
				0,
				.5,
				.5,
				0,
				1,
				1,
				-.5,
				.5,
				0,
				0,
				1
			]), 5);
			Tn.setIndex([
				0,
				1,
				2,
				0,
				2,
				3
			]), Tn.setAttribute("position", new _n(e, 3, 0, !1)), Tn.setAttribute("uv", new _n(e, 2, 3, !1));
		}
		this.geometry = Tn, this.material = e, this.center = new F(.5, .5), this.count = 1;
	}
	intersectsFrustum(e) {
		return e.intersectsSprite(this);
	}
	raycast(e, t) {
		e.camera === null && M("Sprite: \"Raycaster.camera\" needs to be set in order to raycast against sprites."), Dn.setFromMatrixScale(this.matrixWorld), jn.copy(e.camera.matrixWorld), this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse, this.matrixWorld), On.setFromMatrixPosition(this.modelViewMatrix), e.camera.isPerspectiveCamera && this.material.sizeAttenuation === !1 && Dn.multiplyScalar(-On.z);
		let n = this.material.rotation, r, i;
		n !== 0 && (i = Math.cos(n), r = Math.sin(n));
		let a = this.center;
		zn(Mn.set(-.5, -.5, 0), On, a, Dn, r, i), zn(Nn.set(.5, -.5, 0), On, a, Dn, r, i), zn(Pn.set(.5, .5, 0), On, a, Dn, r, i), Fn.set(0, 0), In.set(1, 0), Ln.set(1, 1);
		let o = e.ray.intersectTriangle(Mn, Nn, Pn, !1, En);
		if (o === null && (zn(Nn.set(-.5, .5, 0), On, a, Dn, r, i), In.set(0, 1), o = e.ray.intersectTriangle(Mn, Pn, Nn, !1, En), o === null)) return;
		let s = e.ray.origin.distanceTo(En);
		s < e.near || s > e.far || t.push({
			distance: s,
			point: En.clone(),
			uv: Nt.getInterpolation(En, Mn, Nn, Pn, Fn, In, Ln, new F()),
			face: null,
			object: this
		});
	}
	copy(e, t) {
		return super.copy(e, t), e.center !== void 0 && this.center.copy(e.center), this.material = e.material, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.center = this.center.toArray(), t;
	}
};
function zn(e, t, n, r, i, a) {
	kn.subVectors(e, n).addScalar(.5).multiply(r), i === void 0 ? An.copy(kn) : (An.x = a * kn.x - i * kn.y, An.y = i * kn.x + a * kn.y), e.copy(t), e.x += An.x, e.y += An.y, e.applyMatrix4(jn);
}
var Bn = /*@__PURE__*/ new I(), Vn = /*@__PURE__*/ new I(), Hn = /*@__PURE__*/ new I(), Un = /*@__PURE__*/ new I(), Wn = class {
	constructor(e = new I(), t = new I(0, 0, -1)) {
		this.origin = e, this.direction = t;
	}
	set(e, t) {
		return this.origin.copy(e), this.direction.copy(t), this;
	}
	copy(e) {
		return this.origin.copy(e.origin), this.direction.copy(e.direction), this;
	}
	at(e, t) {
		return t.copy(this.origin).addScaledVector(this.direction, e);
	}
	lookAt(e) {
		return this.direction.copy(e).sub(this.origin).normalize(), this;
	}
	recast(e) {
		return this.origin.copy(this.at(e, Bn)), this;
	}
	closestPointToPoint(e, t) {
		t.subVectors(e, this.origin);
		let n = t.dot(this.direction);
		return n < 0 ? t.copy(this.origin) : t.copy(this.origin).addScaledVector(this.direction, n);
	}
	distanceToPoint(e) {
		return Math.sqrt(this.distanceSqToPoint(e));
	}
	distanceSqToPoint(e) {
		let t = Bn.subVectors(e, this.origin).dot(this.direction);
		return t < 0 ? this.origin.distanceToSquared(e) : (Bn.copy(this.origin).addScaledVector(this.direction, t), Bn.distanceToSquared(e));
	}
	distanceSqToSegment(e, t, n, r) {
		Vn.copy(e).add(t).multiplyScalar(.5), Hn.copy(t).sub(e).normalize(), Un.copy(this.origin).sub(Vn);
		let i = e.distanceTo(t) * .5, a = -this.direction.dot(Hn), o = Un.dot(this.direction), s = -Un.dot(Hn), c = Un.lengthSq(), l = Math.abs(1 - a * a), u, d, f, p;
		if (l > 0) {
			if (u = a * s - o, d = a * o - s, p = i * l, u >= 0) {
				if (d >= -p) {
					if (d <= p) {
						let e = 1 / l;
						u *= e, d *= e, f = u * (u + a * d + 2 * o) + d * (a * u + d + 2 * s) + c;
					} else d = i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
				} else d = -i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
			} else d <= -p ? (u = Math.max(0, -(-a * i + o)), d = u > 0 ? -i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c) : d <= p ? (u = 0, d = Math.min(Math.max(-i, -s), i), f = d * (d + 2 * s) + c) : (u = Math.max(0, -(a * i + o)), d = u > 0 ? i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c);
		} else d = a > 0 ? -i : i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
		return n && n.copy(this.origin).addScaledVector(this.direction, u), r && r.copy(Vn).addScaledVector(Hn, d), f;
	}
	intersectSphere(e, t) {
		if (e.radius < 0) return null;
		Bn.subVectors(e.center, this.origin);
		let n = Bn.dot(this.direction), r = Bn.dot(Bn) - n * n, i = e.radius * e.radius;
		if (r > i) return null;
		let a = Math.sqrt(i - r), o = n - a, s = n + a;
		return s < 0 ? null : o < 0 ? this.at(s, t) : this.at(o, t);
	}
	intersectsSphere(e) {
		return e.radius < 0 ? !1 : this.distanceSqToPoint(e.center) <= e.radius * e.radius;
	}
	distanceToPlane(e) {
		let t = e.normal.dot(this.direction);
		if (t === 0) return e.distanceToPoint(this.origin) === 0 ? 0 : null;
		let n = -(this.origin.dot(e.normal) + e.constant) / t;
		return n >= 0 ? n : null;
	}
	intersectPlane(e, t) {
		let n = this.distanceToPlane(e);
		return n === null ? null : this.at(n, t);
	}
	intersectsPlane(e) {
		let t = e.distanceToPoint(this.origin);
		return t === 0 || e.normal.dot(this.direction) * t < 0;
	}
	intersectBox(e, t) {
		let n, r, i, a, o, s, c = 1 / this.direction.x, l = 1 / this.direction.y, u = 1 / this.direction.z, d = this.origin;
		return c >= 0 ? (n = (e.min.x - d.x) * c, r = (e.max.x - d.x) * c) : (n = (e.max.x - d.x) * c, r = (e.min.x - d.x) * c), l >= 0 ? (i = (e.min.y - d.y) * l, a = (e.max.y - d.y) * l) : (i = (e.max.y - d.y) * l, a = (e.min.y - d.y) * l), n > a || i > r || ((i > n || isNaN(n)) && (n = i), (a < r || isNaN(r)) && (r = a), u >= 0 ? (o = (e.min.z - d.z) * u, s = (e.max.z - d.z) * u) : (o = (e.max.z - d.z) * u, s = (e.min.z - d.z) * u), n > s || o > r) || ((o > n || n !== n) && (n = o), (s < r || r !== r) && (r = s), r < 0) ? null : this.at(n >= 0 ? n : r, t);
	}
	intersectsBox(e) {
		return this.intersectBox(e, Bn) !== null;
	}
	intersectTriangle(e, t, n, r, i) {
		let a = this.origin, o = this.direction, s = o.x, c = o.y, l = o.z, u = e.x - a.x, d = e.y - a.y, f = e.z - a.z, p = t.x - a.x, m = t.y - a.y, h = t.z - a.z, g = n.x - a.x, _ = n.y - a.y, v = n.z - a.z, y = Math.abs(s), b = Math.abs(c), x = Math.abs(l), S, C, w, T, E, D, O, k, A, ee, te, ne;
		if (y >= b && y >= x ? (w = s, D = u, A = p, ne = g, s >= 0 ? (S = c, C = l, T = d, E = f, O = m, k = h, ee = _, te = v) : (S = l, C = c, T = f, E = d, O = h, k = m, ee = v, te = _)) : b >= x ? (w = c, D = d, A = m, ne = _, c >= 0 ? (S = l, C = s, T = f, E = u, O = h, k = p, ee = v, te = g) : (S = s, C = l, T = u, E = f, O = p, k = h, ee = g, te = v)) : (w = l, D = f, A = h, ne = v, l >= 0 ? (S = s, C = c, T = u, E = d, O = p, k = m, ee = g, te = _) : (S = c, C = s, T = d, E = u, O = m, k = p, ee = _, te = g)), w === 0) return null;
		let re = S / w, ie = C / w, ae = 1 / w, oe = T - re * D, se = E - ie * D, ce = O - re * A, le = k - ie * A, j = ee - re * ne, M = te - ie * ne, ue = j * le - M * ce, de = oe * M - se * j, N = ce * se - le * oe;
		if (r) {
			if (ue < 0 || de < 0 || N < 0) return null;
		} else if ((ue < 0 || de < 0 || N < 0) && (ue > 0 || de > 0 || N > 0)) return null;
		let fe = ue + de + N;
		if (fe === 0) return null;
		let P = ae * (ue * D + de * A + N * ne);
		return (fe > 0 ? P < 0 : P > 0) ? null : this.at(P / fe, i);
	}
	applyMatrix4(e) {
		return this.origin.applyMatrix4(e), this.direction.transformDirection(e), this;
	}
	equals(e) {
		return e.origin.equals(this.origin) && e.direction.equals(this.direction);
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, Gn = class extends Cn {
	constructor(e) {
		super(), this.isMeshBasicMaterial = !0, this.type = "MeshBasicMaterial", this.color = new gt(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new qe(), this.combine = 0, this.reflectivity = 1, this.refractionRatio = .98, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.specularMap = e.specularMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.combine = e.combine, this.reflectivity = e.reflectivity, this.refractionRatio = e.refractionRatio, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.fog = e.fog, this;
	}
}, Kn = /*@__PURE__*/ new L(), qn = /*@__PURE__*/ new Wn(), Jn = /*@__PURE__*/ new an(), Yn = /*@__PURE__*/ new I(), Xn = /*@__PURE__*/ new I(), Zn = /*@__PURE__*/ new I(), Qn = /*@__PURE__*/ new I(), $n = /*@__PURE__*/ new I(), er = /*@__PURE__*/ new I(), tr = /*@__PURE__*/ new I(), nr = /*@__PURE__*/ new I(), rr = class extends ut {
	constructor(e = new pn(), t = new Gn()) {
		super(), this.isMesh = !0, this.type = "Mesh", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.count = 1, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), this.morphTargetInfluences = e.morphTargetInfluences === void 0 ? void 0 : e.morphTargetInfluences.slice(), this.morphTargetDictionary = e.morphTargetDictionary === void 0 ? void 0 : Object.assign({}, e.morphTargetDictionary), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
	getVertexPosition(e, t) {
		let n = this.geometry, r = n.attributes.position, i = n.morphAttributes.position, a = n.morphTargetsRelative;
		t.fromBufferAttribute(r, e);
		let o = this.morphTargetInfluences;
		if (i && o) {
			er.set(0, 0, 0);
			for (let n = 0, r = i.length; n < r; n++) {
				let r = o[n], s = i[n];
				r !== 0 && ($n.fromBufferAttribute(s, e), a ? er.addScaledVector($n, r) : er.addScaledVector($n.sub(t), r));
			}
			t.add(er);
		}
		return t;
	}
	intersectsFrustum(e) {
		return e.intersectsObject(this);
	}
	raycast(e, t) {
		let n = this.geometry, r = this.material, i = this.matrixWorld;
		r !== void 0 && (n.boundingSphere === null && n.computeBoundingSphere(), Jn.copy(n.boundingSphere), Jn.applyMatrix4(i), qn.copy(e.ray).recast(e.near), Jn.containsPoint(qn.origin) === !1 && (qn.intersectSphere(Jn, Yn) === null || qn.origin.distanceToSquared(Yn) > (e.far - e.near) ** 2) || (Kn.copy(i).invert(), qn.copy(e.ray).applyMatrix4(Kn), (n.boundingBox === null || qn.intersectsBox(n.boundingBox) !== !1) && this._computeIntersections(e, t, qn)));
	}
	_computeIntersections(e, t, n) {
		let r, i = this.geometry, a = this.material, o = i.index, s = i.attributes.position, c = i.attributes.uv, l = i.attributes.uv1, u = i.attributes.normal, d = i.groups, f = i.drawRange;
		if (o !== null) {
			if (Array.isArray(a)) for (let i = 0, s = d.length; i < s; i++) {
				let s = d[i], p = a[s.materialIndex], m = Math.max(s.start, f.start), h = Math.min(o.count, Math.min(s.start + s.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = o.getX(i), d = o.getX(i + 1), f = o.getX(i + 2);
					r = ar(this, p, e, n, c, l, u, a, d, f), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = s.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), s = Math.min(o.count, f.start + f.count);
				for (let d = i, f = s; d < f; d += 3) {
					let i = o.getX(d), s = o.getX(d + 1), f = o.getX(d + 2);
					r = ar(this, a, e, n, c, l, u, i, s, f), r && (r.faceIndex = Math.floor(d / 3), t.push(r));
				}
			}
		} else if (s !== void 0) {
			if (Array.isArray(a)) for (let i = 0, o = d.length; i < o; i++) {
				let o = d[i], p = a[o.materialIndex], m = Math.max(o.start, f.start), h = Math.min(s.count, Math.min(o.start + o.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = i, s = i + 1, d = i + 2;
					r = ar(this, p, e, n, c, l, u, a, s, d), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = o.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), o = Math.min(s.count, f.start + f.count);
				for (let s = i, d = o; s < d; s += 3) {
					let i = s, o = s + 1, d = s + 2;
					r = ar(this, a, e, n, c, l, u, i, o, d), r && (r.faceIndex = Math.floor(s / 3), t.push(r));
				}
			}
		}
	}
};
function ir(e, t, n, r, i, a, o, s) {
	let c;
	if (c = t.side === 1 ? r.intersectTriangle(o, a, i, !0, s) : r.intersectTriangle(i, a, o, t.side === 0, s), c === null) return null;
	nr.copy(s), nr.applyMatrix4(e.matrixWorld);
	let l = n.ray.origin.distanceTo(nr);
	return l < n.near || l > n.far ? null : {
		distance: l,
		point: nr.clone(),
		object: e
	};
}
function ar(e, t, n, r, i, a, o, s, c, l) {
	e.getVertexPosition(s, Xn), e.getVertexPosition(c, Zn), e.getVertexPosition(l, Qn);
	let u = ir(e, t, n, r, Xn, Zn, Qn, tr);
	if (u) {
		let e = new I();
		Nt.getBarycoord(tr, Xn, Zn, Qn, e), i && (u.uv = Nt.getInterpolatedAttribute(i, s, c, l, e, new F())), a && (u.uv1 = Nt.getInterpolatedAttribute(a, s, c, l, e, new F())), o && (u.normal = Nt.getInterpolatedAttribute(o, s, c, l, e, new I()), u.normal.dot(r.direction) > 0 && u.normal.multiplyScalar(-1));
		let t = {
			a: s,
			b: c,
			c: l,
			normal: new I(),
			materialIndex: 0
		};
		Nt.getNormal(Xn, Zn, Qn, t.normal), u.face = t, u.barycoord = e;
	}
	return u;
}
var or = class extends Ie {
	constructor(e = null, t = 1, n = 1, r, i, a, o, s, c = m, l = m, u, d) {
		super(null, a, o, s, c, l, r, i, u, d), this.isDataTexture = !0, this.image = {
			data: e,
			width: t,
			height: n
		}, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
	}
}, sr = class extends Zt {
	constructor(e, t, n, r = 1) {
		super(e, t, n), this.isInstancedBufferAttribute = !0, this.meshPerAttribute = r;
	}
	copy(e) {
		return super.copy(e), this.meshPerAttribute = e.meshPerAttribute, this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.meshPerAttribute = this.meshPerAttribute, e.isInstancedBufferAttribute = !0, e;
	}
}, cr = /*@__PURE__*/ new L(), lr = /*@__PURE__*/ new L(), ur = [], dr = /*@__PURE__*/ new Pt(), fr = /*@__PURE__*/ new L(), pr = /*@__PURE__*/ new rr(), mr = /*@__PURE__*/ new an(), hr = class extends rr {
	constructor(e, t, n) {
		super(e, t), this.isInstancedMesh = !0, this.instanceMatrix = new sr(new Float32Array(n * 16), 16), this.instanceColor = null, this.morphTexture = null, this.count = n, this.boundingBox = null, this.boundingSphere = null;
		for (let e = 0; e < n; e++) this.setMatrixAt(e, fr);
	}
	computeBoundingBox() {
		let e = this.geometry, t = this.count;
		this.boundingBox === null && (this.boundingBox = new Pt()), e.boundingBox === null && e.computeBoundingBox(), this.boundingBox.makeEmpty();
		for (let n = 0; n < t; n++) this.getMatrixAt(n, cr), dr.copy(e.boundingBox).applyMatrix4(cr), this.boundingBox.union(dr);
	}
	computeBoundingSphere() {
		let e = this.geometry, t = this.count;
		this.boundingSphere === null && (this.boundingSphere = new an()), e.boundingSphere === null && e.computeBoundingSphere(), this.boundingSphere.makeEmpty();
		for (let n = 0; n < t; n++) this.getMatrixAt(n, cr), mr.copy(e.boundingSphere).applyMatrix4(cr), this.boundingSphere.union(mr);
	}
	copy(e, t) {
		return super.copy(e, t), this.instanceMatrix.copy(e.instanceMatrix), this.morphTexture = e.morphTexture === null ? null : e.morphTexture.clone(), this.instanceColor = e.instanceColor === null ? null : e.instanceColor.clone(), this.count = e.count, this.boundingBox = e.boundingBox === null ? null : e.boundingBox.clone(), this.boundingSphere = e.boundingSphere === null ? null : e.boundingSphere.clone(), this;
	}
	getColorAt(e, t) {
		return this.instanceColor === null ? t.setRGB(1, 1, 1) : t.fromArray(this.instanceColor.array, e * 3);
	}
	getMatrixAt(e, t) {
		return t.fromArray(this.instanceMatrix.array, e * 16);
	}
	getMorphAt(e, t) {
		let n = t.morphTargetInfluences, r = this.morphTexture.source.data.data, i = e * (n.length + 1) + 1;
		for (let e = 0; e < n.length; e++) n[e] = r[i + e];
	}
	raycast(e, t) {
		let n = this.matrixWorld, r = this.count;
		if (pr.geometry = this.geometry, pr.material = this.material, pr.material !== void 0 && (this.boundingSphere === null && this.computeBoundingSphere(), mr.copy(this.boundingSphere), mr.applyMatrix4(n), e.ray.intersectsSphere(mr) !== !1)) for (let i = 0; i < r; i++) {
			this.getMatrixAt(i, cr), lr.multiplyMatrices(n, cr), pr.matrixWorld = lr, pr.raycast(e, ur);
			for (let e = 0, n = ur.length; e < n; e++) {
				let n = ur[e];
				n.instanceId = i, n.object = this, t.push(n);
			}
			ur.length = 0;
		}
	}
	setColorAt(e, t) {
		return this.instanceColor === null && (this.instanceColor = new sr(new Float32Array(this.instanceMatrix.count * 3).fill(1), 3)), t.toArray(this.instanceColor.array, e * 3), this;
	}
	setMatrixAt(e, t) {
		return t.toArray(this.instanceMatrix.array, e * 16), this;
	}
	setMorphAt(e, t) {
		let n = t.morphTargetInfluences, r = n.length + 1;
		this.morphTexture === null && (this.morphTexture = new or(new Float32Array(r * this.count), r, this.count, b, v));
		let i = this.morphTexture.source.data.data, a = 0;
		for (let e = 0; e < n.length; e++) a += n[e];
		let o = this.geometry.morphTargetsRelative ? 1 : 1 - a, s = r * e;
		return i[s] = o, i.set(n, s + 1), this;
	}
	updateMorphTargets() {}
	dispose() {
		super.dispose(), this.instanceMatrix.dispose(), this.instanceColor !== null && this.instanceColor.dispose(), this.morphTexture !== null && (this.morphTexture.dispose(), this.morphTexture = null);
	}
}, gr = /*@__PURE__*/ new an(), _r = /*@__PURE__*/ new F(.5, .5), vr = /*@__PURE__*/ new I(), yr = class {
	constructor(e = new xn(), t = new xn(), n = new xn(), r = new xn(), i = new xn(), a = new xn()) {
		this.planes = [
			e,
			t,
			n,
			r,
			i,
			a
		];
	}
	set(e, t, n, r, i, a) {
		let o = this.planes;
		return o[0].copy(e), o[1].copy(t), o[2].copy(n), o[3].copy(r), o[4].copy(i), o[5].copy(a), this;
	}
	copy(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) t[n].copy(e.planes[n]);
		return this;
	}
	setFromProjectionMatrix(e, t = re, n = !1) {
		let r = this.planes, i = e.elements, a = i[0], o = i[1], s = i[2], c = i[3], l = i[4], u = i[5], d = i[6], f = i[7], p = i[8], m = i[9], h = i[10], g = i[11], _ = i[12], v = i[13], y = i[14], b = i[15];
		if (r[0].setComponents(c - a, f - l, g - p, b - _).normalize(), r[1].setComponents(c + a, f + l, g + p, b + _).normalize(), r[2].setComponents(c + o, f + u, g + m, b + v).normalize(), r[3].setComponents(c - o, f - u, g - m, b - v).normalize(), n) r[4].setComponents(s, d, h, y).normalize(), r[5].setComponents(c - s, f - d, g - h, b - y).normalize();
		else if (r[4].setComponents(c - s, f - d, g - h, b - y).normalize(), t === 2e3) r[5].setComponents(c + s, f + d, g + h, b + y).normalize();
		else if (t === 2001) r[5].setComponents(s, d, h, y).normalize();
		else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + t);
		return this;
	}
	intersectsObject(e) {
		if (e.boundingSphere !== void 0) e.boundingSphere === null && e.computeBoundingSphere(), gr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);
		else {
			let t = e.geometry;
			t.boundingSphere === null && t.computeBoundingSphere(), gr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld);
		}
		return this.intersectsSphere(gr);
	}
	intersectsSprite(e) {
		return gr.center.set(0, 0, 0), gr.radius = .7071067811865476 + _r.distanceTo(e.center), gr.applyMatrix4(e.matrixWorld), this.intersectsSphere(gr);
	}
	intersectsSphere(e) {
		let t = this.planes, n = e.center, r = -e.radius;
		for (let e = 0; e < 6; e++) if (t[e].distanceToPoint(n) < r) return !1;
		return !0;
	}
	intersectsBox(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) {
			let r = t[n];
			if (vr.x = r.normal.x > 0 ? e.max.x : e.min.x, vr.y = r.normal.y > 0 ? e.max.y : e.min.y, vr.z = r.normal.z > 0 ? e.max.z : e.min.z, r.distanceToPoint(vr) < 0) return !1;
		}
		return !0;
	}
	containsPoint(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) if (t[n].distanceToPoint(e) < 0) return !1;
		return !0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, br = class extends Ie {
	constructor(e, t, n, r, i, a, o, s, c) {
		super(e, t, n, r, i, a, o, s, c), this.isCanvasTexture = !0, this.needsUpdate = !0;
	}
}, xr = class e extends pn {
	constructor(e = 1, t = 1, n = 1, r = 1) {
		super(), this.type = "PlaneGeometry", this.parameters = {
			width: e,
			height: t,
			widthSegments: n,
			heightSegments: r
		};
		let i = e / 2, a = t / 2, o = Math.floor(n), s = Math.floor(r), c = o + 1, l = s + 1, u = e / o, d = t / s, f = [], p = [], m = [], h = [];
		for (let e = 0; e < l; e++) {
			let t = e * d - a;
			for (let n = 0; n < c; n++) {
				let r = n * u - i;
				p.push(r, -t, 0), m.push(0, 0, 1), h.push(n / o), h.push(1 - e / s);
			}
		}
		for (let e = 0; e < s; e++) for (let t = 0; t < o; t++) {
			let n = t + c * e, r = t + c * (e + 1), i = t + 1 + c * (e + 1), a = t + 1 + c * e;
			f.push(n, r, a), f.push(r, i, a);
		}
		this.setIndex(f), this.setAttribute("position", new en(p, 3)), this.setAttribute("normal", new en(m, 3)), this.setAttribute("uv", new en(h, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.widthSegments, t.heightSegments);
	}
}, Sr = class extends Cn {
	constructor(e) {
		super(), this.isMeshLambertMaterial = !0, this.type = "MeshLambertMaterial", this.color = new gt(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.emissive = new gt(0), this.emissiveIntensity = 1, this.emissiveMap = null, this.bumpMap = null, this.bumpScale = 1, this.normalMap = null, this.normalMapType = 0, this.normalScale = new F(1, 1), this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new qe(), this.combine = 0, this.reflectivity = 1, this.envMapIntensity = 1, this.refractionRatio = .98, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.flatShading = !1, this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.emissive.copy(e.emissive), this.emissiveMap = e.emissiveMap, this.emissiveIntensity = e.emissiveIntensity, this.bumpMap = e.bumpMap, this.bumpScale = e.bumpScale, this.normalMap = e.normalMap, this.normalMapType = e.normalMapType, this.normalScale.copy(e.normalScale), this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.specularMap = e.specularMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.combine = e.combine, this.reflectivity = e.reflectivity, this.envMapIntensity = e.envMapIntensity, this.refractionRatio = e.refractionRatio, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.flatShading = e.flatShading, this.fog = e.fog, this;
	}
};
function Cr(e, t) {
	return !e || e.constructor === t ? e : typeof t.BYTES_PER_ELEMENT == "number" ? new t(e) : Array.prototype.slice.call(e);
}
function wr(e) {
	return e !== void 0 && e.inTangents !== void 0 && e.outTangents !== void 0;
}
var Tr = class {
	constructor(e, t, n, r) {
		this.parameterPositions = e, this._cachedIndex = 0, this.resultBuffer = r === void 0 ? new t.constructor(n) : r, this.sampleValues = t, this.valueSize = n, this.settings = null, this.DefaultSettings_ = {};
	}
	evaluate(e) {
		let t = this.parameterPositions, n = this._cachedIndex, r = t[n], i = t[n - 1];
		validate_interval: {
			seek: {
				let a;
				linear_scan: {
					forward_scan: if (!(e < r)) {
						for (let a = n + 2;;) {
							if (r === void 0) {
								if (e < i) break forward_scan;
								return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
							}
							if (n === a) break;
							if (i = r, r = t[++n], e < r) break seek;
						}
						a = t.length;
						break linear_scan;
					}
					if (!(e >= i)) {
						let o = t[1];
						e < o && (n = 2, i = o);
						for (let a = n - 2;;) {
							if (i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
							if (n === a) break;
							if (r = i, i = t[--n - 1], e >= i) break seek;
						}
						a = n, n = 0;
						break linear_scan;
					}
					break validate_interval;
				}
				for (; n < a;) {
					let r = n + a >>> 1;
					e < t[r] ? a = r : n = r + 1;
				}
				if (r = t[n], i = t[n - 1], i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
				if (r === void 0) return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
			}
			this._cachedIndex = n, this.intervalChanged_(n, i, r);
		}
		return this.interpolate_(n, i, e, r);
	}
	getSettings_() {
		return this.settings || this.DefaultSettings_;
	}
	copySampleValue_(e) {
		let t = this.resultBuffer, n = this.sampleValues, r = this.valueSize, i = e * r;
		for (let e = 0; e !== r; ++e) t[e] = n[i + e];
		return t;
	}
	interpolate_() {
		throw Error("THREE.Interpolant: Call to abstract method.");
	}
	intervalChanged_() {}
}, Er = class extends Tr {
	constructor(e, t, n, r) {
		super(e, t, n, r), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = {
			endingStart: T,
			endingEnd: T
		};
	}
	intervalChanged_(e, t, n) {
		let r = this.parameterPositions, i = e - 2, a = e + 1, o = r[i], s = r[a];
		if (o === void 0) switch (this.getSettings_().endingStart) {
			case E:
				i = e, o = 2 * t - n;
				break;
			case D:
				i = r.length - 2, o = t + r[i] - r[i + 1];
				break;
			default: i = e, o = n;
		}
		if (s === void 0) switch (this.getSettings_().endingEnd) {
			case E:
				a = e, s = 2 * n - t;
				break;
			case D:
				a = 1, s = n + r[1] - r[0];
				break;
			default: a = e - 1, s = t;
		}
		let c = (n - t) * .5, l = this.valueSize;
		this._weightPrev = c / (t - o), this._weightNext = c / (s - n), this._offsetPrev = i * l, this._offsetNext = a * l;
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = this._offsetPrev, u = this._offsetNext, d = this._weightPrev, f = this._weightNext, p = (n - t) / (r - t), m = p * p, h = m * p, g = -d * h + 2 * d * m - d * p, _ = (1 + d) * h + (-1.5 - 2 * d) * m + (-.5 + d) * p + 1, v = (-1 - f) * h + (1.5 + f) * m + .5 * p, y = f * h - f * m;
		for (let e = 0; e !== o; ++e) i[e] = g * a[l + e] + _ * a[c + e] + v * a[s + e] + y * a[u + e];
		return i;
	}
}, Dr = class extends Tr {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = (n - t) / (r - t), u = 1 - l;
		for (let e = 0; e !== o; ++e) i[e] = a[c + e] * u + a[s + e] * l;
		return i;
	}
}, Or = class extends Tr {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e) {
		return this.copySampleValue_(e - 1);
	}
}, kr = class extends Tr {
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = this.inTangents, u = this.outTangents;
		if (!l || !u) {
			let e = (n - t) / (r - t), l = 1 - e;
			for (let t = 0; t !== o; ++t) i[t] = a[c + t] * l + a[s + t] * e;
			return i;
		}
		let d = o * 2, f = e - 1;
		for (let p = 0; p !== o; ++p) {
			let o = a[c + p], m = a[s + p], h = f * d + p * 2, g = u[h], _ = u[h + 1], v = e * d + p * 2, y = l[v], b = l[v + 1], x = Mr(n, t, g, y, r);
			i[p] = Ar(x, o, _, b, m);
		}
		return i;
	}
};
function Ar(e, t, n, r, i) {
	let a = 1 - e;
	return a * a * a * t + 3 * a * a * e * n + 3 * a * e * e * r + e * e * e * i;
}
function jr(e, t, n, r, i) {
	let a = 1 - e;
	return 3 * a * a * (n - t) + 6 * a * e * (r - n) + 3 * e * e * (i - r);
}
function Mr(e, t, n, r, i) {
	let a = (e - t) / (i - t);
	for (let o = 0; o < 8; o++) {
		let o = Ar(a, t, n, r, i) - e;
		if (Math.abs(o) < 1e-10) break;
		let s = jr(a, t, n, r, i);
		if (Math.abs(s) < 1e-10) break;
		a = Math.max(0, Math.min(1, a - o / s));
	}
	return a;
}
var Nr = class {
	constructor(e, t, n, r) {
		if (e === void 0) throw Error("THREE.KeyframeTrack: track name is undefined");
		if (t === void 0 || t.length === 0) throw Error("THREE.KeyframeTrack: no keyframes in track named " + e);
		this.name = e, this.times = Cr(t, this.TimeBufferType), this.values = Cr(n, this.ValueBufferType), this.setInterpolation(r || this.DefaultInterpolation);
	}
	static toJSON(e) {
		let t = e.constructor, n;
		if (t.toJSON !== this.toJSON) n = t.toJSON(e);
		else {
			n = {
				name: e.name,
				times: Cr(e.times, Array),
				values: Cr(e.values, Array)
			};
			let t = e.getInterpolation();
			t !== e.DefaultInterpolation && (n.interpolation = t), wr(e.settings) && (n.settings = {
				inTangents: Cr(e.settings.inTangents, Array),
				outTangents: Cr(e.settings.outTangents, Array)
			});
		}
		return n.type = e.ValueTypeName, n;
	}
	InterpolantFactoryMethodDiscrete(e) {
		return new Or(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodLinear(e) {
		return new Dr(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodSmooth(e) {
		return new Er(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodBezier(e) {
		let t = new kr(this.times, this.values, this.getValueSize(), e);
		return this.settings && (t.inTangents = this.settings.inTangents, t.outTangents = this.settings.outTangents), t;
	}
	setInterpolation(e) {
		let t;
		switch (e) {
			case x:
				t = this.InterpolantFactoryMethodDiscrete;
				break;
			case S:
				t = this.InterpolantFactoryMethodLinear;
				break;
			case C:
				t = this.InterpolantFactoryMethodSmooth;
				break;
			case w: t = this.InterpolantFactoryMethodBezier;
		}
		if (t === void 0) {
			let t = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
			if (this.createInterpolant === void 0) {
				if (e !== this.DefaultInterpolation) this.setInterpolation(this.DefaultInterpolation);
				else throw Error(t);
			}
			return j("KeyframeTrack:", t), this;
		}
		return this.createInterpolant = t, this;
	}
	getInterpolation() {
		switch (this.createInterpolant) {
			case this.InterpolantFactoryMethodDiscrete: return x;
			case this.InterpolantFactoryMethodLinear: return S;
			case this.InterpolantFactoryMethodSmooth: return C;
			case this.InterpolantFactoryMethodBezier: return w;
		}
	}
	getValueSize() {
		return this.values.length / this.times.length;
	}
	shift(e) {
		if (e !== 0) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] += e;
			wr(this.settings) && (Pr(this.settings.inTangents, e), Pr(this.settings.outTangents, e));
		}
		return this;
	}
	scale(e) {
		if (e !== 1) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] *= e;
			wr(this.settings) && (Fr(this.settings.inTangents, e), Fr(this.settings.outTangents, e));
		}
		return this;
	}
	trim(e, t) {
		let n = this.times, r = n.length, i = 0, a = r - 1;
		for (; i !== r && n[i] < e;) ++i;
		for (; a !== -1 && n[a] > t;) --a;
		if (++a, i !== 0 || a !== r) {
			i >= a && (a = Math.max(a, 1), i = a - 1);
			let e = this.getValueSize();
			this.times = n.slice(i, a), this.values = this.values.slice(i * e, a * e);
		}
		return this;
	}
	validate() {
		let e = !0, t = this.getValueSize();
		t - Math.floor(t) !== 0 && (M("KeyframeTrack: Invalid value size in track.", this), e = !1);
		let n = this.times, r = this.values, i = n.length;
		i === 0 && (M("KeyframeTrack: Track is empty.", this), e = !1);
		let a = null;
		for (let t = 0; t !== i; t++) {
			let r = n[t];
			if (typeof r == "number" && isNaN(r)) {
				M("KeyframeTrack: Time is not a valid number.", this, t, r), e = !1;
				break;
			}
			if (a !== null && a > r) {
				M("KeyframeTrack: Out of order keys.", this, t, r, a), e = !1;
				break;
			}
			a = r;
		}
		if (r !== void 0 && ae(r)) for (let t = 0, n = r.length; t !== n; ++t) {
			let n = r[t];
			if (isNaN(n)) {
				M("KeyframeTrack: Value is not a valid number.", this, t, n), e = !1;
				break;
			}
		}
		return e;
	}
	optimize() {
		let e = this.times.slice(), t = this.values.slice(), n = this.getValueSize(), r = this.getInterpolation() === C, i = e.length - 1, a = 1;
		for (let o = 1; o < i; ++o) {
			let i = !1, s = e[o];
			if (s !== e[o + 1] && (o !== 1 || s !== e[0])) {
				if (r) i = !0;
				else {
					let e = o * n, r = e - n, a = e + n;
					for (let o = 0; o !== n; ++o) {
						let n = t[e + o];
						if (n !== t[r + o] || n !== t[a + o]) {
							i = !0;
							break;
						}
					}
				}
			}
			if (i) {
				if (o !== a) {
					e[a] = e[o];
					let r = o * n, i = a * n;
					for (let e = 0; e !== n; ++e) t[i + e] = t[r + e];
				}
				++a;
			}
		}
		if (i > 0) {
			e[a] = e[i];
			for (let e = i * n, r = a * n, o = 0; o !== n; ++o) t[r + o] = t[e + o];
			++a;
		}
		return a === e.length ? (this.times = e, this.values = t) : (this.times = e.slice(0, a), this.values = t.slice(0, a * n)), this;
	}
	clone() {
		let e = this.times.slice(), t = this.values.slice(), n = this.constructor, r = new n(this.name, e, t);
		return r.createInterpolant = this.createInterpolant, wr(this.settings) && (r.settings = {
			inTangents: this.settings.inTangents.slice(),
			outTangents: this.settings.outTangents.slice()
		}), r;
	}
};
function Pr(e, t) {
	for (let n = 0, r = e.length; n !== r; n += 2) e[n] += t;
}
function Fr(e, t) {
	for (let n = 0, r = e.length; n !== r; n += 2) e[n] *= t;
}
Nr.prototype.ValueTypeName = "", Nr.prototype.TimeBufferType = Float32Array, Nr.prototype.ValueBufferType = Float32Array, Nr.prototype.DefaultInterpolation = S;
var Ir = class extends Nr {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
Ir.prototype.ValueTypeName = "bool", Ir.prototype.ValueBufferType = Array, Ir.prototype.DefaultInterpolation = x, Ir.prototype.InterpolantFactoryMethodLinear = void 0, Ir.prototype.InterpolantFactoryMethodSmooth = void 0;
var Lr = class extends Nr {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Lr.prototype.ValueTypeName = "color";
var Rr = class extends Nr {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Rr.prototype.ValueTypeName = "number";
var zr = class extends Tr {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = (n - t) / (r - t), c = e * o;
		for (let e = c + o; c !== e; c += 4) ve.slerpFlat(i, 0, a, c - o, a, c, s);
		return i;
	}
}, Br = class extends Nr {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	InterpolantFactoryMethodLinear(e) {
		return new zr(this.times, this.values, this.getValueSize(), e);
	}
};
Br.prototype.ValueTypeName = "quaternion", Br.prototype.InterpolantFactoryMethodSmooth = void 0;
var Vr = class extends Nr {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
Vr.prototype.ValueTypeName = "string", Vr.prototype.ValueBufferType = Array, Vr.prototype.DefaultInterpolation = x, Vr.prototype.InterpolantFactoryMethodLinear = void 0, Vr.prototype.InterpolantFactoryMethodSmooth = void 0;
var Hr = class extends Nr {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Hr.prototype.ValueTypeName = "vector";
var Ur = class extends ut {
	static registerNode(e) {
		this.prototype._lightNode = e;
	}
	constructor(e, t = 1) {
		super(), this.isLight = !0, this.type = "Light", this.color = new gt(e), this.intensity = t;
	}
	copy(e, t) {
		return super.copy(e, t), this.color.copy(e.color), this.intensity = e.intensity, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.color = this.color.getHex(), t.object.intensity = this.intensity, t;
	}
}, Wr = class extends Ur {
	constructor(e, t, n) {
		super(e, n), this.isHemisphereLight = !0, this.type = "HemisphereLight", this.position.copy(ut.DEFAULT_UP), this.updateMatrix(), this.groundColor = new gt(t);
	}
	copy(e, t) {
		return super.copy(e, t), this.groundColor.copy(e.groundColor), this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.groundColor = this.groundColor.getHex(), t;
	}
}, Gr = /*@__PURE__*/ new L(), Kr = /*@__PURE__*/ new I(), qr = /*@__PURE__*/ new I(), Jr = class {
	constructor(e) {
		this.camera = e, this.intensity = 1, this.bias = 0, this.biasNode = null, this.normalBias = 0, this.radius = 1, this.blurSamples = 8, this.mapSize = new F(512, 512), this.mapType = _, this.map = null, this.mapPass = null, this.matrix = new L(), this.autoUpdate = !0, this.needsUpdate = !1, this._frustum = new yr(), this._frameExtents = new F(1, 1), this._viewportCount = 1, this._viewports = [new Le(0, 0, 1, 1)];
	}
	getViewportCount() {
		return this._viewportCount;
	}
	getCamera() {
		return this.camera;
	}
	getFrustum() {
		return this._frustum;
	}
	updateMatrices(e) {
		let t = this.camera;
		Kr.setFromMatrixPosition(e.matrixWorld), t.position.copy(Kr), qr.setFromMatrixPosition(e.target.matrixWorld), t.lookAt(qr), t.updateMatrixWorld(), this._updateMatrix(t, this.matrix, this._frustum);
	}
	_updateMatrix(e, t, n, r) {
		Gr.multiplyMatrices(e.projectionMatrix, e.matrixWorldInverse), n.setFromProjectionMatrix(Gr, e.coordinateSystem, e.reversedDepth);
		let i = this._frameExtents, a = r ? r.z / i.x : 1, o = r ? r.w / i.y : 1, s = r ? r.x / i.x : 0, c = r ? r.y / i.y : 0;
		e.coordinateSystem === 2001 || e.reversedDepth ? t.set(.5 * a, 0, 0, .5 * a + s, 0, .5 * o, 0, .5 * o + c, 0, 0, 1, 0, 0, 0, 0, 1) : t.set(.5 * a, 0, 0, .5 * a + s, 0, .5 * o, 0, .5 * o + c, 0, 0, .5, .5, 0, 0, 0, 1), t.multiply(Gr);
	}
	getViewport(e) {
		return this._viewports[e];
	}
	getFrameExtents() {
		return this._frameExtents;
	}
	dispose() {
		this.map && this.map.dispose(), this.mapPass && this.mapPass.dispose();
	}
	copy(e) {
		return this.camera = e.camera.clone(), this.intensity = e.intensity, this.bias = e.bias, this.radius = e.radius, this.autoUpdate = e.autoUpdate, this.needsUpdate = e.needsUpdate, this.normalBias = e.normalBias, this.blurSamples = e.blurSamples, this.mapSize.copy(e.mapSize), this.mapType = e.mapType, this.biasNode = e.biasNode, this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		let e = {};
		return e.intensity = this.intensity, e.bias = this.bias, e.normalBias = this.normalBias, e.radius = this.radius, e.blurSamples = this.blurSamples, e.mapSize = this.mapSize.toArray(), e.mapType = this.mapType, e.camera = this.camera.toJSON(!1).object, delete e.camera.matrix, e;
	}
}, Yr = /*@__PURE__*/ new I(), Xr = /*@__PURE__*/ new ve(), Zr = /*@__PURE__*/ new I(), Qr = class extends ut {
	constructor() {
		super(), this.isCamera = !0, this.type = "Camera", this.matrixWorldInverse = new L(), this.projectionMatrix = new L(), this.projectionMatrixInverse = new L(), this.coordinateSystem = re, this._reversedDepth = !1;
	}
	get reversedDepth() {
		return this._reversedDepth;
	}
	copy(e, t) {
		return super.copy(e, t), this.matrixWorldInverse.copy(e.matrixWorldInverse), this.projectionMatrix.copy(e.projectionMatrix), this.projectionMatrixInverse.copy(e.projectionMatrixInverse), this.coordinateSystem = e.coordinateSystem, this;
	}
	getWorldDirection(e) {
		return super.getWorldDirection(e).negate();
	}
	updateMatrixWorld(e) {
		super.updateMatrixWorld(e), this.matrixWorld.decompose(Yr, Xr, Zr), Zr.x === 1 && Zr.y === 1 && Zr.z === 1 ? this.matrixWorldInverse.copy(this.matrixWorld).invert() : this.matrixWorldInverse.compose(Yr, Xr, Zr.set(1, 1, 1)).invert();
	}
	updateWorldMatrix(e, t, n = !1) {
		super.updateWorldMatrix(e, t, n), this.matrixWorld.decompose(Yr, Xr, Zr), Zr.x === 1 && Zr.y === 1 && Zr.z === 1 ? this.matrixWorldInverse.copy(this.matrixWorld).invert() : this.matrixWorldInverse.compose(Yr, Xr, Zr.set(1, 1, 1)).invert();
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, $r = class extends Qr {
	constructor(e = -1, t = 1, n = 1, r = -1, i = .1, a = 2e3) {
		super(), this.isOrthographicCamera = !0, this.type = "OrthographicCamera", this.zoom = 1, this.view = null, this.left = e, this.right = t, this.top = n, this.bottom = r, this.near = i, this.far = a, this.updateProjectionMatrix();
	}
	copy(e, t) {
		return super.copy(e, t), this.left = e.left, this.right = e.right, this.top = e.top, this.bottom = e.bottom, this.near = e.near, this.far = e.far, this.zoom = e.zoom, this.view = e.view === null ? null : Object.assign({}, e.view), this;
	}
	setViewOffset(e, t, n, r, i, a) {
		this.view === null && (this.view = {
			enabled: !0,
			fullWidth: 1,
			fullHeight: 1,
			offsetX: 0,
			offsetY: 0,
			width: 1,
			height: 1
		}), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = r, this.view.width = i, this.view.height = a, this.updateProjectionMatrix();
	}
	clearViewOffset() {
		this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = (this.right - this.left) / (2 * this.zoom), t = (this.top - this.bottom) / (2 * this.zoom), n = (this.right + this.left) / 2, r = (this.top + this.bottom) / 2, i = n - e, a = n + e, o = r + t, s = r - t;
		if (this.view !== null && this.view.enabled) {
			let e = (this.right - this.left) / this.view.fullWidth / this.zoom, t = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
			i += e * this.view.offsetX, a = i + e * this.view.width, o -= t * this.view.offsetY, s = o - t * this.view.height;
		}
		this.projectionMatrix.makeOrthographic(i, a, o, s, this.near, this.far, this.coordinateSystem, this.reversedDepth), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.zoom = this.zoom, t.object.left = this.left, t.object.right = this.right, t.object.top = this.top, t.object.bottom = this.bottom, t.object.near = this.near, t.object.far = this.far, this.view !== null && (t.object.view = Object.assign({}, this.view)), t;
	}
}, ei = class extends Jr {
	constructor() {
		super(new $r(-5, 5, 5, -5, .5, 500)), this.isDirectionalLightShadow = !0;
	}
}, ti = class extends Ur {
	constructor(e, t) {
		super(e, t), this.isDirectionalLight = !0, this.type = "DirectionalLight", this.position.copy(ut.DEFAULT_UP), this.updateMatrix(), this.target = new ut(), this.shadow = new ei();
	}
	dispose() {
		super.dispose(), this.shadow.dispose();
	}
	copy(e) {
		return super.copy(e), this.target = e.target.clone(), this.shadow = e.shadow.clone(), this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.shadow = this.shadow.toJSON(), t.object.target = this.target.uuid, t;
	}
}, ni = "\\[\\]\\.:\\/", ri = /* @__PURE__ */ RegExp("[\\[\\]\\.:\\/]", "g"), ii = "[^\\[\\]\\.:\\/]", ai = "[^" + ni.replace("\\.", "") + "]", oi = /*@__PURE__*/ "((?:WC+[\\/:])*)".replace("WC", ii), si = /*@__PURE__*/ "(WCOD+)?".replace("WCOD", ai), ci = /*@__PURE__*/ "(?:\\.(WC+)(?:\\[(.+)\\])?)?".replace("WC", ii), li = /*@__PURE__*/ "\\.(WC+)(?:\\[(.+)\\])?".replace("WC", ii), ui = RegExp("^" + oi + si + ci + li + "$"), di = [
	"material",
	"materials",
	"bones",
	"map"
], fi = class {
	constructor(e, t, n) {
		let r = n || z.parseTrackName(t);
		this._targetGroup = e, this._bindings = e.subscribe_(t, r);
	}
	getValue(e, t) {
		this.bind();
		let n = this._targetGroup.nCachedObjects_, r = this._bindings[n];
		r !== void 0 && r.getValue(e, t);
	}
	setValue(e, t) {
		let n = this._bindings;
		for (let r = this._targetGroup.nCachedObjects_, i = n.length; r !== i; ++r) n[r].setValue(e, t);
	}
	bind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].bind();
	}
	unbind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].unbind();
	}
}, z = class e {
	constructor(t, n, r) {
		this.path = n, this.parsedPath = r || e.parseTrackName(n), this.node = e.findNode(t, this.parsedPath.nodeName), this.rootNode = t, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
	static create(t, n, r) {
		return t && t.isAnimationObjectGroup ? new e.Composite(t, n, r) : new e(t, n, r);
	}
	static sanitizeNodeName(e) {
		return e.replace(/\s/g, "_").replace(ri, "");
	}
	static parseTrackName(e) {
		let t = ui.exec(e);
		if (t === null) throw Error("THREE.PropertyBinding: Cannot parse trackName: " + e);
		let n = {
			nodeName: t[2],
			objectName: t[3],
			objectIndex: t[4],
			propertyName: t[5],
			propertyIndex: t[6]
		}, r = n.nodeName && n.nodeName.lastIndexOf(".");
		if (r !== void 0 && r !== -1) {
			let e = n.nodeName.substring(r + 1);
			di.indexOf(e) !== -1 && (n.nodeName = n.nodeName.substring(0, r), n.objectName = e);
		}
		if (n.propertyName === null || n.propertyName.length === 0) throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: " + e);
		return n;
	}
	static findNode(e, t) {
		if (t === void 0 || t === "" || t === "." || t === -1 || t === e.name || t === e.uuid) return e;
		if (e.skeleton) {
			let n = e.skeleton.getBoneByName(t);
			if (n !== void 0) return n;
		}
		if (e.children) {
			let n = function(e) {
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (i.name === t || i.uuid === t) return i;
					let a = n(i.children);
					if (a) return a;
				}
				return null;
			}, r = n(e.children);
			if (r) return r;
		}
		return null;
	}
	_getValue_unavailable() {}
	_setValue_unavailable() {}
	_getValue_direct(e, t) {
		e[t] = this.targetObject[this.propertyName];
	}
	_getValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) e[t++] = n[r];
	}
	_getValue_arrayElement(e, t) {
		e[t] = this.resolvedProperty[this.propertyIndex];
	}
	_getValue_toArray(e, t) {
		this.resolvedProperty.toArray(e, t);
	}
	_setValue_direct(e, t) {
		this.targetObject[this.propertyName] = e[t];
	}
	_setValue_direct_setNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_direct_setMatrixWorldNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
	}
	_setValue_array_setNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.needsUpdate = !0;
	}
	_setValue_array_setMatrixWorldNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_arrayElement(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t];
	}
	_setValue_arrayElement_setNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_arrayElement_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_fromArray(e, t) {
		this.resolvedProperty.fromArray(e, t);
	}
	_setValue_fromArray_setNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.needsUpdate = !0;
	}
	_setValue_fromArray_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_getValue_unbound(e, t) {
		this.bind(), this.getValue(e, t);
	}
	_setValue_unbound(e, t) {
		this.bind(), this.setValue(e, t);
	}
	bind() {
		let t = this.node, n = this.parsedPath, r = n.objectName, i = n.propertyName, a = n.propertyIndex;
		if (t || (t = e.findNode(this.rootNode, n.nodeName), this.node = t), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !t) {
			j("PropertyBinding: No target node found for track: " + this.path + ".");
			return;
		}
		if (r) {
			let e = n.objectIndex;
			switch (r) {
				case "materials":
					if (!t.material) {
						M("PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.materials) {
						M("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
						return;
					}
					t = t.material.materials;
					break;
				case "bones":
					if (!t.skeleton) {
						M("PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
						return;
					}
					t = t.skeleton.bones;
					for (let n = 0; n < t.length; n++) if (t[n].name === e) {
						e = n;
						break;
					}
					break;
				case "map":
					if ("map" in t) {
						t = t.map;
						break;
					}
					if (!t.material) {
						M("PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.map) {
						M("PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
						return;
					}
					t = t.material.map;
					break;
				default:
					if (t[r] === void 0) {
						M("PropertyBinding: Can not bind to objectName of node undefined.", this);
						return;
					}
					t = t[r];
			}
			if (e !== void 0) {
				if (t[e] === void 0) {
					M("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, t);
					return;
				}
				t = t[e];
			}
		}
		let o = t[i];
		if (o === void 0) {
			let e = n.nodeName;
			M("PropertyBinding: Trying to update property for track: " + e + "." + i + " but it wasn't found.", t);
			return;
		}
		let s = this.Versioning.None;
		this.targetObject = t, t.isMaterial === !0 ? s = this.Versioning.NeedsUpdate : t.isObject3D === !0 && (s = this.Versioning.MatrixWorldNeedsUpdate);
		let c = this.BindingType.Direct;
		if (a !== void 0) {
			if (i === "morphTargetInfluences") {
				if (!t.geometry) {
					M("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
					return;
				}
				if (!t.geometry.morphAttributes) {
					M("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
					return;
				}
				t.morphTargetDictionary[a] !== void 0 && (a = t.morphTargetDictionary[a]);
			}
			c = this.BindingType.ArrayElement, this.resolvedProperty = o, this.propertyIndex = a;
		} else o.fromArray !== void 0 && o.toArray !== void 0 ? (c = this.BindingType.HasFromToArray, this.resolvedProperty = o) : Array.isArray(o) ? (c = this.BindingType.EntireArray, this.resolvedProperty = o) : this.propertyName = i;
		this.getValue = this.GetterByBindingType[c], this.setValue = this.SetterByBindingTypeAndVersioning[c][s];
	}
	unbind() {
		this.node = null, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
};
z.Composite = fi, z.prototype.BindingType = {
	Direct: 0,
	EntireArray: 1,
	ArrayElement: 2,
	HasFromToArray: 3
}, z.prototype.Versioning = {
	None: 0,
	NeedsUpdate: 1,
	MatrixWorldNeedsUpdate: 2
}, z.prototype.GetterByBindingType = [
	z.prototype._getValue_direct,
	z.prototype._getValue_array,
	z.prototype._getValue_arrayElement,
	z.prototype._getValue_toArray
], z.prototype.SetterByBindingTypeAndVersioning = [
	[
		z.prototype._setValue_direct,
		z.prototype._setValue_direct_setNeedsUpdate,
		z.prototype._setValue_direct_setMatrixWorldNeedsUpdate
	],
	[
		z.prototype._setValue_array,
		z.prototype._setValue_array_setNeedsUpdate,
		z.prototype._setValue_array_setMatrixWorldNeedsUpdate
	],
	[
		z.prototype._setValue_arrayElement,
		z.prototype._setValue_arrayElement_setNeedsUpdate,
		z.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
	],
	[
		z.prototype._setValue_fromArray,
		z.prototype._setValue_fromArray_setNeedsUpdate,
		z.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
	]
], s = class {
	constructor(e, t, n, r) {
		this.elements = [
			1,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r);
	}
	identity() {
		return this.set(1, 0, 0, 1), this;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 4; n++) this.elements[n] = e[n + t];
		return this;
	}
	set(e, t, n, r) {
		let i = this.elements;
		return i[0] = e, i[2] = t, i[1] = n, i[3] = r, this;
	}
}, s.prototype.isMatrix2 = !0, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: { revision: "187" } })), typeof window < "u" && (window.__THREE__ ? j("WARNING: Multiple instances of Three.js being imported.") : window.__THREE__ = "187");
// src/core/rng.js
function pi(e) {
	let t = e >>> 0;
	return () => {
		t = t + 1831565813 | 0;
		let e = Math.imul(t ^ t >>> 15, 1 | t);
		return e = e + Math.imul(e ^ e >>> 7, 61 | e) ^ e, ((e ^ e >>> 14) >>> 0) / 4294967296;
	};
}
function mi(e, t, n) {
	let r = e ^ Math.imul(t | 0, 668265261) ^ Math.imul(n | 0, 374761393) | 0;
	return r = Math.imul(r ^ r >>> 15, 2246822507), r = Math.imul(r ^ r >>> 13, 3266489909), (r ^ r >>> 16) >>> 0;
}
// src/gfx/builder.js
var hi = new gt(), gi = /* @__PURE__ */ new Map();
function _i(e) {
	let t = gi.get(e);
	return t || (hi.set(e), t = [
		hi.r,
		hi.g,
		hi.b
	], gi.set(e, t)), t;
}
var vi = [
	0,
	0,
	1,
	0,
	1,
	1,
	0,
	1
], B = class {
	constructor({ uv: e = !1, size: t = 1024 } = {}) {
		this.p = new Float32Array(t * 3), this.n = new Int8Array(t * 3), this.c = new Uint8Array(t * 3), this.t = e ? new Float32Array(t * 2) : null, this.count = 0;
	}
	reset() {
		return this.count = 0, this;
	}
	grow(e) {
		let t = this.p.length / 3;
		if (this.count + e <= t) return;
		for (; this.count + e > t;) t *= 2;
		let n = new Float32Array(t * 3);
		n.set(this.p.subarray(0, this.count * 3)), this.p = n;
		let r = new Int8Array(t * 3);
		r.set(this.n.subarray(0, this.count * 3)), this.n = r;
		let i = new Uint8Array(t * 3);
		if (i.set(this.c.subarray(0, this.count * 3)), this.c = i, this.t) {
			let e = new Float32Array(t * 2);
			e.set(this.t.subarray(0, this.count * 2)), this.t = e;
		}
	}
	tri(e, t, n, r, i = 1) {
		let a = t[0] - e[0], o = t[1] - e[1], s = t[2] - e[2], c = n[0] - e[0], l = n[1] - e[1], u = n[2] - e[2], d = o * u - s * l, f = s * c - a * u, p = a * l - o * c, m = 127 / (Math.hypot(d, f, p) || 1);
		d = Math.round(d * m), f = Math.round(f * m), p = Math.round(p * m);
		let h = _i(r), g = i * 255, _ = Math.min(255, h[0] * g + .5) | 0, v = Math.min(255, h[1] * g + .5) | 0, y = Math.min(255, h[2] * g + .5) | 0;
		this.grow(3);
		let b = this.count * 3, x = this.p, S = this.n, C = this.c;
		x[b] = e[0], x[b + 1] = e[1], x[b + 2] = e[2], S[b] = d, S[b + 1] = f, S[b + 2] = p, C[b] = _, C[b + 1] = v, C[b + 2] = y, b += 3, x[b] = t[0], x[b + 1] = t[1], x[b + 2] = t[2], S[b] = d, S[b + 1] = f, S[b + 2] = p, C[b] = _, C[b + 1] = v, C[b + 2] = y, b += 3, x[b] = n[0], x[b + 1] = n[1], x[b + 2] = n[2], S[b] = d, S[b + 1] = f, S[b + 2] = p, C[b] = _, C[b + 1] = v, C[b + 2] = y, this.count += 3;
	}
	quad(e, t, n, r, i, a = 1, o = vi) {
		let s = this.count * 2;
		if (this.tri(e, t, n, i, a), this.tri(e, n, r, i, a), this.t) {
			let e = this.t;
			e[s] = o[0], e[s + 1] = o[1], e[s + 2] = o[2], e[s + 3] = o[3], e[s + 4] = o[4], e[s + 5] = o[5], e[s + 6] = o[0], e[s + 7] = o[1], e[s + 8] = o[4], e[s + 9] = o[5], e[s + 10] = o[6], e[s + 11] = o[7];
		}
	}
	flat(e, t, n, r, i, a, o = 1, s) {
		this.quad([
			e,
			i,
			r
		], [
			t,
			i,
			r
		], [
			t,
			i,
			n
		], [
			e,
			i,
			n
		], a, o, s);
	}
	hexa(e, t, { top: n = t, bottom: r = !1, noTop: i = !1 } = {}) {
		i || this.quad(e[7], e[6], e[5], e[4], n), this.quad(e[3], e[2], e[6], e[7], t), this.quad(e[1], e[0], e[4], e[5], t), this.quad(e[2], e[1], e[5], e[6], t), this.quad(e[0], e[3], e[7], e[4], t), r && this.quad(e[0], e[1], e[2], e[3], t);
	}
	box(e, t, n, r, i, a, o, s = {}) {
		let { rot: c = 0, taper: l, shift: u } = s, d = r / 2, f = i / 2, p = a / 2, m = Math.cos(c), h = Math.sin(c), g = (r, i, a) => {
			let o = r * d, s = a * p;
			return i > 0 && (l && (o *= l[0], s *= l[1]), u && (o += u[0], s += u[1])), [
				e + o * m + s * h,
				t + i * f,
				n - o * h + s * m
			];
		};
		this.hexa([
			g(-1, -1, -1),
			g(1, -1, -1),
			g(1, -1, 1),
			g(-1, -1, 1),
			g(-1, 1, -1),
			g(1, 1, -1),
			g(1, 1, 1),
			g(-1, 1, 1)
		], o, s);
	}
	cylX(e, t, n, r, i, a, o = a, s = 10) {
		let c = e - i / 2, l = e + i / 2;
		for (let e = 0; e < s; e++) {
			let i = e / s * Math.PI * 2, u = (e + 1) / s * Math.PI * 2, d = t + r * Math.cos(i), f = n + r * Math.sin(i), p = t + r * Math.cos(u), m = n + r * Math.sin(u);
			this.quad([
				l,
				d,
				f
			], [
				c,
				d,
				f
			], [
				c,
				p,
				m
			], [
				l,
				p,
				m
			], a), this.tri([
				l,
				t,
				n
			], [
				l,
				d,
				f
			], [
				l,
				p,
				m
			], o), this.tri([
				c,
				t,
				n
			], [
				c,
				p,
				m
			], [
				c,
				d,
				f
			], o);
		}
	}
	build({ free: e = !1, groundUv: t = 0 } = {}) {
		let n = new pn(), r = this.count, i = (t, r) => {
			e && r.onUpload(function() {
				this.array = null;
			}), n.setAttribute(t, r);
		};
		if (i("position", new Zt(this.p.slice(0, r * 3), 3)), i("normal", new Zt(this.n.slice(0, r * 3), 3, !0)), i("color", new Zt(this.c.slice(0, r * 3), 3, !0)), this.t) i("uv", new Zt(this.t.slice(0, r * 2), 2));
		else if (t) {
			let e = new Float32Array(r * 2);
			for (let n = 0; n < r; n++) e[n * 2] = this.p[n * 3] / t, e[n * 2 + 1] = this.p[n * 3 + 2] / t;
			i("uv", new Zt(e, 2));
		}
		return n.computeBoundingSphere(), n.computeBoundingBox(), n;
	}
	get triangles() {
		return this.count / 3;
	}
}, yi = null;
function bi() {
	if (yi) return yi;
	let e = document.createElement("canvas");
	e.width = e.height = 64;
	let t = e.getContext("2d"), n = t.createRadialGradient(32, 32, 0, 32, 32, 32);
	return n.addColorStop(0, "rgba(255,255,255,1)"), n.addColorStop(.25, "rgba(255,255,255,0.55)"), n.addColorStop(.6, "rgba(255,255,255,0.14)"), n.addColorStop(1, "rgba(255,255,255,0)"), t.fillStyle = n, t.fillRect(0, 0, 64, 64), yi = new br(e), yi.colorSpace = O, yi;
}
// src/gfx/atlas.js
var xi = [
	["BAYHAVEN", "#ff4fa8"],
	["CLUB LUMA", "#29e6ff"],
	["THE PINK HERON", "#ff6fb8"],
	["TIDELINE MOTEL", "#ffa02e"],
	["MANGO MOON", "#ffd23e"],
	["CORAL ARCADE", "#b98bff"],
	["BAYHAVEN GRAND", "#fff0c0"],
	["DINER · 24H", "#ff5a5a"],
	["MORE CITY SOON", "#ffb020"],
	["SURF & VINYL", "#5dff9b"],
	["HOTEL ALBA", "#7fd6ff"],
	["LOW TIDE BAR", "#ff8f5a"],
	["SHELL YEAH", "#5dff9b"],
	["STORM MART", "#ffa02e"],
	["SECOND WIND THRIFT", "#b98bff"],
	["BIRDBATH CAR WASH", "#29e6ff"],
	["BAYHAVEN TOMORROW", "#29e6ff"],
	["NOW LEASING THE SKY", "#ff4fa8"],
	["MERIDIAN SPIRE", "#fff0c0"],
	["CITY HALL", "#ffd23e"],
	["FIRST BAYHAVEN SAVINGS", "#ff8f7a"],
	["IGUANA INSURANCE", "#5dff9b"],
	["MAISON SABLE", "#fff0c0"],
	["BAY CAB", "#ffd23e"]
], Si = xi.length / 2, Ci = [
	20,
	21,
	22,
	23,
	6,
	10
], wi = [
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	9,
	10,
	11,
	12,
	13,
	14,
	15
];
function Ti(e) {
	let t = e % 2 / 2 + 5e-4, n = t + .499, r = 1 - Math.floor(e / 2) / Si - 5e-4, i = r - 1 / Si + .001;
	return [
		t,
		i,
		n,
		i,
		n,
		r,
		t,
		r
	];
}
var Ei = null;
function Di() {
	if (Ei) return Ei;
	let e = document.createElement("canvas");
	e.width = 1024, e.height = Si * 128;
	let t = e.getContext("2d");
	t.fillStyle = "#0d0820", t.fillRect(0, 0, 1024, e.height), t.textAlign = "center", t.textBaseline = "middle", xi.forEach(([e, n], r) => {
		let i = r % 2 * 512, a = Math.floor(r / 2) * 128;
		t.fillStyle = "#140c2c", t.fillRect(i, a, 512, 128), t.strokeStyle = n, t.lineWidth = 6, t.shadowColor = n, t.shadowBlur = 18, t.strokeRect(i + 12, a + 12, 488, 104);
		let o = 76;
		do
			t.font = `italic 900 ${o}px "Trebuchet MS", "Arial Black", sans-serif`, o -= 4;
		while (t.measureText(e).width > 440 && o > 20);
		t.fillStyle = n, t.fillText(e, i + 256, a + 68), t.fillText(e, i + 256, a + 68), t.shadowBlur = 0, t.fillStyle = "rgba(255,255,255,0.75)", t.fillText(e, i + 256, a + 68);
	});
	let n = new br(e);
	return n.colorSpace = O, n.anisotropy = 4, Ei = n;
}
var Oi = null;
function ki() {
	if (Oi) return Oi;
	let e = document.createElement("canvas");
	e.width = e.height = 256;
	let t = e.getContext("2d"), n = t.createImageData(256, 256), r = pi(77), i = (/* @__PURE__ */ new Float32Array(1024)).map(() => r());
	for (let e = 0; e < 256; e++) for (let t = 0; t < 256; t++) {
		let a = 222 + (i[(e >> 3) * 32 + (t >> 3)] - .5) * 22 + (r() - .5) * 44, o = r();
		o > .992 ? a = 255 : o < .01 && (a = 150);
		let s = (e * 256 + t) * 4;
		n.data[s] = n.data[s + 1] = n.data[s + 2] = Math.max(0, Math.min(255, a)), n.data[s + 3] = 255;
	}
	t.putImageData(n, 0, 0);
	let a = new br(e);
	return a.wrapS = a.wrapT = d, a.colorSpace = O, a.anisotropy = 4, Oi = a;
}
// src/gfx/windowgrid.js
var Ai = null, ji = null;
function Mi() {
	if (Ai) return Ai;
	let e = document.createElement("canvas");
	e.width = e.height = 1024;
	let t = e.getContext("2d");
	t.clearRect(0, 0, 1024, 1024);
	for (let e = 0; e < 8; e++) {
		let n = e + 2, r = pi(4102 + e), i = 120 / n, a = e * 128 + 4;
		for (let e = 0; e < 16; e++) {
			let o = !1;
			for (let s = 0; s < n; s++) {
				let n = o ? r() < .5 : r() < .22;
				if (o = n, n) {
					let e = r(), n = .45 + r() * .55;
					t.fillStyle = `rgb(${(e < .75 ? [
						255,
						213,
						138
					] : e < .9 ? [
						143,
						232,
						255
					] : [
						255,
						143,
						208
					]).map((e) => Math.round(e * n)).join(",")})`;
				} else t.fillStyle = "#0c1420";
				t.fillRect(Math.round(a + (s + .2) * i), e * 64 + 16, Math.round(i * .6), 32);
			}
		}
	}
	return Ai = new br(e), Ai.wrapT = d, Ai.colorSpace = O, Ai.anisotropy = 4, Ai;
}
function Ni(e, t, n, r = 4.6, i = 3.8) {
	let a = Math.max(2, Math.min(9, Math.round(e / r))) - 2;
	return [
		(a * 128 + 4) / 1024,
		((a + 1) * 128 - 4) / 1024,
		t / (16 * i),
		n / (16 * i)
	];
}
var Pi = [
	-1,
	0,
	-1,
	0,
	-1,
	0,
	-1,
	0
];
function Fi() {
	if (ji) return ji;
	ji = new Sr({ vertexColors: !0 });
	let e = {
		uGrid: { value: Mi() },
		uOn: { value: 0 },
		uGlass: { value: new gt(3033707).multiplyScalar(.9) }
	};
	return ji.onBeforeCompile = (t) => {
		Object.assign(t.uniforms, e), t.vertexShader = "varying vec2 vWuv;\nvarying float vWy;\n" + t.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vWuv = uv; vWy = position.y;"), t.fragmentShader = "uniform sampler2D uGrid;\nuniform float uOn;\nuniform vec3 uGlass;\nvarying vec2 vWuv;\nvarying float vWy;\n" + t.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n  vec4 wg = texture2D(uGrid, vWuv) * step(0.0, vWuv.x);\n  diffuseColor.rgb = mix(diffuseColor.rgb, uGlass, wg.a);").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += wg.rgb * smoothstep(0.0, 0.08, uOn - 0.10 - 0.80 * vWy / 260.0);");
	}, ji.setOn = (t) => {
		e.uOn.value = t;
	}, ji;
}
// src/gfx/materials.js
var Ii = null;
function Li() {
	if (Ii) return Ii;
	let e = new Sr({
		vertexColors: !0,
		map: ki()
	}), t = new Sr({
		vertexColors: !0,
		polygonOffset: !0,
		polygonOffsetFactor: -2,
		polygonOffsetUnits: -2
	}), n = new Sr({ vertexColors: !0 }), r = new Gn({ vertexColors: !0 }), i = new Gn({ map: Di() }), a = new Gn({
		vertexColors: !0,
		transparent: !0,
		blending: 2,
		depthWrite: !1
	}), o = new Sr({
		vertexColors: !0,
		side: 2
	}), s = Fi();
	return Ii = {
		G: e,
		M: t,
		B: n,
		N: r,
		S: i,
		L: a,
		W: s,
		leaf: o,
		order: { L: 1 },
		update(e) {
			let t = Math.min(1, e * 1.6);
			r.color.setScalar(.62 + t * .6), i.color.setScalar(.6 + t * .6), a.color.setScalar(t), s.setOn(t), Ii.on = t, Ii.lit = t > .01;
		},
		lit: !1
	}, Ii;
}
// src/gfx/murals.js
var Ri = [
	"#ffb347",
	"#2ec4b6",
	"#ff6f91",
	"#b5e48c",
	"#fff1c9"
], zi = [
	"#ff3fa4",
	"#29e6ff",
	"#ffa02e",
	"#ff5a5a"
], Bi = [
	"#ff9eb5",
	"#8fe3cf",
	"#ffc98f",
	"#9fd2ff",
	"#fff1c9",
	"#c9a8ff",
	"#ff8f7a",
	"#7fd6e8",
	"#f7f3ea"
], Vi = "#150f3d", Hi = Math.PI * 2, Ui = 8, Wi = 6, Gi = 48, Ki = 16;
function qi(e) {
	let t = pi(e * 7 + 3), n = [...zi, ...Bi], r = ["#b46bff", "#5dff9b"];
	for (; r.length < 5;) r.push(n.splice(Math.floor(t() * n.length), 1)[0]);
	return r;
}
var Ji = (e) => {
	e.fill(), e.stroke();
}, Yi = (e, t, n, r, i) => {
	e.beginPath(), e.ellipse(t, n, r, i, 0, 0, Hi), Ji(e);
}, Xi = (e, t) => {
	e.beginPath(), t.forEach(([t, n], r) => r ? e.lineTo(t, n) : e.moveTo(t, n)), e.closePath(), Ji(e);
}, Zi = (e, t, n, r, i, a) => {
	e.beginPath(), e.roundRect ? e.roundRect(t, n, r, i, a) : e.rect(t, n, r, i), Ji(e);
}, Qi = (e, t, n) => {
	let r = e.lineWidth, i = e.strokeStyle;
	e.lineCap = "round", e.beginPath(), t(), e.lineWidth = n + r * 2, e.stroke(), e.beginPath(), t(), e.lineWidth = n, e.strokeStyle = e.fillStyle, e.stroke(), e.lineWidth = r, e.strokeStyle = i;
}, $i = {
	disc(e) {
		for (let t = 0; t < 12; t++) {
			let n = t / 12 * Hi;
			Xi(e, [
				[Math.cos(n - .12) * .31, Math.sin(n - .12) * .31],
				[Math.cos(n + .12) * .31, Math.sin(n + .12) * .31],
				[Math.cos(n) * .5, Math.sin(n) * .5]
			]);
		}
		Yi(e, 0, 0, .27, .27);
	},
	halfdisc(e, t) {
		e.beginPath(), e.arc(0, .25, .5, Math.PI, 0), e.closePath(), Ji(e), e.save(), e.clip(), e.fillStyle = t;
		for (let t = 0; t < 3; t++) e.fillRect(-.5, .1 - t * .13, 1, .045);
		e.restore();
	},
	wave(e) {
		for (let t = 0; t < 4; t++) {
			let n = -.5 + t * .25;
			e.beginPath(), e.moveTo(n, .12), e.arc(n + .25, .12, .25, Math.PI, Math.PI * 1.5), e.lineTo(n + .25, .12), e.closePath(), Ji(e);
		}
	},
	bird(e) {
		Qi(e, () => {
			e.moveTo(.2, .02), e.quadraticCurveTo(.3, -.26, .36, -.27);
		}, .07), Yi(e, .38, -.28, .07, .07), Xi(e, [
			[.43, -.32],
			[.5, -.27],
			[.43, -.23]
		]), Yi(e, -.05, .1, .32, .17), e.beginPath(), e.arc(-.06, .12, .19, Math.PI * 1.1, Math.PI * 1.9), e.stroke();
	},
	fish(e) {
		Xi(e, [
			[.2, 0],
			[.48, -.2],
			[.48, .2]
		]), Yi(e, -.06, 0, .33, .17), e.fillStyle = e.strokeStyle, e.beginPath(), e.arc(-.22, -.04, .03, 0, Hi), e.fill();
	},
	hand(e) {
		let t = [
			.26,
			.36,
			.4,
			.36,
			.28
		];
		for (let n = 0; n < 5; n++) e.save(), e.translate(0, .14), e.rotate((-30 + n * 15) * Math.PI / 180), Zi(e, -.04, -t[n] - .1, .08, t[n] + .06, .04), e.restore();
		Zi(e, -.17, .02, .34, .36, .09);
	},
	frond(e) {
		for (let t = 0; t < 7; t++) for (let n of [-1, 1]) {
			let r = -.42 + t * .13;
			Xi(e, [
				[0, r],
				[n * (.34 - Math.abs(t - 3) * .04), r - .1],
				[0, r + .09]
			]);
		}
		Qi(e, () => {
			e.moveTo(0, .5), e.lineTo(0, -.48);
		}, .035);
	},
	eye(e) {
		e.beginPath(), e.moveTo(-.5, 0), e.quadraticCurveTo(0, -.44, .5, 0), e.quadraticCurveTo(0, .44, -.5, 0), Ji(e), e.fillStyle = e.strokeStyle, e.beginPath(), e.arc(0, 0, .14, 0, Hi), e.fill();
	},
	flamingo(e) {
		Qi(e, () => {
			e.moveTo(-.1, .16), e.lineTo(-.1, .5), e.moveTo(0, .16), e.lineTo(.03, .5);
		}, .025), Qi(e, () => {
			e.moveTo(.06, -.02), e.bezierCurveTo(.26, -.18, -.12, -.3, .1, -.44);
		}, .06), Yi(e, -.05, .06, .21, .13), Xi(e, [
			[.1, -.47],
			[.22, -.4],
			[.1, -.4]
		]);
	},
	dots(e) {
		for (let t = 0; t < 5; t++) for (let n = 0; n < 5; n++) Yi(e, -.4 + t * .2, -.4 + n * .2, .065, .065);
	},
	zigzag(e) {
		Qi(e, () => {
			for (let t = 0; t <= 8; t++) {
				let n = -.5 + t * .125, r = t % 2 ? -.1 : .1;
				t ? e.lineTo(n, r) : e.moveTo(n, r);
			}
		}, .08);
	}
};
Object.keys($i).concat("band");
var ea = [
	"hero",
	"parade",
	"collage",
	"horizon",
	"split"
], ta = [
	"bird",
	"fish",
	"hand",
	"flamingo",
	"disc",
	"frond",
	"eye"
], na = [
	...ta,
	"dots",
	"zigzag",
	"wave",
	"halfdisc"
];
function ra(e, t, n, r, i, a, o) {
	let s = pi(i), c = Math.floor(s() * 5), l = Math.floor(s() * a.length), u = a.map((e, t) => a[(t + l) % a.length]), d = s() < .5 ? Vi : "#ffffff", f = 3 * r / 256, p = [], m = 0, h = () => {
		let e;
		do
			e = 1 + Math.floor(s() * (u.length - 1));
		while (e === m);
		return m = e, u[e];
	}, g = (e) => e[Math.floor(s() * e.length)], _ = (t, n, i, a, o, s, c) => {
		e.save(), e.translate(n * r, i * r), e.rotate(o), e.scale(a * r * (c ? -1 : 1), a * r), e.lineWidth = f / (a * r), e.lineJoin = "round", e.strokeStyle = d, e.fillStyle = s, $i[t](e, u[0]), e.restore(), p.push([
			n,
			i,
			a,
			s
		]);
	};
	e.save(), e.beginPath(), e.rect(t, n, r, r), e.clip(), e.translate(t, n), e.fillStyle = u[0], e.fillRect(0, 0, r, r);
	for (let t = 0, n = 1 + Math.floor(s() * 3); t < n; t++) {
		let n = (.1 + s() * .7) * r, i = (.06 + s() * .14) * r, a = (s() - .5) * .7 * r;
		e.fillStyle = u[1 + t % 2], e.beginPath(), e.moveTo(0, n - a), e.lineTo(r, n + a), e.lineTo(r, n + a + i), e.lineTo(0, n - a + i), e.fill();
	}
	if (c === 0) _(g(ta), s() < .5 ? 1 / 3 : 2 / 3, .52, .7, (s() - .5) * .3, h(), s() < .5);
	else if (c === 1) {
		let e = 5 + Math.floor(s() * 3), t = g(ta), n = h(), r = h();
		for (let i = 0; i < e; i++) _(t, (i + .5) / e, .55 + (i % 2 ? .05 : -.05), .95 / e * 1.5, i % 2 ? .15 : -.15, i % 2 ? n : r);
	} else if (c === 2) for (let e = 0, t = 9 + Math.floor(s() * 6); e < t; e++) _(g(na), .1 + s() * .8, .1 + s() * .75, .2 + s() * .4, (s() - .5) * 1.2, h(), s() < .5);
	else if (c === 3) {
		_("halfdisc", .3 + s() * .4, .5, .56, 0, h());
		for (let e = 0; e < 3; e++) _("wave", .5 + (e % 2 ? .06 : -.06), .72 + e * .11, 1.15, 0, h());
		_("bird", .22 + s() * .1, .2, .24, -.1, h()), _("bird", .7 + s() * .1, .14, .18, .1, h(), !0);
	} else {
		let t = u[1], n = u[2], i = g(ta);
		e.fillStyle = t, e.fillRect(0, 0, r / 2, r), e.fillStyle = n, e.fillRect(r / 2, 0, r / 2, r), _(i, .27, .5, .42, 0, n), _(i, .73, .5, .42, 0, t, !0);
	}
	if (o) for (let t = 0; t < 3; t++) {
		let t = p[Math.floor(s() * p.length)], n = (4 + s() * 4) * r / 256, i = (20 + s() * 70) * r / 256, a = (t[0] + (s() - .5) * t[2] * .5) * r, o = Math.min(.9, t[1] + t[2] * .2) * r;
		e.fillStyle = t[3], e.beginPath(), e.roundRect ? e.roundRect(a, o, n, i, n / 2) : e.rect(a, o, n, i), e.fill();
	}
	e.fillStyle = d, e.globalAlpha = .06;
	for (let t = 0; t < 300; t++) e.fillRect(s() * r, s() * r, f * .8, f * .8);
	return e.globalAlpha = 1, [
		"fish",
		"disc",
		"eye"
	].forEach((e, t) => _(e, .78 + t * .08, .94, .06, 0, d)), e.restore(), ea[c];
}
function ia(e, t, n, r, i, a, o, s) {
	let c = r / 512, l = pi(s);
	e.save(), e.beginPath(), e.rect(t, n, r, i), e.clip(), e.translate(t, n), e.fillStyle = "#fff1c9", e.fillRect(0, 0, r, i), e.textAlign = "left", e.textBaseline = "middle";
	let u = 76 * c, d = () => {
		e.font = `900 ${u}px "Trebuchet MS", "Arial Black", sans-serif`;
	};
	for (d(); e.measureText(a).width > 440 * c && u > 18 * c;) u -= 4 * c, d();
	e.globalAlpha = .45, e.fillStyle = o;
	for (let t of [.74, .86]) e.beginPath(), e.moveTo(40 * c, t * i), e.quadraticCurveTo(r / 2, (t + .04) * i, r - 40 * c, (t - .02) * i), e.lineTo(r - 44 * c, (t + .05) * i), e.quadraticCurveTo(r / 2, (t + .1) * i, 36 * c, (t + .06) * i), e.fill();
	e.globalAlpha = 1;
	let f = (r - e.measureText(a).width) / 2;
	for (let t of a) {
		let n = e.measureText(t).width;
		e.save(), e.translate(f + n / 2, i * .46 + (l() - .5) * 6 * c), e.rotate((l() - .5) * .105), e.fillStyle = Vi, e.fillText(t, -n / 2 + 4 * c, 4 * c), e.fillStyle = o, e.fillText(t, -n / 2, 0), e.restore(), f += n;
	}
	e.restore();
}
var aa = null, oa = null, sa = null, ca = null, la = 0, ua = /* @__PURE__ */ new Map(), da = /* @__PURE__ */ new Map(), fa = {
	size: 0,
	cells: Gi,
	boards: Ki,
	painted: 0,
	reused: 0,
	boardsPainted: 0,
	layouts: {}
};
function pa(e = 2048) {
	return aa && aa.width === e || (aa || (aa = document.createElement("canvas"), oa = aa.getContext("2d")), aa.width = aa.height = e, ua.clear(), da.clear(), fa.size = e, oa.fillStyle = "#fdf6ea", oa.fillRect(0, 0, e, e), sa && sa.dispose(), sa = new br(aa), sa.colorSpace = O, sa.anisotropy = 4, ca && (ca.map = sa)), sa;
}
function ma(e, t, n) {
	let r = e.get(t);
	if (r) return r.used = ++la, r;
	let i = e.size, a = null;
	if (e.size >= n) {
		for (let [t, n] of e) (!a || n.used < a[1].used) && (a = [t, n]);
		i = a[1].slot, e.delete(a[0]), fa.reused++;
	}
	let o = {
		slot: i,
		used: ++la,
		fresh: !0
	};
	return e.set(t, o), o;
}
var ha = (e, t, n, r, i) => {
	let a = aa.width, o = (e + i) / a, s = (e + n - i) / a, c = 1 - (t + i) / a, l = 1 - (t + r - i) / a;
	return [
		o,
		l,
		s,
		l,
		s,
		c,
		o,
		c
	];
};
function ga(e, t, { drips: n = !1 } = {}) {
	aa || pa();
	let r = aa.width / Ui, i = ma(ua, e + "|" + t.join() + (n ? "d" : ""), Gi), a = i.slot % Ui * r, o = Math.floor(i.slot / Ui) * r;
	return i.fresh && (i.fresh = !1, i.layout = ra(oa, a, o, r, e, t, n), fa.painted++, fa.layouts[i.layout] = (fa.layouts[i.layout] || 0) + 1, sa.needsUpdate = !0), ha(a, o, r, r, 1.5);
}
function _a(e, t = "#ff6f91") {
	aa || pa();
	let n = aa.width / 4, r = n / 4, i = ma(da, t + "|" + e, Ki), a = i.slot % 4 * n, o = Wi * (aa.width / Ui) + Math.floor(i.slot / 4) * r;
	if (i.fresh) {
		i.fresh = !1;
		let s = 0;
		for (let t of e) s = s * 31 + t.charCodeAt(0) | 0;
		ia(oa, a, o, n, r, e, t, s), fa.boardsPainted++, sa.needsUpdate = !0;
	}
	return ha(a, o, n, r, 1);
}
function va(e, t, n, r, i, a, o, s) {
	let c = Math.hypot(n[0] - t[0], n[1] - t[1]), l = s && s.cells || Math.max(1, Math.round(c / 12), Math.ceil(c / (2 * (i - r))));
	for (let c = 0; c < l; c++) {
		let u = [t[0] + (n[0] - t[0]) * c / l, t[1] + (n[1] - t[1]) * c / l], d = [t[0] + (n[0] - t[0]) * (c + 1) / l, t[1] + (n[1] - t[1]) * (c + 1) / l];
		e.quad([
			u[0],
			r,
			u[1]
		], [
			d[0],
			r,
			d[1]
		], [
			d[0],
			i,
			d[1]
		], [
			u[0],
			i,
			u[1]
		], 16777215, 1, ga(a + c, o, s));
	}
	return l;
}
function ya() {
	return ca || (ca = new Gn({ map: sa || pa() })), ca;
}
var ba = () => {
	ca.color.setScalar(1 - .5 * (Li().on || 0));
};
function xa(e) {
	let t = new rr(e.build({ free: !0 }), ya());
	return t.onBeforeRender = ba, t.userData.murals = e.triangles / 2, t;
}
// src/world/decks.js
var V = {
	z: -1480,
	half: 13,
	y: 8,
	x0: -3e3,
	x1: 3e3,
	speed: 30.6,
	thick: 1.1
}, Sa = 100, Ca = 15, wa = 40, Ta = 5, Ea = [
	[
		-2400,
		-1,
		1
	],
	[
		-900,
		-1,
		1
	],
	[
		-900,
		1,
		-1
	],
	[
		700,
		-1,
		1
	],
	[
		700,
		1,
		-1
	],
	[
		2200,
		1,
		-1
	]
], Da = [
	{
		x: -2400,
		name: "Gander Road",
		pts: [[-2400, -1520], [-2400, -1498]]
	},
	{
		x: -900,
		name: "Calle Orquídea",
		under: !0,
		pts: [
			[-932, -1397],
			[-900, -1440],
			[-900, -1462],
			[-900, -1498],
			[-900, -1520]
		]
	},
	{
		x: 700,
		name: "Route 44",
		under: !0,
		pts: [
			[692, -1397],
			[700, -1440],
			[700, -1462],
			[700, -1498],
			[700, -1520]
		]
	},
	{
		x: 2200,
		name: "Keel Street",
		pts: [
			[2212, -1397],
			[2200, -1440],
			[2200, -1462]
		]
	}
], Oa = Ea.map(([e, t, n]) => {
	let r = V.z + t * (V.half + Ta), i = e + n * Ca, a = i + n * Sa, o = a + n * wa;
	return {
		x: e,
		side: t,
		dir: n,
		zc: r,
		foot: i,
		top: a,
		join: o,
		z0: r - Ta,
		z1: r + Ta,
		x0: Math.min(i, a),
		x1: Math.max(i, a),
		p0: Math.min(a, o),
		p1: Math.max(a, o)
	};
}), ka = Da.filter((e) => e.under).map((e) => e.x);
function Aa() {
	let e = [], t = /* @__PURE__ */ new Set([V.x0, V.x1]);
	for (let e of Oa) t.add(e.join);
	let n = [...t].sort((e, t) => e - t), r = [];
	for (let e = 0; e < n.length - 1; e++) {
		let t = Math.ceil((n[e + 1] - n[e]) / 150);
		for (let i = 0; i < t; i++) r.push([
			Math.round(n[e] + (n[e + 1] - n[e]) * i / t),
			V.z,
			V.y
		]);
	}
	r.push([
		V.x1,
		V.z,
		V.y
	]), e.push({
		id: "bayline-expressway",
		name: "Bayline Expressway",
		kind: "expressway",
		width: 26,
		lanes: 3,
		offsets: [
			2.2,
			5.8,
			9.4
		],
		speed: V.speed,
		level: 1,
		pts: r
	});
	for (let t of Oa) e.push({
		id: "ramp:" + t.x + (t.side < 0 ? "n" : "s"),
		name: "Bayline Expressway ramp",
		kind: "ramp",
		width: 10,
		lanes: 1,
		offsets: [2.5],
		speed: 16.7,
		level: 1,
		pts: [
			[
				t.x,
				t.zc,
				0
			],
			[
				t.foot,
				t.zc,
				0
			],
			[
				t.top,
				t.zc,
				V.y
			],
			[
				t.join,
				V.z,
				V.y
			]
		]
	});
	for (let t of Da) e.push({
		id: "under:" + t.x,
		name: t.name,
		kind: "street",
		width: 14,
		lanes: 1,
		offsets: [3.5],
		speed: 11.1,
		level: 0,
		pts: t.pts.map(([e, t]) => [
			e,
			t,
			0
		])
	});
	return e;
}
function ja() {
	let e = 1e9, t = 1e9, n = 0, r = (e) => e >= V.z - V.half - 10 && e <= V.z + V.half + 10, i = {
		y: 0,
		ramp: !1
	};
	function a(e, t) {
		if (!r(t) || e < V.x0 || e > V.x1) return null;
		if (Math.abs(t - V.z) <= V.half) return i.y = V.y, i.ramp = !1, i;
		for (let n of Oa) if (!(t < n.z0 || t > n.z1)) {
			if (e >= n.x0 && e <= n.x1) return i.y = V.y * Math.abs(e - n.foot) / Sa, i.ramp = !0, i;
			if (e >= n.p0 && e <= n.p1) return i.y = V.y, i.ramp = !1, i;
		}
		return null;
	}
	let o = (e) => ka.some((t) => Math.abs(e - t) <= 8);
	return {
		deck: V,
		ramps: Oa,
		surface: a,
		heightAt(r, i, s) {
			let c = a(r, i);
			return c ? c.ramp && c.y < 1.5 ? c.y : (s === void 0 && (s = Math.abs(r - e) < 3 && Math.abs(i - t) < 3 ? n : c.ramp || !o(r) ? 1 : 0), s ? c.y : null) : null;
		},
		step(e, t, n) {
			let r = a(t, n);
			return r ? r.ramp ? r.y < .3 ? 0 : e || r.y < 1.5 ? 1 : 0 : e : 0;
		},
		levelAt(e, t) {
			let n = a(e, t);
			return n && (n.ramp ? n.y >= .3 : !o(e)) ? 1 : 0;
		},
		track(r, i, a) {
			e = r, t = i, n = a;
		}
	};
}
// src/world/gen/decks.js
var Ma = /* @__PURE__ */ t({
	default: () => Ka,
	stats: () => Ba
}), Na = 12170414, Pa = 3881286, Fa = 15918768, Ia = 14209736, La = 10133614, Ra = "#2f7d5b", za = {
	"-2400n": "Mallard Greens",
	"-900n": "Northgate",
	"-900s": "Palma Vieja",
	"700n": "Route 44",
	"700s": "Meridian",
	"2200s": "Rustwater"
}, Ba = {
	pillars: 0,
	signs: 0,
	ramps: 0,
	spans: 0
};
function Va(e, t, n) {
	let r = [[e, t]];
	for (let [e, t] of n) r = r.flatMap(([n, r]) => t <= n || e >= r ? [[n, r]] : [[n, Math.min(r, e)], [Math.max(n, t), r]].filter(([e, t]) => t - e > .5));
	return r;
}
var Ha = (e, t, n, r, i, a, o) => {
	e.quad(t, n, r, i, a, o), e.quad(i, r, n, t, a, o);
}, H = V.y, Ua = V.thick;
function Wa(e, t, n) {
	let r = e.B, i = t.x0, a = t.x1, o = t.dir > 0 ? .02 : H, s = t.dir > 0 ? H : .02, c = t.zc + t.side * 5, l = t.zc - t.side * 5;
	r.quad([
		i,
		o,
		t.z1
	], [
		a,
		s,
		t.z1
	], [
		a,
		s,
		t.z0
	], [
		i,
		o,
		t.z0
	], Pa);
	for (let e of [c, l]) Ha(r, [
		i,
		0,
		e
	], [
		a,
		0,
		e
	], [
		a,
		s,
		e
	], [
		i,
		o,
		e
	], Na, .85);
	if (Ha(r, [
		t.top,
		0,
		t.z0
	], [
		t.top,
		0,
		t.z1
	], [
		t.top,
		H,
		t.z1
	], [
		t.top,
		H,
		t.z0
	], Na, .75), r.box((t.p0 + t.p1) / 2, H - Ua / 2, t.zc, t.p1 - t.p0, Ua, 10, Na, {
		top: Pa,
		bottom: !0
	}), n) return;
	for (let e of [c, l]) Ha(r, [
		i,
		o,
		e
	], [
		a,
		s,
		e
	], [
		a,
		s + .9,
		e
	], [
		i,
		o + .9,
		e
	], Ia);
	r.box((t.p0 + t.p1) / 2, H + .45, c, t.p1 - t.p0, .9, .5, Ia), e.M.quad([
		i,
		o + .03,
		t.zc + .12
	], [
		a,
		s + .03,
		t.zc + .12
	], [
		a,
		s + .03,
		t.zc - .12
	], [
		i,
		o + .03,
		t.zc - .12
	], Fa), e.solid(Math.min(t.foot, t.join), Math.max(t.foot, t.join), c - .25, c + .25, H + 1, 1), e.solid(i, a, l - .25, l + .25, H + 1, 1);
	let u = t.foot + t.dir * 12.5;
	e.solid(Math.min(u, t.top), Math.max(u, t.top), t.z0, t.z1, H, 0), Ba.ramps++;
}
function Ga(e, t, n, r) {
	let i = e.B;
	for (let e of [-1, 1]) i.box(n, H + 3.5, V.z + e * 13.6, .5, 7, .5, 7301752);
	i.box(n, H + 7.2, V.z, .5, .6, 27.6, 7301752);
	for (let e of [-1, 1]) {
		let a = V.z + e * 6.5, o = _a(r, Ra), s = .3;
		t.quad([
			n + s,
			H + 5.2,
			a + 6
		], [
			n + s,
			H + 5.2,
			a - 6
		], [
			n + s,
			H + 8.2,
			a - 6
		], [
			n + s,
			H + 8.2,
			a + 6
		], 16777215, 1, o), t.quad([
			n - s,
			H + 5.2,
			a - 6
		], [
			n - s,
			H + 5.2,
			a + 6
		], [
			n - s,
			H + 8.2,
			a + 6
		], [
			n - s,
			H + 8.2,
			a - 6
		], 16777215, 1, o), i.box(n, H + 6.7, a, .5, 3.3, 12.4, 2054721);
	}
	Ba.signs++;
}
var Ka = {
	id: "decks",
	stats: Ba,
	touches: (e) => e.z0 < -1397 && e.z1 > -1520 && e.x1 > V.x0 - 40 && e.x0 < V.x1 + 40,
	*build(e, t, n) {
		let r = t.rect, i = Math.max(r.x0, V.x0), a = Math.min(r.x1, V.x1), o = r.z0 < V.z && r.z1 > V.z && a > i;
		r.z0 < -1440 && r.z1 > -1500 && r.x0 < 1800 && e.G.flat(r.x0, Math.min(r.x1, 1800), r.x0 >= 720 ? Math.max(r.z0, -1560) : -1500, -1440, -.03, La);
		for (let r of n.roadsInChunk(t.cx, t.cz)) {
			if (r.zone !== "decks" || r.level) continue;
			let t = -(r.bz - r.az) / r.len * 7, i = (r.bx - r.ax) / r.len * 7, a = n.heightAt((r.ax + r.bx) / 2, (r.az + r.bz) / 2, 0) + .03, o = (r.bx - r.ax) / r.len * 3, s = (r.bz - r.az) / r.len * 3;
			e.G.quad([
				r.ax - t - o,
				a,
				r.az - i - s
			], [
				r.ax + t - o,
				a,
				r.az + i - s
			], [
				r.bx + t + o,
				a,
				r.bz + i + s
			], [
				r.bx - t + o,
				a,
				r.bz - i + s
			], Pa);
		}
		if (!o) return;
		yield;
		let s = e.B, c = e.M, l = (i + a) / 2, u = a - i;
		s.box(l, H - Ua / 2, V.z, u, Ua, V.half * 2, Na, {
			top: Pa,
			bottom: !0
		}), Ba.spans++;
		for (let t of [-1, 1]) {
			let n = V.z + t * (V.half - .25);
			for (let [r, o] of Va(i, a, Oa.filter((e) => e.side === t).map((e) => [e.p0, e.p1]))) s.box((r + o) / 2, H + .45, n, o - r, .9, .5, Ia), e.solid(r, o, n - .25, n + .25, H + 1, 1);
			c.flat(i, a, V.z + t * 11.2 - .1, V.z + t * 11.2 + .1, H + .02, 16777215);
			for (let e of [4, 7.6]) for (let n = Math.ceil(i / 12) * 12; n + 4 <= a; n += 12) c.flat(n, n + 4, V.z + t * e - .1, V.z + t * e + .1, H + .02, Fa);
		}
		for (let [t, n] of Va(i, a, Oa.map((e) => [e.p0, e.p1]))) s.box((t + n) / 2, H + .4, V.z, n - t, .8, .8, Ia, { top: 16763279 }), e.solid(t, n, V.z - .4, V.z + .4, H + 1, 1);
		for (let t of [V.x0, V.x1]) t >= r.x0 && t <= r.x1 && (s.box(t, H + .6, V.z, .6, 1.2, 26, 16742942), e.solid(t - .5, t + .5, V.z - 13, V.z + 13, H + 1.2, 1));
		yield;
		for (let t = Math.ceil(i / 40) * 40; t < a; t += 40) if (!ka.some((e) => Math.abs(t - e) < 14)) {
			for (let n of [-1, 1]) s.box(t, (H - Ua) / 2, V.z + n * 8, 1.6, H - Ua, 1.6, Na), e.solid(t - .8, t + .8, V.z + n * 8 - .8, V.z + n * 8 + .8, H - Ua, 0);
			e.low || s.box(t, H - Ua - .5, V.z, 2, 1, 22, Na, { bottom: !0 }), Ba.pillars++;
		}
		let d = null;
		for (let t of Oa) t.top < r.x0 || t.top >= r.x1 || (Wa(e, t, !1), d || (pa(e.low ? 1024 : 2048), d = new B({
			uv: !0,
			size: 64
		})), Ga(e, d, t.top - t.dir * 30, za[t.x + (t.side < 0 ? "n" : "s")]));
		d && e.object(xa(d));
	},
	shell(e, t) {
		let n = t.rect, r = Math.max(n.x0, V.x0), i = Math.min(n.x1, V.x1);
		if (n.z0 < V.z && n.z1 > V.z && i > r) {
			e.B.box((r + i) / 2, H - Ua / 2, V.z, i - r, Ua, V.half * 2, Na, {
				top: Pa,
				bottom: !0
			});
			for (let t = Math.ceil(r / 80) * 80; t < i; t += 80) e.B.box(t, (H - Ua) / 2, V.z, 1.6, H - Ua, 18, Na, { noTop: !0 });
			for (let t of Oa) t.top >= n.x0 && t.top < n.x1 && Wa(e, t, !0);
		}
	}
}, qa = /* @__PURE__ */ t({
	BOARD: () => Xa,
	CURB: () => K,
	GLASS: () => G,
	NEON: () => Ya,
	PASTEL: () => Ja,
	ROOF: () => W,
	TRIM: () => U,
	barrier: () => oo,
	cellBox: () => Y,
	detailBuilding: () => io,
	lifeguardHut: () => so,
	neonStrip: () => to,
	pick: () => Za,
	ribbons: () => eo,
	shopSign: () => ro,
	signBoard: () => no,
	slab: () => ao,
	span: () => Qa,
	wallQuad: () => q,
	wallSlab: () => J,
	windows: () => $a
}), Ja = [
	16752309,
	9429967,
	16763279,
	10474239,
	16773577,
	13215999,
	16748410,
	8378088,
	16249834
], Ya = [
	16727972,
	2746111,
	11824127,
	16752686,
	6160283,
	16734810
], U = 16643818, W = 7301752, G = 3033707, K = .14, Xa = 1313836, Za = (e, t) => t[Math.floor(e.rnd() * t.length)];
function q(e, t, n, r, i, a, o) {
	let s = n - i / 2, c = n + i / 2, l = r - a / 2, u = r + a / 2;
	if (t === "s") {
		let t = e.z1 + o;
		return [
			[
				s,
				l,
				t
			],
			[
				c,
				l,
				t
			],
			[
				c,
				u,
				t
			],
			[
				s,
				u,
				t
			]
		];
	}
	if (t === "n") {
		let t = e.z0 - o;
		return [
			[
				c,
				l,
				t
			],
			[
				s,
				l,
				t
			],
			[
				s,
				u,
				t
			],
			[
				c,
				u,
				t
			]
		];
	}
	if (t === "e") {
		let t = e.x1 + o;
		return [
			[
				t,
				l,
				c
			],
			[
				t,
				l,
				s
			],
			[
				t,
				u,
				s
			],
			[
				t,
				u,
				c
			]
		];
	}
	let d = e.x0 - o;
	return [
		[
			d,
			l,
			s
		],
		[
			d,
			l,
			c
		],
		[
			d,
			u,
			c
		],
		[
			d,
			u,
			s
		]
	];
}
var Qa = (e, t) => t === "n" || t === "s" ? [e.x0, e.x1] : [e.z0, e.z1];
function $a(e, t, n, r, i, a, o, s, c, l, u) {
	let [d, f] = Qa(t, n), p = e.rnd, m = Math.floor((f - d - 1) / a), h = Math.floor((i - r) / o + .01);
	if (m < 1 || h < 1) return;
	let g = (f - d) / m;
	for (let i = 0; i < h; i++) for (let a = 0; a < m; a++) {
		let f = d + (a + .5) * g, m = r + (i + .5) * o;
		if (e.B.quad(...q(t, n, f, m, s, c, l), G, .8 + p() * .4), p() < u) {
			let r = p(), i = r < .75 ? 16766346 : r < .9 ? 9431295 : 16748496;
			e.L.quad(...q(t, n, f, m, s, c, l + .03), i, .45 + p() * .55);
		}
	}
}
function eo(e, t, n, r, i, a, o, s, c) {
	let [l, u] = Qa(t, n), d = Math.floor((i - r) / a + .01), f = (l + u) / 2, p = u - l - 2.4;
	for (let i = 0; i < d; i++) {
		let d = r + (i + .5) * a;
		e.B.quad(...q(t, n, f, d, p, o, s), G, .85 + e.rnd() * .3), e.rnd() < c && e.L.quad(...q(t, n, l + 2 + e.rnd() * (u - l - 4), d, 1.9, o, s + .03), e.rnd() < .75 ? 16766346 : 9431295, .45 + e.rnd() * .55);
	}
}
function to(e, t, n, r, i, a = .2) {
	let o = t.x1 - t.x0, s = t.z1 - t.z0, c = (t.x0 + t.x1) / 2, l = (t.z0 + t.z1) / 2;
	n === "s" ? e.N.box(c, r, t.z1 + a, o + .4, .16, .12, i) : n === "n" ? e.N.box(c, r, t.z0 - a, o + .4, .16, .12, i) : n === "e" ? e.N.box(t.x1 + a, r, l, .12, .16, s + .4, i) : e.N.box(t.x0 - a, r, l, .12, .16, s + .4, i);
}
function J(e, t, n, r, i) {
	return t === "s" ? {
		x0: n - r,
		x1: n + r,
		z0: e.z1,
		z1: e.z1 + i
	} : t === "n" ? {
		x0: n - r,
		x1: n + r,
		z0: e.z0 - i,
		z1: e.z0
	} : t === "e" ? {
		x0: e.x1,
		x1: e.x1 + i,
		z0: n - r,
		z1: n + r
	} : {
		x0: e.x0 - i,
		x1: e.x0,
		z0: n - r,
		z1: n + r
	};
}
function Y(e, t, n, r, i, a) {
	e.B.box((t.x0 + t.x1) / 2, (n + r) / 2, (t.z0 + t.z1) / 2, t.x1 - t.x0, r - n, t.z1 - t.z0, i, a);
}
function no(e, t, n, r, i = 4.9) {
	let [a, o] = Qa(t, n), s = (a + o) / 2, c = J(t, n, s, 3.3, .45);
	Y(e, c, i - .9, i + .9, Xa), e.S.quad(...q(c, n, s, i, 6.4, 1.6, .02), 16777215, 1, Ti(r));
}
var ro = (e, t, n) => no(e, t, n, e.nextSign ? e.nextSign() : wi[Math.floor(e.rnd() * wi.length)]);
function io(e, t, n, r, i, a = {}) {
	let o = e.rnd, s = 3.6 + n * 3.2 + .8, c = a.col === void 0 ? Za(e, Ja) : a.col, l = Za(e, Ya), u = (t.x0 + t.x1) / 2, d = (t.z0 + t.z1) / 2, f = t.x1 - t.x0, p = t.z1 - t.z0;
	if (e.B.box(u, s / 2, d, f, s, p, c, { top: W }), e.B.box(u, 1.75, d, f + .3, 3.5, p + .3, Za(e, [
		U,
		3091264,
		4030351,
		15231626,
		U
	]), { top: U }), !a.plain) for (let t = 1; t <= n; t++) e.B.box(u, 3.6 + t * 3.2, d, f + .5, .14, p + .5, U);
	e.B.box(u, s + .2, d, f + .4, .5, p + .4, U, { top: W });
	for (let t = 0; t < 2; t++) if (o() < .7) {
		let t = u + (o() - .5) * (f - 5), n = d + (o() - .5) * (p - 5), r = 2 + o() * 1.5, i = 1.6 + o();
		a.plain || e.B.box(t, s + .95, n, r, 1, i, 12038328);
	}
	let m = !0;
	for (let n of [
		"s",
		"n",
		"e",
		"w"
	]) if (r[n]) {
		if ($a(e, t, n, .5, 3.1, 4.2, 2.6, 3.4, 2.2, .19, .75), a.plain ? eo(e, t, n, 3.6, s - .3, 3.2, 1.6, .04, a.lit ?? .45) : $a(e, t, n, 3.6, s - .3, 3.2, 3.2, 1.9, 1.6, .04, a.lit ?? .45), to(e, t, n, 3.62, l), m && o() < .4) {
			let [r, i] = Qa(t, n), a = r + (i - r) * (.3 + o() * .4), c = J(t, n, a, 1.1, .7);
			Y(e, c, 3.5, s + 2.6, U);
			let u = J(c, n, a, .1, .1);
			e.N.box((u.x0 + u.x1) / 2, (s + 6.4) / 2, (u.z0 + u.z1) / 2, u.x1 - u.x0, s - 1.6, u.z1 - u.z0, l);
		} else (m && i || i && o() < .35) && ro(e, t, n);
		m = !1;
	}
	return e.solid(t.x0 - .15, t.x1 + .15, t.z0 - .15, t.z1 + .15, s), s;
}
function ao(e, t, n, r, i) {
	e.G.box((t + n) / 2, K / 2, (r + i) / 2, n - t, K, i - r, 10261647, { top: 14077380 });
}
function oo(e, t, n, r, i, a) {
	let o = Math.floor((i / 2 - 3.6) / 2.4), s = i / 2 - o * 2.4, c = Math.round(s * 2 / 1.2), l = s * 2 / c;
	for (let i = 0; i < c; i++) {
		let a = -s + (i + .5) * l, o = i % 2 ? 16777215 : 16742942;
		for (let i of [.55, 1.05]) r ? e.B.box(t + a, i, n, l, .3, .14, o, { bottom: !0 }) : e.B.box(t, i, n + a, .14, .3, l, o, { bottom: !0 });
		i % 3 == 0 && (r ? e.B.box(t + a, .6, n, .12, 1.2, .5, 3815492) : e.B.box(t, .6, n + a, .5, 1.2, .12, 3815492));
	}
	for (let i of [-1, 1]) for (let a = 0; a < o; a++) {
		let o = i * (s + 1.2 + a * 2.4);
		e.prop("barrier", r ? t + o : t, 0, r ? n : n + o, r ? 0 : Math.PI / 2);
	}
	let u = r ? {
		x0: t - 3.3,
		x1: t + 3.3,
		z0: n - .12,
		z1: n + .12
	} : {
		x0: t - .12,
		x1: t + .12,
		z0: n - 3.3,
		z1: n + 3.3
	};
	Y(e, u, 1.4, 3.1, Xa), e.S.quad(...q(u, a, r ? t : n, 2.25, 6.4, 1.6, .02), 16777215, 1, Ti(8)), r ? e.solid(t - s, t + s, n - .3, n + .3, 1.2) : e.solid(t - .3, t + .3, n - s, n + s, 1.2);
}
function so(e, t, n, r, i) {
	for (let [r, i] of [
		[-1.2, -1.2],
		[1.2, -1.2],
		[-1.2, 1.2],
		[1.2, 1.2]
	]) e.B.box(t + r, 1.1, n + i, .2, 2.2, .2, 15261912);
	e.B.box(t, 2.3, n, 3.4, .2, 3.4, 16775406, { bottom: !0 }), e.B.box(t, 3.4, n - .3, 2.6, 2, 2.4, r), e.B.box(t, 4.55, n - .3, 3.2, .3, 3, i, {
		taper: [.75, .75],
		bottom: !0
	}), e.B.quad(...q({
		x0: t - 1.3,
		x1: t + 1.3,
		z0: n - 1.5,
		z1: n + .9
	}, "s", t, 3.5, 1.6, .9, .03), G), e.solid(t - 1.5, t + 1.5, n - 1.5, n + 1.5, 4.7);
}
// src/world/gen/towers.js
var co = /* @__PURE__ */ t({
	ROOF: () => lo,
	drawTiers: () => go,
	plainBox: () => fo,
	plainFlat: () => po,
	tierWalls: () => ho
}), lo = 7301752, uo = [
	-1,
	0,
	-1,
	0,
	-1,
	0
];
function fo(e, t, n, r, i, a, o, s, c) {
	let l = e.count * 2;
	e.box(t, n, r, i, a, o, s, c), e.t.fill(-1, l, e.count * 2);
	for (let t = l + 1; t < e.count * 2; t += 2) e.t[t] = 0;
}
function po(e, t, n, r, i, a, o) {
	e.flat(t, n, r, i, a, o, 1, Pi);
}
var mo = (e, t, n, r, i) => {
	let a = e.count * 2;
	e.tri(t, n, r, i), e.t.set(uo, a);
};
function ho(e, t = 0) {
	let n = e.x0 + t, r = e.x1 - t, i = e.z0 + t, a = e.z1 - t, o = {
		sw: [n, a],
		se: [r, a],
		ne: [r, i],
		nw: [n, i]
	}, s = [
		"sw",
		"se",
		"ne",
		"nw"
	], c = [];
	if (!e.round) c = s.map((e, t) => [o[e], o[s[(t + 1) % 4]]]);
	else {
		let t = s.indexOf(e.round), i = o[e.round], a = o[s[(t + 3) % 4]], l = o[s[(t + 1) % 4]], u = Math.min(e.r || 12, (r - n) / 2 - 1), d = [Math.sign(a[0] - i[0]), Math.sign(a[1] - i[1])], f = [Math.sign(l[0] - i[0]), Math.sign(l[1] - i[1])], p = i[0] + u * (d[0] + f[0]), m = i[1] + u * (d[1] + f[1]), h = [];
		for (let e = 0; e <= 6; e++) {
			let t = e / 6 * Math.PI / 2;
			h.push([p - u * (f[0] * Math.cos(t) + d[0] * Math.sin(t)), m - u * (f[1] * Math.cos(t) + d[1] * Math.sin(t))]);
		}
		let g = h[6];
		for (let e = 1; e <= 4; e++) {
			let n = e === 4 ? h[0] : o[s[(t + e) % 4]];
			c.push([g, n]), g = n;
		}
		c.push(h);
	}
	if (e.rot) {
		let t = (e.x0 + e.x1) / 2, n = (e.z0 + e.z1) / 2, r = Math.cos(e.rot), i = Math.sin(e.rot);
		c = c.map((e) => e.map(([e, a]) => [t + (e - t) * r + (a - n) * i, n - (e - t) * i + (a - n) * r]));
	}
	return c;
}
function go(e, t, { cell: n = 4.6, inset: r = 0, cut: i = !0, roofs: a = !0 } = {}) {
	let o = e.W, s = o.count + (e.B ? e.B.count : 0);
	for (let s of t) {
		let t = ho(s, r), c = [];
		for (let r of t) {
			let t = 0, a = [0];
			for (let e = 1; e < r.length; e++) t += Math.hypot(r[e][0] - r[e - 1][0], r[e][1] - r[e - 1][1]), a.push(t);
			for (let e = 0; e < r.length - 1; e++) c.push(r[e]);
			if (s.plain) {
				for (let t = 0; t < r.length - 1; t++) {
					let n = r[t], i = r[t + 1], a = [
						[
							n[0],
							s.y0,
							n[1]
						],
						[
							i[0],
							s.y0,
							i[1]
						],
						[
							i[0],
							s.y1,
							i[1]
						],
						[
							n[0],
							s.y1,
							n[1]
						]
					];
					e.B ? e.B.quad(...a, s.col) : o.quad(...a, s.col, 1, Pi);
				}
				continue;
			}
			let l = Math.round(t / n), u = i && r.length === 2 && l > 9 ? Math.ceil(l / 9) : 1, [d, f, p, m] = Ni(t / u, s.y0, s.y1, n);
			for (let e = 0; e < u; e++) for (let n = 0; n < r.length - 1; n++) {
				let i = u > 1 ? e / u : a[n] / t, c = u > 1 ? (e + 1) / u : a[n + 1] / t, l = r[0], h = r[r.length - 1], g = u > 1 ? [l[0] + (h[0] - l[0]) * i, l[1] + (h[1] - l[1]) * i] : r[n], _ = u > 1 ? [l[0] + (h[0] - l[0]) * c, l[1] + (h[1] - l[1]) * c] : r[n + 1], v = u > 1 ? d : d + (f - d) * i, y = u > 1 ? f : d + (f - d) * c;
				o.quad([
					g[0],
					s.y0,
					g[1]
				], [
					_[0],
					s.y0,
					_[1]
				], [
					_[0],
					s.y1,
					_[1]
				], [
					g[0],
					s.y1,
					g[1]
				], s.col, 1, [
					v,
					p,
					y,
					p,
					y,
					m,
					v,
					m
				]);
			}
		}
		if (!a || s.noRoof) continue;
		let l = s.top === void 0 ? lo : s.top;
		for (let t = 1; t < c.length - 1; t++) {
			let n = [
				c[0][0],
				s.y1,
				c[0][1]
			], r = [
				c[t][0],
				s.y1,
				c[t][1]
			], i = [
				c[t + 1][0],
				s.y1,
				c[t + 1][1]
			];
			e.B ? e.B.tri(n, r, i, l) : mo(o, n, r, i, l);
		}
	}
	return (o.count + (e.B ? e.B.count : 0) - s) / 3;
}
// src/world/gen/streets.js
var _o = /* @__PURE__ */ t({
	CONTAINER: () => Oo,
	buildChunk: () => zo,
	container: () => No,
	containerStats: () => Mo,
	generator: () => Vo,
	paintInto: () => Fo,
	penB: () => Eo,
	penW: () => Do,
	prism: () => To,
	register: () => wo,
	shellChunk: () => Bo,
	wallEnds: () => Io
}), vo = 3881286, yo = 15918768, bo = 14077380, xo = .02, So = (e, t) => e.x0 < t.x1 && e.x1 > t.x0 && e.z0 < t.z1 && e.z1 > t.z0, Co = {}, wo = (e, t) => {
	Co[e] = t;
};
function To(e, t, n, r, i, a, o, { n: s = 8, r1: c = r, top: l = o, noTop: u = !1, rot: d = Math.PI / 8 } = {}) {
	let f = (e, r, i) => {
		let a = d + e / s * Math.PI * 2;
		return [
			t + Math.sin(a) * r,
			i,
			n + Math.cos(a) * r
		];
	};
	for (let t = 0; t < s; t++) e.quad(f(t, r, i), f(t + 1, r, i), f(t + 1, c, a), f(t, c, a), o, .86 + .14 * Math.cos(t / s * Math.PI * 2), Pi);
	if (!u) for (let t = 1; t < s - 1; t++) {
		let n = e.count * 2;
		e.tri(f(0, c, a), f(t, c, a), f(t + 1, c, a), l), e.t && e.t.set([
			-1,
			0,
			-1,
			0,
			-1,
			0
		], n);
	}
}
var Eo = (e) => ({
	box: (...t) => e.B.box(...t),
	prism: (...t) => To(e.B, ...t)
}), Do = (e) => ({
	box: (...t) => fo(e.W, ...t),
	prism: (...t) => To(e.W, ...t)
}), Oo = {
	l: 12.2,
	w: 2.6,
	h: 2.6
}, ko = null, Ao = null, jo = {
	containers: 0,
	colours: /* @__PURE__ */ new Set()
}, Mo = jo;
function No(e, t, n, r, i, a) {
	(e.boxes || (e.boxes = [])).push(t, n, r, +!!i, a);
}
function Po(e) {
	if (!ko) {
		let e = new B({ size: 64 }), { l: t, w: n, h: r } = Oo;
		e.box(0, r / 2, 0, t, r, n, 16777215, { top: 14211288 }), e.quad([
			t / 2 + .01,
			.15,
			n / 2 - .15
		], [
			t / 2 + .01,
			.15,
			-n / 2 + .15
		], [
			t / 2 + .01,
			r - .15,
			-n / 2 + .15
		], [
			t / 2 + .01,
			r - .15,
			n / 2 - .15
		], 12434877), ko = e.build(), Ao = new Sr({ vertexColors: !0 });
	}
	let t = e.length / 5, n = ko.clone(), r = new hr(n, Ao, t), i = new L(), a = new gt();
	for (let n = 0; n < t; n++) {
		let t = n * 5;
		e[t + 3] ? i.makeRotationY(Math.PI / 2) : i.identity(), i.setPosition(e[t], e[t + 1], e[t + 2]), r.setMatrixAt(n, i), r.setColorAt(n, a.set(e[t + 4])), jo.colours.add(e[t + 4]);
	}
	jo.containers += t, r.instanceMatrix.needsUpdate = !0, r.instanceColor.needsUpdate = !0, r.computeBoundingSphere();
	let o = n.dispose.bind(n);
	return n.dispose = () => {
		o(), r.dispose();
	}, r;
}
var Fo = (e) => e.U || (e.U = new B({
	uv: !0,
	size: 256
}));
function Io(e, t, n = .06) {
	return t === "s" ? [[e.x0, e.z1 + n], [e.x1, e.z1 + n]] : t === "n" ? [[e.x1, e.z0 - n], [e.x0, e.z0 - n]] : t === "e" ? [[e.x1 + n, e.z1], [e.x1 + n, e.z0]] : [[e.x0 - n, e.z0], [e.x0 - n, e.z1]];
}
function Lo(e, t, n) {
	if (t.free) return;
	let r = (e) => {
		let t = n.nodes.get(e);
		return t.free ? 2 : t.half[a ? "ew" : "ns"] + 2.5;
	}, i = e.M, a = t.axis === "ns", o = (a ? t.az : t.ax) + (t.a ? r(t.a) : 0), s = (a ? t.bz : t.bx) - (t.b ? r(t.b) : 0), c = a ? t.ax : t.az, l = t.lanes === 1 ? [0] : t.lanes === 3 ? [
		-9.2,
		-5.6,
		5.6,
		9.2
	] : [-4.8, 4.8];
	for (let e = o; e + 3 <= s; e += 9) for (let t of l) a ? i.flat(c + t - .12, c + t + .12, e, e + 3, xo, yo) : i.flat(e, e + 3, c + t - .12, c + t + .12, xo, yo);
	t.lanes > 1 && (a ? i.flat(c - .25, c + .25, o, s, xo, yo) : i.flat(o, s, c - .25, c + .25, xo, yo));
	for (let [e, r] of [[t.a, o], [t.b, s]]) {
		let s = e && n.nodes.get(e);
		if (!s || !s.signal) continue;
		let l = r === o ? 1 : -1, u = t.width / 2 - .7;
		for (let e = -u; e < u - .3; e += 1.4) {
			let t = r - l * 1.5, n = r + l * 1, o = Math.min(t, n), s = Math.max(t, n);
			a ? i.flat(c + e, c + e + .7, o, s, xo, 16777215) : i.flat(o, s, c + e, c + e + .7, xo, 16777215);
		}
	}
	t.stub && t.len > 20 && (a ? oo(e, c, t.a ? t.bz - 8 : t.az + 8, !0, t.width + 8, t.a ? "s" : "n") : oo(e, t.a ? t.bx - 10 : t.ax + 10, c, !1, t.width + 8, t.a ? "w" : "e"));
}
var Ro = (e, t) => ({
	x0: Math.max(e.x0, t.x0),
	x1: Math.min(e.x1, t.x1),
	z0: Math.max(e.z0, t.z0),
	z1: Math.min(e.z1, t.z1)
});
function* zo(e, t, n, r) {
	let i = t.rect, { cx: a, cz: o } = t;
	pa(e.low ? 1024 : 2048);
	for (let r in Co) {
		let a = n.zone(r), o = Co[r];
		if (!a || !So(a.bounds, i)) continue;
		let s = Ro(a.bounds, i);
		o.ground ? o.ground(e, s, t, n) : e.G.flat(s.x0, s.x1, s.z0, s.z1, 0, o.asphalt || vo);
		for (let t of a.plazas || []) if (So(t, i)) {
			let n = Ro(t, i);
			ao(e, n.x0, n.x1, n.z0, n.z1);
		}
	}
	for (let t of n.blocksInChunk(a, o)) {
		let n = Co[t.zone.id];
		if (!n) continue;
		let r = n.blockRect ? n.blockRect(t) : t;
		r && ao(e, r.x0, r.x1, r.z0, r.z1);
	}
	yield;
	for (let t of n.roadsInChunk(a, o)) Co[t.zone] && Lo(e, t, n);
	yield;
	for (let i of n.lotsInChunk(a, o)) {
		let a = Co[i.zone];
		a && (e.rnd = pi(i.seed || 7), i.hero ? r[i.hero] && r[i.hero].build(e, i, n) : a.lot(e, i, n, t), yield);
	}
	e.rnd = pi(t.seed);
	for (let r of n.blocksInChunk(a, o)) {
		let i = Co[r.zone.id];
		i && i.furniture && i.furniture(e, r, n, t);
	}
	yield;
	for (let r of n.roadsInChunk(a, o)) {
		let i = Co[r.zone];
		i && i.street && i.street(e, r, n, t);
	}
	e.U && e.U.count && e.object(xa(e.U)), e.boxes && e.boxes.length && e.object(Po(e.boxes));
}
function Bo(e, t, n, r) {
	for (let r of n.blocksInChunk(t.cx, t.cz)) {
		let t = Co[r.zone.id];
		if (!t) continue;
		let n = t.blockRect ? t.blockRect(r) : r;
		n && e.B.flat(n.x0, n.x1, n.z0, n.z1, K, t.pave || bo);
	}
	for (let i of n.lotsInChunk(t.cx, t.cz)) {
		let t = Co[i.zone], n = i.body;
		t && (i.hero ? r[i.hero] && r[i.hero].shell && r[i.hero].shell(e, i, {}) : t.shellLot ? t.shellLot(e, i) : n && i.h && e.B.box((n.x0 + n.x1) / 2, i.h / 2, (n.z0 + n.z1) / 2, n.x1 - n.x0, i.h, n.z1 - n.z0, i.wall, { top: i.roof || 7301752 }));
	}
}
var Vo = (e, t) => ({
	id: e,
	stats: t,
	build: zo,
	shell: Bo
}), Ho = /* @__PURE__ */ t({
	APPROVED: () => qo,
	CLUB: () => Jo,
	GATE: () => Xo,
	HOLES: () => ss,
	LAKE: () => Yo,
	MODEL: () => Zo,
	PONDS: () => Qo,
	WALL: () => X,
	default: () => bs
}), Uo = -3200, Wo = -800, Go = -2700, Ko = -1500, qo = [
	16116951,
	12044712,
	13225428,
	15782088
], X = {
	east: -810,
	south: -1540,
	north: -2430,
	west: -3190,
	jogX: -2650,
	jogZ: -2680
}, Jo = {
	x: -2e3,
	z: -2100,
	r: 90
}, Yo = {
	x: -2700,
	z: -1900,
	a: 220,
	b: 150
}, Xo = {
	x: -905,
	z: -1898
}, Zo = {
	x: -1081,
	z: -2300,
	rot: -Math.PI / 2
}, Qo = [
	[
		-1850,
		-2318,
		9
	],
	[
		-1822,
		-2334,
		7
	],
	[
		-1838,
		-2296,
		6
	]
], $o = (e) => Math.round(e * 10) / 10;
function es(e, t = 35) {
	let n = [];
	for (let r = 0; r < e.length - 1; r++) {
		let i = e[r - 1] || e[r], a = e[r], o = e[r + 1], s = e[r + 2] || o, c = Math.max(1, Math.round(Math.hypot(o[0] - a[0], o[1] - a[1]) / t));
		for (let e = 0; e < c; e++) {
			let t = e / c, r = t * t, l = r * t, u = (e, n, i, a) => .5 * (2 * n + (i - e) * t + (2 * e - 5 * n + 4 * i - a) * r + (3 * n - e - 3 * i + a) * l);
			n.push(e ? [$o(u(i[0], a[0], o[0], s[0])), $o(u(i[1], a[1], o[1], s[1]))] : a);
		}
	}
	return n.push(e[e.length - 1]), n;
}
function ts(e, t, n, r, i) {
	let a = i ? Math.atan2(i[0] - e, i[1] - t) : 0, o = [];
	for (let s = 0; s < r; s++) {
		let c = a + s / r * Math.PI * 2;
		o.push(i && s === 0 ? i : [$o(e + Math.sin(c) * n), $o(t + Math.cos(c) * n)]);
	}
	return o.push(o[0]), o;
}
var ns = [
	[
		"Fairway Drive",
		[
			[-900, -1900],
			[-1020, -1885],
			[-1160, -1830],
			[-1200, -1815],
			[-1320, -1770],
			[-1480, -1790],
			[-1620, -1880],
			[-1760, -1990],
			[-1900, -2070],
			[-1910, -2100]
		],
		{
			cart: !0,
			id: "fairway-drive"
		}
	],
	[
		"Fairway Drive",
		[
			[-2090, -2100],
			[-2180, -2130],
			[-2300, -2200],
			[-2420, -2240],
			[-2560, -2260],
			[-2700, -2300],
			[-2840, -2390],
			[-2940, -2460],
			[-3e3, -2500]
		],
		{
			cart: !0,
			id: "fairway-drive-west"
		}
	],
	[
		"Starling Approach",
		[
			[-800, -1800],
			[-850, -1840],
			[-900, -1900]
		],
		{ lots: !1 }
	],
	["Grackle Lane", [
		[-1100, -2340],
		[-1108, -2200],
		[-1135, -2060],
		[-1175, -1930],
		[-1200, -1815],
		[-1225, -1700],
		[-1245, -1600]
	]],
	["Muscovy Court", [
		[-1108, -2200],
		[-1040, -2190],
		[-960, -2210],
		[-900, -2250]
	]],
	["Goose Crossing", [
		[-1020, -1885],
		[-1010, -1980],
		[-985, -2090],
		[-960, -2210]
	]],
	["Pigeon Place", [
		[-1225, -1700],
		[-1150, -1680],
		[-1060, -1660],
		[-980, -1620]
	]],
	[
		"Coot Circle",
		[[-1480, -1790], [-1514, -1752]],
		{
			lots: !1,
			id: "coot-circle-stem"
		}
	],
	["Gull Close", [
		[-1620, -1880],
		[-1640, -1830],
		[-1660, -1780]
	]],
	["Vulture Loop", [
		[-1985, -1720],
		[-1900, -1700],
		[-1800, -1690],
		[-1740, -1740],
		[-1745, -1830],
		[-1810, -1880],
		[-1900, -1860],
		[-1975, -1850]
	]],
	["Crow Court", [
		[-1900, -1860],
		[-1870, -1810],
		[-1840, -1770]
	]],
	["Cormorant Way", [
		[-2e3, -1520],
		[-2e3, -1600],
		[-1985, -1720],
		[-1978, -1800],
		[-1975, -1850],
		[-1990, -1950],
		[-2e3, -2010]
	]],
	["Magpie Mews", [
		[-1978, -1800],
		[-2030, -1810],
		[-2045, -1870],
		[-2040, -1930]
	]],
	["Ibis Bend", [
		[-2e3, -1600],
		[-2100, -1585],
		[-2250, -1580],
		[-2400, -1600],
		[-2550, -1650],
		[-2700, -1680],
		[-2850, -1690],
		[-2960, -1740],
		[-3030, -1850],
		[-3030, -1960],
		[-2990, -2050]
	]],
	["Moorhen Court", [
		[-2550, -1650],
		[-2560, -1600],
		[-2600, -1575]
	]],
	[
		"Anhinga Lane",
		[
			[-3030, -1850],
			[-2990, -1870],
			[-2930, -1900]
		],
		{ lots: !1 }
	],
	["Limpkin Loop", [
		[-2700, -2300],
		[-2725, -2220],
		[-2780, -2150],
		[-2870, -2120],
		[-2950, -2150],
		[-2975, -2230],
		[-2930, -2300],
		[-2840, -2390]
	]]
], rs = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-"), is = (e, t, n = {}) => ({
	id: n.id || rs(e),
	name: e,
	kind: "lane",
	width: 10,
	lanes: 1,
	offsets: [2.5],
	speed: 8.3,
	level: 0,
	pts: t,
	lots: n.lots !== !1,
	cart: !!n.cart,
	oneWay: !!n.oneWay
}), as = ns.map(([e, t, n]) => is(e, es(t), n));
as.push(is("Clubhouse Circle", ts(Jo.x, Jo.z, Jo.r, 16, [-1910, -2100]).map(([e, t]) => Math.abs(e - -2090) < .2 ? [-2090, -2100] : Math.abs(t - -2010) < .2 ? [-2e3, -2010] : [e, t]), {
	lots: !1,
	oneWay: !0
})), as.push(is("Coot Circle", ts(-1560, -1700, 70, 12, [-1514, -1752]), { id: "coot-circle" }));
var os = [];
for (let e = -2400; e < -800; e += 100) os.push([e, -1520]);
os.push([-800, -1520]), as.push({
	id: "gander-road",
	name: "Gander Road",
	kind: "street",
	width: 14,
	lanes: 1,
	offsets: [3.5],
	speed: 11.1,
	level: 0,
	pts: os,
	lots: !1
});
var ss = [
	[
		-1890,
		-2120,
		-1620,
		-2105,
		4
	],
	[
		-1600,
		-2060,
		-1680,
		-1975,
		3
	],
	[
		-1650,
		-1950,
		-1450,
		-1860,
		4
	],
	[
		-1450,
		-1905,
		-1460,
		-2050,
		3
	],
	[
		-1455,
		-2090,
		-1470,
		-2370,
		4
	],
	[
		-1500,
		-2395,
		-1880,
		-2390,
		5
	],
	[
		-1900,
		-2350,
		-1790,
		-2290,
		3
	],
	[
		-1760,
		-2310,
		-1540,
		-2290,
		4
	],
	[
		-1520,
		-2230,
		-1880,
		-2210,
		5
	],
	[
		-2110,
		-2180,
		-2140,
		-2390,
		4
	],
	[
		-2190,
		-2390,
		-2300,
		-2280,
		3
	],
	[
		-2290,
		-2160,
		-2200,
		-1900,
		4
	],
	[
		-2240,
		-1870,
		-2400,
		-2130,
		4
	],
	[
		-2380,
		-2270,
		-2450,
		-2400,
		3
	],
	[
		-2510,
		-2380,
		-2600,
		-2130,
		4
	],
	[
		-2560,
		-2100,
		-2440,
		-1740,
		5
	],
	[
		-2410,
		-1740,
		-2190,
		-1660,
		4
	],
	[
		-2150,
		-1650,
		-2100,
		-2010,
		5
	]
].map(([e, t, n, r, i], a) => ({
	n: a + 1,
	tx: e,
	tz: t,
	gx: n,
	gz: r,
	par: i,
	half: a === 8 ? 30 : 20
})), cs = [
	{
		id: "the-easement",
		name: "The Easement",
		x0: -2650,
		x1: Wo,
		z0: Go,
		z1: X.north
	},
	{
		id: "the-gatehouse",
		name: "The Gatehouse",
		x0: -1e3,
		x1: Wo,
		z0: -2050,
		z1: -1700
	},
	{
		id: "model-mile",
		name: "Model Mile",
		x0: -1400,
		x1: Wo,
		z0: Go,
		z1: Ko,
		shares: [
			["mg-two", 50],
			["mg-ranch", 30],
			["mg-villa", 20]
		],
		show: !0
	},
	{
		id: "clubhouse-circle",
		name: "Clubhouse Circle",
		x0: -2200,
		x1: -1800,
		z0: -2250,
		z1: -1950
	},
	{
		id: "phase-four",
		name: "Phase Four",
		x0: Uo,
		x1: -2650,
		z0: Go,
		z1: -2330
	},
	{
		id: "lake-serenity",
		name: "Lake Serenity",
		x0: Uo,
		x1: -2650,
		z0: -2330,
		z1: Ko,
		shares: [["mg-two", 85], ["mg-ranch", 15]],
		frontage: 28
	},
	{
		id: "lake-serenity",
		name: "Lake Serenity",
		x0: -2650,
		x1: -2450,
		z0: -2100,
		z1: Ko,
		shares: [["mg-two", 85], ["mg-ranch", 15]],
		frontage: 28
	},
	{
		id: "the-fairways",
		name: "The Fairways",
		x0: Uo,
		x1: Wo,
		z0: Go,
		z1: Ko,
		shares: [
			["mg-ranch", 45],
			["mg-two", 35],
			["mg-villa", 20]
		]
	}
], ls = (e, t) => cs.find((n) => e >= n.x0 && e < n.x1 && t >= n.z0 && t < n.z1), us = {
	"mg-ranch": {
		recipe: "mg-ranch",
		w: 18,
		d: 12,
		floors: 1,
		h: 5.6
	},
	"mg-two": {
		recipe: "mg-two",
		w: 20,
		d: 12,
		floors: 2,
		h: 8.4
	},
	"mg-villa": {
		recipe: "mg-villa",
		w: 22,
		d: 12,
		floors: 1,
		h: 5.6
	}
}, ds = (e, t, n, r, i, a) => {
	let o = i - n, s = a - r, c = Math.max(0, Math.min(1, ((e - n) * o + (t - r) * s) / (o * o + s * s || 1)));
	return Math.hypot(n + o * c - e, r + s * c - t);
}, fs = (e, t) => {
	let n = 1e9;
	for (let r of as) for (let i = 0; i < r.pts.length - 1; i++) n = Math.min(n, ds(e, t, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) - (r.width - 10) / 2);
	return n;
}, ps = (e, t, n = 0) => ((e - Yo.x) / (Yo.a + n)) ** 2 + ((t - Yo.z) / (Yo.b + n)) ** 2 < 1, ms = [];
function hs(e, t) {
	if (e < X.west + 22 || e > X.east - 22 || t > X.south - 22 || t < X.north + 22 || Math.hypot(e - Jo.x, t - Jo.z) < Jo.r + 34 || Math.hypot(e - Zo.x, t - Zo.z) < 25 || ps(e, t, 16)) return !1;
	for (let n of ss) if (ds(e, t, n.tx, n.tz, n.gx, n.gz) < n.half + 10) return !1;
	for (let n of ms) if (Math.hypot(e - n.cx, t - n.cz) < 22.5) return !1;
	return fs(e, t) >= 17.5;
}
var gs = 7, _s = () => (gs = Math.imul(gs, 1103515245) + 12345 >>> 0, gs / 4294967296);
as.forEach((e, t) => {
	if (!e.lots) return;
	let n = [Math.floor(_s() * 4), 0];
	n[1] = (n[0] + 2) % 4;
	let r = 14, i = 0, a = 0, o = (t) => Math.hypot(e.pts[t + 1][0] - e.pts[t][0], e.pts[t + 1][1] - e.pts[t][1]), s = e.pts.slice(0, -1).reduce((e, t, n) => e + o(n), 0);
	for (; r < s - 10;) {
		for (; i < e.pts.length - 2 && r > a + o(i);) a += o(i), i++;
		let s = (r - a) / o(i), c = (e.pts[i + 1][0] - e.pts[i][0]) / o(i), l = (e.pts[i + 1][1] - e.pts[i][1]) / o(i), u = e.pts[i][0] + c * o(i) * s, d = e.pts[i][1] + l * o(i) * s, f = ls(u, d);
		if (f && f.shares) for (let r of [0, 1]) {
			let i = r ? 1 : -1, a = $o(u - l * i * 19), o = $o(d + c * i * 19);
			if (!hs(a, o)) continue;
			let s = _s() * 100, p = f.shares[0][0];
			for (let [e, t] of f.shares) if (s -= t, s < 0) {
				p = e;
				break;
			}
			let m = us[p], h = Math.atan2(l * i, -c * i), g = qo[n[r]++ % 4];
			ms.push({
				id: `mallardgreens:${t}:${ms.length}`,
				zone: "mallardgreens",
				hood: f.id,
				lane: e.id,
				side: r,
				recipe: p,
				kit: m,
				cx: a,
				cz: o,
				rot: h,
				w: m.w,
				d: m.d,
				floors: m.floors,
				h: m.h,
				wall: g,
				show: !!f.show,
				x0: a - 14,
				x1: a + 14,
				z0: o - 14,
				z1: o + 14,
				body: {
					x0: a - 11,
					x1: a + 11,
					z0: o - 11,
					z1: o + 11
				},
				seed: ms.length * 7919 + 13,
				sides: {}
			});
		}
		r += f && f.frontage || 24;
	}
});
var vs = [{
	id: "clubhouse",
	x0: -2045,
	x1: -1955,
	z0: -2135,
	z1: -2065,
	h: 25,
	body: qo[0],
	hood: "clubhouse-circle"
}, {
	id: "model-home",
	x0: -1095,
	x1: -1067,
	z0: -2314,
	z1: -2286,
	h: 9,
	body: qo[3],
	hood: "model-mile"
}], ys = {
	traffic: {
		birdie: 7,
		grouper: 4,
		tarpon: 3,
		pompano: 1
	},
	peds: {
		retiree: 10,
		jogger: 3
	}
}, bs = {
	id: "mallardgreens",
	name: "Mallard Greens",
	bounds: {
		x0: Uo,
		x1: Wo,
		z0: Go,
		z1: Ko
	},
	seed: 7701,
	roads: { lines: [] },
	lots: "spline",
	generator: "mallardgreens",
	rows: [],
	kit: us,
	hoods: cs,
	paths: as,
	lotList: ms,
	holes: ss,
	hero: vs,
	reserved: [],
	surfaceAt(e, t, n) {
		return n.roadAt(e, t) ? "road" : ps(e, t) ? "water" : "grass";
	},
	landmarks: {
		gatehouse: {
			x: -900,
			z: -1900,
			w: 18,
			d: 10,
			h: 5,
			level: 0
		},
		clubhouse: {
			x: -2e3,
			z: -2100,
			w: 64,
			d: 40,
			h: 25,
			level: 0
		},
		"model-home": {
			x: -1100,
			z: -2300,
			w: 22,
			d: 36,
			h: 9,
			level: 0
		},
		"hedge-hole": {
			x: -2450,
			z: -2420,
			w: 2,
			d: 2,
			h: 2,
			level: 0
		},
		"lake-serenity": {
			x: -2700,
			z: -1900,
			w: 440,
			d: 300,
			h: 12,
			level: 0
		}
	},
	places: [
		{
			id: "gatehouse-barrier",
			kind: "mission",
			x: -900,
			z: -1900
		},
		{
			id: "clubhouse-office",
			kind: "mission",
			x: -2025,
			z: -2100
		},
		{
			id: "birdie-rank",
			kind: "vehicles",
			x: -1955,
			z: -2100
		},
		{
			id: "hedge-hole",
			kind: "mission",
			x: -2450,
			z: -2420
		}
	],
	traffic: ys.traffic,
	peds: ys.peds,
	night: {
		traffic: {
			birdie: 2,
			grouper: 1
		},
		peds: { retiree: 1 },
		cap: .15
	},
	streetSpeed: 5.8,
	parked: 0,
	hangOut: .1,
	ambience: "suburb",
	palette: "mallardgreens"
}, xs = /* @__PURE__ */ t({
	default: () => Hs,
	house: () => Ls,
	ribbon: () => Is,
	sprinklerMaterial: () => Ns,
	stats: () => Ms
}), Ss = 4175978, Cs = 5819516, ws = 10217626, Ts = 10133614, Es = 4867924, Ds = 12044712, Os = 8378088, ks = 4025162, As = 16116951, js = 14077380, Ms = {
	houses: 0,
	trees: 0,
	greens: 0,
	flags: 0,
	jets: 0,
	walls: 0,
	lamps: 0,
	bulbs: 0,
	sprinklers: 0,
	tallest: 0
}, Ns = new Gn({
	color: 15268863,
	transparent: !0,
	opacity: .4,
	side: 2,
	depthWrite: !1,
	visible: !1
});
function Ps(e) {
	let t = new B({ size: 256 });
	for (let n = 0; n < e.length; n += 2) for (let r = 0; r < 4; r++) {
		let i = r * 1.571 + n, a = Math.sin(i), o = Math.cos(i), s = e[n], c = e[n + 1];
		t.tri([
			s,
			.15,
			c
		], [
			s + a * 2.4,
			1.5,
			c + o * 2.4
		], [
			s + a * 3.8,
			.05,
			c + o * 3.8
		], 16777215);
	}
	return new rr(t.build({ free: !0 }), Ns);
}
var Fs = (e, t, n) => t >= e.x0 && t < e.x1 && n >= e.z0 && n < e.z1;
function Is(e, t, n, r, i, a, o, s, c = 1.2) {
	let l = Math.hypot(r - t, i - n), u = (r - t) / l, d = (i - n) / l, f = -d * a, p = u * a;
	t -= u * c, n -= d * c, r += u * c, i += d * c, e.quad([
		t - f,
		o,
		n - p
	], [
		t + f,
		o,
		n + p
	], [
		r + f,
		o,
		i + p
	], [
		r - f,
		o,
		i - p
	], s);
}
function Ls(e, t, n) {
	let { cx: r, cz: i, rot: a, w: o, d: s } = t, c = Math.cos(a), l = Math.sin(a), u = e.B, d = t.recipe === "mg-two", f = t.recipe === "mg-villa", p = (e, t, n = 0) => [
		r + e * c + t * l,
		n,
		i - e * l + t * c
	], m = d ? 6 : 3.2, h = d ? 14 : o, g = p(d ? 3 : 0, 0), _ = p(-7, 2.5);
	if (u.box(g[0], m / 2, g[2], h, m, s, t.wall, {
		rot: a,
		noTop: !0
	}), u.box(g[0], m + 1.2, g[2], h + 1, 2.4, s + 1, W, {
		rot: a,
		taper: [.45, .06]
	}), d && u.box(_[0], 1.4, _[2], 6, 2.8, 7, t.wall, {
		rot: a,
		top: W
	}), n) return;
	let v = (e, t, n, r, i, a = s / 2 + .05, o = u) => o.quad(p(e - n / 2, a, t - r / 2), p(e + n / 2, a, t - r / 2), p(e + n / 2, a, t + r / 2), p(e - n / 2, a, t + r / 2), i), y = (t) => {
		let n = p(t, s / 2 + .2, 2.2);
		e.N.box(n[0], n[1], n[2], .25, .25, .25, 16766346);
	}, b = f ? [-8, 8] : [d ? -7 : -5.5], x = f ? [-3.4, 3.4] : [d ? 1 : 2];
	for (let t of b) v(t, 1.2, 5, 2.4, U, d ? 6.05 : void 0), e.G.quad(p(t - 2.7, s / 2 + 8.6, .04), p(t + 2.7, s / 2 + 8.6, .04), p(t + 2.7, s / 2, .04), p(t - 2.7, s / 2, .04), js);
	for (let e of x) v(e, 1.05, 1, 2.1, 7301752), y(e);
	for (let t of f ? [-1.3, 1.3] : d ? [6] : [5.5, -.8]) v(t, 1.7, f ? 1.6 : 2.2, 1.2, G), e.rnd() < .3 && v(t, 1.7, f ? 1.6 : 2.2, 1.2, 16766346, s / 2 + .08, e.L);
	if (d) {
		v(1, 4.5, 1.6, 1.2, G), v(6, 4.5, 2.2, 1.2, G);
		let e = p(3, s / 2 + .6);
		u.box(e[0], 3.05, e[2], 5, .12, 1.2, U, {
			rot: a,
			bottom: !0
		}), v(3, 3.6, 5, .9, U, s / 2 + 1.2);
	} else if (!f && !e.low) {
		let e = p(2, s / 2 + .9);
		u.box(e[0], 2.7, e[2], 2.8, .15, 1.8, U, {
			rot: a,
			bottom: !0
		});
		for (let e of [.8, 3.2]) {
			let t = p(e, s / 2 + 1.7);
			u.box(t[0], 1.35, t[2], .15, 2.7, .15, U, { noTop: !0 });
		}
	}
	let S = p(f ? 0 : o / 2 - 2.5, s / 2 + 4.6), C = p(b[0] + 3.6, s / 2 + 7.7);
	u.box(S[0], 1.1, S[2], .4, 2.2, .4, 9072469, { noTop: !0 }), u.box(S[0], 3.3, S[2], 2.7, 2.7, 2.7, 3120728, { rot: a }), e.low || u.box(S[0], 3.3, S[2], 2.7, 2.7, 2.7, 3516510, { rot: a + Math.PI / 4 }), e.solid(S[0] - .3, S[0] + .3, S[2] - .3, S[2] + .3, 2), u.box(C[0], .6, C[2], .3, 1.2, .3, U, { top: W });
	let w = p(f ? 5 : -1.5, s / 2 + 4.8);
	if ((e.spr || (e.spr = [])).push(w[0], w[2]), Ms.sprinklers++, t.show && !e.low) for (let e of [-9.5, 9.5]) {
		let t = p(e, s / 2 + 7.2);
		u.box(t[0], 2.5, t[2], .6, 4, .08, 8378088, {
			rot: a,
			taper: [.4, 1]
		});
	}
	e.obb(g[0], g[2], h / 2, s / 2, a, m + 2.4), d && e.obb(_[0], _[2], 3, 3.5, a, 2.8), Ms.houses++, Ms.trees++, Ms.tallest = Math.max(Ms.tallest, m + 2.4);
}
var Rs = [
	[
		X.east - .2,
		X.east + .2,
		X.north,
		-1822,
		2.4,
		As
	],
	[
		X.east - .2,
		X.east + .2,
		-1794,
		X.south,
		2.4,
		As
	],
	[
		X.west,
		-2008,
		X.south - .2,
		X.south + .2,
		2.4,
		As
	],
	[
		-1992,
		X.east,
		X.south - .2,
		X.south + .2,
		2.4,
		As
	],
	[
		X.jogX,
		-2450.9,
		X.north - 1,
		X.north + 1,
		3,
		ks
	],
	[
		-2449.1,
		X.east,
		X.north - 1,
		X.north + 1,
		3,
		ks
	],
	[
		X.jogX - 1,
		X.jogX + 1,
		X.jogZ,
		X.north,
		3,
		ks
	],
	[
		X.west,
		X.jogX,
		X.jogZ - 1,
		X.jogZ + 1,
		3,
		ks
	],
	[
		X.west - .15,
		X.west + .15,
		X.jogZ,
		X.south,
		2.4,
		As
	]
];
function zs(e, t, n) {
	for (let [r, i, a, o, s, c] of Rs) {
		let l = Math.max(r, t.x0), u = Math.min(i, t.x1), d = Math.max(a, t.z0), f = Math.min(o, t.z1);
		u - l < .05 || f - d < .05 || (e.B.box((l + u) / 2, s / 2, (d + f) / 2, u - l, s, f - d, c), n || (e.solid(l, u, d, f, s), Ms.walls++));
	}
}
function Bs(e, t, n) {
	let r = n ? e.B : e.G;
	for (let i of ss) {
		let a = Math.hypot(i.gx - i.tx, i.gz - i.tz), o = Math.ceil(a / 40);
		for (let e = 0; e < o; e++) {
			let n = i.tx + (i.gx - i.tx) * e / o, a = i.tz + (i.gz - i.tz) * e / o, s = i.tx + (i.gx - i.tx) * (e + 1) / o, c = i.tz + (i.gz - i.tz) * (e + 1) / o;
			Fs(t, (n + s) / 2, (a + c) / 2) && Is(r, n, a, s, c, i.half, .015, Cs, e === 0 || e === o - 1 ? 12 : .5);
		}
		!n && Fs(t, i.gx, i.gz) && (To(r, i.gx, i.gz, 12, 0, .03, ws, { n: 12 }), e.B.box(i.gx, 1.2, i.gz, .08, 2.4, .08, U), e.B.box(i.gx + .45, 2.1, i.gz, .9, .5, .04, 16734810), Ms.greens++, Ms.flags++);
	}
	for (let [i, a, o] of Qo) Fs(t, i, a) && (To(r, i, a, o, 0, .04, Os, { n: 10 }), n || (e.B.box(i, 2, a, .3, 4, .3, 15268863, { taper: [.3, .3] }), Ms.jets++));
	let i = n ? 40 : 10;
	for (let e = Math.ceil(Math.max(t.z0, Yo.z - Yo.b) / i) * i; e < Math.min(t.z1, Yo.z + Yo.b); e += i) {
		let n = 1 - ((e + i / 2 - Yo.z) / Yo.b) ** 2;
		if (n <= 0) continue;
		let a = Yo.a * Math.sqrt(n), o = Math.max(t.x0, Yo.x - a), s = Math.min(t.x1, Yo.x + a);
		s > o && r.flat(o, s, e, e + i, .04, Os);
	}
	if (n) return;
	let a = [[
		Yo.x,
		Yo.z,
		12
	]];
	for (let e = 0; e < 6; e++) a.push([
		Yo.x + Math.sin(e * 1.047) * 90,
		Yo.z + Math.cos(e * 1.047) * 90,
		3
	]);
	for (let [n, r, i] of a) Fs(t, n, r) && (i > 4 && e.B.box(n, .3, r, 3, .5, 3, U), e.B.box(n, i / 2 + .3, r, i > 4 ? .6 : .3, i, i > 4 ? .6 : .3, 15268863, { taper: [.25, .25] }), Ms.jets++);
}
function Vs(e) {
	let t = e.B, { x: n, z: r } = Xo;
	t.box(n, 4.75, r, 10, .5, 18, U, { bottom: !0 }), t.box(n, 2.25, r - 8.5, .8, 4.5, .8, As), e.solid(n - .4, n + .4, r - 8.9, r - 8.1, 4.5), t.box(n, 1.6, r + 8.2, 5, 3.2, 4, As), t.box(n, 3.7, r + 8.2, 5.6, 1, 4.6, W, { taper: [.3, .3] }), e.solid(n - 2.5, n + 2.5, r + 6.2, r + 10.2, 4), t.quad([
		n + 1.5,
		1.2,
		r + 6.15
	], [
		n - 1.5,
		1.2,
		r + 6.15
	], [
		n - 1.5,
		2.4,
		r + 6.15
	], [
		n + 1.5,
		2.4,
		r + 6.15
	], G);
	for (let e of [-1, 1]) for (let i = 0; i < 4; i++) t.box(n + e * 3, 1.4 + i * .85, r + e * (5.6 - i * .5), .14, 1, .14, i % 2 ? Ds : 16777215, { shift: [0, -e * .5] });
	t.box(n + 14, 1.2, r - 12, 1, 2.4, 12, As), e.solid(n + 13.5, n + 14.5, r - 18, r - 6, 2.4), t.box(n + 14, 2.9, r - 12, .6, .7, 1.1, 16761600), t.box(n + 14.2, 3.4, r - 11.6, .4, .45, .5, 3120728), t.box(n + 14.5, 3.35, r - 11.6, .3, .14, .3, 16752686), Fo(e).quad([
		n + 14.52,
		.9,
		r - 16
	], [
		n + 14.52,
		.9,
		r - 8
	], [
		n + 14.52,
		2.9,
		r - 8
	], [
		n + 14.52,
		2.9,
		r - 16
	], 16777215, 1, _a("Mallard Greens", "#2f7d5b"));
}
var Hs = {
	id: "mallardgreens",
	stats: Ms,
	*build(e, t, n, r) {
		let i = t.rect, a = n.zone("mallardgreens"), o = Math.max(i.x0, a.bounds.x0), s = Math.min(i.x1, a.bounds.x1), c = Math.max(i.z0, a.bounds.z0), l = Math.min(i.z1, a.bounds.z1);
		pa(e.low ? 1024 : 2048), e.G.flat(o, s, c, l, 0, Ss), l > X.south && e.G.flat(o, s, X.south, l, .01, Ts), c < X.north && s > X.jogX && e.G.flat(Math.max(o, X.jogX), s, c, Math.min(l, X.north), .01, Ts), Bs(e, i, !1), yield;
		for (let r of n.roadsInChunk(t.cx, t.cz)) if (r.zone === "mallardgreens") {
			if (r.roadId.startsWith("fairway-drive") && Is(e.G, r.ax, r.az, r.bx, r.bz, 7, .045, Ds), Is(e.G, r.ax, r.az, r.bx, r.bz, r.width / 2, .05, Es), r.kind !== "lane") Is(e.M, r.ax, r.az, r.bx, r.bz, .12, .07, 15918768, -3);
			else {
				for (let [t, i, a] of [[
					r.a,
					r.ax,
					r.az
				], [
					r.b,
					r.bx,
					r.bz
				]]) n.nodes.get(t).pieces.length === 1 && (To(e.G, i, a, 14, 0, .05, Es, { n: 12 }), Ms.bulbs++);
				if (+r.id.slice(r.id.lastIndexOf(":") + 1) % (e.low ? 4 : 2) == 0) {
					let t = (r.bx - r.ax) / r.len, n = (r.bz - r.az) / r.len;
					e.prop("lamp", r.ax - n * 6.3, 0, r.az + t * 6.3, Math.atan2(n, -t)), Ms.lamps++;
				}
			}
		}
		yield;
		for (let i of n.lotsInChunk(t.cx, t.cz)) i.zone === "mallardgreens" && (e.rnd = pi(i.seed || 7), i.hero ? r[i.hero] && r[i.hero].build(e, i, n) : Ls(e, i, !1), yield);
		zs(e, i, !1), Fs(i, Xo.x, Xo.z) && Vs(e), Fs(i, -2009, -1546) && (e.B.box(-2009, 1.5, -1546, 3, 3, 3, 13225428, { top: W }), e.solid(-2010.5, -2007.5, -1547.5, -1544.5, 3)), e.U && e.U.count && e.object(xa(e.U)), e.spr && e.spr.length && e.object(Ps(e.spr));
	},
	shell(e, t, n, r) {
		let i = t.rect, a = n.zone("mallardgreens"), o = Math.max(i.x0, a.bounds.x0), s = Math.min(i.x1, a.bounds.x1);
		if (!(s <= o)) {
			e.B.flat(o, s, Math.max(i.z0, a.bounds.z0), Math.min(i.z1, a.bounds.z1), 0, Ss), Bs(e, i, !0);
			for (let r of n.roadsInChunk(t.cx, t.cz)) r.zone === "mallardgreens" && Is(e.B, r.ax, r.az, r.bx, r.bz, r.width / 2, .05, Es);
			for (let i of n.lotsInChunk(t.cx, t.cz)) i.zone === "mallardgreens" && (i.hero ? r[i.hero] && r[i.hero].shell && r[i.hero].shell(e, i, {}) : Ls(e, i, !0));
			zs(e, i, !0);
		}
	}
}, Us = /* @__PURE__ */ t({
	billboard: () => Qs,
	default: () => nc
}), Ws = 3881286, Gs = 15918768, Ks = 14077380, qs = 14737638, Js = 4175978, Ys = .02, Xs = (e, t) => e.x0 < t.x1 && e.x1 > t.x0 && e.z0 < t.z1 && e.z1 > t.z0, Zs = {
	billboards: 0,
	towers: 0
};
function Qs(e, t, n, r = "s") {
	Zs.billboards++;
	let i = r === "s" || r === "n", a = i ? {
		x0: t - 6.6,
		x1: t + 6.6,
		z0: n - .25,
		z1: n + .25
	} : {
		x0: t - .25,
		x1: t + .25,
		z0: n - 6.6,
		z1: n + 6.6
	};
	for (let r of [-4.5, 4.5]) e.B.box(i ? t + r : t, 3.5, i ? n : n + r, .5, 7, .5, 2828344);
	Y(e, a, 6.6, 13.4, Xa, { bottom: !0 });
	for (let r of i ? ["s", "n"] : ["e", "w"]) e.S.quad(...q(a, r, i ? t : n, 11.6, 12.8, 3.2, .03), 16777215, 1, Ti(16)), e.S.quad(...q(a, r, i ? t : n, 8.4, 12.8, 3.2, .03), 16777215, 1, Ti(17));
	e.N.box(t, 13.5, n, i ? 13.4 : .6, .16, i ? .6 : 13.4, 2746111);
	for (let r of [-4.5, 4.5]) e.solid((i ? t + r : t) - .3, (i ? t + r : t) + .3, (i ? n : n + r) - .3, (i ? n : n + r) + .3, 7);
}
function $s(e, t) {
	let n = e.rnd, r = t.tiers[0], i = t.recipe === "M1" ? 6 : t.recipe === "M2" ? 5 : 4.5, a = {
		x0: r.x0 - .15,
		x1: r.x1 + .15,
		z0: r.z0 - .15,
		z1: r.z1 + .15
	}, o = (a.x0 + a.x1) / 2, s = (a.z0 + a.z1) / 2;
	e.B.box(o, i / 2, s, a.x1 - a.x0, i, a.z1 - a.z0, Za(e, [
		U,
		3091264,
		U,
		4030351
	]), { top: U });
	let c = t.corner ? t.corner[0] : Za(e, ["s", "n"]);
	for (let n of [
		"s",
		"n",
		"e",
		"w"
	]) if ($a(e, a, n, .5, 3.1, 4.2, 2.6, 3.4, 2.2, .04, .75), t.recipe === "M1" && !e.low && $a(e, a, n, 3.3, 5.7, 8.4, 2.4, 7.2, 1.6, .04, .9), t.recipe === "M3" && !e.low && (n === "s" || n === "n")) {
		let t = Za(e, Ya), r = Math.floor((a.x1 - a.x0 - 1) / 8.4), i = (a.x1 - a.x0) / r;
		for (let o = 0; o < r; o++) Y(e, J(a, n, a.x0 + (o + .5) * i, 3.6, 1.2), 3, 3.12, o % 2 ? t : U, { bottom: !0 });
	}
	if (t.recipe === "M2" && !e.low) {
		for (let t of ["s", "n"]) for (let n = a.x0 + 2; n <= a.x1 - 1.9; n += (a.x1 - a.x0 - 4) / 6) e.B.box(n, 2.5, t === "s" ? a.z1 + 1.6 : a.z0 - 1.6, .8, 5, .8, U);
		for (let t of ["s", "n"]) Y(e, J(a, t, o, (a.x1 - a.x0) / 2, 2.2), 5, 5.5, U, { bottom: !0 });
	}
	if (Y(e, J(a, c, c === "s" || c === "n" ? o : s, 4, 4), 3.9, 4.2, t.wall === 16748410 ? 16643818 : Za(e, [
		16643818,
		3033707,
		16727972
	]), { bottom: !0 }), e.B.quad(...q(a, c, c === "s" || c === "n" ? o : s, 1.6, 3.6, 3.2, .08), 1780288), t.wall === 16748410 ? no(e, a, c, 20, 5.2) : n() < .6 && no(e, a, c, Za(e, Ci), i + .9), t.recipe === "M4") {
		let n = q(a, c, c === "s" || c === "n" ? t.corner[1] === "w" ? a.x0 + 15 : a.x1 - 15 : s, 7.2, 2.2, 2.2, .3);
		e.B.quad(...n, U), e.L.quad(...q(a, c, t.corner[1] === "w" ? a.x0 + 15 : a.x1 - 15, 7.2, 2.2, 2.2, .34), 16766346, .5);
	}
}
function ec(e, t) {
	Zs.towers++;
	let n = e.rnd, r = t.tiers.filter((e) => !e.plain).reduce((e, t) => t.y1 > e.y1 ? t : e);
	if (e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, qs), go(e, t.tiers), $s(e, t), t.crown || t.h > 34 && n() < .75) {
		let n = t.crown || Za(e, [
			16777215,
			2746111,
			16727972,
			16777215
		]);
		for (let t of [
			"s",
			"n",
			"e",
			"w"
		]) r.round || to(e, r, t, r.y1 - .5, n);
	}
	if (t.mast && (e.B.box(t.mast.x, (t.mast.y0 + t.mast.y1) / 2, t.mast.z, .4, t.mast.y1 - t.mast.y0, .4, U), e.N.box(t.mast.x, t.mast.y1, t.mast.z, .8, .8, .8, 16734810)), t.helipad) {
		let t = (r.x0 + r.x1) / 2, n = (r.z0 + r.z1) / 2, i = r.y1 + .05;
		e.B.flat(t - 8, t + 8, n - 8, n + 8, i, 3881286);
		for (let [r, a, o] of [
			[
				-2.2,
				1,
				7
			],
			[
				2.2,
				1,
				7
			],
			[
				0,
				4,
				1
			]
		]) e.B.flat(t + r - a / 2, t + r + a / 2, n - o / 2, n + o / 2, i + .04, U);
	}
	if (t.plaza) {
		let n = t.plaza, r = (t.x0 + t.x1) / 2, i = (t.z0 + t.z1) / 2, a = n === "e" ? t.x0 + 12 : n === "w" ? t.x1 - 12 : r, o = n === "s" ? t.z0 + 12 : n === "n" ? t.z1 - 12 : i, s = n === "n" || n === "s";
		e.B.box(a, K + 1.6, o, 2.2, 3.2, 2.2, Za(e, Ya), {
			rot: .6,
			bottom: !0
		}), e.solid(a - 1.4, a + 1.4, o - 1.4, o + 1.4, 3.4);
		for (let t of [-18, 18]) {
			let n = s ? a + t : a, r = s ? o : o + t;
			e.low || (e.B.box(n, K + .4, r, s ? 8 : 2, .8, s ? 2 : 8, U, { top: Js }), e.solid(n - (s ? 4 : 1), n + (s ? 4 : 1), r - (s ? 1 : 4), r + (s ? 1 : 4), .9)), e.decor("palm", n, K + .6, r, n + r, .8), e.decor("bench", s ? n : a + 4, K, s ? o + 4 : r, s ? Math.PI : Math.PI / 2, 1);
		}
		for (let r = -1; r <= 1; r++) {
			let i = s ? a + r * 3 : n === "e" ? t.x0 + 2 : t.x1 - 2, c = s ? n === "s" ? t.z0 + 2 : t.z1 - 2 : o + r * 3;
			e.B.box(i, 5, c, .14, 10, .14, 13159634), e.low || e.B.box(i + .9, 9.2, c, 1.6, 1, .05, [
				2746111,
				16727972,
				16773577
			][r + 1], { bottom: !0 });
		}
	}
	for (let n of t.tiers) n.y0 === 0 && e.solid(n.x0 - .15, n.x1 + .15, n.z0 - .15, n.z1 + .15, n.y1);
}
var tc = (e, t) => {
	e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, t.ground);
	for (let n = 0; n < 16; n++) {
		let r = t.x0 + 10 + e.rnd() * (t.x1 - t.x0 - 20), i = t.z0 + 10 + e.rnd() * (t.z1 - t.z0 - 20);
		e.decor("palm", r, K, i, n * 1.7, .9 + e.rnd() * .4), e.solid(r - .3, r + .3, i - .3, i + .3, 1);
	}
}, nc = {
	id: "meridian",
	stats: Zs,
	*build(e, t, n, r) {
		let i = t.rect, a = n.zone("meridian"), o = a.bounds, s = e.G, c = e.M, l = Math.max(i.x0, o.x0), u = Math.min(i.x1, o.x1), d = Math.max(i.z0, o.z0), f = Math.min(i.z1, o.z1), p = [...a.hero, ...a.reserved];
		s.flat(l, u, d, f, 0, Ws);
		for (let r of n.blocksInChunk(t.cx, t.cz)) ao(e, r.x0, r.x1, r.z0, r.z1);
		for (let t of a.plazas) Xs(t, i) && ao(e, Math.max(t.x0, i.x0), Math.min(t.x1, i.x1), Math.max(t.z0, i.z0), Math.min(t.z1, i.z1));
		yield;
		for (let r of n.roadsInChunk(t.cx, t.cz)) {
			let t = r.axis === "ns", i = (t ? r.az : r.ax) + (r.a ? n.nodes.get(r.a).half[t ? "ew" : "ns"] + 2.5 : 0), a = (t ? r.bz : r.bx) - (r.b ? n.nodes.get(r.b).half[t ? "ew" : "ns"] + 2.5 : 0), o = t ? r.ax : r.az, s = r.lanes === 1 ? [0] : r.lanes === 2 ? [-4.8, 4.8] : [
				-5.6,
				5.6,
				-9.2,
				9.2
			];
			for (let e = i; e + 3 <= a; e += 9) for (let n of s) t ? c.flat(o + n - .12, o + n + .12, e, e + 3, Ys, Gs) : c.flat(e, e + 3, o + n - .12, o + n + .12, Ys, Gs);
			if (r.lanes > 1) {
				let n = r.lanes === 3 ? 2 : .25, s = r.lanes === 3 ? Ks : Gs;
				if (t ? c.flat(o - n, o + n, i, a, Ys, s) : c.flat(i, a, o - n, o + n, Ys, s), r.lanes === 3) for (let t = i + 6; t < a - 4; t += 16) e.decor("palm", o, 0, t, t, .95 + e.rnd() * .3), e.solid(o - .3, o + .3, t - .3, t + .3, 1);
			}
			for (let [e, s] of [[r.a, i], [r.b, a]]) {
				let a = e && n.nodes.get(e);
				if (!a || !a.signal) continue;
				let l = s === i ? 1 : -1, u = r.width / 2 - .7;
				for (let e = -u; e < u - .3; e += 1.4) {
					let n = s - l * 1.5, r = s + l * 1, i = Math.min(n, r), a = Math.max(n, r);
					t ? c.flat(o + e, o + e + .7, i, a, Ys, 16777215) : c.flat(i, a, o + e, o + e + .7, Ys, 16777215);
				}
			}
			r.stub && (t ? oo(e, o, r.a ? r.bz - 8 : r.az + 8, !0, r.width + 8, r.a ? "s" : "n") : oo(e, r.a ? r.bx - 10 : r.ax + 10, o, !1, r.width + 8, r.a ? "w" : "e"));
		}
		yield;
		for (let i of n.lotsInChunk(t.cx, t.cz)) e.rnd = pi(i.seed || 7), i.hero ? r[i.hero].build(e, i, n) : i.reserved ? tc(e, i) : ec(e, i), yield;
		e.rnd = pi(t.seed);
		for (let r of n.blocksInChunk(t.cx, t.cz)) {
			if (r.edge || p.some((e) => Xs(e, r))) continue;
			if (r.row.strip) {
				let t = (r.x0 + r.x1) / 2, n = (r.z0 + r.z1) / 2;
				r.row.id === "S" && (r.ci % 3 == 1 || Math.abs(t - 52) < 60) && Qs(e, t < 52 && t > -8 ? r.x1 - 14 : t > 52 && t < 112 ? r.x0 + 14 : t, n, "s");
				for (let t = r.x0 + 8; t <= r.x1 - 6; t += 16) e.decor("palm", t, K, r.row.id === "S" ? r.z0 + 2 : r.z1 - 2, t, 1);
				continue;
			}
			let t = 0;
			for (let n = r.x0 + 6; n <= r.x1 - 5; n += 12, t++) for (let [i, a] of [[r.z1 - 1, 1], [r.z0 + 1, -1]]) t % 2 == 0 ? e.prop("lamp", n, K, i, a > 0 ? 0 : Math.PI) : e.low && t % 4 != 1 || (e.decor("palm", n, K, i - a * .4, n * 7 + i, .8 + e.rnd() * .3), e.solid(n - .3, n + .3, i - a * .4 - .3, i - a * .4 + .3, 1));
			if (!e.low) for (let t = r.z0 + 21; t <= r.z1 - 20; t += 24) for (let n of [r.x0 + 1.4, r.x1 - 1.4]) e.decor("palm", n, K, t, n + t * 3, .85), e.solid(n - .3, n + .3, t - .3, t + .3, 1);
			e.decor("bench", r.x0 + 20, K, r.z1 - 2.6, Math.PI, 1);
		}
	},
	shell(e, t, n, r) {
		for (let r of n.blocksInChunk(t.cx, t.cz)) po(e.W, r.x0, r.x1, r.z0, r.z1, K, Ks);
		for (let i of n.lotsInChunk(t.cx, t.cz)) i.hero ? r[i.hero].shell && r[i.hero].shell(e, i) : i.tiers ? go({ W: e.W }, i.tiers, {
			cell: 6,
			cut: !1
		}) : i.reserved && po(e.W, i.x0, i.x1, i.z0, i.z1, K + .02, i.ground);
	}
}, rc = /* @__PURE__ */ t({
	BEIGE: () => uc,
	BILLBOARDS: () => Sc,
	BOARD_Z: () => Cc,
	MOTEL: () => fc,
	TINTS: () => dc,
	default: () => Tc
}), ic = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-"), ac = -800, oc = 720, sc = -2700, cc = -1500, lc = -1520, uc = 15260868, dc = [
	16039357,
	12378314,
	12900322,
	16044970
], fc = [
	16039357,
	12378314,
	12900322
], pc = [
	[-680, "Layaway Lane"],
	[
		-520,
		"Hospital Road",
		"avenue"
	],
	[-360, "Refund Street"],
	[
		-200,
		"Galleria Road",
		"avenue",
		[[sc, -2530], [-2120, -1800]]
	],
	[
		-40,
		"Markdown Street",
		"street",
		[[sc, -2440], [-2120, -1800]]
	],
	[
		120,
		"Voucher Avenue",
		"avenue"
	],
	[
		280,
		"Bulk Street",
		"street",
		[[-2440, -2120]]
	],
	[
		440,
		"Doorbuster Drive",
		"avenue"
	],
	[
		700,
		"Route 44",
		"avenue"
	]
], mc = [
	[
		-2600,
		"Receipt Road",
		"street",
		[[-210, 45]]
	],
	[
		-2440,
		"Billboard Road",
		"avenue"
	],
	[
		-2280,
		"Warranty Street",
		"street",
		[[120, 440]]
	],
	[
		-2120,
		"Outlet Road",
		"avenue"
	],
	[
		-1960,
		"Clearance Street",
		"street",
		[[-360, -40]]
	],
	[
		-1800,
		"Gateway Boulevard",
		"boulevard"
	],
	[-1640, "Coupon Street"],
	[lc, "Rebate Road"]
], hc = [];
for (let [e, t, n = "street", r = []] of pc) hc.push({
	id: ic(t),
	pid: "northgate:" + ic(t),
	name: t,
	axis: "ns",
	at: e,
	from: sc,
	to: lc,
	kind: n,
	closed: r
});
for (let [e, t, n = "street", r = []] of mc) hc.push({
	id: ic(t),
	pid: "northgate:" + ic(t),
	name: t,
	axis: "ew",
	at: e,
	from: ac,
	to: 700,
	kind: n,
	closed: r
});
var gc = (e = "street") => e === "boulevard" ? 15 : e === "avenue" ? 11 : 7, _c = [{
	id: "N",
	z0: sc,
	z1: mc[0][0] - 7
}];
for (let e = 0; e < mc.length - 1; e++) _c.push({
	id: "R" + e,
	z0: mc[e][0] + gc(mc[e][2]),
	z1: mc[e + 1][0] - gc(mc[e + 1][2])
});
var vc = [
	{
		id: "sinkhole-park",
		name: "Sinkhole Park",
		x0: ac,
		x1: -360,
		z0: sc,
		z1: -2280,
		shares: { strip: 100 }
	},
	{
		id: "medical-mile",
		name: "Medical Mile",
		x0: ac,
		x1: -360,
		z0: -2280,
		z1: cc,
		shares: {
			strip: 90,
			drive: 10
		}
	},
	{
		id: "motel-circle",
		name: "Motel Circle",
		x0: 40,
		x1: oc,
		z0: -1785,
		z1: cc,
		shares: {
			motel: 55,
			strip: 35,
			drive: 10
		}
	},
	{
		id: "the-strip",
		name: "The Strip",
		x0: -360,
		x1: oc,
		z0: -1960,
		z1: cc,
		shares: {
			strip: 55,
			drive: 25,
			box: 15,
			motel: 5
		}
	},
	{
		id: "the-strip",
		name: "The Strip",
		x0: -360,
		x1: 40,
		z0: -2120,
		z1: -1960,
		shares: {
			strip: 55,
			drive: 25,
			box: 15,
			motel: 5
		}
	},
	{
		id: "studio-park",
		name: "Studio Park",
		x0: -360,
		x1: oc,
		z0: sc,
		z1: -1960,
		shares: {
			strip: 75,
			box: 25
		}
	}
], yc = {
	strip: {
		recipe: "ng-strip",
		h: 6.7
	},
	box: {
		recipe: "ng-box",
		h: 9
	},
	drive: {
		recipe: "ng-drive",
		h: 7
	},
	motel: {
		recipe: "ng-motel",
		h: 6.4
	}
}, bc = [
	{
		id: "hospital",
		x0: -509,
		x1: -367,
		z0: -1785,
		z1: -1647,
		h: 34,
		body: 12378314,
		hood: "medical-mile"
	},
	{
		id: "sheriff-hq",
		x0: 131,
		x1: 433,
		z0: -2273,
		z1: -2131,
		h: 45,
		body: 16249834,
		hood: "studio-park"
	},
	{
		id: "galleria",
		x0: -353,
		x1: -47,
		z0: -2109,
		z1: -1815,
		h: 36,
		body: uc,
		hood: "the-strip"
	},
	{
		id: "starlite",
		x0: 131,
		x1: 433,
		z0: -2429,
		z1: -2287,
		h: 22,
		body: 16777215,
		hood: "studio-park"
	}
];
function xc(e, t, { rng: n, hash2: r, overlap: i }) {
	let a = e.x1 - e.x0, o = e.z1 - e.z0;
	if (a < 60 || o < 60 || bc.some((t) => i(t, e))) return;
	let s = (e.x0 + e.x1) / 2, c = (e.z0 + e.z1) / 2, l = n(e.seed), u = vc.find((e) => s >= e.x0 && s < e.x1 && c >= e.z0 && c < e.z1) || vc[3], d = () => {
		let e = l() * 100;
		for (let t in u.shares) if (e -= u.shares[t], e < 0) return t;
		return "strip";
	}, f = 0, p = (i, a, o, s, c, l) => {
		let d = r(e.seed, f, 0), p = n(d), m = l === "s" ? s + 3 : c - 3, h = l === "s" ? 1 : -1, g = (a + o) / 2, _ = {
			id: `${e.id}:${f++}`,
			zone: "northgate",
			hood: u.id,
			block: e.id,
			recipe: i,
			kit: yc[i],
			x0: a,
			x1: o,
			z0: s,
			z1: c,
			face: l,
			seed: d,
			floors: i === "motel" ? 2 : 1,
			h: yc[i].h,
			sides: {},
			wall: uc,
			tint: dc[Math.floor(p() * 4)],
			pole: 14 + Math.floor(p() * 9)
		}, v = (e, t, n = 0) => ({
			x0: g - e / 2,
			x1: g + e / 2,
			z0: Math.min(m + h * n, m + h * (n + t)),
			z1: Math.max(m + h * n, m + h * (n + t))
		});
		if (i === "strip" || i === "box") {
			let e = i === "box" ? 60 : c - s < 100 ? 22 : 24, t = c - s - e - 10, n = o - a - 6, r = i === "box" ? Math.max(0, (n - 90) / 2 - 2) * e * 2 : 0, u = i === "box" ? 90 : Math.min(120, o - a - 16, Math.floor(n * t / (2.05 * e)));
			_.body = v(u, e);
			let d = l === "s" ? _.body.z1 : _.body.z0;
			_.park = {
				x0: a + 3,
				x1: o - 3,
				z0: l === "s" ? d + 3 : s + 4,
				z1: l === "s" ? c - 4 : d - 3
			}, _.parkArea = n * t + r, _.bodyArea = u * e, i === "box" && (_.tint = p() < .5 ? 16734810 : 16752686);
		} else i === "drive" ? (_.body = v(14, 10, (c - s) / 2 - 12), _.wall = _.tint) : (_.body = v(48, 57), _.wall = fc[Math.floor(p() * 3)], _.pole = 12);
		return t(_);
	}, m = d();
	if (o < 125 || m === "box") {
		let t = m === "box" && (o < 125 || a < 138) ? "strip" : m;
		(t === "motel" || t === "drive") && a >= 130 ? (p(t, e.x0, s, e.z0, e.z1, "s"), p(t, s, e.x1, e.z0, e.z1, "s")) : p(t, e.x0, e.x1, e.z0, e.z1, "s");
	} else for (let [t, n, r, i] of [[
		e.z0,
		c,
		"n",
		m
	], [
		c,
		e.z1,
		"s",
		d()
	]]) {
		let o = i === "box" ? "strip" : i;
		o === "strip" || a < 130 ? p(o === "motel" && a < 130 ? "motel" : o === "drive" ? "drive" : "strip", e.x0, e.x1, t, n, r) : (p(o, e.x0, s, t, n, r), p(o, s, e.x1, t, n, r));
	}
}
var Sc = [];
for (let e of [
	-509,
	-353,
	-189,
	-33,
	131,
	287
]) for (let t = 0; t < 6; t++) Sc.push(e + 11 + 24 * t);
Sc.push(462, 486, 510, 534);
var Cc = -2458, wc = {
	traffic: {
		tarpon: 5,
		grouper: 5,
		snook: 4,
		mullet: 3,
		pompano: 3,
		heron: 2,
		possum: 2,
		manatee: 1,
		taxi: 1,
		hogfish: 1
	},
	peds: {
		tourist: 8,
		retiree: 3,
		"office worker": 2
	}
}, Tc = {
	id: "northgate",
	name: "Northgate",
	bounds: {
		x0: ac,
		x1: oc,
		z0: sc,
		z1: cc
	},
	seed: 6601,
	roads: { lines: hc },
	lots: "grid",
	generator: "northgate",
	rows: _c,
	kit: yc,
	hoods: vc,
	split: xc,
	billboards: {
		z: Cc,
		xs: Sc
	},
	hero: bc,
	reserved: [],
	plazas: [{
		x0: -353,
		x1: -47,
		z0: -2109,
		z1: -1815
	}, {
		x0: 131,
		x1: 433,
		z0: -2429,
		z1: -2131
	}],
	landmarks: {
		hospital: {
			x: -500,
			z: -1700,
			w: 136,
			d: 100,
			h: 34,
			level: 0
		},
		"sheriff-hq": {
			x: 200,
			z: -2150,
			w: 100,
			d: 105,
			h: 45,
			level: 0
		},
		galleria: {
			x: -200,
			z: -2e3,
			w: 220,
			d: 120,
			h: 36,
			level: 0
		},
		starlite: {
			x: 350,
			z: -2400,
			w: 200,
			d: 150,
			h: 22,
			level: 0
		}
	},
	places: [
		{
			id: "bayhaven-general",
			kind: "hospital",
			x: -500,
			z: -1700,
			h: -Math.PI / 2
		},
		{
			id: "sheriff-hq-steps",
			kind: "booking",
			x: 200,
			z: -2146,
			h: 0
		},
		{
			id: "park-and-sons-northgate",
			kind: "shop:garage",
			x: -120,
			z: -2160
		},
		{
			id: "second-wind-thrift-northgate",
			kind: "shop:thrift",
			x: 60,
			z: -1835
		},
		{
			id: "storm-mart-northgate",
			kind: "shop:storm",
			x: 200,
			z: -1845
		},
		{
			id: "bait-and-ballistics",
			kind: "shop:guns",
			x: 520,
			z: -1840
		},
		{
			id: "shell-yeah-northgate",
			kind: "food",
			x: -290,
			z: -1765
		},
		{
			id: "birdbath-car-wash-northgate",
			kind: "carwash",
			x: 520,
			z: -1765
		}
	],
	traffic: wc.traffic,
	peds: wc.peds,
	night: {
		traffic: {
			tarpon: 3,
			hogfish: 2,
			mullet: 2,
			taxi: 1
		},
		peds: {
			tourist: 3,
			"office worker": 1
		},
		cap: .3
	},
	streetSpeed: 11.1,
	parked: .2,
	hangOut: .3,
	ambience: "strip",
	palette: "northgate"
}, Ec = /* @__PURE__ */ t({
	car: () => Nc,
	carPark: () => Fc,
	default: () => Uc,
	poleSign: () => Pc,
	stats: () => Z
}), Dc = 4867924, Oc = 16734810, kc = 16761600, Ac = [
	16249834,
	10134445,
	3033707,
	16748410,
	9429967,
	3815492,
	16763279
], Z = {
	strips: 0,
	boxes: 0,
	drives: 0,
	motels: 0,
	pools: 0,
	poleSigns: 0,
	poleMin: 99,
	billboards: 0,
	larry: 0,
	cars: 0,
	tallest: 0,
	parkRatioMin: 99
}, jc = [
	"larry",
	"annie",
	"larry",
	"gull",
	"annie",
	"larry",
	"limpet",
	"annie",
	"larry",
	"jellyfish"
], Mc = {
	larry: {
		text: "Larry 555-0144",
		bg: 16761600,
		ink: "#c8372d",
		suit: 3033707
	},
	annie: {
		text: "Annie 555-0155",
		bg: 8378088,
		ink: "#150f3d",
		suit: 16727972
	},
	gull: {
		text: "Gull, Gull & Gull",
		bg: 16249834,
		ink: "#2e4a6b",
		suit: 7301752
	},
	limpet: {
		text: "Limpet Legal",
		bg: 12378314,
		ink: "#2f7d5b",
		suit: 3815492
	},
	jellyfish: {
		text: "Jellyfish Injury Law",
		bg: 16039357,
		ink: "#b46bff",
		suit: 11824127
	}
};
function Nc(e, t, n, r, i = Ac[Math.floor(e.rnd() * Ac.length)], a = K) {
	let o = 4.3, s = 1.8;
	e.B.box(t, a + .55, n, r ? s : o, .7, r ? o : s, i), e.B.box(t, a + 1.15, n, r ? 1.6 : o * .5, .5, r ? o * .5 : 1.6, G, { top: i }), e.solid(t - (r ? s : o) / 2, t + (r ? s : o) / 2, n - (r ? o : s) / 2, n + (r ? o : s) / 2, 1.4), Z.cars++;
}
function Pc(e, t, n, r, i) {
	let a = {
		x0: t - .3,
		x1: t + .3,
		z0: n - 2.6,
		z1: n + 2.6
	}, o = wi[Math.floor(e.rnd() * wi.length)];
	e.B.box(t, (r - 3) / 2, n, .5, r - 3, .5, W), Y(e, a, r - 3, r, Oc), e.B.box(t, r - 4.2, n, .5, 1.6, 3.6, kc);
	for (let t of ["e", "w"]) e.S.quad(...q(a, t, n, r - 1.5, 4.8, 1.2, .03), 16777215, 1, Ti(o));
	i && e.N.box(t, r + .12, n, .3, .16, 5.4, i), e.solid(t - .3, t + .3, n - .3, n + .3, r), Z.poleSigns++, Z.poleMin = Math.min(Z.poleMin, r), Z.tallest = Math.max(Z.tallest, r);
}
function Fc(e, t, n = .3, r = 10) {
	e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, Dc);
	let i = e.low ? 5.4 : 2.7, a = K + .03, o = 0;
	for (let s = t.z0 + 6; s + 6 <= t.z1; s += 17) {
		e.M.flat(t.x0 + 4, t.x1 - 4, s - .07, s + .07, a, 16777215);
		for (let n = t.x0 + 4; n <= t.x1 - 4; n += i) e.M.flat(n - .07, n + .07, s - 5, s + 5, a, 16777215);
		for (let i = t.x0 + 5.35; i < t.x1 - 6 && o < (e.low ? r / 2 : r); i += 2.7) e.rnd() < n * .35 && (Nc(e, i, s + (e.rnd() < .5 ? -2.6 : 2.6), !0), o++);
	}
}
var Ic = (e) => e.face === "s" ? e.z1 - 2.5 : e.z0 + 2.5;
function Lc(e, t) {
	let n = t.body, r = t.face, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2, o = n.x1 - n.x0, s = n.z1 - n.z0;
	e.B.box(i, 2.75, a, o, 5.5, s, uc, { noTop: !0 }), e.B.box(i, 6.1, a, o + .4, 1.2, s + .4, t.tint, { top: W });
	let c = Math.max(1, Math.floor(o / 13)), l = o / c;
	for (let t = 0; t < c; t++) {
		let i = n.x0 + (t + .5) * l;
		e.B.quad(...q(n, r, i, 1.7, l - 3, 2.8, .05), G, .85 + e.rnd() * .3), e.rnd() < .55 && e.L.quad(...q(n, r, i, 1.7, l - 3, 2.8, .08), 16766346, .4 + e.rnd() * .5), t % 2 != 0 && e.low || e.S.quad(...q(n, r, i, 4.5, 6.4, 1.6, .06), 16777215, 1, Ti(wi[Math.floor(e.rnd() * wi.length)]));
	}
	let u = J(n, r, i, o / 2, 3);
	if (Y(e, u, 3.35, 3.55, U, { bottom: !0 }), !e.low) for (let t = 0; t <= c; t++) e.B.box(n.x0 + t * l, 1.75, r === "s" ? u.z1 - .2 : u.z0 + .2, .2, 3.3, .2, U, { noTop: !0 });
	e.solid(n.x0, n.x1, n.z0, n.z1, 6.7), Fc(e, t.park), Pc(e, t.x0 + 12, Ic(t), t.pole), Z.strips++, Z.parkRatioMin = Math.min(Z.parkRatioMin, t.parkArea / t.bodyArea);
}
function Rc(e, t) {
	let n = t.body, r = t.face, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2, o = n.x1 - n.x0, s = n.z1 - n.z0, c = r === "s" ? 1 : -1;
	e.B.box(i, 4.5, a, o, 9, s, uc, { top: W }), e.B.box(i, 7, a, o + .3, 2, s + .3, t.tint, { noTop: !0 });
	for (let t = 0; t < (e.low ? 3 : 6); t++) e.B.box(n.x0 + 12 + t % 3 * 30, 9.6, a + (t < 3 ? -12 : 12), 4, 1.2, 3, 12038328);
	let l = J(n, r, i, 7, 3);
	Y(e, l, 0, 11, t.tint, { top: W }), e.B.quad(...q(l, r, i, 2.6, 12, 5, .05), G), e.L.quad(...q(l, r, i, 2.6, 12, 5, .08), 16766346, .5), e.S.quad(...q(l, r, i, 8.3, 12.8, 3.2, .06), 16777215, 1, Ti(wi[Math.floor(e.rnd() * wi.length)])), e.solid(n.x0, n.x1, n.z0, n.z1, 9), e.solid(l.x0, l.x1, l.z0, l.z1, 11), Fc(e, t.park, .3, 14);
	for (let r of [-1, 1]) {
		let i = r < 0 ? t.x0 + 3 : n.x1 + 2, a = r < 0 ? n.x0 - 2 : t.x1 - 3;
		e.G.flat(i, a, n.z0, n.z1 + c * 3, K + .012, Dc);
	}
	Pc(e, t.x0 + 12, Ic(t), t.pole), Z.boxes++, Z.tallest = Math.max(Z.tallest, 11), Z.parkRatioMin = Math.min(Z.parkRatioMin, t.parkArea / t.bodyArea);
}
function zc(e, t) {
	let n = t.body, r = t.face, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2, o = [
		16727972,
		16752686,
		2746111
	][Math.floor(e.rnd() * 3)];
	e.G.flat(t.x0 + 3, t.x1 - 3, t.z0 + 4, t.z1 - 4, K + .012, Dc), e.B.box(i, 2, a, 14, 4, 10, t.wall, { top: W }), e.B.box(i, 5.5, a, 7, 3, 2.4, Oc, {
		taper: [.55, 1],
		top: kc
	}), e.N.box(i, 4.1, r === "s" ? n.z1 + .2 : n.z0 - .2, 14.4, .16, .12, o), e.B.quad(...q(n, r, i, 1.8, 9, 2.4, .05), G), e.L.quad(...q(n, r, i, 1.8, 9, 2.4, .08), 16766346, .6), e.B.quad(...q(n, "e", a, 1.9, 1.6, 1.2, .05), G), e.B.box(n.x1 + 5.2, K + 1.2, n.z0 + 1, .3, 2.2, 1.8, 1313836), e.solid(n.x1 + 5, n.x1 + 5.4, n.z0 + .1, n.z0 + 1.9, 2.4);
	let s = K + .03, c = {
		x0: n.x0 - 5,
		x1: n.x1 + 5,
		z0: n.z0 - 5,
		z1: n.z1 + 5
	};
	for (let [t, n, r, i] of [
		[
			c.x0,
			c.x1,
			c.z0,
			c.z0 + .15
		],
		[
			c.x0,
			c.x1,
			c.z1 - .15,
			c.z1
		],
		[
			c.x0,
			c.x0 + .15,
			c.z0,
			c.z1
		],
		[
			c.x1 - .15,
			c.x1,
			c.z0,
			c.z1
		]
	]) e.M.flat(t, n, r, i, s, 15918768);
	e.solid(n.x0, n.x1, n.z0, n.z1, 4);
	for (let n = 0; n < (e.low ? 1 : 3); n++) e.rnd() < .6 && Nc(e, t.x0 + 8 + n * 2.8, a, !0);
	Pc(e, t.x1 - 8, Ic(t), t.pole, o), Z.drives++, Z.tallest = Math.max(Z.tallest, 7);
}
function Bc(e, t) {
	let n = t.body, r = t.face, i = (n.x0 + n.x1) / 2, a = t.wall, o = r === "s", s = {
		x0: n.x0 + 9,
		x1: n.x1 - 9,
		z0: o ? n.z0 : n.z1 - 9,
		z1: o ? n.z0 + 9 : n.z1
	}, c = {
		x0: n.x0,
		x1: n.x0 + 9,
		z0: n.z0,
		z1: n.z1
	}, l = {
		x0: n.x1 - 9,
		x1: n.x1,
		z0: n.z0,
		z1: n.z1
	};
	e.G.flat(t.x0 + 3, t.x1 - 3, t.z0 + 4, t.z1 - 4, K + .012, Dc);
	for (let [t, n] of [
		[c, "e"],
		[l, "w"],
		[s, r]
	]) {
		Y(e, t, 0, 6.4, a, { top: W }), Y(e, J(t, n, n === r ? i : (t.z0 + t.z1) / 2, (n === r ? 30 : 57) / 2, 1.4), 3.1, 3.25, U, { bottom: !0 });
		let o = n === r ? t.x0 : t.z0, s = n === r ? t.x1 : t.z1;
		for (let r = o + 2; r < s - 1; r += 4) for (let i = 0; i < (e.low ? 1 : 2); i++) e.B.quad(...q(t, n, r, 1.05 + i * 3.2, 1, 2.1, .04), U, .9), e.rnd() < .25 && e.L.quad(...q(t, n, r + 1.5, 1.6 + i * 3.2, 1.2, 1, .05), 16766346, .5 + e.rnd() * .4);
		e.solid(t.x0, t.x1, t.z0, t.z1, 6.4);
	}
	let u = o ? n.z0 + 9 + 20 : n.z1 - 9 - 20;
	e.B.box(i, K + .1, u, 13, .2, 7, U, { noTop: !0 }), e.G.flat(i - 6, i + 6, u - 3, u + 3, K + .16, 8378088), e.N.box(i, 6.6, o ? s.z1 + .2 : s.z0 - .2, 30, .16, .12, 16727972);
	for (let t = 0; t < (e.low ? 2 : 4); t++) e.rnd() < .5 && Nc(e, n.x0 - 4, n.z0 + 8 + t * 9, !1);
	Pc(e, n.x1 + 5, Ic(t), 12, 2746111), Z.motels++, Z.pools++;
}
function Vc(e, t, n) {
	let r = jc[n % jc.length], i = Mc[r], a = Cc, o = a + .22, s = Fo(e), c = (t, n, r, i, a, s = 0) => e.B.quad([
		t,
		r,
		o + s
	], [
		n,
		r,
		o + s
	], [
		n,
		i,
		o + s
	], [
		t,
		i,
		o + s
	], a);
	e.B.box(t, 4.5, a, .6, 9, .6, W), e.B.box(t, 11.5, a, 12, 5, .4, i.bg), c(t - 5.2, t - 1.8, 9.2, 10.9, i.suit, .01), c(t - 4.4, t - 2.6, 10.6, 13.2, 16767408, .02), c(t - 4.6, t - 2.4, 13, 13.6, 3815492, .03), c(t - 4, t - 3, 11.1, 11.35, 16777215, .03);
	for (let e of [-3.95, -3.05]) c(t + e - .12, t + e + .12, 12.2, 12.45, 1380157, .03);
	s.quad([
		t - 1.2,
		10.5,
		o + .02
	], [
		t + 5.6,
		10.5,
		o + .02
	], [
		t + 5.6,
		12.2,
		o + .02
	], [
		t - 1.2,
		12.2,
		o + .02
	], 16777215, 1, _a(i.text, i.ink)), e.N.box(t, 8.8, a + .9, 8, .12, .12, 16773836), e.solid(t - .3, t + .3, a - .3, a + .3, 14), Z.billboards++, r === "larry" && Z.larry++, Z.tallest = Math.max(Z.tallest, 14);
}
var Hc = {
	strip: Lc,
	box: Rc,
	drive: zc,
	motel: Bc
};
wo("northgate", {
	pave: 14274752,
	ground(e, t) {
		e.G.flat(t.x0, t.x1, t.z0, t.z1, 0, 3881286), Sc.forEach((n, r) => {
			n >= t.x0 && n < t.x1 && -2458 >= t.z0 && -2458 < t.z1 && Vc(e, n, r);
		});
	},
	lot(e, t) {
		Hc[t.recipe](e, t);
	},
	shellLot(e, t) {
		let n = t.body;
		if (t.recipe === "motel") {
			for (let r of [n.x0 + 4.5, n.x1 - 4.5]) e.B.box(r, 3.2, (n.z0 + n.z1) / 2, 9, 6.4, n.z1 - n.z0, t.wall, { top: W });
			return;
		}
		let r = t.recipe === "drive" ? 4 : t.recipe === "box" ? 9 : 6.7;
		e.B.box((n.x0 + n.x1) / 2, r / 2, (n.z0 + n.z1) / 2, n.x1 - n.x0, r, n.z1 - n.z0, t.wall, { top: W });
	},
	furniture(e, t) {
		if (!(t.x1 - t.x0 < 60 || t.zone.hero.some((e) => e.x0 < t.x1 && e.x1 > t.x0 && e.z0 < t.z1 && e.z1 > t.z0))) for (let [n, r] of [[t.z1 - 1, 0], [t.z0 + 1, Math.PI]]) {
			e.prop("lamp", t.x0 + 8, K, n, r), e.low || e.prop("lamp", t.x1 - 8, K, n, r);
			let i = (t.x0 + t.x1) / 2 + (r ? -9 : 9);
			e.decor("palm", i, K, n, i * 3 + n, .8 + e.rnd() * .3), e.solid(i - .3, i + .3, n - .3, n + .3, 1);
		}
	}
});
var Uc = Vo("northgate", Z), Wc = /* @__PURE__ */ t({
	BULB: () => Kc,
	PAVE: () => qc,
	TILE: () => Gc,
	bulbString: () => Qc,
	default: () => el,
	stats: () => Zc
}), Gc = 11031866, Kc = 16773836, qc = 15317410, Jc = [
	16643818,
	16734810,
	3065014,
	16757575,
	16740241
], Yc = (e) => "#" + e.toString(16).padStart(6, "0"), Xc = [
	"Abierto",
	"Se Vende",
	"Storm Mart",
	"Second Wind Thrift",
	"Bay Cab",
	"Cerrado"
], Zc = {
	parkTables: 0,
	per100Min: 99,
	houses: 0,
	bulbStrings: 0,
	bulbs: 0,
	boards: 0,
	murals: 0,
	tallest: 0
};
function Qc(e, t, n, r, i, a = 6, o = 12) {
	let s = r - t, c = i - n, l = Math.hypot(s, c), u = s / l, d = c / l, f = .17, p = t, m = a, h = n;
	for (let r = 0; r <= o + 1; r++) {
		let i = r / (o + 1), l = t + s * i, g = n + c * i, _ = a - 3.2 * i * (1 - i);
		if (r && !e.low && (e.B.quad([
			p,
			m - .03,
			h
		], [
			l,
			_ - .03,
			g
		], [
			l,
			_ + .03,
			g
		], [
			p,
			m + .03,
			h
		], 2828344), e.B.quad([
			l,
			_ - .03,
			g
		], [
			p,
			m - .03,
			h
		], [
			p,
			m + .03,
			h
		], [
			l,
			_ + .03,
			g
		], 2828344)), p = l, m = _, h = g, r === 0 || r === o + 1) continue;
		let v = [
			l - u * f,
			_ - .42,
			g - d * f
		], y = [
			l + u * f,
			_ - .42,
			g + d * f
		], b = [
			l + u * f,
			_ - .08,
			g + d * f
		], x = [
			l - u * f,
			_ - .08,
			g - d * f
		];
		e.N.quad(v, y, b, x, Kc), e.N.quad(y, v, x, b, Kc);
	}
	Zc.bulbStrings++, Zc.bulbs += o;
}
function $c(e, t) {
	let n = t.body, r = t.face, i = t.h, a = (n.x0 + n.x1) / 2, o = (n.z0 + n.z1) / 2, s = n.x1 - n.x0, c = n.z1 - n.z0, l = r === "s" ? 1 : -1, u = e.rnd, d = r === "s" ? n.z1 : n.z0;
	Zc.houses++, Zc.tallest = Math.max(Zc.tallest, i + .5), e.B.box(a, i / 2, o, s - .1, i, c, t.wall, { top: W }), e.B.box(a, i + .25, d - l * .5, s - .1, .5, 1.4, Gc, {
		shift: [0, -l * .35],
		taper: [1, .5]
	});
	let f = Math.max(1, Math.floor(s / 4.2)), p = s / f, m = Math.floor(u() * f);
	for (let i = 0; i < f; i++) {
		let a = n.x0 + (i + .5) * p;
		i === m ? e.B.quad(...q(n, r, a, 1.3, 2.6, 2.6, .05), t.accent, .8) : (e.B.quad(...q(n, r, a, 1.7, p - 1.2, 2, .05), G, .85 + u() * .3), u() < .7 && e.L.quad(...q(n, r, a, 1.7, p - 1.2, 2, .08), 16766346, .4 + u() * .5));
	}
	let h = n.x0 + .3, g = n.x1 - .3, _ = e.low ? 1 : Math.max(2, Math.round((g - h) / 2.4)), v = Jc[1 + Math.floor(u() * 4)];
	for (let t = 0; t < _; t++) {
		let n = h + (g - h) * t / _, r = h + (g - h) * (t + 1) / _, i = d + l * .05, a = d + l * 1.5, o = t % 2 ? Jc[0] : v, s = [
			[
				n,
				3.3,
				i
			],
			[
				r,
				3.3,
				i
			],
			[
				r,
				2.7,
				a
			],
			[
				n,
				2.7,
				a
			]
		];
		l > 0 ? (e.B.quad(s[3], s[2], s[1], s[0], o), e.B.quad(s[0], s[1], s[2], s[3], o, .7)) : (e.B.quad(s[0], s[1], s[2], s[3], o), e.B.quad(s[3], s[2], s[1], s[0], o, .7));
	}
	let y = Math.max(1, Math.floor(s / 3.4)), b = s / y;
	for (let i = 1; i < t.floors; i++) for (let t = 0; t < y; t++) {
		let a = n.x0 + (t + .5) * b, o = 3.6 + (i - .5) * 3 + .1;
		e.B.quad(...q(n, r, a, o, 1.5, 1.7, .05), G, .8 + u() * .4), u() < .3 && e.L.quad(...q(n, r, a, o, 1.5, 1.7, .08), 16766346, .45 + u() * .5);
	}
	if (!e.low) {
		Y(e, J(n, r, a, s / 2 - .4, .9), 3.72, 3.84, U, { bottom: !0 }), Y(e, J({
			...n,
			z0: n.z0 - .85,
			z1: n.z1 + .85
		}, r, a, s / 2 - .4, .06), 3.84, 4.7, t.accent, { noTop: !0 });
		for (let t of [-1, 1]) e.B.box(a + t * .7 + (m - (f - 1) / 2) * .4, K + .45, d + l * 2.3, .5, .9, .5, Jc[1 + Math.floor(u() * 4)], {
			taper: [1, .2],
			shift: [0, l * .2]
		});
	}
	if (s >= 7 && u() < .7) {
		let o = Fo(e), c = Xc[Math.floor(u() * Xc.length)], l = Math.min(5, s - 1.5);
		o.quad(...q(n, r, a, t.floors > 2 ? 6.9 : i - .55, l, l / 4, .07), 16777215, 1, _a(c, Yc(t.accent === t.wall ? 1380157 : [
			16740241,
			3065014,
			16734810,
			3033707
		][Math.floor(u() * 4)]))), Zc.boards++;
	}
	if (t.mural) {
		let [r, a] = Io(n, t.mural.side, .06);
		va(Fo(e), r, a, .4, i - .3, t.mural.seed, Ri, { cells: t.mural.cells }), Zc.murals++;
	}
	e.solid(n.x0, n.x1, n.z0, n.z1, i);
}
wo("palmavieja", {
	pave: qc,
	lot: $c,
	shellLot(e, t) {
		let n = t.body, r = t.h;
		if (!n) return;
		let i = r, a = e.B, o = t.wall;
		a.flat(n.x0, n.x1, n.z0, n.z1, i, W), a.quad(...q(n, t.face, (n.x0 + n.x1) / 2, r / 2, n.x1 - n.x0, r, 0), o), t.wallW && a.quad(...q(n, "w", (n.z0 + n.z1) / 2, r / 2, n.z1 - n.z0, r, 0), o), t.wallE && a.quad(...q(n, "e", (n.z0 + n.z1) / 2, r / 2, n.z1 - n.z0, r, 0), o);
	},
	furniture(e, t) {
		if (t.row.strip) {
			for (let n = t.x0 + 10; n <= t.x1 - 8; n += 26) e.decor("palm", n, K, (t.z0 + t.z1) / 2, n, .9);
			return;
		}
		if (t.x1 - t.x0 < 30 || t.zone.hero.some((e) => e.x0 < t.x1 && e.x1 > t.x0 && e.z0 < t.z1 && e.z1 > t.z0)) return;
		let n = (t.z0 + t.z1) / 2;
		e.G.flat(t.x0, t.x1, n - 2, n + 2, K + .012, 9275281);
		for (let [n, r] of [[t.z1 - 1, 1], [t.z0 + 1, -1]]) if (e.prop("lamp", t.x0 + 7, K, n, r > 0 ? 0 : Math.PI), e.prop("lamp", t.x1 - 7, K, n, r > 0 ? 0 : Math.PI), !e.low || r > 0) {
			let i = (t.x0 + t.x1) / 2 + (r > 0 ? 6 : -6);
			e.decor("palm", i, K, n - r * .4, i * 5 + n, .75 + e.rnd() * .3), e.solid(i - .3, i + .3, n - r * .4 - .3, n - r * .4 + .3, 1);
		}
		e.decor("bench", t.x0 + 18, K, t.z1 - 2.8, Math.PI, 1);
	},
	street(e, t, n) {
		if (t.stub && t.len < 20) return;
		let r = t.axis === "ns", i = (t.ax + t.bx) / 2, a = (t.az + t.bz) / 2, o = n.zone("palmavieja").hoods.find((e) => i >= e.x0 && i < e.x1 && a >= e.z0 && a < e.z1);
		if (!o) return;
		let s = (r ? t.az : t.ax) + (t.a ? n.nodes.get(t.a).half[r ? "ew" : "ns"] : 0) + 5, c = (r ? t.bz : t.bx) - (t.b ? n.nodes.get(t.b).half[r ? "ew" : "ns"] : 0) - 5, l = Math.max(1, Math.ceil((c - s + 10) * o.bulbs / 100)), u = t.width / 2 + 4, d = r ? t.ax : t.az;
		o.bulbs >= 6 && (Zc.per100Min = Math.min(Zc.per100Min, l * 100 / (c - s + 10)));
		for (let t = 0; t < l; t++) {
			let n = s + (c - s) * (t + .5) / l;
			r ? Qc(e, d - u, n, d + u, n) : Qc(e, n, d - u, n, d + u);
		}
	}
});
var el = Vo("palmavieja", Zc), tl = /* @__PURE__ */ t({
	BAR_COLOURS: () => dl,
	BRICK: () => ll,
	METAL: () => ul,
	default: () => kl
}), nl = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-"), rl = 800, il = 1800, al = -1440, ol = -320, sl = -1397, cl = -357, ll = 11031866, ul = 8226192, dl = [
	9459404,
	4902012,
	13382275,
	2209996,
	13402149
], fl = [
	[852, "Madder Street"],
	[932, "Ochre Street"],
	[
		1012,
		"Factory Avenue",
		"avenue"
	],
	[1092, "Cobalt Street"],
	[1172, "Vermilion Street"],
	[1252, "Umber Street"],
	[
		1332,
		"Pigment Avenue",
		"avenue"
	],
	[1412, "Viridian Street"],
	[1492, "Cadmium Street"],
	[1572, "Indigo Street"],
	[
		1652,
		"Gantry Avenue",
		"avenue"
	],
	[1732, "Carmine Street"]
], pl = [
	[
		cl,
		"Flamingo Avenue",
		"avenue"
	],
	[-437, "First Street"],
	[-517, "Second Street"],
	[-597, "Third Street"],
	[
		-677,
		"Commerce Way",
		"avenue"
	],
	[-757, "Fifth Street"],
	[-837, "Sixth Street"],
	[-917, "Seventh Street"],
	[
		-997,
		"Tower Way",
		"avenue"
	],
	[-1077, "Ninth Street"],
	[-1157, "Tenth Street"],
	[-1237, "Eleventh Street"],
	[
		-1317,
		"Union Avenue",
		"avenue"
	],
	[sl, "Thirteenth Street"]
], ml = {
	"Cobalt Street": [[-677, -437]],
	"Umber Street": [[-917, -757]],
	"Sixth Street": [[1172, 1332]]
}, hl = [];
for (let [e, t, n = "street"] of fl) hl.push({
	id: nl(t),
	pid: "paintworks:" + nl(t),
	name: t,
	axis: "ns",
	at: e,
	from: sl,
	to: e <= 1572 ? ol : cl,
	kind: n,
	closed: ml[t] || []
});
for (let [e, t, n = "street"] of pl) hl.push({
	id: nl(t),
	pid: "paintworks:" + nl(t),
	name: t,
	axis: "ew",
	at: e,
	from: rl,
	to: il,
	kind: n,
	closed: ml[t] || []
});
var gl = (e) => e === "avenue" ? 11 : 7, _l = [{
	id: "S",
	z0: -346,
	z1: ol,
	strip: !0
}];
for (let e = 0; e < pl.length - 1; e++) _l.push({
	id: "R" + e,
	z0: pl[e + 1][0] + gl(pl[e + 1][2]),
	z1: pl[e][0] - gl(pl[e][2])
});
_l.push({
	id: "N",
	z0: al,
	z1: -1404,
	strip: !0
});
var vl = [
	{
		id: "the-lofts",
		name: "The Lofts",
		x0: rl,
		x1: il,
		z0: al,
		z1: -1020,
		shares: {
			W1: 90,
			W5: 10
		}
	},
	{
		id: "wet-paint-alley",
		name: "Wet Paint Alley",
		x0: rl,
		x1: 1180,
		z0: -1020,
		z1: ol,
		shares: {
			W1: 90,
			W2: 10
		}
	},
	{
		id: "factory-yard",
		name: "Factory Yard",
		x0: 1180,
		x1: il,
		z0: -1020,
		z1: -660,
		shares: {
			W1: 50,
			W2: 35,
			W5: 15
		}
	},
	{
		id: "container-row",
		name: "Container Row",
		x0: 1180,
		x1: il,
		z0: -660,
		z1: ol,
		shares: {
			W4: 40,
			W2: 25,
			W1: 35
		}
	}
], yl = {
	W1: {
		recipe: "warehouse",
		preset: "brick",
		floors: [2, 3],
		w: 28,
		d: 40
	},
	W2: {
		recipe: "warehouse",
		preset: "metal-shed",
		floors: [1, 1],
		w: 24,
		d: 36
	},
	W4: {
		recipe: "container-bar",
		floors: [2, 3],
		w: 26,
		d: 26
	},
	W5: {
		recipe: "rooftop-club",
		floors: [3, 3],
		w: 28,
		d: 28
	}
}, bl = [{
	id: "paint-factory",
	x0: 1179,
	x1: 1321,
	z0: -910,
	z1: -764,
	h: 62,
	body: ll,
	hood: "factory-yard"
}], xl = [
	[-666, -604],
	[-590, -524],
	[-510, -444]
].map(([e, t]) => ({
	x0: 1085,
	x1: 1099,
	z0: e,
	z1: t
})), Sl = 26, Cl = /* @__PURE__ */ new Map(), wl = (e, t) => Math.floor((e + 3200) / 160) + 64 * Math.floor((t + 3520) / 160);
function Tl(e, t) {
	let n = wl(e, t), r = Cl.get(n) || 0;
	return Cl.set(n, r + 2), 5e3 + r % Sl;
}
function El(e, t, { rng: n, hash2: r, overlap: i }) {
	if (e.row.strip || e.edge || e.x1 - e.x0 < 40 || bl.some((t) => i(t, e))) return;
	let a = {
		x: (e.x0 + e.x1) / 2,
		z: (e.z0 + e.z1) / 2
	}, o = n(e.seed), s = vl.find((e) => a.x >= e.x0 && a.x < e.x1 && a.z >= e.z0 && a.z < e.z1) || vl[0], c = 0;
	for (let e in s.shares) c += s.shares[e];
	let l = o() < .5;
	[[
		e.x0 + 4,
		a.x - .5,
		"w"
	], [
		a.x + .5,
		e.x1 - 4,
		"e"
	]].forEach(([i, a, o], u) => {
		let d = r(e.seed, u, 0), f = n(d), p = e.z0 + 4, m = e.z1 - 4, h = (u ? !l : l) ? "s" : "n", g = f() * c, _ = "W1";
		for (let e in s.shares) if (g -= s.shares[e], g < 0) {
			_ = e;
			break;
		}
		let v = yl[_], y = v.floors[0] + Math.floor(f() * (v.floors[1] - v.floors[0] + 1)), b = Math.min(v.w, a - i), x = Math.min(v.d, m - p), S = o === "w" ? i : a - b, C = h === "s" ? m - x : p, w = (i + a) / 2, T = (p + m) / 2, E = _ === "W1" ? y * 5 + .6 : _ === "W2" ? 8 : _ === "W5" ? 15 : y * 2.6, D = {
			id: `${e.id}:${u}`,
			zone: "paintworks",
			hood: s.id,
			block: e.id,
			recipe: _,
			kit: v,
			x0: i,
			x1: a,
			z0: p,
			z1: m,
			face: h,
			out: o,
			sides: {
				w: o === "w",
				e: o === "e",
				n: h === "n",
				s: h === "s"
			},
			seed: d,
			floors: y,
			h: E,
			wall: _ === "W1" ? ll : _ === "W4" ? dl[Math.floor(f() * 5)] : ul,
			roof: _ === "W2" ? 10134445 : 7301752,
			body: {
				x0: S,
				x1: S + b,
				z0: C,
				z1: C + x
			}
		};
		_ !== "W4" && (D.murals = [{
			side: o,
			seed: Tl(w, T),
			cells: 2
		}], (_ === "W5" || f() < .35) && D.murals.push({
			side: h,
			seed: Tl(w, T),
			cells: 2
		})), t(D);
	});
}
var Dl = {
	traffic: {
		pompano: 3,
		hogfish: 2,
		mullet: 2,
		tarpon: 2,
		pinfish: 3,
		snook: 2,
		taxi: 1,
		wahoo: 1,
		tern: 1,
		needlefish: 1
	},
	peds: {
		tourist: 10,
		skater: 2,
		"office worker": 1
	}
}, Ol = {
	traffic: {
		pompano: 1,
		mullet: 1,
		tarpon: 2,
		pinfish: 1,
		snook: 1,
		taxi: 5,
		sailfin: 4,
		wahoo: 3,
		tern: 2,
		needlefish: 2,
		bonito: 2
	},
	peds: {
		tourist: 1,
		skater: 1,
		clubber: 8
	},
	cap: 1.3
}, kl = {
	id: "paintworks",
	name: "The Paintworks",
	bounds: {
		x0: rl,
		x1: il,
		z0: al,
		z1: ol
	},
	seed: 5141,
	roads: { lines: hl },
	lots: "grid",
	generator: "paintworks",
	rows: _l,
	kit: yl,
	hoods: vl,
	split: El,
	hero: bl,
	reserved: [],
	plazas: [{
		x0: 1179,
		x1: 1321,
		z0: -910,
		z1: -764
	}, ...xl],
	landmarks: {
		"paint-factory": {
			x: 1300,
			z: -800,
			w: 142,
			d: 146,
			h: 62,
			level: 0
		},
		"wet-paint-alley": {
			x: 1100,
			z: -600,
			w: 8,
			d: 222,
			h: 9,
			level: 0
		}
	},
	places: [
		{
			id: "paintworks-loft",
			kind: "property",
			x: 1430,
			z: -1117
		},
		{
			id: "food-truck",
			kind: "business",
			x: 1e3,
			z: -1100
		},
		{
			id: "second-wind-thrift-paintworks",
			kind: "shop:thrift",
			x: 892,
			z: -720
		},
		{
			id: "bay-cab-rank-seventh-street",
			kind: "taxi",
			x: 1450,
			z: -917
		}
	],
	traffic: Dl.traffic,
	peds: Dl.peds,
	night: Ol,
	parked: .3,
	ambience: "warehouse",
	palette: "paintworks"
}, Al = /* @__PURE__ */ t({ default: () => Yl }), jl = 4869980, Ml = 12166538, Nl = 11824127, Pl = 6160283, Fl = {
	warehouses: 0,
	sheds: 0,
	bars: 0,
	clubs: 0,
	murals: 0,
	muralCells: 0,
	barContainers: 0,
	movingLights: 0,
	tallest: 0
};
function Il(e, t, n = .4) {
	for (let r of t.murals || []) {
		let [i, a] = Io(t.body, r.side, .06);
		Fl.muralCells += va(Fo(e), i, a, n, t.h - .5, r.seed, qi(r.seed), {
			cells: r.cells,
			drips: !0
		}), Fl.murals++;
	}
}
function Ll(e, t, n, r, i, a = .1) {
	let [o, s] = Qa(t, n), c = Math.floor((s - o - 2) / (e.low ? 9 : 4.5)), l = Math.max(1, Math.floor((i - r) / 5));
	for (let i = 0; i < l; i++) for (let l = 0; l < c; l++) {
		let u = o + (l + .5) * (s - o) / c, d = r + i * 5 + 2.4;
		e.B.quad(...q(t, n, u, d, 3, 2, a), G, .8 + e.rnd() * .4), e.rnd() < .2 && e.L.quad(...q(t, n, u, d, 3, 2, a + .03), e.rnd() < .7 ? 16766346 : 9431295, .4 + e.rnd() * .5);
	}
}
var Rl = (e) => e.out === "w" ? "e" : "w", zl = (e) => e.face === "s" ? "n" : "s";
function Bl(e, t) {
	e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, 13222066);
}
function Vl(e, t) {
	let n = t.body, r = t.h, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2, o = n.x1 - n.x0, s = n.z1 - n.z0, c = t.face, l = c === "s" ? 1 : -1;
	Fl.warehouses++, Bl(e, t), e.B.box(i, r / 2, a, o, r, s, ll, { top: W });
	let u = r;
	if (e.rnd() < .6) {
		let t = 3 + Math.floor(e.rnd() * 3), i = s / t;
		for (let a = 0; a < t; a++) {
			let t = n.z0 + a * i, o = t + i, s = r + 2.6;
			e.B.hexa([
				[
					n.x0,
					r,
					t
				],
				[
					n.x1,
					r,
					t
				],
				[
					n.x1,
					r,
					o
				],
				[
					n.x0,
					r,
					o
				],
				[
					n.x0,
					s,
					t
				],
				[
					n.x1,
					s,
					t
				],
				[
					n.x1,
					r,
					o
				],
				[
					n.x0,
					r,
					o
				]
			], 9080985, { top: 10134445 }), e.B.quad([
				n.x1 - 1,
				r + .4,
				t - .03
			], [
				n.x0 + 1,
				r + .4,
				t - .03
			], [
				n.x0 + 1,
				s - .4,
				t - .03
			], [
				n.x1 - 1,
				s - .4,
				t - .03
			], G, 1.1);
		}
		u = r + 2.6;
	} else e.B.box(i + o / 5, r + 1.3, a, 3, 2.6, 3, 9072469, { taper: [.9, .9] });
	if (Fl.tallest = Math.max(Fl.tallest, u), Il(e, t), Ll(e, n, c, 5, r - .6), Ll(e, n, Rl(t), .4, r - .6), e.low || Ll(e, n, zl(t), .4, r - .6), e.B.quad(...q(n, c, i - o / 4, 2.25, 4, 4.5, .12), jl, .9), e.B.quad(...q(n, c, i + o / 4, 1.2, 1.2, 2.4, .12), U, .9), !e.low) {
		let s = t.out === "w" ? n.x1 + .7 : n.x0 - .7;
		for (let n = 0; n < Math.min(3, t.floors); n++) e.B.box(s, 2.5 + n * 5, a + (n % 2 ? 3 : -3), 1.3, .15, 7, jl, {
			bottom: !0,
			shift: [0, 0]
		});
		e.B.box(s, r / 2 - 1, a, .15, r - 2, .15, jl, { noTop: !0 });
		for (let t of [1.5, 3]) e.B.box(i + o / 4 + t, K + .55, (c === "s" ? n.z1 : n.z0) + l * .7, 1.1, 1.1, .9, [4025162, 3033707][+(t > 2)], { top: 2828344 });
	}
	e.solid(n.x0, n.x1, n.z0, n.z1, r);
}
function Hl(e, t) {
	let n = t.body, r = (n.x0 + n.x1) / 2, i = (n.z0 + n.z1) / 2, a = n.x1 - n.x0, o = n.z1 - n.z0, s = t.face, c = s === "s" ? 1 : -1;
	Fl.sheds++, Bl(e, t), Fl.tallest = Math.max(Fl.tallest, 10.6), e.B.box(r, 4, i, a, 8, o, ul, { noTop: !0 }), e.B.box(r, 9, i, a + .6, 2, o + .6, 10134445, {
		taper: [.05, 1],
		bottom: !0
	});
	for (let t = -1; t <= 1; t++) e.B.box(r, 10.1, i + t * o / 3.4, 1.2, 1, 1.2, 13159634);
	if (Il(e, t), e.B.quad(...q(n, s, r, 2.5, 6, 5, .12), jl, .85), e.B.quad(...q(n, s, r, 5.3, 7, .3, .14), 2828344), !e.low) for (let t = 0; t < 3; t++) e.B.box(r + 5.5 + (t === 2 ? 0 : t * 1.3), K + .3 + (t === 2 ? .6 : 0), (s === "s" ? n.z1 : n.z0) + c * 1.2, 1.2, .6, 1.2, 13150328);
	e.solid(n.x0, n.x1, n.z0, n.z1, 8);
}
function Ul(e, t) {
	let n = t.body, r = (n.x0 + n.x1) / 2, i = (n.z0 + n.z1) / 2, a = t.face, o = a === "s" ? 1 : -1, s = Oo.h, c = K, l = e.rnd, u = () => dl[Math.floor(l() * dl.length)];
	Fl.bars++, e.G.flat(t.x0, t.x1, t.z0, t.z1, c + .012, Ml);
	let d = (t, n, r, i) => {
		No(e, t, n, r, i, u()), Fl.barContainers++;
	};
	d(r, c, i - 5, !1), d(r, c, i + 5, !1), d(r - 4, c + s, i, !0), l() < .6 && d(r + 4, c + s, i, !0);
	let f = 2 * s;
	t.floors > 2 && (d(r - 4, c + 2 * s, i - 3, !1), f = 3 * s), Fl.tallest = Math.max(Fl.tallest, f + 1.1);
	for (let t of [i - 5, i + 5]) e.solid(r - 6.1, r + 6.1, t - 1.3, t + 1.3, s);
	let p = i + o * 5 + o * 1.9;
	if (e.B.box(r, c + 1.05, p, 8, .1, 1, U, { bottom: !0 }), e.B.quad(...q({
		x0: r - 6.1,
		x1: r + 6.1,
		z0: i + o * 5 - 1.3,
		z1: i + o * 5 + 1.3
	}, a, r, c + 1.75, 8, 1.2, .03), 1774896), e.L.quad(...q({
		x0: r - 6.1,
		x1: r + 6.1,
		z0: i + o * 5 - 1.3,
		z1: i + o * 5 + 1.3
	}, a, r, c + 1.75, 8, 1.2, .06), 16748496, .6), !e.low) for (let t = -3; t <= 3; t += 1.5) e.B.box(r + t, c + .38, p + o * .8, .4, .76, .4, 2828344);
	if (!e.low) {
		let n = c + f + .5;
		e.B.box(r - 4, n, i, t.floors > 2 ? 12.2 : 2.6, 1, t.floors > 2 ? .08 : 12.2, 2828344, { noTop: !0 });
	}
	let m = r + 7.4, h = i + o * 5, g = Ya[Math.floor(l() * 5)];
	e.B.box(m, c + 2.2, h, .2, 4.4, .2, 2828344), e.solid(m - .2, m + .2, h - .2, h + .2, 4), e.N.box(m - .9, c + 4.2, h, 1.8, .3, .14, g), e.N.box(m - 1.9, c + 4.2, h, .7, .9, .14, g, {
		taper: [.05, 1],
		rot: Math.PI / 2
	}), Qc(e, r - 6, i - 3.6, r + 6, i + 3.6, 4.4, 8);
}
var Wl = null, Gl = {};
function Kl(e, t, n, r) {
	if (!Wl) {
		let e = new B({ size: 128 });
		for (let t of [
			-.5,
			-.18,
			.18,
			.5
		]) {
			let n = Math.sin(t) * 46, r = Math.cos(t) * 46, i = (e) => {
				let i = e / 6 * Math.PI * 2;
				return [
					n + Math.cos(i) * 3.2 * Math.cos(t),
					r - Math.cos(i) * 3.2 * Math.sin(t),
					Math.sin(i) * 3.2
				];
			};
			for (let t = 0; t < 6; t++) e.tri([
				0,
				0,
				0
			], i(t), i(t + 1), 16777215);
		}
		Wl = e.build(), Wl.dispose = () => {};
	}
	let i = new dt(), a = [];
	[Nl, Pl].forEach((e, o) => {
		let s = Gl[e] || (Gl[e] = new Gn({
			color: e,
			transparent: !0,
			opacity: 0,
			blending: 2,
			depthWrite: !1,
			side: 2
		})), c = new rr(Wl, s);
		c.position.set(t + (o ? 5 : -5), n, r), c.frustumCulled = !1, c.userData.beams = 4, a.push(c), i.add(c);
	}), a[0].onBeforeRender = () => {
		let e = performance.now() / 1e3, t = Li().on || 0;
		Gl[Nl].opacity = Gl[Pl].opacity = .16 * t, a[0].rotation.set(Math.sin(e * .9) * .45, e * .35, 0), a[1].rotation.set(Math.sin(e * .9 + 2) * .45, -e * .35 + 1, 0);
	}, e.object(i), Fl.movingLights += 8;
}
function ql(e, t) {
	let n = t.body, r = t.h, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2, o = n.x1 - n.x0, s = n.z1 - n.z0, c = t.face, l = c === "s" ? 1 : -1;
	Fl.clubs++, Bl(e, t), Fl.tallest = Math.max(Fl.tallest, r + 5), e.B.box(i, r / 2, a, o, r, s, ul, { top: 3881286 }), e.B.box(i, r + .5, a, o + .2, 1, s + .2, 2828344, { noTop: !0 });
	for (let t of [-10, 10]) for (let n of [-6, 6]) e.B.box(i + t, r + 2.5, a + n, .4, 5, .4, jl, { noTop: !0 });
	for (let t of [-6, 6]) e.B.box(i, r + 5, a + t, 20.4, .5, .5, jl, { bottom: !0 });
	for (let t of [
		-10,
		0,
		10
	]) e.B.box(i + t, r + 5, a, .5, .5, 12, jl, { bottom: !0 });
	for (let t = 0; t < 8; t++) e.N.box(i - 8.75 + t % 4 * 5.8, r + 4.6, a + (t < 4 ? -6 : 6), .7, .5, .7, t % 2 ? Nl : Pl, { bottom: !0 });
	Kl(e, i, r + 4.6, a), Il(e, t, .2);
	let u = c === "s" ? n.z1 : n.z0;
	e.B.quad(...q(n, c, i, 1.5, 2.4, 3, .12), 1380157), to(e, {
		x0: i - 4,
		x1: i + 4,
		z0: n.z0,
		z1: n.z1
	}, c, 3.5, e.rnd() < .5 ? Nl : Pl, .2);
	for (let t = 0; t < 5; t++) e.B.box(i + 2 + t * 2.2, K + .5, u + l * 1.6, .14, 1, .14, 16761600), t && !e.low && e.B.box(i + .9 + t * 2.2, K + .85, u + l * 1.6, 2.2, .06, .06, 11680302, { bottom: !0 });
	if (!e.low) for (let t = 0; t < 4; t++) e.B.quad(...q(n, c, i - 5 - t * 1.5, 1.8, 1.2, 1.7, .1), [
		16727972,
		16773577,
		2746111,
		16752686
	][t]);
	e.solid(n.x0, n.x1, n.z0, n.z1, r);
}
var Jl = {
	W1: Vl,
	W2: Hl,
	W4: Ul,
	W5: ql
};
wo("paintworks", {
	lot: (e, t) => Jl[t.recipe](e, t),
	shellLot(e, t) {
		let n = t.body, r = t.h;
		n && (t.recipe === "W4" ? e.B.box((n.x0 + n.x1) / 2, 2.6, (n.z0 + n.z1) / 2, 12.2, 5.2, 12.6, t.wall, { top: 14211288 }) : e.B.box((n.x0 + n.x1) / 2, r / 2, (n.z0 + n.z1) / 2, n.x1 - n.x0, r, n.z1 - n.z0, t.wall, { top: t.roof }));
	},
	furniture(e, t) {
		if (t.row.strip) for (let n = t.x0 + 10; n <= t.x1 - 8; n += 26) e.decor("palm", n, K, (t.z0 + t.z1) / 2, n, .9);
		else if (!(t.edge || t.x1 - t.x0 < 40 || t.zone.hero.some((e) => e.x0 < t.x1 && e.x1 > t.x0 && e.z0 < t.z1 && e.z1 > t.z0))) {
			for (let [n, r] of [[t.z1 - 1, 1], [t.z0 + 1, -1]]) {
				for (let i of [
					t.x0 + 6,
					(t.x0 + t.x1) / 2,
					t.x1 - 6
				]) e.prop("lamp", i, K, n, r > 0 ? 0 : Math.PI);
				let i = t.x0 + 20 + (r > 0 ? 0 : 22);
				e.B.box(i, K + .4, n - r * .6, 1.2, .8, 1.2, 9072469, { top: 5917234 }), e.decor("palm", i, K + .6, n - r * .6, i + n, .75), e.solid(i - .6, i + .6, n - r * .6 - .6, n - r * .6 + .6, 1);
			}
			if (!e.low && e.rnd() < .5) {
				let n = t.x1 - 16, r = t.z1 - 1.7;
				e.B.box(n, K + .7, r, 3.6, 1.4, 1.7, 16761600, { taper: [1.15, 1] }), e.solid(n - 1.8, n + 1.8, r - .85, r + .85, 1.4);
			}
		}
	},
	street(e, t, n) {
		let r = t.axis === "ns", i = (t.ax + t.bx) / 2, a = (t.az + t.bz) / 2;
		if (!(i >= 1180 && a > -660 && a < -357) || t.len < 30) return;
		let o = (r ? t.az : t.ax) + (t.a ? n.nodes.get(t.a).half[r ? "ew" : "ns"] : 0) + 5, s = (r ? t.bz : t.bx) - (t.b ? n.nodes.get(t.b).half[r ? "ew" : "ns"] : 0) - 5, c = Math.ceil((s - o + 10) * (e.low ? 3 : 6) / 100), l = t.width / 2 + 4, u = r ? t.ax : t.az;
		for (let t = 0; t < c; t++) {
			let n = o + (s - o) * (t + .5) / c;
			r ? Qc(e, u - l, n, u + l, n) : Qc(e, n, u - l, n, u + l);
		}
	}
});
var Yl = Vo("paintworks", Fl), Xl = /* @__PURE__ */ t({
	COLOURS: () => su,
	CRANE_Z: () => au,
	QUAY: () => iu,
	RAIL_Z: () => ou,
	default: () => bu
}), Zl = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-"), Ql = 1800, $l = 3200, eu = -1600, tu = 200, nu = -1397, ru = 37, iu = {
	x1: 3024,
	z1: 130
}, au = [
	-450,
	-350,
	-250,
	-150
], ou = -277, su = [
	11883311,
	16761600,
	12534595,
	3033707,
	4025162,
	14737638
], cu = [
	[1812, "Bollard Street"],
	[1892, "Cleat Street"],
	[
		1972,
		"Dockside Avenue",
		"avenue",
		-1440
	],
	[
		2052,
		"Capstan Street",
		"street",
		nu,
		ru,
		[[-357, -197]]
	],
	[
		2132,
		"Windlass Street",
		"street",
		nu,
		ru,
		[[-357, -197], [-1317, -1157]]
	],
	[
		2212,
		"Keel Street",
		"street",
		nu,
		ru,
		[[-357, -197]]
	],
	[
		2292,
		"Container Road",
		"avenue",
		-1440
	],
	[
		2372,
		"Bilge Street",
		"street",
		nu,
		ru,
		[[-997, -677]]
	],
	[
		2452,
		"Davit Street",
		"street",
		nu,
		ru,
		[[-997, -677]]
	],
	[
		2532,
		"Rudder Street",
		"street",
		nu,
		ru,
		[[-997, -677]]
	],
	[
		2612,
		"Drydock Road",
		"avenue",
		-1440
	],
	[2692, "Hawser Street"],
	[
		2772,
		"Scupper Street",
		"street",
		-997,
		-677
	],
	[
		2852,
		"Transom Street",
		"street",
		-997,
		-677
	],
	[
		2932,
		"Breakwater Road",
		"avenue",
		-997
	]
], lu = [
	[
		ru,
		"Gunwale Road",
		"street",
		1812,
		2932
	],
	[
		-197,
		"Driftwood Street",
		"street",
		1812,
		2932
	],
	[
		-357,
		"Flamingo Avenue",
		"avenue",
		Ql,
		2932
	],
	[
		-437,
		"First Street",
		"street",
		Ql,
		2692
	],
	[
		-517,
		"Second Street",
		"street",
		Ql,
		2692
	],
	[
		-597,
		"Third Street",
		"street",
		Ql,
		2692
	],
	[
		-677,
		"Commerce Way",
		"avenue",
		Ql,
		2932
	],
	[
		-757,
		"Fifth Street",
		"street",
		Ql,
		2932,
		[[2292, 2612]]
	],
	[
		-837,
		"Sixth Street",
		"street",
		Ql,
		2932,
		[[2292, 2612]]
	],
	[
		-917,
		"Seventh Street",
		"street",
		Ql,
		2932,
		[[2292, 2612]]
	],
	[
		-997,
		"Tower Way",
		"avenue",
		Ql,
		2932
	],
	[
		-1077,
		"Ninth Street",
		"street",
		Ql,
		2692
	],
	[
		-1157,
		"Tenth Street",
		"street",
		Ql,
		2692
	],
	[
		-1237,
		"Eleventh Street",
		"street",
		Ql,
		2692,
		[[2052, 2212]]
	],
	[
		-1317,
		"Union Avenue",
		"avenue",
		1800,
		3e3
	],
	[
		nu,
		"Thirteenth Street",
		"street",
		1800,
		2932
	]
], uu = [];
for (let [e, t, n = "street", r = nu, i = ru, a = []] of cu) uu.push({
	id: Zl(t),
	pid: "rustwater:" + Zl(t),
	name: t,
	axis: "ns",
	at: e,
	from: r,
	to: i,
	kind: n,
	closed: a
});
for (let [e, t, n, r, i, a = []] of lu) uu.push({
	id: Zl(t),
	pid: "rustwater:" + Zl(t),
	name: t,
	axis: "ew",
	at: e,
	from: r,
	to: i,
	kind: n,
	closed: a
});
var du = (e) => e === "avenue" ? 11 : 7, fu = [
	{
		id: "A",
		z0: -190,
		z1: 30
	},
	{
		id: "B2",
		z0: -270,
		z1: -204
	},
	{
		id: "B1",
		z0: -346,
		z1: -284
	}
];
for (let e = 2; e < lu.length - 1; e++) fu.push({
	id: "R" + e,
	z0: lu[e + 1][0] + du(lu[e + 1][2]),
	z1: lu[e][0] - du(lu[e][2])
});
fu.push({
	id: "N",
	z0: -1440,
	z1: -1404,
	strip: !0
});
var pu = [
	{
		id: "yard-north",
		kind: "stacks",
		x0: 2699,
		x1: 2921,
		z0: -666,
		z1: -368
	},
	{
		id: "yard-south",
		kind: "stacks",
		x0: 2699,
		x1: 2921,
		z0: -346,
		z1: -204
	},
	{
		id: "tank-farm",
		kind: "flat",
		x0: 2303,
		x1: 2601,
		z0: -986,
		z1: -688,
		ground: 9407638
	},
	{
		id: "rail-yard",
		kind: "rail",
		x0: 1983,
		x1: 2281,
		z0: -346,
		z1: -204,
		ground: 7038560
	},
	{
		id: "scrapyard",
		kind: "flat",
		x0: 2059,
		x1: 2205,
		z0: -1306,
		z1: -1164,
		ground: 8022616
	},
	{
		id: "shipyard",
		kind: "flat",
		x0: 2699,
		x1: 3024,
		z0: -1306,
		z1: -1008,
		ground: 9407638
	}
], mu = {
	x0: 2943,
	x1: iu.x1,
	z0: -986,
	z1: 44
}, hu = [];
for (let e of pu) {
	if (e.kind !== "stacks") {
		hu.push(e);
		continue;
	}
	let t = Math.floor((e.x0 + 3200) / 160), n = Math.floor((e.x1 - .01 + 3200) / 160), r = Math.floor((e.z0 + 3520) / 160), i = Math.floor((e.z1 - .01 + 3520) / 160);
	for (let a = t; a <= n; a++) for (let t = r; t <= i; t++) hu.push({
		id: `${e.id}:${a}:${t}`,
		kind: "stacks",
		yard: e.id,
		ox: e.x0,
		oz: e.z0,
		yx1: e.x1,
		yz1: e.z1,
		x0: Math.max(e.x0, a * 160 - 3200),
		x1: Math.min(e.x1, a * 160 - 3040),
		z0: Math.max(e.z0, t * 160 - 3520),
		z1: Math.min(e.z1, t * 160 - 3360)
	});
}
var gu = [
	...au.map((e, t) => ({
		id: "gantry-crane",
		key: "crane" + (t + 1),
		x0: 2885,
		x1: 3085,
		z0: e - 14,
		z1: e + 14,
		h: 70,
		zc: e,
		n: t + 1,
		body: 16761600,
		hood: "the-gantries"
	})),
	{
		id: "ship-berth",
		x0: 3030,
		x1: 3070,
		z0: -450,
		z1: -150,
		h: 44,
		body: 3033707,
		hood: "the-gantries"
	},
	{
		id: "cruise-terminal",
		x0: 2303,
		x1: 2700,
		z0: 50,
		z1: 170,
		h: 52,
		body: 14737638,
		hood: "cruise-basin"
	}
], _u = [
	{
		id: "the-gantries",
		name: "The Gantries",
		x0: 2600,
		x1: $l,
		z0: -900,
		z1: -100,
		shares: {
			R1: 60,
			R2: 40
		}
	},
	{
		id: "tank-farm",
		name: "Tank Farm",
		x0: Ql,
		x1: 2600,
		z0: -900,
		z1: -100,
		shares: {
			R2: 90,
			R1: 10
		}
	},
	{
		id: "scrap-mile",
		name: "Scrap Mile",
		x0: Ql,
		x1: 2600,
		z0: eu,
		z1: -900,
		shares: {
			R2: 70,
			R1: 30
		}
	},
	{
		id: "drydock",
		name: "Drydock",
		x0: 2600,
		x1: $l,
		z0: eu,
		z1: -900,
		shares: {
			R2: 90,
			R1: 10
		}
	},
	{
		id: "cruise-basin",
		name: "Cruise Basin",
		x0: Ql,
		x1: $l,
		z0: -100,
		z1: tu,
		shares: {
			R2: 85,
			R1: 15
		}
	}
], vu = {
	R1: {
		recipe: "container-stack",
		floors: [1, 5]
	},
	R2: {
		recipe: "warehouse",
		preset: "transit-shed",
		floors: [1, 1]
	}
};
function yu(e, t, { rng: n, hash2: r, overlap: i }) {
	if (e.edge || e.row.strip || e.x1 - e.x0 < 30 || pu.some((t) => i(t, e))) return;
	let a = {
		x0: e.x0 + 4,
		x1: e.x1 - 4,
		z0: e.z0 + 4,
		z1: e.z1 - 4
	}, o = a.z1 - a.z0 > 150 ? 3 : 1, s = (a.z1 - a.z0 - (o - 1) * 6) / o;
	for (let c = 0; c < o; c++) {
		let o = {
			...a,
			z0: a.z0 + c * (s + 6),
			z1: a.z0 + c * (s + 6) + s
		};
		if (gu.some((e) => i(e, o))) continue;
		let l = (o.x0 + o.x1) / 2, u = (o.z0 + o.z1) / 2, d = r(e.seed, c, 3), f = n(d), p = _u.find((e) => l >= e.x0 && l < e.x1 && u >= e.z0 && u < e.z1) || _u[0], m = f() * 100 < p.shares.R1 ? "R1" : "R2", h = o.x1 - o.x0, g = o.z1 - o.z0, _ = {
			id: `${e.id}:${c}`,
			zone: "rustwater",
			hood: p.id,
			block: e.id,
			recipe: m,
			kit: vu[m],
			...o,
			face: "s",
			sides: {
				n: !0,
				s: !0,
				e: !0,
				w: !0
			},
			seed: d,
			floors: 1
		};
		if (m === "R2") {
			let e = g - h > 4 ? !1 : f() < .5, t = Math.min(e ? 60 : 40, h - 2), n = Math.min(e ? 40 : 60, g - 2);
			Object.assign(_, {
				h: 13,
				wall: 11883311,
				body: {
					x0: l - t / 2,
					x1: l + t / 2,
					z0: u - n / 2,
					z1: u + n / 2
				}
			});
		} else Object.assign(_, {
			h: 13,
			wall: su[Math.floor(f() * 6)],
			body: {
				x0: o.x0 + 1,
				x1: o.x1 - 1,
				z0: o.z0 + 1,
				z1: o.z1 - 1
			}
		});
		t(_);
	}
}
var bu = {
	id: "rustwater",
	name: "Rustwater",
	bounds: {
		x0: Ql,
		x1: $l,
		z0: eu,
		z1: tu
	},
	seed: 3150,
	roads: { lines: uu },
	lots: "grid",
	generator: "rustwater",
	quay: iu,
	rows: fu,
	kit: vu,
	hoods: _u,
	split: yu,
	hero: gu,
	reserved: hu,
	yards: pu,
	apron: mu,
	plazas: [...pu, mu].map(({ x0: e, x1: t, z0: n, z1: r }) => ({
		x0: e,
		x1: t,
		z0: n,
		z1: r
	})),
	landmarks: {
		"gantry-cranes": {
			x: 2900,
			z: -300,
			w: 200,
			d: 324,
			h: 70,
			level: 0
		},
		"ship-berth": {
			x: 3050,
			z: -300,
			w: 40,
			d: 300,
			h: 44,
			level: 0
		},
		"cruise-terminal": {
			x: 2500,
			z: 100,
			w: 280,
			d: 100,
			h: 52,
			level: 0
		}
	},
	places: [
		{
			id: "park-and-sons-port",
			kind: "garage",
			x: 2020,
			z: -470
		},
		{
			id: "rustwater-warehouse",
			kind: "property",
			x: 1930,
			z: -557
		},
		{
			id: "storm-mart-rustwater",
			kind: "shop:storm",
			x: 1850,
			z: -400
		},
		{
			id: "scrapyard-pad",
			kind: "scrap",
			x: 2190,
			z: -1200
		},
		{
			id: "port-boat-steps",
			kind: "marina",
			x: 2760,
			z: 126
		},
		{
			id: "bay-cab-rank-cruise",
			kind: "taxi",
			x: 2500,
			z: 56
		}
	],
	traffic: {
		hogfish: 5,
		mullet: 3,
		fiddler: 3,
		pompano: 2,
		tarpon: 1,
		osprey: 1,
		whelk: 1,
		remora: 1,
		taxi: 1
	},
	peds: {
		"dock worker": 6,
		"office worker": 1,
		tourist: 1,
		retiree: 1
	},
	ambience: "port",
	palette: "rustwater"
}, xu = /* @__PURE__ */ t({
	default: () => Au,
	stats: () => Ou
}), Su = 16761600, Cu = 2367787, wu = 5985888, Tu = 2900, Eu = 3012, Du = 3085, Ou = {
	cranes: 0,
	top: 70,
	tops: {},
	lowestOverRoad: 14
};
function ku(e, t, n) {
	for (let r of [Tu, Eu]) {
		for (let i of [-12, 12]) e.box(r, 28 + n, t + i, 2 - n, 56 - n, 2 - n, Su);
		e.box(r, 15, t, 1.6 - n, 2, 22, Su), e.box(r, 54, t, 1.6 - n, 2.4, 22, Su);
	}
	for (let r of [-12, 12]) e.box(2956, 53.5, t + r, 110, 2.4, 1.4 - n, Su);
	e.box(2985, 59, t, 200, 6 - n, 4 - n, Su);
	for (let n of [-1, 1]) e.box(Eu + n * 9, 66, t, 1.6, 8, 1.6, Su, { shift: [-n * 9, 0] });
	e.box(Eu, 62.6, t, 22, 1.2, 5, wu);
}
var Au = {
	id: "gantry-crane",
	skyline: !0,
	stats: Ou,
	build(e, t) {
		let n = t.zc, r = e.B, i = 3046 + t.n % 2 * 12;
		Ou.cranes++, Ou.tops[t.n] = 70, ku(Eo(e), n, 0);
		for (let t of [Tu, Eu]) for (let i of [-12, 12]) {
			for (let e of [.9, 2.7]) r.box(t, K + e, n + i, 2.08, .9, 2.08, Cu, { noTop: !0 });
			e.solid(t - 1.1, t + 1.1, n + i - 1.1, n + i + 1.1, 56);
		}
		for (let [e, t] of [[2889, 62], [3081, 62]]) {
			let i = .3, a = e < Eu ? [e, t] : [Eu, 69.6], o = e < Eu ? [Eu, 69.6] : [e, t];
			r.hexa([
				[
					a[0],
					a[1] - i,
					n - i
				],
				[
					o[0],
					o[1] - i,
					n - i
				],
				[
					o[0],
					o[1] - i,
					n + i
				],
				[
					a[0],
					a[1] - i,
					n + i
				],
				[
					a[0],
					a[1] + i,
					n - i
				],
				[
					o[0],
					o[1] + i,
					n - i
				],
				[
					o[0],
					o[1] + i,
					n + i
				],
				[
					a[0],
					a[1] + i,
					n + i
				]
			], wu, { bottom: !0 });
		}
		if (r.box(i, 54.5, n, 6, 3, 6, wu, { bottom: !0 }), r.box(i - 4.5, 53.4, n, 3, 2.6, 3, 14737638, { bottom: !0 }), r.quad([
			i - 6.02,
			52.6,
			n - 1.2
		], [
			i - 6.02,
			52.6,
			n + 1.2
		], [
			i - 6.02,
			54.2,
			n + 1.2
		], [
			i - 6.02,
			54.2,
			n - 1.2
		], 3033707), !e.low) for (let e of [-2.5, 2.5]) for (let t of [-5, 5]) r.box(i + e, 43.5, n + t, .12, 19, .12, Cu, { noTop: !0 });
		r.box(i, 33.6, n, 3, .8, 12.6, Su, { bottom: !0 }), r.box(i, 31.9, n, 2.6, 2.6, 12.2, [
			11883311,
			3033707,
			4025162,
			12534595
		][t.n - 1], { bottom: !0 });
		for (let t = 2895; t < Du; t += e.low ? 45 : 22.5) e.N.box(t, 55.8, n, 1.4, .3, 1.4, 16773836), e.L.flat(t - 9, t + 9, n - 9, n + 9, t > 3024 ? 24.6 : K + .08, 16751164, .12);
		e.N.box(Eu, 70.3, n, .9, .9, .9, 16734810);
	},
	shell(e, t, { inset: n = 0 } = {}) {
		ku(Do(e), t.zc, n ? .3 : 0);
	}
}, ju = /* @__PURE__ */ t({
	default: () => ld,
	mast: () => Uu
}), Mu = 4538698, Nu = 9407638, Pu = 11883311, Fu = 16761600, Iu = 2367787, Lu = 16751164, Ru = 7301752, zu = 5985888, Bu = 4865848, Vu = (e, t) => e.x0 < t.x1 && e.x1 > t.x0 && e.z0 < t.z1 && e.z1 > t.z0, Hu = {
	stacks: 0,
	sheds: 0,
	masts: 0,
	wagons: 0,
	bollards: 0,
	lampColours: [Lu],
	containerColours: su.slice(),
	crane: Ou
};
function Uu(e, t, n, r = K) {
	Hu.masts++, e.B.box(t, r + 9, n, .5, 18, .5, 2828344, { noTop: !0 }), e.B.box(t, r + 18.1, n, 3.4, .3, 3.4, 2828344, { bottom: !0 });
	for (let [i, a] of [
		[-1.3, -1.3],
		[1.3, -1.3],
		[-1.3, 1.3],
		[1.3, 1.3]
	]) e.N.box(t + i, r + 17.8, n + a, .9, .3, .9, Lu);
	for (let [i, a] of [
		[16, .1],
		[10, .12],
		[5, .16]
	]) e.L.flat(t - i, t + i, n - i, n + i, r + .07, Lu, a);
	e.solid(t - .4, t + .4, n - .4, n + .4, 18);
}
var Wu = Oo.l + .4, Gu = Oo.w + .3, Ku = 3 * Wu + 6, qu = 4 * Gu + 6;
function Ju(e, t, n, r, i, a) {
	let o = e.rnd, s = e.low ? 3 : 5, c = Math.ceil((n.x0 - r) / Ku), l = Math.ceil((n.z0 - i) / qu);
	for (let u = c; r + u * Ku < n.x1; u++) for (let c = l; i + c * qu < n.z1; c++) {
		let n = r + u * Ku, l = i + c * qu, d = n + 3 * Wu - .4, f = l + 4 * Gu - .3;
		if (d > t.x1 || f > t.z1 || l < -271 && f > -283 && n < 2900) continue;
		a && u % 2 == 0 && c % 4 == 0 && Uu(e, n - 3, l - 3);
		let p = 0;
		for (let t = 0; t < 3; t++) for (let r = 0; r < 4; r++) {
			let i = o() < .1 ? 0 : 1 + Math.floor(o() * o() * 5.99);
			e.low && (t + r + u + c) % 2 && i > 1 && (i = 1), i = Math.min(i, s), p = Math.max(p, i);
			for (let a = 0; a < i; a++) No(e, n + t * Wu + Oo.l / 2, K + a * Oo.h, l + r * Gu + Oo.w / 2, !1, su[Math.floor(o() * 6)]);
		}
		p && (Hu.stacks++, e.solid(n, d, l, f, p * Oo.h));
	}
}
var Yu = (e, t, n, r) => {
	for (let i = Math.ceil((n.x0 - r) / Ku); r + i * Ku < n.x1; i++) {
		let a = r + i * Ku, o = a + 3 * Wu - .4;
		o <= t && n.z1 - n.z0 > 8 && e.B.box((a + o) / 2, 3.9, (n.z0 + n.z1) / 2, o - a, 7.8, n.z1 - n.z0 - 6, su[(i + 6) % 6], { top: su[(i + 9) % 6] });
	}
};
function Xu(e, t) {
	Hu.sheds++;
	let n = t.body, r = (n.x0 + n.x1) / 2, i = (n.z0 + n.z1) / 2, a = n.x1 - n.x0, o = n.z1 - n.z0, s = a >= o;
	e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, Nu), e.B.box(r, 5, i, a, 10, o, Pu, { noTop: !0 }), e.B.box(r, 11.5, i, a + .8, 3, o + .8, Ru, {
		taper: s ? [1, .06] : [.06, 1],
		bottom: !0
	}), e.B.box(r, 13.3, i, s ? a * .7 : 1.6, .7, s ? 1.6 : o * .7, zu), e.B.box(r, 1, i, a + .3, 2, o + .3, Fu, { noTop: !0 });
	let c = e.low ? 6 : 3;
	for (let t of [
		"s",
		"n",
		"e",
		"w"
	]) {
		let [r, i] = Qa(n, t);
		for (let a = r + 1.2; a < i - .6; a += c) e.B.quad(...q(n, t, a, 1, 1.1, 2, .17).map((e, n) => n > 1 ? [
			e[0] + (t === "s" || t === "n" ? .9 : 0),
			e[1],
			e[2] + (t === "e" || t === "w" ? .9 : 0)
		] : e), Iu);
		if (!e.low) for (let a = r + 2.5; a < i - 2; a += 5) e.B.quad(...q(n, t, a, 6, .25, 7.6, .03), Pu, .8);
	}
	let l = s ? "s" : "e", [u, d] = Qa(n, l), f = (d - u) / 4;
	Y(e, J(n, l, (u + d) / 2, (d - u) / 2 - 2, 3), 0, 1.2, Nu);
	for (let t = 0; t < 4; t++) {
		let r = u + (t + .5) * f;
		e.B.quad(...q(n, l, r, 3.45, 4, 4.5, .2), t % 2 ? 9407638 : Iu);
		let i = J(n, l, r, .4, .5);
		e.N.box((i.x0 + i.x1) / 2, 6.3, (i.z0 + i.z1) / 2, i.x1 - i.x0, .25, i.z1 - i.z0, Lu), e.L.quad(...q(n, l, r, 3.45, 4, 4.5, .24), Lu, .22);
	}
	let p = J(n, l, (u + d) / 2, (d - u) / 2 - 2, 3);
	e.solid(n.x0 - .15, n.x1 + .15, n.z0 - .15, n.z1 + .15, 13), e.solid(p.x0, p.x1, p.z0, p.z1, 1.2);
}
function Zu(e, t, n = 10134445) {
	for (let [r, i, a, o] of [
		[
			t.x0,
			t.x1,
			t.z0,
			t.z0
		],
		[
			t.x0,
			t.x1,
			t.z1,
			t.z1
		],
		[
			t.x0,
			t.x0,
			t.z0,
			t.z1
		],
		[
			t.x1,
			t.x1,
			t.z0,
			t.z1
		]
	]) {
		let t = r === i, s = t ? a : r, c = t ? o : i, l = (s + c) / 2;
		for (let [i, o] of [[s, l - 6], [l + 6, c]]) t ? (e.B.box(r, K + 1.5, (i + o) / 2, .12, 3, o - i, n, { bottom: !0 }), e.solid(r - .2, r + .2, i, o, 3)) : (e.B.box((i + o) / 2, K + 1.5, a, o - i, 3, .12, n, { bottom: !0 }), e.solid(i, o, a - .2, a + .2, 3));
		for (let n of [l - 6, l + 6]) e.B.box(t ? r : n, K + 1.7, t ? n : a, .5, 3.4, .5, Fu);
	}
}
function Qu(e, t, n) {
	Hu.wagons++, e.B.box(t, K + .75, n, 14, .5, 2.8, zu, { bottom: !0 });
	for (let r of [-5, 5]) e.B.box(t + r, K + .3, n, 2.4, .5, 2, Iu);
	No(e, t, K + 1, n, !1, su[Math.floor(e.rnd() * 6)]), e.solid(t - 7, t + 7, n - 1.4, n + 1.4, 3.6);
}
var $u = [
	-330,
	-315,
	-300,
	-254,
	-239,
	-224
];
function ed(e, t) {
	if (e.rnd = pi(t.x0 * 31 + t.z0 * 17 | 0), t.kind === "stacks") Ju(e, {
		x1: Math.min(t.yx1, 2893),
		z1: t.yz1
	}, t, t.ox + 4, t.oz + 4, !0);
	else if (e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, t.ground), Zu(e, t), t.kind === "rail") {
		for (let n of $u) for (let r = t.x0 + 30 + e.rnd() * 40; r < t.x1 - 30; r += 16 + (e.rnd() < .35 ? 0 : 50 + e.rnd() * 60)) (!e.low || e.rnd() < .6) && Qu(e, r, n);
		for (let n of [
			t.x0 + 40,
			(t.x0 + t.x1) / 2,
			t.x1 - 40
		]) Uu(e, n, ou - 8);
	} else for (let n = t.x0 + 30; n < t.x1 - 20; n += 80) for (let r = t.z0 + 30; r < t.z1 - 20; r += 80) Uu(e, n, r);
}
function td(e, t, n, r, i, a) {
	if (e.M.flat(t, n, r - 1.6, r + 1.6, a + .03, 5920078), i) for (let i = Math.ceil(t / 2.4) * 2.4; i < n; i += 2.4) e.M.flat(i - .35, i + .35, r - 1.25, r + 1.25, a + .05, Bu);
	for (let i of [-.72, .72]) e.B.box((t + n) / 2, .14, r + i, n - t, .28, .14, 12170416);
}
function nd(e, t, n, r) {
	let i = r.zone("rustwater"), a = Math.min(t.x1, iu.x1), o = Math.min(t.z1, iu.z1);
	if (a <= t.x0 || o <= t.z0) return;
	if (t.z0 < 44 && e.G.flat(t.x0, a, t.z0, Math.min(o, 44), 0, Mu), o > 44 && e.G.flat(t.x0, a, Math.max(t.z0, 44), o, 0, Nu), t.x1 > iu.x1 && t.x0 <= iu.x1) {
		let n = iu.x1;
		e.B.quad([
			n,
			-6,
			t.z0
		], [
			n,
			-6,
			o
		], [
			n,
			.2,
			o
		], [
			n,
			.2,
			t.z0
		], 7301752), e.B.box(n - .3, .3, (t.z0 + o) / 2, .6, .6, o - t.z0, Fu), e.solid(n - .7, n + .3, t.z0, o, 1.2);
		for (let r = Math.ceil(t.z0 / 20) * 20; r < o; r += 20) e.B.box(n - 1.4, .55, r, .6, .9, .6, Iu, { taper: [1.4, 1.4] }), Hu.bollards++;
	}
	if (t.z1 > iu.z1 && t.z0 <= iu.z1) {
		let n = iu.z1;
		e.B.quad([
			t.x0,
			-6,
			n
		], [
			a,
			-6,
			n
		], [
			a,
			.2,
			n
		], [
			t.x0,
			.2,
			n
		], 7301752), e.B.box((t.x0 + a) / 2, .3, n - .3, a - t.x0, .6, .6, Fu), e.solid(t.x0, a, n - .7, n + .3, 1.2);
		for (let r = Math.ceil(t.x0 / 20) * 20; r < a; r += 20) e.B.box(r, .55, n - 1.4, .6, .9, .6, Iu, { taper: [1.4, 1.4] }), Hu.bollards++;
	}
	if (t.z0 < -277 && t.z1 > -277) {
		let n = Math.max(t.x0, 1800), r = Math.min(t.x1, 2900);
		r > n && td(e, n, r, ou, !e.low, 0), t.x0 < 2900 && t.x1 >= 2900 && (e.B.box(2901, K + .9, ou, 1.2, 1.8, 3.2, Fu), e.B.box(2900.3, K + 1.1, ou, .3, .6, 3.4, 12534595), e.solid(2900, 2902, ou - 1.7, ou + 1.7, 2));
	}
	let s = i.yards.find((e) => e.kind === "rail");
	if (Vu(s, t)) {
		for (let n of $u) if (n > t.z0 && n < t.z1) {
			let r = Math.max(t.x0, s.x0 + 12), i = Math.min(t.x1, s.x1 - 12);
			i > r && td(e, r, i, n, !1, K);
		}
	}
}
var rd = (e) => e.zone.yards;
function id(e) {
	return e.x0 >= iu.x1 || rd(e).some((t) => Vu(t, e)) || Vu(e.zone.apron, e) ? null : e.x1 > iu.x1 ? {
		x0: e.x0,
		x1: iu.x1,
		z0: e.z0,
		z1: e.z1
	} : e;
}
function ad(e, t) {
	if (!id(t) || t.x1 - t.x0 < 30) return;
	let n = e.low ? [(t.x0 + t.x1) / 2] : [t.x0 + 12, Math.min(t.x1, iu.x1) - 12];
	for (let r of n) Uu(e, r, t.z1 - 1.2), t.z1 - t.z0 > 40 && Uu(e, r + (e.low ? 0 : 6), t.z0 + 1.2);
	if (!e.low) for (let n of [t.x0 + .8, t.x1 - .8]) for (let r of [t.z0 + .8, t.z1 - .8]) n < iu.x1 && (e.B.box(n, K + .45, r, .3, .9, .3, Fu), e.B.box(n, K + .45, r, .34, .25, .34, Iu), Hu.bollards++);
}
function od(e, t, n, r) {
	if (t.roadId !== "breakwater-road" && t.roadId !== "gunwale-road") return;
	let i = t.axis === "ns", a = i ? t.az : t.ax, o = i ? t.bz : t.bx;
	for (let t = a + 20; t < o - 10; t += 60) i ? Uu(e, 2946, t, K) : Uu(e, t, 48, 0);
}
function sd(e, t) {
	if (t.reserved) return ed(e, t);
	t.recipe === "R1" ? (e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, Nu), Ju(e, t.body, t.body, t.body.x0 + .5, t.body.z0 + .5, !1)) : Xu(e, t);
}
function cd(e, t) {
	if (t.reserved) {
		t.kind === "stacks" ? Yu(e, Math.min(t.yx1, 2893), t, t.ox + 4) : e.B.flat(t.x0, t.x1, t.z0, t.z1, K + .02, t.ground);
		return;
	}
	let n = t.body;
	t.recipe === "R1" ? Yu(e, n.x1, n, n.x0 + .5) : e.B.box((n.x0 + n.x1) / 2, 5.75, (n.z0 + n.z1) / 2, n.x1 - n.x0, 11.5, n.z1 - n.z0, Pu, { top: Ru });
}
wo("rustwater", {
	asphalt: Mu,
	pave: 12170416,
	ground: nd,
	blockRect: id,
	lot: sd,
	furniture: ad,
	street: od,
	shellLot: cd
});
var ld = Vo("rustwater", Hu), ud = /* @__PURE__ */ t({ default: () => Td }), dd = 3881286, fd = 15916464, pd = 14862744, md = 15918768, hd = 14077380, gd = .02, _d = (e) => e > 72 ? .02 - (e - 72) / 28 : .02, vd = (e, t) => io(e, t.body, t.floors - 1, t.sides, e.rnd() < .6, {
	col: t.wall,
	lit: .3,
	plain: e.low
});
function yd(e, t) {
	let n = t.body, r = t.h, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2, o = n.x1 - n.x0, s = n.z1 - n.z0, c = Za(e, Ya), l = t.face, u = r - 6.4;
	e.B.box(i, u / 2, a, o, u, s, t.wall, { top: W }), e.B.box(i, 1.75, a, o + .3, 3.5, s + .3, U, { top: U }), e.B.box(i, u + 1.6, a, o - 6, 3.2, s - 6, t.wall, { top: W }), e.B.box(i, u + 4.8, a, o - 12, 3.2, s - 12, t.wall, { top: W }), e.B.box(i, r + .2, a, o - 11.6, .5, s - 11.6, U, { top: W });
	let d = {
		x0: n.x0,
		x1: n.x1,
		z0: n.z0,
		z1: n.z1
	};
	for (let r of [
		"s",
		"n",
		"e",
		"w"
	]) r !== l && e.low || eo(e, d, r, 3.6, u - .2, 3.2, 1.5, .05, r === l ? .6 : .3), t.sides[r] && ($a(e, n, r, .5, 3.1, 4.2, 2.6, 3.4, 2.2, .19, .75), to(e, n, r, 3.62, c));
	let f = l === "s" ? n.z1 + .6 : n.z0 - .6;
	if (!e.low) for (let t = 6.8; t < u - 1; t += 3.2) e.B.box(i, t, f, o - 1, .16, 1.2, U, { bottom: !0 });
	let p = J(n, l, n.x0 + o * .2, 1.1, .7);
	Y(e, p, 3.5, r + 6, U);
	let m = J(p, l, n.x0 + o * .2, .1, .1);
	e.N.box((m.x0 + m.x1) / 2, (r + 9.5) / 2, (m.z0 + m.z1) / 2, m.x1 - m.x0, r + 2.5, m.z1 - m.z0, c), Y(e, J(n, l, i + 4, 6, 3.6), 3.2, 3.5, c === 16752686 ? 16727972 : 16643818, { bottom: !0 }), no(e, {
		...n,
		x0: i - 2,
		x1: i + 10
	}, l, Za(e, [
		6,
		10,
		6,
		2
	]), 5.2), e.solid(n.x0 - .15, n.x1 + .15, n.z0 - .15, n.z1 + .15, r);
}
function bd(e, t) {
	let n = t.body, r = t.face === "s", i = e.rnd, a = r ? {
		x0: n.x0,
		x1: n.x1,
		z0: n.z0,
		z1: n.z0 + 8
	} : {
		x0: n.x0,
		x1: n.x1,
		z0: n.z1 - 8,
		z1: n.z1
	}, o = r ? n.z0 + 8 : n.z0, s = r ? n.z1 : n.z1 - 8, c = [{
		x0: n.x0,
		x1: n.x0 + 8,
		z0: o,
		z1: s
	}, {
		x0: n.x1 - 8,
		x1: n.x1,
		z0: o,
		z1: s
	}], l = [
		[a, r ? "s" : "n"],
		[c[0], "e"],
		[c[1], "w"]
	];
	for (let [n, r] of l) {
		Y(e, n, 0, 6, t.wall, { top: W }), e.B.box((n.x0 + n.x1) / 2, 6.3, (n.z0 + n.z1) / 2, n.x1 - n.x0 + 1.2, .6, n.z1 - n.z0 + 1.2, U, {
			top: W,
			bottom: !0
		});
		let [a, o] = Qa(n, r), s = Math.floor((o - a - 1) / 4), c = (o - a) / s;
		for (let t = 0; t < 2; t++) for (let o = 0; o < s; o++) {
			let s = a + (o + .5) * c, l = t * 3;
			e.B.quad(...q(n, r, s - .9, l + 1.1, 1, 2.2, .05), (o + t) % 2 ? 9429967 : 16752309), e.low && t !== 0 || e.B.quad(...q(n, r, s + .8, l + 1.5, 1.6, 1.2, .05), G, .85 + i() * .3), i() < .3 && e.L.quad(...q(n, r, s + .8, l + 1.5, 1.6, 1.2, .08), 16766346, .5 + i() * .5);
		}
		Y(e, J(n, r, (a + o) / 2, (o - a) / 2, 1.4), 2.92, 3.06, U, { bottom: !0 }), e.solid(n.x0, n.x1, n.z0, n.z1, 6);
	}
	let u = (n.x0 + n.x1) / 2, d = (o + s) / 2 + (r ? -1 : 1) * 2;
	e.G.flat(n.x0 + 8, n.x1 - 8, o, s, K + .012, 15317410), e.B.box(u, K + .1, d, 12.8, .2, 6.8, U, { top: 3524808 }), e.L.flat(u - 6, u + 6, d - 3, d + 3, K + .23, 2746111, .5), e.decor("umbrella", u - 8.5, K, d + 1, 0, 1), e.decor("umbrella", u + 8.5, K, d - 1, 1, 1);
	let f = r ? n.z1 + 1.6 : n.z0 - 1.6, p = n.x0 + 3;
	e.B.box(p, 4.5, f, .3, 9, .3, 2828344);
	let m = {
		x0: p - 3.3,
		x1: p + 3.3,
		z0: f - .22,
		z1: f + .22
	};
	Y(e, m, 7.2, 9, Xa, { bottom: !0 });
	for (let t of ["s", "n"]) e.S.quad(...q(m, t, p, 8.1, 6.4, 1.6, .02), 16777215, 1, Ti(3));
	e.N.box(p, 9.1, f, 6.8, .14, .5, 16752686), e.solid(p - .3, p + .3, f - .3, f + .3, 9);
}
function xd(e, t) {
	let n = t.body, r = t.face, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2;
	e.G.flat(t.x0 + .5, t.x1 - .5, t.z0 + .5, t.z1 - .5, K + .012, fd), e.B.box(i, 1.5, a, 8, 3, 6, t.wall), e.B.box(i, 3.6, a, 9, 1.2, 7, 2733798, {
		taper: [.45, .3],
		bottom: !0
	}), e.B.quad(...q(n, r, i - 1.2, 1.75, 3, 1.3, .04), 2828344), Y(e, J(n, r, i - 1.2, 1.7, .5), 1, 1.1, U, { bottom: !0 }), e.B.quad(...q(n, r, i + 2.6, 1.1, 1, 2.2, .04), U), e.L.quad(...q(n, r, i - 1.2, 1.75, 3, 1.3, .07), 16766346, .7), to(e, n, r, 3.05, Za(e, Ya), .1);
	let o = n.x1 + 1.4;
	for (let t = 0; t < 4; t++) e.B.box(o + t * .5, 1.1, a, .12, 2.2, .55, Za(e, [
		16732014,
		2733798,
		16761406,
		4183690
	]), { shift: [.25, 0] });
	for (let t = 0; t < 2; t++) e.decor("umbrella", n.x0 - 3 - t * 4, K, a + (r === "s" ? 2 : -2), t, 1);
	e.solid(n.x0, n.x1, n.z0, n.z1, 3), e.solid(o - .2, o + 1.9, a - .4, a + .4, 2);
}
function Sd(e, t) {
	let n = t.body, r = t.face, i = (n.x0 + n.x1) / 2, a = (n.z0 + n.z1) / 2;
	e.G.flat(t.x0 + .5, t.x1 - .5, t.z0 + .5, t.z1 - .5, K + .012, 13222066), e.B.box(i, 1.7, a, 14, 3.4, 10, t.wall), e.B.box(i, 4.2, a, 14.8, 1.6, 10.8, W, {
		taper: [1, .06],
		bottom: !0
	}), e.B.quad(...q(n, r, i + 3, 1.2, 1.8, 2.4, .04), 4030351);
	for (let t of [-4, -1]) e.B.quad(...q(n, r, i + t, 2, 1.6, .8, .04), G);
	let o = r === "s" ? n.z1 + .8 : n.z0 - .8;
	e.B.box(i - 5, K + .5, o, 1.6, 1, .9, 16249834, { top: 10474239 }), e.B.box(i - 2, K + .9, o, 2.4, 1.8, .12, 9072469), Y(e, J(n, r, i + 3, 2.4, .2), 2.9, 3.7, Za(e, [
		16763279,
		9429967,
		16748410
	])), e.solid(n.x0, n.x1, n.z0, n.z1, 3.4);
}
function Cd(e, t) {
	let n = t.face === "s" ? t.z1 - .4 : t.z0 + .4;
	e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, 12166538);
	for (let r = t.x0; r < t.x1 - .1; r += 2.4) {
		let i = Math.min(2.4, t.x1 - r);
		e.B.box(r + i / 2, K + 1.2, n, i - .06, 2.4, .08, Math.round(r / 2.4) % 3 ? 14737638 : 12111840, { bottom: !0 });
	}
	if (e.solid(t.x0, t.x1, n - .2, n + .2, 2.4), e.rnd() < .5) {
		let n = t.x0 + 5 + e.rnd() * (t.x1 - t.x0 - 10), r = (t.z0 + t.z1) / 2;
		e.B.box(n, K + 1.3, r, 6, 2.6, 2.5, 16249834, { top: 10134445 }), e.solid(n - 3, n + 3, r - 1.25, r + 1.25, 2.6);
	}
	(t.sides.w || t.sides.e) && e.prop("cone", t.sides.w ? t.x0 - 1.5 : t.x1 + 1.5, K, n, 0, { color: 16742942 });
}
var wd = {
	T1: vd,
	T2: bd,
	T3: yd,
	T4: xd,
	T5: Sd,
	empty: Cd,
	reserved: (e, t) => e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, t.ground)
}, Td = {
	id: "tideline",
	*build(e, t, n, r) {
		let i = t.rect, a = n.zone("tideline"), o = a.bounds, s = e.G, c = e.M, l = Math.max(i.x0, o.x0), u = Math.min(i.x1, o.x1), d = Math.max(i.z0, o.z0);
		if (d < 50 && s.flat(l, u, d, Math.min(i.z1, 50), 0, dd), i.z1 > 50) {
			s.flat(l, u, 50, 72, .02, fd), s.quad([
				l,
				.02,
				72
			], [
				l,
				_d(i.z1),
				i.z1
			], [
				u,
				_d(i.z1),
				i.z1
			], [
				u,
				.02,
				72
			], pd);
			let t = a.promenade, n = l;
			for (let [r, i] of [...t.gaps].sort((e, t) => e[0] - t[0]).concat([[u, u]])) r > n && n < u && ao(e, n, Math.min(r, u), t.z0, t.z1), n = Math.max(n, i);
		}
		for (let r of n.blocksInChunk(t.cx, t.cz)) ao(e, r.x0, r.x1, r.z0, r.z1);
		yield;
		for (let r of n.roadsInChunk(t.cx, t.cz)) {
			let t = r.axis === "ns", i = (t ? r.az : r.ax) + (r.a ? n.nodes.get(r.a).half[t ? "ew" : "ns"] + 2.5 : 0), a = (t ? r.bz : r.bx) - (r.b ? n.nodes.get(r.b).half[t ? "ew" : "ns"] + 2.5 : 0), o = t ? r.ax : r.az, s = r.lanes === 1 ? [0] : r.lanes === 2 ? [-4.8, 4.8] : [
				-5.6,
				5.6,
				-9.2,
				9.2
			];
			for (let e = i; e + 3 <= a; e += 9) for (let n of s) t ? c.flat(o + n - .12, o + n + .12, e, e + 3, gd, md) : c.flat(e, e + 3, o + n - .12, o + n + .12, gd, md);
			if (r.lanes > 1) {
				let n = r.lanes === 3 ? 2 : .25, s = r.lanes === 3 ? hd : md;
				if (t ? c.flat(o - n, o + n, i, a, gd, s) : c.flat(i, a, o - n, o + n, gd, s), r.lanes === 3) for (let t = i + 6; t < a - 4; t += 16) e.decor("palm", o, 0, t, t, .9 + e.rnd() * .3), e.solid(o - .3, o + .3, t - .3, t + .3, 1);
			}
			for (let [e, s] of [[r.a, i], [r.b, a]]) {
				let a = e && n.nodes.get(e);
				if (!a || !(a.signal || Math.abs(a.x) === 52 && Math.abs(a.z) === 37)) continue;
				let l = s === i ? 1 : -1, u = r.width / 2 - .7;
				for (let e = -u; e < u - .3; e += 1.4) {
					let n = s - l * 1.5, r = s + l * 1, i = Math.min(n, r), a = Math.max(n, r);
					t ? c.flat(o + e, o + e + .7, i, a, gd, 16777215) : c.flat(i, a, o + e, o + e + .7, gd, 16777215);
				}
			}
			if (r.stub) {
				if (t) oo(e, o, r.a ? r.bz - 8 : r.az + 8, !0, r.width + 8, "s");
				else {
					let t = !r.a;
					oo(e, t ? r.ax + 10 : r.bx - 10, o === 37 ? 40 : o, !1, o === 37 ? 20 : r.width + 8, t ? "e" : "w");
				}
			}
		}
		yield;
		for (let i of n.lotsInChunk(t.cx, t.cz)) e.rnd = pi(i.seed), i.hero ? r[i.hero].build(e, i, n) : wd[i.recipe](e, i), yield;
		e.rnd = pi(t.seed);
		for (let r of n.blocksInChunk(t.cx, t.cz)) {
			if (r.edge || a.hero.some((e) => !e.beach && e.x0 < r.x1 && e.x1 > r.x0 && e.z0 < r.z1 && e.z1 > r.z0)) continue;
			let t = 0;
			for (let n = r.x0 + 6; n <= r.x1 - 5; n += 13.5, t++) for (let [i, a] of [[r.z1 - 1, 1], [r.z0 + 1, -1]]) r.row.id === "E" && a < 0 || (t % 2 == 0 ? e.prop("lamp", n, K, i, a > 0 ? 0 : Math.PI) : e.low && t % 4 != 1 || (e.decor("palm", n, K, i - a * .4, n * 7 + i, .85 + e.rnd() * .45), e.solid(n - .3, n + .3, i - a * .4 - .3, i - a * .4 + .3, 1)));
			r.row.id === "A" && e.decor("bench", r.x0 + 20, K, r.z1 - 2.6, Math.PI, 1);
		}
		if (yield, i.z1 > 50) {
			let n = a.promenade, r = (e) => n.gaps.some(([t, n]) => e > t - 1 && e < n + 1);
			for (let t = Math.ceil((l + 5) / 10) * 10 - 5; t < u; t += 10) r(t) || (e.decor("palm", t, K, 47.4, t * 3, .9 + e.rnd() * .4), e.solid(t - .3, t + .3, 47.1, 47.7, 1));
			for (let t = Math.ceil(l / 27.5) * 27.5; t < u; t += 27.5) !r(t) && Math.abs(t) > 1 && e.prop("lampLong", t, K, 49.3, Math.PI);
			for (let t = Math.ceil((l - 12) / 40) * 40 + 12; t < u; t += 40) r(t) || e.decor("bench", t, K, 45.2, 0, 1);
			for (let n = 0; n < 12; n++) {
				let r = l + (n + .5) * (u - l) / 12 + (e.rnd() - .5) * 6, i = 54.5 + e.rnd() * 13;
				a.hero.some((e) => e.beach && Math.abs((e.x0 + e.x1) / 2 - r) < 4) || (e.decor("umbrella", r, .02, i, n + t.cx, 1), e.solid(r - .15, r + .15, i - .15, i + .15, 1), e.B.box(r + 1.6, .05, i + (e.rnd() - .5), .9, .06, 2, Za(e, [
					16740280,
					2746111,
					16765502,
					16777215
				])));
			}
			for (let t = 0; t < 4; t++) {
				let n = l + (t + .5) * (u - l) / 4 + (e.rnd() - .5) * 12, r = 53 + e.rnd() * 5;
				e.decor("palm", n, 0, r, t, .75 + e.rnd() * .35), e.solid(n - .3, n + .3, r - .3, r + .3, 1);
			}
		}
	},
	shell(e, t, n, r) {
		for (let r of n.blocksInChunk(t.cx, t.cz)) e.B.flat(r.x0, r.x1, r.z0, r.z1, K, hd);
		for (let i of n.lotsInChunk(t.cx, t.cz)) {
			let t = i.body;
			if (i.hero && r[i.hero].shell) {
				r[i.hero].shell(e, i);
				continue;
			}
			if (!t || !i.h || i.beach) continue;
			let n = (t.x0 + t.x1) / 2, a = (t.z0 + t.z1) / 2, o = t.x1 - t.x0, s = t.z1 - t.z0;
			if (i.recipe === "T2") {
				let r = i.face === "s";
				e.B.box(n, 3.3, r ? t.z0 + 4 : t.z1 - 4, o, 6.6, 8, i.wall, { top: W });
				for (let n of [t.x0 + 4, t.x1 - 4]) e.B.box(n, 3.3, a + (r ? 4 : -4), 8, 6.6, s - 8, i.wall, { top: W });
			} else e.B.box(n, i.h / 2, a, o, i.h, s, i.wall, { top: W }), i.h > 6 && e.B.box(n, 1.75, a, o + .3, 3.5, s + .3, U, { noTop: !0 });
		}
	}
}, Ed = /* @__PURE__ */ t({
	BELL_TOWER: () => Pd,
	default: () => Id
}), Dd = 16643818, Od = 11031866, kd = 16757575, Ad = 16761600, jd = -1350, Md = -960, Nd = -1380, Pd = {
	x: jd,
	z: Md,
	h: 34
};
function Fd(e, t = 0) {
	let n = t * 2;
	e.box(Nd, 6, Md, 40 - n, 12, 16 - n, Dd, { top: Od }), e.box(Nd, 13.4, Md, 40 - n, 2.8, 16 - n, Od, { taper: [1, .08] }), e.box(jd, 13, Md, 8 - n, 26, 8 - n, Dd);
	for (let [t, n] of [
		[-3.3, -3.3],
		[3.3, -3.3],
		[-3.3, 3.3],
		[3.3, 3.3]
	]) e.box(jd + t, 29, Md + n, 1.4, 6, 1.4, Dd, { noTop: !0 });
	e.box(jd, 33, Md, 9 - n, 2, 9 - n, Od, { taper: [.06, .06] });
}
var Id = {
	id: "bell-tower",
	skyline: !0,
	build(e, t) {
		let n = K, r = e.B;
		e.G.flat(t.x0, t.x1, t.z0, t.z1, n + .012, 15317410), Fd(Eo(e));
		for (let e of [
			8,
			16,
			24
		]) r.box(jd, e, Md, 8.3, .9, 8.3, kd, { noTop: !0 });
		r.box(jd, 26.1, Md, 8.6, .3, 8.6, Dd, { bottom: !0 }), r.box(jd, 28.6, Md, 2, 2, 2, Ad, {
			bottom: !0,
			taper: [.55, .55]
		}), r.box(jd, 30.4, Md, .3, 1.6, .3, 7301752), e.L.box(jd, 29, Md, 5, 5.6, 5, 16761466, { noTop: !0 });
		let i = {
			x0: -1400,
			x1: -1360,
			z0: -968,
			z1: -952
		};
		r.quad(...q(i, "s", Nd, 2.2, 3.2, 4.4, .06), 9071178), r.quad(...q(i, "s", Nd, 8.4, 2.4, 2.4, .06), G), e.L.quad(...q(i, "s", Nd, 8.4, 2.4, 2.4, .09), 16766346, .7);
		for (let e = -3; e <= 3; e++) if (e) for (let t of ["s", "n"]) r.quad(...q(i, t, Nd + e * 5.4, 6.2, 1.4, 4.2, .06), G, .85 + (e & 1) * .2);
		r.quad(...q({
			x0: -1354,
			x1: -1346,
			z0: -964,
			z1: -956
		}, "s", jd, 1.4, 1.6, 2.8, .06), 9071178), e.G.flat(-1390, -1370, -952, -938, n + .02, 14077380);
		for (let t of [-1387, -1373]) e.decor("bench", t, n, -941, Math.PI, 1);
		for (let r of [t.x0 + 6, t.x0 + 16]) e.decor("palm", r, n, t.z0 + 8, r, .9);
		e.solid(i.x0, i.x1, i.z0, i.z1, 12), e.solid(-1354, -1346, -964, -956, 34);
	},
	shell(e, t, { inset: n = 0 } = {}) {
		Fd(e.B ? Eo(e) : Do(e), n);
	}
}, Ld = /* @__PURE__ */ t({ default: () => qd }), Rd = 16249834, zd = 8378088, Bd = 15317410, Vd = -212, Hd = -212, Ud = -540, Wd = {
	x0: -247,
	x1: -177,
	z0: -590,
	z1: -560,
	y0: 0,
	y1: 16,
	col: Rd,
	top: 13159634
};
function Gd(e, t, n, r, i, a, o, s, c, l = (e, ...t) => e.quad(...t), u = (e, ...t) => e.tri(...t)) {
	for (let d = 0; d < s; d++) {
		let f = (d + .5) / s * Math.PI * 2, p = (d + 1.5) / s * Math.PI * 2, m = Math.cos(f), h = Math.sin(f), g = Math.cos(p), _ = Math.sin(p), v = [
			t + m * r,
			i,
			n + h * r
		], y = [
			t + g * r,
			i,
			n + _ * r
		];
		a > 0 ? l(e, y, v, [
			t + m * a,
			o,
			n + h * a
		], [
			t + g * a,
			o,
			n + _ * a
		], c, d % 2 ? 1 : .94) : u(e, y, v, [
			t,
			o,
			n
		], c, d % 2 ? 1 : .94);
	}
}
function Kd(e, t) {
	let n = -575;
	Gd(e, Vd, n, 7, 16, 7, 24, 8, Rd, ...t), Gd(e, Vd, n, 7.4, 24, 6.2, 29, 8, 9429967, ...t), Gd(e, Vd, n, 6.2, 29, 3.6, 34, 8, 9429967, ...t), Gd(e, Vd, n, 3.6, 34, 0, 38, 8, 9429967, ...t);
}
var qd = {
	id: "cityhall",
	skyline: !0,
	build(e, t) {
		let n = e.B, r = e.rnd;
		e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, Bd), go(e, [Wd]), n.box(Vd, 8, -575, 70.4, .5, 30.4, U), n.box(Vd, 16.3, -575, 70.8, .6, 30.8, U, { top: 13159634 }), Kd(n, []), n.box(Vd, 1, -558, 72, 2, 4, Rd);
		for (let t = 0; t < 12; t++) {
			let r = -245 + t * 6;
			n.box(r, 8, -557.6, 1.2, 12, 1.2, Rd), e.L.quad(...q({
				x0: r - .6,
				x1: r + .6,
				z0: -558.2,
				z1: -557
			}, "s", r, 7, 1.2, 10, .03), 16766346, .5);
		}
		n.box(Vd, 15, -558, 72, 2, 4.4, Rd, { bottom: !0 });
		for (let e = 0; e < 4; e++) n.box(Vd, K + (2 - e * .5) / 2, -555.25 + e * 1.5, 40, 2 - e * .5, 1.5, 15261912);
		e.S.quad(...q({
			x0: -248,
			x1: -176,
			z0: -560.2,
			z1: -555.8
		}, "s", Vd, 15, 8, 1.7, .03), 16777215, 1, Ti(19)), n.box(-215, 2.6 + K, -556, 1.8, 3.2, .1, 1780288), n.box(-209, 2.6 + K, -556, 1.8, 3.2, .1, 1780288), e.solid(Wd.x0, Wd.x1, Wd.z0, -556, 16), e.solid(-232, -192, -556, -550, 2), Gd(n, Hd, Ud, 8.4, K, 8.4, K + .7, 12, U), Gd(n, Hd, Ud, 8.4, K + .7, 7.6, K + .7, 12, U), Gd(n, Hd, Ud, 7.6, K + .5, 0, K + .5, 12, zd), n.box(Hd, K + .6, Ud, 1.4, 1.2, 1.4, U), n.box(Hd, K + 4.2, Ud, .7, 6, .7, 14677759, { taper: [.3, .3] }), Gd(n, Hd, Ud, .3, K + 7.2, 1.6, K + 5.4, 6, 14677759), Gd(e.L, Hd, Ud, 7.6, K + .56, 0, K + .56, 12, 2746111), e.L.box(Hd, K + 4.2, Ud, .9, 6, .9, 9431295, { taper: [.3, .3] }), e.solid(-218, -206, -546, -534, .8), n.box(-198, K + .6, -549, 2, 1.2, 1, 9072469), e.solid(-199, -197, -549.5, -548.5, 1.2);
		let i = {
			x0: -202,
			x1: -194,
			z0: -551.1,
			z1: -551
		};
		for (let e of [-4, 4]) n.box(-198 + e, K + 2, -551.05, .12, 4, .12, 13159634);
		Y(e, i, K + 2.4, K + 4, 16727972, { bottom: !0 }), n.box(-168, 6, -548, .16, 12, .16, 13159634), n.box(-166.9, 11, -548, 2, 1.2, .05, 2746111, { bottom: !0 });
		for (let t of [
			-60,
			-44,
			-28,
			28,
			44,
			60
		]) e.decor("palm", Hd + t, K, -532, t, 1 + r() * .2), e.solid(Hd + t - .3, Hd + t + .3, -532.3, -531.7, 1);
		for (let t of [-16, 16]) e.decor("bench", Hd + t, K, Ud, t > 0 ? -Math.PI / 2 : Math.PI / 2, 1), e.prop("lamp", Hd + t * 2.4, K, -527, 0);
		no(e, {
			x0: t.x1 - 12,
			x1: t.x1 - 4,
			z0: -528,
			z1: -527.6
		}, "s", 19, 2.2);
	},
	shell(e, t, n = {}) {
		let r = e.W, i = n.inset || 0;
		go({ W: r }, [Wd], {
			cell: 6,
			cut: !1,
			inset: i
		}), Kd(r, [(e, ...t) => e.quad(...t, [
			-1,
			0,
			-1,
			0,
			-1,
			0,
			-1,
			0
		]), (e, t, n, r, i, a) => {
			let o = e.count * 2;
			e.tri(t, n, r, i, a), e.t.set([
				-1,
				0,
				-1,
				0,
				-1,
				0
			], o);
		}]), fo(r, Vd, 8, -558, 72 - i * 2, 16, 4 - i * 2, Rd), i || fo(r, (t.x0 + t.x1) / 2, K + .02, (t.z0 + t.z1) / 2, t.x1 - t.x0, .04, t.z1 - t.z0, Bd);
	}
}, Jd = /* @__PURE__ */ t({
	TOWER: () => Qd,
	default: () => ef
}), Yd = {
	x0: -2032,
	x1: -1968,
	z0: -2120,
	z1: -2080
}, Xd = {
	x0: -2052,
	x1: -2032,
	z0: -2107,
	z1: -2093
}, Zd = 16116951, Qd = {
	x: -2e3,
	z: -2100,
	half: 3,
	top: 25,
	clockY: 18.5
};
function $d(e) {
	Y({ B: e }, Yd, 0, 9, Zd, { noTop: !0 }), e.box(-2e3, 11.5, -2100, 68, 5, 44, W, { taper: [.6, .1] }), e.box(Qd.x, 11, Qd.z, 6, 22, 6, Zd, { noTop: !0 }), e.box(Qd.x, 23.5, Qd.z, 6.6, 3, 6.6, W, { taper: [.02, .02] }), Y({ B: e }, Xd, 0, 4.5, 12044712, { top: W });
}
var ef = {
	id: "clubhouse",
	build(e) {
		let t = e.B, n = {
			x0: Qd.x - 3,
			x1: Qd.x + 3,
			z0: Qd.z - 3,
			z1: Qd.z + 3
		};
		$d(t);
		for (let r of [
			"n",
			"s",
			"e",
			"w"
		]) {
			let i = r === "n" || r === "s" ? Qd.x : Qd.z;
			t.quad(...q(n, r, i, Qd.clockY, 4.4, 4.4, .04), 7301752), e.N.quad(...q(n, r, i, Qd.clockY, 4, 4, .07), 16777215);
			let a = r === "n" || r === "s" ? [Yd.x0, Yd.x1] : [Yd.z0, Yd.z1];
			for (let n = a[0] + 4; n < a[1] - 2; n += 6) t.quad(...q(Yd, r, n, 4.4, 2.6, 5, .05), G, .9), e.rnd() < .6 && e.L.quad(...q(Yd, r, n, 4.4, 2.6, 5, .08), 16766346, .6);
		}
		t.box(Yd.x1 + 3, 7.3, -2100, 6, .6, 20, U, { bottom: !0 });
		for (let e = 0; e < 6; e++) t.box(Yd.x1 + 5.4, 3.5, -2109 + e * 3.6, .6, 7, .6, U, { noTop: !0 });
		t.box(-2e3, .3, Yd.z1 + 5, 40, .6, 10, 15327954), e.solid(Yd.x0, Yd.x1, Yd.z0, Yd.z1, 14), e.solid(Xd.x0, Xd.x1, Xd.z0, Xd.z1, 4.5);
	},
	shell(e) {
		$d(e.B);
	}
}, tf = /* @__PURE__ */ t({
	default: () => pf,
	stats: () => df
}), nf = {
	x0: 2440,
	x1: 2560,
	z0: 70,
	z1: 110
}, rf = 14737638, af = 16249834, of = 2733798, sf = 16752309, cf = 16752686, lf = 2500, uf = 152, df = {
	decks: 6,
	flagpoles: 0,
	lifeboats: 0,
	top: 52
};
function ff(e, t) {
	e.box(lf, 7.5, uf, 280 - t, 21 - t, 36 - t, af, {
		taper: [1, 1],
		top: 14209732
	});
	for (let n = 0; n < 6; n++) e.box(2494 - n * 3, 19.5 + n * 3, uf, 236 - n * 22 - t, 3, 30 - n * 2.4 - t, af, { top: 14209732 });
	e.box(2470, 38, uf, 16 - t, 4, 10 - t, af), e.box(2470, 46, uf, 10 - t, 12, 8 - t, sf, { shift: [-2, 0] }), e.box(2500, 6, 90, 120 - t, 12 - t, 40 - t, rf, { top: 13159634 });
}
var pf = {
	id: "cruise-terminal",
	skyline: !0,
	stats: df,
	build(e) {
		let t = e.B;
		ff(Eo(e), 0), $a(e, nf, "n", .6, 8.6, 8, 8, 6.6, 6.4, .06, .7);
		for (let e = 0; e < 3; e++) t.box(2460 + e * 40, 13.4 + e % 2 * .8, 88, 42, 2, 46, of, {
			taper: [.9, .8],
			shift: [e % 2 ? -3 : 3, 0],
			bottom: !0
		});
		for (let e of [2470, 2530]) {
			t.box(e, 9.5, 122, 3, 3, 24, rf, { bottom: !0 });
			for (let n of [114, 128]) t.box(e, 4, n, .5, 8, .5, 10134445, { noTop: !0 });
		}
		for (let n = 0; n < 12; n++) {
			let r = 2445 + n * 10;
			t.box(r, 5, 62, .16, 10, .16, 13159634), df.flagpoles++, e.low || t.box(r + .9, 9.2, 62, 1.6, 1, .05, [
				of,
				sf,
				16773577
			][n % 3], { bottom: !0 });
		}
		for (let t = 2312; t < 2430; t += e.low ? 10.8 : 5.4) for (let n of [72, 96]) e.M.flat(t - .06, t + .06, n, n + 10.8, .03, 16052198);
		t.box(lf, .4, uf, 280.3, 1.6, 36.3, of, { noTop: !0 });
		for (let n = 0; n < 6; n++) {
			let r = 2494 - n * 3, i = 236 - n * 22 - 8, a = 19.2 + n * 3, o = (30 - n * 2.4) / 2 + .04;
			for (let n of [-1, 1]) {
				let s = uf + n * o, c = n < 0 ? [
					[
						r + i / 2,
						a,
						s
					],
					[
						r - i / 2,
						a,
						s
					],
					[
						r - i / 2,
						a + 1.3,
						s
					],
					[
						r + i / 2,
						a + 1.3,
						s
					]
				] : [
					[
						r - i / 2,
						a,
						s
					],
					[
						r + i / 2,
						a,
						s
					],
					[
						r + i / 2,
						a + 1.3,
						s
					],
					[
						r - i / 2,
						a + 1.3,
						s
					]
				];
				t.quad(...c, 3033707), (n < 0 || !e.low) && e.L.quad(...c.map(([e, t, r]) => [
					e,
					t,
					r + n * .03
				]), 16766346, .35);
			}
		}
		for (let n = 0; n < (e.low ? 6 : 12); n++) for (let r of [-1, 1]) t.box(2400 + n * (e.low ? 32 : 16), 19.6, uf + r * 17.2, 7, 1.8, 2, cf, {
			taper: [.8, .7],
			bottom: !0
		}), df.lifeboats++;
		for (let t = 2366; t < 2640; t += e.low ? 24 : 8) e.N.box(t, 18.5, 133.9, .5, .5, .5, 16773836);
		e.N.box(2469, 52.3, uf, 1, .6, 1, 16734810), e.solid(nf.x0, nf.x1, nf.z0, nf.z1, 12), e.solid(2360, 2640, 134, 170, 18);
		for (let t of [2470, 2530]) for (let n of [114, 128]) e.solid(t - .4, t + .4, n - .4, n + .4, 8);
	},
	shell(e, t, { inset: n = 0 } = {}) {
		ff(Do(e), n ? .4 : 0);
	}
}, mf = {
	wahoo: {
		name: "Wahoo",
		cls: "fast",
		size: [4.9, 1.95],
		wheelR: .36,
		base: 2.85,
		stripe: null,
		hoodStripes: .25,
		bw: 1.89,
		head: [
			.663,
			.627,
			2.4
		],
		tail: [
			1.69,
			.63,
			-2.38
		],
		pieces: "sill:4.9x1.95x0.24@0,0.24 body:2.36x1.89x0.42@-0.54,0.46 hood/f:1.75x1.89x0.42@1.52,0.46 boot/r:0.65x1.89x0.42@-2.05,0.46 cabin:1.95x1.75x0.4@-0.68,0.88 roof:0.94x1.39x0.06@-0.75,1.28 scoop:0.6x0.55x0.14@1.35,0.8#1b1924 tail:0.25x1.85x0.1@-2.28,0.88 pipes:1.2x0.09x0.09@-0.55,0.2x2|0.94#c8ccd2",
		paints: [
			16752686,
			14100029,
			1380157,
			6160283,
			11824127,
			16761600
		]
	},
	sailfin: {
		name: "Sailfin",
		cls: "fast",
		size: [4.4, 1.9],
		wheelR: .34,
		base: 2.6,
		stripe: .64,
		bw: 1.84,
		head: [
			.646,
			.571,
			2.15
		],
		tail: [
			1.64,
			.625,
			-2.12
		],
		pieces: "sill:4.4x1.9x0.24@0,0.22 body:2.91x1.84x0.36@-0.66,0.44 hood/f:1.35x1.84x0.36@1.47,0.44 cabin:2x1.7x0.36@-0.45,0.8 roof:0.99x1.34x0.06@-0.53,1.16 sail/f0:0.9x0.06x0.42@-1.65,0.8! wing:0.3x1.84x0.05@-2.01,0.98! wingposts:0.1x0.06x0.18@-2.01,0.8x2|0.7#1b1924 splitter:0.15x1.9x0.05@2.12,0.12#1b1924",
		paints: [
			2746111,
			16727972,
			16643818,
			16761600,
			16734810,
			3033707
		]
	},
	grouper: {
		name: "Grouper",
		cls: "truck",
		size: [4.9, 2],
		wheelR: .4,
		base: 2.9,
		stripe: .86,
		bw: 1.94,
		head: [
			.68,
			.815,
			2.395
		],
		tail: [
			1.74,
			.965,
			-2.375
		],
		pieces: "sill:4.9x2x0.26@0,0.3 body:3.56x1.94x0.6@-0.59,0.54 hood/f:1.2x1.94x0.6@1.79,0.54 cladding:4.74x1.96x0.25@0.01,0.54#6f6a78 cabin:3.4x1.8x0.62@-0.55,1.14 roof:2.39x1.44x0.06@-0.62,1.76 rails:1.8x0.06x0.05@-0.55,1.82x2|0.6#c8ccd2 spare:0.18x0.7x0.7@-2.46,0.8#15141a",
		paints: [
			13225428,
			12044712,
			3033707,
			16116951,
			7301752,
			11031866
		]
	},
	manatee: {
		name: "Manatee",
		cls: "bus",
		size: [11.5, 2.55],
		wheelR: .5,
		base: 6,
		twinRear: !0,
		stripe: 1,
		stripeH: .3,
		bw: 2.55,
		accent: 16752686,
		head: [
			.867,
			.9,
			5.755
		],
		tail: [
			2.35,
			1.2,
			-5.7
		],
		pieces: "chassis:11.5x2.45x0.35@0,0.3 body:11.05x2.55x1.15@-0.17,0.65#fdf6ea glass:10.7x2.5x0.85@-0.1,1.8 roof:11.15x2.55x0.3@-0.12,2.65 snout/f:0.4x2.45x1.15@5.55,0.65#fdf6ea screen/f0:0.45x2.4x0.85@5.47,1.8 sign:0.15x1.6x0.3@5.38,2.65#1b1924 aircon:2.5x1.6x0.15@-0.5,2.95#c8ccd2 doors:1.2x0.05x1.9@4.25,0.7|-1.285#16263c reardoor:1.2x0.05x1.9@-0.55,0.7|-1.285#16263c bumper:0.06x2.55x0.25@5.72,0.35",
		paints: [
			9429967,
			10474239,
			16763279,
			8378088,
			16752309,
			13215999
		]
	},
	pinfish: {
		name: "Pinfish",
		cls: "two",
		size: [1.8, .7],
		wheelR: .22,
		base: 1.3,
		two: !0,
		stripe: .45,
		bw: .34,
		stripeZ: [-.8, -.14],
		hs: [.14, .1],
		th: .06,
		head: [
			0,
			.95,
			.645
		],
		tail: [
			.12,
			.6,
			-.85
		],
		rider: {
			y: .78,
			z: -.42,
			barY: 1.05,
			barZ: .49,
			barX: .3
		},
		pieces: "deck:0.55x0.32x0.07@0.12,0.2#1b1924 tail:0.75x0.34x0.41@-0.47,0.27 seat:0.65x0.3x0.1@-0.42,0.68#2b2838 shield:0.1x0.42x0.63@0.45,0.22#fdf6ea column:0.08x0.08x0.2@0.5,0.85#1b1924 bars:0.06x0.7x0.05@0.49,1.05#1b1924 lamp:0.1x0.16x0.14@0.59,0.88#c8ccd2 mudguard:0.4x0.14x0.06@0.65,0.44#fdf6ea",
		paints: [
			9429967,
			16752309,
			16773577,
			10474239,
			16752686,
			13215999
		]
	},
	needlefish: {
		name: "Needlefish",
		cls: "two",
		size: [2.05, .72],
		wheelR: .3,
		base: 1.42,
		two: !0,
		stripe: null,
		bw: .42,
		hs: [.16, .12],
		th: .06,
		head: [
			0,
			.55,
			.875
		],
		tail: [
			.12,
			.82,
			-.975
		],
		rider: {
			y: .78,
			z: -.3,
			barY: .86,
			barZ: .43,
			barX: .27
		},
		pieces: "frame:0.95x0.22x0.34@0,0.32#1b1924 fairing/f:0.7x0.42x0.52@0.52,0.4 screen/f0:0.3x0.3x0.2@0.58,0.92 tank:0.5x0.3x0.24@0.18,0.66! seat:0.45x0.26x0.12@-0.3,0.66#2b2838 tail/f0:0.5x0.22x0.22@-0.72,0.7! bars:0.06x0.62x0.05@0.43,0.86#1b1924 pipe:0.7x0.1x0.1@-0.52,0.4|-0.17#c8ccd2 needle:0.15x0.08x0.08@0.95,0.62#c8ccd2",
		paints: [
			2746111,
			16727972,
			6160283,
			16761600,
			16643818,
			16734810
		]
	},
	birdie: {
		name: "Birdie",
		cls: "odd",
		size: [2.4, 1.2],
		wheelR: .22,
		base: 1.65,
		stripe: .5,
		bw: 1.1,
		stripeZ: [.37, 1.13],
		hs: [.26, .09],
		th: .09,
		head: [
			.36,
			.475,
			1.155
		],
		tail: [
			1,
			.235,
			-1.205
		],
		pieces: "chassis:2.4x1.2x0.17@0,0.15 nose/f:0.8x1.1x0.4@0.75,0.32 bench:0.55x1.1x0.3@-0.18,0.32#fdf6ea backrest:0.1x1.1x0.4@-0.47,0.62#fdf6ea bags:0.22x0.22x0.93@-0.89,0.32x2|0.3#a8553a rearposts:0.05x0.05x1@-0.6,0.72x2|0.55#c8ccd2 frontposts:0.05x0.05x1.4@0.34,0.32x2|0.55#c8ccd2 canopy:1.2x1.2x0.08@-0.05,1.72#fdf6ea screen:0.04x1.1x0.68@0.32,0.72",
		paints: [
			16116951,
			12044712,
			13225428,
			15782088,
			16643818,
			4175978
		]
	},
	flounder: {
		name: "Flounder",
		cls: "car",
		size: [5.3, 1.95],
		wheelR: .3,
		base: 3.05,
		stripe: .58,
		bw: 1.89,
		head: [
			.663,
			.521,
			2.6
		],
		tail: [
			1.69,
			.52,
			-2.57
		],
		pieces: "sill:5.3x1.95x0.22@0,0.1 body:2.06x1.89x0.51@-0.19,0.3 hood/f:1.75x1.89x0.51@1.72,0.3 boot/r:1.35x1.89x0.51@-1.89,0.3 cabin:2x1.75x0.38@-0.2,0.81 roof:0.99x1.39x0.06@-0.28,1.19#fdf6ea skirts:0.9x0.04x0.4@-1.52,0.12x2|0.97#fdf6ea visor:0.3x1.6x0.04@0.3,1.14#1b1924",
		paints: [
			8010601,
			3065014,
			16757575,
			14100029,
			2060124,
			11824127
		]
	}
}, hf = {
	coupe: {
		a: "sawtooth",
		b: [
			"square",
			.5,
			.5
		],
		hz: [40, 170],
		lp: [
			260,
			1300,
			350
		],
		q: 2,
		level: 1
	},
	small: {
		a: "square",
		b: [
			"sawtooth",
			1,
			.35
		],
		hz: [55, 210],
		lp: [
			320,
			1500,
			0
		],
		q: 2.5,
		level: .9
	},
	sedan: {
		a: "sawtooth",
		b: [
			"triangle",
			.5,
			.6
		],
		hz: [42, 165],
		lp: [
			240,
			1100,
			0
		],
		q: 1.5,
		level: .9
	},
	muscle: {
		a: "sawtooth",
		b: [
			"square",
			.5,
			.7
		],
		sub: [.25, .6],
		hz: [34, 200],
		lp: [
			220,
			1200,
			500
		],
		q: 3,
		level: 1.3,
		lope: !0
	},
	sports: {
		a: "sawtooth",
		b: [
			"sawtooth",
			1.5,
			.4
		],
		hz: [60, 320],
		lp: [
			400,
			2200,
			600
		],
		q: 3.5,
		level: 1
	},
	truck: {
		a: "sawtooth",
		b: [
			"square",
			.5,
			.6
		],
		sub: [.5, .4],
		hz: [36, 155],
		lp: [
			220,
			1e3,
			0
		],
		q: 1.8,
		level: 1.15
	},
	van: {
		a: "square",
		sub: [.5, .5],
		hz: [38, 140],
		lp: [
			240,
			900,
			0
		],
		q: 1.5,
		level: 1
	},
	bus: {
		a: "sawtooth",
		b: [
			"square",
			.5,
			.8
		],
		sub: [.5, .8],
		hz: [20, 85],
		lp: [
			160,
			700,
			0
		],
		q: 2,
		level: 1.6
	},
	scooter: {
		a: "square",
		b: [
			"square",
			2.01,
			.3
		],
		hz: [90, 360],
		lp: [
			700,
			2400,
			0
		],
		q: 4,
		hp: 150,
		level: .7
	},
	bike: {
		a: "sawtooth",
		b: [
			"sawtooth",
			2,
			.35
		],
		hz: [110, 620],
		lp: [
			500,
			3200,
			0
		],
		q: 4,
		level: .95
	},
	cart: {
		a: "triangle",
		b: [
			"sine",
			2,
			.25
		],
		hz: [200, 520],
		lp: [
			2400,
			0,
			0
		],
		q: .7,
		level: .4,
		noGears: !0
	}
}, gf = (e, t) => ({
	id: "engine-" + e,
	...hf[e],
	...t
}), Q = {
	F2: 87.31,
	F3: 174.61,
	Bb3: 233.08,
	C4: 261.63,
	D4: 293.66,
	E4: 329.63,
	G4: 392,
	A4: 440,
	B4: 493.88,
	C5: 523.25,
	"C#5": 554.37,
	D5: 587.33,
	Eb5: 622.25,
	A5: 880,
	B5: 987.77,
	"C#6": 1108.73
};
gf("coupe"), Q.A4, Q["C#5"], gf("small"), Q.E4, Q.G4, gf("sedan"), Q.G4, Q.B4, gf("sedan"), Q.G4, Q.B4, gf("truck"), Q.D4, Q.A4, gf("van"), Q.C4, Q.G4, gf("muscle"), Q.G4, Q.C5, gf("sports", {
	a: "sawtooth",
	b: null
}), Q.A4, Q.D5, gf("truck"), Q.E4, Q.B4, gf("bus"), Q.F2, Q.F3, gf("scooter"), Q.B5, Q["C#6"], gf("bike"), Q.A5, Q.B5, gf("cart"), Q.D5, Q.Eb5, gf("sedan", {
	hz: [32, 130],
	sub: [.5, .5],
	lope: !0
}), Q.Bb3, Q.D4;
// src/vehicles/models.js
var _f = 1775908, vf = 1451580, yf = 13159634, bf = 1381402, xf = 10132136, Sf = 2763316, Cf = {
	heron: {
		name: "Heron",
		wheelR: .36,
		base: 2.76,
		stripe: .66,
		head: [
			.65,
			.655,
			2.175
		],
		tail: [
			1.72,
			.765,
			-2.155
		],
		pieces: "sill:4.46x1.92x0.24@0,0.24 body:2.9x1.86x0.48@-0.7,0.46 hood/f:1.42x1.86x0.48@1.46,0.46 cabin:2.1x1.72x0.4@-0.25,0.94 roof:1.09x1.36x0.06@-0.32,1.34 spoiler:0.34x1.84x0.06@-2.02,1.11 struts:0.2x0.08x0.2@-2,0.92x2|0.7",
		paints: [
			16732014,
			9429967,
			16763279,
			10474239,
			13215999,
			16249834
		]
	},
	snook: {
		name: "Snook",
		wheelR: .29,
		base: 2.3,
		stripe: .59,
		head: [
			.544,
			.6,
			1.795
		],
		tail: [
			1.34,
			.705,
			-1.775
		],
		pieces: "sill:3.7x1.6x0.22@0,0.19 body:2.76x1.54x0.49@-0.39,0.39 hood/f:0.8x1.54x0.49@1.39,0.39 cabin:2.5x1.4x0.56@-0.45,0.88 roof:1.49x1.04x0.06@-0.52,1.44#fdf6ea mirrors:0.1x0.14x0.1@0.75,0.88x2|0.84",
		paints: [
			16748410,
			9429967,
			16763279,
			10474239,
			16773577,
			13215999
		]
	},
	tarpon: {
		name: "Tarpon",
		wheelR: .33,
		base: 2.9,
		stripe: .64,
		head: [
			.629,
			.631,
			2.3
		],
		tail: [
			1.59,
			.621,
			-2.275
		],
		pieces: "sill:4.7x1.85x0.24@0,0.22 body:2.31x1.79x0.46@-0.11,0.44 hood/f:1.25x1.79x0.46@1.67,0.44 boot/r:1x1.79x0.46@-1.77,0.44 cabin:2.3x1.65x0.5@-0.1,0.9 roof:1.29x1.29x0.06@-0.18,1.4 mirrors:0.1x0.14x0.1@0.95,0.9x2|0.965",
		paints: [
			13159634,
			16249834,
			3033707,
			12111840,
			7301752,
			15260868
		]
	},
	mullet: {
		name: "Mullet",
		wheelR: .38,
		base: 3.3,
		stripe: .8,
		head: [
			.663,
			.753,
			2.6
		],
		tail: [
			1.75,
			.875,
			-2.655
		],
		pieces: "chassis:5.3x1.95x0.22@0,0.3 bed:2.14x1.95x0.53@-1.52,0.52#f7f3ea tailgate:0.06x1.75x0.5@-2.62,0.55 body:1.75x1.89x0.53@0.43,0.52 hood/f:1.29x1.89x0.53@1.95,0.52 cabin:1.7x1.75x0.69@0.45,1.05 roof:0.69x1.39x0.06@0.38,1.74 bumper:0.06x1.95x0.2@2.62,0.4",
		paints: [
			11883311,
			16249834,
			5209260,
			6983502,
			15260868,
			16748410
		]
	},
	pompano: {
		name: "Pompano",
		wheelR: .36,
		base: 3.2,
		stripe: .85,
		head: [
			.646,
			.835,
			2.545
		],
		tail: [
			1.8,
			1.025,
			-2.605
		],
		pieces: "chassis:5.2x1.9x0.22@0,0.28 box:3.94x2x1.7@-0.57,0.5 body:0.4x1.94x0.7@1.6,0.5 hood/f:0.74x1.94x0.7@2.17,0.5 screen/f0:0.75x1.84x1@1.77,1.2 sideglass:0.7x0.03x0.65@1.05,1.3x2|1 doors:0.06x0.95x1.55@-2.57,0.55x2|0.475 bumper:0.06x2x0.2@2.57,0.34",
		paints: [
			16643818,
			13159634,
			10474239,
			16763279,
			9429967,
			15260868
		]
	}
};
Cf.taxi = {
	...Cf.tarpon,
	name: "Bay Cab",
	pieces: Cf.tarpon.pieces + " sign:0.16x0.5x0.2@-0.18,1.46#ffa02e",
	paints: [16765502],
	accent: 2746111
}, Object.assign(Cf, mf);
var wf = /^([a-z]+)(\/[fr]0?)?:([\d.]+)x([\d.]+)x([\d.]+)@(-?[\d.]+),([\d.]+)(x2)?(?:\|(-?[\d.]+))?(?:#([0-9a-f]{6}))?(!)?$/, Tf = /* @__PURE__ */ new Map();
Object.keys(Cf);
function Ef(e) {
	if (Tf.has(e)) return Tf.get(e);
	let t = Cf[e] || Cf.heron, n = t.pieces.split(" ").map((e) => {
		let t = wf.exec(e);
		return {
			name: t[1],
			mod: t[2] || "",
			L: +t[3],
			W: +t[4],
			H: +t[5],
			f: +t[6],
			y: +t[7],
			twin: !!t[8],
			x: t[9] ? +t[9] : 0,
			color: t[10] ? parseInt(t[10], 16) : null,
			accent: !!t[11]
		};
	}), r = t.size ? t.size[0] : n[0].L, i = t.size ? t.size[1] : n[0].W, a = t.base / 2, o = (t.two ? .4 : .83) * t.wheelR, s = (i - .24) / 2, c = t.twinRear ? i / 2 - .85 * o : s, l = t.twinRear ? 1.7 : 1, u = t.two ? [[
		0,
		a,
		1
	], [
		0,
		-a,
		1
	]] : [
		[
			s,
			a,
			1
		],
		[
			-s,
			a,
			1
		],
		[
			c,
			-a,
			l
		],
		[
			-c,
			-a,
			l
		]
	], d = {
		...t,
		id: e,
		pieces: n,
		W: i,
		L: r,
		wheels: u,
		wheelW: o,
		hs: t.hs || [.44, .11],
		th: t.th || .13,
		bodyW: t.bw || Math.max(...n.filter((e) => !e.twin && e.name !== "sill" && e.name !== "chassis").map((e) => e.W))
	};
	return Tf.set(e, d), d;
}
Ef("heron").wheels;
var Df = {
	sill: _f,
	chassis: _f,
	cabin: vf,
	screen: vf,
	sideglass: vf,
	glass: vf,
	mirrors: _f,
	struts: _f,
	bumper: yf
}, Of = {
	doors: .9,
	tailgate: .92
};
function kf(e, t, n, r, i) {
	let a = t.f - t.L / 2, o = t.f + t.L / 2, s = n - t.W / 2, c = n + t.W / 2, l = t.y, u = t.y + t.H, d = u, f = u, p = 0, m = o, h = a;
	t.mod === "/f" ? d = l + .6 * t.H : t.mod === "/f0" ? d = l : t.mod === "/r" ? f = l + .6 * t.H : t.mod === "/r0" && (f = l), t.name === "cabin" && (p = .2, m = o - .6, h = a + .45), e.hexa([
		[
			s,
			l,
			a
		],
		[
			c,
			l,
			a
		],
		[
			c,
			l,
			o
		],
		[
			s,
			l,
			o
		],
		[
			s + p,
			f,
			h
		],
		[
			c - p,
			f,
			h
		],
		[
			c - p,
			d,
			m
		],
		[
			s + p,
			d,
			m
		]
	], r, i);
}
var Af = (e, t) => Math.min(255, (e >> 16 & 255) * t) << 16 | Math.min(255, (e >> 8 & 255) * t) << 8 | Math.min(255, (e & 255) * t), jf = (e) => Af(16777215, e);
function Mf(e, t, n = null, r = null, i = null, a = {}) {
	let o = Ef(t), s = (t, a, o) => {
		let s = e.count;
		if (o(t === 0 ? a : n === null ? jf(a) : Af(t === 1 ? n : r, a)), i) for (let n = s; n < e.count; n++) i[n] = t;
	};
	for (let t of o.pieces) {
		let n = t.color === null ? Df[t.name] : t.color, r = {
			bottom: t.name === "sill" || t.name === "chassis" || t.name === "spoiler",
			noTop: t.name === "cabin"
		};
		t.name === "bed" && (r.top = 3815492);
		for (let i of t.twin ? [t.x, -t.x] : [t.x]) n === void 0 ? s(t.accent ? 2 : 1, Of[t.name] || 1, (n) => kf(e, t, i, n, r)) : s(0, n, (n) => kf(e, t, i, n, r));
	}
	if (o.stripe != null) {
		let t = o.bodyW / 2 + .006, n = o.stripeZ ? o.stripeZ[1] : o.L / 2 - .13, r = o.stripeZ ? o.stripeZ[0] : -n, i = o.stripe, a = o.stripe + (o.stripeH || .07);
		s(2, 1, (o) => {
			e.quad([
				t,
				i,
				n
			], [
				t,
				i,
				r
			], [
				t,
				a,
				r
			], [
				t,
				a,
				n
			], o), e.quad([
				-t,
				i,
				r
			], [
				-t,
				i,
				n
			], [
				-t,
				a,
				n
			], [
				-t,
				a,
				r
			], o);
		});
	}
	if (o.hoodStripes) {
		let t = o.pieces.find((e) => e.name === "hood"), n = o.hoodStripes, r = t.f - t.L / 2, i = t.f + t.L / 2 - .02, a = t.y + t.H + .006, c = t.y + .6 * t.H + .006;
		s(2, 1, (t) => {
			for (let o of [.3, -.3 - n]) e.quad([
				o,
				a,
				r
			], [
				o,
				c,
				i
			], [
				o + n,
				c,
				i
			], [
				o + n,
				a,
				r
			], t);
		});
	}
	if (a.baked && o.two) for (let [t, n] of o.wheels) s(0, 1, () => Nf(e, t, o.wheelR, n, o.wheelR, o.wheelW, 16));
	a.rider && o.rider && Lf(e, o.rider, s);
}
function Nf(e, t, n, r, i, a, o) {
	e.cylX(t, n, r, i, a, bf, xf, o), e.box(t + a * .51, n, r, .02, 1.4 * i, .28 * i, Sf), e.box(t - a * .51, n, r, .02, 1.4 * i, .28 * i, Sf);
}
var Pf = 13011550, Ff = 3033707, If = 16643818;
function Lf(e, t, n = (e, t, n) => n(e === 0 ? t : 16732072)) {
	let r = t.y, i = t.z, a = (t.barZ - i) * .3, o = (t, n, r, i) => e.hexa([
		[
			n[0] - i,
			n[1] - i,
			n[2]
		],
		[
			n[0] + i,
			n[1] - i,
			n[2]
		],
		[
			r[0] + i,
			r[1] - i,
			r[2]
		],
		[
			r[0] - i,
			r[1] - i,
			r[2]
		],
		[
			n[0] - i,
			n[1] + i,
			n[2]
		],
		[
			n[0] + i,
			n[1] + i,
			n[2]
		],
		[
			r[0] + i,
			r[1] + i,
			r[2]
		],
		[
			r[0] - i,
			r[1] + i,
			r[2]
		]
	], t, { bottom: !0 });
	n(2, 1, (t) => e.box(0, r + .27, i + .02, .34, .54, .22, t, {
		shift: [0, a],
		bottom: !0
	})), n(0, If, (t) => e.box(0, r + .68, i + .04 + a, .25, .26, .27, t, { bottom: !0 }));
	for (let s of [1, -1]) n(0, Ff, (e) => o(e, [
		s * .12,
		r + .05,
		i - .02
	], [
		s * .15,
		r + .02,
		i + .4
	], .07)), n(0, Ff, (e) => o(e, [
		s * .15,
		r - .36,
		i + .42
	], [
		s * .15,
		r - .36,
		i + .54
	], .06)), n(0, Ff, (t) => e.box(s * .15, r - .17, i + .44, .11, .42, .12, t)), n(0, Pf, (e) => o(e, [
		s * .2,
		r + .46,
		i + a + .05
	], [
		s * t.barX,
		t.barY + .03,
		t.barZ - .04
	], .05));
}
function Rf(e, t, n = "heron") {
	let r = Ef(n), [i, a, o] = r.head, s = r.hs[0] / 2, c = r.hs[1] / 2;
	for (let n of i ? [1, -1] : [1]) e.quad([
		n * i - s,
		a - c,
		o
	], [
		n * i + s,
		a - c,
		o
	], [
		n * i + s,
		a + c,
		o
	], [
		n * i - s,
		a + c,
		o
	], t);
}
function zf(e, t, n = "heron") {
	let r = Ef(n), [i, a, o] = r.tail, s = i / 2, c = r.th / 2;
	e.quad([
		s,
		a - c,
		o
	], [
		-s,
		a - c,
		o
	], [
		-s,
		a + c,
		o
	], [
		s,
		a + c,
		o
	], t);
}
function Bf(e) {
	let t = Ef(e), n = Math.max(t.bodyW / 2, t.two ? .2 : 0) + .012, r = t.two ? t.head[2] - .12 : t.L / 2 - .45, i = t.two ? t.tail[2] + .12 : -t.L / 2 + .4;
	return [
		[
			1,
			t.head[1],
			r
		],
		[
			1,
			t.tail[1],
			i
		],
		[
			-1,
			t.head[1],
			r
		],
		[
			-1,
			t.tail[1],
			i
		]
	].map(([e, t, r]) => [
		e * n,
		t,
		r
	]);
}
function Vf(e, t, n = "heron") {
	for (let [r, i, a] of Bf(n)) r > 0 ? e.quad([
		r,
		i - .05,
		a + .07
	], [
		r,
		i - .05,
		a - .07
	], [
		r,
		i + .05,
		a - .07
	], [
		r,
		i + .05,
		a + .07
	], t) : e.quad([
		r,
		i - .05,
		a - .07
	], [
		r,
		i - .05,
		a + .07
	], [
		r,
		i + .05,
		a + .07
	], [
		r,
		i + .05,
		a - .07
	], t);
}
var Hf = new Sr({ vertexColors: !0 });
function Uf(e, t, n = "heron") {
	let r = new B(), i = Ef(n);
	if (Mf(r, n, e, t, null, { baked: !0 }), Rf(r, 16052440, n), zf(r, 10491944, n), Vf(r, 8014352, n), !i.two) for (let [e, t, n] of i.wheels) r.cylX(e, i.wheelR, t, i.wheelR, i.wheelW * n, bf, 9079446, 8);
	return new rr(r.build(), Hf);
}
// src/world/landmarks/day1-block.js
var Wf = /* @__PURE__ */ t({ default: () => Qf }), Gf = 2349049231, Kf = 17, qf = [
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	9,
	10,
	11
], Jf = [
	[
		-34,
		31.4,
		1,
		2733798,
		16777215
	],
	[
		22,
		31.4,
		1,
		16761406,
		2828344
	],
	[
		-12,
		-31.4,
		-1,
		16249834,
		16727972
	],
	[
		30,
		-31.4,
		-1,
		9067775,
		16765502
	],
	[
		46.4,
		12,
		0,
		4183690,
		16777215
	]
], Yf = null;
function Xf(e, t, n, r, i) {
	let a = [], o = t;
	for (; n - o > i;) {
		let t = r + e() * (i - r);
		if (n - (o + t) < r) break;
		a.push([o, o + t]), o += t;
	}
	return a.push([o, n]), a;
}
function Zf() {
	let e = pi(Gf), t = Xf(e, -41, 41, 13, 19), n = [[-26, 0], [0, 26]], r = Math.floor(t.length / 2), i = [];
	return t.forEach(([e, a], o) => n.forEach(([s, c], l) => {
		let u = {
			w: o === 0,
			e: o === t.length - 1,
			n: l === 0,
			s: l === n.length - 1
		};
		i.push({
			i: o,
			j: l,
			pi: r,
			sides: u,
			cell: {
				x0: e + (u.w ? 0 : .1),
				x1: a - (u.e ? 0 : .1),
				z0: s + (u.n ? 0 : .1),
				z1: c - (u.s ? 0 : .1)
			}
		});
	})), {
		rnd: e,
		cells: i
	};
}
var Qf = {
	id: "day1-block",
	build(e, t) {
		let { rnd: n, cells: r } = Zf(), i = {
			rnd: e.rnd,
			nextSign: e.nextSign
		}, a = Kf, o = null, s = null, c = 0;
		e.rnd = n, e.nextSign = () => qf[a++ % qf.length];
		let l = [];
		for (let { i: t, j: i, pi: a, sides: u, cell: d } of r) i === 1 && t === a ? (o = d, l.push(0)) : (i === 1 && t === a - 1 && (u.e = !0), i === 1 && t === a + 1 && (u.w = !0), i === 0 && t === a ? (u.s = !0, s = d, c = io(e, d, 5, u, !1), l.push(c)) : l.push(io(e, d, 2 + Math.floor(n() * 4), u, !0)));
		Yf = l, e.G.flat(o.x0 - .1, o.x1 + .1, o.z0, o.z1 + .5, K + .012, 15317410);
		let u = (o.x0 + o.x1) / 2, d = o.x1 - o.x0;
		for (let [t, r] of [
			[-.3, 6],
			[.3, 6],
			[-.3, 15],
			[.3, 15]
		]) $f(e, u + t * d, o.z0 + r, 6 + n() * 2);
		e.B.box(u, K + .3, o.z0 + 10.5, 3, .6, 3, U, { top: 4175978 }), e.solid(u - 1.5, u + 1.5, o.z0 + 9, o.z0 + 12, .7);
		{
			let t = s, n = (t.x0 + t.x1) / 2, r = c, i = {
				x0: n - 8,
				x1: n + 8,
				z0: t.z1 - 1.6,
				z1: t.z1 - 1.2
			};
			Y(e, i, r + 1.6, r + 5.8, Xa, { bottom: !0 });
			for (let t of [
				-6,
				0,
				6
			]) e.B.box(n + t, r + 1, i.z0 + .2, .3, 1.6, .3, 2828344);
			e.S.quad(...q(i, "s", n, r + 3.7, 15.6, 3.9, .02), 16777215, 1, Ti(0)), e.N.box(n, r + 5.9, i.z1, 16.4, .18, .18, 16727972), e.N.box(n, r + 1.5, i.z1, 16.4, .18, .18, 16727972), e.N.box(n - 8.1, r + 3.7, i.z1, .18, 4.4, .18, 2746111), e.N.box(n + 8.1, r + 3.7, i.z1, .18, 4.4, .18, 2746111);
		}
		for (let t = -38; t <= 38; t += 19) e.prop("lamp", t, K, 29, 0), e.prop("lamp", t, K, -29, Math.PI);
		for (let t = -28.5; t <= 30; t += 19) (t < o.x0 - 2 || t > o.x1 + 2) && $f(e, t, 28.6, 7 + n() * 3), $f(e, t, -28.6, 7 + n() * 3);
		for (let t of [
			-20,
			0,
			20
		]) e.prop("lamp", 44, K, t, Math.PI / 2), e.prop("lamp", -44, K, t, -Math.PI / 2);
		for (let t of [-10, 10]) $f(e, 43.6, t, 7 + n() * 3), $f(e, -43.6, t, 7 + n() * 3);
		for (let [t, n, r, i, a] of Jf) {
			let o = Uf(i, a);
			o.position.set(t, 0, n), o.rotation.y = r * Math.PI / 2, o.updateMatrix(), e.object(o), r ? e.solid(t - 2.25, t + 2.25, n - .98, n + .98, 1.3) : e.solid(t - .98, t + .98, n - 2.25, n + 2.25, 1.3);
		}
		e.rnd = i.rnd, e.nextSign = i.nextSign;
	},
	shell(e) {
		let { cells: t } = Zf();
		for (let [n, { i: r, j: i, pi: a, cell: o }] of t.entries()) {
			if (i === 1 && r === a) continue;
			let t = Yf ? Yf[n] : i === 0 && r === a ? 20.4 : 13.6;
			e.B.box((o.x0 + o.x1) / 2, t / 2, (o.z0 + o.z1) / 2, o.x1 - o.x0, t, o.z1 - o.z0, Ja[(r * 2 + i * 5) % Ja.length], { top: W });
		}
	}
};
function $f(e, t, n, r) {
	e.decor("palm", t, K, n, t * 5 + n, r / 8.5), e.solid(t - .3, t + .3, n - .3, n + .3, 1);
}
// src/world/landmarks/domino-park.js
var ep = /* @__PURE__ */ t({
	TABLES: () => sp,
	default: () => dp
}), tp = 15317410, np = 16643818, rp = 3120728, ip = 9071178, ap = 3065014, op = 16740241, sp = [
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7
].map((e) => ({
	x: -1440.25 + e * 3.5,
	z: -904
})), cp = [];
for (let e = 0; e < 6; e++) for (let t of [-889, -861]) cp.push({
	x: -1472 + e * 23.6 + (t === -861 ? 6 : 0),
	z: t,
	s: 1
});
cp[5].x = -1400, cp[5].z = -883, cp[5].s = 1.25;
var lp = {
	tables: 0,
	trees: 0
};
function up(e, t, n, r, i = K) {
	e.B.box(t, i + .76, n, 1.2, .08, 1.2, np, { bottom: !0 }), e.B.box(t, i + .36, n, .2, .72, .2, 7301752, { noTop: !0 });
	for (let [a, o] of [
		[0, .95],
		[0, -.95],
		[.95, 0],
		[-.95, 0]
	].slice(0, r)) e.B.box(t + a, i + .23, n + o, .4, .46, .4, ap);
	e.solid(t - .6, t + .6, n - .6, n + .6, .8), lp.tables++;
}
var dp = {
	id: "domino-park",
	stats: lp,
	tables: sp,
	build(e, t) {
		let { x0: n, x1: r, z0: i, z1: a } = t, o = (n + r) / 2, s = (i + a) / 2, c = K;
		lp.tables = 0, lp.trees = 0, e.G.flat(n, r, i, a, c + .012, tp);
		for (let [t, s] of [[n, o - 3], [o + 3, r]]) for (let n of [i + .2, a - .2]) e.B.box((t + s) / 2, c + .3, n, s - t, .6, .4, np), e.solid(t, s, n - .2, n + .2, .6);
		for (let [t, o] of [[i, s - 3], [s + 3, a]]) for (let i of [n + .2, r - .2]) e.B.box(i, c + .3, (t + o) / 2, .4, .6, o - t, np), e.solid(i - .2, i + .2, t, o, .6);
		for (let t of cp) e.B.box(t.x, c + 2, t.z, .5 * t.s, 4, .5 * t.s, ip, { noTop: !0 }), e.B.box(t.x, c + 6.5 - (t.s - 1), t.z, 6 * t.s, 5, 6 * t.s, rp, {
			bottom: !0,
			taper: [.8, .8],
			top: 4175978
		}), e.solid(t.x - .3, t.x + .3, t.z - .3, t.z + .3, 4), lp.trees++;
		for (let t = 0; t < 5; t++) for (let n of [0, 1]) {
			let r = cp[t * 2 + n], i = cp[t * 2 + 2 + n];
			Qc(e, r.x, r.z, i.x, i.z, 4.6, e.low ? 6 : 10);
		}
		e.B.box(-1428, c + 3.1, -904, 30, .2, 8, ap, { bottom: !0 });
		for (let t = -1442.6; t <= -1413.4; t += 9.73) for (let n of [-907.6, -900.4]) e.B.box(t, c + 1.5, n, .25, 3, .25, 7301752, { noTop: !0 });
		for (let t of sp) up(e, t.x, t.z, e.low ? 2 : 4), e.N.box(t.x, c + 2.7, t.z, .3, .2, .3, 16773836, { bottom: !0 }), e.L.flat(t.x - 1.6, t.x + 1.6, t.z - 1.6, t.z + 1.6, c + .05, 16761466, .35);
		let l = -1400, u = -880;
		e.B.box(l, c + .76, u, 1.4, .08, 1.4, np, { bottom: !0 }), e.B.box(l, c + 1.3, u, .1, 2.6, .1, 7301752), e.B.box(l, c + 2.75, u, 3.4, .5, 3.4, op, {
			taper: [.1, .1],
			bottom: !0
		});
		for (let [t, n] of [
			[0, 1.1],
			[0, -1.1],
			[1.1, 0],
			[-1.1, 0]
		]) e.B.box(l + t, c + .23, u + n, .4, .46, .4, op);
		e.solid(-1400.7, -1399.3, -880.7, -879.3, .8), e.B.box(-1391, c + 1.5, -897, 3, 2, .15, 2832949), e.B.box(-1391, c + .5, -897, .15, 1, .15, 7301752), e.solid(-1392.5, -1389.5, -897.2, -896.8, 2.5), Zc.parkTables = lp.tables;
		for (let t of [n + 14, r - 14]) e.decor("bench", t, c, a - 3, Math.PI, 1);
	},
	shell(e, t) {
		if (e.B) {
			e.B.flat(t.x0, t.x1, t.z0, t.z1, K + .02, tp);
			for (let t of cp) e.B.box(t.x, 6.6, t.z, 6 * t.s, 5, 6 * t.s, rp, {
				taper: [.8, .8],
				top: 4175978
			});
		}
	}
}, fp = /* @__PURE__ */ t({
	FLAMINGO_TOP: () => 36,
	default: () => bp
}), pp = {
	x0: -310,
	x1: -90,
	z0: -2060,
	z1: -1940
}, mp = 16727972, hp = 16039357, gp = -200, _p = -2e3;
function vp(e) {
	e(gp, 19, _p, 1, 10, 1, mp), e(gp, 26.25, _p, 8, 4.5, 5, mp), [
		[3.2, 0],
		[4.2, 1.3],
		[4.6, 2.6],
		[4, 3.9],
		[3.4, 5.2]
	].forEach(([t, n]) => e(gp + t, 28.5 + n + .65, _p, 1.2, 2, 1.2, mp)), e(-196.1, 35.25, _p, 2, 1.5, 1.5, mp), e(-194.6, 34.8, _p, 1.5, .6, .6, 1380157);
}
function yp(e) {
	Y({ B: e }, pp, 0, 14, 15260868, { top: W });
	for (let [t, n] of [
		["s", gp],
		["n", gp],
		["e", _p],
		["w", _p]
	]) Y({ B: e }, J(pp, t, n, 8, 4), 0, 16, hp, { top: W });
}
var bp = {
	id: "galleria",
	build(e, t) {
		let n = e.B;
		e.G.flat(t.x0 + 2, t.x1 - 2, t.z0 + 2, t.z1 - 2, K + .012, 4867924), yp(n);
		for (let [t, r] of [
			["s", gp],
			["n", gp],
			["e", _p],
			["w", _p]
		]) {
			let i = J(pp, t, r, 8, 4);
			n.quad(...q(i, t, r, 3, 12, 5.4, .05), G), e.L.quad(...q(i, t, r, 3, 12, 5.4, .08), 16766346, .55), (t === "s" || t === "n") && Fo(e).quad(...q(i, t, r, 12.5, 14, 3.5, .07), 16777215, 1, _a("Galleria Flamingo", "#ff3fa4")), e.solid(i.x0, i.x1, i.z0, i.z1, 16);
		}
		n.box(gp, 16, -1972, 40, 4, 20, 9418968, { top: 12111840 }), e.N.box(gp, 14.3, _p, 3, .3, 3, mp), vp((...t) => e.N.box(...t)), n.box(gp, 2.5, pp.z0 - 5, 30, 5, 10, 14273972, { top: W }), e.solid(-215, -185, pp.z0 - 10, pp.z0, 5), Fc(e, {
			x0: t.x0 + 6,
			x1: t.x1 - 6,
			z0: pp.z1 + 8,
			z1: t.z1 - 6
		}, .3, 16), Fc(e, {
			x0: t.x0 + 6,
			x1: t.x1 - 6,
			z0: t.z0 + 6,
			z1: pp.z0 - 14
		}, .15, 6), e.solid(pp.x0, pp.x1, pp.z0, pp.z1, 14);
	},
	shell(e) {
		yp(e.B), vp((...t) => e.B.box(...t));
	}
}, xp = /* @__PURE__ */ t({
	HELIPAD: () => Ep,
	default: () => Op
}), Sp = {
	x0: -495,
	x1: -375,
	z0: -1740,
	z1: -1660
}, Cp = {
	x0: -460,
	x1: -400,
	z0: -1740,
	z1: -1700
}, wp = 12378314, Tp = 16727972, Ep = {
	x: -430,
	z: -1720,
	y: 34,
	r: 9
}, Dp = (e) => {
	Y({ B: e }, Sp, 0, 8, 15260868, { top: W }), Y({ B: e }, Cp, 8, 34, wp, { top: W });
}, Op = {
	id: "hospital",
	build(e, t) {
		e.G.flat(t.x0 + 2, t.x1 - 2, t.z0 + 2, t.z1 - 2, K + .012, 4867924), Dp(e.B);
		for (let t of [
			"n",
			"s",
			"e",
			"w"
		]) {
			let n = t === "n" || t === "s" ? [Cp.x0, Cp.x1] : [Cp.z0, Cp.z1], r = (n[0] + n[1]) / 2, i = n[1] - n[0] - 2;
			for (let a = 10; a < 33; a += 3.6) {
				e.B.quad(...q(Cp, t, r, a, i, 1.7, .05), G, .85 + e.rnd() * .3);
				for (let r = 0; r < 4; r++) e.rnd() < .4 && e.L.quad(...q(Cp, t, n[0] + 3 + e.rnd() * (i - 4), a, 3, 1.7, .08), 16766346, .5 + e.rnd() * .4);
			}
			let a = t === "n" || t === "s" ? [Sp.x0, Sp.x1] : [Sp.z0, Sp.z1];
			e.B.quad(...q(Sp, t, (a[0] + a[1]) / 2, 5.4, a[1] - a[0] - 4, 1.6, .05), G);
		}
		for (let [t, n, r] of [[
			-430,
			Cp.z1 + .4,
			1
		], [
			Cp.x0 - .4,
			-1720,
			0
		]]) e.N.box(t, 27, n, r ? 6 : .6, 2, r ? .6 : 6, Tp), e.N.box(t, 27, n, r ? 2 : .6, 6, r ? .6 : 2, Tp);
		To(e.B, Ep.x, Ep.z, Ep.r, 34, 34.4, W, {
			n: 12,
			top: 8814991
		});
		for (let [t, n, r] of [
			[
				-2,
				.7,
				5
			],
			[
				2,
				.7,
				5
			],
			[
				0,
				4,
				.7
			]
		]) e.B.flat(Ep.x + t - n / 2, Ep.x + t + n / 2, Ep.z - r / 2, Ep.z + r / 2, 34.43, 16777215);
		for (let t = 0; t < 8; t++) e.N.box(Ep.x + Math.sin(t * .785) * 8.6, 34.5, Ep.z + Math.cos(t * .785) * 8.6, .3, .2, .3, 16752686);
		let n = {
			x0: -509,
			x1: -495,
			z0: -1708,
			z1: -1692
		};
		Y(e, n, 5, 5.5, U, { bottom: !0 });
		for (let t of [n.z0 + .5, n.z1 - .5]) for (let n of [-508.4, -497]) e.B.box(n, 2.5 + K / 2, t, .4, 5, .4, U, { noTop: !0 });
		e.B.quad(...q(Sp, "w", -1700, 1.6, 8, 3, .05), G), e.L.quad(...q(Sp, "w", -1700, 1.6, 8, 3, .08), 9431295, .7), Fo(e).quad(...q(Sp, "w", -1700, 6.5, 12, 3, .07), 16777215, 1, _a("Bayhaven General", "#2f7d5b"));
		for (let t = 0; t < 3; t++) {
			let n = -1730 + t * 4.2;
			e.B.box(-502, K + 1.3, n, 5.6, 2.2, 2.3, 16777215), e.B.box(-502, K + 1.3, n, 5.7, .4, 2.35, Tp, { noTop: !0 }), e.N.box(-501, K + 2.5, n, .4, .2, 1.4, 16734810), e.solid(-504.8, -499.2, n - 1.15, n + 1.15, 2.6);
		}
		e.solid(Sp.x0, Sp.x1, Sp.z0, Sp.z1, 8), e.solid(Cp.x0, Cp.x1, Cp.z0, Cp.z1, 34);
	},
	shell(e) {
		Dp(e.B);
	}
}, kp = /* @__PURE__ */ t({ default: () => Ap }), Ap = {
	id: "lifeguard-hut",
	build(e, t) {
		so(e, (t.x0 + t.x1) / 2, 63, t.wall, t.roof);
	}
}, jp = /* @__PURE__ */ t({ default: () => Np }), Mp = () => ({
	cx: Zo.x,
	cz: Zo.z,
	rot: Zo.rot,
	w: 20,
	d: 12,
	recipe: "mg-two",
	wall: 15782088,
	show: !1
}), Np = {
	id: "model-home",
	build(e) {
		let t = Zo.x, n = Zo.z;
		e.G.flat(t - 15, t + 7, n - 12, n + 12, .02, 6482052), Ls(e, Mp(), !1);
		for (let r = 0; r < 6; r++) {
			let i = n - 11 + r * 4.4;
			e.B.box(t - 14.4, 2.5, i, .08, 5, .08, U), e.B.box(t - 14.4, 3, i + .35, .06, 4, .6, r % 2 ? 16727972 : 8378088, { taper: [1, .4] });
		}
		for (let r of [n - 4, n + 4]) e.B.box(t - 13, 1.6, r, .15, 3.2, .15, U);
		e.B.box(t - 13, 2.6, n, .1, 1.3, 8.2, U), Fo(e).quad([
			t - 13.07,
			1.6,
			n - 4
		], [
			t - 13.07,
			1.6,
			n + 4
		], [
			t - 13.07,
			3.6,
			n + 4
		], [
			t - 13.07,
			3.6,
			n - 4
		], 16777215, 1, _a("Bayhaven Tomorrow", "#ff3fa4"));
	},
	shell(e) {
		Ls(e, Mp(), !0);
	}
}, Pp = /* @__PURE__ */ t({
	CHIMNEYS: () => Rp,
	default: () => Hp
}), Fp = 11031866, Ip = 13159634, Lp = 4869980, Rp = [
	{
		x: 1200,
		z: -885,
		h: 62,
		col: 16727972
	},
	{
		x: 1222,
		z: -885,
		h: 54,
		col: 2746111
	},
	{
		x: 1244,
		z: -885,
		h: 46,
		col: 6160283
	}
], zp = [
	[1200, 11824127],
	[1220, 16752686],
	[1240, 16727972],
	[1260, 2746111]
], Bp = {
	x0: 1237,
	x1: 1307,
	z0: -827,
	z1: -777,
	h: 16
};
function Vp(e, t = 0, n = !1) {
	let r = Bp;
	e.box((r.x0 + r.x1) / 2, r.h / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0 - t * 2, r.h, r.z1 - r.z0 - t * 2, Fp, { top: 9080985 });
	for (let r of Rp) e.prism(r.x, r.z, 2.2 - t, 0, r.h - 12, Fp, {
		n: n ? 6 : 8,
		noTop: !0
	}), e.prism(r.x, r.z, 2.3 - t, r.h - 12, r.h, r.col, {
		n: n ? 6 : 8,
		top: 2828344
	});
	for (let [r, i] of zp) e.prism(r, -850, 3 - t, 0, 8, i, {
		n: n ? 6 : 8,
		top: 16643818
	});
}
var Hp = {
	id: "paint-factory",
	skyline: !0,
	chimneys: Rp,
	build(e, t) {
		let n = K, r = e.B, i = Bp, a = e.rnd;
		e.G.flat(t.x0, t.x1, t.z0, t.z1, n + .012, Ip), Vp(Eo(e));
		let o = (i.x1 - i.x0) / 6;
		for (let e = 0; e < 6; e++) {
			let t = i.x0 + e * o, n = t + o, a = i.h + 3.4;
			r.hexa([
				[
					t,
					i.h,
					i.z0
				],
				[
					n,
					i.h,
					i.z0
				],
				[
					n,
					i.h,
					i.z1
				],
				[
					t,
					i.h,
					i.z1
				],
				[
					t,
					a,
					i.z0
				],
				[
					n,
					i.h,
					i.z0
				],
				[
					n,
					i.h,
					i.z1
				],
				[
					t,
					a,
					i.z1
				]
			], 9080985, { top: 10134445 }), r.quad([
				t - .03,
				i.h + .4,
				i.z0 + 1
			], [
				t - .03,
				i.h + .4,
				i.z1 - 1
			], [
				t - .03,
				a - .4,
				i.z1 - 1
			], [
				t - .03,
				a - .4,
				i.z0 + 1
			], G, 1.1);
		}
		for (let t of ["n", "e"]) {
			let [n, o] = t === "n" ? [i.x0, i.x1] : [i.z0, i.z1], s = Math.floor((o - n) / (e.low ? 10 : 5));
			for (let c = 0; c < s; c++) for (let l of e.low ? [9] : [4, 10]) r.quad(...q(i, t, n + (c + .5) * (o - n) / s, l, 3, 2, .08), G, .8 + a() * .4);
		}
		e.L.quad(...q(i, "e", i.z0 + 7.5, 10, 3, 2, .11), 16766346, .9);
		let s = Fo(e);
		va(s, ...Io(i, "s", .06), .4, i.h - .4, 5026, qi(5026), {
			cells: 4,
			drips: !0
		}), va(s, ...Io(i, "w", .06), .4, i.h - .4, 5030, qi(5030), {
			cells: 2,
			drips: !0
		});
		for (let t of Rp) {
			for (let n = 0; n < 6; n++) {
				let i = Math.PI / 8 + (n + .5 + n % 2 * .5) / 6 * Math.PI * 2, o = 4 + a() * 10, s = 2.2;
				r.box(t.x + Math.sin(i) * s, t.h - 12 - o / 2, t.z + Math.cos(i) * s, .5, o, .25, t.col, {
					rot: i,
					noTop: !0
				}), n % 2 == 0 && e.L.box(t.x + Math.sin(i) * 2.3000000000000003, t.h - 12 - o / 2, t.z + Math.cos(i) * 2.3000000000000003, .5, o, .2, t.col, {
					rot: i,
					noTop: !0
				});
			}
			To(e.L, t.x, t.z, 2.42, t.h - 12, t.h, t.col, { noTop: !0 }), To(e.N, t.x, t.z, 2.4, t.h - .8, t.h + .1, t.col, { noTop: !0 }), r.box(t.x, 1, t.z, 6, 2, 6, 9061936), e.solid(t.x - 3, t.x + 3, t.z - 3, t.z + 3, t.h);
		}
		r.box(1200, 20, -882.6, .7, 40, .12, Lp, { noTop: !0 }), r.box(1200, 40, -885, 7, .3, 7, Lp, { bottom: !0 });
		for (let [t] of zp) e.solid(t - 2.8, t + 2.8, -852.8, -847.2, 8);
		r.box(1311, n + .6, -802, 8, 1.2, 30, Ip);
		for (let e of [-810, -794]) r.quad(...q(i, "e", e, 3.6, 4, 4.5, .08), Lp, .85);
		e.solid(1307, 1315, -817, -787, 1.2), e.solid(i.x0, i.x1, i.z0, i.z1, i.h);
		for (let [t, r] of [
			[1185, -770],
			[1315, -770],
			[1185, -904],
			[1315, -904]
		]) e.prop("lamp", t, n, r, r > -800 ? 0 : Math.PI);
	},
	shell(e, t, { inset: n = 0 } = {}) {
		Vp(e.B ? Eo(e) : Do(e), n, !0);
	}
}, Up = /* @__PURE__ */ t({
	DISH: () => Zp,
	MAST: () => Qp,
	default: () => em
}), Wp = {
	x0: 150,
	x1: 250,
	z0: -2212,
	z1: -2152
}, Gp = {
	x0: 170,
	x1: 230,
	z0: -2252,
	z1: -2212
}, Kp = {
	x0: 136,
	x1: 150,
	z0: -2204,
	z1: -2164
}, qp = {
	x0: 292,
	x1: 430,
	z0: -2268,
	z1: -2140
}, Jp = 16249834, Yp = 8378088, Xp = 16727972, Zp = {
	x: 195,
	z: -2238,
	r: 7,
	y: 24
}, Qp = {
	x: 240,
	z: -2228,
	h: 45
};
function $p(e) {
	Y({ B: e }, Wp, 0, 16, Jp, { top: W }), Y({ B: e }, Gp, 0, 14, 12900322, { top: W }), e.box(Qp.x, Qp.h / 2, Qp.z, 1.4, Qp.h, 1.4, W, { taper: [.4, .4] }), e.box(Zp.x, 19, Zp.z, 1.2, 10, 1.2, W), To(e, Zp.x, Zp.z, 1.2, Zp.y, Zp.y + 2.6, 14341840, {
		n: 10,
		r1: Zp.r,
		top: Jp
	});
}
var em = {
	id: "sheriff-hq",
	build(e, t) {
		let n = e.B;
		e.G.flat(t.x0 + 2, t.x1 - 2, t.z0 + 2, t.z1 - 2, K + .012, 4867924), $p(n), n.box(200, 12.6, -2182, 100.4, 1.6, 60.4, Yp, { noTop: !0 }), n.box(200, 11.4, -2182, 100.4, .5, 60.4, Xp, { noTop: !0 });
		for (let t of [
			"s",
			"e",
			"w"
		]) for (let r of [
			2.4,
			6,
			9.4
		]) {
			let i = t === "s" ? [Wp.x0, Wp.x1] : [Wp.z0, Wp.z1];
			n.quad(...q(Wp, t, (i[0] + i[1]) / 2, r, i[1] - i[0] - 6, 1.6, .05), G, .9);
			for (let n = 0; n < 5; n++) e.rnd() < .4 && e.L.quad(...q(Wp, t, i[0] + 5 + e.rnd() * (i[1] - i[0] - 10), r, 3, 1.6, .08), 16766346, .6);
		}
		n.box(200, K + .2, -2150, 14, .4, 4, 14077380), n.box(200, K + .5, -2151, 10, .3, 2, 14077380), n.quad(...q(Wp, "s", 200, 2, 6, 3.4, .07), 1380157), n.box(200, 4.6, -2151.6, 4, 1, .5, 16734810), Fo(e).quad(...q(Wp, "s", 200, 14.2, 14, 3.5, .07), 16777215, 1, _a("Bayhaven Blue: Live", "#2e4a6b")), e.N.box(Zp.x, Zp.y - .3, Zp.z, 2.2, .2, 2.2, 2746111);
		for (let t of [
			15,
			30,
			44.6
		]) e.N.box(Qp.x, t, Qp.z, .9, .4, .9, 16734810);
		Y(e, Kp, 0, 5, 12038328, { top: W });
		for (let e = Kp.z0 + 3; e < Kp.z1; e += 5) n.quad(...q(Kp, "w", e, 3.4, .4, 1.2, .05), G);
		let r = (t, r, i, a) => {
			n.box((t + r) / 2, K + 1.1, (i + a) / 2, Math.max(.15, r - t), 2.2, Math.max(.15, a - i), 10134445), e.solid(t - .1, r + .1, i - .1, a + .1, 2.3);
		};
		r(qp.x0, qp.x1, qp.z0, qp.z0), r(qp.x0, qp.x0, qp.z0, qp.z1), r(qp.x1, qp.x1, qp.z0, qp.z1), r(qp.x0, 352, qp.z1, qp.z1), r(366, qp.x1, qp.z1, qp.z1);
		for (let t = 0; t < 8; t++) {
			let r = 304 + t * 6, i = -2160;
			Nc(e, r, i, !0, Jp), n.box(r, K + .56, i, 1.84, .3, 4.34, 3033707, { noTop: !0 }), e.N.box(r, K + 1.5, i, 1.2, .14, .3, t % 2 ? 16734810 : 2746111);
		}
		r(300, 340, -2240, -2240), r(300, 300, -2262, -2240), r(340, 340, -2262, -2240);
		for (let t = 0; t < 4; t++) Nc(e, 306 + t * 8, -2252, !0);
		e.solid(Wp.x0, Wp.x1, Wp.z0, Wp.z1, 16), e.solid(Gp.x0, Gp.x1, Gp.z0, Gp.z1, 14), e.solid(Kp.x0, Kp.x1, Kp.z0, Kp.z1, 5), e.solid(Qp.x - .8, Qp.x + .8, Qp.z - .8, Qp.z + .8, 45);
	},
	shell(e) {
		$p(e.B);
	}
}, tm = /* @__PURE__ */ t({
	default: () => hm,
	stats: () => pm
}), nm = 3033707, rm = 11883311, im = 14737638, am = 3050, om = 14, sm = [
	11883311,
	16761600,
	12534595,
	3033707,
	4025162,
	14737638
], cm = 12, lm = 20, um = Oo.w + .3, dm = Oo.l + .4, fm = -412, pm = {
	deckContainers: 0,
	top: 44
};
function mm(e, t) {
	e.box(am, 5.8, -300, 40 - t, 16.4 - t, 300 - t, nm, { top: 5985888 }), e.box(am, 29, -436, 30 - t, 30, 16 - t, im), e.box(am, 37, -436, 38 - t, 3, 10 - t, im);
}
var hm = {
	id: "ship-berth",
	skyline: !0,
	stats: pm,
	build(e) {
		let t = e.B;
		mm(Eo(e), 0), t.box(am, .3, -300, 40.3, 1.8, 300.3, rm, { noTop: !0 }), t.box(am, 14.6, -152, 36, 1.2, 3, nm), t.box(3058, 46, -438, 4, 4, 5, rm);
		for (let n of [
			33,
			38,
			41.5
		]) t.quad([
			3036,
			n,
			-427.95
		], [
			3064,
			n,
			-427.95
		], [
			3064,
			n + 1.4,
			-427.95
		], [
			3036,
			n + 1.4,
			-427.95
		], 1780288), e.L.quad([
			3036,
			n,
			-427.9
		], [
			3064,
			n,
			-427.9
		], [
			3064,
			n + 1.4,
			-427.9
		], [
			3036,
			n + 1.4,
			-427.9
		], 16766346, .5);
		let n = e.rnd;
		for (let t = 0; t < lm; t++) for (let r = 0; r < cm; r++) for (let i = 0; i < 4; i++) {
			let a = sm[Math.floor(n() * 6)];
			i < 3 && t > 0 && t < 19 && r > 0 && r < 11 || e.low && i < 3 && (t + r) % 2 || (No(e, am + (r - 11 / 2) * um, om + i * Oo.h, fm + t * dm, !0, a), pm.deckContainers++);
		}
		e.low && t.box(am, 17.8, fm + 19 * dm / 2, cm * um - 1, 7.6, lm * dm - 1, rm, { noTop: !0 }), e.solid(3030, 3070, -450, -150, 14);
	},
	shell(e, t, { inset: n = 0 } = {}) {
		let r = Do(e), i = n ? .4 : 0;
		mm(r, i), r.box(am, 19.2, fm + 19 * dm / 2, cm * um - i, 10.4 - i, lm * dm - i, rm, { top: 4025162 });
	}
}, gm = /* @__PURE__ */ t({
	SPIRE: () => Tm,
	default: () => Om,
	spireTiers: () => Dm
}), _m = 52, vm = -900, ym = 12111840, bm = 3033707, xm = 14737638, Sm = 4175978, Cm = 16727972, wm = (e, t, n, r, i) => ({
	x0: _m - e / 2,
	x1: _m + e / 2,
	z0: vm - e / 2,
	z1: vm + e / 2,
	y0: t,
	y1: n,
	col: r,
	...i
}), Tm = {
	x: _m,
	z: vm,
	top: 260,
	lantern: 248
}, Em = null;
function Dm() {
	if (Em) return Em;
	let e = [wm(60, 0, 12, xm, {
		plain: !0,
		top: 13159634
	})], t = [];
	for (let n = 0; n < 22; n++) {
		let r = 40 - n / 21 * 24, i = 12 + 10 * n, a = n * 4 * Math.PI / 180, o = wm(r + .5, i, i + .7, bm, {
			plain: !0,
			rot: a,
			noRoof: !0
		});
		t.push(o), e.push(o, wm(r, i + .7, i + 10, ym, { rot: a }));
	}
	return e.push(wm(14, 232, 244, 16643818, { rot: 88 * Math.PI / 180 })), e.push(wm(8, 244, 252, 16767468, {
		plain: !0,
		top: Cm
	})), e.push(wm(1.2, 252, 260, 16643818, {
		plain: !0,
		top: Cm
	})), Em = {
		tiers: e,
		bands: t
	};
}
var Om = {
	id: "spire",
	skyline: !0,
	build(e, t) {
		let { tiers: n, bands: r } = Dm(), i = {
			x0: 22,
			x1: 82,
			z0: -930,
			z1: -870
		};
		e.G.flat(t.x0, t.x1, t.z0, t.z1, K + .012, xm), e.G.flat(37, 67, t.z1, -844, K + .012, xm), go(e, n);
		for (let t of r) for (let n of ho(t, -.06)) {
			let [r, i] = n;
			e.L.quad([
				r[0],
				t.y0,
				r[1]
			], [
				i[0],
				t.y0,
				i[1]
			], [
				i[0],
				t.y1,
				i[1]
			], [
				r[0],
				t.y1,
				r[1]
			], 16777215, .8);
		}
		e.N.box(_m, 248, vm, 8.3, 7.6, 8.3, 16767468), e.N.box(_m, 260.4, vm, 1.6, 1.6, 1.6, Cm);
		for (let t of [
			"s",
			"n",
			"e",
			"w"
		]) $a(e, i, t, .6, 5.4, 6, 4.8, 5.2, 4.4, .05, .9);
		Y(e, {
			x0: 45,
			x1: 59,
			z0: i.z1,
			z1: i.z1 + 5
		}, 5.6, 6, U, { bottom: !0 }), no(e, i, "s", 18, 8.4), e.solid(i.x0, i.x1, i.z0, i.z1, 12), e.B.box(_m, K + 2.6, -981, 13, .6, 7, U, { bottom: !0 });
		for (let t of [-6.25, 6.25]) e.B.box(_m + t, K + 1.3, -981, .5, 2.6, 7, U);
		if (e.B.quad(...q({
			x0: 46,
			x1: 58,
			z0: -984.4,
			z1: -977.6
		}, "s", _m, K + 1.2, 12, 2.3, -6.6), 1710118), e.B.flat(46, 58, -984.4, -977.6, K + .03, 2828344), e.solid(45.5, 46, -984.5, -977.5, 3), e.solid(58, 58.5, -984.5, -977.5, 3), !e.low) {
			let t = -921.5;
			for (let n = -3; n <= 3; n++) e.B.box(_m + n * 5, 20, t, .18, 16, .18, 13159634);
			for (let n = 14; n <= 28; n += 3.5) e.B.box(_m, n, t, 30.4, .14, 1.2, 9072469, { bottom: !0 });
		}
		for (let n = 0; n < 12; n++) for (let r of [t.z0 + 5, t.z1 - 5]) {
			let i = t.x0 + 8 + n * 14;
			Math.abs(i - _m) < 20 && r > vm || (e.decor("palm", i, K, r, i + r, 1.05), e.solid(i - .3, i + .3, r - .3, r + .3, 1));
		}
		for (let t = 0; t < 16; t++) {
			let n = Math.PI + t / 16 * Math.PI, r = Math.PI + (t + 1) / 16 * Math.PI, i = [
				_m,
				K + .03,
				-848
			];
			e.G.tri(i, [
				_m + Math.cos(n) * 14,
				i[1],
				-848 + Math.sin(n) * 14
			], [
				_m + Math.cos(r) * 14,
				i[1],
				-848 + Math.sin(r) * 14
			], Sm);
		}
		for (let t = 0; t < 8; t++) {
			let n = Math.PI + (t + .5) / 8 * Math.PI, r = _m + Math.cos(n) * 11, i = -848 + Math.sin(n) * 11;
			e.decor("palm", r, K, i, t * 2.1, 1.1), e.solid(r - .3, r + .3, i - .3, i + .3, 1);
		}
		for (let t of [-36, 36]) for (let n of [-862, -938]) e.prop("lamp", _m + t, K, n, t > 0 ? Math.PI / 2 : -Math.PI / 2);
	},
	shell(e, t, n = {}) {
		go({ W: e.W }, Dm().tiers, {
			cell: 6,
			cut: !1,
			inset: n.inset || 0
		}), n.inset || fo(e.W, (t.x0 + t.x1) / 2, K + .02, (t.z0 + t.z1) / 2, t.x1 - t.x0, .04, t.z1 - t.z0, xm);
	}
}, km = /* @__PURE__ */ t({ default: () => Nm }), Am = 350, jm = -2400;
function Mm(e) {
	for (let t = 0; t < 6; t++) e.box(336.5 + t * 5.4, 4, jm, .5, 8, .5, 7301752);
	e.box(Am, 15, jm, 30, 14, 1, 16777215);
}
var Nm = {
	id: "starlite",
	build(e, t) {
		e.G.flat(t.x0 + 2, t.x1 - 2, t.z0 + 2, t.z1 - 2, K + .012, 4867924), Mm(e.B), e.N.box(Am, 23, -2399.7, 3, 3, .3, 16752686);
		for (let t = 0; t < 5; t++) e.M.flat(260, 440, -2378 + t * 18 - .1, -2378 + t * 18 + .1, K + .03, 16777215);
		e.B.box(Am, K + 2, -2320, 12, 4, 8, 16044970, { top: 7301752 }), e.solid(344, 356, -2324, -2316, 4), e.B.box(425, K + 1.5, -2300, 3, 3, 3, 16734810, { top: 7301752 }), e.solid(423.5, 426.5, -2301.5, -2298.5, 3), e.solid(335, 365, -2400.5, -2399.5, 22);
	},
	shell(e) {
		Mm(e.B);
	}
}, Pm = /* @__PURE__ */ t({ default: () => ih }), Fm = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-"), Im = -1440, Lm = -320, Rm = -1397, zm = 3.8, Bm = [
	[-772, "Buttonwood Street"],
	[
		-692,
		"Founders Avenue",
		"avenue"
	],
	[-612, "Mahogany Street"],
	[-532, "Sapodilla Street"],
	[-452, "Banyan Street"],
	[
		-372,
		"Egret Avenue",
		"avenue"
	],
	[-292, "Gumbo-Limbo Street"],
	[-212, "Cypress Street"],
	[-132, "Satinleaf Street"],
	[-52, "Plaza Street"],
	[132, "Poinciana Street"],
	[212, "Jacaranda Street"],
	[292, "Sea Almond Street"],
	[
		372,
		"Sandbar Avenue",
		"avenue"
	],
	[452, "Tamarind Street"],
	[532, "Allspice Street"],
	[612, "Pigeon Plum Street"],
	[
		692,
		"Exchange Avenue",
		"avenue"
	],
	[772, "Ironwood Street"]
], Vm = [
	[
		-357,
		"Flamingo Avenue",
		"avenue"
	],
	[-437, "First Street"],
	[-517, "Second Street"],
	[-597, "Third Street"],
	[
		-677,
		"Commerce Way",
		"avenue"
	],
	[-757, "Fifth Street"],
	[-837, "Sixth Street"],
	[-917, "Seventh Street"],
	[
		-997,
		"Tower Way",
		"avenue"
	],
	[-1077, "Ninth Street"],
	[-1157, "Tenth Street"],
	[-1237, "Eleventh Street"],
	[
		-1317,
		"Union Avenue",
		"avenue"
	],
	[Rm, "Thirteenth Street"]
], Hm = {
	"Gumbo-Limbo Street": [[-517, -357]],
	"First Street": [[-372, -212]],
	"Cypress Street": [[-597, -517]],
	"Seventh Street": [[-52, 132]]
}, Um = [];
for (let [e, t, n = "street"] of Bm) Um.push({
	id: Fm(t),
	pid: "meridian:" + Fm(t),
	name: t,
	axis: "ns",
	at: e,
	from: Rm,
	to: Lm,
	kind: n,
	closed: Hm[t] || []
});
for (let [e, t, n = "street"] of Vm) Um.push({
	id: Fm(t),
	pid: "meridian:" + Fm(t),
	name: t,
	axis: "ew",
	at: e,
	from: -800,
	to: 800,
	kind: n,
	closed: Hm[t] || []
});
Um.push({
	id: "coral-blvd",
	pid: "meridian:coral-blvd",
	name: "Coral Boulevard",
	axis: "ns",
	at: 52,
	from: Rm,
	to: Lm,
	kind: "boulevard",
	width: 14,
	widths: [{
		from: -837,
		to: Lm,
		width: 30
	}],
	closed: [[-997, -837]],
	parts: [{
		from: Rm,
		to: -997,
		id: "kapok-street",
		name: "Kapok Street",
		kind: "street"
	}]
});
var Wm = (e) => e === "avenue" ? 11 : 7, Gm = [{
	id: "S",
	z0: -346,
	z1: Lm,
	strip: !0
}];
for (let e = 0; e < Vm.length - 1; e++) Gm.push({
	id: "R" + e,
	z0: Vm[e + 1][0] + Wm(Vm[e + 1][2]),
	z1: Vm[e][0] - Wm(Vm[e][2])
});
Gm.push({
	id: "N",
	z0: Im,
	z1: -1404,
	strip: !0
});
var Km = [
	{
		id: "bayfront",
		name: "Bayfront",
		x0: -800,
		x1: 800,
		z0: -600,
		z1: Lm,
		h: [50, 100],
		halves: .5,
		shares: {
			M4: 25,
			M1: 75
		}
	},
	{
		id: "uptown",
		name: "Uptown",
		x0: -800,
		x1: 800,
		z0: Im,
		z1: -1100,
		h: [16, 120],
		halves: .4,
		shares: {
			M1: 90,
			M5: 10
		}
	},
	{
		id: "radio-row",
		name: "Radio Row",
		x0: -800,
		x1: -300,
		z0: -1100,
		z1: -600,
		h: [22, 60],
		halves: 1,
		shares: {
			M1: 85,
			M4: 15
		}
	},
	{
		id: "the-exchange",
		name: "The Exchange",
		x0: -300,
		x1: 800,
		z0: -1100,
		z1: -600,
		h: [120, 220],
		halves: 0,
		shares: {
			M2: 30,
			M5: 30,
			M1: 20,
			M3: 15,
			M4: 5
		}
	}
], qm = {
	M1: [
		12111840,
		14737638,
		12892384
	],
	M2: [
		14737638,
		14268612,
		15127480
	],
	M3: [12111840, 12116179],
	M4: [14737638, 12111840],
	M5: [14737638, 12892384]
}, Jm = {
	M1: {
		recipe: "glass-slab",
		preset: "slab",
		floors: [20, 45]
	},
	M2: {
		recipe: "stepped-tower",
		preset: "stepped",
		floors: [25, 55]
	},
	M3: {
		recipe: "glass-slab",
		preset: "twin",
		floors: [18, 40]
	},
	M4: {
		recipe: "glass-slab",
		preset: "curved",
		floors: [16, 36]
	},
	M5: {
		recipe: "glass-slab",
		preset: "plaza",
		floors: [30, 55]
	}
}, Ym = 16748410, Xm = {
	x: 96,
	z: -636
}, Zm = [{
	x: -492,
	z: -717
}, {
	x: -652,
	z: -957
}], Qm = (e, t) => t.x > e.x0 && t.x < e.x1 && t.z > e.z0 && t.z < e.z1, $m = (e, t, n, r) => ({
	x0: e - n / 2,
	x1: e + n / 2,
	z0: t - r / 2,
	z1: t + r / 2
});
function eh(e, t, n, r, i, a) {
	let o = (t.x0 + t.x1) / 2, s = (t.z0 + t.z1) / 2, c = t.x1 - t.x0, l = t.z1 - t.z0, u = [], d = {};
	if (e === "M1") {
		let e = Math.abs(c - l) < 2 ? i() < .5 : c > l, t = Math.min(e ? 50 : 24, c - 2), a = Math.min(e ? 24 : 50, l - 2);
		u.push({
			...$m(o, s, t, a),
			y0: 0,
			y1: n - 3,
			col: r
		}), u.push({
			...$m(o + (e ? t / 5 : 0), s + (e ? 0 : a / 5), t / 2, a / 2),
			y0: n - 3,
			y1: n,
			col: 12038328,
			plain: !0
		});
	} else if (e === "M2") {
		let e = Math.min(44, c, l);
		[
			[
				0,
				.4,
				e
			],
			[
				.4,
				.7,
				e - 12
			],
			[
				.7,
				.9,
				e - 24
			],
			[
				.9,
				1,
				e - 36
			]
		].forEach(([e, t, i]) => u.push({
			...$m(o, s, i, i),
			y0: e * n,
			y1: t * n,
			col: r
		})), d.crown = 16777215;
	} else if (e === "M3") {
		let e = i() < .5, t = Math.min(58, e ? l : c), a = i() < .5 ? -1 : 1, f = n - 12, p = (t, n, r) => e ? $m(o, s + t, r, n) : $m(o + t, s, n, r);
		u.push({
			...p(0, t, 34),
			y0: 0,
			y1: 13.5,
			col: 14737638,
			plain: !0
		}), u.push({
			...p(16 * a, 20, 28),
			y0: 13.5,
			y1: f,
			col: r
		}), u.push({
			...p(-16 * a, 20, 28),
			y0: 13.5,
			y1: 13.5 + (f - 13.5) * .85,
			col: r
		});
		let m = p(16 * a, .3, .3);
		d.mast = {
			x: (m.x0 + m.x1) / 2,
			z: (m.z0 + m.z1) / 2,
			y0: f,
			y1: n
		};
	} else if (e === "M4") {
		let e = a || [
			"sw",
			"se",
			"ne",
			"nw"
		][Math.floor(i() * 4)], o = Math.min(36, c, l), s = e[1] === "w" ? t.x0 + o / 2 : t.x1 - o / 2, f = e[0] === "s" ? t.z1 - o / 2 : t.z0 + o / 2;
		u.push({
			...$m(s, f, o, o),
			y0: 0,
			y1: n - 4,
			col: r,
			round: e
		}), u.push({
			...$m(s, f, 14, 14),
			y0: n - 4,
			y1: n,
			col: 16643818,
			plain: !0
		}), d.corner = e;
	} else {
		let e = [
			"n",
			"s",
			"e",
			"w"
		][Math.floor(i() * 4)], t = Math.min(14, (Math.min(c, l) - 30) / 2), a = o + (e === "e" ? t : e === "w" ? -t : 0), f = s + (e === "s" ? t : e === "n" ? -t : 0);
		u.push({
			...$m(a, f, 30, 30),
			y0: 0,
			y1: n,
			col: r
		}), d.plaza = e, d.helipad = i() < .2;
	}
	return {
		tiers: u,
		extra: d
	};
}
function th(e, t, { rng: n, hash2: r, overlap: i }) {
	if (e.edge || e.row.strip || nh.some((t) => i(t, e)) || rh.some((t) => i(t, e))) return;
	let a = {
		x: (e.x0 + e.x1) / 2,
		z: (e.z0 + e.z1) / 2
	}, o = n(e.seed), s = Km.find((e) => a.x >= e.x0 && a.x < e.x1 && a.z >= e.z0 && a.z < e.z1) || Km[0], c = {
		x0: e.x0 + 4,
		x1: e.x1 - 4,
		z0: e.z0 + 4,
		z1: e.z1 - 4
	}, l = Qm(e, Xm), u = 0;
	for (let e in s.shares) u += s.shares[e];
	let d = o() * u, f = "M1";
	for (let e in s.shares) if (d -= s.shares[e], d < 0) {
		f = e;
		break;
	}
	l && (f = "M4");
	let p = f === "M1" && o() < s.halves, m = c.x1 - c.x0 >= c.z1 - c.z0 || o() < .5;
	(p ? m ? [{
		...c,
		x1: a.x
	}, {
		...c,
		x0: a.x
	}] : [{
		...c,
		z1: a.z
	}, {
		...c,
		z0: a.z
	}] : [c]).forEach((i, o) => {
		let c = r(e.seed, o, 0), u = n(c), d = s.h[0], p = s.h[1];
		s.id === "the-exchange" && a.x > 500 && (d = 60, p = 120);
		let m = d + u() * (p - d);
		s.id === "radio-row" && o === 0 && Zm.some((t) => Qm(e, t)) && (m = 110), l && (m = 184);
		let h = Math.floor(m / zm), g = l ? Ym : qm[f][Math.floor(u() * qm[f].length)];
		m = l ? 184 : Math.min(220, h * zm);
		let { tiers: _, extra: v } = eh(f, i, m, g, u, l ? "sw" : null), y = _[0];
		t({
			id: `${e.id}:${o}`,
			zone: "meridian",
			hood: s.id,
			block: e.id,
			recipe: f,
			kit: Jm[f],
			...i,
			face: "s",
			sides: {
				n: !0,
				s: !0,
				e: !0,
				w: !0
			},
			seed: c,
			floors: h,
			h: m,
			wall: g,
			body: {
				x0: y.x0,
				x1: y.x1,
				z0: y.z0,
				z1: y.z1
			},
			tiers: _,
			...v
		});
	});
}
var nh = [{
	id: "spire",
	x0: -45,
	x1: 125,
	z0: -986,
	z1: -848,
	h: 260,
	body: 12111840,
	hood: "the-exchange"
}, {
	id: "cityhall",
	x0: -285,
	x1: -139,
	z0: -590,
	z1: -524,
	h: 38,
	body: 16249834,
	hood: "bayfront"
}], rh = [{
	id: "bayfront-park",
	x0: -361,
	x1: -219,
	z0: -510,
	z1: -368,
	ground: 4175978
}], ih = {
	id: "meridian",
	name: "Meridian",
	bounds: {
		x0: -800,
		x1: 800,
		z0: Im,
		z1: Lm
	},
	seed: 4102,
	roads: { lines: Um },
	lots: "grid",
	generator: "meridian",
	rows: Gm,
	kit: Jm,
	hoods: Km,
	split: th,
	hero: nh,
	reserved: rh,
	plazas: [...nh, ...rh].map(({ x0: e, x1: t, z0: n, z1: r }) => ({
		x0: e,
		x1: t,
		z0: n,
		z1: r
	})),
	landmarks: {
		spire: {
			x: 52,
			z: -900,
			w: 60,
			d: 60,
			h: 260,
			level: 0
		},
		"spire-circle": {
			x: 52,
			z: -837,
			w: 60,
			d: 60,
			h: 9,
			level: 0
		},
		cityhall: {
			x: -200,
			z: -560,
			w: 146,
			d: 66,
			h: 38,
			level: 0
		},
		"bayfront-park": {
			x: -300,
			z: -450,
			w: 142,
			d: 142,
			h: 8,
			level: 0
		},
		"savings-tower": {
			x: 96,
			z: -636,
			w: 36,
			d: 36,
			h: 184,
			level: 0
		}
	},
	places: [
		{
			id: "maison-sable",
			kind: "shop:clothes",
			x: 24,
			z: -636
		},
		{
			id: "second-wind-thrift-meridian",
			kind: "shop:thrift",
			x: -560,
			z: -880
		},
		{
			id: "storm-mart-meridian",
			kind: "shop:storm",
			x: 650,
			z: -478
		},
		{
			id: "birdbath-car-wash-meridian",
			kind: "carwash",
			x: 650,
			z: -1270
		},
		{
			id: "shell-yeah-city-hall",
			kind: "food",
			x: -170,
			z: -535
		},
		{
			id: "bay-cab-rank-spire",
			kind: "taxi",
			x: 86,
			z: -837
		},
		{
			id: "bay-cab-rank-city-hall",
			kind: "taxi",
			x: -150,
			z: -520
		},
		{
			id: "bay-cab-rank-uptown",
			kind: "taxi",
			x: -92,
			z: -1240
		},
		{
			id: "spire-service-dock",
			kind: "mission",
			x: 52,
			z: -980
		}
	],
	traffic: {
		tarpon: 4,
		taxi: 3,
		pompano: 2,
		hogfish: 1,
		snook: 2,
		grouper: 2,
		pinfish: 2,
		manatee: 1,
		heron: 1,
		gallinule: 1,
		sturgeon: 1
	},
	peds: {
		"office worker": 6,
		tourist: 2,
		retiree: 1
	},
	ambience: "city",
	palette: "meridian"
}, ah = /* @__PURE__ */ t({
	HOT: () => ph,
	default: () => Oh
}), oh = (e) => e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-"), sh = -2e3, ch = -800, lh = -1440, uh = -320, dh = -1397, fh = -357, ph = [
	16757575,
	3065014,
	16740241,
	11920524
], mh = [
	[
		-1972,
		"Mangrove Avenue",
		"avenue"
	],
	[-1892, "Calle Caimito"],
	[-1812, "Calle Azucena"],
	[-1732, "Calle Guanábana"],
	[
		-1652,
		"Avenida Campana",
		"avenue"
	],
	[-1572, "Calle Níspero"],
	[-1492, "Calle Clavel"],
	[-1412, "Calle Mamey"],
	[
		-1332,
		"Avenida Mercado",
		"avenue"
	],
	[-1252, "Calle Guayaba"],
	[-1172, "Calle Gardenia"],
	[-1092, "Calle Jazmín"],
	[
		-1012,
		"Avenida Rosa",
		"avenue"
	],
	[-932, "Calle Orquídea"],
	[-852, "Calle Papaya"]
], hh = [
	[
		fh,
		"Flamingo Avenue",
		"avenue"
	],
	[-437, "Calle Uno"],
	[-517, "Calle Dos"],
	[-597, "Calle Tres"],
	[
		-677,
		"Commerce Way",
		"avenue"
	],
	[-757, "Calle Cinco"],
	[-837, "Calle Seis"],
	[-917, "Calle Siete"],
	[
		-997,
		"Tower Way",
		"avenue"
	],
	[-1077, "Calle Nueve"],
	[-1157, "Calle Diez"],
	[-1237, "Calle Once"],
	[
		-1317,
		"Union Avenue",
		"avenue"
	],
	[dh, "Calle Trece"]
], gh = { "Calle Mamey": [[-917, -837]] }, _h = [];
for (let [e, t, n = "street"] of mh) _h.push({
	id: oh(t),
	pid: "palmavieja:" + oh(t),
	name: t,
	axis: "ns",
	at: e,
	from: dh,
	to: e >= -1572 ? uh : fh,
	kind: n,
	closed: gh[t] || []
});
for (let [e, t, n = "street"] of hh) _h.push({
	id: oh(t),
	pid: "palmavieja:" + oh(t),
	name: t,
	axis: "ew",
	at: e,
	from: -1972,
	to: ch,
	kind: n,
	closed: []
});
var vh = (e) => e === "avenue" ? 11 : 7, yh = [{
	id: "S",
	z0: -346,
	z1: uh,
	strip: !0
}];
for (let e = 0; e < hh.length - 1; e++) yh.push({
	id: "R" + e,
	z0: hh[e + 1][0] + vh(hh[e + 1][2]),
	z1: hh[e][0] - vh(hh[e][2])
});
yh.push({
	id: "N",
	z0: lh,
	z1: -1404,
	strip: !0
});
var bh = [
	{
		id: "los-patios",
		name: "Los Patios",
		x0: sh,
		x1: ch,
		z0: lh,
		z1: -1100,
		frontage: [14, 18],
		three: .25,
		bulbs: 2
	},
	{
		id: "el-bajo",
		name: "El Bajo",
		x0: sh,
		x1: ch,
		z0: -600,
		z1: uh,
		frontage: [16, 22],
		three: .2,
		bulbs: 1
	},
	{
		id: "la-plaza",
		name: "La Plaza",
		x0: sh,
		x1: -1100,
		z0: -1100,
		z1: -600,
		frontage: [8, 12],
		three: .6,
		bulbs: 6
	},
	{
		id: "calle-mural",
		name: "Calle Mural",
		x0: -1100,
		x1: ch,
		z0: -1100,
		z1: -600,
		frontage: [8, 12],
		three: .5,
		bulbs: 6
	}
], xh = { P1: {
	recipe: "shop-house",
	floors: [2, 3]
} }, Sh = [{
	id: "domino-park",
	x0: -1485,
	x1: -1343,
	z0: -910,
	z1: -844,
	h: 9,
	body: 3120728,
	hood: "la-plaza"
}, {
	id: "bell-tower",
	x0: -1405,
	x1: -1343,
	z0: -986,
	z1: -924,
	h: 34,
	body: 16643818,
	hood: "la-plaza"
}], Ch = 16, wh = /* @__PURE__ */ new Map(), Th = (e, t) => Math.floor((e + 3200) / 160) + 64 * Math.floor((t + 3520) / 160);
function Eh(e, t, { rng: n, hash2: r, overlap: i }) {
	if (e.row.strip || e.x1 - e.x0 < 30 || Sh.some((t) => i(t, e))) return;
	let a = {
		x: (e.x0 + e.x1) / 2,
		z: (e.z0 + e.z1) / 2
	}, o = n(e.seed), s = bh.find((e) => a.x >= e.x0 && a.x < e.x1 && a.z >= e.z0 && a.z < e.z1) || bh[0], c = e.x0 + 4, l = e.edge ? e.x1 : e.x1 - 4, u = l - c, d = 0;
	for (let [i, f, p] of [[
		e.z0 + 4,
		a.z - 2,
		"n"
	], [
		a.z + 2,
		e.z1 - 4,
		"s"
	]]) {
		let a = Math.max(1, Math.round(u / ((s.frontage[0] + s.frontage[1]) / 2))), m = Array.from({ length: a }, () => .85 + o() * .3), h = m.reduce((e, t) => e + t, 0), g = [], _ = c, v = -1;
		m.forEach((t, o) => {
			let c = o === a - 1 ? l : _ + t / h * u, m = r(e.seed, d, 0), y = n(m), b = y() < s.three ? 3 : 2, x = 3.6 + 3 * (b - 1) + .6, S;
			do
				S = Math.floor(y() * 4);
			while (S === v);
			v = S;
			let C = {
				id: `${e.id}:${d}`,
				zone: "palmavieja",
				hood: s.id,
				block: e.id,
				recipe: "P1",
				kit: xh.P1,
				x0: _,
				x1: c,
				z0: i,
				z1: f,
				face: p,
				sides: {
					w: o === 0,
					e: o === a - 1 && !e.edge,
					n: p === "n",
					s: p === "s"
				},
				seed: m,
				floors: b,
				h: x,
				wall: ph[S],
				accent: ph[(S + 1 + Math.floor(y() * 3)) % 4],
				body: p === "s" ? {
					x0: _,
					x1: c,
					z0: f - 20,
					z1: f
				} : {
					x0: _,
					x1: c,
					z0: i,
					z1: i + 20
				}
			};
			if ((C.sides.w || C.sides.e) && y() < .4) {
				let e = Th((_ + c) / 2, (i + f) / 2), t = wh.get(e) || 0;
				wh.set(e, t + 2), C.mural = {
					side: C.sides.w ? "w" : "e",
					seed: 3301 + t % Ch,
					cells: 2
				};
			}
			g.push(C), d++, _ = c;
		}), g.forEach((e, n) => {
			e.wallW = n === 0 || e.h > g[n - 1].h, e.wallE = n === g.length - 1 || e.h > g[n + 1].h, t(e);
		});
	}
}
var Dh = {
	traffic: {
		flounder: 3,
		mullet: 3,
		pompano: 3,
		pinfish: 3,
		tarpon: 2,
		possum: 2,
		snook: 2,
		hogfish: 1,
		manatee: 1,
		ibis: 1,
		taxi: 1,
		conch: 1
	},
	peds: {
		retiree: 8,
		tourist: 6,
		"office worker": 1
	}
}, Oh = {
	id: "palmavieja",
	name: "Palma Vieja",
	bounds: {
		x0: sh,
		x1: ch,
		z0: lh,
		z1: uh
	},
	seed: 3301,
	roads: { lines: _h },
	lots: "grid",
	generator: "palmavieja",
	rows: yh,
	kit: xh,
	hoods: bh,
	split: Eh,
	hero: Sh,
	reserved: [],
	plazas: [{
		x0: -1485,
		x1: -1343,
		z0: -910,
		z1: -844
	}],
	landmarks: {
		"domino-park": {
			x: -1400,
			z: -880,
			w: 142,
			d: 66,
			h: 9,
			level: 0
		},
		"bell-tower": {
			x: -1350,
			z: -960,
			w: 8,
			d: 8,
			h: 34,
			level: 0
		}
	},
	places: [
		{
			id: "ventanita-rosa",
			kind: "coffee",
			x: -1020,
			z: -640
		},
		{
			id: "flat-over-the-bakery",
			kind: "property",
			x: -960,
			z: -800
		},
		{
			id: "second-wind-thrift-palma",
			kind: "shop:thrift",
			x: -1130,
			z: -720
		},
		{
			id: "storm-mart-palma",
			kind: "shop:storm",
			x: -1600,
			z: -1180
		},
		{
			id: "birdbath-car-wash-palma",
			kind: "carwash",
			x: -1450,
			z: -478
		},
		{
			id: "rafas-table",
			kind: "mission",
			x: -1400,
			z: -880
		},
		{
			id: "bay-cab-rank-domino-park",
			kind: "taxi",
			x: -1343,
			z: -880
		}
	],
	traffic: Dh.traffic,
	peds: Dh.peds,
	night: {
		traffic: {
			flounder: 3,
			mullet: 1,
			pinfish: 1,
			tarpon: 2,
			possum: 1,
			snook: 1,
			ibis: 1,
			taxi: 2
		},
		peds: {
			retiree: 1,
			tourist: 1,
			clubber: 2
		},
		cap: .4
	},
	streetSpeed: 8.3,
	parked: .45,
	hangOut: .5,
	ambience: "oldtown",
	palette: "palmavieja"
}, kh = /* @__PURE__ */ t({ default: () => Ih }), Ah = [
	"Limpet Street",
	"Dunlin Street",
	"Cockle Street",
	"Curlew Avenue",
	"Whimbrel Street",
	"Periwinkle Street",
	"Cowrie Street",
	"Rosa Street",
	"Scallop Street",
	"Fulmar Street",
	"Murex Street",
	"Willet Avenue",
	"Junonia Street",
	"Dowitcher Street",
	"Nautilus Street",
	"Egret Avenue",
	"Tellin Street",
	"Gannet Street",
	"Auger Street",
	"Plaza Street"
], jh = [
	"Coral Boulevard",
	"Wentletrap Street",
	"Kittiwake Street",
	"Angelwing Street",
	"Sandbar Avenue",
	"Oystercatcher Street",
	"Jingle Street",
	"Sundial Street",
	"Turnstone Avenue",
	"Nerite Street",
	"Petrel Street",
	"Abalone Street",
	"Avocet Avenue",
	"Shearwater Street",
	"Moon Snail Street",
	"Surfbird Street",
	"Godwit Avenue",
	"Cerith Street",
	"Yellowlegs Street",
	"Barnacle Street"
], Mh = [
	-1332,
	-1012,
	-692,
	-372,
	372,
	692,
	1012,
	1332
], Nh = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-"), Ph = [], Fh = (e, t) => {
	let n = {
		id: Nh(t),
		name: t,
		axis: "ns",
		at: e,
		from: -320,
		to: 37,
		kind: Mh.includes(e) ? "avenue" : "street",
		closed: []
	};
	e === 52 && Object.assign(n, {
		id: "coral-blvd",
		kind: "boulevard",
		widths: [{
			from: -320,
			to: -44,
			width: 30
		}, {
			from: -44,
			to: 37,
			width: 14
		}]
	}), e === -1252 && n.closed.push([-277, -197]), e === 1252 && n.closed.push([-117, -37]), Ph.push(n);
};
Ah.forEach((e, t) => Fh(-1572 + 80 * t, e)), jh.forEach((e, t) => Fh(52 + 80 * t, e)), Ph.push({
	id: "heron-walk-drive",
	name: "Heron Walk Drive",
	axis: "ew",
	at: 37,
	from: -1600,
	to: 1600,
	kind: "boulevard",
	width: 14,
	closed: []
});
for (let [e, t] of [
	[-37, "Seagrape Street"],
	[-117, "Conch Street"],
	[-197, "Driftwood Street"],
	[-277, "Urchin Street"]
]) Ph.push({
	id: Nh(t),
	name: t,
	axis: "ew",
	at: e,
	from: -1600,
	to: 1600,
	kind: "street",
	closed: []
});
var Ih = {
	id: "tideline",
	name: "Tideline",
	bounds: {
		x0: -1600,
		x1: 1600,
		z0: -320,
		z1: 130
	},
	seed: 2611,
	roads: { lines: Ph },
	lots: "grid",
	generator: "tideline",
	rows: [
		{
			id: "A",
			z0: -30,
			z1: 30,
			rows: 2
		},
		{
			id: "B",
			z0: -110,
			z1: -44,
			rows: 2
		},
		{
			id: "C",
			z0: -190,
			z1: -124,
			rows: 2
		},
		{
			id: "D",
			z0: -270,
			z1: -204,
			rows: 2
		},
		{
			id: "E",
			z0: -320,
			z1: -284,
			rows: 1
		}
	],
	kit: {
		T1: {
			recipe: "deco-hotel",
			w: [13, 19],
			d: 26,
			floors: [3, 6],
			rowA: !0
		},
		T2: {
			recipe: "motel-pool",
			w: [44, 44],
			d: 29,
			floors: [2, 2],
			floor: 3,
			rowA: !1
		},
		T3: {
			recipe: "deco-hotel",
			preset: "slab",
			w: [40, 40],
			d: 22,
			floors: [8, 11],
			rowA: !0
		},
		T4: {
			recipe: "stilt-shack",
			preset: "beach-shack",
			w: [13, 16],
			d: 26,
			floors: [1, 1],
			rowA: !0
		},
		T5: {
			recipe: "warehouse",
			preset: "gable",
			w: [16, 22],
			d: 26,
			floors: [1, 1],
			rowA: !1
		},
		empty: {
			recipe: "fenced-lot",
			w: [24, 30],
			d: 26,
			floors: [0, 0],
			rowA: !0
		}
	},
	hoods: [
		{
			id: "west-end",
			name: "West End",
			x0: -1600,
			x1: -900,
			frontage: [14, 22],
			shares: {
				T5: 30,
				T1: 35,
				T2: 20,
				T4: 15
			}
		},
		{
			id: "motel-row",
			name: "Motel Row",
			x0: -900,
			x1: -300,
			frontage: [13, 19],
			shares: {
				T2: 45,
				T1: 45,
				T4: 10
			}
		},
		{
			id: "the-strand",
			name: "The Strand",
			x0: -300,
			x1: 400,
			frontage: [13, 19],
			shares: {
				T1: 65,
				T3: 30,
				T4: 5
			}
		},
		{
			id: "pier-quarter",
			name: "Pier Quarter",
			x0: 400,
			x1: 1e3,
			frontage: [13, 19],
			shares: {
				T1: 85,
				T4: 15
			}
		},
		{
			id: "east-strand",
			name: "East Strand",
			x0: 1e3,
			x1: 1600,
			frontage: [13, 19],
			shares: {
				empty: 30,
				T1: 55,
				T3: 10,
				T4: 5
			}
		}
	],
	hero: [{
		id: "day1-block",
		x0: -45,
		x1: 45,
		z0: -30,
		z1: 30,
		h: 26.2
	}, ...[
		[9429967, 16727972],
		[3033707, 16643818],
		[16763279, 6160283],
		[13215999, 16752686],
		[10474239, 16734810],
		[16748410, 2733798],
		[16752309, 2746111],
		[16773577, 11824127],
		[8378088, 16752686],
		[16249834, 16727972],
		[12116179, 16734810]
	].map(([e, t], n) => ({
		id: "lifeguard-hut",
		key: "hut" + n,
		x0: 34 + 300 * (n - 5) - 1.7,
		x1: 34 + 300 * (n - 5) + 1.7,
		z0: 61.3,
		z1: 64.7,
		h: 4.7,
		body: e,
		roof: t,
		beach: !0
	}))],
	reserved: [{
		id: "pelican-rest",
		x0: -1321,
		x1: -1179,
		z0: -270,
		z1: -204,
		ground: 15916464
	}, {
		id: "phase-one",
		x0: 1179,
		x1: 1321,
		z0: -110,
		z1: -44,
		ground: 12166538
	}],
	promenade: {
		z0: 44,
		z1: 50,
		gaps: [[592, 608], [-1160, -1140]]
	},
	landmarks: {
		"day1-block": {
			x: 0,
			z: 0,
			w: 90,
			d: 60,
			h: 26.2,
			level: 0
		},
		"heron-walk": {
			x: 0,
			z: 47,
			w: 3200,
			d: 6,
			h: 10.5,
			level: 0
		},
		"gullwing-pier": {
			x: 600,
			z: 255,
			w: 16,
			d: 350,
			h: 53,
			level: 0
		},
		"pelican-rest": {
			x: -1250,
			z: -220,
			w: 142,
			d: 66,
			h: 5,
			level: 0
		},
		"phase-one": {
			x: 1300,
			z: -60,
			w: 142,
			d: 66,
			h: 92,
			level: 0
		},
		"lifeguard-huts": {
			x: 34,
			z: 63,
			w: 3.4,
			d: 3.4,
			h: 4.7,
			level: 0
		}
	},
	places: [
		{
			id: "park-and-sons",
			kind: "garage",
			x: 340,
			z: -230
		},
		{
			id: "pelican-rest-trailer",
			kind: "property",
			x: -1250,
			z: -220
		},
		{
			id: "tideline-motel-12",
			kind: "property",
			x: -520,
			z: -60
		},
		{
			id: "second-wind-thrift",
			kind: "shop:thrift",
			x: -840,
			z: -76
		},
		{
			id: "storm-mart",
			kind: "shop:storm",
			x: 480,
			z: -156
		},
		{
			id: "birdbath-car-wash",
			kind: "carwash",
			x: -470,
			z: -236
		},
		{
			id: "shell-yeah",
			kind: "food",
			x: 118,
			z: 47
		},
		{
			id: "squeeze-play",
			kind: "food",
			x: -206,
			z: 47
		},
		{
			id: "west-marina",
			kind: "marina",
			x: -1150,
			z: 110
		},
		{
			id: "bay-cab-rank",
			kind: "taxi",
			x: 300,
			z: 26
		}
	],
	traffic: {
		tern: 4,
		pinfish: 4,
		taxi: 3,
		tarpon: 3,
		snook: 3,
		heron: 2,
		sailfin: 1,
		grouper: 2,
		pompano: 2,
		mullet: 1,
		manatee: 1,
		conch: 1
	},
	peds: {
		beachgoer: 6,
		tourist: 5,
		jogger: 1,
		retiree: 2,
		skater: 2,
		"office worker": 1
	},
	ambience: "beach",
	palette: "tideline"
}, Lh = {
	x0: -3200,
	x1: 3200,
	z0: -3520,
	z1: 1280
}, Rh = .14, zh = 20261111, Bh = {
	street: {
		width: 14,
		speed: 11.1
	},
	avenue: {
		width: 22,
		speed: 16.7
	},
	boulevard: {
		width: 30,
		speed: 19.4
	}
}, Vh = [
	16752309,
	9429967,
	16763279,
	10474239,
	16773577,
	13215999,
	16748410,
	8378088,
	16249834
], Hh = {
	T2: [
		9429967,
		16763279,
		8378088
	],
	T3: [
		16752309,
		16773577,
		10474239
	],
	T4: [
		16748410,
		8378088,
		16773577
	],
	T5: [16249834, 9429967]
}, Uh = /* #__PURE__ */ Object.assign({
	"./zones/mallardgreens.js": Ho,
	"./zones/meridian.js": Pm,
	"./zones/northgate.js": rc,
	"./zones/paintworks.js": tl,
	"./zones/palmavieja.js": ah,
	"./zones/rustwater.js": Xl,
	"./zones/tideline.js": kh
}), Wh = (e) => Math.floor((e - Lh.x0) / 160), Gh = (e) => Math.floor((e - Lh.z0) / 160), Kh = (e, t) => e + t * 64, qh = (e, t, n) => t >= e.x0 && t <= e.x1 && n >= e.z0 && n <= e.z1, Jh = (e, t) => e.x0 < t.x1 && e.x1 > t.x0 && e.z0 < t.z1 && e.z1 > t.z0;
function Yh() {
	let e = Object.values(Uh).map((e) => e.default), t = [], n = /* @__PURE__ */ new Map(), r = [], i = [], a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = (e, t, n, r) => {
		let i = Kh(Wh(t), Gh(n));
		e.has(i) || e.set(i, []), e.get(i).push(r);
	}, l = (e, t) => {
		if (e.widths) {
			for (let n of e.widths) if (t >= n.from && t <= n.to) return n.width;
		}
		return e.width || Bh[e.kind].width;
	};
	for (let i of e) {
		let e = i.roads.lines, o = e.filter((e) => e.axis === "ns").sort((e, t) => e.at - t.at), u = e.filter((e) => e.axis === "ew").sort((e, t) => e.at - t.at);
		i.ns = o, i.ew = u, i.nsAt = o.map((e) => e.at);
		for (let r of e) {
			let e = (r.axis === "ns" ? u : o).filter((e) => e.at >= r.from && e.at <= r.to && r.at >= e.from && r.at <= e.to), s = r.cuts || [], d = [.../* @__PURE__ */ new Set([
				r.from,
				...e.map((e) => e.at),
				...s,
				r.to
			])].sort((e, t) => e - t), f = (t) => s.includes(t) || e.some((e) => e.at === t);
			for (let e = 0; e < d.length - 1; e++) {
				let o = d[e], s = d[e + 1], u = (o + s) / 2;
				if (r.closed.some(([e, t]) => u > e && u < t)) continue;
				let p = l(r, u), m = r.axis === "ns", h = r.parts && r.parts.find((e) => u >= e.from && u <= e.to) || r, g = {
					id: (r.pid || r.id) + ":" + e,
					roadId: h.id || r.id,
					name: h.name,
					kind: h.kind,
					axis: r.axis,
					zone: i.id,
					ax: m ? r.at : o,
					az: m ? o : r.at,
					bx: m ? r.at : s,
					bz: m ? s : r.at,
					width: p,
					lanes: p >= 30 ? 3 : p >= 22 ? 2 : 1,
					speed: Bh[h.kind].speed,
					level: 0,
					a: f(o) ? m ? r.at + "," + o : o + "," + r.at : null,
					b: f(s) ? m ? r.at + "," + s : s + "," + r.at : null
				};
				g.len = s - o, g.stub = !g.a || !g.b, t.push(g), c(a, (g.ax + g.bx) / 2, (g.az + g.bz) / 2, g);
				for (let [e, t, i] of [[
					g.a,
					g.ax,
					g.az
				], [
					g.b,
					g.bx,
					g.bz
				]]) {
					if (!e) continue;
					n.has(e) || n.set(e, {
						key: e,
						x: t,
						z: i,
						pieces: [],
						signal: !1,
						half: {
							ns: 7,
							ew: 7
						}
					});
					let a = n.get(e);
					a.pieces.push(g), a.half[r.axis] = Math.max(a.half[r.axis], p / 2);
				}
			}
		}
		i.rows.forEach((e, t) => {
			let n = (e.z0 + e.z1) / 2;
			for (let a = 0; a <= o.length; a++) {
				let u = o[a - 1], d = o[a], f = u ? u.at + l(u, n) / 2 : i.bounds.x0, h = d ? d.at - l(d, n) / 2 : i.bounds.x1, g = {
					id: `${i.id}:${a}:${e.id}`,
					zone: i,
					row: e,
					ci: a,
					ri: t,
					x0: f,
					x1: h,
					z0: e.z0,
					z1: e.z1,
					seed: mi(i.seed, a, t),
					edge: !u || !d
				};
				r.push(g), c(s, (f + h) / 2, n, g), i.split ? i.split(g, p, {
					rng: pi,
					hash2: mi,
					overlap: Jh
				}) : m(i, g);
			}
		});
		for (let e of i.hero) p({
			...e,
			id: `${i.id}:${e.key || e.id}`,
			zone: i.id,
			hero: e.id,
			recipe: "hero",
			body: e,
			wall: e.body || 16643818,
			seed: mi(i.seed, e.x0 | 0, 7),
			sides: {
				n: !0,
				s: !0,
				e: !0,
				w: !0
			}
		});
		for (let e of i.lotList || []) p(e);
		for (let e of i.reserved) p({
			...e,
			id: `${i.id}:${e.id}`,
			zone: i.id,
			reserved: e.id,
			recipe: "reserved",
			body: null,
			h: 0,
			seed: 0,
			sides: {}
		});
	}
	let u = ja(), d = [...Aa().map((e) => ["decks", e])];
	for (let t of e) for (let e of t.paths || []) d.push([t.id, e]);
	for (let [e, r] of d) for (let i = 0; i < r.pts.length - 1; i++) {
		let [o, s, l = 0] = r.pts[i], [u, d, f = 0] = r.pts[i + 1], p = {
			id: r.id + ":" + i,
			roadId: r.id,
			name: r.name,
			kind: r.kind,
			axis: "free",
			free: !0,
			zone: e,
			ax: o,
			az: s,
			bx: u,
			bz: d,
			ay: l,
			by: f,
			len: Math.hypot(u - o, d - s),
			width: r.width,
			lanes: r.lanes || 1,
			offsets: r.offsets,
			speed: r.speed,
			level: r.level || 0,
			a: o + "," + s,
			b: u + "," + d,
			stub: !1,
			oneWay: !!r.oneWay
		};
		t.push(p), c(a, (o + u) / 2, (s + d) / 2, p);
		for (let [e, t, r] of [[
			p.a,
			o,
			s
		], [
			p.b,
			u,
			d
		]]) n.has(e) || n.set(e, {
			key: e,
			x: t,
			z: r,
			pieces: [],
			signal: !1,
			half: {
				ns: 1e6,
				ew: 1e6
			},
			free: !0
		}), n.get(e).pieces.push(p);
	}
	let f = /* @__PURE__ */ new Map();
	for (let e of t) for (let [t, r, i] of [[
		"a",
		e.ax,
		e.az
	], [
		"b",
		e.bx,
		e.bz
	]]) {
		if (e[t] || e.free) continue;
		let a = r + "," + i, o = f.get(a);
		n.has(a) && n.get(a).free ? (n.get(a).pieces.push(e), e[t] = a, e.stub = !e.a || !e.b) : o ? o[0].zone !== e.zone && o[0].axis === e.axis && (n.set(a, {
			key: a,
			x: r,
			z: i,
			pieces: [o[0], e],
			signal: !1,
			half: {
				ns: 0,
				ew: 0
			},
			seam: !0
		}), o[0][o[1]] = a, e[t] = a, o[0].stub = !o[0].a || !o[0].b, e.stub = !e.a || !e.b) : f.set(a, [e, t]);
	}
	for (let e of n.values()) {
		let t = new Set(e.pieces.map((e) => e.axis + (e.kind === "street" ? "" : "!")));
		e.signal = t.has("ns!") && t.has("ew!");
	}
	function p(e) {
		return i.push(e), c(o, (e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2, e), e;
	}
	function m(e, t) {
		if (t.edge || t.x1 - t.x0 < 30 || e.hero.some((e) => !e.beach && Jh(e, t)) || e.reserved.some((e) => Jh(e, t))) return;
		let n = pi(t.seed), r = e.hoods.find((e) => (t.x0 + t.x1) / 2 < e.x1) || e.hoods[e.hoods.length - 1], i = t.x0 + 4, a = t.x1 - 4, o = t.z0 + 4, s = t.z1 - 4, c = t.row.id === "A", l = t.row.rows === 2 ? [[
			o,
			(o + s) / 2,
			"n"
		], [
			(o + s) / 2,
			s,
			"s"
		]] : [[
			o,
			s,
			"s"
		]], u = 0;
		for (let e in r.shares) u += r.shares[e];
		let d = 0;
		for (let [o, s, f] of l) {
			let l = i;
			for (; a - l > 1;) {
				let m = n() * u, h = "T1";
				for (let e in r.shares) if (m -= r.shares[e], m < 0) {
					h = e;
					break;
				}
				let g = e.kit[h], _ = a - l;
				(c && !g.rowA || g.w[0] > _) && (h = "T1", g = e.kit.T1);
				let v = h === "T1" ? r.frontage[0] : g.w[0], y = h === "T1" ? r.frontage[1] : g.w[1], b = v + n() * (y - v);
				_ - b < 13 && (b = _);
				let x = {
					id: `${t.id}:${d}`,
					zone: e.id,
					hood: r.id,
					block: t.id,
					recipe: h,
					kit: g,
					x0: l,
					x1: l + b,
					z0: o,
					z1: s,
					face: f,
					sides: {
						w: l === i,
						e: l + b >= a - .01,
						n: f === "n",
						s: f === "s"
					},
					seed: mi(t.seed, d, 0)
				}, S = pi(x.seed), C = g.floors[0] + Math.floor(S() * (g.floors[1] - g.floors[0] + 1)), w = Hh[h] || Vh;
				x.floors = C, x.wall = w[Math.floor(S() * w.length)], x.h = h === "empty" ? 0 : h === "T1" || h === "T3" ? 4.4 + 3.2 * (C - 1) : h === "T2" ? 6.6 : h === "T5" ? 3.4 : 3;
				let T = Math.min(g.d, s - o), E = x.sides.w ? 0 : .1, D = x.sides.e ? 0 : .1, O = l + E, k = l + b - D, A = 0;
				if (h === "T4") {
					let e = l + b / 2;
					O = e - 4, k = e + 4, A = 1;
				}
				if (h === "T5") {
					let e = l + b / 2;
					O = e - 7, k = e + 7, A = 2;
				}
				let ee = h === "T4" ? 6 : h === "T5" ? 10 : T;
				x.body = h === "empty" ? null : f === "s" ? {
					x0: O,
					x1: k,
					z0: s - A - ee,
					z1: s - A
				} : {
					x0: O,
					x1: k,
					z0: o + A,
					z1: o + A + ee
				}, p(x), d++, l += b;
			}
		}
	}
	let h = (t, n) => {
		for (let r of e) if (qh(r.bounds, t, n)) return r;
		return null;
	}, g = (e, t) => {
		let n = h(e, t);
		return n && n.quay ? e <= n.quay.x1 && t <= n.quay.z1 ? 1 : -1 : 0;
	};
	function _(e, t) {
		let n = h(e, t);
		if (!n) return null;
		let r = n.rows.find((e) => t >= e.z0 && t <= e.z1);
		if (!r) return null;
		let i = 0, a = n.nsAt.length;
		for (; i < a;) {
			let t = i + a >> 1;
			n.nsAt[t] < e ? i = t + 1 : a = t;
		}
		let o = (r.z0 + r.z1) / 2, s = n.ns[i - 1], c = n.ns[i], u = s ? s.at + l(s, o) / 2 : n.bounds.x0, d = c ? c.at - l(c, o) / 2 : n.bounds.x1;
		return e >= u && e <= d ? {
			x0: u,
			x1: d,
			z0: r.z0,
			z1: r.z1
		} : null;
	}
	let v = (e, t) => {
		let n = h(e, t), r = n && n.promenade;
		return !!r && t >= r.z0 && t <= r.z1 && !r.gaps.some(([t, n]) => e > t && e < n);
	};
	function y(e, t, n, r) {
		let i = Wh(t), a = Gh(n);
		for (let t = -1; t <= 1; t++) for (let n = -1; n <= 1; n++) {
			let o = e.get(Kh(i + t, a + n));
			if (o) for (let e of o) r(e);
		}
	}
	function b(e, t) {
		let n = null, r = Infinity, i = 0, o = 0;
		return y(a, e, t, (a) => {
			let s = a.bx - a.ax, c = a.bz - a.az, l = Math.max(0, Math.min(1, ((e - a.ax) * s + (t - a.az) * c) / (a.len * a.len))), u = a.ax + s * l, d = a.az + c * l, f = Math.hypot(u - e, d - t);
			f < r && (r = f, n = a, i = u, o = d);
		}), n && {
			piece: n,
			x: i,
			z: o,
			d: r
		};
	}
	let x = {
		chunk: 160,
		world: Lh,
		zones: e,
		pieces: t,
		nodes: n,
		blocks: r,
		lots: i,
		decks: u,
		snapFailures: [],
		bounds: {
			x0: e.reduce((e, t) => Math.min(e, t.bounds.x0), 0) + 7,
			x1: e.reduce((e, t) => Math.max(e, t.bounds.x1), 0) - 7,
			z0: e.reduce((e, t) => Math.min(e, t.bounds.z0), -320) + 6,
			z1: 84.5
		},
		spawn: {
			x: -24,
			z: 40.5,
			h: Math.PI / 2
		},
		chunkOf: (e, t) => ({
			cx: Wh(e),
			cz: Gh(t)
		}),
		chunkRect: (e, t) => ({
			x0: Lh.x0 + e * 160,
			x1: Lh.x0 + (e + 1) * 160,
			z0: Lh.z0 + t * 160,
			z1: Lh.z0 + (t + 1) * 160
		}),
		inWorld: (e, t) => e >= 0 && e < 40 && t >= 0 && t < 30,
		chunkSeed: (e, t) => mi(zh, e, t),
		zone: (t) => e.find((e) => e.id === t) || null,
		zoneAt: h,
		districtAt: (e, t) => {
			let n = h(e, t);
			return n ? n.id : null;
		},
		neighbourhoodAt(e, t) {
			let n = h(e, t), r = n && n.hoods.find((n) => e >= n.x0 && e < n.x1 && (n.z0 === void 0 || t >= n.z0 && t < n.z1));
			return r ? r.id : null;
		},
		isLand: (e, t) => {
			let n = g(e, t);
			return n ? n > 0 : qh(Lh, e, t) && t <= 80;
		},
		depthAt: (e, t) => x.isLand(e, t) ? 0 : Math.max(0, -x.heightAt(e, t)),
		heightAt(e, t, n) {
			if (t < -1440 && t > -1520) {
				let r = u.heightAt(e, t, n);
				if (r !== null) return r;
			}
			let r = g(e, t);
			if (r < 0) return -6;
			if (r > 0 && t >= 44) return 0;
			if (t > 72) return .02 - (t - 72) / 28;
			if (t > 50) return .02;
			if (t >= 44) return v(e, t) ? Rh : 0;
			if (_(e, t)) return Rh;
			let i = h(e, t);
			return i && i.plazas && i.plazas.some((n) => qh(n, e, t)) ? Rh : 0;
		},
		surfaceAt(e, t, n) {
			if (t < -1440 && t > -1520 && u.heightAt(e, t, n) !== null) return "deck";
			let r = g(e, t);
			if (r) return r < 0 ? "water" : x.heightAt(e, t) > .05 ? "sidewalk" : "road";
			if (t > 80) return "water";
			if (t > 50) return "sand";
			let i = h(e, t);
			return i ? i.surfaceAt ? i.surfaceAt(e, t, x) : x.heightAt(e, t) > .05 ? "sidewalk" : "road" : "dirt";
		},
		blockAt: _,
		lotsInChunk: (e, t) => o.get(Kh(e, t)) || [],
		roadsInChunk: (e, t) => a.get(Kh(e, t)) || [],
		blocksInChunk: (e, t) => s.get(Kh(e, t)) || [],
		landmark(t) {
			for (let n of e) if (n.landmarks[t]) return n.landmarks[t];
			return null;
		},
		places(t) {
			let n = [];
			for (let r of e) for (let e of r.places) t && e.kind !== t || n.push({
				...e,
				district: r.id
			});
			return n;
		},
		nearestRoad(e, t) {
			let n = b(e, t);
			if (!n) return null;
			let r = n.piece;
			return {
				x: n.x,
				z: n.z,
				heading: Math.atan2(r.bx - r.ax, r.bz - r.az),
				roadId: r.roadId,
				name: r.name,
				kind: r.kind,
				width: r.width,
				d: n.d
			};
		},
		roadAt(e, t) {
			let n = x.nearestRoad(e, t);
			return n && n.d <= n.width / 2 ? n : null;
		},
		snap(e, t) {
			let { x: n, z: r } = e, i = null;
			if (t === "road" || t === "curb" || t === "sidewalk") {
				let e = b(n, r);
				if (e && (e.d <= 25 || t === "road")) {
					let a = e.piece, o = t === "road" ? 0 : a.width / 2 + (t === "curb" ? -1.2 : 1.5), s = a.axis === "ns" ? n >= a.ax ? 1 : -1 : r >= a.az ? 1 : -1;
					if (a.free) {
						let t = -(a.bz - a.az) / a.len, s = (a.bx - a.ax) / a.len, c = (n - e.x) * t + (r - e.z) * s >= 0 ? 1 : -1;
						i = {
							x: e.x + t * c * o,
							z: e.z + s * c * o
						};
					} else i = a.axis === "ns" ? {
						x: a.ax + s * o,
						z: e.z
					} : {
						x: e.x,
						z: a.az + s * o
					};
				}
			} else if (t === "lot") {
				let e = 25;
				y(o, n, r, (t) => {
					let a = Math.max(t.x0, Math.min(n, t.x1)), o = Math.max(t.z0, Math.min(r, t.z1)), s = Math.hypot(a - n, o - r);
					s < e && (e = s, i = {
						x: a,
						z: o
					});
				});
			} else t === "sand" ? r > 25 && r < 97 && (i = {
				x: n,
				z: Math.max(52, Math.min(r, 71))
			}) : t === "water" ? r > 61 && (i = {
				x: n,
				z: Math.max(86, r)
			}) : i = {
				x: n,
				z: r
			};
			return i || x.snapFailures.push({
				x: n,
				z: r,
				need: t
			}), i;
		}
	};
	return x;
}
// src/world/chunks.js
var Xh = [
	"G",
	"M",
	"B",
	"W",
	"N",
	"S",
	"L"
], Zh = (e, t) => e + t * 64, Qh = () => performance.now();
function $h({ scene: e, map: t, collide: n, props: r, decor: i, quality: a, events: o, state: s, generators: c, heroes: l }) {
	let u = Li(), d = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), m = [], h = new B({ size: 8192 }), g = new B({
		uv: !0,
		size: 8192
	}), _ = [], v = null, y = 0, b = null, x = null, S = null, C = {
		cx: -99,
		cz: -99
	}, w = /* @__PURE__ */ new Float32Array(1024), T = 0, E = {
		slices: 0,
		maxStepAt: "",
		built: 0,
		dropped: 0,
		maxStepMs: 0,
		buildMsMax: 0,
		ensureMs: 0,
		groupsBuilt: 0,
		pooled: 0
	}, D = () => {
		let e = m.pop() || {
			G: new B({ size: 512 }),
			M: new B({ size: 2048 }),
			B: new B({ size: 16384 }),
			N: new B({ size: 2048 }),
			S: new B({
				uv: !0,
				size: 256
			}),
			L: new B({ size: 2048 }),
			W: new B({
				uv: !0,
				size: 1024
			})
		};
		for (let t of Xh) e[t].reset();
		return e;
	}, O = (e) => {
		for (let n of t.zones) if (n.bounds.x0 < e.x1 && n.bounds.x1 > e.x0 && n.bounds.z0 < e.z1 && n.bounds.z1 > e.z0) return c[n.generator] || null;
		return null;
	}, k = (e, t, n) => Math.max(Math.abs(e - n.cx), Math.abs(t - n.cz));
	function A(e) {
		let { cx: o, cz: s } = e, u = t.chunkRect(o, s), d = Zh(o, s), f = e.chunk = {
			cx: o,
			cz: s,
			key: d,
			rect: u,
			seed: t.chunkSeed(o, s),
			owner: "chunk:" + d,
			meshes: [],
			objects: [],
			props: [],
			tris: 0,
			lit: null
		}, p = O(u);
		e.set = D(), e.dec = i.open(d, o, s, u);
		let m = e.o = {
			...e.set,
			rnd: pi(f.seed),
			low: a.level === "low",
			solid(e, t, r, i, a = 0, o = 0) {
				n.add(f.owner, {
					x0: e,
					x1: t,
					z0: r,
					z1: i,
					h: a,
					level: o
				});
			},
			obb(e, t, r, i, a, o = 0, s = 0) {
				n.add(f.owner, {
					cx: e,
					cz: t,
					hw: r,
					hd: i,
					rot: a,
					h: o,
					level: s
				});
			},
			prop(e, t, n, i, a, o) {
				let s = r.add(e, t, n, i, a, {
					...o,
					owner: f.owner
				});
				return s && f.props.push(s), s;
			},
			decor: e.dec.add,
			object(e) {
				e.matrixAutoUpdate = !1, f.objects.push(e);
			}
		}, h = c.decks && c.decks.touches(u) ? c.decks : null;
		e.it = p && h ? (function* () {
			yield* p.build(m, f, t, l), yield* h.build(m, f, t);
		})() : p ? p.build(m, f, t, l) : h ? h.build(m, f, t) : null, e.begun = !0;
	}
	function ee(t) {
		let n = t.chunk;
		for (t.at = t.at || 0; t.at < Xh.length;) {
			let r = Xh[t.at++], i = t.set[r];
			if (!i.count) continue;
			let a = new rr(i.build({
				free: !0,
				groundUv: r === "G" ? 7 : 0
			}), u[r]);
			return a.matrixAutoUpdate = !1, a.renderOrder = u.order[r] || 0, a.visible = !1, r === "L" && (n.lit = a), n.tris += i.triangles, n.meshes.push(a), e.add(a), !1;
		}
		for (let e of n.meshes) e.visible = e !== n.lit || u.lit;
		for (let t of n.objects) e.add(t);
		return t.dec.done(), m.push(t.set), E.pooled = m.length, t.set = null, d.set(n.key, n), f.delete(n.key), s.world.chunksLoaded = d.size, E.built++, o.emit("chunk:loaded", {
			cx: n.cx,
			cz: n.cz,
			lod: 0
		}), y = 0, !0;
	}
	function te(t) {
		for (let n of t.meshes) e.remove(n), n.geometry.dispose();
		for (let n of t.objects) e.remove(n), n.traverse((e) => {
			e.geometry && e.geometry.dispose();
		});
		n.removeOwner(t.owner);
		for (let e of t.props) r.remove(e);
		i.drop(t.key);
	}
	function ne(e) {
		te(e), d.delete(e.key), s.world.chunksLoaded = d.size, E.dropped++, o.emit("chunk:unloaded", {
			cx: e.cx,
			cz: e.cz,
			lod: 0
		});
	}
	function re(e) {
		f.delete(Zh(e.cx, e.cz)), e.begun && (te(e.chunk), e.set && m.push(e.set)), v === e && (v = null);
	}
	function ie(e, n, r) {
		let i = p.get(e + n * 16), a = [];
		for (let o = e * 4; o < e * 4 + 4; o++) for (let e = n * 4; e < n * 4 + 4; e++) {
			let n = Zh(o, e), s = k(o, e, C);
			t.inWorld(o, e) && !d.has(n) && (s <= r || s <= r + 1 && i && i.has && i.has.has(n)) && a.push(n);
		}
		return a;
	}
	function ae(t) {
		for (let n of ["mesh", "meshW"]) t[n] && (e.remove(t[n]), t[n].geometry.dispose(), t[n] = null);
	}
	function oe(n) {
		if (n.begun || (n.begun = !0, n.list = ie(n.gx, n.gz, a.get("lod1Radius")), n.i = 0, h.reset(), g.reset()), n.i < n.list.length) {
			let e = n.list[n.i++], r = e % 64, i = Math.floor(e / 64), a = t.chunkRect(r, i), o = O(a);
			return o && o.shell && o.shell({
				B: h,
				W: g
			}, {
				cx: r,
				cz: i,
				rect: a
			}, t, l), c.decks && c.decks.touches(a) && c.decks.shell({
				B: h,
				W: g
			}, {
				cx: r,
				cz: i,
				rect: a
			}, t), !1;
		}
		let r = n.gx + n.gz * 16, i = p.get(r) || {
			gx: n.gx,
			gz: n.gz,
			mesh: null
		};
		ae(i);
		for (let [t, n, r] of [[
			h,
			u.B,
			"mesh"
		], [
			g,
			u.W,
			"meshW"
		]]) t.count && (i[r] = new rr(t.build({ free: !0 }), n), i[r].matrixAutoUpdate = !1, e.add(i[r]));
		i.tris = h.triangles + g.triangles, i.sig = n.list.join(), i.has = new Set(n.list), i.queued = !1, p.set(r, i), E.groupsBuilt++;
		for (let e of n.list) o.emit("chunk:loaded", {
			cx: e % 64,
			cz: Math.floor(e / 64),
			lod: 1
		});
		return !0;
	}
	function se() {
		let e = s.player, n = e.vf === void 0 ? e.speed || 0 : e.vf, r = Math.sin(e.h) * n, i = Math.cos(e.h) * n, c = t.chunkOf(e.x + r * 1.5, e.z + i * 1.5);
		C.cx = c.cx, C.cz = c.cz;
		let l = a.get("lod0Radius"), u = a.get("lod1Radius");
		for (let e of [...d.values()]) k(e.cx, e.cz, c) > l + 1 && ne(e);
		for (let e of [...f.values()]) k(e.cx, e.cz, c) > l + 1 && re(e);
		for (let e = c.cx - l; e <= c.cx + l; e++) for (let n = c.cz - l; n <= c.cz + l; n++) {
			let r = Zh(e, n);
			t.inWorld(e, n) && !d.has(r) && !f.has(r) && f.set(r, {
				lod: 0,
				cx: e,
				cz: n
			});
		}
		let m = c.cx - u - 1 >> 2, h = c.cx + u + 1 >> 2, g = c.cz - u - 1 >> 2, y = c.cz + u + 1 >> 2, b = _.filter((e) => e.lod === 1 && e !== v);
		for (let e = Math.max(0, m); e <= Math.min(9, h); e++) for (let t = Math.max(0, g); t <= Math.min(7, y); t++) {
			let n = e + t * 16, r = p.get(n), i = ie(e, t, u).join();
			if ((r ? r.sig : "") !== i && !(r && r.queued) && !b.some((n) => n.gx === e && n.gz === t)) {
				let i = {
					lod: 1,
					gx: e,
					gz: t,
					cx: e * 4 + 1.5,
					cz: t * 4 + 1.5
				};
				r ? r.queued = !0 : p.set(n, {
					gx: e,
					gz: t,
					mesh: null,
					sig: "",
					queued: !0
				}), b.push(i);
			}
		}
		for (let [e, t] of p) if (!(t.gx >= m && t.gx <= h && t.gz >= g && t.gz <= y)) {
			ae(t);
			for (let e of t.has || []) o.emit("chunk:unloaded", {
				cx: e % 64,
				cz: Math.floor(e / 64),
				lod: 1
			});
			p.delete(e);
		}
		let x = Math.hypot(r, i), S = x > 1 ? r / x : 0, w = x > 1 ? i / x : 0, T = t.chunkOf(e.x, e.z), E = (e) => {
			let t = e.cx - T.cx, n = e.cz - T.cz;
			return e.lod * 1e3 + Math.hypot(t, n) - 1.5 * (t * S + n * w);
		};
		_ = [...f.values(), ...b].filter((e) => e !== v).sort((e, t) => E(e) - E(t));
	}
	function ce(e) {
		return e.lod === 1 ? oe(e) : e.begun ? e.it && !e.done ? (e.done = e.it.next().done, !1) : ee(e) : (A(e), !1);
	}
	function le(e) {
		let t = Qh(), n;
		for (; n = v || _.shift();) {
			for (v = n;;) {
				let r = Qh();
				if (r - t >= e - 1) return;
				let i = ce(n), a = Qh() - r;
				if (a > E.maxStepMs && (E.maxStepMs = a, E.maxStepAt = n.lod === 1 ? "shell group" : !n.it || n.done ? "upload" : "build " + n.cx + "," + n.cz), i) break;
			}
			v = null;
		}
	}
	function* buildNearby(x, z, radius) {
		const start = Qh();
		const center = t.chunkOf(x, z);
		for (let cx = center.cx - radius; cx <= center.cx + radius; cx++) {
			for (let cz = center.cz - radius; cz <= center.cz + radius; cz++) {
				const key = Zh(cx, cz);
				if (!t.inWorld(cx, cz) || d.has(key)) continue;
				const task = f.get(key) || { lod: 0, cx, cz };
				f.set(key, task);
				while (!ce(task)) yield;
				if (v === task) v = null;
			}
		}
		_ = _.filter(task => task.lod === 1 || f.has(Zh(task.cx, task.cz)));
		E.ensureMs = Qh() - start;
		y = 0;
	}
	let j = {
		buildMs: 0,
		stat: E,
		loaded: d,
		groups: p,
		get loadedCount() {
			return d.size;
		},
		get pending() {
			return _.length + +!!v;
		},
		isLoaded: (e, t) => d.has(Zh(e, t)),
		ensure(x, z, radius = 1) {
			for (const step of buildNearby(x, z, radius)) { /* finish before teleport */ }
			return Promise.resolve(d.size);
		},
		async warm(x, z, radius) {
			let sliceStart = Qh();
			for (const step of buildNearby(x, z, radius)) {
				if (Qh() - sliceStart < 3) continue;
				await new Promise(resolve => setTimeout(resolve, 0));
				sliceStart = Qh();
			}
		},
		update(e) {
			let n = s.player, r = Qh();
			b !== null && Math.hypot(n.x - b, n.z - x) > 120 && j.ensure(n.x, n.z, Math.min(1, a.get("lod0Radius"))), b = n.x, x = n.z, r - y > 250 && (y = r, se());
			let o = Qh();
			if (le(a.get("maxChunkMs")), j.buildMs = Qh() - o, E.buildMsMax = Math.max(E.buildMsMax, j.buildMs), j.buildMs > .05 && (w[T++ % w.length] = j.buildMs, E.slices++), u.lit !== S) {
				S = u.lit;
				for (let e of d.values()) e.lit && (e.lit.visible = u.lit);
			}
			let c = t.chunkOf(n.x, n.z);
			i.update(e, c.cx, c.cz);
		},
		stats() {
			let e = 0, t = 0, r = 0, i = 0, a = 0, o = 0;
			for (let n of d.values()) n.tris && (e += n.tris, t = Math.max(t, n.tris), r++);
			for (let e of p.values()) (e.mesh || e.meshW) && (i += e.tris, o++, a = Math.max(a, e.tris / Math.max(1, e.has.size)));
			let s = Array.from(w.subarray(0, Math.min(T, w.length))).sort((e, t) => e - t);
			return {
				buildMsP95: s.length ? s[Math.floor(s.length * .95)] : 0,
				lod0: d.size,
				lod0Built: r,
				lod0TrisAvg: r ? Math.round(e / r) : 0,
				lod0TrisMax: t,
				groups: o,
				shellTris: i,
				shellTrisPerChunkMax: Math.round(a),
				pending: j.pending,
				colliders: n.count,
				...E
			};
		},
		resetStats() {
			T = 0, E.slices = 0, E.buildMsMax = 0, E.maxStepMs = 0, E.built = 0, E.dropped = 0;
		},
		reset() {
			for (let e of [...d.values()]) ne(e);
			for (let e of [...f.values()]) re(e);
			for (let e of p.values()) ae(e);
			p.clear(), _ = [], v = null, y = 0;
		}
	};
	return o.on("quality:changed", () => {
		y = 0;
	}), j;
}
// src/world/collide.js
var $ = 20, eg = 12, tg = (e, t) => Math.imul(e, 73856093) ^ Math.imul(t, 19349663) | 0;
function ng() {
	let e = new Float32Array(1024 * eg), t = /* @__PURE__ */ new Uint32Array(1024), n = 1, r = 0, i = [], a = [], o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Set(), u = 0, d = 0;
	function f(e, t, n, r, i) {
		let a = Math.floor(e / $), o = Math.floor(t / $), s = Math.floor(n / $), c = Math.floor(r / $);
		for (let e = a; e <= o; e++) for (let t = s; t <= c; t++) i(tg(e, t));
	}
	function p(r, i, a, o, c, l) {
		let f = 0;
		n++, d++;
		let p = Math.floor(r / $), m = Math.floor(i / $), h = Math.floor(a / $), g = Math.floor(o / $);
		for (let d = p; d <= m; d++) for (let p = h; p <= g; p++) {
			let m = s.get(tg(d, p));
			if (m) for (let s = 0; s < m.length; s++) {
				let d = m[s], p = d * eg;
				t[d] !== n && (t[d] = n, u++, e[p] > i || e[p + 1] < r || e[p + 2] > o || e[p + 3] < a || (e[p + 11] === (c || 0) || c === -1) && (l[f++] = d));
			}
		}
		return f;
	}
	let m = {
		x: 0,
		z: 0,
		nx: 0,
		nz: 0,
		depth: 0,
		inside: !1
	};
	function h(t, n, r) {
		let i = t * eg, a = e[i + 8], o = e[i + 9], s = e[i + 6], c = e[i + 7], l = n - e[i + 4], u = r - e[i + 5], d = l * a - u * o, f = l * o + u * a, p = Math.max(-s, Math.min(d, s)), h = Math.max(-c, Math.min(f, c));
		m.inside = p === d && h === f;
		let g, _, v;
		if (m.inside) {
			let e = d + s, t = s - d, n = f + c, r = c - f, i = Math.min(e, t, n, r);
			g = i === e ? -1 : +(i === t), _ = g ? 0 : i === n ? -1 : 1, v = -i, p = d, h = f;
		} else g = d - p, _ = f - h, v = Math.hypot(g, _), g /= v, _ /= v;
		return m.x = e[i + 4] + p * a + h * o, m.z = e[i + 5] - p * o + h * a, m.nx = g * a + _ * o, m.nz = -g * o + _ * a, m.depth = v, v;
	}
	let g = [], _ = {
		cell: $,
		shapes: a,
		get count() {
			return r - i.length;
		},
		stats: () => ({
			shapes: r - i.length,
			cells: s.size,
			tested: u,
			queries: d
		}),
		add(n, c) {
			let l = i.length ? i.pop() : r++;
			if (l * eg >= e.length) {
				let n = new Float32Array(e.length * 2);
				n.set(e), e = n;
				let r = new Uint32Array(t.length * 2);
				r.set(t), t = r;
			}
			let u = l * eg, d, p, m, h, g = 0;
			c.cx === void 0 ? (d = (c.x0 + c.x1) / 2, p = (c.z0 + c.z1) / 2, m = (c.x1 - c.x0) / 2, h = (c.z1 - c.z0) / 2) : (d = c.cx, p = c.cz, m = c.hw, h = c.hd, g = c.rot || 0);
			let _ = Math.cos(g), v = Math.sin(g), y = Math.abs(_) * m + Math.abs(v) * h, b = Math.abs(v) * m + Math.abs(_) * h;
			return e[u] = d - y, e[u + 1] = d + y, e[u + 2] = p - b, e[u + 3] = p + b, e[u + 4] = d, e[u + 5] = p, e[u + 6] = m, e[u + 7] = h, e[u + 8] = _, e[u + 9] = v, e[u + 10] = c.h || 0, e[u + 11] = c.level || 0, a[l] = {
				id: l,
				owner: n,
				x0: d - y,
				x1: d + y,
				z0: p - b,
				z1: p + b,
				h: c.h || 0,
				level: c.level || 0
			}, f(e[u], e[u + 1], e[u + 2], e[u + 3], (e) => {
				let t = s.get(e);
				t ? t.push(l) : s.set(e, [l]);
			}), o.has(n) || o.set(n, []), o.get(n).push(l), l;
		},
		removeOwner(t) {
			let n = o.get(t);
			if (!n) return 0;
			for (let t of n) {
				let n = t * eg;
				f(e[n], e[n + 1], e[n + 2], e[n + 3], (e) => {
					let n = s.get(e);
					if (!n) return;
					let r = n.indexOf(t);
					r >= 0 && (n[r] = n[n.length - 1], n.pop()), n.length || s.delete(e);
				}), a[t] = null, i.push(t);
			}
			return o.delete(t), n.length;
		},
		circle(e, t, n, r, i) {
			let o = p(e - n, e + n, t - n, t + n, r, g), s = 0;
			for (let r = 0; r < o; r++) h(g[r], e, t) <= n && (i[s++] = a[g[r]]);
			return s;
		},
		box(e, t, n) {
			let r = Math.abs(Math.cos(e.rot || 0)), i = Math.abs(Math.sin(e.rot || 0)), o = r * e.hw + i * e.hd, s = i * e.hw + r * e.hd, c = p(e.cx - o, e.cx + o, e.cz - s, e.cz + s, t, g);
			for (let e = 0; e < c; e++) n[e] = a[g[e]];
			return c;
		},
		pushOutCircle(e) {
			let t = p(e.x - e.r, e.x + e.r, e.z - e.r, e.z + e.r, e.level, g), n = null, r = 0;
			for (let i = 0; i < t; i++) {
				let t = h(g[i], e.x, e.z);
				if (t > e.r) continue;
				let o = e.r - t;
				e.x += m.nx * o, e.z += m.nz * o, o > r && (r = o, n = {
					x: m.x,
					z: m.z,
					nx: m.nx,
					nz: m.nz,
					depth: o,
					owner: a[g[i]].owner
				});
			}
			return n;
		},
		pushOutBox(e) {
			let t = Math.sin(e.rot || 0), n = Math.cos(e.rot || 0), r = Math.max(0, e.hd - e.hw), i = null;
			for (let a of [r, -r]) {
				let r = {
					x: e.cx + t * a,
					z: e.cz + n * a,
					r: e.hw,
					level: e.level
				}, o = _.pushOutCircle(r);
				o && (e.cx = r.x - t * a, e.cz = r.z - n * a, (!i || o.depth > i.depth) && (i = o));
			}
			return i;
		},
		ray(r, i, o, c, l, f = 0) {
			let p = o - r, m = c - i;
			if (Math.hypot(p, m) < 1e-6) return null;
			let h = Math.floor(r / $), g = Math.floor(i / $), _ = p > 0 ? 1 : -1, v = m > 0 ? 1 : -1, y = p ? Math.abs($ / p) : Infinity, b = m ? Math.abs($ / m) : Infinity, x = p ? (p > 0 ? (h + 1) * $ - r : r - h * $) / Math.abs(p) : Infinity, S = m ? (m > 0 ? (g + 1) * $ - i : i - g * $) / Math.abs(m) : Infinity, C = null, w = Infinity, T = 0;
			for (n++, d++; T <= 1;) {
				let a = s.get(tg(h, g)), o = Math.min(x, S);
				if (a) for (let o = 0; o < a.length; o++) {
					let s = a[o], c = s * eg;
					if (t[s] === n || (t[s] = n, u++, e[c + 11] !== (l || 0) && l !== -1 || e[c + 10] < f)) continue;
					let d = e[c + 8], h = e[c + 9], g = r - e[c + 4], _ = i - e[c + 5], v = g * d - _ * h, y = g * h + _ * d, b = p * d - m * h, x = p * h + m * d, S = 0, T = 1, E = !0;
					for (let [t, n, r] of [[
						v,
						b,
						e[c + 6]
					], [
						y,
						x,
						e[c + 7]
					]]) {
						if (Math.abs(n) < 1e-9) {
							if (t < -r || t > r) {
								E = !1;
								break;
							}
							continue;
						}
						let e = (-r - t) / n, i = (r - t) / n;
						if (e > i) {
							let t = e;
							e = i, i = t;
						}
						if (S = Math.max(S, e), T = Math.min(T, i), S > T) {
							E = !1;
							break;
						}
					}
					E && S < w && (w = S, C = s);
				}
				if (C !== null && w <= o) break;
				x < S ? (T = x, x += y, h += _) : (T = S, S += b, g += v);
			}
			return C === null ? null : {
				t: w,
				x: r + p * w,
				z: i + m * w,
				owner: a[C].owner,
				shape: a[C]
			};
		},
		blocked(e, t, n, r) {
			let i = p(e - r, e + r, n - r, n + r, void 0, g);
			for (let e = 0; e < i; e++) {
				let n = a[g[e]];
				if (n.h > 2.5 && t < n.h + r) return !0;
			}
			return !1;
		},
		bodies: {
			add(e) {
				l.add(e);
			},
			remove(e) {
				l.delete(e);
			},
			refresh() {
				for (let e of c.values()) e.length = 0;
				for (let e of l) {
					let t = tg(Math.floor(e.x / $), Math.floor(e.z / $)), n = c.get(t);
					n ? n.push(e) : c.set(t, [e]);
				}
			},
			near(e, t, n, r) {
				let i = 0, a = Math.floor((e - n) / $), o = Math.floor((e + n) / $), s = Math.floor((t - n) / $), l = Math.floor((t + n) / $);
				for (let u = a; u <= o; u++) for (let a = s; a <= l; a++) {
					let o = c.get(tg(u, a));
					if (o) for (let a of o) (a.x - e) * (a.x - e) + (a.z - t) * (a.z - t) <= (n + (a.r || 0)) * (n + (a.r || 0)) && (r[i++] = a);
				}
				return i;
			}
		}
	};
	return _;
}
// src/world/decor.js
var rg = [
	3120728,
	4175978,
	2787920,
	4964194
];
function ig(e, t) {
	let n = new B(), r = pi(e), i = r() * Math.PI * 2, a = .25 + r() * .45, o = t ? 3 : 5, s = 8.5 / o, c = t ? .78 : .86, l = 0, u = 0, d = 0, f = .5;
	for (let e = 0; e < o; e++) {
		let r = (e + .5) / o, p = Math.cos(i) * a * r * (5 / o), m = Math.sin(i) * a * r * (5 / o), h = f * c;
		n.box(l, u + s / 2, d, f, s, f, e % 2 ? 9071178 : 8019008, {
			taper: [h / f, h / f],
			shift: [p, m],
			rot: .5,
			noTop: t
		}), l += p, u += s, d += m, f = h;
	}
	let p = t ? 5 : 9, m = t ? 2 : 4, h = r() * 6;
	for (let e = 0; e < p; e++) {
		let i = h + e / p * Math.PI * 2 + (r() - .5) * .3, a = Math.cos(i), o = Math.sin(i), s = -o, c = a, f = 2.7 + r() * 1.1, g = .75 + r() * .35, _ = rg[Math.floor(r() * 4)], v = null;
		for (let e = 0; e <= m; e++) {
			let r = e / m, i = f * r, p = u + .9 * f * (.55 * r - g * r * r), h = (t ? .75 : .55) * Math.sin(Math.PI * (.15 + .85 * r)), y = [
				l + a * i,
				p,
				d + o * i
			], b = [
				y[0] + s * h,
				p - .35 * h,
				y[2] + c * h
			], x = [
				y[0] - s * h,
				p - .35 * h,
				y[2] - c * h
			];
			v && (n.quad(v.R, y, b, v.A, _, 1), n.quad(v.R, v.C, x, y, _, .8)), v = {
				R: y,
				A: b,
				C: x
			};
		}
	}
	return n.build();
}
function ag() {
	let e = new B(), t = 1.7;
	e.box(0, 1.1, 0, .08, 2.2, .08, 16777215);
	for (let n = 0; n < 8; n++) {
		let r = n / 8 * Math.PI * 2, i = (n + 1) / 8 * Math.PI * 2;
		e.tri([
			0,
			2.45,
			0
		], [
			Math.cos(i) * t,
			1.9,
			Math.sin(i) * t
		], [
			Math.cos(r) * t,
			1.9,
			Math.sin(r) * t
		], 16777215, n % 2 ? 1 : .62);
	}
	return e.build();
}
function og() {
	let e = new B();
	e.box(0, .45, 0, 1.8, .08, .45, 9072469, { bottom: !0 }), e.box(0, .75, -.2, 1.8, .4, .06, 9072469, { bottom: !0 });
	for (let t of [-.75, .75]) e.box(t, .22, 0, .08, .44, .4, 2828344);
	return e.build();
}
var sg = [
	16732014,
	2733798,
	16761406,
	16742942,
	4183690
];
function cg(e, { low: t = () => !1 } = {}) {
	let n = Li(), r = {
		palm0: {
			geo: ig(11),
			mat: n.leaf,
			cap: 420
		},
		palm1: {
			geo: ig(23),
			mat: n.leaf,
			cap: 420
		},
		palm2: {
			geo: ig(37),
			mat: n.leaf,
			cap: 420
		},
		palm3: {
			geo: ig(51),
			mat: n.leaf,
			cap: 420
		},
		palmFar: {
			geo: ig(11, !0),
			mat: n.leaf,
			cap: 1600
		},
		umbrella: {
			geo: ag(),
			mat: n.leaf,
			cap: 640,
			tint: !0
		},
		bench: {
			geo: og(),
			mat: n.B,
			cap: 256
		}
	};
	for (let t in r) {
		let n = r[t];
		n.tris = n.geo.attributes.position.count / 3, n.mesh = new hr(n.geo, n.mat, n.cap), n.mesh.frustumCulled = !1, n.mesh.count = 0, n.mesh.matrixAutoUpdate = !1, n.tint && n.mesh.setColorAt(0, new gt(1, 1, 1)), e.add(n.mesh);
	}
	let i = /* @__PURE__ */ new Map(), a = new L(), o = new ve(), s = new I(0, 1, 0), c = new I(), l = new I(), u = new yr(), d = new L(), f = new gt(), p = !0, m = "", h = 0;
	return {
		shapes: r,
		get count() {
			return h;
		},
		open(e, t, n, r) {
			let u = {
				cx: t,
				cz: n,
				box: new Pt(new I(r.x0 - 6, -2, r.z0 - 6), new I(r.x1 + 6, 14, r.z1 + 6)),
				lists: {},
				tints: []
			}, d = (e, t, n, r, i, d) => {
				var f;
				o.setFromAxisAngle(s, i), c.set(t, n, r), l.set(d, d, d), a.compose(c, o, l);
				let p = (f = u.lists)[e] || (f[e] = []);
				for (let e = 0; e < 16; e++) p.push(a.elements[e]);
			};
			return {
				add(e, t, n, r, i = 0, a = 1) {
					if (e === "palm") {
						let e = Math.abs(Math.floor(i * 7.3 + t)) % 4;
						d("palm" + e, t, n, r, i, a), d("palmFar", t, n, r, i, a);
					} else d(e, t, n, r, i, a), e === "umbrella" && u.tints.push(sg[Math.abs(Math.floor(i * 3 + t)) % sg.length]);
				},
				done() {
					for (let e in u.lists) u.lists[e] = new Float32Array(u.lists[e]);
					i.set(e, u), p = !0;
				}
			};
		},
		drop(e) {
			i.delete(e) && (p = !0);
		},
		update(e, n, a) {
			d.multiplyMatrices(e.projectionMatrix, e.matrixWorldInverse), u.setFromProjectionMatrix(d);
			let o = n + "," + a + ":", s = [];
			for (let [e, t] of i) u.intersectsBox(t.box) && (s.push(t), o += e + ",");
			if (!p && o === m) return;
			p = !1, m = o, h = 0;
			let c = +!t();
			for (let e in r) {
				let t = r[e], i = t.mesh.instanceMatrix.array, o = 0;
				for (let r of s) {
					let s = r.lists[e];
					if (!s) continue;
					let l = Math.max(Math.abs(r.cx - n), Math.abs(r.cz - a)) <= c;
					if (e === "palmFar" ? l : e.startsWith("palm") && !l) continue;
					let u = Math.min(s.length / 16, t.cap - o);
					if (!u) break;
					if (i.set(u * 16 === s.length ? s : s.subarray(0, u * 16), o * 16), t.tint) for (let e = 0; e < u; e++) t.mesh.setColorAt(o + e, f.set(r.tints[e]));
					o += u;
				}
				t.mesh.count = o;
				h += o;
				// Only upload the visible prefix, not the full fixed-capacity arrays.
				if (o) {
					const matrix = t.mesh.instanceMatrix;
					matrix.clearUpdateRanges();
					matrix.addUpdateRange(0, o * matrix.itemSize);
					matrix.needsUpdate = true;
					if (t.tint && t.mesh.instanceColor) {
						const color = t.mesh.instanceColor;
						color.clearUpdateRanges();
						color.addUpdateRange(0, o * color.itemSize);
						color.needsUpdate = true;
					}
				}
			}
		}
	};
}
// src/world/props.js
var lg = 2828344;
function ug(e) {
	let t = new B(), n = new B();
	t.box(0, 3.25, 0, .18, 6.5, .18, lg), t.box(0, 6.45, e / 2, .14, .12, e + .14, lg, { bottom: !0 }), n.box(0, 6.32, e, .55, .14, .55, 16773836, { bottom: !0 });
	let r = new B({ uv: !0 }), i = new B({ uv: !0 });
	r.flat(-9, 9, e - 9, e + 9, .06, 16777215);
	let a = 2.6;
	return i.quad([
		-2.6,
		3.65,
		e
	], [
		a,
		3.65,
		e
	], [
		a,
		8.85,
		e
	], [
		-2.6,
		8.85,
		e
	], 16777215), i.quad([
		0,
		3.65,
		e - a
	], [
		0,
		3.65,
		e + a
	], [
		0,
		8.85,
		e + a
	], [
		0,
		8.85,
		e - a
	], 16777215), i.flat(-2.6, a, e - a, e + a, 6.25, 16777215), [
		t.build(),
		n.build(),
		r.build(),
		i.build()
	];
}
function dg() {
	let e = new B();
	for (let [t, n] of [[-.6, 16742942], [.6, 16777215]]) for (let r of [.55, 1.05]) e.box(t, r, 0, 1.2, .3, .14, n, { bottom: !0 });
	for (let t of [-1.05, 1.05]) e.box(t, .6, 0, .12, 1.2, .5, 3815492);
	return [e.build()];
}
function fg() {
	let e = new B();
	return e.box(0, .03, 0, .5, .06, .5, 16777215, { bottom: !0 }), e.box(0, .38, 0, .34, .64, .34, 16777215, { taper: [.2, .2] }), [e.build()];
}
function pg() {
	let e = new B();
	return e.box(0, .05, 0, .44, .1, .44, 13121325, { bottom: !0 }), e.box(0, .42, 0, .28, .64, .28, 16734810), e.box(0, .8, 0, .2, .12, .2, 16643818), e.box(0, .5, 0, .5, .13, .13, 16643818, { bottom: !0 }), [e.build()];
}
function mg() {
	let e = new B();
	return e.box(0, .74, 0, .8, .05, .8, 16643818, { bottom: !0 }), e.box(0, .38, 0, .08, .68, .08, lg), e.box(0, .03, 0, .44, .05, .44, lg, { bottom: !0 }), [e.build()];
}
function hg() {
	let e = new B();
	e.box(0, .45, 0, .42, .05, .42, 16777215, { bottom: !0 }), e.box(0, .72, -.19, .42, .5, .04, 16777215, { bottom: !0 });
	for (let [t, n] of [
		[-.18, -.18],
		[.18, -.18],
		[-.18, .18],
		[.18, .18]
	]) e.box(t, .22, n, .04, .44, .04, lg);
	return [e.build()];
}
function gg() {
	let e = new B();
	for (let t of [.35, .8]) e.box(0, t, 0, 2.4, .08, .05, 9072469, { bottom: !0 });
	for (let t = 0; t < 8; t++) e.box(-1.05 + t * .3, .55, .04, .16, 1.1, .04, t % 2 ? 16643818 : 15919317, { bottom: !0 });
	return [e.build()];
}
function _g() {
	let e = new B();
	for (let t of [1, -1]) e.box(0, .55, t * .14, .62, 1, .04, 16777215, { bottom: !0 }), e.box(0, .72, t * .165, .46, .14, .01, lg), e.box(0, .5, t * .165, .36, .08, .01, lg);
	return e.box(0, 1.06, 0, .62, .04, .32, lg), [e.build()];
}
function vg(e) {
	let t = new Sr({ vertexColors: !0 }), n = new Gn({ vertexColors: !0 }), r = new Gn({ vertexColors: !0 }), i = {
		map: bi(),
		transparent: !0,
		blending: 2,
		depthWrite: !1,
		fog: !1,
		side: 2
	}, a = new Gn({
		...i,
		color: 16761466
	}), o = new Gn({
		...i,
		color: 16767392
	}), s = [
		t,
		n,
		a,
		o
	], c = {
		lamp: {
			geos: ug(1.8),
			mats: s,
			mass: 60,
			hx: .2,
			hz: .2,
			mode: "topple",
			rest: 1.52,
			cap: 640,
			lights: 2,
			bend: !0
		},
		lampLong: {
			geos: ug(3.7),
			mats: s,
			mass: 70,
			hx: .2,
			hz: .2,
			mode: "topple",
			rest: 1.52,
			cap: 192,
			lights: 2,
			bend: !0
		},
		barrier: {
			geos: dg(),
			mats: [t],
			mass: 25,
			hx: 1.2,
			hz: .25,
			mode: "topple",
			rest: 1.5,
			cap: 256
		},
		cone: {
			geos: fg(),
			mats: [r],
			mass: 3,
			hx: .25,
			hz: .25,
			mode: "fly",
			rest: 1.72,
			cap: 192
		},
		hydrant: {
			geos: pg(),
			mats: [t],
			mass: 80,
			hx: .22,
			hz: .22,
			mode: "fly",
			rest: 1.57,
			cap: 64
		},
		table: {
			geos: mg(),
			mats: [t],
			mass: 12,
			hx: .4,
			hz: .4,
			mode: "fly",
			rest: 1.57,
			cap: 64
		},
		chair: {
			geos: hg(),
			mats: [t],
			mass: 4,
			hx: .21,
			hz: .21,
			mode: "fly",
			rest: 1.57,
			cap: 128
		},
		fence: {
			geos: gg(),
			mats: [t],
			mass: 20,
			hx: 1.2,
			hz: .1,
			mode: "gone",
			rest: 0,
			cap: 128
		},
		sign: {
			geos: _g(),
			mats: [t],
			mass: 9,
			hx: .31,
			hz: .18,
			mode: "topple",
			rest: 1.5,
			cap: 64
		}
	}, l = [], u = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Map(), f = pi(4242), p = new L(), m = new ve(), h = new ve(), g = new ve(), _ = new I(), v = new I(1, 1, 1), y = new I(), b = new I(0, 1, 0), x = new gt(), S = new gt(1, 1, 1), C = new L().makeScale(0, 0, 0), w = 1;
	for (let t in c) {
		let n = c[t];
		n.name = t, n.list = [], n.free = [], n.high = 0, n.tris = n.geos.slice(0, n.geos.length - (n.lights || 0)).reduce((e, t) => e + t.attributes.position.count / 3, 0), n.meshes = n.geos.map((t, r) => {
			let i = new hr(t, n.mats[r], n.cap);
			return i.frustumCulled = !1, i.count = 0, i.matrixAutoUpdate = !1, r >= n.geos.length - (n.lights || 0) && (i.renderOrder = 2, i.userData.light = !0, i.visible = !1), e.add(i), i;
		});
	}
	function T(e) {
		y.set(Math.cos(e.fall), 0, -Math.sin(e.fall)), h.setFromAxisAngle(y, e.tilt), g.setFromAxisAngle(b, e.rot + e.yaw), m.multiplyQuaternions(h, g), _.set(e.x, e.y, e.z), p.compose(_, m, v);
		let t = c[e.kind], n = t.meshes.length - (t.lights || 0);
		t.meshes.forEach((t, r) => {
			t.setMatrixAt(e.idx, e.hidden || r >= n && (e.state !== 0 || e.noLight) ? C : p), t.instanceMatrix.needsUpdate = !0;
		});
	}
	let E = {
		kinds: c,
		all: l,
		triangles: 0,
		add(e, t, n, r, i = 0, a = {}) {
			let o = c[e], s = Math.abs(Math.cos(i)), u = Math.abs(Math.sin(i));
			if (!o.free.length && o.high >= o.cap) return null;
			let f = o.free.length ? o.free.pop() : o.high++, p = {
				id: w++,
				kind: e,
				mass: o.mass,
				x: t,
				y: n,
				z: r,
				rot: i,
				home: {
					x: t,
					y: n,
					z: r
				},
				hx: o.hx * s + o.hz * u,
				hz: o.hx * u + o.hz * s,
				state: 0,
				vx: 0,
				vy: 0,
				vz: 0,
				tilt: 0,
				tiltV: 0,
				fall: 0,
				yaw: 0,
				yawV: 0,
				idx: f,
				color: a.color,
				onChange: a.onChange,
				noLight: !!a.noLight,
				owner: a.owner
			};
			o.list.push(p), l.push(p), d.set(p.id, p);
			for (let e of o.meshes) e.count = o.high;
			return T(p), (p.color !== void 0 || o.meshes[0].instanceColor) && (o.meshes[0].setColorAt(f, p.color === void 0 ? S : x.set(p.color)), o.meshes[0].instanceColor.needsUpdate = !0), E.triangles += o.tris, p;
		},
		spawn(e, t, n, r = {}) {
			let i = E.add(e, t, r.y || 0, n, r.rot || 0, r);
			return i ? i.id : 0;
		},
		remove(e) {
			let t = typeof e == "number" ? d.get(e) : e;
			if (!t || !d.has(t.id)) return;
			let n = c[t.kind];
			for (let e of n.meshes) e.setMatrixAt(t.idx, C), e.instanceMatrix.needsUpdate = !0;
			n.free.push(t.idx), d.delete(t.id), u.delete(t), n.list.splice(n.list.indexOf(t), 1), l.splice(l.indexOf(t), 1), E.triangles -= n.tris;
		},
		near(e, t, n, r) {
			let i = 0;
			for (let a of l) (a.x - e) * (a.x - e) + (a.z - t) * (a.z - t) <= n * n && (r[i++] = a);
			return i;
		},
		finish() {},
		hitTest(e, t, n, r, i, a) {
			if (!(Math.hypot(r, i) < 1.5)) for (let o = 0; o < l.length; o++) {
				let s = l[o];
				if (s.state !== 0 || Math.abs(s.x - e) > n + 1.3 || Math.abs(s.z - t) > n + 1.3) continue;
				let c = e - Math.max(s.x - s.hx, Math.min(e, s.x + s.hx)), u = t - Math.max(s.z - s.hz, Math.min(t, s.z + s.hz));
				c * c + u * u > n * n || (E.knock(s, r, i), a(s));
			}
		},
		hit(e, t, n) {
			let r = d.get(e);
			r && r.state === 0 && E.knock(r, t, n);
		},
		knock(e, t, n) {
			let r = c[e.kind], i = Math.hypot(t, n);
			if (e.state = 1, e.fall = Math.atan2(t, n) + (f() - .5) * .5, e.rest = r.bend ? Math.max(.45, Math.min(r.rest, .3 + i * .045)) : r.rest, r.mode === "gone") e.state = 2, e.hidden = !0, T(e), e.onChange && e.onChange(!0);
			else {
				if (r.mode === "fly") {
					let r = (f() - .5) * .9;
					e.vx = t * (.75 + f() * .4) + n * r * .3, e.vz = n * (.75 + f() * .4) - t * r * .3, e.vy = 2 + i * (.1 + f() * .1), e.tiltV = 5 + f() * 8, e.yawV = (f() - .5) * 12;
				} else e.vx = t * .45, e.vz = n * .45, e.tiltV = 1.2 + i * .12, e.yawV = (f() - .5) * 1.5;
				u.add(e), e.onChange && e.onChange(!0);
			}
		},
		update(e, t = 0) {
			let r = Math.min(1, t * 1.6);
			n.color.setScalar(.62 + r * .6), a.opacity = r * .34, o.opacity = r * .9;
			for (let e in c) {
				let t = c[e], n = r > .01 && t.list.some((e) => !e.noLight);
				if (t.lights && n !== t.shown) {
					t.shown = n;
					for (let e of t.meshes) e.userData.light && (e.visible = n);
				}
			}
			for (let t of u) {
				let n = c[t.kind];
				if (t.x += t.vx * e, t.z += t.vz * e, t.yaw += t.yawV * e, n.mode === "fly") {
					if (t.vy -= 12 * e, t.y += t.vy * e, t.tilt += t.tiltV * e, t.y <= t.home.y) {
						t.y = t.home.y, t.vy < -1.5 ? (t.vy *= -.35, t.tiltV *= .6) : (t.vy = 0, t.tiltV = 0, t.tilt += (t.rest - t.tilt % (Math.PI * 2)) * Math.min(1, e * 10));
						let n = Math.max(0, 1 - 3 * e);
						t.vx *= n, t.vz *= n, t.yawV *= n;
					}
				} else {
					t.tiltV += 7 * Math.sin(Math.max(.05, t.tilt)) * e, t.tilt += t.tiltV * e, t.tilt >= t.rest && (t.tilt = t.rest, t.tiltV = t.tiltV > 2 ? -t.tiltV * .25 : 0);
					let n = Math.max(0, 1 - 2.5 * e);
					t.vx *= n, t.vz *= n, t.yawV *= n;
				}
				T(t), t.vy === 0 && t.tiltV === 0 && Math.hypot(t.vx, t.vz) < .15 && Math.abs(t.tilt % (Math.PI * 2) - t.rest) < .05 && (t.state = 2, u.delete(t));
			}
		},
		reset() {
			for (let e of l) e.state !== 0 && (Object.assign(e, e.home, {
				state: 0,
				vx: 0,
				vy: 0,
				vz: 0,
				tilt: 0,
				tiltV: 0,
				yaw: 0,
				yawV: 0,
				hidden: !1
			}), T(e), e.onChange && e.onChange(!1));
			u.clear();
			for (let e of l) !e.noLight && c[e.kind].lights && T(e);
		},
		count(e, t) {
			return l.filter((n) => (!e || n.kind === e) && (t === void 0 || (t === "down" ? n.state !== 0 : n.state === 0))).length;
		}
	};
	return E;
}
// src/world/skyline.js
var yg = 7301752;
function bg(e, t, n = {}) {
	let r = new B({
		uv: !0,
		size: 32768
	}), i = t.world, a = { W: r }, o = -.4;
	po(r, i.x0, i.x1, i.z0, -320, o, 4538959), po(r, -1600, 1600, -320, 50, o, 3881286), po(r, i.x0, -1600, -320, 50, o, 6262618), po(r, 1600, i.x1, -320, 50, o, 7828607), po(r, i.x0, i.x1, 50, 78, -.3, 15916464), po(r, 1800, 3024, 50, 130, -.25, 9407638), po(r, 3024, i.x1, -1600, 78, -.27, 3112858);
	let s = r.triangles, c = [], l = 0, u = 0, d = 0;
	for (let e of t.lots) {
		let t = e.hero && n[e.hero];
		if (t && t.skyline && t.shell) {
			t.shell(a, e, { inset: .4 }), c.push(e.hero), d = Math.max(d, e.h);
			continue;
		}
		if (!e.body || e.h <= 30 || e.hero) continue;
		if (e.tiers) {
			go(a, e.tiers, {
				cell: 6,
				cut: !1,
				inset: .4
			}), l++, d = Math.max(d, e.h);
			continue;
		}
		let i = e.body;
		fo(r, (i.x0 + i.x1) / 2, e.h / 2, (i.z0 + i.z1) / 2, i.x1 - i.x0 - .8, e.h - .4, i.z1 - i.z0 - .8, e.wall, { top: yg }), u++;
	}
	let f = Li(), p = new rr(r.build({ free: !0 }), f.W);
	p.matrixAutoUpdate = !1, p.frustumCulled = !1, p.renderOrder = -1, e.add(p);
	let m = null, h = t.landmark("spire");
	return h && c.includes("spire") && (m = new Rn(new wn({
		map: bi(),
		color: 16727972,
		fog: !1,
		transparent: !0,
		blending: 2,
		depthWrite: !1
	})), m.position.set(h.x, h.h - 2, h.z), m.renderOrder = 2, e.add(m)), {
		mesh: p,
		triangles: r.triangles,
		ground: s,
		towers: l,
		tall: u,
		landmarks: c,
		top: d,
		beacon: m,
		update(e, t) {
			if (!m) return;
			let n = .5 + .5 * Math.cos(e * Math.PI), r = (10 + 16 * t) * (.7 + .3 * n);
			m.scale.set(r, r, 1), m.material.opacity = (.35 + .65 * t) * (.45 + .55 * n);
		}
	};
}
// salt-map.js
var xg = (e) => Object.fromEntries(Object.values(e).filter((e) => e.default?.id).map((e) => [e.default.id, e.default])), Sg = xg(/* #__PURE__ */ Object.assign({
	"./src/world/gen/decks.js": Ma,
	"./src/world/gen/kit.js": qa,
	"./src/world/gen/mallardgreens.js": xs,
	"./src/world/gen/meridian.js": Us,
	"./src/world/gen/northgate.js": Ec,
	"./src/world/gen/paintworks.js": Al,
	"./src/world/gen/palmavieja.js": Wc,
	"./src/world/gen/rustwater.js": ju,
	"./src/world/gen/streets.js": _o,
	"./src/world/gen/tideline.js": ud,
	"./src/world/gen/towers.js": co
})), Cg = xg(/* #__PURE__ */ Object.assign({
	"./src/world/landmarks/bell-tower.js": Ed,
	"./src/world/landmarks/cityhall.js": Ld,
	"./src/world/landmarks/clubhouse.js": Jd,
	"./src/world/landmarks/cruise-terminal.js": tf,
	"./src/world/landmarks/day1-block.js": Wf,
	"./src/world/landmarks/domino-park.js": ep,
	"./src/world/landmarks/galleria.js": fp,
	"./src/world/landmarks/gantry-crane.js": xu,
	"./src/world/landmarks/hospital.js": xp,
	"./src/world/landmarks/lifeguard-hut.js": kp,
	"./src/world/landmarks/model-home.js": jp,
	"./src/world/landmarks/paint-factory.js": Pp,
	"./src/world/landmarks/sheriff-hq.js": Up,
	"./src/world/landmarks/ship-berth.js": tm,
	"./src/world/landmarks/spire.js": gm,
	"./src/world/landmarks/starlite.js": km
}));
async function wg() {
	let e = new yt();
	e.fog = new vt(13089999, .0011);
	let t = Yh(), n = ng(), r = cg(e), i = vg(e), a = {
		level: "mid",
		get: (e) => ({
			lod0Radius: 2,
			lod1Radius: 6,
			maxChunkMs: 3
		})[e]
	}, o = {
		world: {},
		player: {
			...t.spawn,
			speed: 0
		}
	}, s = $h({
		scene: e,
		map: t,
		collide: n,
		props: i,
		decor: r,
		quality: a,
		events: {
			emit() {},
			on() {}
		},
		state: o,
		generators: Sg,
		heroes: Cg
	}), c = bg(e, t, Cg), l = Li();
	l.update(.22);
	let u = new ti(16768449, 2.1);
	u.position.set(-45, 90, 32), e.add(u, new Wr(16771054, 5792106, 1.6));
	let d = new rr(new xr(12e3, 12e3), new Gn({ color: 4746129 }));
	d.rotation.x = -Math.PI / 2, d.position.y = -.8, e.add(d), await s.warm(t.spawn.x, t.spawn.z, 1);
	let f = [];
	return {
		scene: e,
		color: 13089999,
		heightAt: (e, n) => Math.max(-.8, t.heightAt(e, n)),
		boxes: (e, r, i, a) => (n.box({
			cx: (e + i) / 2,
			cz: (r + a) / 2,
			hw: Math.abs(e - i) / 2 + .02,
			hd: Math.abs(r - a) / 2 + .02
		}, void 0, f), f.filter((e) => e.h > .1).map((e) => {
			let n = (e.x0 + e.x1) / 2, r = (e.z0 + e.z1) / 2, i = t.heightAt(n, r, e.level);
			return [
				e.x0,
				i,
				e.z0,
				e.x1,
				i + e.h,
				e.z1
			];
		})),
		update(e, t, n) {
			o.player.x = e.position.x, o.player.z = e.position.z, s.update(e), c.update(n, l.on);
		}
	};
}
export { wg as createEnvironment };
