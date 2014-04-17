require.config({
  baseUrl: "public",
  shim: {
    three: {
      exports: "THREE"
    },
    "threex-controls": {
      deps: [
        "three"
      ]
    },
    "threex-colladaloader": {
      deps: [
        "three"
      ]
    }
  },
  paths: {
    "threex-defaultworld": "components/threex-defaultworld/defaultworld",
    three: "components/three.js/three.min",
    "threex-controls": "components/threex-controls/controls/OrbitControls",
    "dat.gui": "components/dat.gui/dat.gui",
    "threejs-stats": "components/threejs-stats/Stats",
    "threex-colladaloader": "components/threex-colladaloader/ColladaLoader",
    bl: "src/bl"
  }
});
