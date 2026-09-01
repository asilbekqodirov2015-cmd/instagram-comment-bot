/**
 * InstaResponse - 3D Interactive Landing Page Logic
 * Built with Three.js WebGL, 3D Tilt, Real-time Simulation Engine & Scroll Effects
 */

document.addEventListener('DOMContentLoaded', () => {
  initThreeJsBackground();
  initMouseSpotlight();
  init3DTilt();
  initLiveSimulator();
  initScrollAnimations();
  initPricingToggle();
  initFaqAccordion();
});

/* ==========================================================
   1. THREE.JS 3D NEON WEBGL BACKGROUND
   ========================================================== */
function initThreeJsBackground() {
  const canvas = document.getElementById('bg-canvas-3d');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3D Particles Galaxy
  const particleCount = 750;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const color1 = new THREE.Color(0xff1361); // Instagram Pink / Neon Magenta
  const color2 = new THREE.Color(0x9000ff); // Neon Purple
  const color3 = new THREE.Color(0x00f2fe); // Neon Cyan

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 80;
    positions[i + 1] = (Math.random() - 0.5) * 80;
    positions[i + 2] = (Math.random() - 0.5) * 60;

    // Gradient mix of neon colors
    const mixedColor = Math.random() < 0.33 ? color1 : (Math.random() < 0.66 ? color2 : color3);
    colors[i] = mixedColor.r;
    colors[i + 1] = mixedColor.g;
    colors[i + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  const particleSystem = new THREE.Points(geometry, particleMaterial);
  scene.add(particleSystem);

  // Floating 3D Geometric Torus Knot (Wireframe Cyber Aesthetic)
  const torusGeo = new THREE.TorusKnotGeometry(7, 1.8, 100, 16);
  const torusMat = new THREE.MeshBasicMaterial({
    color: 0x9000ff,
    wireframe: true,
    transparent: true,
    opacity: 0.18
  });
  const torusKnot = new THREE.Mesh(torusGeo, torusMat);
  torusKnot.position.set(18, -4, -10);
  scene.add(torusKnot);

  // Floating 3D Icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(5, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0xff1361,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  const icoMesh = new THREE.Mesh(icoGeo, icoMat);
  icoMesh.position.set(-20, 8, -8);
  scene.add(icoMesh);

  // Mouse & Scroll Parallax State
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  let scrollY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
  });

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY * 0.005;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Animation Loop (60 FPS)
  function animate() {
    requestAnimationFrame(animate);

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    particleSystem.rotation.y += 0.0012;
    particleSystem.rotation.x = targetY * 0.5 + scrollY * 0.2;
    particleSystem.rotation.z = targetX * 0.5;

    torusKnot.rotation.x += 0.004;
    torusKnot.rotation.y += 0.006;
    torusKnot.position.y = -4 + Math.sin(Date.now() * 0.0015) * 1.5 - scrollY * 2;

    icoMesh.rotation.x -= 0.005;
    icoMesh.rotation.z += 0.004;
    icoMesh.position.y = 8 + Math.cos(Date.now() * 0.0012) * 1.2 - scrollY * 1.5;

    renderer.render(scene, camera);
  }

  animate();
}

/* ==========================================================
   2. MOUSE SPOTLIGHT GLOW TRAIL
   ========================================================== */
function initMouseSpotlight() {
  const spotlight = document.querySelector('.mouse-spotlight');
  if (!spotlight) return;

  let currentX = 0, currentY = 0;
  let targetX = 0, targetY = 0;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  function updateSpotlight() {
    currentX += (targetX - currentX) * 0.15;
    currentY += (targetY - currentY) * 0.15;
    spotlight.style.transform = `translate(${currentX}px, ${currentY}px)`;
    requestAnimationFrame(updateSpotlight);
  }
  updateSpotlight();
}

/* ==========================================================
   3. 3D CARD TILT EFFECT (Vanilla Javascript)
   ========================================================== */
