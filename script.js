/**
 * script.js — Jardín de Niños José María Heredia y Heredia
 * Funcionalidades: menú hamburguesa, filtrado de avisos,
 * validación del formulario, animaciones de scroll y navbar sticky.
 */

'use strict';

/* ============================================================
   UTILIDADES
============================================================ */

/** Selecciona un elemento por selector CSS */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
/** Selecciona todos los elementos por selector CSS */
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ============================================================
   NAVBAR — STICKY + HAMBURGUESA
============================================================ */

(function initNavbar() {
  const navbar       = qs('#navbar');
  const hamburgerBtn = qs('#hamburgerBtn');
  const navMenu      = qs('#navMenu');
  const navLinks     = qsa('.navbar__link', navMenu);

  if (!navbar || !hamburgerBtn || !navMenu) return;

  /** Añade sombra al hacer scroll */
  function handleScroll() {
    navbar.classList.toggle('navbar--scrolled', window.scrollY > 10);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });

  /** Abre / cierra el menú móvil */
  function toggleMenu(force) {
    const isOpen = force !== undefined ? force : hamburgerBtn.getAttribute('aria-expanded') !== 'true';
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
    navMenu.classList.toggle('navbar__nav--open', isOpen);
  }

  hamburgerBtn.addEventListener('click', () => toggleMenu());

  /** Cierra al hacer clic en un enlace */
  navLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  /** Cierra al presionar Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleMenu(false);
  });

  /** Cierra si se hace clic fuera del menú en móvil */
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) toggleMenu(false);
  });

  /** Resalta el enlace activo según la sección visible */
  const sections = qsa('section[id]');

  function updateActiveLink() {
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 120) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle(
        'navbar__link--active',
        link.getAttribute('href') === `#${current}`
      );
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();
})();

/* ============================================================
   FILTRADO DE AVISOS
============================================================ */

(function initFiltros() {
  const filtroBtns = qsa('.filtro-btn');

  if (!filtroBtns.length) return;

  function applyFilter(filter) {
    const cards = qsa('.aviso-card');
    cards.forEach(card => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('aviso-card--hidden', !match);
      // Accesibilidad: ocultar al tab cuando está filtrado
      card.setAttribute('tabindex', match ? '0' : '-1');
    });

    // Actualizar estado activo de botones
    filtroBtns.forEach(btn => {
      btn.classList.toggle('filtro-btn--active', btn.dataset.filter === filter);
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
    });
  }

  filtroBtns.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.classList.contains('filtro-btn--active') ? 'true' : 'false');
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });
})();

/* ============================================================
   VALIDACIÓN DEL FORMULARIO DE CONTACTO
============================================================ */

(function initContactForm() {
  const form       = qs('#contactForm');
  const submitBtn  = qs('#submitBtn');
  const feedback   = qs('#formFeedback');

  if (!form) return;

  /**
   * Reglas de validación por campo.
   * Cada regla devuelve un string con el error, o '' si pasa.
   */
  const rules = {
    nombre(val) {
      if (!val.trim())           return 'El nombre es obligatorio.';
      if (val.trim().length < 3) return 'Escribe al menos 3 caracteres.';
      if (val.trim().length > 80) return 'El nombre no puede superar 80 caracteres.';
      return '';
    },
    correo(val) {
      if (!val.trim()) return 'El correo electrónico es obligatorio.';
      // RFC-compatible simple regex
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRe.test(val.trim())) return 'Escribe un correo electrónico válido.';
      return '';
    },
    asunto(val) {
      if (!val.trim())            return 'El asunto es obligatorio.';
      if (val.trim().length < 3)  return 'Escribe al menos 3 caracteres.';
      if (val.trim().length > 120) return 'El asunto no puede superar 120 caracteres.';
      return '';
    },
    mensaje(val) {
      if (!val.trim())             return 'El mensaje es obligatorio.';
      if (val.trim().length < 10)  return 'El mensaje debe tener al menos 10 caracteres.';
      if (val.trim().length > 1000) return 'El mensaje no puede superar 1 000 caracteres.';
      return '';
    },
  };

  /** Muestra u oculta el error de un campo */
  function setFieldError(fieldId, message) {
    const input = qs(`#${fieldId}`);
    const errorEl = qs(`#${fieldId}-error`);
    if (!input || !errorEl) return;

    errorEl.textContent = message;
    input.classList.toggle('form-input--error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  /** Valida un campo individual y retorna true si pasa */
  function validateField(fieldId) {
    const input = qs(`#${fieldId}`, form);
    if (!input || !rules[fieldId]) return true;
    const error = rules[fieldId](input.value);
    setFieldError(fieldId, error);
    return error === '';
  }

  /** Valida todo el formulario */
  function validateAll() {
    const fields = Object.keys(rules);
    const results = fields.map(validateField);
    return results.every(Boolean);
  }

  // Validación en tiempo real (al salir del campo)
  Object.keys(rules).forEach(fieldId => {
    const input = qs(`#${fieldId}`, form);
    if (!input) return;

    input.addEventListener('blur', () => validateField(fieldId));
    input.addEventListener('input', () => {
      // Limpia el error apenas el usuario empieza a corregir
      if (input.classList.contains('form-input--error')) {
        validateField(fieldId);
      }
    });
  });

  /** Muestra el feedback del formulario */
  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `form-feedback form-feedback--${type}`;
    feedback.hidden = false;
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Simula el envío (sin backend real en esta etapa) */
  function simulateSend() {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    setTimeout(() => {
      // Simulación exitosa
      form.reset();
      Object.keys(rules).forEach(id => setFieldError(id, ''));
      showFeedback(
        '✅ Mensaje enviado correctamente. Nos comunicaremos contigo pronto.',
        'success'
      );
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar mensaje';
    }, 1200);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    feedback.hidden = true;

    if (validateAll()) {
      simulateSend();
    } else {
      showFeedback(
        '⚠️ Por favor, corrige los campos marcados antes de enviar.',
        'error'
      );
      // Mover foco al primer campo con error
      const firstError = qs('.form-input--error', form);
      if (firstError) firstError.focus();
    }
  });
})();

