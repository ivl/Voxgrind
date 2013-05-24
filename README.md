Voxgrind
========

A set of glsl shaders for rendering a voxel scene with a ray marching algorithm and a reference javascript library.

In lieu of the forthcoming documentation, here's an example:

```javascript
<!doctype html>

<html>

    <head>

        <script src="../../build/voxgrind.js"></script>

        <script>

            "use strict";

            var renderer   = null, 
                scene      = null, 
                grass      = null,
                column     = null,
                columnPos  = [],
                columnSize = 16,
                camPos     = {x: 32, z: 32},
                keys       = {};

            var initialize = function() {

                // Initialize the canvas.
                var canvas = document.getElementById("glcanvas");
                canvas.width = window.innerWidth;//640;
                canvas.height = window.innerHeight;

                // Initialize the Voxgrind renderer.
                renderer = new Voxgrind.Renderer(canvas)
                renderer.fogColor = {r: 0.75, g: 0.75, b: 1.0};
                renderer.fov = 75;

                // Set up the camera.
                renderer.cam.position.set(64, 64, -32);     // This is where the camera is located.
                renderer.cam.target.set(64, 0, 64);         // This is the point the camera is looking at.

                // Set up the light.
                renderer.light.position.set(64, 64, -32);   // This is the position of the light.

                // Create the scene brownie. We'll blit our brownies into this 
                // and then render it with the renderer.
                // Note: a "brownie" is pretty much like a sprite, but 3D.
                scene = new Voxgrind.Brownie(128, 32, 128); // width, height, and depth

                // Build the grass brownie.
                grass = new Voxgrind.Brownie(512, 3, 512);

                // Fill the bottom voxel plain with 0.5 green.
                grass.context.fillStyle = "rgba(0,128,0,1)";
                grass.context.fillRect(0, 0, 512, 512)

                // Add a bunch of randomly-toned green voxels to simulate 
                // grass patches.
                for (var i = 0; i < 100000; i++) {
                    var x = Math.floor(Math.random() * 512);
                    var y = Math.floor(Math.random() * 3);
                    var z = Math.floor(Math.random() * 512);
                    var g = Math.floor(Math.random() * 192 + 64);
                    grass.setVoxel(x, y, z, 0, g, 0);
                }

                // Build the column brownie. Iterate over a box that is 
                // columnSize voxels wide, 31 voxels high, and columnSize
                // voxels deep. If the coordinate is inside the square top
                // or bottom of the column, place a voxel. If it's inside
                // the round column part, place a voxel. Otherwise, skip that 
                // voxel.
                column = new Voxgrind.Brownie(columnSize, 31, columnSize);
                for (var x = 0; x < columnSize; x++) {
                    for (var y = 0; y < 31; y++) {
                        for (var z = 0; z < columnSize; z++) {
                            var c = Math.floor(Math.random() * 128 + 128);
                            if (y == 0 || y == 30) {
                                column.setVoxel(x, y, z, c, c, c);
                                continue;
                            }
                            var dx = x - columnSize / 2;
                            var dz = z - columnSize / 2;
                            var d = Math.sqrt(dx*dx + dz*dz);
                            if (d >= columnSize/3) {
                                continue;
                            }
                            column.setVoxel(x, y, z, c, c, c);
                        }
                    }
                }

                // Generate random positions for 100 columns.
                for (var i = 0; i < 100; i++) {
                    var x = Math.floor(Math.random() * 32);
                    var z = Math.floor(Math.random() * 32);
                    columnPos.push({x: x, z: z});
                }

                // Deal with keyboard events.
                window.addEventListener("keydown", function(e) {
                    keys[e.which] = true;
                });
                window.addEventListener("keyup", function(e) { 
                    delete keys[e.which];
                });

                // Start the animation loop.
                animate();

            };


            var animate = function() {
                // Make a request for the next frame.
                requestAnimationFrame(animate);

                // Update the camera position.
                if (keys[38]) {
                    camPos.z++;
                }
                if (keys[40]) {
                    camPos.z--;
                }
                if (keys[39]) {
                    camPos.x++;
                }
                if (keys[37]) {
                    camPos.x--;
                }

                // Completely clear the scene brownie.
                scene.clear();

                // Blit the grass.
                scene.blit(grass, -camPos.x, 0, -camPos.z);

                // Blit the columns.
                for (var i = 0; i < 100; i++) {
                    scene.blit(column, columnPos[i].x*16 - camPos.x, 1, columnPos[i].z*16 - camPos.z)
                }

                // Render the scene.
                renderer.render(scene);
            }


        </script>

        <style>

            html, body {
                text-align: center;
                padding: 0;
                margin: 0;
            }

            canvas {
                display: block;
            }

        </style>

    </head>


    <body onload="initialize()">

        <canvas id="glcanvas"></canvas>
        
    </body>


</html>
```
