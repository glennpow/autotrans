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

var autotransOverlay = {
  testing: false,

  onLoad: function(e) {
    var autotransOverlay = this;
    autotransOverlay.initialized = true;
    
    autotrans.strings = document.getElementById("autotrans-strings");
    
    document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", autotransOverlay.updateContentAreaContextMenu, false);
    document.getElementById("statusContextMenu").addEventListener("popupshowing", autotransOverlay.updateStatusContextMenu, false);

    var prefObserver = {
      prefs: null,
      
      register: function() {
        this.prefs = autotrans.prefService.getBranch("extensions.autotrans.");
        this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
        this.prefs.addObserver("", this, false);
        this.updateState();
        var observer = this;
        window.addEventListener("unload", function(e) { observer.unregister(); }, false);
      },

      unregister: function() {
        if (!this.prefs)
          return;

        this.prefs.removeObserver("", this);
      },

      observe: function(aSubject, aTopic, aData) {
        if (aTopic != "nsPref:changed")
          return;

        switch (aData) {
        case "menuicon", "statusicon", "gotomenu":
          this.updateState();
          break;
        }
      },
 
      updateState: function() {
        document.getElementById("autotrans-context-goto").hidden = !autotrans.application.prefs.getValue("extensions.autotrans.gotomenu", true);

        if (autotrans.application.prefs.getValue("extensions.autotrans.menuicon", true))  {
          document.getElementById("autotrans-context-add").setAttribute("class", "menuitem-iconic");
        } else {
          document.getElementById("autotrans-context-add").removeAttribute("class");
        }

        document.getElementById("autotrans-status-panel").setAttribute("collapsed", !autotrans.application.prefs.getValue("extensions.autotrans.statusicon", true));
      },
    }

    prefObserver.register();
  },

  // Determine if menu item is visible
  updateContentAreaContextMenu: function(event) {
    autotransOverlay.showContextMenu(autotransOverlay.contextMenuVisible());
  },
  
  // Only show context menu item if selected file has torrent extension or mime-type
  contextMenuVisible: function() {
    if (autotrans.application.prefs.getValue("extensions.autotrans.extfilter", true)) {
      var visible = false;
      if (gContextMenu.onLink) {
        // First check if it's a magnet link (TODO - this code may not be sufficient.  Awaiting transmission 1.80)
        visible = /^magnet\:/.test(gContextMenu.linkURL);
        if (!visible) {
          try {
            var request = new XMLHttpRequest();
            request.open("HEAD", gContextMenu.linkURL, true);
            request.onreadystatechange = function() {
              if (request.readyState == 4) {
                var mime = request.getResponseHeader("Content-Type");
                autotransOverlay.showContextMenu(mime == "application/x-bittorrent");
              }
            }
            request.send(null);
          } catch (e) {
            glennpow.log(autotrans.strings.getString("extensions.autotrans.error") + ": " + e);
          }
          visible = /\.torrent$/.test(gContextMenu.linkURL);
        }
      }
      return visible;
    } else {
      return true;
    }
  },
  
  // Show/hide menu item
  showContextMenu: function(visible) {
    document.getElementById("autotrans-context-add").hidden = !visible;
    document.getElementById("autotrans-context-separator").hidden = !visible && !autotrans.application.prefs.getValue("extensions.autotrans.gotomenu", true);
  },
  
  // Update status-bar context menu
  updateStatusContextMenu: function(event) {
    var menu = document.getElementById("statusContextMenu");
    while (menu.hasChildNodes())
      menu.removeChild(menu.firstChild);
    var daemons = autotrans.getDaemons(true);
    for (index in daemons) {
      var daemon = daemons[index];
      var menuitem = document.createElementNS(glennpow.XUL_NS, "menuitem");
      menuitem.setAttribute("label", autotrans.strings.getString("extensions.autotrans.open") + " " + daemon.url);
      menuitem.setAttribute("oncommand", "autotransOverlay.onGotoTorrents(event, " + daemon.id + ")");
      menu.appendChild(menuitem);
    }
  },

  // Show notification
  showNotification: function(title, message) {
    var notificationBox = gBrowser.getNotificationBox();
    notificationBox.appendNotification(message, "autotrans-notification", "chrome://autotrans/skin/autotrans-statusicon.png", notificationBox.PRIORITY_INFO_HIGH, null);
  },
  
  setStatusBarIcon: function(path) {
    document.getElementById("autotrans-status-panel").image = path;
  },
  
  onAddTorrent: function(e) {
    var torrentURL = gContextMenu.linkURL;
    // TODO - may need to escape this URL
    // torrentURL = torrentURL.replace(/\?/g,"%3F");
    // torrentURL = torrentURL.replace(/&/g,"%26");
    // torrentURL = torrentURL.replace(/@/g,"%40");
    // torrentURL = torrentURL.replace(/=/g,"%3D");
    
    if (autotransOverlay.testing) {
      autotransOverlay.testTorrent(torrentURL, 3);
    } else {
      autotransOverlay.setStatusBarIcon("chrome://autotrans/skin/autotrans-statusicon-active.png");
      
      autotrans.addTorrent(torrentURL, function(success, response) {
        if (success) {
          if (response.result == "success") {
            autotransOverlay.setStatusBarIcon("chrome://autotrans/skin/autotrans-statusicon.png");
            autotransOverlay.showNotification(autotrans.strings.getString("extensions.autotrans.add_success_label"), autotrans.strings.getString("extensions.autotrans.add_success_message"));
          } else {
            autotransOverlay.setStatusBarIcon("chrome://autotrans/skin/autotrans-statusicon-disabled.png");
            autotransOverlay.showNotification(autotrans.strings.getString("extensions.autotrans.add_failure_label"), response.result);
          }
        } else {
          autotransOverlay.setStatusBarIcon("chrome://autotrans/skin/autotrans-statusicon-disabled.png");
          autotransOverlay.showNotification(autotrans.strings.getString("extensions.autotrans.error"), response);
        }
      });
    }
  },
  
  // Navigate browser to Transmission Web UI (with authentication)
  onGotoTorrents: function(e, id) {
    // Using RPC to authenticate if necessary
    // Thanks - Emanuele (Götterdämerung)
    var daemon = (id ? autotrans.getDaemonWithId(id) : autotrans.getPrimaryDaemon());
    if (daemon) {
      var login = autotrans.getDaemonLogin(daemon);
      if (login != null) {
        autotrans.ajaxToUrl(daemon, autotrans.jsonService.encode({ method: "port-test" }), function(success, response) {
          if (success) {
            autotransOverlay.setStatusBarIcon("chrome://autotrans/skin/autotrans-statusicon.png");
            autotransOverlay.doGotoTorrents(daemon);
          } else {
            autotransOverlay.setStatusBarIcon("chrome://autotrans/skin/autotrans-statusicon-disabled.png");
            autotransOverlay.showNotification(autotrans.strings.getString("extensions.autotrans.error"), response);
          }
        });
      } else {
        autotransOverlay.doGotoTorrents(daemon);
      }
    }
  },

  // Navigate browser to Transmission Web UI
  doGotoTorrents: function(daemon) {
    var webURL = daemon.url.replace(/\/[^\/]+\/?$/, "/web");
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
    var wmed = wm.QueryInterface(Components.interfaces.nsIWindowMediator);

    var win = wmed.getMostRecentWindow("navigator:browser");
    var postData = null;
    if (!win) {
      win = window.openDialog("chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", webURL, null, null, postData, true);
    } else {
      var content = win.document.getElementById("content");
      if (content.currentURI.spec == "about:blank") {
        content.loadURI(webURL, null, null, postData);
      } else {
        content.selectedTab = content.addTab(webURL, null, null, postData);
      }
    }
  },

  // For debugging transmission connection
  testTorrent: function(torrentURL, attempts_left) {
    // Repeatedly attempt to add and remove torrent URL, with debug logging
    if (attempts_left <= 0)
      return;

    glennpow.log("Debugging torrent URL: " + torrentURL + " (Attempts left: " + attempts_left + ")");
    autotrans.addTorrent(torrentURL, function(success, response) {
      if (success) {
        if (response.result == "success") {
          glennpow.log("Server response received (Success)");
          var ids = response.arguments["torrent-added"].id;
          autotrans.removeTorrent(ids, function(successRemove, responseRemove) {
            if (successRemove) {
              if (responseRemove.result == "success") {
                glennpow.log("Server response received (Success)");
              } else {
                glennpow.log("Server response received (Failure): " + responseRemove.result);
              }
            } else {
              glennpow.log("Server request failed: " + responseRemove);
            }
            autotransOverlay.testTorrent(torrentURL, attempts_left - 1);
          });
        } else {
          glennpow.log("Server response received (Failure): " + response.result);
        }
      } else {
        glennpow.log("Server request failed: " + response);
      }
    });
  },
};

window.addEventListener("load", function(e) { autotransOverlay.onLoad(e); }, false);
