import { getUrlParams } from "./utils/UrlParams";
import { AdvPlayer } from "./AdvPlayer";
import { createApp } from "./utils/createApp";
import FacialExpression from "./constant/FacialExpression";
import BodyMotion from "./constant/BodyMotion";
import HeadDirection from "./constant/HeadDirection";

import { CHARACTER_MAP, THEATER_ORDER } from "./constant/charList";

// ===== GitHub API: Fetch available Spine IDs =====
type SpineRegistry = Record<string, string[]>; // baseId -> variation suffixes[]

async function fetchSpineRegistry(): Promise<SpineRegistry> {
    const res = await fetch(
        "https://api.github.com/repos/wds-sirius/adv-resource/contents/spine"
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const items: { name: string }[] = await res.json();
    const registry: SpineRegistry = {};
    const idRegex = /^(\d{5})\.png$/;

    for (const item of items) {
        const match = item.name.match(idRegex);
        if (!match) continue;

        const fullId = match[1]; // e.g. "10101"
        const baseId = fullId.slice(0, 3); // e.g. "101"
        const variation = fullId.slice(3); // e.g. "01"

        if (!registry[baseId]) registry[baseId] = [];
        registry[baseId].push(variation);
    }

    // Sort variations within each base
    for (const baseId of Object.keys(registry)) {
        registry[baseId].sort();
    }

    return registry;
}

// ===== App Init =====
const { renderer } = getUrlParams();
const app = await createApp(<"webgl" | "webgpu">renderer);

const advplayer = await AdvPlayer.create(app.stage);
(window as any).viewerControl = advplayer;

let currentSpineId = 10101;
let currentMode: "preset" | "custom" = "preset";
let spineRegistry: SpineRegistry = {};

await advplayer.initModelViewer(currentSpineId);

// ===== DOM refs =====
const characterSelect = document.getElementById("character-select") as HTMLSelectElement;
const variationSelect = document.getElementById("variation-select") as HTMLSelectElement;
const loadButton = document.getElementById("load-spine") as HTMLButtonElement;
const apiStatus = document.getElementById("api-status") as HTMLDivElement;

const expressionSelect = document.getElementById("expression-select") as HTMLSelectElement;
const motionSelect = document.getElementById("motion-select") as HTMLSelectElement;
const directionSelect = document.getElementById("direction-select") as HTMLSelectElement;

const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
const presetTab = document.getElementById("tab-preset")!;
const customTab = document.getElementById("tab-custom")!;
const resetBtn = document.getElementById("reset-pose-btn");

// ===== Character Selector =====
function populateCharacterDropdown() {
    characterSelect.innerHTML = '<option value="">-- Select Character --</option>';

    // Group characters by theater, using only base IDs that appear in the registry
    const theaterGroups: Record<string, { baseId: string; name: string }[]> = {};

    for (const baseId of Object.keys(spineRegistry)) {
        const charInfo = CHARACTER_MAP[baseId];
        const theater = charInfo ? charInfo.theater : "Unknown";
        const name = charInfo ? charInfo.name : `Character ${baseId}`;

        if (!theaterGroups[theater]) theaterGroups[theater] = [];
        theaterGroups[theater].push({ baseId, name });
    }

    // Render optgroups in theater order
    const orderedTheaters = [
        ...THEATER_ORDER.filter((t) => theaterGroups[t]),
        ...Object.keys(theaterGroups).filter((t) => !THEATER_ORDER.includes(t)),
    ];

    for (const theater of orderedTheaters) {
        const group = theaterGroups[theater];
        const optgroup = document.createElement("optgroup");
        optgroup.label = theater;

        // Sort by name within each theater
        group.sort((a, b) => a.name.localeCompare(b.name));

        for (const { baseId, name } of group) {
            const option = document.createElement("option");
            option.value = baseId;
            option.text = `${name} (${baseId})`;
            optgroup.appendChild(option);
        }

        characterSelect.appendChild(optgroup);
    }

    characterSelect.disabled = false;
}

function populateVariationDropdown(baseId: string) {
    variationSelect.innerHTML = "";

    const variations = spineRegistry[baseId] || [];
    if (variations.length === 0) {
        variationSelect.innerHTML = '<option value="">No variations</option>';
        variationSelect.disabled = true;
        loadButton.disabled = true;
        return;
    }

    for (const variation of variations) {
        const option = document.createElement("option");
        option.value = variation;
        option.text = `Variation ${variation}`;
        variationSelect.appendChild(option);
    }

    variationSelect.disabled = false;
    loadButton.disabled = false;
}

// Character select change → populate variations
characterSelect.addEventListener("change", () => {
    const baseId = characterSelect.value;
    if (!baseId) {
        variationSelect.innerHTML = '<option value="">--</option>';
        variationSelect.disabled = true;
        loadButton.disabled = true;
        return;
    }
    populateVariationDropdown(baseId);
});

// Load button
loadButton.addEventListener("click", async () => {
    const baseId = characterSelect.value;
    const variation = variationSelect.value;
    if (!baseId || !variation) return;

    const spineId = parseInt(baseId + variation);
    if (isNaN(spineId)) return;

    loadButton.disabled = true;
    loadButton.textContent = "Loading...";

    try {
        currentSpineId = spineId;
        await advplayer.initModelViewer(currentSpineId);

        // Reset preset dropdowns
        if (expressionSelect) expressionSelect.value = "";
        if (motionSelect) motionSelect.value = "";
        if (directionSelect) directionSelect.value = "";

        // Rebuild custom UI if active
        if (currentMode === "custom") {
            buildCustomUI();
        }
    } catch (err) {
        console.error("Failed to load character:", err);
    } finally {
        loadButton.disabled = false;
        loadButton.textContent = "Load Character";
    }
});

// Fetch the registry on startup
(async () => {
    try {
        spineRegistry = await fetchSpineRegistry();
        const totalIds = Object.values(spineRegistry).reduce((s, v) => s + v.length, 0);
        apiStatus.textContent = `${totalIds} models available`;
        apiStatus.className = "api-status success";
        populateCharacterDropdown();

        // Pre-select the default character (101 / 01)
        characterSelect.value = "101";
        populateVariationDropdown("101");
        variationSelect.value = "01";
    } catch (err) {
        console.error("Failed to fetch spine registry:", err);
        apiStatus.textContent = "Failed to load character list";
        apiStatus.className = "api-status error";
        // Fallback: allow manual input
        characterSelect.innerHTML =
            '<option value="">API unavailable</option>';
    }
})();

// ===== Tab System =====
tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetTab = btn.dataset.tab as "preset" | "custom";

        if (currentMode === "custom" && targetTab === "preset") {
            advplayer.resetToSetupPose();
        }

        currentMode = targetTab;

        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        presetTab.classList.toggle("active", targetTab === "preset");
        customTab.classList.toggle("active", targetTab === "custom");

        if (targetTab === "custom") {
            buildCustomUI();
        }
    });
});

