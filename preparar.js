/**
 * preparar.js — mantiene al día en el teléfono, SOLO, los datos para trabajar sin señal.
 * Nadie tiene que acordarse de nada: desde cualquier pantalla de la app y siempre que haya señal,
 *   - cada 2 minutos pregunta al servidor si alguien guardó algo (consulta liviana, "versionDatos");
 *     si hubo cambios, descarga todo de nuevo (fichas de cada cinta, catálogos, semanas, etc.);
 *   - al abrir la app, al volver a ella y al recuperar la señal revisa de inmediato;
 *   - además, por seguridad, rápida cada 15 min y completa cada 2 horas aunque no haya cambios.
 * Sin señal, si los datos guardados son antiguos se muestra un aviso arriba de la pantalla.
 * Requiere sesion.js y puente.js.
 */
(function () {
  var MIN = 60 * 1000;
  var CADA_RAPIDA = 15 * MIN, CADA_COMPLETA = 120 * MIN, REVISAR_CADA = 2 * MIN, AVISO_ANTIGUO = 8 * 60 * MIN;
  var PAGINA_ACTUAL = (window.PUENTE && window.PUENTE.app) || '';
  var MODULOS = ['MAPEO', 'ESPESORES', 'SEMANAL', 'INSPECCION', 'FLASH', 'CHECKLIST'];

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function semanaExcel(f) {    // igual que NUM.DE.SEMANA(fecha; 2): semana desde lunes, la 1 contiene el 1 de enero
    var ene1 = new Date(f.getFullYear(), 0, 1), dow = (ene1.getDay() + 6) % 7;
    return Math.floor((Math.round((new Date(f.getFullYear(), f.getMonth(), f.getDate()) - ene1) / 864e5) + dow) / 7) + 1;
  }
  /** Guarda en la base local del Reporte Semanal (misma estructura que crea esa app). */
  function guardarIDB(nombre, clave, valor) {
    try {
      var rq = indexedDB.open(nombre, 1);
      rq.onupgradeneeded = function () { var x = rq.result; x.createObjectStore('cola', { keyPath: 'k' }); x.createObjectStore('cache'); x.createObjectStore('img'); };
      rq.onsuccess = function () {
        var d = rq.result;
        try { var tx = d.transaction('cache', 'readwrite'); tx.objectStore('cache').put(valor, clave); tx.oncomplete = function () { d.close(); }; } catch (e) { d.close(); }
      };
    } catch (e) { }
  }
  // No se pisan los datos guardados de la app que está abierta en este momento.
  function guardarLocal(app, clave, valor) { if (PAGINA_ACTUAL !== app) ls(clave, JSON.stringify(valor)); }

  function tareas(d, completo) {
    var rol = {}; (d.modulos || []).forEach(function (m) { rol[m.id] = m.rol; });
    function si(mod) { return rol[mod] && rol[mod] !== 'NINGUNO'; }
    var hoy = new Date(), anio = hoy.getFullYear(), sem = semanaExcel(hoy), t = [];
    MODULOS.forEach(function (m) { if (si(m)) t.push(['sesionEstado', [m]]); });
    if (si('MAPEO')) t.push(['apiInit', [''], completo ? function (r) {
      (r && r.cintas || []).forEach(function (c) { t.push(['apiGetCinta', [c.ID_CINTA]]); });
    } : null]);
    if (si('SEMANAL')) {
      [[anio, sem], sem > 1 ? [anio, sem - 1] : [anio - 1, 52]].forEach(function (as) {
        t.push(['obtenerDatos', as, function (r) { if (r && r.exito && PAGINA_ACTUAL !== 'semanal') guardarIDB('reporte_semanal_cintas', 'sem|' + r.anio + '|' + r.semana, r); }]);
      });
      t.push(['listarReportes', [], function (r) { if (r && r.exito && PAGINA_ACTUAL !== 'semanal') guardarIDB('reporte_semanal_cintas', 'reportes', r.reportes); }]);
    }
    if (si('FLASH')) t.push(['getInitialData', [], function (r) { if (r && r.success) guardarLocal('flash', 'rf_datos', r); }]);
    if (si('ESPESORES')) t.push(['apiCatalogo', [], function (r) { if (r && r.ok) guardarLocal('espesores', 'me_catalogo', r); }]);
    if (si('CHECKLIST')) t.push(['obtenerDatosInicialesApp', [], function (r) { if (r) guardarLocal('checklist', 'cintas_datos_iniciales', r); }]);
    if (si('INSPECCION')) t.push(['obtenerDatosIniciales', [], function (r) {
      if (r && r.exito) guardarLocal('pauta', 'pi_datos', r);
      if (completo) ((r && (r.equipos || r.catalogo)) || []).forEach(function (e) {
        var tag = e && (e.tag || e.TAG || e.ID_EQUIPO);
        if (typeof tag === 'string') { t.push(['obtenerEspesores', [tag]]); t.push(['obtenerMapeoCinta', [tag]]); }
      });
    }]);
    t.push(['adminEquipos', []]);                    // Catálogo de equipos: todos lo ven (también sin señal)
    if (si('INSPECCION')) t.push(['otsSemana', ['', '']]);   // OT semanales de la semana actual (también sin señal)
    if (d.sesion && d.sesion.rol === 'ADMIN') t.push(['adminUsuarios', []]);
    t.push(['datosTablas', []]); t.push(['informesListar', []]);
    return t;
  }

  var enCurso = false;
  /** op = { completo, alAvanzar(n, total), manual } → Promise({hechas, fallidas}) */
  function ejecutar(op) {
    op = op || {};
    if (enCurso || !navigator.onLine || !SESION_APP.token() || !window.PUENTE_API) return Promise.resolve(null);
    enCurso = true;
    return SESION_APP.llamar('inicioDatos', []).then(function (d) {
      ls('ic_inicio', JSON.stringify(d));
      var lista = tareas(d, !!op.completo);           // las fichas de cada cinta se agregan a esta misma lista al llegar apiInit
      lista.unshift(['inicioDatos', []]);
      return PUENTE_API.precargar(lista, op.alAvanzar || window.PREPARAR_AVANCE);
    }).then(function (r) {
      var ahora = String(Date.now());
      ls('ic_prep_rapida', ahora);
      if (op.completo) ls('ic_preparado', ahora);
      enCurso = false;
      document.dispatchEvent(new CustomEvent('ic-preparado', { detail: r }));
      return r;
    }, function (e) { enCurso = false; if (e && e.sinSesion) return null; return null; });
  }

  /** Revisa si hay datos nuevos en el servidor y corre la actualización que corresponda. */
  function siCorresponde() {
    if (enCurso || !navigator.onLine || !SESION_APP.token()) return Promise.resolve(null);
    var porTiempo = function () {
      var ahora = Date.now();
      if (ahora - (+ls('ic_preparado') || 0) > CADA_COMPLETA) return ejecutar({ completo: true });
      if (ahora - (+ls('ic_prep_rapida') || 0) > CADA_RAPIDA) return ejecutar({ completo: false });
      return Promise.resolve(null);
    };
    return SESION_APP.llamar('versionDatos', []).then(function (r) {
      var v = r && r.v ? String(r.v) : '';
      if (v && (v !== ls('ic_version') || !(+ls('ic_preparado')))) {
        return ejecutar({ completo: true }).then(function (res) { if (res) ls('ic_version', v); return res; });
      }
      return porTiempo();
    }, function () { return porTiempo(); });      // servidor antiguo sin versionDatos: solo por tiempo
  }

  /* Aviso sin señal cuando lo guardado en el teléfono es antiguo (o nunca se descargó). */
  function pintarAviso() {
    if (!document.body || (window.PUENTE && window.PUENTE.app === 'inicio' && !SESION_APP.token())) return;
    var ult = Math.max(+ls('ic_prep_rapida') || 0, +ls('ic_preparado') || 0), edad = Date.now() - ult;
    var a = document.getElementById('icAvisoDatos');
    var mostrar = !navigator.onLine && SESION_APP.token() && (!ult || edad > AVISO_ANTIGUO);
    if (!mostrar) { if (a) a.remove(); return; }
    if (!a) {
      a = document.createElement('div'); a.id = 'icAvisoDatos';
      a.style.cssText = 'position:sticky;top:0;z-index:2147483001;background:#C00000;color:#fff;padding:8px 12px;font:600 13px/1.35 "Segoe UI",Roboto,Arial,sans-serif;text-align:center';
      document.body.insertBefore(a, document.body.firstChild);
    }
    a.textContent = ult
      ? '⚠ Sin señal. Los datos del teléfono son del ' + new Date(ult).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) +
        ' (hace ' + Math.round(edad / 3600000) + ' h). Lo que registre igual se guarda y se envía al volver la señal.'
      : '⚠ Sin señal y este teléfono aún no ha descargado datos. Abra la app con señal unos segundos.';
  }

  window.PREPARAR = {
    ejecutar: ejecutar, siCorresponde: siCorresponde,
    ultima: function () { return Math.max(+ls('ic_prep_rapida') || 0, +ls('ic_preparado') || 0); },
    enCurso: function () { return enCurso; }
  };

  setTimeout(siCorresponde, 1500);                                // al abrir cualquier pantalla
  setInterval(siCorresponde, REVISAR_CADA);
  window.addEventListener('online', function () { pintarAviso(); setTimeout(siCorresponde, 2000); });
  window.addEventListener('offline', pintarAviso);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { pintarAviso(); setTimeout(siCorresponde, 1000); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintarAviso); else pintarAviso();
  setInterval(pintarAviso, MIN);
})();
