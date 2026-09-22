(function () {
  "use strict";

  // ---- header solid-on-scroll + scroll progress ----
  var head = document.getElementById("siteHead");
  var progressBar = document.getElementById("progressBar");
  var toTop = document.getElementById("toTop");
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    head.classList.toggle("solid", y > 60);
    toTop.classList.toggle("show", y > 500);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---- mobile menu: handled natively by Bootstrap's Offcanvas component
  //      (data-bs-toggle/data-bs-dismiss attributes in index.html) ----

  // ---- reveal on scroll ----
  var revealItems = document.querySelectorAll(".reveal, .reveal-section");

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            // Vào màn hình → chạy animation, sau đó ngừng theo dõi
            // (không reset khi ra khỏi màn hình nữa — tránh animation
            // bị kích hoạt lại liên tục mỗi lần cuộn qua lại, gây giật)
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -30px 0px",
      },
    );
    revealItems.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealItems.forEach(function (el) {
      el.classList.add("in");
    });
  }
  // ---- animated counters ----
  var counters = document.querySelectorAll(".counter");
  function animateCounter(el) {
    var target = parseFloat(el.dataset.target) || 0;
    var start = 0,
      dur = 1400,
      t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && counters.length) {
    var io2 = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            animateCounter(en.target);
            io2.unobserve(en.target);
          }
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach(function (c) {
      io2.observe(c);
    });
  }

  // ---- marquee: duplicate content once for a seamless loop ----
  var marquee = document.getElementById("marquee");
  if (marquee) {
    marquee.innerHTML += marquee.innerHTML;
  }

  // ---- horizontal scrollers: continuous auto-scroll, pause on hover,
  //      drag-to-scroll with mouse/touch (pointer events cover both) ----
  var scrollerControls = {};

  function initDragScroller(scroller) {
    if (!scroller) return null;

    var dragging = false;
    var startX = 0;
    var startScroll = 0;
    var moved = 0;

    scroller.addEventListener("pointerdown", function (e) {
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startScroll = scroller.scrollLeft;
      scroller.classList.add("dragging");
      if (scroller.setPointerCapture) {
        try {
          scroller.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    });

    scroller.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      // clamp trong đúng phạm vi scroll thật (0 -> scrollWidth - clientWidth),
      // trình duyệt tự làm việc này khi set scrollLeft vượt biên nên
      // không cần tự giới hạn tay ở đây.
      scroller.scrollLeft = startScroll - dx;
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      scroller.classList.remove("dragging");
      // a near-still tap toggles that card's profile open (touch fallback)
      if (moved < 6 && e.target && e.target.closest) {
        var card = e.target.closest(".team-card");
        if (card) card.classList.toggle("show");
      }
    }
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);

    return scroller;
  }

  initDragScroller(document.getElementById("team-scroll"));

  document.querySelectorAll("[data-scroll]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.getElementById(btn.dataset.scroll);
      var dir = parseInt(btn.dataset.dir, 10);
      if (target) target.scrollBy({ left: dir * 300, behavior: "smooth" });
    });
  });

  // ---- services accordion: handled natively by Bootstrap's Accordion
  //      component (data-bs-toggle="collapse" + data-bs-parent) ----
})();
