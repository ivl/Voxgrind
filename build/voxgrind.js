
"use strict"

var Voxgrind = {

};

// Provide a shim for RAF.
(function() {
    window.requestAnimationFrame = window.requestAnimationFrame || 
                                   window.mozRequestAnimationFrame ||
                                   window.webkitRequestAnimationFrame || 
                                   window.msRequestAnimationFrame ||
                                   function (callback) {
                                        window.setTimeout(callback, 1000/60);
                                   };
})();
"use strict";

Voxgrind.Light = function() {

    var self = this;
    
    self.position = new Voxgrind.Vec3(0,0,0);

}


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



"use strict";


Voxgrind.Renderer = function(canvas) {


    var self = this;

    self.canvas = canvas;

    self.initialize = function() {

        self.near        = 0.01;
        self.fov         = 90.0;
        self.fogColor    = {r: 0.0, g: 0.0, b: 0.0};
        self.fogDistance = 1e32;

        self.cam         = new Voxgrind.Camera();
        self.light       = new Voxgrind.Light();

        // Create the WebGL context.
        self.gl = self.canvas.getContext("webgl") || self.canvas.getContext("experimental-webgl");
        self.gl.viewport(0, 0, self.canvas.width, self.canvas.height);

        // Create the backend canvas for transforming to power-of-two.
        self.backend = document.createElement("canvas");
        self.backendContext = self.backend.getContext("2d");

        // Set up the fxaa program.
        self.fxaaProgram = self.buildShader("quad.vs", "fxaa.fs");
        self.gl.useProgram(self.fxaaProgram);
        var w = 1, h = 1;
        while (w < self.canvas.width) {w *= 2}
        while (h < self.canvas.height) {h *= 2}
        var uTemp = self.gl.getUniformLocation(self.fxaaProgram, "resolution");
        self.gl.uniform2fv(uTemp, [w,h]);
        self.fxaaFBO = self.gl.createFramebuffer();
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.fxaaFBO);
        self.fxaaTexture = self.gl.createTexture();
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.fxaaTexture);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, w, h, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, null);
        self.gl.framebufferTexture2D(self.gl.FRAMEBUFFER, self.gl.COLOR_ATTACHMENT0, self.gl.TEXTURE_2D, self.fxaaTexture, 0);

        // Set up the voxel rendering program.
        self.voxelProgram = self.buildShader("quad.vs", "voxel.fs");
        self.gl.useProgram(self.voxelProgram);
        self.uResolution = self.gl.getUniformLocation(self.voxelProgram, "resolution");
        self.uCam = self.gl.getUniformLocation(self.voxelProgram, "cam");
        self.uLookat = self.gl.getUniformLocation(self.voxelProgram, "lookat");
        self.uCamnear = self.gl.getUniformLocation(self.voxelProgram, "camnear");
        self.uFOV = self.gl.getUniformLocation(self.voxelProgram, "fov");
        self.bWidth = self.gl.getUniformLocation(self.voxelProgram, "bWidth");
        self.bHeight = self.gl.getUniformLocation(self.voxelProgram, "bHeight");
        self.uWidth = self.gl.getUniformLocation(self.voxelProgram, "vWidth");
        self.uHeight = self.gl.getUniformLocation(self.voxelProgram, "vHeight");
        self.uDepth = self.gl.getUniformLocation(self.voxelProgram, "vDepth");
        self.uFogColor = self.gl.getUniformLocation(self.voxelProgram, "fogColor");
        self.uFogDistance = self.gl.getUniformLocation(self.voxelProgram, "fogDistance");
        self.uLight = self.gl.getUniformLocation(self.voxelProgram, "light");

        self.gl.clearColor(self.fogColor.r, self.fogColor.g, self.fogColor.b, 1);
        self.gl.disable(self.gl.DEPTH_TEST);
        self.gl.clear(self.gl.COLOR_BUFFER_BIT);

        self.aQuadPosition = self.gl.getAttribLocation(self.voxelProgram, "aVertexPosition");
        self.gl.enableVertexAttribArray(self.aQuadPosition);
        self.quadBuffer = self.gl.createBuffer();
        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.quadBuffer);
        var vertices = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
        self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array(vertices), self.gl.STATIC_DRAW);

        self.voxelTexture = self.gl.createTexture();
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.voxelTexture);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
        self.gl.activeTexture(self.gl.TEXTURE0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.voxelTexture);
        self.gl.uniform1i(self.gl.getUniformLocation(self.voxelProgram, "uSampler"), 0);
    }


    self.render = function(brownie) {
        // Size the backend and copy the brownie.
        var w = 1, h = 1;
        while (w < brownie.canvas.width) {w *= 2}
        while (h < brownie.canvas.height) {h *= 2}
        self.backend.width = w;
        self.backend.height = h;
        self.backendContext.drawImage(brownie.canvas, 0, 0);

        // Render the brownie to fxaaFBO.
        self.gl.useProgram(self.voxelProgram);
        self.gl.uniform1f(self.bWidth, self.backend.width);
        self.gl.uniform1f(self.bHeight, self.backend.height);
        self.gl.uniform1f(self.uWidth, brownie.width);
        self.gl.uniform1f(self.uHeight, brownie.height);
        self.gl.uniform1f(self.uDepth, brownie.depth);
        self.gl.uniform4fv(self.uFogColor, [self.fogColor.r, self.fogColor.g, self.fogColor.b, 1]);
        self.gl.uniform1f(self.uFogDistance, self.fogDistance);
        self.gl.uniform1f(self.uCamnear, self.near);
        self.gl.uniform2fv(self.uResolution, [self.canvas.width, self.canvas.height]);
        self.gl.uniform1f(self.uFOV, self.fov);
        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.quadBuffer);
        self.gl.vertexAttribPointer(self.aQuadPosition, 2, self.gl.FLOAT, false, 0, 0);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, self.fxaaFBO);
        self.gl.uniform3fv(self.uLookat, self.cam.target.toArray());
        self.gl.uniform3fv(self.uCam, self.cam.position.toArray());
        self.gl.uniform3fv(self.uLight, self.light.position.toArray());
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.voxelTexture);
        self.gl.uniform1i(self.gl.getUniformLocation(self.voxelProgram, "uSampler"), 0);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.gl.RGBA, self.gl.UNSIGNED_BYTE, self.backend);
        self.gl.drawArrays(self.gl.TRIANGLE_STRIP, 0, 4);

        // Apply FXAA
        self.gl.useProgram(self.fxaaProgram);
        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.quadBuffer);
        self.gl.vertexAttribPointer(self.aQuadPosition, 2, self.gl.FLOAT, false, 0, 0);
        self.gl.bindFramebuffer(self.gl.FRAMEBUFFER, null);
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.fxaaTexture);
        self.gl.uniform1i(self.gl.getUniformLocation(self.fxaaProgram, "uSampler"), 0);
        self.gl.drawArrays(self.gl.TRIANGLE_STRIP, 0, 4);
    }

    
    self.buildShader = function(vertexId, fragmentId) {
        var vcode = Voxgrind.shaders[vertexId];
        var fcode = Voxgrind.shaders[fragmentId];
        var vshader = self.gl.createShader(self.gl.VERTEX_SHADER);
        var fshader = self.gl.createShader(self.gl.FRAGMENT_SHADER);
        self.gl.shaderSource(vshader, vcode);
        self.gl.shaderSource(fshader, fcode);
        self.gl.compileShader(vshader);
        if (!self.gl.getShaderParameter(vshader, self.gl.COMPILE_STATUS)) {
            console.log(self.gl.getShaderInfoLog(vshader));
        }
        self.gl.compileShader(fshader);
        if (!self.gl.getShaderParameter(fshader, self.gl.COMPILE_STATUS)) {
            console.log(self.gl.getShaderInfoLog(fshader));
        }
        var program = self.gl.createProgram();
        self.gl.attachShader(program, vshader);
        self.gl.attachShader(program, fshader);
        self.gl.linkProgram(program);
        if (!self.gl.getProgramParameter(program, self.gl.LINK_STATUS)) {
            console.error("Voxgrind: linking failed.");
        }
        return program;
    }

    self.initialize();

}

