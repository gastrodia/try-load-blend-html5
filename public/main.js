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
            var meshes = bl.getBlocks("Mesh");
            console.log(meshes);

            for(var i in meshes){
                var block = meshes[i];
                var obj = bl.readObject(block.address);

                console.log("Mesh at 0x" + block.address,
                    "total vertices/faces/edges:",
                        obj.totvert + "/" + obj.totface + "/" + obj.totedge);

                console.log("Object:");
                console.log(obj);
                for(var i in obj){
                    var val = obj[i];
                    /*if(!isNaN(val)&& val > 10000){
                        console.log(i,val);
                        console.log(bl.readObject(val));
                    }*/
                    if(val instanceof Array){
                        console.log(i,val);
                    }
                }
                var vdata = obj["vdata"][2];
                console.log(vdata);
            }

        }else{
            console.log("Blend file load error",err);
        }

    });


});