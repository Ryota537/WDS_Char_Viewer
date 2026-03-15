import { Container, Assets } from "pixi.js";
//views
import { BackgroundView } from "./views/BackgroundView";
import { CharacterView } from "./views/CharacterView";
import { EffectView } from "./views/EffectView";

//constant
import { baseAssets, Layer } from "./constant/advConstant";
//utils
import { createEmptySprite } from "./utils/emptySprite";
import { resPath } from "./utils/resPath";
import { loadPlayerAssetsBundle } from './utils/loadResources';

export class AdvPlayer extends Container<any> {
  //init
  protected _inited : boolean = false;
  //View
  protected _backgroundView!: BackgroundView;
  protected _characterView!: CharacterView;
  protected _effectView!: EffectView;

  constructor() {
    super();

    //advPlayer setting
    this.addChild(createEmptySprite({ empty : true, color: 0x000000 }));
    this.sortableChildren = true;
    this.eventMode = "static";
  }

  public static async create<C extends Container>(pixiapp? : C): Promise<AdvPlayer> {
    const self = new this();
    if(pixiapp){
      self.addTo(pixiapp);
    }
    await self.init();
    return self;
  }

  public async init(){
    await loadPlayerAssetsBundle('baseAssets', baseAssets);

    //views
    this._effectView = new EffectView().addTo(this, Layer.EffectLayer);
    this._characterView = new CharacterView().addTo(this._effectView, Layer.CharacterLayer);
    this._backgroundView = new BackgroundView().addTo(this._effectView, Layer.BackgroundLayer);

    this._inited = true;
  }

  public addTo<C extends Container>(parent: C): AdvPlayer {
    parent.addChild(this);
    return this;
  }

  public async clear() {
    //hide all view!
    this._backgroundView.clear();
    this._characterView.clear();
    this._effectView.clear();
  }

  public async initModelViewer(spineId: number = 10101) {
    await this.clear();

    // 1. Set background to solid green (#00FF00) for chroma keying
    const bgSprite = createEmptySprite({ empty: false, color: 0x00FF00, width: 1920, height: 1080 });
    this._backgroundView.addChild(bgSprite);

    // 2. Load spinal assets
    const resources: Record<string, string> = {};
    resources[`spine_${spineId}`] = resPath.spine(spineId);
    resources[`spine_atlas_${spineId}`] = resPath.spine_atlas(spineId);
    
    Assets.addBundle(`viewer_bundle`, resources);
    await Assets.loadBundle(`viewer_bundle`);

    // 3. Spawn character in the center
    this._characterView.spawnCharacter(spineId);
  }

  // Exposed controllers
  public setExpression(expressionId: number) {
    this._characterView.setExpression(expressionId);
  }

  public setBodyMotion(motionId: number) {
    this._characterView.setBodyMotion(motionId);
  }
}
