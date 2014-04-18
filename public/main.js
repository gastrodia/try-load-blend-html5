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

           blender.read("/public/assets/cube_del.blend",function(err,bl2){
               var blockMap1 = bl.dna.blockMap;
               var blockMap2 = bl2.dna.blockMap;
               for(var i in blockMap1){
                   if(!blockMap2[i]){
                       console.log(i,"在block2中不存在");
                       continue;
                   }
                   if(blockMap1[i].length != blockMap2[i].length){
                       console.log("发现不同" + i);
                       console.log(blockMap1[i]);
                       console.log(blockMap2[i]);
                   }
               }
           })
        }else{
            console.log("Blend file load error",err);
        }

    });

    function isAddress(val){
        return !isNaN(val)&& val > 10000;
    }

});