import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const dataUrl = 'pez-github-contributions-2024-03-29.json';

async function main() {
  const response = await fetch(dataUrl);
  const json = await response.json();
  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;

  const allDays = weeks.flatMap(week =>
    week.contributionDays.map(day => ({
      date: new Date(day.date),
      count: day.contributionCount,
    }))
  );

  const months = {};
  allDays.forEach(day => {
    const monthKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}`;
    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(day);
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(25, 35, 25);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.zoomSpeed = 0.5;

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 2, 3);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  const getColor = count => {
    if (count === 0) return 0xebedf0;
    if (count < 10) return 0xc6e48b;
    if (count < 20) return 0x7bc96f;
    if (count < 30) return 0x239a3b;
    return 0x196127;
  };

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  let col = 0;
  const columnCount = Object.keys(months).length;
  const boxes = [];
  const originalMaterials = new Map();

  for (const [month, days] of Object.entries(months)) {
    const firstDay = days.find(d => d.date.getDate() === 1);
    const weekdayOffset = firstDay ? firstDay.date.getDay() : 0;

    days.forEach(day => {
      const height = Math.max(day.count * 0.1, 0.1);
      const mat = new THREE.MeshLambertMaterial({ color: getColor(day.count) });
      const box = new THREE.Mesh(boxGeo, mat);
      box.scale.set(0.9, height, 0.9);
      const z = (day.date.getDate() - 1 + weekdayOffset) * 1.0;
      box.position.set(col * 1.0, height / 2, z);
      box.userData = { date: day.date.toISOString().slice(0, 10), count: day.count };
      boxes.push(box);
      scene.add(box);
    });
    col++;
  }

  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.background = 'rgba(0, 0, 0, 0.75)';
  tooltip.style.color = 'white';
  tooltip.style.padding = '4px 8px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.fontSize = '12px';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let mouseX = 0;
  let mouseY = 0;
  let highlighted = null;

  window.addEventListener('mousemove', event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  const centerX = ((columnCount - 1) * 1.0) / 2;
  const centerY = 0;
  const centerZ = 31 / 2;
  controls.target.set(centerX, centerY, centerZ);
  controls.update();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boxes);

    if (highlighted) {
      highlighted.material.emissive = new THREE.Color(0x000000);
      highlighted = null;
    }

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      const { date, count } = obj.userData;
      tooltip.textContent = `${date}: ${count}`;
      tooltip.style.left = `${mouseX + 10}px`;
      tooltip.style.top = `${mouseY + 10}px`;
      tooltip.style.display = 'block';

      obj.material.emissive = new THREE.Color(0xffffff);
      highlighted = obj;
    } else {
      tooltip.style.display = 'none';
    }

    renderer.render(scene, camera);
  }

  animate();
}

main();