"use strict";

Voxgrind.Camera = function() {

    var self = this;

    self.position = new Voxgrind.Vec3(0,0,0);
    self.target = new Voxgrind.Vec3(0,0,1);

}

"use strict";

Voxgrind.Brownie = function(width, height, depth) {

    var self = this;

    self.width = width;
    self.height = height;
    self.depth = depth;

    self.canvas = document.createElement("canvas");
    self.canvas.width = width;
    self.canvas.height = self.depth * self.height;
    self.context = self.canvas.getContext("2d");

    self.setVoxel = function(x, y, z, r, g, b) {
        self.context.fillStyle = "rgba(" + r + "," + g + "," + b + ",1)";
        self.context.fillRect(x, y*self.depth + z, 1,1);
    }

    self.unsetVoxel = function(x, y, z) {
        self.context.clearRect(x, y*self.depth + z, 1,1);
    }

    self.clear = function() {
        self.context.clearRect(0,0,self.width, self.height * self.depth);
    }


    self.blit = function(source, x, y, z) {

        var sourceStartX = Math.max(-x, 0);
        var sourceFinishX = Math.min(self.width - x, source.width);
        var targetWidth = sourceFinishX - sourceStartX;
        if (targetWidth < 1) {return}

        var sourceStartZ = Math.max(-z, 0);
        var sourceFinishZ = Math.min(self.depth - z, source.depth);
        var targetDepth = sourceFinishZ - sourceStartZ;
        if (targetDepth < 1) {return}

        var sourceStartY = Math.max(-y, 0);
        var sourceFinishY = Math.min(self.height - y, source.height);
        if (sourceFinishY - sourceStartY < 1) {return}

        x = Math.max(0, Math.min(self.width - 1, x));
        y = Math.max(0, Math.min(self.height - 1, y));
        z = Math.max(0, Math.min(self.depth - 1, z));

        var targetY = y;
        for (var sourceY = sourceStartY; sourceY < sourceFinishY; sourceY++) {
            self.context.drawImage(source.canvas,                                      // canvas source
                                   sourceStartX, sourceY*source.depth + sourceStartZ,  // x,y offset into source
                                   targetWidth, targetDepth,                           // width,depth from source
                                   x, targetY*self.depth + z,                          // x,y offset into target
                                   targetWidth, targetDepth);                          // width,depth to target
           targetY++;
        }
    }

}
"use strict";