/* ============================================================
   ANIMACIONES DE ENTRADA AL SCROLL (IntersectionObserver)
============================================================ */

(function initScrollAnimations() {
  // Añadir clase inicial a los elementos animables
  const targets = qsa([
    '.aviso-card',
    '.actividad-card',
    '.info-block',
    '.stat-card',
    '.nosotros__map',
    '.contacto__info',
    '.contacto__form-wrapper',
  ].join(', '));

  targets.forEach(el => el.classList.add('fade-in'));

  if (!('IntersectionObserver' in window)) {
    // Fallback: mostrar todo sin animación
    targets.forEach(el => el.classList.add('fade-in--visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in--visible');
          observer.unobserve(entry.target); // Solo animar una vez
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach(el => observer.observe(el));
})();

/* ============================================================
   AÑO ACTUAL EN EL FOOTER
============================================================ */

(function setFooterYear() {
  const el = qs('#footerYear');
  if (el) el.textContent = new Date().getFullYear();
})();

/* ============================================================
   CONSUMO DINÁMICO DE DATOS (AVISOS Y TEXTOS)
============================================================ */

(async function loadDynamicContent() {
  try {
    // 1. Cargar y renderizar Textos del Sitio
    const textRes = await fetch('/api/textos');
    const textData = await textRes.json();
    if (textData.ok) {
      const data = textData.data;

      // Sección Hero
      if (data.hero) {
        const ciclo = data.hero.ciclo_escolar?.contenido;
        const msg = data.hero.mensaje_bienvenida?.contenido;
        if (ciclo) {
          const elHero = document.getElementById('dyn-ciclo-hero');
          if (elHero) elHero.textContent = `Ciclo Escolar ${ciclo}`;
          const elStat = document.getElementById('dyn-ciclo-stat');
          if (elStat) elStat.textContent = ciclo;
        }
        if (msg) {
          const elMsg = document.getElementById('dyn-mensaje-hero');
          if (elMsg) elMsg.textContent = msg;
        }
      }

      // Sección Nosotros
      if (data.nosotros) {
        const mision = data.nosotros.mision?.contenido;
        const vision = data.nosotros.vision?.contenido;
        if (mision) {
          const elMision = document.getElementById('dyn-mision');
          if (elMision) elMision.textContent = mision;
        }
        if (vision) {
          const elVision = document.getElementById('dyn-vision');
          if (elVision) elVision.textContent = vision;
        }
      }

      // Sección Contacto
      if (data.contacto) {
        const dir = data.contacto.direccion?.contenido;
        const tel = data.contacto.telefono?.contenido;
        const email = data.contacto.email?.contenido;
        const hor = data.contacto.horario?.contenido;
        const cct = data.contacto.cct?.contenido;

        if (dir) {
          const elDir = document.getElementById('dyn-direccion');
          if (elDir) elDir.textContent = dir;
          const elDirFooter = document.getElementById('dyn-direccion-footer');
          if (elDirFooter) elDirFooter.textContent = dir;
        }
        if (tel) {
          const elTel = document.getElementById('dyn-telefono');
          if (elTel) {
            elTel.textContent = tel;
            elTel.href = `tel:${tel.replace(/[^+\d]/g, '')}`;
          }
        }
        if (email) {
          const elEmail = document.getElementById('dyn-email');
          if (elEmail) {
            elEmail.textContent = email;
            elEmail.href = `mailto:${email}`;
          }
        }
        if (hor) {
          const elHor = document.getElementById('dyn-horario');
          if (elHor) elHor.textContent = hor;
        }
        if (cct) {
          const elCct = document.getElementById('dyn-cct');
          if (elCct) elCct.textContent = cct;
        }
      }
    }

    // 2. Cargar y renderizar Avisos (filtrando por activos desde el backend)
    const avisosRes = await fetch('/api/avisos?limite=100');
    const avisosData = await avisosRes.json();
    if (avisosData.ok) {
      const avisosGrid = document.getElementById('avisosGrid');
      if (avisosGrid) {
        avisosGrid.innerHTML = '';
        const listado = avisosData.data;

        if (listado.length === 0) {
          avisosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gris-texto);">
              <p style="font-size: 1.1rem; font-family: var(--fuente-titulo); font-weight: 700;">No hay avisos vigentes en este momento.</p>
            </div>
          `;
          return;
        }

        const categoryLabels = {
          'comunicado': 'Comunicado',
          'evento': 'Evento',
          'tramites': 'Trámites',
          'academico': 'Académico',
          'medio-ambiente': 'Medio Ambiente',
          'salud': 'Salud'
        };

        listado.forEach((aviso, idx) => {
          // Formatear fecha: e.g. "20 jun 2026"
          const date = new Date(aviso.fecha_publicacion + 'T00:00:00');
          const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
          const formattedDate = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
          const label = categoryLabels[aviso.categoria] || aviso.categoria;

          const article = document.createElement('article');
          article.className = 'aviso-card';
          article.dataset.category = aviso.categoria;
          article.tabIndex = 0;

          article.innerHTML = `
            <div class="aviso-card__header">
              <span class="aviso-badge aviso-badge--${aviso.categoria}">${label}</span>
              <time class="aviso-card__date" datetime="${aviso.fecha_publicacion}">${formattedDate}</time>
            </div>
            <h3 class="aviso-card__title">${escapeHtml(aviso.titulo)}</h3>
            <p class="aviso-card__body">${escapeHtml(aviso.descripcion)}</p>
            ${idx === 0 ? '<span class="aviso-card__new" aria-label="Nuevo aviso">Nuevo</span>' : ''}
          `;
          avisosGrid.appendChild(article);
        });

        // Registrar las nuevas tarjetas en IntersectionObserver para las animaciones
        if (window.IntersectionObserver) {
          const newCards = avisosGrid.querySelectorAll('.aviso-card');
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('fade-in--visible');
                  observer.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
          );
          newCards.forEach(card => {
            card.classList.add('fade-in');
            observer.observe(card);
          });
        } else {
          const newCards = avisosGrid.querySelectorAll('.aviso-card');
          newCards.forEach(card => card.classList.add('fade-in--visible'));
        }
      }
    }
  } catch (err) {
    console.error('Error cargando contenido dinámico:', err);
  }
})();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   PARALLAX HERO (EFECTO WOW)
============================================================ */
(function initHeroParallax() {
  const hero = document.querySelector('.hero');
  const bubbles = document.querySelectorAll('.hero__deco span');

  if (!hero || bubbles.length === 0) return;

  // Habilitar smooth transform para el parallax manual
  bubbles.forEach(b => b.style.transition = 'transform 0.2s ease-out');

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = x / rect.width;
    const yRatio = y / rect.height;

    bubbles.forEach((bubble, index) => {
      const speed = (index + 1) * 20; 
      const moveX = (xRatio - 0.5) * speed;
      const moveY = (yRatio - 0.5) * speed;
      
      // Aplicar movimiento extra (parallax) sin perder la animación flotante CSS
      bubble.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
  });

  hero.addEventListener('mouseleave', () => {
    bubbles.forEach(bubble => {
      bubble.style.transform = `translate(0px, 0px)`;
    });
  });
})();
