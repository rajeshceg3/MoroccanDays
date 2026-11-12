import {createSoundscape} from './soundscape.js';
import {SOUND_PLACES} from './sound-places.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const root = document.getElementById('root');
root.innerHTML = `
  <canvas id="world"></canvas>
  <section class="hud">
    <p class="eyebrow">Procedural Morocco Frontier</p>
    <h1>Moroccan Days</h1>
    <p>Drift through a relaxing Moroccan village that unfolds from Atlantic coast to medina, oasis, cedar mountains, and Sahara dunes.</p>
    <div class="legend">
      <span>WASD / arrows: wander</span><span>Mouse: look</span><span>Scroll: zoom</span>
    </div>
  </section>
  <section class="biome-card" id="biomeCard">Entering: Atlantic Whitewash</section>
  <nav class="places" aria-label="Visit a landscape">
    <button data-z="190">Coast</button><button data-z="95">Cedars</button><button data-z="0">Medina</button><button data-z="-105">Oasis</button><button data-z="-190">Dunes</button>
    <button id="resetView">Reset view</button><button id="sound" aria-pressed="false">Sound on</button>
  </nav>
`;

const ambience=createSoundscape(SOUND_PLACES);
let soundPlace=2;
window.moroccoSound=ambience;
document.getElementById('sound').onclick=()=>{const on=ambience.toggle(soundPlace);const b=document.getElementById('sound');b.textContent=on?'Sound off':'Sound on';b.setAttribute('aria-pressed',String(on))};
const canvas = document.getElementById('world');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf6d7a6, 0.009);
scene.background = new THREE.Color(0xf6d7a6);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 15, 35);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 18;
controls.maxDistance = 95;
controls.target.set(0, 4, 0);

const sun = new THREE.DirectionalLight(0xffd59a, 3.8);
sun.position.set(-70, 95, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x8fc9ff, 0xc5753b, 1.45));

const palette = {
  clay: 0xb45f3c,
  rose: 0xd88b72,
  saffron: 0xf2b84b,
  cobalt: 0x1c6fa8,
  zellige: 0x20a6a2,
  cedar: 0x1f5d3b,
  sand: 0xd9ad6a,
  white: 0xf8f2de,
  palm: 0x2f7a43,
};

function material(color, roughness = 0.85, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const mats = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, material(v)]));
mats.water = new THREE.MeshPhysicalMaterial({ color: 0x2f9bc1, transmission: 0.15, roughness: 0.22, metalness: 0, transparent: true, opacity: 0.72 });
mats.glow = new THREE.MeshBasicMaterial({ color: 0xffd47d });

function hash(x, z) {
  return Math.abs(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123) % 1;
}

function terrainHeight(x, z) {
  const mountain = Math.max(0, 1 - Math.abs(z - 95) / 105) * (8 + 15 * hash(Math.floor(x / 15), Math.floor(z / 15)));
  const dunes = z < -80 ? Math.sin(x * 0.06 + z * 0.04) * 3 + Math.sin(x * 0.15) * 1.8 : 0;
  const coast = z > 160 ? -1.4 : 0;
  return mountain + dunes + coast + Math.sin(x * 0.025) * 1.4 + Math.cos(z * 0.02) * 1.1;
}

const terrainGeo = new THREE.PlaneGeometry(420, 520, 170, 210);
terrainGeo.rotateX(-Math.PI / 2);
const colors = [];
const color = new THREE.Color();
for (let i = 0; i < terrainGeo.attributes.position.count; i++) {
  const x = terrainGeo.attributes.position.getX(i);
  const z = terrainGeo.attributes.position.getZ(i);
  const y = terrainHeight(x, z);
  terrainGeo.attributes.position.setY(i, y);
  if (z > 155) color.setHex(0xf2ead3);
  else if (z > 70) color.setHex(0x8b815f);
  else if (z < -95) color.setHex(0xe2b66d);
  else if (Math.abs(x) < 22 && z > -55 && z < 58) color.setHex(0xca6f46);
  else color.setHex(0xd49a5f);
  colors.push(color.r, color.g, color.b);
}
terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
terrain.receiveShadow = true;
scene.add(terrain);