Voxgrind.shaders = {};


Voxgrind.shaders['voxel.fs'] = [
    "",
    "precision highp float;",
    "",
    "uniform vec3 cam;",
    "uniform vec3 lookat;",
    "uniform vec2 resolution;",
    "uniform vec4 fogColor;",
    "uniform float fogDistance;",
    "uniform vec3 light;",
    "uniform vec3 lightColor;",
    "uniform vec3 lightDistance;",
    "uniform float fov;",
    "uniform float camnear;",
    "uniform float bWidth;",
    "uniform float bHeight;",
    "uniform float vWidth;",
    "uniform float vHeight;",
    "uniform float vDepth;",
    "uniform sampler2D uSampler;",
    "",
    "float invWidth = 1.0/bWidth;",
    "float invHD = 1.0/bHeight;",
    "",
    "vec4 sample3D(in vec3 q) {",
    "    float x = q.x * invWidth;",
    "    float y = (floor(q.y)*vDepth + q.z) * invHD;",
    "    return texture2D(uSampler, vec2(x,y));",
    "}",
    "",
    "bool rayBoxIntersect(in vec3 origin, in vec3 direction, in vec3 boxMin, in vec3 boxMax, out float t0, out float t1) {",
    "    vec3 omin = (boxMin - origin) / direction;",
    "    vec3 omax = (boxMax - origin) / direction;",
    "    vec3 imax = max(omax, omin);",
    "    vec3 imin = min(omax, omin);",
    "    t1 = min(imax.x, min(imax.y, imax.z));",
    "    t0 = max(max(imin.x, 0.0), max(imin.y, imin.z));",
    "    return t1 > t0;",
    "}",
    "",
    "void main(void) {",
    "    vec3 front = normalize(lookat - cam);",
    "    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), front));",
    "    vec3 up = normalize(cross(front, right));",
    "",
    "    // Abort if we're not in the rendering region of the frame buffer.",
    "    float fracUp = gl_FragCoord.y/resolution.y; ",
    "    if (fracUp > 1.0) {",
    "        gl_FragColor = fogColor;",
    "        return;",
    "    }",
    "    float fracRight = gl_FragCoord.x/resolution.x;",
    "    if (fracRight > 1.0) {",
    "        gl_FragColor = fogColor;",
    "        return;",
    "    }",
    "",
    "    float vpw = 2.0 * camnear * tan(radians(fov*0.5));                             // viewport width",
    "    float vph = vpw * resolution.y/resolution.x;                                   // viewport height",
    "    vec3 vp0 = (cam + (front * camnear)) - (0.5 * vpw * right) - (0.5 * vph * up); // lower left point of viewport",
    "    vec3 p0 = vp0 + (fracRight * vpw * right) + (fracUp * vph * up);               // the point on the vp corresponding to this pixel",
    "    vec3 v = floor(p0);",
    "    vec3 r = normalize(p0 - cam);",
    "",
    "    // Prevent some artifacts.",
    "    r += 0.000001;",
    "",
    "    // Initialize the marching inside the bounds.",
    "    vec3 p1 = p0;",
    "    if (p0.x < 0.0 || p0.x > vWidth - 1.0 || p0.y < 0.0 || p0.y > vHeight - 1.0 || p0.z < 0.0 || p0.z > vDepth - 1.0) {",
    "        float t0, t1;",
    "        if (!rayBoxIntersect(p0, r, vec3(0,0,0), vec3(vWidth, vHeight, vDepth), t0, t1)) {",
    "            gl_FragColor = fogColor;",
    "            return;",
    "        }",
    "        p1 = p0 + r * t0 + r * 0.0001;",
    "        v = floor(p1);",
    "    }",
    "",
    "    ",
    "    vec3 step = sign(r);",
    "    vec3 tMax = (((0.5+v) + 0.5*step) - p1)/r;",
    "    vec3 tDelta = step/r;",
    "",
    "",
    "    for (int iter = 0; iter < 2048; iter++) {",
    "        vec4 col = sample3D(v);",
    "        if (col.w == 1.0) {",
    "            float t0, t1;",
    "            if (!rayBoxIntersect(p0, r, v, v + vec3(1.0,1.0,1.0), t0, t1)) {",
    "                gl_FragColor = fogColor;",
    "                return;",
    "            }",
    "            vec3 pi = p0 + r * t0;",
    "            vec3 d = pi - (v + vec3(0.5, 0.5, 0.5));",
    "            vec3 absd = abs(d);",
    "            vec3 normal;",
    "            vec3 orthoI;",
    "            vec3 orthoJ;",
    "            if (absd.y > absd.x && absd.y > absd.z) {",
    "                normal = vec3(0, sign(d.y), 0);",
    "                orthoI = vec3(1,0,0);",
    "                orthoJ = vec3(0,0,1);",
    "            }",
    "            else if (absd.x > absd.z) {",
    "                normal = vec3(sign(d.x), 0, 0);",
    "                orthoI = vec3(0,1,0);",
    "                orthoJ = vec3(0,0,1);",
    "            }",
    "            else {",
    "                normal = vec3(0, 0, sign(d.z));",
    "                orthoI = vec3(1,0,0);",
    "                orthoJ = vec3(0,1,0);",
    "            }",
    "",
    "            // Ambient occlusion",
    "            vec3 normalBlock = v + 0.5 + normal;",
    "            float ao = 0.0;",
    "            vec3 fracpi = fract(pi);",
    "            float fpoj = dot(fracpi, orthoJ);",
    "            float omfpoj = 1.0 - fpoj;",
    "            float fpoi = dot(fracpi, orthoI);",
    "            float omfpoi = 1.0 - fpoi;",
    "            ao = max(ao, sample3D(normalBlock + orthoJ).w * fpoj);",
    "            ao = max(ao, sample3D(normalBlock - orthoJ).w * omfpoj);",
    "            ao = max(ao, sample3D(normalBlock + orthoI).w * fpoi);",
    "            ao = max(ao, sample3D(normalBlock - orthoI).w * omfpoi);",
    "            ao = max(ao, sample3D(normalBlock + orthoJ + orthoI).w * min(fpoj, fpoi));",
    "            ao = max(ao, sample3D(normalBlock + orthoJ - orthoI).w * min(fpoj, omfpoi));",
    "            ao = max(ao, sample3D(normalBlock - orthoJ + orthoI).w * min(omfpoj, fpoi));",
    "            ao = max(ao, sample3D(normalBlock - orthoJ - orthoI).w * min(omfpoj, omfpoi));",
    "            ao = max(0.0, min(1.0, ao * 0.5));",
    "",
    "            float mag = (1.0-ao) * min(1.0, max(0.0, dot(normal, normalize(light - pi)))); // point lighting",
    "            float fog = min(1.0, length(pi - cam) / fogDistance); // fog",
    "            gl_FragColor = vec4(col.r*mag * (1.0 - fog) + fog*fogColor.r, ",
    "                                col.g*mag * (1.0 - fog) + fog*fogColor.g, ",
    "                                col.b*mag * (1.0 - fog) + fog*fogColor.b, 1.0);",
    "            return;",
    "        }",
    "",
    "        if (tMax.x < tMax.y) {",
    "            if (tMax.x < tMax.z) {",
    "                v.x += step.x;",
    "                if (v.x >= vWidth || v.x < 0.0) {",
    "                    gl_FragColor = fogColor;",
    "                    return;",
    "                }",
    "                tMax.x += tDelta.x;",
    "            }",
    "            else {",
    "                v.z += step.z;",
    "                if (v.z >= vDepth || v.z < 0.0) {",
    "                    gl_FragColor = fogColor;",
    "                    return;",
    "                }",
    "                tMax.z += tDelta.z;",
    "            }",
    "        }",
    "        else {",
    "            if (tMax.y < tMax.z) {",
    "                v.y += step.y;",
    "                if (v.y >= vHeight || v.y < 0.0) {",
    "                    gl_FragColor = fogColor;",
    "                    return;",
    "                }",
    "                tMax.y += tDelta.y;",
    "            }",
    "            else {",
    "                v.z += step.z;",
    "                if (v.z >= vDepth || v.z < 0.0) {",
    "                    gl_FragColor = fogColor;",
    "                    return;",
    "                }",
    "                tMax.z += tDelta.z;",
    "            }",
    "        }",
    "    }",
    "    gl_FragColor = fogColor;            ",
    "}",
    "",
    "",
    "",
    ""
].join('\n');



