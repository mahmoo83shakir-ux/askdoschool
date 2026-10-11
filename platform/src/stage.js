// One WebGL renderer on #scene, shared by every game (a canvas can hold only one GL context).
const Stage = (() => {
  let renderer = null;
  return {
    renderer() {
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("scene"), antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor("#0e1c2b");
      }
      return renderer;
    },
  };
})();
