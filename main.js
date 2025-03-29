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
  camera.position.set(-20, 40, 80);

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

  for (const [month, days] of Object.entries(months)) {
    days.forEach(day => {
      const weekday = day.date.getDay();
      const height = Math.max(day.count * 0.1, 0.1);
      const mat = new THREE.MeshLambertMaterial({ color: getColor(day.count) });
      const box = new THREE.Mesh(boxGeo, mat);
      box.scale.set(0.9, height, 0.9);
      box.position.set(col * 1.2, height / 2, weekday * 1.2);
      scene.add(box);
    });
    col++;
  }

  // Center controls on graph midpoint
  const centerX = ((columnCount - 1) * 1.2) / 2;
  const centerY = 0;
  const centerZ = (6 * 1.2) / 2;
  controls.target.set(centerX, centerY, centerZ);
  controls.update();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

main();
