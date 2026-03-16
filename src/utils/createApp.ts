import { Group } from "tweedle.js";
import { Application, Ticker } from "pixi.js";

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1440;

export let currenRenderer: string;

export async function createApp(preference: 'webgl' | 'webgpu' = 'webgpu') {
    if (document.getElementById("WDS")) {
      document.getElementById("WDS")!.remove();
    }

    if(preference.toLocaleLowerCase() != 'webgl' && preference.toLocaleLowerCase() != 'webgpu'){
      preference = 'webgpu'; // default to webgpu
    }

    const pixiapp = new Application();
    await pixiapp.init({
      preference,
      hello : false,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundAlpha: 0,
    });

    currenRenderer = pixiapp.renderer.name;

    (globalThis as any).__PIXI_APP__ = pixiapp;
  
    pixiapp.canvas.setAttribute("id", "WDS");
    document.body.appendChild(pixiapp.canvas);
  
    Ticker.shared.add(() => Group.shared.update());
  
    let resize = () => {
      const screenWidth = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0
      );
      const screenHeight = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight || 0
      );
  
      const ratio = Math.min(screenWidth / CANVAS_WIDTH, screenHeight / CANVAS_HEIGHT);
  
      let resizedX = Math.floor(CANVAS_WIDTH * ratio);
      let resizedY = Math.floor(CANVAS_HEIGHT * ratio);
  
      pixiapp.canvas.style.width = resizedX + "px";
      pixiapp.canvas.style.height = resizedY + "px";
    };
    
    window.onresize = () => resize();
    resize();
    
    return pixiapp;
}