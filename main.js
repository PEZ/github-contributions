import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import SpriteText from 'three-spritetext';

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
  const monthKeys = Object.keys(months);
  const boxes = [];
  let outline = null;

  const spacing = -0.25;
  const monthOffsets = [];
  let cumulativeOffset = 0;

  for (const month of monthKeys) {
    const [year, m] = month.split('-').map(Number);
    const firstDay = new Date(year, m - 1, 1);
    const startWeekday = firstDay.getDay();
    const totalDays = new Date(year, m, 0).getDate();
    const numWeeks = Math.ceil((startWeekday + totalDays) / 7);
    monthOffsets.push(cumulativeOffset);
    cumulativeOffset += numWeeks + spacing;
  }

  monthKeys.forEach((month, row) => {
    const days = months[month];
    const [year, m] = month.split('-').map(Number);
    const firstDay = new Date(year, m - 1, 1);
    const startWeekday = firstDay.getDay();
    const totalDays = new Date(year, m, 0).getDate();
    const numWeeks = Math.ceil((startWeekday + totalDays) / 7);

    const zOffset = monthOffsets[row];

    days.forEach(day => {
      const height = Math.max(day.count * 0.1, 0.1);
      const mat = new THREE.MeshLambertMaterial({ color: getColor(day.count) });
      const box = new THREE.Mesh(boxGeo, mat);
      box.scale.set(0.9, height, 0.9);

      const dayOfMonth = day.date.getDate();
      const weekday = new Date(day.date).getDay();
      const weekIndex = Math.floor((startWeekday + dayOfMonth - 1) / 7);

      box.position.set(weekday, height / 2, zOffset + weekIndex);
      box.userData = { date: day.date.toISOString().slice(0, 10), count: day.count };
      boxes.push(box);
      scene.add(box);
    });

    const labelText = new Date(year, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
    const label = new SpriteText(labelText);
    label.color = 'white';
    label.textHeight = 1.2;
    label.position.set(-3.3, 0.2, zOffset + 1.5);
    scene.add(label);
  });

  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  document.body.appendChild(tooltip);

  const toggle = document.createElement('button');
  toggle.id = 'sound-toggle';
  toggle.textContent = '🔇 Enable Sound';
  document.body.appendChild(toggle);

  let soundEnabled = false;
  toggle.addEventListener('click', async () => {
    await audioCtx.resume();
    soundEnabled = !soundEnabled;
    toggle.textContent = soundEnabled ? '🔔 Sound On' : '🔇 Enable Sound';
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let mouseX = 0;
  let mouseY = 0;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let lastPlayedTime = 0;

  function playTone(count) {
    if (!soundEnabled) return;

    const now = audioCtx.currentTime;
    if (now - lastPlayedTime < 0.1) return;
    lastPlayedTime = now;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const baseFreq = 200;
    const maxFreq = 1200;
    const freq = baseFreq + (count / 60) * (maxFreq - baseFreq);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  window.addEventListener('mousemove', event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  const centerZ = cumulativeOffset * 0.5;
  const centerY = 0;
  const centerX = 4;

  // Set camera in front of first month and looking down the graph
  camera.position.set(centerX, 8, 75);
  controls.target.set(centerX, centerY, centerZ);
  controls.update();

  let lastHovered = null;

  let moveForward = false;
  let moveBackward = false;
  let strafeLeft = false;
  let strafeRight = false;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'w' || event.key === 'W') moveForward = true;
    if (event.key === 's' || event.key === 'S') moveBackward = true;
    if (event.key === 'a' || event.key === 'A') strafeLeft = true;
    if (event.key === 'd' || event.key === 'D') strafeRight = true;
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === 'w' || event.key === 'W') moveForward = false;
    if (event.key === 's' || event.key === 'S') moveBackward = false;
    if (event.key === 'a' || event.key === 'A') strafeLeft = false;
    if (event.key === 'd' || event.key === 'D') strafeRight = false;
  });

  function animate() {
    requestAnimationFrame(animate);

    const moveSpeed = 0.2;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const strafe = new THREE.Vector3();
    strafe.crossVectors(camera.up, dir).normalize();

    if (moveForward) {
      camera.position.addScaledVector(dir, moveSpeed);
      controls.target.addScaledVector(dir, moveSpeed);
    }

    if (moveBackward) {
      camera.position.addScaledVector(dir, -moveSpeed);
      controls.target.addScaledVector(dir, -moveSpeed);
    }

    if (strafeLeft) {
      camera.position.addScaledVector(strafe, moveSpeed);
      controls.target.addScaledVector(strafe, moveSpeed);
    }

    if (strafeRight) {
      camera.position.addScaledVector(strafe, -moveSpeed);
      controls.target.addScaledVector(strafe, -moveSpeed);
    }

    controls.update();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boxes);

    if (outline) {
      scene.remove(outline);
      outline = null;
    }

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      const userData = obj.userData;

      if (lastHovered !== obj) {
        playTone(userData.count);
        lastHovered = obj;
      }

      tooltip.textContent = `${userData.date}: ${userData.count}`;
      tooltip.style.left = `${mouseX + 10}px`;
      tooltip.style.top = `${mouseY + 10}px`;
      tooltip.style.display = 'block';

      const edges = new THREE.EdgesGeometry(obj.geometry);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      outline = new THREE.LineSegments(edges, lineMat);
      outline.position.copy(obj.position);
      outline.scale.copy(obj.scale);
      scene.add(outline);
    } else {
      tooltip.style.display = 'none';
      lastHovered = null;
    }

    renderer.render(scene, camera);
  }

  animate();
}

main();