function init3DTilt() {
  const tiltCards = document.querySelectorAll('.tilt-card');

  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg pitch
      const rotateY = ((x - centerX) / centerX) * 10;  // Max 10 deg yaw

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

/* ==========================================================
   4. LIVE INTERACTIVE SIMULATOR (Sandbox Engine)
   ========================================================== */
function initLiveSimulator() {
  const commentInput = document.getElementById('simCommentInput');
  const sendBtn = document.getElementById('simSendBtn');
  const triggerChips = document.querySelectorAll('.sim-chip');
  const modeButtons = document.querySelectorAll('.sim-mode-btn');

  const reelCommentsList = document.getElementById('simReelCommentsList');
  const dmChatStream = document.getElementById('simDmChatStream');
  const energyBeam = document.getElementById('simEnergyBeam');
  const simStepBadges = document.querySelectorAll('.sim-step-badge');

  if (!commentInput || !sendBtn) return;

  let currentMode = 'image'; // 'text', 'image', 'video', 'ai'
  let isSimulating = false;

  // Mode switcher
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isSimulating) return;
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;

      // Update input placeholder suggestion
      if (currentMode === 'ai') {
        commentInput.value = "Sizda qanday kurslar bor va narxi qancha?";
      } else if (currentMode === 'video') {
        commentInput.value = "Video darslikni yuboring";
      } else if (currentMode === 'image') {
        commentInput.value = "Narxi qancha? Rasm katalog bormi?";
      } else {
        commentInput.value = "Chegirma kodini oling";
      }
    });
  });

  // Quick chip click
  triggerChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (isSimulating) return;
      commentInput.value = chip.dataset.text || chip.textContent.trim();
      runSimulation();
    });
  });

  // Form submit
  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    runSimulation();
  });

  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSimulation();
    }
  });

  // Simulation execution workflow
  function runSimulation() {
    const userText = commentInput.value.trim() || 'Narxi qancha?';
    if (isSimulating) return;
    isSimulating = true;
    sendBtn.disabled = true;

    // Reset step indicators
    simStepBadges.forEach(b => b.classList.remove('active', 'completed'));
    if (energyBeam) energyBeam.classList.remove('active');

    // 1. Post user's comment to Reel feed
    const userCommentEl = document.createElement('div');
    userCommentEl.className = 'mock-comment-item sim-user-comment animate-pop';
    userCommentEl.innerHTML = `
      <div class="mock-user-avatar commenter">M</div>
      <div class="mock-comment-text">
        <strong>mijoz_live</strong> <span class="comment-trigger-highlight">${escapeHtml(userText)}</span>
        <div class="comment-meta">Hozirgina • Javob berish</div>
      </div>
    `;
    reelCommentsList.appendChild(userCommentEl);
    reelCommentsList.scrollTop = reelCommentsList.scrollHeight;

    // Step 1: Webhook received
    setStep(0, 'active');

    // 2. Trigger Laser / Beam animation after 300ms
    setTimeout(() => {
      setStep(0, 'completed');
      setStep(1, 'active'); // AI Processing

      if (energyBeam) energyBeam.classList.add('active');

      // Bot Public Reply on Reel after 600ms
      setTimeout(() => {
        const botReplyEl = document.createElement('div');
        botReplyEl.className = 'mock-comment-item reply-animation sim-bot-reply';
        botReplyEl.innerHTML = `
          <div class="mock-user-avatar owner">S</div>
          <div class="mock-comment-text">
            <strong>sizning_sahifangiz <i class="fa-solid fa-circle-check verify-badge"></i></strong> 
            <span>@mijoz_live Salom! So'ragan ma'lumotlaringizni lizingizga (DM) yubordik! 📩✨</span>
            <div class="comment-meta">Hozirgina • 1 like</div>
          </div>
        `;
        reelCommentsList.appendChild(botReplyEl);
        reelCommentsList.scrollTop = reelCommentsList.scrollHeight;
      }, 500);

      // 3. Deliver DM Message to Instagram Direct Phone after 900ms
      setTimeout(() => {
        setStep(1, 'completed');
        setStep(2, 'active'); // DM Dispatched

        deliverDirectMessage(userText, currentMode);

        setTimeout(() => {
          setStep(2, 'completed');
          isSimulating = false;
          sendBtn.disabled = false;
        }, 1000);

      }, 1000);

    }, 400);
  }

  function setStep(index, state) {
    if (!simStepBadges[index]) return;
    if (state === 'active') {
      simStepBadges[index].classList.add('active');
      simStepBadges[index].classList.remove('completed');
    } else if (state === 'completed') {
      simStepBadges[index].classList.remove('active');
      simStepBadges[index].classList.add('completed');
    }
  }

  function deliverDirectMessage(userText, mode) {
    // Scroll DM to bottom
    dmChatStream.innerHTML = `
      <div class="chat-time">Bugun, 14:00</div>
      <div class="chat-system-note"><i class="fa-brands fa-instagram"></i> Kommentariyaga javoban: "${escapeHtml(userText)}"</div>
    `;

    // 1. Show Typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-bubble-container bot-message typing-indicator-bubble';
    typingEl.innerHTML = `
      <div class="mock-user-avatar owner xs">S</div>
      <div class="chat-bubble typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    dmChatStream.appendChild(typingEl);
    dmChatStream.scrollTop = dmChatStream.scrollHeight;

    // 2. Replace with real content
    setTimeout(() => {
      typingEl.remove();

      let contentHtml = '';

      if (mode === 'image') {
        contentHtml = `
          <div class="chat-bubble-container bot-message animate-slide-up">
            <div class="mock-user-avatar owner xs">S</div>
            <div class="chat-card-attachment">
              <div class="dm-card-media-banner" style="background: linear-gradient(135deg, #ff1361 0%, #9000ff 100%);">
                <i class="fa-solid fa-gift dm-media-icon"></i>
                <span class="dm-media-tag">Yangi To'plam 2026</span>
              </div>
              <div class="dm-card-body">
                <h4>Premium Instagram Bot Paketi</h4>
                <p>Assalomu alaykum! Kommentda qoldirgan so'rovingiz bo'yicha maxsus 20% chegirma taqdim etamiz.</p>
                <div class="dm-card-price"><span class="old-price">180,000 so'm</span> <span class="new-price">144,000 so'm</span></div>
                <a href="#register" class="btn btn-accent btn-small dm-action-btn"><i class="fa-solid fa-bag-shopping"></i> Buyurtma Berish</a>
              </div>
            </div>
          </div>
        `;
      } else if (mode === 'video') {
        contentHtml = `
          <div class="chat-bubble-container bot-message animate-slide-up">
            <div class="mock-user-avatar owner xs">S</div>
            <div class="chat-card-attachment">
              <div class="dm-card-media-banner video-banner" style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);">
                <div class="play-btn-circle"><i class="fa-solid fa-play"></i></div>
                <span class="dm-media-tag">Masterklass Video</span>
              </div>
              <div class="dm-card-body">
                <h4>Video darslikni tomosha qiling</h4>
                <p>Salom! 15 daqiqalik to'liq video qo'llanma tayyor. Quyidagi havola orqali ko'rishingiz mumkin.</p>
                <a href="#register" class="btn btn-primary btn-small dm-action-btn"><i class="fa-solid fa-circle-play"></i> Videoni Ochish</a>
              </div>
            </div>
          </div>
        `;
      } else if (mode === 'ai') {
        contentHtml = `
          <div class="chat-bubble-container bot-message animate-slide-up">
            <div class="mock-user-avatar owner xs">S</div>
            <div class="chat-bubble ai-bubble">
              <div class="ai-badge-tiny"><i class="fa-solid fa-brain"></i> Gemini AI Agenti</div>
              Assalomu alaykum! Bizda <strong>"Instagram Automation & SMM"</strong> bo'yicha 3 xil professional kursimiz mavjud. Qaysi yo'nalish sizga ko'proq qiziq: Amaliy SMM, Chatbotlar yaratish yoki Reklama sozlash?
              <div class="quick-reply-pills">
                <button class="qr-pill">SMM Praktikum</button>
                <button class="qr-pill">Chatbotlar</button>
                <button class="qr-pill">Targeting</button>
              </div>
            </div>
          </div>
        `;
      } else {
        // Text mode
        contentHtml = `
          <div class="chat-bubble-container bot-message animate-slide-up">
            <div class="mock-user-avatar owner xs">S</div>
            <div class="chat-bubble">
              Salom! Bizning postimizga qiziqish bildirganingiz uchun rahmat. Siz so'ragan narxlar va barcha batafsil ma'lumotlar rasmiy vebsaytimizda joylashtirilgan:
              <br><br>
              🔗 <strong>https://instaresponse.uz/katalog</strong>
              <br><br>
              Promo-kod: <code>INSTA2026</code> (10% chegirma beradi).
            </div>
          </div>
        `;
      }

      dmChatStream.insertAdjacentHTML('beforeend', contentHtml);
      dmChatStream.scrollTop = dmChatStream.scrollHeight;
    }, 450);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}

/* ==========================================================
   5. SCROLL-BASED REVEAL & COUNTERS
   ========================================================== */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.scroll-reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // If element has counters, animate numbers
        const counters = entry.target.querySelectorAll('.count-up');
        counters.forEach(counter => animateCounter(counter));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach(el => observer.observe(el));

  // Scroll Progress Bar
  const progressBar = document.getElementById('scrollProgressBar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
    });
  }
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target || el.textContent);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const duration = 1500;
  const start = 0;
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = target % 1 === 0 
      ? Math.floor(start + (target - start) * easeProgress)
      : (start + (target - start) * easeProgress).toFixed(1);

    el.textContent = `${prefix}${currentVal}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    }
  }

  requestAnimationFrame(updateCount);
}

/* ==========================================================
   6. PRICING TOGGLE (Monthly / Yearly - 20% OFF)
   ========================================================== */
function initPricingToggle() {
  const billingToggle = document.getElementById('billingToggle');
  const priceValues = document.querySelectorAll('.price-dynamic');

  if (!billingToggle) return;

  billingToggle.addEventListener('change', () => {
    const isYearly = billingToggle.checked;

    priceValues.forEach(priceEl => {
      const monthly = priceEl.dataset.monthly;
      const yearly = priceEl.dataset.yearly;

      priceEl.style.transform = 'scale(0.8)';
      priceEl.style.opacity = '0.5';

      setTimeout(() => {
        priceEl.textContent = isYearly ? `$${yearly}` : `$${monthly}`;
        priceEl.style.transform = 'scale(1)';
        priceEl.style.opacity = '1';
      }, 150);
    });
  });
}

/* ==========================================================
   7. FAQ ACCORDION
   ========================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all other items
      faqItems.forEach(i => {
        i.classList.remove('open');
        const ans = i.querySelector('.faq-answer');
        if (ans) ans.style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('open');
        const answer = item.querySelector('.faq-answer');
        if (answer) {
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      }
    });
  });
}