// ===== Preset Mode =====
if (expressionSelect) {
    FacialExpression.forEach((exp) => {
        const option = document.createElement("option");
        option.value = exp.Id.toString();
        const eyeLabel = exp.Eye.split("/")[1] || exp.Eye;
        const mouthLabel = exp.Mouth.split("/")[1] || exp.Mouth;
        const cheekLabel = exp.Cheek.split("/")[1] || "";
        const browLabel = exp.EyeBrow.split("/")[1] || "";
        option.text = `#${exp.Id} — ${browLabel} / ${eyeLabel} / ${mouthLabel}${cheekLabel !== "normal" ? " / " + cheekLabel : ""}`;
        expressionSelect.appendChild(option);
    });

    expressionSelect.addEventListener("change", (e) => {
        const val = parseInt((e.target as HTMLSelectElement).value);
        if (!isNaN(val)) advplayer.setExpression(val);
    });
}

if (motionSelect) {
    BodyMotion.forEach((mot) => {
        const option = document.createElement("option");
        option.value = mot.Id.toString();
        option.text = mot.MotionName;
        motionSelect.appendChild(option);
    });

    motionSelect.addEventListener("change", (e) => {
        const val = parseInt((e.target as HTMLSelectElement).value);
        if (!isNaN(val)) advplayer.setBodyMotion(val);
    });
}

if (directionSelect) {
    HeadDirection.forEach((hd) => {
        const option = document.createElement("option");
        option.value = hd.Id.toString();
        option.text = hd.DirectionName;
        directionSelect.appendChild(option);
    });

    directionSelect.addEventListener("change", (e) => {
        const val = parseInt((e.target as HTMLSelectElement).value);
        if (!isNaN(val)) advplayer.setHeadDirection(val);
    });
}

// ===== Reset button =====
if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        advplayer.resetToSetupPose();
        buildCustomUI();
    });
}

// ===== Screenshot button =====
const screenshotBtn = document.getElementById("screenshot-btn");
if (screenshotBtn) {
    screenshotBtn.addEventListener("click", () => {
        advplayer.hideBackground();
        app.renderer.render(app.stage);
        const canvas = app.renderer.extract.canvas(app.stage) as HTMLCanvasElement;
        const dataUrl = canvas.toDataURL("image/png");
        advplayer.showBackground();
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `wds-spine-${currentSpineId}.png`;
        a.click();
    });
}

// ===== Custom Mode Builder =====

function buildCustomUI() {
    buildBoneSliders();
    buildAnimationScrubbers();
}

