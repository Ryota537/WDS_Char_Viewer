import { getUrlParams } from "./utils/UrlParams";
import { AdvPlayer } from "./AdvPlayer";
import { createApp } from "./utils/createApp";
import FacialExpression from "./constant/FacialExpression";
import BodyMotion from "./constant/BodyMotion";

const { renderer } = getUrlParams();

const app = await createApp(<'webgl' | 'webgpu'> renderer);

//create Adv Player
const advplayer = await AdvPlayer.create(app.stage);
(window as any).viewerControl = advplayer;

let currentSpineId = 10101;
await advplayer.initModelViewer(currentSpineId);

// Setup UI
const expressionSelect = document.getElementById('expression-select') as HTMLSelectElement;
if (expressionSelect) {
    FacialExpression.forEach(exp => {
        const option = document.createElement('option');
        option.value = exp.Id.toString();
        option.text = `ID: ${exp.Id} (${exp.EyeBrow}, ${exp.Mouth})`;
        expressionSelect.appendChild(option);
    });
    
    expressionSelect.addEventListener('change', (e) => {
        const val = parseInt((e.target as HTMLSelectElement).value);
        if(!isNaN(val)) advplayer.setExpression(val);
    });
}

const motionSelect = document.getElementById('motion-select') as HTMLSelectElement;
if (motionSelect) {
    BodyMotion.forEach(mot => {
        const option = document.createElement('option');
        option.value = mot.Id.toString();
        option.text = mot.MotionName;
        motionSelect.appendChild(option);
    });
    
    motionSelect.addEventListener('change', (e) => {
        const val = parseInt((e.target as HTMLSelectElement).value);
        if(!isNaN(val)) advplayer.setBodyMotion(val);
    });
}

const spineInput = document.getElementById('spine-id') as HTMLInputElement;
const loadButton = document.getElementById('load-spine') as HTMLButtonElement;
if (spineInput && loadButton) {
    loadButton.addEventListener('click', async () => {
        const val = parseInt(spineInput.value);
        if (!isNaN(val)) {
            currentSpineId = val;
            await advplayer.initModelViewer(currentSpineId);
            
            // Reset dropdowns
            if (expressionSelect) expressionSelect.value = "";
            if (motionSelect) motionSelect.value = "";
        }
    });
}
