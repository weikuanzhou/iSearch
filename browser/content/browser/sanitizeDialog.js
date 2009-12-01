/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
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
 * The Original Code is the Firefox Sanitizer.
 *
 * The Initial Developer of the Original Code is
 * Ben Goodger.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Ben Goodger <ben@mozilla.org>
 *   Giorgio Maone <g.maone@informaction.com>
 *   Johnathan Nightingale <johnath@mozilla.com>
 *   Drew Willcoxon <adw@mozilla.com>
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

const Cc = Components.classes;
const Ci = Components.interfaces;

var gSanitizePromptDialog = {

  get bundleBrowser()
  {
    if (!this._bundleBrowser)
      this._bundleBrowser = document.getElementById("bundleBrowser");
    return this._bundleBrowser;
  },

  get selectedTimespan()
  {
    var durList = document.getElementById("sanitizeDurationChoice");
    return parseInt(durList.value);
  },

  get sanitizePreferences()
  {
    if (!this._sanitizePreferences) {
      this._sanitizePreferences =
        document.getElementById("sanitizePreferences");
    }
    return this._sanitizePreferences;
  },

  get warningBox()
  {
    return document.getElementById("sanitizeEverythingWarningBox");
  },

  init: function ()
  {
    // This is used by selectByTimespan() to determine if the window has loaded.
    this._inited = true;

    var s = new Sanitizer();
    s.prefDomain = "privacy.cpd.";
    for (let i = 0; i < this.sanitizePreferences.childNodes.length; ++i) {
      var preference = this.sanitizePreferences.childNodes[i];
      var name = s.getNameFromPreference(preference.name);
      if (!s.canClearItem(name)) 
        preference.disabled = true;
    }

    document.documentElement.getButton("accept").label =
      this.bundleBrowser.getString("sanitizeButtonOK");

    if (this.selectedTimespan === Sanitizer.TIMESPAN_EVERYTHING) {
      this.ensureWarningIsInited();
      this.warningBox.hidden = false;
    }
    else
      this.warningBox.hidden = true;
  },

  selectByTimespan: function ()
  {
    // This method is the onselect handler for the duration dropdown.  As a
    // result it's called a couple of times before onload calls init().
    if (!this._inited)
      return;

    var warningBox = this.warningBox;

    // If clearing everything
    if (this.selectedTimespan === Sanitizer.TIMESPAN_EVERYTHING) {
      this.ensureWarningIsInited();
      if (warningBox.hidden) {
        warningBox.hidden = false;
        window.resizeBy(0, warningBox.boxObject.height);
      }
      window.document.title =
        this.bundleBrowser.getString("sanitizeDialog2.everything.title");
      return;
    }

    // If clearing a specific time range
    if (!warningBox.hidden) {
      window.resizeBy(0, -warningBox.boxObject.height);
      warningBox.hidden = true;
    }
    window.document.title =
      window.document.documentElement.getAttribute("noneverythingtitle");
  },

  sanitize: function ()
  {
    // Update pref values before handing off to the sanitizer (bug 453440)
    this.updatePrefs();
    var s = new Sanitizer();
    s.prefDomain = "privacy.cpd.";

    s.range = Sanitizer.getClearRange(this.selectedTimespan);
    s.ignoreTimespan = !s.range;

    try {
      s.sanitize();
    } catch (er) {
      Components.utils.reportError("Exception during sanitize: " + er);
    }
    return true;
  },

  /**
   * If the panel that displays a warning when the duration is "Everything" is
   * not set up, sets it up.  Otherwise does nothing.
   */
  ensureWarningIsInited: function ()
  {
    if (this._warningIsInited)
      return;

    this._warningIsInited = true;

    // If the date and time-aware locale warning string is ever used again,
    // initialize it here.  Currently we use the no-visits warning string,
    // which does not include date and time.  See bug 480169 comment 48.

    var warningDesc = document.getElementById("sanitizeEverythingWarning");
    warningDesc.textContent =
      this.bundleBrowser.getString("sanitizeEverythingNoVisitsWarning");
  },

  /**
   * Called when the value of a preference element is synced from the actual
   * pref.  Enables or disables the OK button appropriately.
   */
  onReadGeneric: function ()
  {
    var found = false;

    // Find any other pref that's checked and enabled.
    var i = 0;
    while (!found && i < this.sanitizePreferences.childNodes.length) {
      var preference = this.sanitizePreferences.childNodes[i];

      found = !!preference.value &&
              !preference.disabled;
      i++;
    }

    try {
      document.documentElement.getButton("accept").disabled = !found;
    }
    catch (e) { }
    return undefined;
  },

  /**
   * Sanitizer.prototype.sanitize() requires the prefs to be up-to-date.
   * Because the type of this prefwindow is "child" -- and that's needed because
   * without it the dialog has no OK and Cancel buttons -- the prefs are not
   * updated on dialogaccept on platforms that don't support instant-apply
   * (i.e., Windows).  We must therefore manually set the prefs from their
   * corresponding preference elements.
   */
  updatePrefs : function ()
  {
    var tsPref = document.getElementById("privacy.sanitize.timeSpan");
    Sanitizer.prefs.setIntPref("timeSpan", this.selectedTimespan);

    // Keep the pref for the download history in sync with the history pref.
    document.getElementById("privacy.cpd.downloads").value =
      document.getElementById("privacy.cpd.history").value;

    // Now manually set the prefs from their corresponding preference
    // elements.
    var prefs = this.sanitizePreferences.rootBranch;
    for (let i = 0; i < this.sanitizePreferences.childNodes.length; ++i) {
      var p = this.sanitizePreferences.childNodes[i];
      prefs.setBoolPref(p.name, p.value);
    }
  },

  /**
   * Called by the item list expander button to toggle the list's visibility.
   */
  toggleItemList: function ()
  {
    var itemList = document.getElementById("itemList");
    var expanderButton = document.getElementById("detailsExpander");

    // Showing item list
    if (itemList.collapsed) {
      expanderButton.className = "expander-up";
      itemList.setAttribute("collapsed", "false");
      window.resizeBy(0, itemList.boxObject.height);
    }
    // Hiding item list
    else {
      expanderButton.className = "expander-down";
      window.resizeBy(0, -itemList.boxObject.height);
      itemList.setAttribute("collapsed", "true");
    }
  }

//@line 525 "/builds/moz2_slave/linux_build/build/browser/base/content/sanitizeDialog.js"

};


