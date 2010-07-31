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

var glennpow = {
  consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
  promptService: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),

  XUL_NS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
  
  // Override these in your JS file
  debugging: false,
  logfile: "glennpow_log.txt",
    
  padNumber: function(number, length) {
    var str = number.toString();
    while (str.length < length)
      str = '0' + str;
    return str;
  },

  timestamp: function() {
    var date = new Date();
    return date.getFullYear() + "-" + glennpow.padNumber((date.getMonth() + 1), 2) + "-" + glennpow.padNumber(date.getDate(), 2)
      + " " + glennpow.padNumber(date.getHours(), 2) + ":" + glennpow.padNumber(date.getMinutes(), 2) + ":" + glennpow.padNumber(date.getSeconds(), 2)
  },

  // Log to javascript development console
  console: function(message) {
    glennpow.consoleService.logStringMessage(message);
  },
  
  // Log to file
  log: function(message) {
    if (glennpow.debugging) {
      try {
        var data = glennpow.timestamp() + " - " + message + "\n";

        var file = Components.classes["@mozilla.org/file/directory_service;1"].
                             getService(Components.interfaces.nsIProperties).
                             get("Desk", Components.interfaces.nsIFile);
        file.append(glennpow.logfile);
      
        var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                 createInstance(Components.interfaces.nsIFileOutputStream);

        foStream.init(file, 0x02 | 0x08 | 0x10, 0666, 0); 
        foStream.write(data, data.length);
        foStream.close();
      } catch (e) {
        glennpow.console("Failed to write to log file (" + glennpow.logfile + "): " + e);
      }
    }
  },
  
  // Show prompt dialog
  alert: function(title, message) {
    glennpow.promptService.alert(window, title, message);
  },

  // For debugging variable contents
  inspect: function(obj, maxLevels, level) {
    var tab = '', type, msg;

    if (level == null)
      level = 0;
    for (var i = 0; i < level; i += 1)
      tab += '  ';

    if (maxLevels == null)
      maxLevels = 1;
    if (maxLevels < 1) {
      glennpow.log(tab + 'Error: Levels number must be > 0');
      return;
    }

    if (obj == null) {
      glennpow.log(tab + 'null');
      return;
    }

    for (property in obj) {
      try {
        type = typeof(obj[property]);
        if (type != 'function') {
          glennpow.log(tab + '(' + type + ') ' + property + ': ' + ((obj[property] == null) ? 'null' : ((type == 'object') ? '' : obj[property])));

          if ((type == 'object') && (obj[property] != null) && (level + 1 < maxLevels))
            glennpow.inspect(obj[property], maxLevels, level + 1);
        }
      } catch(err) {
        if (typeof(err) == 'string')
          msg = err;
        else if (err.message)
          msg = err.message;
        else if (err.description)
          msg = err.description;
        else
          msg = 'Unknown';

        glennpow.log(tab + 'Error (' + property + '): ' + msg);
      }
    }
  },
};
