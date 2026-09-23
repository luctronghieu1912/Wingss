(function () {
  "use strict";

  // ---- header solid-on-scroll + scroll progress ----
  var head = document.getElementById("siteHead");
  var progressBar = document.getElementById("progressBar");
  var toTop = document.getElementById("toTop");
  var bgVideo = document.querySelector(".site-bg-video");

  // Scroll bắn ra nhiều lần hơn 1 frame (đặc biệt trên trackpad/mobile),
  // nếu xử lý trực tiếp trong handler sẽ gây forced reflow lặp lại nhiều
  // lần/frame -> giật khi cuộn. Gom lại, chỉ tính toán 1 lần mỗi frame
  // bằng requestAnimationFrame, và bỏ qua nếu vị trí không đổi.
  var lastY = -1;
  var ticking = false;

  function updateOnScroll() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop;
    if (y === lastY) return;
    lastY = y;

    head.classList.toggle("solid", y > 60);
    toTop.classList.toggle("show", y > 500);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateOnScroll);
    }
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  updateOnScroll();
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---- mobile menu: handled natively by Bootstrap's Offcanvas component
  //      (data-bs-toggle/data-bs-dismiss attributes in index.html) ----

  // Video nền giờ chỉ nằm trong .hero (không còn fixed toàn trang), nên
  // dùng IntersectionObserver để biết chính xác lúc hero còn/hết hiện
  // trên màn hình rồi mới play/pause — vừa đỡ tốn CPU/GPU giải mã liên
  // tục lúc đã cuộn xa, vừa không cần đoán qua window.innerHeight.
  if (bgVideo) {
    var heroEl = document.querySelector(".hero");
    if (heroEl && "IntersectionObserver" in window) {
      var ioVideo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              bgVideo.play().catch(function () {});
            } else {
              bgVideo.pause();
            }
          });
        },
        { threshold: 0 },
      );
      ioVideo.observe(heroEl);
    }
  }

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
  // Ngay lúc vừa reload, video nền đang trong giai đoạn giải mã/buffer
  // nặng nhất — nếu đếm số đúng lúc đó, main thread bị tranh chấp và số
  // bị xé hình/giật như trong ảnh. "playing" là thời điểm video đã thật
  // sự chạy được (qua giai đoạn nặng nhất), nên đợi đúng lúc đó rồi mới
  // đếm; có timeout dự phòng để không bị treo nếu video lỗi/bị chặn.
  var readyForCounters = false;
  var pendingCounters = [];
  function startCounter(el) {
    if (readyForCounters) {
      animateCounter(el);
    } else {
      pendingCounters.push(el);
    }
  }
  function unlockCounters() {
    if (readyForCounters) return;
    readyForCounters = true;
    pendingCounters.forEach(animateCounter);
    pendingCounters = [];
  }
  if (bgVideo) {
    bgVideo.addEventListener("playing", unlockCounters, { once: true });
  }
  setTimeout(unlockCounters, 1200);
  if ("IntersectionObserver" in window && counters.length) {
    var io2 = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            startCounter(en.target);
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

  // ---- marquee + horizontal scrollers: không cần chạy ngay lúc vừa
  // reload (nằm dưới hero, ngoài màn hình đầu tiên) — hoãn lại đến lúc
  // trình duyệt rảnh tay để nhường main thread cho hero render trước. ----
  function whenIdle(fn) {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(fn, { timeout: 1000 });
    } else {
      setTimeout(fn, 0);
    }
  }

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

  whenIdle(function () {
    // ---- marquee: duplicate content once for a seamless loop ----
    var marquee = document.getElementById("marquee");
    if (marquee) {
      marquee.innerHTML += marquee.innerHTML;
    }

    // ---- horizontal scrollers: continuous auto-scroll, pause on hover,
    //      drag-to-scroll with mouse/touch (pointer events cover both) ----
    initDragScroller(document.getElementById("team-scroll"));

    document.querySelectorAll("[data-scroll]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.dataset.scroll);
        var dir = parseInt(btn.dataset.dir, 10);
        if (target) target.scrollBy({ left: dir * 300, behavior: "smooth" });
      });
    });
  });

  // ---- services accordion: handled natively by Bootstrap's Accordion
  //      component (data-bs-toggle="collapse" + data-bs-parent) ----
})();
