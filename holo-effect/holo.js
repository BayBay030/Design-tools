/* ==========================================================================
   holo.js — 指標引擎
   Bay (3x3) Studio / 2026-09-06

   它只做一件事：把滑鼠在卡片上的位置，換成八個 CSS 變數寫回卡片。
   閃光怎麼長是 holo.css 的事，這裡完全不管。
   ========================================================================== */

(function (global) {
  "use strict";

  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  function attach(el) {
    if (el._holo) return el._holo;

    var maxTilt = parseFloat(el.getAttribute("data-tilt") || "14");
    var target = { x: 50, y: 50, on: 0 };   // 想去的位置
    var actual = { x: 50, y: 50, on: 0 };   // 目前的位置（追著 target 跑）
    var ease = 0.18;
    var raf = null;
    var alwaysOn = false;
    var demo = null;

    // 把目前狀態寫成 CSS 變數
    function paint() {
      var cx = (actual.x - 50) / 50;                 // -1 ~ 1
      var cy = (actual.y - 50) / 50;
      var fromCenter = clamp(Math.sqrt(cx * cx + cy * cy), 0, 1);
      var s = el.style;

      s.setProperty("--px", actual.x.toFixed(2) + "%");
      s.setProperty("--py", actual.y.toFixed(2) + "%");
      s.setProperty("--fx", (actual.x / 100).toFixed(4));
      s.setProperty("--fy", (actual.y / 100).toFixed(4));
      s.setProperty("--fc", fromCenter.toFixed(4));
      s.setProperty("--rx", (cx * maxTilt).toFixed(2) + "deg");
      s.setProperty("--ry", (-cy * maxTilt).toFixed(2) + "deg");
      s.setProperty("--on", actual.on.toFixed(4));

      el.classList.toggle("is-lit", actual.on > 0.25);
    }

    // 每一幀往目標挪一點點，做出平滑跟隨
    function tick() {
      var moving = false;
      var keys = ["x", "y", "on"];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var d = target[k] - actual[k];
        if (Math.abs(d) > 0.004) {
          actual[k] += d * ease;
          moving = true;
        } else {
          actual[k] = target[k];
        }
      }
      paint();
      raf = moving ? requestAnimationFrame(tick) : null;
    }

    function run() {
      if (raf === null) raf = requestAnimationFrame(tick);
    }

    function stopDemo() {
      if (demo) {
        clearInterval(demo.timer);
        clearTimeout(demo.stop);
        demo = null;
      }
    }

    function move(e) {
      stopDemo();
      var r = el.getBoundingClientRect();
      target.x = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
      target.y = clamp(((e.clientY - r.top) / r.height) * 100, 0, 100);
      target.on = 1;
      ease = 0.18;
      run();
    }

    function leave() {
      if (alwaysOn) return;
      target.x = 50;
      target.y = 50;
      target.on = 0;
      ease = 0.055;     // 放開時回得慢一點，比較有重量
      run();
    }

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    el.classList.add("js-on");

    var api = {
      el: el,

      // 常亮開關
      setAlways: function (on) {
        alwaysOn = !!on;
        if (alwaysOn) {
          target.on = 1;
          ease = 0.12;
          run();
        } else {
          leave();
        }
      },

      // 傾斜幅度
      setTilt: function (deg) {
        maxTilt = parseFloat(deg) || 0;
        paint();
      },

      // 開場自動繞一圈，不用滑進去就看得到
      sweep: function (seconds) {
        stopDemo();
        var t = 0;
        var life = (seconds || 3) * 1000;
        ease = 0.22;
        demo = {
          timer: setInterval(function () {
            t += 0.055;
            target.x = 50 + Math.sin(t) * 42;
            target.y = 50 + Math.cos(t * 0.85) * 40;
            target.on = 1;
            run();
          }, 20),
          stop: setTimeout(function () {
            stopDemo();
            leave();
          }, life)
        };
      }
    };

    el._holo = api;
    return api;
  }

  function attachAll(root) {
    var list = (root || document).querySelectorAll(".foil");
    var out = [];
    for (var i = 0; i < list.length; i++) out.push(attach(list[i]));
    return out;
  }

  global.Holo = { attach: attach, attachAll: attachAll };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { attachAll(); });
  } else {
    attachAll();
  }
})(window);