function buildBoneSliders() {
    const container = document.getElementById("custom-bones-container")!;
    container.innerHTML = "";

    const bones = advplayer.getBones();
    if (!bones || bones.length === 0) {
        container.innerHTML = '<div class="empty-state">No bones available</div>';
        return;
    }

    const categories: Record<string, typeof bones> = {
        "Fingers": [],
        "Arms": [],
        "Head & Face": [],
        "Torso": [],
        "Legs": [],
        "Others": []
    };

    bones.forEach((bone: any) => {
        const name = (bone.data.name as string).toLowerCase();

        if (/thumb|index|middle|ring|pinky|finger|yubi/.test(name)) {
            categories["Fingers"].push(bone);
        } else if (/arm|elbow|wrist|shoulder|hand/.test(name)) {
            categories["Arms"].push(bone);
        } else if (/head|neck|eye|brow|mouth|lip|hair|ear|jaw|cheek/.test(name)) {
            categories["Head & Face"].push(bone);
        } else if (/spine|hip|chest|pelvis|bust|root/.test(name)) {
            categories["Torso"].push(bone);
        } else if (/leg|knee|foot|ankle|toe/.test(name)) {
            categories["Legs"].push(bone);
        } else {
            categories["Others"].push(bone);
        }
    });

    Object.keys(categories).forEach((categoryName) => {
        const group = categories[categoryName];
        if (group.length === 0) return;

        const details = document.createElement("details");
        details.style.marginBottom = "10px";
        details.style.paddingLeft = "5px";
        details.style.borderLeft = "2px solid #555";
        
        const summary = document.createElement("summary");
        summary.style.fontWeight = "bold";
        summary.style.cursor = "pointer";
        summary.style.padding = "5px 0";
        summary.style.color = "rgba(255,255,255,0.7)";
        summary.style.fontSize = "12px";
        summary.textContent = `${categoryName} (${group.length} bones)`;
        
        details.appendChild(summary);

        group.forEach((bone: any) => {
            const boneName = bone.data.name;
            const item = document.createElement("div");
            item.className = "slider-item";
            const defaultRotation = bone.rotation || 0;

            item.innerHTML = `
                <div class="slider-header">
                    <span class="slider-label">${boneName}</span>
                    <span class="slider-value">${defaultRotation.toFixed(1)}°</span>
                </div>
                <input type="range" min="-180" max="180" step="0.5" value="${defaultRotation}">
            `;
            details.appendChild(item);

            const slider = item.querySelector("input") as HTMLInputElement;
            const valueDisplay = item.querySelector(".slider-value") as HTMLSpanElement;

            slider.addEventListener("input", () => {
                const rotation = parseFloat(slider.value);
                valueDisplay.textContent = `${rotation.toFixed(1)}°`;
                advplayer.setBoneTransform(boneName, rotation);
            });
        });

        container.appendChild(details);
    });
}

function buildAnimationScrubbers() {
    const container = document.getElementById("custom-anims-container")!;
    container.innerHTML = "";

    const animations = advplayer.getAnimations();
    if (!animations || animations.length === 0) {
        container.innerHTML = '<div class="empty-state">No animations available</div>';
        return;
    }

    const grouped: Record<string, string[]> = {};
    animations.forEach((anim: any) => {
        const name = anim.name as string;
        const prefix = name.includes("/") ? name.split("/")[0] : "other";
        if (!grouped[prefix]) grouped[prefix] = [];
        grouped[prefix].push(name);
    });

    let trackCounter = 10;

    Object.keys(grouped)
        .sort()
        .forEach((group) => {
            const animNames = grouped[group];

            const groupLabel = document.createElement("div");
            groupLabel.style.cssText =
                "font-size:11px; color:rgba(255,255,255,0.4); font-weight:600; text-transform:uppercase; margin: 10px 0 6px; letter-spacing:0.4px;";
            groupLabel.textContent = group;
            container.appendChild(groupLabel);

            animNames.forEach((animName) => {
                const trackIdx = trackCounter++;
                const item = document.createElement("div");
                item.className = "slider-item";
                const shortName = animName.includes("/") ? animName.split("/")[1] : animName;

                item.innerHTML = `
                    <div class="slider-header">
                        <span class="slider-label">${shortName}</span>
                        <span class="slider-value">0%</span>
                    </div>
                    <input type="range" min="0" max="100" step="1" value="0">
                `;
                container.appendChild(item);

                const slider = item.querySelector("input") as HTMLInputElement;
                const valueDisplay = item.querySelector(".slider-value") as HTMLSpanElement;

                slider.addEventListener("input", () => {
                    const progress = parseInt(slider.value) / 100;
                    valueDisplay.textContent = `${slider.value}%`;
                    advplayer.scrubAnimation(trackIdx, animName, progress);
                });
            });
        });
}
