/* Mango Crush product page v4. Same pre-order backend and form as v3.
   EN/TH switch, gallery, routine steps, sticky bar, reserve drawer + form, tracking, motion. */
(function () {
  "use strict";
  var API = "https://liquick-brain.onrender.com/api/preorder/";
  var root = document.documentElement;
  root.classList.add("js");
  var PAGE = document.body.getAttribute("data-page");
  var TEST = /[?&]test=1/.test(location.search);   // QA visits: no tracking, form shows success without sending
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var reflow = function (el) { return el.offsetWidth; };

  // ---------- language ----------
  var lang = "th";
  try { lang = (location.search.match(/[?&]lang=(en|th)/) || [])[1] || localStorage.getItem("mc_lang") || "th"; } catch (e) {}
  function setLang(l) {
    lang = l === "en" ? "en" : "th";
    root.setAttribute("data-lang", lang); root.lang = lang;
    $$("[data-set-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang)); });
    $$("[data-ph-" + lang + "]").forEach(function (el) { el.placeholder = el.getAttribute("data-ph-" + lang); });
    try { localStorage.setItem("mc_lang", lang); } catch (e) {}
  }
  // copy fades out, swaps, fades back in (images and layout stay put)
  function switchLang(l) {
    if (l === lang) return;
    if (REDUCE) return setLang(l);
    root.classList.add("lang-out");
    setTimeout(function () {
      setLang(l);
      reflow(document.body);              // new-language text is laid out at opacity 0 first, so it can fade in
      root.classList.remove("lang-out");
    }, 180);
  }
  $$("[data-set-lang]").forEach(function (b) { b.addEventListener("click", function () { switchLang(b.getAttribute("data-set-lang")); }); });
  setLang(lang);
  var T = function (th, en) { return lang === "en" ? en : th; };

  // ---------- tracking ----------
  var vid;
  try { vid = localStorage.getItem("mc_vid"); if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("mc_vid", vid); } }
  catch (e) { vid = "anon-" + Math.random().toString(36).slice(2); }
  var sent = {};
  function track(type, once) {
    if (once && sent[type]) return; sent[type] = true;
    if (TEST) return;
    try { fetch(API + "event", { method: "POST", keepalive: true, headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ page: PAGE, type: type, vid: vid, ref: (document.referrer || "").slice(0, 120) }) }); } catch (e) {}
  }
  track("view", true);

  // ---------- gallery: crossfade a new layer over the current photo, then hand it over ----------
  var main = document.getElementById("gal-main"), stage = main.parentNode;
  var thumbs = $$(".thumb"), strip = document.querySelector(".gal__thumbs");
  function showThumb(t) {
    var next = t.getAttribute("data-src");
    thumbs.forEach(function (o) { o.classList.toggle("is-on", o === t); });
    if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2 });
    if (main.getAttribute("src") === next) return;
    if (REDUCE) { main.src = next; return; }
    var layer = new Image(); layer.className = "gal__layer"; layer.alt = ""; layer.src = next;
    (layer.decode ? layer.decode() : Promise.resolve()).catch(function () {}).then(function () {
      stage.appendChild(layer); reflow(layer); layer.classList.add("is-in");
      setTimeout(function () { main.src = next; layer.remove(); }, 900);
    });
  }
  thumbs.forEach(function (t) { t.addEventListener("click", function () { showThumb(t); }); });
  var x0 = null;
  stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) < 45) return;
    var i = thumbs.indexOf(document.querySelector(".thumb.is-on")) + (dx < 0 ? 1 : -1);
    showThumb(thumbs[(i + thumbs.length) % thumbs.length]);
  }, { passive: true });

  // ---------- routine steps ----------
  function group(btnSel, attr, show) {
    var btns = $$(btnSel);
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("aria-pressed") === "true") return;
        btns.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        show(b.getAttribute(attr));
      });
    });
  }
  group("[data-step]", "data-step", function (n) {
    $$("[data-step-panel]").forEach(function (p) {
      var on = p.getAttribute("data-step-panel") === n;
      p.hidden = !on;
      if (on) { p.classList.remove("is-enter"); reflow(p); p.classList.add("is-enter"); }
    });
  });

  // ---------- accordions: animate the height, not a jump ----------
  $$(".acc details").forEach(function (d) {
    var s = d.querySelector("summary"), busy = false;
    s.addEventListener("click", function (e) {
      if (REDUCE || !d.animate) return;
      e.preventDefault();
      if (busy) return; busy = true;
      var from = d.offsetHeight, opening = !d.open, to;
      if (opening) { d.open = true; to = d.offsetHeight; }
      else { d.classList.add("is-closing"); to = s.offsetHeight + (d.offsetHeight - d.clientHeight); }
      d.style.overflow = "hidden";
      var a = d.animate({ height: [from + "px", to + "px"] }, { duration: opening ? 420 : 320, easing: opening ? "cubic-bezier(.22,1,.36,1)" : "cubic-bezier(.4,0,.2,1)" });
      a.onfinish = a.oncancel = function () {
        if (!opening) { d.open = false; d.classList.remove("is-closing"); }
        d.style.overflow = ""; busy = false;
      };
    });
  });

  // ---------- sticky bar, header state + scroll depth ----------
  var buyBtn = document.querySelector(".box .btn"), footer = document.querySelector(".foot"), drawer = document.getElementById("reserve");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var vh = window.innerHeight, y = window.scrollY;
    var bb = buyBtn.getBoundingClientRect();
    var buyPassed = bb.bottom < 70;           // only once the main Reserve button has scrolled away
    var atEnd = footer.getBoundingClientRect().top < vh;
    root.classList.toggle("show-sticky", buyPassed && !atEnd && drawer.hidden);
    root.classList.toggle("is-scrolled", y > 8);
    var depth = (y + vh) / document.documentElement.scrollHeight;
    if (depth > 0.5) track("scroll50", true);
    if (depth > 0.9) track("scroll90", true);
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------- section entrances: the card fades in, its content rises in a short stagger ----------
  var ITEMS = ".eyebrow, .name, .kicker, .lede, .checks li, .opt, .save, .after, .box .acc, .big, .mid, .sci__h, .vs__h, .sci__p, " +
    ".made__hero, .made__list, .made__sub, .row figure, .bento > .card, .spec dl > div, .ben li, .ing article, .vs tbody tr, .vs thead, " +
    ".steps__panel, .steps__nums, .camp__tag, .stamp, .pinky__text p, .faq .acc details, .close p, .gal__thumbs, .fine";   // not .gal__main: the hero photo shows instantly
  var reveals = $$("[data-reveal]");
  reveals.forEach(function (sec) {
    var items = $$(ITEMS, sec);
    items = items.filter(function (el) { return !items.some(function (o) { return o !== el && o.contains(el); }); });  // outermost only
    items.forEach(function (el, i) { el.classList.add("rv"); el.style.setProperty("--i", Math.min(i, 9)); });
  });
  function startReveals() {
    if (startReveals.done) return; startReveals.done = true;
    if ("IntersectionObserver" in window && !REDUCE) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -12% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    } else reveals.forEach(function (el) { el.classList.add("is-in"); });
  }
  startReveals();

  // lazy photos fade in when they arrive instead of popping
  $$("img[loading=lazy]").forEach(function (img) {
    if (img.complete || img.closest(".rv")) return;
    img.classList.add("lz");
    var done = function () { img.classList.add("is-loaded"); };
    img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true });
  });

  // ---------- reserve drawer ----------
  var panel = drawer.querySelector(".drawer__panel"), lastFocus = null;
  var form = drawer.querySelector(".form"), F = form.elements, msg = form.querySelector(".form__msg"), done = drawer.querySelector(".done");
  [drawer.querySelector(".drawer__head"), drawer.querySelector(".drawer__item")].concat($$(":scope > *", form))
    .forEach(function (el, i) { el.classList.add("dv"); el.style.setProperty("--i", i); });
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false; document.body.classList.add("lock"); root.classList.remove("show-sticky");
    reflow(drawer); drawer.classList.add("is-open");
    setTimeout(function () { var f = drawer.querySelector("input[name=name]"); if (f && !form.hidden) f.focus({ preventScroll: true }); }, 450);
    track("cta"); track("form_open", true);
    if (!TEST && window.fbq && !openDrawer.sent) { openDrawer.sent = true; fbq("track", "InitiateCheckout", { content_name: "Mango Crush", value: 990, currency: "THB" }); }
  }
  function closeDrawer() {
    drawer.classList.remove("is-open"); document.body.classList.remove("lock");
    setTimeout(function () { drawer.hidden = true; onScroll(); }, REDUCE ? 0 : 420);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$("[data-open-reserve]").forEach(function (b) { b.addEventListener("click", openDrawer); });
  $$("[data-close-reserve]", drawer).forEach(function (b) { b.addEventListener("click", closeDrawer); });
  document.addEventListener("keydown", function (e) {
    if (drawer.hidden) return;
    if (e.key === "Escape") closeDrawer();
    if (e.key === "Tab") {
      var f = $$("button, input, a[href]", panel).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  // ---------- form ----------
  form.addEventListener("input", function () { if (msg.classList.contains("err")) { msg.textContent = ""; msg.classList.remove("err"); } });
  function fail(text, field) {
    msg.textContent = text; msg.classList.remove("err"); reflow(msg); msg.classList.add("err");
    var target = field || form.querySelector(".chk");
    if (target) { target.classList.remove("shake"); reflow(target); target.classList.add("shake"); }
    if (field) field.focus();
  }
  function success(name, phone) {
    done.querySelector(".done__msg").textContent = T(
      "ขอบคุณค่ะ คุณ" + name + " เราล็อกราคา ฿990 ไว้ให้แล้ว ทีมงานจะทักไปที่เบอร์ " + phone + " เมื่อล็อตแรกพร้อมส่ง",
      "Thank you, " + name + ". Your ฿990 price is locked in. Our team will contact you at " + phone + " when the first batch is ready.");
    if (!TEST && window.fbq) fbq("track", "Lead", { content_name: "Mango Crush pre-order", value: 990, currency: "THB" }, { eventID: "res-" + vid + "-" + Date.now() });
    form.classList.add("is-leaving");
    setTimeout(function () { form.hidden = true; done.hidden = false; }, REDUCE ? 0 : 260);
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = F["name"].value.trim(), phone = F["phone"].value.replace(/[^\d+]/g, ""), line = F["line"].value.trim();
    msg.classList.remove("err"); msg.textContent = "";
    if (name.length < 2) return fail(T("กรุณากรอกชื่อ", "Please enter your name"), F["name"]);
    if (!/^(\+?66|0)\d{8,9}$/.test(phone)) return fail(T("กรุณากรอกเบอร์โทรให้ถูกต้อง เช่น 0812345678", "Please enter a valid Thai phone number, e.g. 0812345678"), F["phone"]);
    if (!F["consent"].checked) return fail(T("กรุณาติ๊กยินยอมให้เราติดต่อกลับ", "Please tick the box so we can contact you"));
    var btn = form.querySelector("button[type=submit]"); btn.disabled = true;
    if (TEST) return success(name, phone);
    fetch(API + "submit", { method: "POST", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ page: PAGE, name: name, phone: phone, line: line, vid: vid, consent: true, lang: lang }) })
      .then(function (r) { return r.json().then(function (j) { return r.ok && j.ok; }); })
      .then(function (ok) { if (!ok) throw new Error("rejected"); success(name, phone); })
      .catch(function () { btn.disabled = false; track("submit_fail"); fail(T("ส่งไม่สำเร็จ ลองอีกครั้งนะคะ", "Couldn't send, please try again")); });
  });
})();
