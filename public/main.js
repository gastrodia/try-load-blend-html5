/**
 * Created by ELatA on 2014/4/16.
 */

require(["three","threex-defaultworld","threex-colladaloader","blender","dat.gui"],function(THREE,DefaultWorld,ColladaLoader,blender){



    var world = new DefaultWorld();
    //world.enableRotateCube = true;
    world.run();


    blender.read("/public/assets/cube.blend",function(err,bl){
        if(!err){
            console.log("File version: ", bl.header.version);
            console.log("Reading meshes...");
           /* var meshes = bl.getBlocks("Mesh");
            console.log(meshes);

            for(var i in meshes){
                var block = meshes[i];
                var obj = bl.readObject(block.address);

                var mesh = bl.readMesh(obj);
            }*/
            /*for(var type in bl.dna.blockMap){
                var blocks = bl.dna.blockMap[type];

                console.log("------------------------------------------------------"+ type + "------------------------------------------------------");
                for(var i in blocks){
                    var block = blocks[i];
                    var address = block.address;
                    var obj = bl.readObject(address);
                    console.log(obj);
                }
            }*/

            var scenesBlocks = bl.getBlocks("Scene");
            for(var i in scenesBlocks){
                var sceneBlock = scenesBlocks[i];
                var scene = bl.readObject(sceneBlock.address);
                console.log(scene);
                /*for(var j in scene){
                    var val = scene[j];
                    if(isAddress(val)){
                        console.log(j,val);
                        console.log(bl.readObject(val))
                    }
                }*/

            }
        }else{
            console.log("Blend file load error",err);
        }

    });

    function isAddress(val){
        return !isNaN(val)&& val > 10000;
    }

});