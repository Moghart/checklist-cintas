/**
 * Sesión de la app instalable "Inspección Cintas".
 * Cada persona entra con su correo y el PIN que le asigna el administrador
 * (Gestión Cintas › Administración › Usuarios y permisos). El servidor entrega un
 * "pase" válido por 90 días que se guarda en este teléfono y viaja en cada llamada.
 * Los permisos son los mismos de la web: Administrador, Usuario o Visualizador.
 */
(function () {
  var K = { tk: 'ic_tk', email: 'ic_email', nombre: 'ic_nombre', area: 'ic_area' };
  function leer(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function escribir(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { } }

  function url() {
    var u = (window.CONFIG_APP && CONFIG_APP.API_URL) || '';
    return u.indexOf('https://script.google.com/') === 0 ? u : '';
  }

  function post(cuerpo) {
    if (!url()) return Promise.reject(new Error('Falta configurar la URL de Apps Script en config.js'));
    // text/plain evita la consulta previa CORS, que Apps Script no responde.
    return fetch(url(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
      redirect: 'follow'
    }).then(function (r) {
      if (!r.ok) { var eh = new Error('Error de conexión (HTTP ' + r.status + ')'); eh.red = r.status >= 500 || r.status === 0; throw eh; }
      return r.json();
    }, function (e) { var er = new Error('Sin conexión'); er.red = true; er.causa = e; throw er; });
  }

  window.SESION_APP = {
    url: url,
    token: function () { return leer(K.tk); },
    email: function () { return leer(K.email); },
    nombre: function () { return leer(K.nombre); },
    area: function () { return leer(K.area); },
    elegirArea: function (a) { escribir(K.area, a); },

    /** Inicia sesión con correo y PIN. Devuelve {ok, mensaje}. */
    iniciar: function (email, pin) {
      return post({ accion: 'sesionIniciar', args: [email, pin] }).then(function (j) {
        if (j && j.__error) throw new Error(j.__error);
        var r = j.__ok || {};
        if (r.ok) { escribir(K.tk, r.token); escribir(K.email, r.email); escribir(K.nombre, r.nombre || ''); }
        return r;
      });
    },

    /** Crea una cuenta desde la app (Visualizador al tiro; Usuario con confirmación de correo y aprobación). */
    registrar: function (datos) {
      return post({ accion: 'registroSolicitar', args: [datos] }).then(function (j) {
        if (j && j.__error) throw new Error(j.__error);
        var r = j.__ok || {};
        if (r.ok && r.token) { escribir(K.tk, r.token); escribir(K.email, r.email); escribir(K.nombre, r.nombre || ''); }
        return r;
      });
    },

    cerrar: function () { escribir(K.tk, ''); escribir(K.nombre, ''); },

    /** Llama a una función del servidor con el pase de sesión. */
    llamar: function (accion, args) {
      if (!leer(K.tk)) { var e0 = new Error('Debe iniciar sesión'); e0.sinSesion = true; return Promise.reject(e0); }
      return post({ accion: accion, args: args || [], tk: leer(K.tk), area: leer(K.area) }).then(function (j) {
        if (j && j.__error === 'NO_AUTORIZADO') {
          escribir(K.tk, '');
          var e = new Error('Su sesión venció o el usuario fue desactivado. Ingrese de nuevo.');
          e.sinSesion = true;
          throw e;
        }
        if (j && j.__error) throw new Error(j.__error);
        return j ? j.__ok : null;
      });
    },

    irAlLogin: function (volver) {
      location.href = 'index.html' + (volver ? '?volver=' + encodeURIComponent(volver) : '');
    }
  };
})();
