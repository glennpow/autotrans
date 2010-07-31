/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Autotrans.
 *
 * The Initial Developer of the Original Code is
 * Glenn Powell.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Glenn Powell
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

var autotrans = {
  application: Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication),
  prefService: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
  jsonService: Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON),
  
  sessionId: null,
  // This should not be directly accessed externally
  _daemons: null,
  
  onLoad: function() {
    var autotrans = this;
    autotrans.initialized = true;
    
    // Setup common libraries
    glennpow.debugging = autotrans.application.prefs.getValue("extensions.autotrans.debug", false);
    glennpow.logfile = "autotrans_log.txt";
    glennpowAuthentication.hostname = "chrome://autotrans";
  },
  
  createDaemon: function() {
    var id = autotrans.getNextDaemonId();
    var daemon = { id: id, active: true, url: "http://192.168.1.2:9091/transmission/rpc", maxactive: 0, addpaused: false };
    autotrans.prefService.setCharPref("extensions.autotrans.daemons." + id, autotrans.jsonService.encode(daemon));
    autotrans.getDaemons(true);
    return daemon;
  },
    
  getHttpRealm: function(daemon) {
    return "[" + daemon.id + "] " + daemon.url;
  },

  updateDaemon: function(daemon, username, password) {
    var oldDaemon = autotrans.getDaemonWithId(daemon.id);
    if (oldDaemon != null) {
      autotrans.prefService.setCharPref("extensions.autotrans.daemons." + daemon.id, autotrans.jsonService.encode(daemon));

      if (username && username.length > 0 && password && password.length > 0) {
        if (oldDaemon.url != daemon.url)
          glennpowAuthentication.removeLogin(autotrans.getHttpRealm(oldDaemon));
        glennpowAuthentication.saveLogin(username, password, autotrans.getHttpRealm(daemon));
      }
    }
  },
  
  removeDaemonWithId: function(id) {
    autotrans.getDaemons(true);
    var daemon = null;
    for (index in autotrans._daemons) {
      if (autotrans._daemons[index].id == id) {
        daemon = autotrans._daemons[index];
        autotrans._daemons.splice(index);
        break;
      }
    }

    if (autotrans.prefService.prefHasUserValue("extensions.autotrans.daemons." + id))
      autotrans.prefService.clearUserPref("extensions.autotrans.daemons." + id);
    
    if (daemon != null) {
      glennpowAuthentication.removeLogin(autotrans.getHttpRealm(daemon));
    }
  },
    
  getPrimaryDaemon: function() {
    var daemons = autotrans.getDaemons(true);
    for (index in daemons) {
      if (daemons[index].active)
        return daemons[index];
    }
    return null;
  },

  getDaemonWithId: function(id) {
    if (autotrans.prefService.prefHasUserValue("extensions.autotrans.daemons." + id)) {
      var daemonJSON = autotrans.prefService.getCharPref("extensions.autotrans.daemons." + id);
      var daemon = autotrans.jsonService.decode(daemonJSON);
      return daemon;
    }
    return null;
  },
  
  getDaemonLogin: function(daemon) {
    return glennpowAuthentication.getLogin(autotrans.getHttpRealm(daemon));
  },
    
  getDaemons: function(reload) {
    if (reload || autotrans._daemons == null) {
      var daemonPrefs = autotrans.prefService.getChildList("extensions.autotrans.daemons.", {});
      daemonPrefs.sort();
      autotrans._daemons = [];
      for (index in daemonPrefs) {
        var daemonJSON = autotrans.prefService.getCharPref(daemonPrefs[index]);
        var daemon = autotrans.jsonService.decode(daemonJSON);
        autotrans._daemons.push(daemon);
      }
    }
    return autotrans._daemons;
  },
  
  getActiveDaemons: function() {
    var daemons = autotrans.getDaemons(true);
    var activeDaemons = [];
    for (index in daemons) {
      if (daemons[index].active)
        activeDaemons.push(daemons[index]);
    }
    return activeDaemons;
  },
  
  getNextDaemonId: function() {
    var daemons = autotrans.getDaemons(true);
    var maxId = 0;
    for (index in daemons) {
      var id = daemons[index].id
      if (id > maxId)
        maxId = id;
    }
    return maxId + 1;
  },

  ajaxToUrl: function(daemon, data, callback, attempt, login) {
    attempt = attempt || 1;
    var url = daemon.url;
    
    // Check that you haven't reached the max request attempts
    var maxAttempts = autotrans.application.prefs.getValue("extensions.autotrans.attempts", 3);
    if (attempt > maxAttempts) {
      callback(false, autotrans.strings.getString("extensions.autotrans.connection_failure"));
      return;
    }
    
    var request = new XMLHttpRequest();
    
    // User authentication
    if (typeof(login) == "undefined") {
      login = autotrans.getDaemonLogin(daemon);
    }
    if (login != null) {
      request.open("POST", url, true, login.username, login.password);
    } else {
      request.open("POST", url, true);
    }
      
    // Set session-id
    if (autotrans.sessionId) {
      request.setRequestHeader("X-Transmission-Session-Id", autotrans.sessionId);
    }
    
    // Timeout and retry request
    var maxTimeout = autotrans.application.prefs.getValue("extensions.autotrans.timeout", 10000);
    var requestTimer = setTimeout(function() {
      glennpow.log(autotrans.strings.getString("extensions.autotrans.timeout"));
      request.abort();
      autotrans.ajaxToUrl(daemon, data, callback, attempt + 1, login);
    }, maxTimeout);
    
    request.onreadystatechange = function() {
      if (request.readyState == 4) {
        clearTimeout(requestTimer);
        try {
          if (request.responseText.length <= 0) {
            // Allow for timeout...
            glennpow.log(autotrans.strings.getString("extensions.autotrans.empty_response"));
          } else if (request.responseText.indexOf("invalid session-id") >= 0) {
            // Check for invalid session-id and set as necessary
            var sessionHeader = "<code>X-Transmission-Session-Id: ";
            var startIndex = request.responseText.indexOf(sessionHeader) + sessionHeader.length;
            var stopIndex = request.responseText.indexOf("</code>", startIndex);
            autotrans.sessionId = request.responseText.substring(startIndex, stopIndex);
            glennpow.log(autotrans.strings.getString("extensions.autotrans.setting_session_id") + ": " + autotrans.sessionId);
            autotrans.ajaxToUrl(daemon, data, callback, attempt, login);
          } else if (request.responseText.indexOf("Unauthorized") >= 0) {
            // Unauthorized User
            callback(false, autotrans.strings.getString("extensions.autotrans.unauthorized_response"));
          } else {
            glennpow.log(autotrans.strings.getString("extensions.autotrans.json_response") + ": " + request.responseText);
            try {
              var jsonResponse = autotrans.jsonService.decode(request.responseText);
              // Check for No Response
              if (jsonResponse.result.indexOf("No Response") >= 0) {
                glennpow.log(autotrans.strings.getString("extensions.autotrans.no_response"));
                autotrans.ajaxToUrl(daemon, data, callback, attempt + 1, login);
              } else {
                callback(true, jsonResponse);
              }
            } catch (e) {
              glennpow.log(autotrans.strings.getString("extensions.autotrans.json_error") + ": " + e);
              callback(false, autotrans.strings.getString("extensions.autotrans.invalid_response"));
            }
          }
        } catch (e) { 
          callback(false, e); 
        }
      }		
    };
    glennpow.log(autotrans.strings.getString("extensions.autotrans.sending_request") + ": " + attempt + "...");
    request.send(data);
  },

  _utf8_encode: function(string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			} else if ((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
 
		return utftext;
	},

  _encode64_keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  encode64: function(input) {
    // Encoding Variation Settings (NONE WORK PROPERLY WITH TRANSMISSION!!!)
    var myutf8 = false;           // Use my UTF-8 encoding
    var jsutf8 = false;           // Use javascript-only UTF-8 encoding
    var withslashes = false;      // Add slashes before '/' characters
    var addnewlines = false;      // Add newlines after every 64 characters
    var mozilla64 = false;       // Use Mozilla's Base64 encoder
    ////////////////////////////////////////////////////////////////////////
    
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var enchr1, enchr2, enchr3, enchr4;
    var i = 0, n = 0;
    
    if (myutf8)
      input = this._utf8_encode(input);
    else if (jsutf8)
      input = unescape(encodeURIComponent(input));
    if (mozilla64)
      return window.btoa(input);

    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 0x03) << 4) | ((chr2 & 0xf0) >> 4);
      enc3 = ((chr2 & 0x0f) << 2) | ((chr3 & 0xc0) >> 6);
      enc4 = chr3 & 0x3f;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      if (!withslashes) {
        enchr1 = this._encode64_keyStr.charAt(enc1);
        enchr2 = this._encode64_keyStr.charAt(enc2);
        enchr3 = this._encode64_keyStr.charAt(enc3);
        enchr4 = this._encode64_keyStr.charAt(enc4);
      } else {
        enchr1 = enc1 == 63 ? "\\/" : this._encode64_keyStr.charAt(enc1);
        enchr2 = enc2 == 63 ? "\\/" : this._encode64_keyStr.charAt(enc2);
        enchr3 = enc3 == 63 ? "\\/" : this._encode64_keyStr.charAt(enc3);
        enchr4 = enc4 == 63 ? "\\/" : this._encode64_keyStr.charAt(enc4);
      }

      output = output + enchr1 + enchr2 + enchr3 + enchr4;
      if (addnewlines) {
        n += 4;
        if (n >= 64) {
          n = 0;
          output = output + "\\n"
        }
      }
    }

    return output;
  },

  addTorrent: function(torrentURL, callback) {
    glennpow.log(autotrans.strings.getString("extensions.autotrans.adding_url") + ": " + torrentURL);
    var daemons = autotrans.getActiveDaemons();
    
    if (daemons.length == 0) {
      glennpow.alert(autotrans.strings.getString("extensions.autotrans.no_daemons"), autotrans.strings.getString("extensions.autotrans.no_daemons_text"));
      return;
    }
    
    for (index in daemons) {
      var daemon = daemons[index];

      if (daemon.maxactive > 0) {
        autotrans.getTorrentCount(daemon, function(success, response) {
          if (success) {
            var currentActive = response.arguments.activeTorrentCount;
            var addPaused = daemon.addpaused || (currentActive >= daemon.maxactive);
            autotrans.addTorrentToDaemon(daemon, torrentURL, addPaused, callback);
          }
        });
      } else {
        autotrans.addTorrentToDaemon(daemon, torrentURL, daemon.addpaused, callback);
      }
    }
  },
  
  addTorrentToDaemon: function(daemon, torrentURL, addPaused, callback) {
    var sendMetaInfo = autotrans.application.prefs.getValue("extensions.autotrans.metainfo", false);
    
    if (sendMetaInfo) {
      try {
        var request = new XMLHttpRequest();
        request.open("GET", torrentURL, true);
        request.onreadystatechange = function() {
          if (request.readyState == 4) {
            var metainfo = autotrans.encode64(request.responseText);
            glennpow.log(metainfo);
            autotrans.ajaxToUrl(daemon, autotrans.jsonService.encode({ method: "torrent-add", arguments: { metainfo: metainfo, paused: addPaused } }), callback);
          }
        }
        request.send(null);
      } catch (e) {
        glennpow.log(autotrans.strings.getString("extensions.autotrans.error") + ": " + e);
      }
    } else {
      autotrans.ajaxToUrl(daemon, autotrans.jsonService.encode({ method: "torrent-add", arguments: { filename: torrentURL, paused: addPaused } }), callback);
    }
  },
  
  removeTorrent: function(daemon, ids, callback) {
    glennpow.log(autotrans.strings.getString("extensions.autotrans.removing_ids") + ": " + ids + " (" + daemon.url + ")");
    autotrans.ajaxToUrl(daemon, autotrans.jsonService.encode({ method: "torrent-remove", arguments: { ids: ids } }), callback);
  },
  
  getTorrentCount: function(daemon, callback) {
    glennpow.log(autotrans.strings.getString("extensions.autotrans.retrieving_count") + ": " + daemon.url);
    autotrans.ajaxToUrl(daemon, autotrans.jsonService.encode({ method: "session-stats" }), callback);
  },
};

window.addEventListener("load", function(e) { autotrans.onLoad(e); }, false);
