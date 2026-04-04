import { Application } from "pixi.js";

export let currenRenderer: string;

export let appInstance: Application;

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
      resizeTo: window,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    currenRenderer = pixiapp.renderer.name;

    (globalThis as any).__PIXI_APP__ = pixiapp;
    appInstance = pixiapp;
  
    pixiapp.canvas.setAttribute("id", "WDS");
    
    // Add canvas to body
    // PixiJS's `resizeTo: window` will automatically manage the <canvas> inline styles
    document.body.appendChild(pixiapp.canvas);
  

    // Global resize listener that alerts our custom views
    window.addEventListener('resize', () => {
      window.dispatchEvent(new Event('wds-resize'));
    });
    
    return pixiapp;
}