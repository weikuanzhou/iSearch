//@line 36 "/builds/moz2_slave/linux_build/build/browser/base/content/pageinfo/permissions.js"
const ALLOW = nsIPermissionManager.ALLOW_ACTION;   // 1
const BLOCK = nsIPermissionManager.DENY_ACTION;    // 2
const SESSION = nsICookiePermission.ACCESS_SESSION;// 8
var gPermURI;
var gPrefs;

var gPermObj = {
  image: function getImageDefaultPermission()
  {
    if (gPrefs.getIntPref("permissions.default.image") == 2)
      return BLOCK;
    return ALLOW;
  },
  cookie: function getCookieDefaultPermission()
  {
    if (gPrefs.getIntPref("network.cookie.cookieBehavior") == 2)
      return BLOCK;

    if (gPrefs.getIntPref("network.cookie.lifetimePolicy") == 2)
      return SESSION;
    return ALLOW;
  },
  popup: function getPopupDefaultPermission()
  {
    if (gPrefs.getBoolPref("dom.disable_open_during_load"))
      return BLOCK;
    return ALLOW;
  },
  install: function getInstallDefaultPermission()
  {
    if (gPrefs.getBoolPref("xpinstall.whitelist.required"))
      return BLOCK;
    return ALLOW;
  },
  geo: function getGeoDefaultPermissions()
  {
      return BLOCK;
  }
};

var permissionObserver = {
  observe: function (aSubject, aTopic, aData)
  {
    if (aTopic == "perm-changed") {
      var permission = aSubject.QueryInterface(Components.interfaces.nsIPermission);
      if (permission.host == gPermURI.host && permission.type in gPermObj)
        initRow(permission.type);
    }
  }
};

function onLoadPermission()
{
  gPrefs = Components.classes[PREFERENCES_CONTRACTID]
                     .getService(Components.interfaces.nsIPrefBranch2);

  var uri = gDocument.documentURIObject;
  var permTab = document.getElementById("permTab");
  if(/^https?/.test(uri.scheme)) {
    gPermURI = uri;
    var hostText = document.getElementById("hostText");
    hostText.value = gPermURI.host;

    for (var i in gPermObj)
      initRow(i);
    var os = Components.classes["@mozilla.org/observer-service;1"]
                       .getService(Components.interfaces.nsIObserverService);
    os.addObserver(permissionObserver, "perm-changed", false);
    onUnloadRegistry.push(onUnloadPermission);
    permTab.hidden = false;
  }
  else
    permTab.hidden = true;
}

function onUnloadPermission()
{
  var os = Components.classes["@mozilla.org/observer-service;1"]
                     .getService(Components.interfaces.nsIObserverService);
  os.removeObserver(permissionObserver, "perm-changed");
}

function initRow(aPartId)
{
  var permissionManager = Components.classes[PERMISSION_CONTRACTID]
                                    .getService(nsIPermissionManager);

  var checkbox = document.getElementById(aPartId + "Def");
  var command  = document.getElementById("cmd_" + aPartId + "Toggle");
  var perm = permissionManager.testPermission(gPermURI, aPartId);
  if (perm) {
    checkbox.checked = false;
    command.removeAttribute("disabled");
  }
  else {
    checkbox.checked = true;
    command.setAttribute("disabled", "true");
    perm = gPermObj[aPartId]();
  }
  setRadioState(aPartId, perm);
}

function onCheckboxClick(aPartId)
{
  var permissionManager = Components.classes[PERMISSION_CONTRACTID]
                                    .getService(nsIPermissionManager);

  var command  = document.getElementById("cmd_" + aPartId + "Toggle");
  var checkbox = document.getElementById(aPartId + "Def");
  if (checkbox.checked) {
    permissionManager.remove(gPermURI.host, aPartId);
    command.setAttribute("disabled", "true");
    var perm = gPermObj[aPartId]();
    setRadioState(aPartId, perm);
  }
  else {
    onRadioClick(aPartId);
    command.removeAttribute("disabled");
  }
}

function onRadioClick(aPartId)
{
  var permissionManager = Components.classes[PERMISSION_CONTRACTID]
                                    .getService(nsIPermissionManager);

  var radioGroup = document.getElementById(aPartId + "RadioGroup");
  var id = radioGroup.selectedItem.id;
  var permission = id.split('#')[1];
  permissionManager.add(gPermURI, aPartId, permission);
}

function setRadioState(aPartId, aValue)
{
  var radio = document.getElementById(aPartId + "#" + aValue);
  radio.radioGroup.selectedItem = radio;
}
