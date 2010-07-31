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

var glennpowAuthentication = {
  loginManager: Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager),
  nsLoginInfo: new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init"),
  
  hostname: 'chrome://mozilla',
  defaultHttpRealm: 'Default',
  
  getHttpRealm: function(httprealm) {
    if (httprealm)
      return httprealm;
    return glennpowAuthentication.defaultHttpRealm;
  },
  
  getLogins: function(httprealm) {
    return glennpowAuthentication.loginManager.findLogins({}, glennpowAuthentication.hostname, null, glennpowAuthentication.getHttpRealm(httprealm));
  },
  
  getLogin: function(httprealm) {
    var logins = glennpowAuthentication.getLogins(httprealm);
    if (logins.length > 0)
      return logins[0];
    return null;
  },
  
  saveLogin: function(username, password, httprealm) {
    var oldLoginInfo = glennpowAuthentication.getLogin(httprealm);
    var newLoginInfo = new glennpowAuthentication.nsLoginInfo(glennpowAuthentication.hostname, null, glennpowAuthentication.getHttpRealm(httprealm), username, password, "", ""); 
    if (oldLoginInfo != null)
      glennpowAuthentication.loginManager.modifyLogin(oldLoginInfo, newLoginInfo);
    else
      glennpowAuthentication.loginManager.addLogin(newLoginInfo);
  },
  
  removeLogin: function(httprealm) {
    var oldLoginInfo = glennpowAuthentication.getLogin(httprealm);
    if (oldLoginInfo != null)
      glennpowAuthentication.loginManager.removeLogin(oldLoginInfo);
  },
};
