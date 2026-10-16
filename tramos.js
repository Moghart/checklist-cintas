/**
 * Formulario único "Cambio de cinta o tramo" · Inspección Cintas
 * Se abre desde Mapeo, Medición de Espesores y el Catálogo de equipos. Registra de una vez en Mapeo,
 * Espesores y el catálogo (servidor: tramoCambio). Sin señal queda en la bandeja del teléfono.
 *   TRAMO_FORM.abrir({ equipo: '105CV01', tramo: 4, tipo: 'REEMPLAZO'|'NUEVO'|'UNIR', alGuardar: fn(resultado) })
 */
(function () {
  var S = null;   // estado del formulario abierto

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function num(v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && String(v).trim() !== '' ? n : null; }
  function fmt(n) { return n == null ? '' : (Math.round(n * 10) / 10).toLocaleString('es-CL'); }
  function run(fn, args) {
    return new Promise(function (ok, mal) {
      var r = google.script.run.withSuccessHandler(ok).withFailureHandler(function (e) { mal(e instanceof Error ? e : new Error(String(e && e.message || e))); });
      r[fn].apply(r, args || []);
    });
  }

  function css() {
    if (document.getElementById('tfCss')) return;
    var st = document.createElement('style'); st.id = 'tfCss';
    st.textContent =
      '#tfBg{position:fixed;inset:0;z-index:2147482998;background:rgba(11,37,69,.5);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 12px;box-sizing:border-box;font:14px/1.4 "Segoe UI",Roboto,system-ui,Arial,sans-serif;color:#14213D}' +
      '#tfBg *{box-sizing:border-box;font-family:inherit}' +
      '#tfBox{background:#fff;border-radius:14px;width:min(720px,100%);box-shadow:0 18px 50px rgba(0,0,0,.3);overflow:hidden}' +
      '#tfBox header{background:#0B2545;color:#fff;padding:14px 18px;display:flex;align-items:center;gap:10px}' +
      '#tfBox header h3{margin:0;font-size:17px;flex:1;font-weight:700;color:#fff}#tfBox header small{display:block;font-weight:400;color:#9FB3D1;font-size:12px}' +
      '#tfBox header button{background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer;min-width:44px;min-height:44px}' +
      '#tfBox .cu{padding:16px 18px;display:flex;flex-direction:column;gap:16px}' +
      '#tfBox h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5A6478;font-weight:700}' +
      '#tfBox .tipos{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px}#tfBox .tipos button[data-t=CINTA]{border-color:#B7C7DE}' +
      '#tfBox .partes{display:flex;flex-direction:column;gap:8px}#tfBox .parte{display:grid;grid-template-columns:90px minmax(0,1fr) minmax(0,1.6fr);gap:8px;align-items:center;border:1px solid #DDE2EA;border-radius:10px;padding:8px 10px}' +
      '#tfBox .parte b{font-size:14px}#tfBox .parte small{display:block;color:#5A6478;font-size:11.5px}#tfBox .seg2{display:grid;grid-template-columns:1fr 1fr;gap:4px}' +
      '#tfBox .seg2 button,#tfBox .nP button{min-height:42px;border:1.5px solid #C9D1DC;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;font-weight:600;color:#14213D}' +
      '#tfBox .seg2 button.on,#tfBox .nP button.on{background:#1F4E8C;border-color:#1F4E8C;color:#fff}#tfBox .nP{display:flex;gap:6px;margin:8px 0}#tfBox .nP button{min-width:52px}' +
      '#tfBox .tipos button{border:1.5px solid #C9D1DC;background:#fff;border-radius:10px;padding:10px 8px;min-height:64px;cursor:pointer;text-align:left;color:#14213D}' +
      '#tfBox .tipos button b{display:block;font-size:14px}#tfBox .tipos button span{display:block;font-size:12px;color:#5A6478;margin-top:2px}' +
      '#tfBox .tipos button.on{border-color:#1F4E8C;background:#EAF1FB;box-shadow:inset 0 0 0 1px #1F4E8C}' +
      '#tfBox .chips{display:flex;flex-wrap:wrap;gap:6px}' +
      '#tfBox .chips button{min-width:56px;min-height:48px;border:1.5px solid #C9D1DC;border-radius:10px;background:#fff;cursor:pointer;padding:4px 8px;color:#14213D}' +
      '#tfBox .chips button b{display:block;font-size:15px}#tfBox .chips button small{display:block;font-size:11px;color:#5A6478}' +
      '#tfBox .chips button.on{background:#1F4E8C;border-color:#1F4E8C;color:#fff}#tfBox .chips button.on small{color:#DCE5F2}' +
      '#tfBox .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 12px}' +
      '#tfBox .grid .c2{grid-column:span 2}#tfBox .grid .c3{grid-column:1/-1}' +
      '#tfBox label{display:block;font-size:12px;font-weight:600;color:#5A6478;margin-bottom:4px}' +
      '#tfBox input,#tfBox select{width:100%;min-height:44px;border:1px solid #C9D1DC;border-radius:8px;padding:0 10px;font-size:15px;background:#fff;color:#14213D}' +
      '#tfBox input:focus,#tfBox select:focus{outline:2px solid #1F4E8C;outline-offset:-1px}' +
      '#tfBox .nota{font-size:12.5px;color:#5A6478}' +
      '#tfBox .res{background:#F2F4F7;border:1px solid #DDE2EA;border-radius:10px;padding:12px 14px;font-size:14px}' +
      '#tfBox .res li{margin:2px 0}#tfBox .res ul{margin:6px 0 0;padding-left:18px}' +
      '#tfBox .err{color:#A31F1F;font-weight:600;min-height:1em}' +
      '#tfBox .chk{display:flex;gap:10px;align-items:center;font-size:14px;color:#14213D;font-weight:400}#tfBox .chk input{width:22px;min-height:22px;height:22px}' +
      '#tfBox footer{display:flex;gap:10px;justify-content:flex-end;padding:12px 18px;border-top:1px solid #EEF1F5;flex-wrap:wrap}' +
      '#tfBox footer button{min-height:46px;padding:0 18px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;border:1px solid #C9D1DC;background:#fff;color:#14213D}' +
      '#tfBox footer button.pri{background:#1F4E8C;border-color:#1F4E8C;color:#fff}#tfBox footer button:disabled{opacity:.55;cursor:default}' +
      '@media(max-width:600px){#tfBg{padding:0;align-items:flex-start}#tfBox{border-radius:16px 16px 0 0;margin-top:auto}#tfBox .tipos{grid-template-columns:1fr 1fr}#tfBox .parte{grid-template-columns:1fr 1fr}#tfBox .parte>div:first-child{grid-column:1/-1}#tfBox .grid{grid-template-columns:repeat(2,minmax(0,1fr))}#tfBox .grid .c2{grid-column:1/-1}}';
    document.head.appendChild(st);
  }

  /** Datos de la cinta que se sugieren: los de Espesores del tramo que sale (o vecino) y si no, los del catálogo. */
  function sugerida() {
    var I = S.info, esp = I.esp || {}, base = null;
    var cand = S.tipo === 'NUEVO' ? [S.despuesDe, S.despuesDe + 1] : S.sel.slice();
    cand.concat(Object.keys(esp).map(Number)).some(function (n) { if (esp[n]) { base = esp[n]; return true; } return false; });
    var f = I.ficha || {}, b = base || {};
    return {
      espec: b.espec || f.espec || '', cables: b.cables != null && b.cables !== '' ? b.cables : (f.cables || ''), espCarga: b.espCarga || f.espCarga || '',
      espRet: b.espRet || f.espRet || '', espTotal: b.espTotal || f.espTotal || '', ancho: b.ancho || f.ancho || '', grado: b.grado || f.grado || '',
      fabricante: b.fabricante || f.fabricante || '', vidaUtil: b.vidaUtil || '', segCarga: b.segCarga || '', segRet: b.segRet || ''
    };
  }

  function resumen() {
    var I = S.info, total = Math.max(I.total || 0, 1), r = [], nuevoN, delta = 0, desde;
    if (S.tipo === 'CINTA') {
      var nN = S.partes.length;
      r.push('Sale <b>toda la cinta</b> (' + total + ' tramo' + (total === 1 ? '' : 's') + ') y entra la <b>cinta nueva con ' + nN + ' tramo' + (nN === 1 ? '' : 's') + '</b>' +
        (S.partes.some(function (x) { return num(x.metros); }) ? ': ' + S.partes.map(function (x, j) { return (j + 1) + ' = ' + (num(x.metros) ? fmt(num(x.metros)) + ' m' : '¿m?'); }).join(' · ') : ''));
      r.push(S.cerrar ? 'Se cierran <b>todos los hallazgos abiertos</b> de la cinta' + (I.hallAbiertos ? ' (' + I.hallAbiertos + ')' : '') + '; quedan en el historial' : 'Los hallazgos quedan abiertos');
      r.push('La ficha de Mapeo queda con la fecha del cambio y los datos de la cinta nueva (marca, tipo, espesores)');
      r.push(datosCompletos() ? 'Medición de espesores: la cinta anterior queda no vigente y la nueva parte con su medición inicial' : 'Medición de espesores: complete espesores, ancho, vida útil y espesores de seguridad para que la cinta nueva aparezca allí');
      return '<b>Al guardar:</b><ul>' + r.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    }
    if (S.tipo === 'NUEVO') { nuevoN = S.despuesDe + 1; delta = 1; desde = S.despuesDe; r.push('Entra un <b>tramo nuevo N° ' + nuevoN + '</b>' + (num(S.metros) ? ' de ' + fmt(num(S.metros)) + ' m' : '')); }
    else if (S.tipo === 'DIVIDIR') {
      if (!S.sel.length) return '<span class="nota">Elija el tramo que se divide.</span>';
      var k = S.sel[0]; delta = S.partes.length - 1; desde = k;
      r.push('El tramo <b>' + k + '</b> pasa a ser <b>' + S.partes.length + ' tramos (' + S.partes.map(function (x, j) { return k + j; }).join(', ') + ')</b>: ' +
        S.partes.map(function (x, j) { return (k + j) + ' = ' + (num(x.metros) ? fmt(num(x.metros)) + ' m ' : '') + (x.nueva ? 'cinta nueva' : 'cinta que había'); }).join(' · '));
    }
    else {
      if (!S.sel.length) return '<span class="nota">Elija ' + (S.tipo === 'UNIR' ? 'los tramos que se unen' : 'el tramo que sale') + '.</span>';
      nuevoN = S.sel[0]; delta = -(S.sel.length - 1); desde = S.sel[S.sel.length - 1];
      r.push(S.tipo === 'UNIR' ? 'Salen los tramos <b>' + S.sel.join(' y ') + '</b> y entra <b>uno solo, N° ' + nuevoN + '</b>' + (num(S.metros) ? ' de ' + fmt(num(S.metros)) + ' m' : '')
        : 'Sale el tramo <b>' + nuevoN + '</b> y entra el nuevo con el mismo número' + (num(S.metros) ? ' (' + fmt(num(S.metros)) + ' m)' : ''));
    }
    var tot = total + (S.tipo === 'NUEVO' ? 1 : delta);
    if (delta && desde < total) {
      var a = desde + 1, b = total;
      r.push('Los tramos ' + (a === b ? a : a + ' a ' + b) + ' pasan a ser ' + (a === b ? a + delta : (a + delta) + ' a ' + (b + delta)) + ' (se renumeran solos, también sus hallazgos)');
    }
    if (S.tipo === 'DIVIDIR') r.push('Cada hallazgo del tramo pasa a la parte donde está (según sus metros)' + (S.cerrar ? '; los que quedan en cinta nueva se cierran' : ''));
    else if (S.tipo !== 'NUEVO') r.push(S.cerrar ? 'Los hallazgos de lo que sale se cierran (quedan en el historial)' : 'Los hallazgos de lo que sale quedan abiertos');
    r.push('La cinta queda con <b>' + tot + ' tramo' + (tot === 1 ? '' : 's') + '</b>');
    if (hayNueva()) r.push(datosCompletos() ? 'Medición de espesores: la cinta nueva parte con su medición inicial' : 'Medición de espesores: complete espesores, ancho, vida útil y espesores de seguridad para que el tramo aparezca allí');
    if (S.tipo === 'DIVIDIR' && S.partes.some(function (x) { return !x.nueva; })) r.push('Medición de espesores: las partes con la cinta que había conservan su historial');
    return '<b>Al guardar:</b><ul>' + r.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }

  function hayNueva() { return S.tipo !== 'DIVIDIR' || S.partes.some(function (x) { return x.nueva; }); }
  function partesCinta(n) {
    var tr = {}; (S.info.tramos || []).forEach(function (t) { tr[t.n] = t; });
    var r = []; for (var j = 1; j <= n; j++) r.push({ metros: S.partes && S.partes[j - 1] && S.tipo === 'CINTA' ? S.partes[j - 1].metros : (tr[j] && tr[j].metros ? String(tr[j].metros) : ''), nueva: true });
    return r;
  }
  function todos() { var r = [], t = Math.max(S.info.total || 0, 1); for (var i = 1; i <= t; i++) r.push(i); return r; }
  function partesPorDefecto(n) { return [[0, 1], [0, 1, 0], [0, 1, 1, 0], [0, 1, 1, 1, 0]][n - 2].map(function (v) { return { metros: '', nueva: !!v }; }); }

  function datosCompletos() {
    var c = S.cinta;
    return ['espCarga', 'espRet', 'segCarga', 'segRet', 'ancho', 'vidaUtil'].every(function (k) { return num(c[k]) !== null && num(c[k]) >= 0; });
  }

  function pintar() {
    var I = S.info, total = Math.max(I.total || 0, 1), trM = {};
    (I.tramos || []).forEach(function (t) { trM[t.n] = t; });
    var chips = '';
    if (S.tipo === 'CINTA') {
      chips = '<div class="nota">Sale la cinta completa: ' + total + ' tramo' + (total === 1 ? '' : 's') + (I.hallAbiertos ? ' y ' + I.hallAbiertos + ' hallazgo(s) abiertos' : '') + '.</div>' +
        '<h4 style="margin-top:14px">¿Cuántos tramos tiene la cinta nueva?</h4><div class="nP"><input id="tfNT" type="number" min="1" max="40" inputmode="numeric" style="max-width:110px" value="' + S.partes.length + '"></div>' +
        '<div class="partes">' + S.partes.map(function (x, j) {
          return '<div class="parte" style="grid-template-columns:90px minmax(0,1fr)"><div><b>Tramo ' + (j + 1) + '</b></div>' +
            '<div><input data-pm="' + j + '" inputmode="decimal" value="' + esc(x.metros) + '" placeholder="metros" aria-label="Metros del tramo ' + (j + 1) + '"></div></div>';
        }).join('') + '</div>';
    } else if (S.tipo === 'NUEVO') {
      var ops = '<option value="0"' + (S.despuesDe === 0 ? ' selected' : '') + '>Al inicio (será el tramo 1)</option>';
      for (var p = 1; p <= total; p++) ops += '<option value="' + p + '"' + (S.despuesDe === p ? ' selected' : '') + '>' + (p === total ? 'Al final, después del tramo ' + p : 'Después del tramo ' + p) + ' (será el ' + (p + 1) + ')</option>';
      chips = '<label for="tfPos">¿Dónde queda el tramo nuevo?</label><select id="tfPos">' + ops + '</select>';
    } else {
      for (var n = 1; n <= total; n++) {
        var t = trM[n], esp = (I.esp || {})[n];
        chips += '<button type="button" data-n="' + n + '" class="' + (S.sel.indexOf(n) >= 0 ? 'on' : '') + '" aria-pressed="' + (S.sel.indexOf(n) >= 0) + '"><b>' + n + '</b><small>' +
          (t && t.metros ? fmt(t.metros) + ' m' : (esp ? 'espesores' : '&nbsp;')) + '</small></button>';
      }
      chips = '<div class="chips">' + chips + '</div><div class="nota" style="margin-top:6px">' +
        (S.tipo === 'UNIR' ? 'Toque los tramos seguidos que quedan como uno solo (por ejemplo 4 y 5).' : S.tipo === 'DIVIDIR' ? 'Toque el tramo que se divide.' : 'Toque el tramo que se cambia.') + '</div>';
      if (S.tipo === 'DIVIDIR' && S.sel.length) {
        var k0 = S.sel[0], mOrig = trM[k0] && trM[k0].metros, suma = S.partes.reduce(function (a, x) { return a + (num(x.metros) || 0); }, 0);
        chips += '<h4 style="margin-top:14px">¿En cuántas partes?</h4><div class="nP">' + [2, 3, 4, 5].map(function (n) {
            return '<button type="button" data-np="' + n + '" class="' + (S.partes.length === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div>' +
          '<div class="partes">' + S.partes.map(function (x, j) {
            return '<div class="parte"><div><b>Tramo ' + (k0 + j) + '</b><small>parte ' + (j + 1) + '</small></div>' +
              '<div><input data-pm="' + j + '" inputmode="decimal" value="' + esc(x.metros) + '" placeholder="metros" aria-label="Metros de la parte ' + (j + 1) + '"></div>' +
              '<div class="seg2"><button type="button" data-pn="' + j + ':0" class="' + (x.nueva ? '' : 'on') + '">Cinta que había</button><button type="button" data-pn="' + j + ':1" class="' + (x.nueva ? 'on' : '') + '">Cinta nueva</button></div></div>';
          }).join('') + '</div><div class="nota" style="margin-top:6px">Suma: ' + fmt(suma) + ' m' + (mOrig ? ' · el tramo ' + k0 + ' medía ' + fmt(mOrig) + ' m' : '') +
          '. Las partes van en el orden de la cinta (la parte 1 junto al empalme ' + k0 + ').</div>';
      }
    }
    var c = S.cinta, cam = function (k, et, cls, tipo) {
      return '<div class="' + (cls || '') + '"><label for="tf_' + k + '">' + et + '</label><input id="tf_' + k + '" data-c="' + k + '" value="' + esc(c[k]) + '"' + (tipo === 'n' ? ' inputmode="decimal"' : '') + '></div>';
    };
    var sum = 0; S.sel.forEach(function (n) { if (trM[n] && trM[n].metros) sum += trM[n].metros; });
    document.getElementById('tfCu').innerHTML =
      '<div><h4>¿Qué pasó?</h4><div class="tipos">' +
        [['CINTA', 'Cambio de cinta completa', 'Sale toda la cinta'], ['REEMPLAZO', 'Reemplazo de un tramo', 'Sale uno y entra otro'], ['NUEVO', 'Tramo nuevo', 'Se agrega un tramo'], ['UNIR', 'Unir tramos', 'Varios quedan como uno'], ['DIVIDIR', 'Dividir un tramo', 'Uno queda en varios']].map(function (x) {
          return '<button type="button" data-t="' + x[0] + '" class="' + (S.tipo === x[0] ? 'on' : '') + '" aria-pressed="' + (S.tipo === x[0]) + '"><b>' + x[1] + '</b><span>' + x[2] + '</span></button>';
        }).join('') + '</div></div>' +
      '<div><h4>' + (S.tipo === 'CINTA' ? 'Cinta que sale' : S.tipo === 'NUEVO' ? 'Ubicación' : S.tipo === 'UNIR' ? 'Tramos que se unen' : S.tipo === 'DIVIDIR' ? 'Tramo que se divide' : 'Tramo que sale') + '</h4>' + chips + '</div>' +
      '<div><h4>' + (S.tipo === 'DIVIDIR' || S.tipo === 'CINTA' ? 'Datos del cambio' : 'Tramo nuevo') + '</h4><div class="grid">' +
        '<div><label for="tfFecha">Fecha del cambio</label><input id="tfFecha" type="date" value="' + esc(S.fecha) + '"></div>' +
        (S.tipo === 'DIVIDIR' || S.tipo === 'CINTA' ? '' : '<div><label for="tfMetros">Metros del tramo nuevo</label><input id="tfMetros" inputmode="decimal" value="' + esc(S.metros) + '" placeholder="' + (sum ? 'antes: ' + fmt(sum) + ' m' : 'm') + '"></div>') +
        '<div><label for="tfObs">Observación</label><input id="tfObs" value="' + esc(S.obs) + '" placeholder="OT, motivo…"></div>' +
      '</div></div>' +
      (hayNueva() ? '<div><h4>' + (S.tipo === 'DIVIDIR' ? 'Cinta nueva (partes con cinta nueva)' : 'Cinta instalada') + '</h4><div class="grid">' +
        cam('espec', 'Especificación', 'c2') + cam('cables', 'Cables / telas', '', 'n') +
        cam('espCarga', 'Espesor carga (mm)', '', 'n') + cam('espRet', 'Espesor retorno (mm)', '', 'n') + cam('espTotal', 'Espesor total (mm)', '', 'n') +
        cam('ancho', 'Ancho (mm)', '', 'n') + cam('grado', 'Grado cubierta') + cam('fabricante', 'Marca / fabricante') +
        cam('vidaUtil', 'Vida útil (días)', '', 'n') + cam('segCarga', 'Esp. seguridad carga (mm)', '', 'n') + cam('segRet', 'Esp. seguridad retorno (mm)', '', 'n') +
      '</div><div class="nota" style="margin-top:6px">Vienen rellenos con la cinta anterior o el catálogo: corrija solo lo que cambió.</div></div>' : '') +
      (S.tipo !== 'NUEVO' ? '<label class="chk"><input type="checkbox" id="tfCerrar"' + (S.cerrar ? ' checked' : '') + '> Cerrar ' + (S.tipo === 'CINTA' ? 'todos los hallazgos abiertos de la cinta' : 'los hallazgos ') +
        (S.tipo === 'CINTA' ? '' : S.tipo === 'UNIR' ? 'de los tramos que salen' : S.tipo === 'DIVIDIR' ? 'que quedan en partes con cinta nueva' : 'del tramo que sale') + '</label>' : '') +
      '<div class="res" id="tfRes">' + resumen() + '</div><div class="err" id="tfErr"></div>';
    enlazar();
  }

  function enlazar() {
    var R = document.getElementById('tfCu');
    Array.prototype.forEach.call(R.querySelectorAll('[data-t]'), function (b) {
      b.onclick = function () {
        var antes = S.tipo; S.tipo = b.getAttribute('data-t');
        if (S.tipo === 'CINTA') { S.sel = todos(); if (antes !== 'CINTA') { S.tipo = antes; var pz = partesCinta(Math.max(S.info.total || 0, 1)); S.tipo = 'CINTA'; S.partes = pz; } }
        else if (antes === 'CINTA') { S.sel = []; S.partes = partesPorDefecto(2); }
        if (S.tipo === 'REEMPLAZO' || S.tipo === 'DIVIDIR') S.sel = S.sel.slice(0, 1);
        S.cinta = sugerida(); pintar();
      };
    });
    Array.prototype.forEach.call(R.querySelectorAll('[data-n]'), function (b) {
      b.onclick = function () {
        var n = +b.getAttribute('data-n'), i = S.sel.indexOf(n);
        if (S.tipo === 'REEMPLAZO' || S.tipo === 'DIVIDIR') S.sel = [n];
        else if (i >= 0) S.sel.splice(i, 1); else S.sel.push(n);
        S.sel.sort(function (a, b) { return a - b; });
        S.cinta = sugerida(); pintar();
      };
    });
    var nt = document.getElementById('tfNT');
    if (nt) nt.onchange = function () { var n = Math.max(1, Math.min(40, parseInt(nt.value, 10) || 1)); S.partes = partesCinta(n); pintar(); };
    var pos = document.getElementById('tfPos'); if (pos) pos.onchange = function () { S.despuesDe = +pos.value; S.cinta = sugerida(); pintar(); };
    var upd = function () { document.getElementById('tfRes').innerHTML = resumen(); };
    document.getElementById('tfFecha').oninput = function () { S.fecha = this.value; };
    var tm = document.getElementById('tfMetros'); if (tm) tm.oninput = function () { S.metros = this.value; upd(); };
    Array.prototype.forEach.call(R.querySelectorAll('[data-np]'), function (b) {
      b.onclick = function () { var n = +b.getAttribute('data-np'), viejas = S.partes; S.partes = partesPorDefecto(n); viejas.forEach(function (x, j) { if (S.partes[j]) S.partes[j].metros = x.metros; }); pintar(); };
    });
    Array.prototype.forEach.call(R.querySelectorAll('[data-pn]'), function (b) {
      b.onclick = function () { var v = b.getAttribute('data-pn').split(':'); S.partes[+v[0]].nueva = v[1] === '1'; pintar(); };
    });
    Array.prototype.forEach.call(R.querySelectorAll('[data-pm]'), function (i) {
      i.oninput = function () { S.partes[+i.getAttribute('data-pm')].metros = i.value; upd(); };
      i.onchange = function () { var pos = i.getAttribute('data-pm'); pintar(); var n = document.querySelector('[data-pm="' + (+pos + 1) + '"]'); if (n) n.focus(); };
    });
    document.getElementById('tfObs').oninput = function () { S.obs = this.value; };
    var ce = document.getElementById('tfCerrar'); if (ce) ce.onchange = function () { S.cerrar = ce.checked; upd(); };
    Array.prototype.forEach.call(R.querySelectorAll('[data-c]'), function (i) { i.oninput = function () { S.cinta[i.getAttribute('data-c')] = i.value; upd(); }; });
  }

  function cerrar() { var bg = document.getElementById('tfBg'); if (bg) bg.remove(); document.removeEventListener('keydown', teclas); S = null; }
  function teclas(e) { if (e.key === 'Escape') cerrar(); }

  function guardar() {
    var err = document.getElementById('tfErr'), b = document.getElementById('tfOk');
    err.textContent = '';
    if (S.tipo === 'CINTA') S.sel = todos();
    if (S.tipo !== 'NUEVO' && !S.sel.length) return (err.textContent = 'Elija ' + (S.tipo === 'UNIR' ? 'los tramos que se unen.' : S.tipo === 'DIVIDIR' ? 'el tramo que se divide.' : 'el tramo que sale.'));
    if (S.tipo === 'DIVIDIR' && S.partes.some(function (x) { return !(num(x.metros) > 0); })) return (err.textContent = 'Indique los metros de cada parte.');
    if (S.tipo === 'UNIR') {
      if (S.sel.length < 2) return (err.textContent = 'Para unir, marque al menos dos tramos.');
      for (var i = 1; i < S.sel.length; i++) if (S.sel[i] !== S.sel[i - 1] + 1) return (err.textContent = 'Los tramos a unir deben ser seguidos (por ejemplo 4 y 5).');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(S.fecha || '')) return (err.textContent = 'Indique la fecha del cambio.');
    if (hayNueva() && !datosCompletos() && S.info.conEspesores && !confirm('Faltan datos de la cinta para Medición de espesores (espesores, ancho, vida útil o seguridad).\n¿Guardar igual? En Espesores el tramo nuevo no aparecerá hasta registrarlo.')) return;
    var c = {}; Object.keys(S.cinta).forEach(function (k) { var v = S.cinta[k]; c[k] = ['espec', 'grado', 'fabricante'].indexOf(k) >= 0 ? String(v || '').trim() : (num(v) === null ? '' : num(v)); });
    var d = { equipo: S.info.equipo, tipo: S.tipo, tramos: S.sel, despuesDe: S.despuesDe, fecha: S.fecha, metros: num(S.metros) === null ? '' : num(S.metros),
      obs: S.obs, cerrarHallazgos: S.cerrar, cinta: c,
      partes: S.tipo === 'DIVIDIR' || S.tipo === 'CINTA' ? S.partes.map(function (x) { return { metros: num(x.metros), nueva: !!x.nueva }; }) : [] };
    b.disabled = true; b.textContent = 'Guardando…';
    var al = S.alGuardar;
    run('tramoCambio', [d]).then(function (r) {
      cerrar();
      alert(r && r.enCola ? 'Guardado en el teléfono: se registrará en Mapeo, Espesores y el catálogo apenas vuelva la señal.' : '✔ ' + (d.tipo === 'CINTA' ? 'Cambio de cinta' : 'Cambio de tramo') + ' registrado.\n\n' + String(r && r.mensaje || '').split(' · ').join('\n'));
      if (al) try { al(r); } catch (e) { }
    }, function (e) {
      b.disabled = false; b.textContent = 'Guardar cambio';
      err.textContent = (e && e.message) || String(e);
    });
  }

  window.TRAMO_FORM = {
    abrir: function (op) {
      op = op || {};
      css(); cerrar();
      var bg = document.createElement('div'); bg.id = 'tfBg';
      bg.innerHTML = '<div id="tfBox" role="dialog" aria-modal="true" aria-labelledby="tfTit"><header><h3 id="tfTit">Cambio de cinta o tramo<small id="tfSub">' + esc(op.equipo || '') + '</small></h3>' +
        '<button type="button" id="tfX" aria-label="Cerrar">×</button></header><div class="cu" id="tfCu"><div class="nota">Cargando tramos…</div></div>' +
        '<footer><button type="button" id="tfNo">Cancelar</button><button type="button" class="pri" id="tfOk" disabled>Guardar cambio</button></footer></div>';
      document.body.appendChild(bg);
      bg.addEventListener('click', function (e) { if (e.target === bg) cerrar(); });
      document.addEventListener('keydown', teclas);
      document.getElementById('tfX').onclick = cerrar; document.getElementById('tfNo').onclick = cerrar;
      run('tramoInfo', [op.equipo]).then(function (info) {
        if (!document.getElementById('tfBg')) return;
        var total = Math.max(info.total || 0, 1), t0 = +op.tramo || 0;
        S = { info: info, tipo: op.tipo || (total === 1 ? 'CINTA' : 'REEMPLAZO'), sel: t0 && t0 <= total ? [t0] : [], despuesDe: total, fecha: hoy(), metros: '', obs: '',
              cerrar: info.cerrarHallazgos !== false, alGuardar: op.alGuardar, partes: partesPorDefecto(2) };
        if (S.tipo === 'CINTA') { S.sel = todos(); S.tipo = ''; S.partes = partesCinta(total); S.tipo = 'CINTA'; }
        S.cinta = sugerida();
        document.getElementById('tfSub').textContent = info.tag + (info.nombre && info.nombre !== info.equipo ? ' · ' + info.nombre : '') + ' · ' + total + ' tramo' + (total === 1 ? '' : 's');
        var ok = document.getElementById('tfOk'); ok.disabled = false; ok.onclick = guardar;
        pintar();
      }, function (e) {
        var cu = document.getElementById('tfCu');
        if (cu) cu.innerHTML = '<div class="err">No se pudieron leer los tramos: ' + esc(e && e.message || e) + '</div><div class="nota">Abra esta cinta una vez con señal para tener sus datos en el teléfono.</div>';
      });
    }
  };
})();