Voxgrind.shaders['fxaa.fs'] = [
    "",
    "// From THREE.js: https://github.com/mrdoob/three.js",
    "",
    "precision highp float;",
    "",
    "#define FXAA_REDUCE_MIN   (1.0/128.0)",
    "#define FXAA_REDUCE_MUL   (1.0/8.0)",
    "#define FXAA_SPAN_MAX     8.0",
    "",
    "uniform sampler2D uSampler;",
    "uniform vec2 resolution;",
    "vec2 invresolution = vec2(1.0/resolution.x, 1.0/resolution.y);",
    "",
    "void main(void) {",
    "",
    "    vec4 temp  = texture2D(uSampler,  gl_FragCoord.xy  * invresolution);",
    "    if (temp.a == 0.0) {",
    "        gl_FragColor = temp;",
    "        return;",
    "    }",
    "    vec3 rgbM = temp.xyz;",
    "",
    "    vec3 rgbNW = texture2D(uSampler, (gl_FragCoord.xy + vec2(-1.0, -1.0)) * invresolution).xyz;",
    "    vec3 rgbNE = texture2D(uSampler, (gl_FragCoord.xy + vec2(1.0, -1.0)) * invresolution).xyz;",
    "    vec3 rgbSW = texture2D(uSampler, (gl_FragCoord.xy + vec2(-1.0, 1.0)) * invresolution).xyz;",
    "    vec3 rgbSE = texture2D(uSampler, (gl_FragCoord.xy + vec2(1.0, 1.0)) * invresolution).xyz;",
    "",
    "    vec3 luma = vec3(0.299, 0.587, 0.114);",
    "",
    "    float lumaNW = dot(rgbNW, luma);",
    "    float lumaNE = dot(rgbNE, luma);",
    "    float lumaSW = dot(rgbSW, luma);",
    "    float lumaSE = dot(rgbSE, luma);",
    "    float lumaM  = dot(rgbM,  luma);",
    "    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));",
    "    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE) , max(lumaSW, lumaSE)));",
    "",
    "    vec2 dir;",
    "    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));",
    "    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));",
    "",
    "    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);",
    "",
    "    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);",
    "    dir = min(vec2(FXAA_SPAN_MAX,  FXAA_SPAN_MAX),",
    "          max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),",
    "                dir * rcpDirMin)) * invresolution;",
    "",
    "    vec3 rgbA = 0.5 * (",
    "        texture2D(uSampler, gl_FragCoord.xy  * invresolution + dir * (1.0 / 3.0 - 0.5)).xyz +",
    "        texture2D(uSampler, gl_FragCoord.xy  * invresolution + dir * (2.0 / 3.0 - 0.5)).xyz);",
    "",
    "    vec3 rgbB = rgbA * 0.5 + 0.25 * (",
    "        texture2D(uSampler, gl_FragCoord.xy  * invresolution + dir * -0.5).xyz +",
    "        texture2D(uSampler, gl_FragCoord.xy  * invresolution + dir * 0.5).xyz);",
    "",
    "    float lumaB = dot(rgbB, luma);",
    "",
    "    if ((lumaB < lumaMin) || (lumaB > lumaMax)) {",
    "        gl_FragColor = vec4(rgbA, 1.0);",
    "    } ",
    "    else {",
    "        gl_FragColor = vec4(rgbB, 1.0);",
    "    }",
    "}"
].join('\n');



Voxgrind.shaders['quad.vs'] = [
    "",
    "attribute vec2 aVertexPosition;",
    "",
    "void main(void) {",
    "    gl_Position = vec4(aVertexPosition, 1.0, 1.0);",
    "}"
].join('\n');



