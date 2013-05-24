
"use strict";

Voxgrind.Vec3 = function(x, y, z) {
    
    this.x = typeof x !== 'undefined' ? x : 0;
    this.y = typeof y !== 'undefined' ? y : 0;
    this.z = typeof z !== 'undefined' ? z : 0;

}


Voxgrind.Vec3.prototype.set = function(x, y, z) {
    this.x = typeof x !== 'undefined' ? x : this.x;
    this.y = typeof y !== 'undefined' ? y : this.y;
    this.z = typeof z !== 'undefined' ? z : this.z;
}

Voxgrind.Vec3.prototype.clone = function() {
    return new Voxgrind.Vec3(this.x, this.y, this.z);
}

Voxgrind.Vec3.prototype.plus = function(v) {
    if (typeof v !== 'number') {
        return new Voxgrind.Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }
    return new Voxgrind.Vec3(this.x + v, this.y + v, this.z + v);
}

Voxgrind.Vec3.prototype.minus = function(v) {
    if (typeof v !== 'number') {
        return new Voxgrind.Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }
    return new Voxgrind.Vec3(this.x - v, this.y - v, this.z - v);
}

Voxgrind.Vec3.prototype.times = function(v) {
    return new Voxgrind.Vec3(this.x * v, this.y * v, this.z * v);
}

Voxgrind.Vec3.prototype.dot = function(v) {
    return this.x*v.x + this.y*v.y + this.z*v.z;
}

Voxgrind.Vec3.prototype.length = function() {
    return Math.sqrt(this.dot(this));
}

Voxgrind.Vec3.prototype.over = function(v) {
    if (v === 0) {
        return new Voxgrind.Vec3(0, 0, 0);
    }
    return new Voxgrind.Vec3(this.x/v, this.y/v, this.z/v);
}

Voxgrind.Vec3.prototype.unit = function() {
    return this.over(this.length());
}

Voxgrind.Vec3.prototype.toArray = function() {
    return [this.x, this.y, this.z];
}

Voxgrind.Vec3.random2d = function() {
    v = new Voxgrind.Vec3();
    v.x = Math.random() - 0.5;
    v.y = Math.random() - 0.5;
    v.z = 0;
    return v.unit();
}

Voxgrind.Vec3.random3d = function() {
    v = new Voxgrind.Vec3();
    v.x = Math.random() - 0.5;
    v.y = Math.random() - 0.5;
    v.z = Math.random() - 0.5;
    return v.unit();
}

