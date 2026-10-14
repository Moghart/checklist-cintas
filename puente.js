/**
 * puente.js — hace funcionar las apps de Gestión Cintas en el celular, con y sin señal.
 *
 * Las apps se escribieron para Apps Script y llaman al servidor con google.script.run.
 * Este archivo crea ese mismo google.script.run, pero cada llamada viaja por internet a
 * doPost() con el pase de sesión del usuario (correo + PIN). Además:
 *  - LECTURAS: con señal se piden al servidor y se guarda una copia en el teléfono.
 *    Sin señal se responde con la última copia guardada.
 *  - ESCRITURAS: las apps Checklist, Espesores, Reporte Semanal, Pauta y Flash ya traen su
 *    propia bandeja sin señal. Para Mapeo (y lo que se configure con colaEscritura) este archivo
 *    guarda el cambio en una bandeja, lo muestra al tiro en la ficha y lo envía al volver la señal.
 * Cada página define antes window.PUENTE = { modulo, app, colaEscritura, sinCache: [] }.
 */
(function () {
  var CFG = window.PUENTE || {};
  var TIPO = window.PUENTE_FUNCIONES || {};      // nombre -> 'R' | 'W' (lo genera construir.py)
  var ARGS_LIBRES = ['apiInit', 'apiCatalogo', 'getInitialData', 'obtenerDatosIniciales', 'obtenerDatosInicialesApp',
    'inicioDatos', 'datosTablas', 'informesListar', 'obtenerListaInspeccionesBD', 'obtenerCatalogoEquipos',
    'obtenerCatalogoEquiposCompleto', 'listarReportes'];
  var ESPERA_LECTURA_MS = 15000;

  /* ------------------------------------------------------------ almacenamiento */
  var dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (ok, mal) {
      var rq = indexedDB.open('ic_puente', 1);
      rq.onupgradeneeded = function () {
        var d = rq.result;
        d.createObjectStore('cache');
        d.createObjectStore('cola', { keyPath: 'id', autoIncrement: true });
      };
      rq.onsuccess = function () { ok(rq.result); };
      rq.onerror = function () { mal(rq.error); };
    });
    return dbP;
  }
  function tx(store, modo, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, mal) {
        var t = d.transaction(store, modo), s = t.objectStore(store), r = fn(s);
        t.oncomplete = function () { ok(r && 'result' in r ? r.result : undefined); };
        t.onerror = function () { mal(t.error); };
      });
    });
  }
  function clave(fn, args) { return fn + '|' + JSON.stringify(args || []); }
  function cacheLeer(k) { return tx('cache', 'readonly', function (s) { return s.get(k); }).catch(function () { return undefined; }); }
  function cacheGuardar(k, v) { return tx('cache', 'readwrite', function (s) { s.put({ t: Date.now(), v: v }, k); }).catch(function () { }); }
  function cacheUltimoDe(fn) {
    return tx('cache', 'readonly', function (s) { return s.getAll(IDBKeyRange.bound(fn + '|', fn + '|￿')); })
      .then(function (l) { return (l || []).sort(function (a, b) { return b.t - a.t; })[0]; }).catch(function () { return undefined; });
  }
  function colaTodos() { return tx('cola', 'readonly', function (s) { return s.getAll(); }).then(function (l) { return l || []; }).catch(function () { return []; }); }
  function colaPoner(item) { return tx('cola', 'readwrite', function (s) { return s.put(item); }); }
  function colaQuitar(id) { return tx('cola', 'readwrite', function (s) { s.delete(id); }); }

  /* ------------------------------------------------------------ llamadas */
  function esErrorDeRed(e) { return !!(e && (e.red || e.name === 'TypeError' || /Failed to fetch|NetworkError|Load failed|conexión \(HTTP 5/.test(e.message || ''))); }
  function conLimite(p, ms) {
    return new Promise(function (ok, mal) {
      var t = setTimeout(function () { var e = new Error('La señal está muy débil'); e.red = true; mal(e); }, ms);
      p.then(function (r) { clearTimeout(t); ok(r); }, function (e) { clearTimeout(t); mal(e); });
    });
  }
  function sinSenal(fn) {
    var e = new Error('Sin señal y sin datos guardados para "' + fn + '". Abra esta app una vez con señal.');
    e.red = true; return e;
  }

  function leer(fn, args) {
    var k = clave(fn, args), usarCache = (CFG.sinCache || []).indexOf(fn) < 0;
    var desdeCache = function (err) {
      if (!usarCache) return Promise.reject(err);
      return cacheLeer(k).then(function (c) {
        if (c) return c.v;
        if (ARGS_LIBRES.indexOf(fn) >= 0) return cacheUltimoDe(fn).then(function (u) { if (u) return u.v; throw sinSenal(fn); });
        throw sinSenal(fn);
      }).then(function (v) { marcarSinSenal(true); return v; });
    };
    if (!navigator.onLine) return desdeCache(sinSenal(fn));
    return conLimite(SESION_APP.llamar(fn, args), ESPERA_LECTURA_MS).then(function (v) {
      if (usarCache) cacheGuardar(k, v);
      marcarSinSenal(false);
      return v;
    }, function (e) { if (esErrorDeRed(e)) return desdeCache(e); throw e; });
  }

  function escribir(fn, args) {
    var enCola = CFG.colaEscritura && OPTIMISTA[fn];
    if (!navigator.onLine) return enCola ? encolar(fn, args) : Promise.reject(sinSenalEscritura());
    return SESION_APP.llamar(fn, args).then(function (v) { marcarSinSenal(false); return v; }, function (e) {
      if (enCola && esErrorDeRed(e)) return encolar(fn, args);     // no llegó al servidor: queda en la bandeja
      if (esErrorDeRed(e)) throw sinSenalEscritura();
      throw e;
    });
  }
  function sinSenalEscritura() { var e = new Error('Sin conexión'); e.red = true; return e; }

  function llamar(fn, args) {
    return (TIPO[fn] === 'W' || /^(admin\w*Guardar|admin\w*Eliminar|adminEquipoActivo|datosGuardar|datosEliminar|datosAgregar|sesionCambiarPin)$/.test(fn))
      ? escribir(fn, args) : leer(fn, args);
  }

  /* ------------------------------------------------------------ bandeja (Mapeo) */
  var seq = 0;
  function tmpId(pre) { return 'TMP-' + pre + '-' + Date.now().toString(36) + (seq++); }

  function encolar(fn, args) {
    var res = OPTIMISTA[fn](args);
    return Promise.resolve(res.parche).then(function () {
      return colaPoner({ fn: fn, args: args, tmp: res.tmp || '', t: Date.now(), modulo: CFG.modulo || '', estado: 'pendiente' });
    }).then(function () {
      pintarNav();
      aviso('📥 Guardado en el teléfono. Se enviará solo al volver la señal.');
      return res.valor;
    });
  }

  /** Copia guardada de una ficha de Mapeo, para mostrar al tiro lo registrado sin señal. */
  function parcheCinta(idCinta, cambio) {
    var k = clave('apiGetCinta', [idCinta]);
    return cacheLeer(k).then(function (c) {
      if (!c || !c.v) return;
      cambio(c.v);
      return cacheGuardar(k, c.v);
    });
  }
  function buscarCintaDe(campo, valor) {   // en qué ficha guardada está un hallazgo / tramo
    return tx('cache', 'readonly', function (s) { return s.getAll(IDBKeyRange.bound('apiGetCinta|', 'apiGetCinta|￿')); }).then(function (l) {
      var c = (l || []).map(function (x) { return x.v; }).filter(function (v) {
        return v && ((v.hallazgos || []).some(function (h) { return h[campo] === valor; }) || (v.tramos || []).some(function (t) { return t[campo] === valor; }));
      })[0];
      return c ? c.cinta.ID_CINTA : '';
    });
  }

  var OPTIMISTA = {
    apiSaveHallazgo: function (a) {
      var h = a[0] || {}, id = h.ID_HALLAZGO || tmpId('H');
      return { tmp: h.ID_HALLAZGO ? '' : id, valor: id, parche: parcheCinta(h.ID_CINTA, function (d) {
        d.hallazgos = d.hallazgos || [];
        var ex = d.hallazgos.filter(function (x) { return x.ID_HALLAZGO === id; })[0];
        var nId = h.N_ID || d.hallazgos.reduce(function (m, x) { return Math.max(m, +x.N_ID || 0); }, 0) + 1;
        var nuevo = Object.assign({}, ex || { nFotos: 0 }, h, { ID_HALLAZGO: id, N_ID: nId, CRITICIDAD: String(h.CRITICIDAD || (ex && ex.CRITICIDAD) || 'LEVE').toUpperCase(), ESTADO: h.ESTADO || (ex && ex.ESTADO) || 'ABIERTO', _pendiente: true });
        if (ex) d.hallazgos[d.hallazgos.indexOf(ex)] = nuevo; else d.hallazgos.push(nuevo);
      }) };
    },
    apiUploadFoto: function (a) {
      var idH = a[0];
      return { valor: true, parche: buscarCintaDe('ID_HALLAZGO', idH).then(function (idC) {
        if (idC) return parcheCinta(idC, function (d) { (d.hallazgos || []).forEach(function (h) { if (h.ID_HALLAZGO === idH) h.nFotos = (+h.nFotos || 0) + 1; }); });
      }) };
    },
    apiDeleteHallazgo: function (a) {
      var idH = a[0];
      return { valor: true, parche: buscarCintaDe('ID_HALLAZGO', idH).then(function (idC) {
        if (idC) return parcheCinta(idC, function (d) { d.hallazgos = (d.hallazgos || []).filter(function (h) { return h.ID_HALLAZGO !== idH; }); });
      }) };
    },
    apiSaveTramo: function (a) {
      var t = a[0] || {}, id = t.ID_TRAMO || tmpId('T');
      return { tmp: t.ID_TRAMO ? '' : id, valor: id, parche: parcheCinta(t.ID_CINTA, function (d) {
        d.tramos = d.tramos || [];
        var ex = d.tramos.filter(function (x) { return x.ID_TRAMO === id; })[0];
        var nuevo = Object.assign({}, ex || { ESTADO: 'ACTIVO' }, t, { ID_TRAMO: id, _pendiente: true });
        if (ex) d.tramos[d.tramos.indexOf(ex)] = nuevo; else d.tramos.push(nuevo);
      }) };
    },
    apiDeleteTramo: function (a) {
      var idT = a[0];
      return { valor: true, parche: buscarCintaDe('ID_TRAMO', idT).then(function (idC) {
        if (idC) return parcheCinta(idC, function (d) { d.tramos = (d.tramos || []).filter(function (t) { return t.ID_TRAMO !== idT; }); });
      }) };
    },
    apiCambioTramo: function () { return { valor: { cerrados: 0, pendiente: true } }; },
    apiSaveCinta: function (a) {
      var o = a[0] || {};
      return { valor: o.ID_CINTA || String(o.CODIGO || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), parche: o.ID_CINTA ? parcheCinta(o.ID_CINTA, function (d) { Object.assign(d.cinta, o); }) : null };
    },
    apiUploadImagenCinta: function (a) { return { valor: true, parche: parcheCinta(a[0], function (d) { d.imagen = a[1]; }) }; },
    apiUpdateFoto: function () { return { valor: true }; },
    apiDeleteFoto: function () { return { valor: true }; }
  };

  function reemplazarIds(x, mapa) {
    if (typeof x === 'string') return mapa[x] || x;
    if (Array.isArray(x)) return x.map(function (y) { return reemplazarIds(y, mapa); });
    if (x && typeof x === 'object') { var o = {}; Object.keys(x).forEach(function (k) { o[k] = reemplazarIds(x[k], mapa); }); return o; }
    return x;
  }

  var sincronizando = false;
  function sincronizar(manual) {
    if (sincronizando || !navigator.onLine || !SESION_APP.token()) return Promise.resolve();
    sincronizando = true;
    var mapa = {}, enviados = 0, conError = 0;
    return colaTodos().then(function (lista) {
      lista = lista.filter(function (i) { return i.estado !== 'error' || manual; }).sort(function (a, b) { return a.id - b.id; });
      var p = Promise.resolve();
      lista.forEach(function (item) {
        p = p.then(function () {
          var args = reemplazarIds(item.args, mapa);
          return SESION_APP.llamar(item.fn, args).then(function (v) {
            if (item.tmp && typeof v === 'string') mapa[item.tmp] = v;
            enviados++;
            return colaQuitar(item.id);
          }, function (e) {
            if (esErrorDeRed(e) || e.sinSesion) throw e;        // se corta: se reintenta después
            conError++;
            item.estado = 'error'; item.error = e.message; item.args = args;
            return colaPoner(item);
          });
        });
      });
      return p;
    }).catch(function (e) { if (e && e.sinSesion) SESION_APP.irAlLogin(location.pathname.split('/').pop()); }).then(function () {
      sincronizando = false;
      pintarNav();
      if (enviados || conError) {
        aviso((enviados ? '✅ ' + enviados + ' cambio(s) enviados al servidor.' : '') + (conError ? ' ⚠ ' + conError + ' con error: revíselos en el botón ☰.' : ''), !!conError);
        if (enviados && typeof window.PUENTE_DESPUES_SYNC === 'function') window.PUENTE_DESPUES_SYNC();
      }
    });
  }

  /* ------------------------------------------------------------ google.script.* */
  function runner(ok, mal, usuario) {
    return new Proxy({}, {
      get: function (_, nombre) {
        if (nombre === 'withSuccessHandler') return function (f) { return runner(f, mal, usuario); };
        if (nombre === 'withFailureHandler') return function (f) { return runner(ok, f, usuario); };
        if (nombre === 'withUserObject') return function (u) { return runner(ok, mal, u); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          llamar(String(nombre), args).then(function (r) { if (ok) ok(r, usuario); }, function (e) {
            if (e && e.sinSesion) { SESION_APP.irAlLogin(location.pathname.split('/').pop() + location.search); return; }
            if (mal) mal(e, usuario); else console.error(e);
          });
        };
      }
    });
  }
  var params = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); params[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
  window.google = {
    script: {
      run: runner(null, null),
      url: { getLocation: function (cb) { var ps = {}; Object.keys(params).forEach(function (k) { ps[k] = [params[k]]; }); setTimeout(function () { cb({ parameter: params, parameters: ps, hash: location.hash.replace(/^#/, '') }); }, 0); } },
      host: { close: function () { }, setHeight: function () { }, setWidth: function () { }, editor: {} },
      history: { push: function () { }, replace: function () { }, setChangeHandler: function () { } }
    }
  };

  var PAGINAS = { inicio: 'index.html', mapeo: 'mapeo.html', espesores: 'espesores.html', semanal: 'semanal.html', pauta: 'pauta.html', flash: 'flash.html', checklist: 'checklist.html', admin: 'admin.html' };
  window.CINTAS = {
    url: 'index.html', modulo: CFG.modulo || '', app: CFG.app || '', paginas: PAGINAS,
    token: SESION_APP.token, area: SESION_APP.area,
    guardarSesion: function () { }, cerrarSesion: function () { SESION_APP.cerrar(); },
    elegirArea: SESION_APP.elegirArea,
    ir: function (app, tab) { location.href = (PAGINAS[app] || 'index.html') + (tab ? '?tab=' + encodeURIComponent(tab) : ''); }
  };
  if (!SESION_APP.token() && !CFG.sinLogin) SESION_APP.irAlLogin(location.pathname.split('/').pop() + location.search);

  /* ------------------------------------------------------------ botón ☰ y avisos */
  var perfil = null, sinSenalAhora = !navigator.onLine;
  function marcarSinSenal(v) { if (v !== sinSenalAhora) { sinSenalAhora = v; pintarNav(); } }
  var NOMBRE_ROL = { ADMIN: 'Administrador', EDITOR: 'Usuario', LECTOR: 'Visualizador', NINGUNO: 'Sin acceso' };

  function aviso(txt, err) {
    var t = document.createElement('div');
    t.textContent = txt;
    t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:96px;z-index:2147483002;max-width:92vw;padding:10px 14px;border-radius:8px;font:14px "Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);color:#fff;background:' + (err ? '#C00000' : '#1f2937');
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, err ? 7000 : 3500);
  }

  function estilos() {
    if (document.getElementById('icNavCss')) return;
    var st = document.createElement('style'); st.id = 'icNavCss';
    st.textContent = '#icNav{position:fixed;left:10px;bottom:10px;z-index:2147483000;font:13px/1.35 "Segoe UI",Roboto,Calibri,Arial,sans-serif}' +
      '#icNav>button{position:relative;width:40px;height:40px;opacity:.9;border-radius:50%;border:2px solid #fff;background:#0b2545;color:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35)}' +
      '#icNav>button i{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#FFC000;color:#000;font:700 11px/20px Arial;font-style:normal;padding:0 4px}' +
      '#icNav>button.off{background:#7a5a00}' +
      '#icNav .p{display:none;position:absolute;left:0;bottom:48px;background:#fff;color:#1d2330;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.28);padding:12px;min-width:260px;max-width:88vw}' +
      '#icNav.on .p{display:block}#icNav .p b{color:#0b2545}#icNav .p small{color:#5f6b7a}' +
      '#icNav .p a,#icNav .p .bt{display:block;margin-top:8px;padding:9px 10px;background:#2F5597;color:#fff;border-radius:7px;text-decoration:none;text-align:center;font-weight:700;border:0;width:100%;font:inherit;font-weight:700;cursor:pointer}' +
      '#icNav .p .sec{background:#fff;color:#2F5597;border:1px solid #2F5597}' +
      '#icNav .err{font-size:12px;color:#C00000;margin-top:6px;border-top:1px solid #eee;padding-top:6px}' +
      '#icLect{position:fixed;left:50%;transform:translateX(-50%);top:0;z-index:2147483000;background:#FFF4CE;border:1px solid #FFC000;border-top:0;border-radius:0 0 6px 6px;padding:3px 12px;font:12px "Segoe UI",Arial,sans-serif;color:#7a5a00}';
    document.head.appendChild(st);
  }

  /** Envía al marco común (marco.js: menú lateral en escritorio, barra inferior en celular) el estado de la sesión. */
  var rolGeneral = '', permisos = null, areaNombre = '';
  function pintarNav() {
    if (!document.body || !window.MARCO) return;
    colaTodos().then(function (cola) {
      var pend = CFG.modulo && CFG.modulo !== 'GENERAL' ? cola.filter(function (i) { return i.modulo === CFG.modulo; }) : cola;
      MARCO.pintar({
        nombre: SESION_APP.nombre() || SESION_APP.email(), email: SESION_APP.email(),
        rol: (perfil && perfil.rol) || rolGeneral, modulos: permisos, area: areaNombre,
        sinSenal: sinSenalAhora, pendientes: pend.length, puedeEnviar: !!CFG.colaEscritura,
        errores: pend.filter(function (i) { return i.estado === 'error'; }),
        enviar: function () { sincronizar(true); },
        descartar: function (id) { colaQuitar(id).then(pintarNav); }
      });
    });
  }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function alCargar() {
    pintarNav();
    if (SESION_APP.token()) leer('inicioDatos', []).then(function (d) {
      if (!d) return;
      rolGeneral = (d.sesion && d.sesion.rol) || '';
      permisos = {}; (d.modulos || []).forEach(function (m) { permisos[m.id] = m.rol; });
      areaNombre = ((d.areas || []).filter(function (x) { return x.area === d.area; })[0] || {}).nombre || d.area || '';
      pintarNav();
    }).catch(function () { });
    if (CFG.modulo && CFG.modulo !== 'GENERAL') {
      leer('sesionEstado', [CFG.modulo]).then(function (s) {
        perfil = s; pintarNav();
        if (CFG.avisoPerfil !== false && s && (s.rol === 'LECTOR' || s.rol === 'NINGUNO') && !document.getElementById('icLect')) {
          estilos();
          var b = document.createElement('div'); b.id = 'icLect';
          b.textContent = s.rol === 'NINGUNO' ? 'Sin acceso a esta app' : 'Visualizador: puede ver y descargar, no guardar';
          document.body.appendChild(b);
        }
      }).catch(function () { });
    }
    sincronizar(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alCargar); else alCargar();
  window.addEventListener('online', function () { marcarSinSenal(false); setTimeout(function () { sincronizar(false); }, 1500); });
  window.addEventListener('offline', function () { marcarSinSenal(true); });
  setInterval(function () { sincronizar(false); }, 60000);

  /** Descarga y guarda en el teléfono los datos de trabajo (para usar las apps sin señal). */
  function precargar(tareas, alAvanzar) {
    var i = 0, hechas = 0, fallidas = 0, total = tareas.length;
    function siguiente() {
      if (i >= total) return Promise.resolve();
      var t = tareas[i++];
      return conLimite(SESION_APP.llamar(t[0], t[1]), 60000).then(function (v) {
        hechas++;
        if (t[2]) t[2](v);                                   // permite encadenar (ej: fichas de cada cinta)
        if ((CFG.sinCache || []).indexOf(t[0]) < 0) return cacheGuardar(clave(t[0], t[1]), v);
      }, function () { fallidas++; }).then(function () { total = tareas.length; if (alAvanzar) alAvanzar(hechas + fallidas, total); return siguiente(); });
    }
    return Promise.all([siguiente(), siguiente(), siguiente()]).then(function () { return { hechas: hechas, fallidas: fallidas }; });
  }

  window.PUENTE_API = { sincronizar: sincronizar, cola: colaTodos, llamar: llamar, precargar: precargar };
})();
