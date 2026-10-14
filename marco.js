/**
 * Marco común de la app instalable "Inspección Cintas".
 *  · Escritorio (pantalla de 900 px o más): menú lateral fijo a la izquierda.
 *  · Celular: barra inferior (Inicio, Checklist, Mapeo, Espesores, Más) para usar con una mano.
 * Muestra usuario, perfil, señal y cambios por enviar. Lo alimenta puente.js con MARCO.pintar(datos).
 */
(function () {
  var CFG = window.PUENTE || {};
  var ANCHO = 900;
  var ICO = {
    inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    checklist: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 12l2 2 4-4"/>',
    mapeo: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14"/><path d="M15 6v14"/>',
    espesores: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2"/><path d="M10 10l2 2"/><path d="M13 7l2 2"/>',
    semanal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    pauta: '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
    flash: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    catalogo: '<path d="M3 21V9l6-4v4l6-4v4l6-4v16z"/><path d="M7 17h2"/><path d="M11 17h2"/><path d="M15 17h2"/>',
    admin: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
  };
  var ITEMS = [
    { id: 'inicio', t: 'Inicio', href: 'index.html', g: 'a' },
    { id: 'checklist', t: 'Checklist Cambio de Cintas', c: 'Checklist', href: 'checklist.html', g: 'a', m: 'CHECKLIST' },
    { id: 'mapeo', t: 'Mapeo de Cintas', c: 'Mapeo', href: 'mapeo.html', g: 'a', m: 'MAPEO' },
    { id: 'espesores', t: 'Medición de Espesores', c: 'Espesores', href: 'espesores.html', g: 'a', m: 'ESPESORES' },
    { id: 'semanal', t: 'Reporte Semanal', href: 'semanal.html', g: 'a', m: 'SEMANAL' },
    { id: 'pauta', t: 'Pauta de Inspección', href: 'pauta.html', g: 'a', m: 'INSPECCION' },
    { id: 'flash', t: 'Reporte Flash', href: 'flash.html', g: 'a', m: 'FLASH' },
    { id: 'catalogo', t: 'Catálogo de equipos', href: 'admin.html?tab=equipos', g: 'g' },
    { id: 'admin', t: 'Administración', href: 'admin.html', g: 'g' }
  ];
  var BARRA = ['inicio', 'checklist', 'mapeo', 'espesores'];
  var NOMBRE_ROL = { ADMIN: 'Administrador', EDITOR: 'Usuario', LECTOR: 'Visualizador', NINGUNO: 'Sin acceso' };
  var D = {};
  try { document.documentElement.setAttribute('data-app', CFG.app || 'inicio'); } catch (e) { }

  function svg(k, s) { return '<svg aria-hidden="true" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICO[k] + '</svg>'; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesion() { return !!(window.SESION_APP && SESION_APP.token()); }
  function actual() {
    var app = CFG.app || 'inicio';
    if (app === 'admin' && /[?&]tab=equipos/.test(location.search)) return 'catalogo';
    return app;
  }
  function iniciales(n) { return String(n || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(String).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || '?'; }

  function css() {
    if (document.getElementById('icMarcoCss')) return;
    var st = document.createElement('style'); st.id = 'icMarcoCss';
    st.textContent =
      '#icLat,#icBar,#icHoja{font:14px/1.35 "Segoe UI",Roboto,system-ui,Arial,sans-serif;-webkit-font-smoothing:antialiased}' +
      '#icLat a,#icBar a,#icHoja a{text-decoration:none}' +
      /* escritorio */
      'html.ic-esc{padding-left:244px}' +
      '#icLat{position:fixed;left:0;top:0;bottom:0;width:244px;z-index:2147482990;background:#0B2545;color:#fff;display:flex;flex-direction:column;gap:18px;padding:16px 12px;box-sizing:border-box;overflow-y:auto}' +
      '#icLat .logos{background:#fff;border-radius:10px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:6px}' +
      '#icLat .logos img{height:30px;width:auto;display:block}' +
      '#icLat .gr{display:flex;flex-direction:column;gap:2px}' +
      '#icLat .gr>span{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#9FB3D1;padding:0 10px 6px}' +
      '#icLat .it{display:flex;align-items:center;gap:12px;min-height:42px;padding:0 12px;border-radius:8px;color:#DCE5F2;font-size:14px}' +
      '#icLat .it:hover{background:#13315C;color:#fff}' +
      '#icLat .it.on{background:#1F4E8C;color:#fff;font-weight:600}' +
      '#icLat .it.bloq{opacity:.45}' +
      '#icLat .yo{margin-top:auto;border-top:1px solid #1F3B63;padding-top:14px;display:flex;flex-direction:column;gap:10px}' +
      '#icLat .per{display:flex;align-items:center;gap:10px}' +
      '.icAv{width:36px;height:36px;flex:none;border-radius:50%;background:#E35205;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}' +
      '#icLat .per b{display:block;font-size:14px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px}' +
      '#icLat .per small{display:block;font-size:12px;color:#9FB3D1}' +
      '.icEst{display:flex;align-items:center;gap:8px;font-size:12.5px;border-radius:8px;padding:8px 10px}' +
      '.icEst i{width:8px;height:8px;border-radius:50%;flex:none}' +
      '#icLat .icEst{background:#13315C;color:#DCE5F2}' +
      '.icEst.ok i{background:#5BD27A}.icEst.off i{background:#FFB27A}' +
      '.icBt{display:flex;align-items:center;justify-content:center;gap:8px;min-height:38px;border-radius:8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;width:100%;box-sizing:border-box}' +
      '#icLat .icBt{border:1px solid #36557F;background:transparent;color:#DCE5F2}#icLat .icBt:hover{background:#13315C}' +
      '.icBt.pri{background:#E35205!important;border-color:#E35205!important;color:#fff!important}' +
      '.icErr{font-size:12px;border-radius:8px;padding:6px 8px;background:#5A1E1E;color:#FFD6D6}' +
      '.icErr a{color:#fff;text-decoration:underline!important;margin-left:6px}' +
      /* celular */
      'html.ic-cel{padding-bottom:78px}' +
      '#icBar{position:fixed;left:0;right:0;bottom:0;z-index:2147482990;background:#fff;border-top:1px solid #DDE2EA;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));padding:4px 4px calc(6px + env(safe-area-inset-bottom));box-shadow:0 -2px 12px rgba(11,37,69,.08)}' +
      '#icBar a,#icBar button{min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#5A6478;font:inherit;font-size:11px;background:none;border:0;cursor:pointer;position:relative;padding:0}' +
      '#icBar .on{color:#1F4E8C;font-weight:700}' +
      '#icBar .on svg{stroke-width:2.4}' +
      '#icBar i.n{position:absolute;top:4px;left:calc(50% + 6px);min-width:18px;height:18px;border-radius:9px;background:#E35205;color:#fff;font:700 11px/18px Arial;font-style:normal;padding:0 4px;box-sizing:border-box}' +
      '#icHoja{position:fixed;inset:0;z-index:2147482995;background:rgba(11,37,69,.45);display:none;align-items:flex-end}' +
      '#icHoja.on{display:flex}' +
      '#icHoja .c{background:#F2F4F7;width:100%;max-height:85vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:14px 16px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;display:flex;flex-direction:column;gap:12px;color:#14213D}' +
      '#icHoja .tir{width:40px;height:4px;border-radius:2px;background:#C9D1DC;margin:0 auto}' +
      '#icHoja .lst{background:#fff;border:1px solid #DDE2EA;border-radius:12px;display:flex;flex-direction:column}' +
      '#icHoja .lst a{min-height:52px;display:flex;align-items:center;gap:14px;padding:0 14px;color:#14213D;font-size:15px;font-weight:600;border-bottom:1px solid #EEF1F5}' +
      '#icHoja .lst a:last-child{border-bottom:0}#icHoja .lst a svg{color:#1F4E8C}#icHoja .lst a.on{background:#EAF1FB}' +
      '#icHoja .caja{background:#fff;border:1px solid #DDE2EA;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}' +
      '#icHoja .per{display:flex;align-items:center;gap:12px}#icHoja .per b{display:block;font-size:15px}#icHoja .per small{display:block;font-size:12px;color:#5A6478;word-break:break-all}' +
      '#icHoja .icEst.ok{background:#E6F2EA;color:#1E5E2E}#icHoja .icEst.off{background:#FFE9D6;color:#7A3300}' +
      '#icHoja .icBt{border:1px solid #C9D1DC;background:#fff;color:#14213D;min-height:44px}' +
      '#icHoja .icBt.salir{color:#A31F1F}' +
      '@media print{#icLat,#icBar,#icHoja{display:none!important}html.ic-esc{padding-left:0}html.ic-cel{padding-bottom:0}}';
    document.head.appendChild(st);
  }

  function permitido(it) {
    if (!it.m || !D.modulos) return true;
    var m = D.modulos[it.m];
    return !m || m !== 'NINGUNO';
  }

  function bloqueYo(enHoja) {
    var nombre = D.nombre || D.email || 'Sin sesión';
    var h = '<div class="per"><div class="icAv">' + esc(iniciales(nombre)) + '</div><div style="min-width:0"><b>' + esc(nombre) + '</b><small>' +
      (enHoja ? esc(D.email || '') + (D.rol ? ' · ' : '') : '') + esc(D.rol ? (NOMBRE_ROL[D.rol] || D.rol) + (CFG.app && CFG.app !== 'inicio' && CFG.app !== 'admin' ? ' en esta app' : '') : '') + '</small></div></div>';
    h += '<div class="icEst ' + (D.sinSenal ? 'off' : 'ok') + '"><i></i><span>' +
      (D.sinSenal ? 'Sin señal · trabajando con lo guardado' : 'Con señal') +
      (D.pendientes ? ' · ' + D.pendientes + ' por enviar' : '') + '</span></div>';
    if (D.pendientes && !D.sinSenal && D.puedeEnviar) h += '<button type="button" class="icBt pri" data-ic="sync">Enviar ahora</button>';
    (D.errores || []).forEach(function (e) {
      h += '<div class="icErr">No se pudo enviar (' + esc(e.fn) + '): ' + esc(e.error) + '<a href="#" data-ic-desc="' + e.id + '">Descartar</a></div>';
    });
    h += '<button type="button" class="icBt salir" data-ic="salir">' + svg('salir', 16) + 'Cerrar sesión</button>';
    return h;
  }

  function pintarLateral() {
    var el = document.getElementById('icLat');
    if (!el) { el = document.createElement('div'); el.id = 'icLat'; el.setAttribute('role', 'navigation'); el.setAttribute('aria-label', 'Menú principal'); document.body.appendChild(el); }
    var a = actual();
    var it = function (x) {
      return '<a class="it' + (x.id === a ? ' on' : '') + (permitido(x) ? '' : ' bloq') + '" href="' + x.href + '"' + (x.id === a ? ' aria-current="page"' : '') + '>' + svg(x.id, 18) + '<span>' + esc(x.t) + '</span></a>';
    };
    el.innerHTML = '<div class="logos"><img src="icons/logo-msmin.jpg" alt="MSMIN by SGS"><img src="icons/logo-codelco.jpg" alt="Codelco"></div>' +
      '<div class="gr"><span>Actividades</span>' + ITEMS.filter(function (x) { return x.g === 'a'; }).map(it).join('') + '</div>' +
      '<div class="gr"><span>Gestión</span>' + ITEMS.filter(function (x) { return x.g === 'g'; }).map(it).join('') + '</div>' +
      '<div class="yo">' + bloqueYo(false) + '</div>';
    enlazar(el);
  }

  function pintarBarra() {
    var el = document.getElementById('icBar');
    if (!el) { el = document.createElement('div'); el.id = 'icBar'; el.setAttribute('role', 'navigation'); el.setAttribute('aria-label', 'Navegación'); document.body.appendChild(el); }
    var a = actual(), enMas = BARRA.indexOf(a) < 0;
    el.innerHTML = BARRA.map(function (id) {
      var x = ITEMS.filter(function (i) { return i.id === id; })[0];
      return '<a href="' + x.href + '" class="' + (id === a ? 'on' : '') + '"' + (id === a ? ' aria-current="page"' : '') + '>' + svg(id, 22) + (x.c || x.t) + '</a>';
    }).join('') + '<button type="button" data-ic="mas" class="' + (enMas ? 'on' : '') + '" aria-label="Más opciones">' + svg('mas', 22) + 'Más' +
      (D.pendientes ? '<i class="n">' + D.pendientes + '</i>' : '') + '</button>';
    var h = document.getElementById('icHoja');
    if (!h) { h = document.createElement('div'); h.id = 'icHoja'; document.body.appendChild(h); h.onclick = function (e) { if (e.target === h) h.classList.remove('on'); }; }
    h.innerHTML = '<div class="c" role="dialog" aria-label="Más opciones"><div class="tir"></div>' +
      '<div class="lst">' + ITEMS.filter(function (x) { return BARRA.indexOf(x.id) < 0; }).map(function (x) {
        return '<a href="' + x.href + '" class="' + (x.id === a ? 'on' : '') + '">' + svg(x.id, 22) + '<span>' + esc(x.t) + '</span></a>';
      }).join('') + '</div><div class="caja">' + bloqueYo(true) + '</div></div>';
    enlazar(el); enlazar(h);
  }

  function enlazar(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-ic]'), function (b) {
      b.onclick = function (ev) {
        ev.preventDefault();
        var k = b.getAttribute('data-ic');
        if (k === 'mas') document.getElementById('icHoja').classList.add('on');
        if (k === 'sync' && D.enviar) D.enviar();
        if (k === 'salir' && confirm('¿Cerrar sesión en este equipo?')) { if (window.SESION_APP) SESION_APP.cerrar(); location.href = 'index.html'; }
      };
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-ic-desc]'), function (b) {
      b.onclick = function (ev) { ev.preventDefault(); if (D.descartar && confirm('¿Descartar este cambio? No se enviará.')) D.descartar(+b.getAttribute('data-ic-desc')); };
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('a.bloq'), function (b) {
      b.onclick = function (ev) { ev.preventDefault(); alert('Su usuario no tiene acceso a esta actividad.'); };
    });
  }

  /** Barra de título común: nombre de la actividad, área y estado de la señal. */
  function pintarTitulo() {
    var el = document.getElementById('icTop');
    if (!el) { el = document.createElement('div'); el.id = 'icTop'; el.setAttribute('role', 'banner'); document.body.insertBefore(el, document.body.firstChild); }
    var a = actual(), x = ITEMS.filter(function (i) { return i.id === a; })[0] || ITEMS[0];
    var tit = a === 'inicio' ? (D.nombre ? 'Hola, ' + String(D.nombre).split(/[\s@]/)[0] : 'Inicio') : x.t;
    el.innerHTML = '<div class="t"><small>' + (a === 'inicio' ? 'Gestión de Cintas Transportadoras' : (x.g === 'a' ? 'Actividades' : 'Gestión')) +
      (D.area ? ' · ' + esc(D.area) : '') + '</small><h1>' + esc(tit) + '</h1></div>' +
      '<span class="est ' + (D.sinSenal ? 'off' : 'ok') + '"><i></i>' + (D.sinSenal ? 'Sin señal' : 'Con señal') +
      (D.pendientes ? ' · ' + D.pendientes + ' por enviar' : '') + '</span>';
  }

  function aplicar() {
    if (!document.body) return;
    css();
    var root = document.documentElement, activo = sesion() && CFG.marco !== false;
    var esc_ = activo && window.innerWidth >= ANCHO, cel = activo && !esc_;
    root.classList.toggle('ic-esc', esc_); root.classList.toggle('ic-cel', cel);
    ['icLat', 'icBar', 'icHoja'].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = ''; });
    var lat = document.getElementById('icLat'), bar = document.getElementById('icBar'), hoja = document.getElementById('icHoja');
    var top = document.getElementById('icTop');
    if (activo) pintarTitulo(); else if (top) top.style.display = 'none';
    if (top && activo) top.style.display = '';
    if (esc_) pintarLateral(); else if (lat) lat.style.display = 'none';
    if (cel) pintarBarra(); else { if (bar) bar.style.display = 'none'; if (hoja) { hoja.classList.remove('on'); hoja.style.display = 'none'; } }
  }

  window.MARCO = {
    /** datos: {nombre, email, rol, modulos:{MAPEO:'EDITOR',…}, sinSenal, pendientes, errores:[{id,fn,error}], puedeEnviar, enviar(), descartar(id)} */
    pintar: function (datos) { for (var k in datos) D[k] = datos[k]; aplicar(); },
    refrescar: aplicar
  };
  var t = null;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(aplicar, 120); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar); else aplicar();
})();
