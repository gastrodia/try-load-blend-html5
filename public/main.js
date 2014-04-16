/**
 * Created by ELatA on 2014/4/16.
 */

require(["three","threex-defaultworld","dat.gui"],function(THREE,DefaultWorld){

    var SceneExporter = function(){} ;
    SceneExporter.prototype = {
        constructor:SceneExporter,
        parse:function(scene){

            var meshes = {};
            for(var i in scene.children){
                var node =  scene.children[i];
                if(node instanceof  THREE.Mesh){
                    console.log(node);
                }
            }
        }
    };


    var controls = new function() {
        this.SceneExporter = function(){
            var exporter = new SceneExporter();
            exporter.parse(world);
        };
    };
    var gui = new dat.GUI();
    gui.add(controls,'SceneExporter');

    var world = new DefaultWorld();
    world.enableRotateCube = true;
    world.run();
});