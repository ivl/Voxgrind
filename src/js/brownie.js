
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