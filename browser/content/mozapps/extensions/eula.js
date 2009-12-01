//@line 37 "/builds/moz2_slave/linux_build/build/toolkit/mozapps/extensions/content/eula.js"

function Startup() {
  var bundle = document.getElementById("extensionsStrings");
  var label = document.createTextNode(bundle.getFormattedString("eulaHeader", [window.arguments[0].name]));
  document.getElementById("heading").appendChild(label);
  document.getElementById("eula").value = window.arguments[0].text;
}