function addBox(x, z, w, h, d, mat) {
  const y = terrainHeight(x, z) + h / 2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addRiad(x, z, scale = 1) {
  const base = addBox(x, z, 10 * scale, 8 * scale, 9 * scale, hash(x,z) > .5 ? mats.rose : mats.clay);
  addBox(x, z - 5 * scale, 11 * scale, 1.1 * scale, 1.2 * scale, mats.cobalt);
  addBox(x - 3 * scale, z - 4.9 * scale, 1.2 * scale, 4 * scale, .6 * scale, mats.zellige);
  addBox(x + 3 * scale, z - 4.9 * scale, 1.2 * scale, 4 * scale, .6 * scale, mats.zellige);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.7 * scale, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), mats.white);
  dome.position.set(x, terrainHeight(x, z) + 8 * scale, z);
  dome.castShadow = true;
  scene.add(dome);
  const roof = addBox(x, z, 10.8 * scale, .35 * scale, 9.8 * scale, mats.saffron);
  roof.position.y = terrainHeight(x, z) + 8.25 * scale;
  return base;
}

function addPalm(x, z, s = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.35*s, .55*s, 7*s, 7), material(0x7a4a28));
  trunk.position.set(x, terrainHeight(x,z)+3.5*s, z); trunk.castShadow = true; scene.add(trunk);
  for (let i=0;i<8;i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(1.1*s, 7*s, 5), mats.palm);
    frond.position.set(x, terrainHeight(x,z)+7.1*s, z);
    frond.rotation.z = Math.PI/2.8; frond.rotation.y = i*Math.PI/4;
    frond.castShadow = true; scene.add(frond);
  }
}

function addCedar(x, z, s = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.25*s,.4*s,4*s,6), material(0x5a3825));
  trunk.position.set(x, terrainHeight(x,z)+2*s, z); trunk.castShadow=true; scene.add(trunk);
  for (let i=0;i<3;i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((3-i*.6)*s, 5*s, 8), mats.cedar);
    c.position.set(x, terrainHeight(x,z)+(4+i*2)*s, z); c.castShadow=true; scene.add(c);
  }
}

for (let z = -35; z <= 50; z += 18) {
  for (let x = -58; x <= 58; x += 16) {
    if (Math.abs(x) < 14 || hash(x,z) < .18) continue;
    addRiad(x + (hash(z,x)-.5)*5, z + (hash(x,z)-.5)*5, .75 + hash(x*2,z)*.55);
  }
}

for (let i=0;i<180;i++) {
  const x = (hash(i, 1)-.5)*360;
  const z = hash(i, 2)*480 - 230;
  if (z > 60 && z < 145) addCedar(x, z, .7 + hash(i,3)*.9);
  else if (z < -45 && hash(i,4) > .28) addPalm(x, z, .7 + hash(i,5)*.8);
  else if (Math.abs(x) > 65 && z < 55 && z > -80 && hash(i,6) > .72) addPalm(x, z, .6);
}

const path = new THREE.Mesh(new THREE.PlaneGeometry(24, 170), material(0x9c6845));
path.rotation.x = -Math.PI/2; path.position.set(0, .08, 0); scene.add(path);

const river = new THREE.Mesh(new THREE.PlaneGeometry(30, 140, 20, 20), mats.water);
river.rotation.x = -Math.PI/2; river.position.set(-70, .35, -110); river.rotation.z = .18; scene.add(river);

const ocean = new THREE.Mesh(new THREE.PlaneGeometry(420, 90), mats.water);
ocean.rotation.x = -Math.PI/2; ocean.position.set(0, -1, 210); scene.add(ocean);

const lanternPositions = [];
const lanternLights = Array.from({ length: 4 }, () => { const light = new THREE.PointLight(0xffb969, .55, 18); scene.add(light); return light; });
for (let i=0;i<55;i++) {
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 10), mats.glow);
  const side = i % 2 ? -1 : 1;
  lantern.position.set(side*(8 + hash(i,0)*5), terrainHeight(0, i*2-50)+3, i*2-50);
  scene.add(lantern);
  lanternPositions.push(lantern.position.clone());
}

const biomes = [
  { z: 150, name: 'Atlantic Whitewash', fog: 0xcfe9ef },
  { z: 55, name: 'Atlas Cedar Highlands', fog: 0xd8c18b },
  { z: -20, name: 'Rose-Clay Medina', fog: 0xf1b982 },
  { z: -80, name: 'Palm Oasis Gardens', fog: 0xd9c16e },
  { z: -150, name: 'Sahara Dune Sea', fog: 0xf3c070 },
];
const biomeCard = document.getElementById('biomeCard');
let keys = new Set();
function visit(z) {
  controls.target.set(0, terrainHeight(0, z) + 4, z);
  camera.position.set(18, terrainHeight(0, z) + 30, z + 42);
  controls.update();
}
document.querySelectorAll('[data-z]').forEach(button => button.addEventListener('click', () => visit(Number(button.dataset.z))));
document.getElementById('resetView').addEventListener('click', () => visit(0));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let previousTime = 0;
window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function updateMovement(delta) {
  const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
  const side = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  if (!forward && !side) return;
  const speed = 18 * delta;
  controls.target.z -= forward * speed;
  controls.target.x += side * speed;
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -185, 185);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -220, 215);
  camera.position.x += side * speed;
  camera.position.z -= forward * speed;
}

