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

var autotransOptions = {
  onLoad: function(e) {
    var autotransOptions = this;
    autotransOptions.initialized = true;
    
    var login = glennpowAuthentication.getLogin();
    if (login != null) {
      var username = login.username;
      document.getElementById("textusername").value = username;
      var password = login.password;
      document.getElementById("textpassword").value = password;
    }
    
    var daemons = autotrans.getDaemons();
    for (index in daemons) {
      autotransOptions.addDaemonListItem(daemons[index]);
    }
  },
  
  onSelectDaemon: function(e) {
    var daemon = autotransOptions.getSelectedDaemon();
    if (daemon) {
      autotransOptions.setDaemonFields(daemon);
    }
  },
  
  onAddDaemon: function(e) {
    var daemon = autotrans.createDaemon();
    autotransOptions.addDaemonListItem(daemon, true);
    autotransOptions.setDaemonFields(daemon);
  },
  
  onRemoveDaemon: function(e) {
    var listbox = document.getElementById("daemons-listbox");
    var selected = listbox.selectedItem;
    if (selected) {
      var id = selected.getAttribute("value");
      listbox.removeChild(selected);
      autotrans.removeDaemonWithId(id);
    }
    autotransOptions.setDaemonFields();
  },
  
  onUpdateDaemon: function(e) {
    var daemon = autotransOptions.getSelectedDaemon();
    if (daemon) {
      daemon.active = document.getElementById("textactive").checked;
      glennpow.console("update: " + daemon.active);
      daemon.url = document.getElementById("texturl").value;
      daemon.maxactive = document.getElementById("textmaxactive").value;
      daemon.addpaused = document.getElementById("textaddpaused").checked;
      var username = document.getElementById("textusername").value;
      var password = document.getElementById("textpassword").value;
      autotrans.updateDaemon(daemon, username, password);
      
      var listbox = document.getElementById("daemons-listbox");
      var selected = listbox.selectedItem;
      if (selected) {
        var label = daemon.url;
        if (!daemon.active) {
          label = label + " (inactive)";
          selected.setAttribute("class", "inactive");
        }
        selected.setAttribute("label", label);
      }
    }
  },
  
  setDaemonFields: function(daemon) {
    if (daemon) {
      var login = autotrans.getDaemonLogin(daemon);
      document.getElementById("textactive").checked = daemon.active;
      document.getElementById("textactive").disabled = false;
      document.getElementById("texturl").value = daemon.url;
      document.getElementById("texturl").disabled = false;
      document.getElementById("textusername").value = (login ? login.username : "");
      document.getElementById("textusername").disabled = false;
      document.getElementById("textpassword").value = (login ? login.password : "");
      document.getElementById("textpassword").disabled = false;
      document.getElementById("textmaxactive").value = daemon.maxactive;
      document.getElementById("textmaxactive").disabled = false;
      document.getElementById("textaddpaused").checked = daemon.addpaused;
      document.getElementById("textaddpaused").disabled = false;
    } else {
      document.getElementById("textactive").checked = false;
      document.getElementById("textactive").disabled = true;
      document.getElementById("texturl").value = "";
      document.getElementById("texturl").disabled = true;
      document.getElementById("textusername").value = "";
      document.getElementById("textusername").disabled = true;
      document.getElementById("textpassword").value = "";
      document.getElementById("textpassword").disabled = true;
      document.getElementById("textmaxactive").value = "";
      document.getElementById("textmaxactive").disabled = true;
      document.getElementById("textaddpaused").checked = false;
      document.getElementById("textaddpaused").disabled = true;
    }
  },
  
  addDaemonListItem: function(daemon, selected) {
    var listitem = document.createElementNS(glennpow.XUL_NS, "listitem");
    var label = daemon.url;
    if (!daemon.active) {
      label = label + " (inactive)";
      listitem.setAttribute("class", "inactive");
    }
    listitem.setAttribute("label", label);
    listitem.setAttribute("value", daemon.id);

    var listbox = document.getElementById("daemons-listbox");
    listbox.appendChild(listitem);
    if (selected)
      listbox.selectedItem = listitem;
  },
  
  getSelectedDaemon: function() {
    var listbox = document.getElementById("daemons-listbox");
    var selected = listbox.selectedItem;
    if (selected) {
      var id = selected.getAttribute("value");
      return autotrans.getDaemonWithId(id);
    }
    return null;
  },
};

window.addEventListener("load", function(e) { autotransOptions.onLoad(e); }, false);
