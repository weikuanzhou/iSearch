//@line 38 "/builds/moz2_slave/linux_build/build/browser/components/preferences/securityWarnings.js"

function secWarningSyncTo(aEvent) {
  var prefName = aEvent.target.getAttribute("preference") + ".show_once";
  var prefOnce = document.getElementById(prefName);
  prefOnce.value = false;
  return undefined;    
}
