
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