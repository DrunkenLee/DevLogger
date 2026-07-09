/* DevLogger docs — shared behaviour. Zero dependencies. */
(function () {
  'use strict';

  var reduce =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Copy-to-clipboard for every .copy-btn -------------------------------
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      /* ignore */
    }
    document.body.removeChild(ta);
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.copy-btn') : null;
    if (!btn) return;
    var sel = btn.getAttribute('data-target');
    var src = sel && document.querySelector(sel);
    var text = src ? src.textContent : btn.getAttribute('data-copy') || '';
    var label = btn.querySelector('.copy-label');
    var done = function () {
      btn.classList.add('copied');
      if (label) label.textContent = 'Tersalin!';
      setTimeout(function () {
        btn.classList.remove('copied');
        if (label) label.textContent = 'Salin';
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        fallbackCopy(text);
        done();
      });
    } else {
      fallbackCopy(text);
      done();
    }
  });

  // --- Scroll reveal via IntersectionObserver ------------------------------
  var revealables = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (n) {
      n.classList.add('in');
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealables.forEach(function (n) {
      io.observe(n);
    });
  }

  // --- Subtle parallax on ambient blobs (depth-0/1) ------------------------
  if (!reduce && !window.matchMedia('(pointer: coarse)').matches) {
    var blobs = document.querySelectorAll('.blob');
    var ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY || 0;
          blobs.forEach(function (b, i) {
            var speed = 0.06 + i * 0.04;
            b.style.transform = 'translateY(' + y * speed + 'px)';
          });
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  // --- Active nav link on scroll -------------------------------------------
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );
  var sections = navLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    })
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          navLinks.forEach(function (a) {
            a.classList.toggle(
              'active',
              a.getAttribute('href') === '#' + e.target.id
            );
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach(function (s) {
      spy.observe(s);
    });
  }
})();
