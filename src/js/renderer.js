

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