function animate(t) {
  const delta = Math.min(0.05, Math.max(0, (t - previousTime) / 1000));
  previousTime = t;
  updateMovement(delta);
  const h = terrainHeight(controls.target.x, controls.target.z);
  controls.target.y = THREE.MathUtils.lerp(controls.target.y, h + 4, .04);
  if (!reducedMotion.matches) sun.position.x = Math.sin(t * 0.00006) * 95;
  const current = biomes.reduce((best, b) => Math.abs(controls.target.z - b.z) < Math.abs(controls.target.z - best.z) ? b : best, biomes[0]);
  const nextPlace=biomes.indexOf(current);
  if(nextPlace!==soundPlace){soundPlace=nextPlace;ambience.setPlace(soundPlace)}
  biomeCard.textContent = `Entering: ${current.name}`;
  scene.fog.color.lerp(new THREE.Color(current.fog), .015);
  scene.background.copy(scene.fog.color);
  controls.update();
  const nearest = [...lanternPositions].sort((a,b) => a.distanceToSquared(camera.position) - b.distanceToSquared(camera.position));
  lanternLights.forEach((light, i) => light.position.copy(nearest[i]));
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate(0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Quiet chrome: the landscape leads; zellige-tile controls visit when called and retire when left.
(function () {
  const PIN_KEY = 'moroccandays-chrome-pin', TOP_ZONE = 96, BOTTOM_ZONE = 150, RETIRE_MS = 2600;
  const nav = document.querySelector('.places');
  if (!nav) return;
  nav.classList.add('chrome', 'chrome-on');
  const els = [nav];
  const tiles = [...nav.querySelectorAll('[data-z]')];
  const setCurrent = z => tiles.forEach(t => t.setAttribute('aria-current', String(t.dataset.z === String(z))));
  setCurrent(0);
  tiles.forEach(t => t.addEventListener('click', () => setCurrent(t.dataset.z)));
  document.getElementById('resetView').addEventListener('click', () => setCurrent(0));
  const hint = document.createElement('button');
  hint.className = 'chrome-hint'; hint.hidden = true; hint.setAttribute('aria-label', 'Show controls');
  hint.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3 L14.6 9.4 L21 12 L14.6 14.6 L12 21 L9.4 14.6 L3 12 L9.4 9.4 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  document.body.appendChild(hint);
  const pinBtn = document.createElement('button');
  pinBtn.id = 'pin-controls'; pinBtn.type = 'button'; pinBtn.className = 'pin-btn'; pinBtn.textContent = 'Pin'; pinBtn.title = 'Keep controls visible'; pinBtn.setAttribute('aria-pressed', 'false');
  nav.appendChild(pinBtn);
  let pinned = false; try { pinned = localStorage.getItem(PIN_KEY) === '1'; } catch (e) {}
  let chrome = true, focusWithin = false, retireTimer = 0;
  const apply = () => { const on = chrome || pinned; els.forEach(e => e.classList.toggle('chrome-on', on)); hint.hidden = on; };
  const retireSoon = () => { clearTimeout(retireTimer); retireTimer = setTimeout(() => { if (!focusWithin) { chrome = false; apply(); } }, RETIRE_MS); };
  const wake = () => { chrome = true; apply(); retireSoon(); };
  document.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; if (e.clientY < TOP_ZONE || e.clientY > innerHeight - BOTTOM_ZONE) wake(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { focusWithin = false; chrome = false; apply(); } });
  document.addEventListener('focusin', e => { if (els.some(x => x.contains(e.target))) { focusWithin = true; clearTimeout(retireTimer); chrome = true; apply(); } });
  document.addEventListener('focusout', e => { if (!els.some(x => x.contains(e.relatedTarget))) { focusWithin = false; retireSoon(); } });
  hint.addEventListener('click', wake);
  const setPin = next => { pinned = next; try { next ? localStorage.setItem(PIN_KEY, '1') : localStorage.removeItem(PIN_KEY); } catch (e) {} pinBtn.setAttribute('aria-pressed', String(next)); pinBtn.textContent = next ? 'Unpin' : 'Pin'; pinBtn.title = next ? 'Let controls retire' : 'Keep controls visible'; if (next) { chrome = true; apply(); } else retireSoon(); };
  pinBtn.addEventListener('click', () => setPin(!pinned));
  if (pinned) setPin(true);
  retireSoon();
})();
