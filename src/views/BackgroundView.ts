import { Sprite, Assets } from "pixi.js";
import { IView } from "../types/View";

export class BackgroundView extends IView {
  protected _viewerBg: Sprite | undefined;

  constructor() {
    super();
    this.sortableChildren = true;
  }

  static new() {
    return new this();
  }

  public clear(): void {
    if (this._viewerBg) {
        this.removeChild(this._viewerBg);
        this._viewerBg.destroy();
        this._viewerBg = undefined;
    }
  }

  public async loadViewerBackground() {
    const url = "https://raw.githubusercontent.com/wds-sirius/Adv-Resource/refs/heads/main/background/860.png";
    if (!Assets.cache.has(url)) {
      await Assets.load(url);
    }
    
    if (!this._viewerBg) {
      this._viewerBg = new Sprite(Assets.get(url));
      this._viewerBg.anchor.set(0.5);
      this.addChild(this._viewerBg);
      this._viewerBg.zIndex = -10;
    }
    
    this.resizeBackground();
  }

  public resizeBackground() {
    if (this._viewerBg && this._viewerBg.texture) {
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const bgW = this._viewerBg.texture.width || 1;
      const bgH = this._viewerBg.texture.height || 1;
      
      const scale = Math.max(sw / bgW, sh / bgH);
      this._viewerBg.scale.set(scale);
      this._viewerBg.position.set(sw / 2, sh / 2);
    }
  }
}
