/*
//@line 42 "/builds/moz2_slave/linux_build/build/browser/components/preferences/privacy.js"
*/

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var gPrivacyPane = {

  /**
   * Whether the use has selected the auto-start private browsing mode in the UI.
   */
  _autoStartPrivateBrowsing: false,

  /**
   * Sets up the UI for the number of days of history to keep, and updates the
   * label of the "Clear Now..." button.
   */
  init: function ()
  {
    this._updateHistoryDaysUI();
    this._updateSanitizeSettingsButton();
    this.initializeHistoryMode();
    this.updateHistoryModePane();
    this.updatePrivacyMicroControls();
    this.initAutoStartPrivateBrowsingObserver();
  },

  // HISTORY MODE

  /**
   * The list of preferences which affect the initial history mode settings.
   * If the auto start private browsing mode pref is active, the initial
   * history mode would be set to "Don't remember anything".
   * If all of these preferences have their default values, and the auto-start
   * private browsing mode is not active, the initial history mode would be
   * set to "Remember everything".
   * Otherwise, the initial history mode would be set to "Custom".
   *
   * Extensions adding their own preferences can append their IDs to this array if needed.
   */
  prefsForDefault: [
    "browser.history_expire_days",
    "browser.history_expire_days_min",
    "browser.download.manager.retention",
    "browser.formfill.enable",
    "network.cookie.cookieBehavior",
    "network.cookie.lifetimePolicy",
    "privacy.sanitize.sanitizeOnShutdown"
  ],

  /**
   * The list of control IDs which are dependent on the auto-start private
   * browsing setting, such that in "Custom" mode they would be disabled if
   * the auto-start private browsing checkbox is checked, and enabled otherwise.
   *
   * Extensions adding their own controls can append their IDs to this array if needed.
   */
  dependentControls: [
    "rememberHistoryDays",
    "rememberAfter",
    "rememberDownloads",
    "rememberForms",
    "keepUntil",
    "keepCookiesUntil",
    "alwaysClear",
    "clearDataSettings"
  ],

  /**
   * Check whether all the preferences values are set to their default values
   *
   * @param aPrefs an array of pref names to check for
   * @returns boolean true if all of the prefs are set to their default values,
   *                  false otherwise
   */
  _checkDefaultValues: function(aPrefs) {
    for (let i = 0; i < aPrefs.length; ++i) {
      let pref = document.getElementById(aPrefs[i]);
      if (pref.value != pref.defaultValue)
        return false;
    }
    return true;
  },

  /**
   * Initialize the history mode menulist based on the privacy preferences
   */
  initializeHistoryMode: function PPP_initializeHistoryMode()
  {
    let mode;
    let getVal = function (aPref)
      document.getElementById(aPref).value;

    if (this._checkDefaultValues(this.prefsForDefault)) {
      if (getVal("browser.privatebrowsing.autostart"))
        mode = "dontremember";
      else 
        mode = "remember";
    }
    else
      mode = "custom";

    document.getElementById("historyMode").value = mode;
  },

  /**
   * Update the selected pane based on the history mode menulist
   */
  updateHistoryModePane: function PPP_updateHistoryModePane()
  {
    let selectedIndex = -1;
    switch (document.getElementById("historyMode").value) {
    case "remember":
      selectedIndex = 0;
      break;
    case "dontremember":
      selectedIndex = 1;
      break;
    case "custom":
      selectedIndex = 2;
      break;
    }
    document.getElementById("historyPane").selectedIndex = selectedIndex;
  },

  /**
   * Update the private browsing auto-start pref and the history mode
   * micro-management prefs based on the history mode menulist
   */
  updateHistoryModePrefs: function PPP_updateHistoryModePrefs()
  {
    let pref = document.getElementById("browser.privatebrowsing.autostart");
    switch (document.getElementById("historyMode").value) {
    case "remember":
      pref.value = false;

      // select the remember history option if needed
      let rememberHistoryCheckbox = document.getElementById("rememberHistoryDays");
      if (!rememberHistoryCheckbox.checked) {
        rememberHistoryCheckbox.checked = true;
        this.onchangeHistoryDaysCheck();
      }

      // select the remember downloads option if needed
      if (!document.getElementById("rememberDownloads").checked)
        document.getElementById("browser.download.manager.retention").value = 2;

      // select the remember forms history option
      document.getElementById("browser.formfill.enable").value = true;

      // select the accept cookies option
      document.getElementById("network.cookie.cookieBehavior").value = 0;
      // select the cookie lifetime policy option
      document.getElementById("network.cookie.lifetimePolicy").value = 0;

      // select the clear on close option
      document.getElementById("privacy.sanitize.sanitizeOnShutdown").value = false;
      break;
    case "dontremember":
      pref.value = true;
      break;
    }
  },

  /**
   * Update the privacy micro-management controls based on the
   * value of the private browsing auto-start checkbox.
   */
  updatePrivacyMicroControls: function PPP_updatePrivacyMicroControls()
  {
    if (document.getElementById("historyMode").value == "custom") {
      let disabled = this._autoStartPrivateBrowsing =
        document.getElementById("privateBrowsingAutoStart").checked;
      this.dependentControls
          .forEach(function (aElement)
                   document.getElementById(aElement).disabled = disabled);

      // adjust the cookie controls status
      this.readAcceptCookies();
      document.getElementById("keepCookiesUntil").value = disabled ? 2 :
        document.getElementById("network.cookie.lifetimePolicy").value;

      // adjust the checked state of the sanitizeOnShutdown checkbox
      document.getElementById("alwaysClear").checked = disabled ? false :
        document.getElementById("privacy.sanitize.sanitizeOnShutdown").value;

      // adjust the checked state of the remember history checkboxes
      document.getElementById("rememberHistoryDays").checked = disabled ? false :
        document.getElementById("browser.history_expire_days").value > 0;
      this.onchangeHistoryDaysCheck();
      document.getElementById("rememberDownloads").checked = disabled ? false :
        this.readDownloadRetention();
      document.getElementById("rememberForms").checked = disabled ? false :
        document.getElementById("browser.formfill.enable").value;

      if (!disabled) {
        // adjust the Settings button for sanitizeOnShutdown
        this._updateSanitizeSettingsButton();
      }
    }
  },

  // PRIVATE BROWSING

  /**
   * Install the observer for the auto-start private browsing mode pref.
   */
  initAutoStartPrivateBrowsingObserver: function PPP_initAutoStartPrivateBrowsingObserver()
  {
    let prefService = document.getElementById("privacyPreferences")
                              .service
                              .QueryInterface(Components.interfaces.nsIPrefBranch2);
    prefService.addObserver("browser.privatebrowsing.autostart",
                            this.autoStartPrivateBrowsingObserver,
                            true);
  },

  autoStartPrivateBrowsingObserver:
  {
    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIObserver,
                                           Components.interfaces.nsISupportsWeakReference]),

    observe: function PPP_observe(aSubject, aTopic, aData)
    {
      let privateBrowsingService = Components.classes["@mozilla.org/privatebrowsing;1"].
        getService(Components.interfaces.nsIPrivateBrowsingService);

      // Toggle the private browsing mode without switching the session
      let prefValue = document.getElementById("browser.privatebrowsing.autostart").value;
      let keepCurrentSession = document.getElementById("browser.privatebrowsing.keep_current_session");
      keepCurrentSession.value = true;
      // If activating from within the private browsing mode, reset the
      // private session
      if (prefValue && privateBrowsingService.privateBrowsingEnabled)
        privateBrowsingService.privateBrowsingEnabled = false;
      privateBrowsingService.privateBrowsingEnabled = prefValue;
      keepCurrentSession.reset();
    }
  },

  // HISTORY

  /**
   * Read the location bar enabled and suggestion prefs
   * @return Int value for suggestion menulist
   */
  readSuggestionPref: function PPP_readSuggestionPref()
  {
    let getVal = function(aPref)
      document.getElementById("browser.urlbar." + aPref).value;

    // Suggest nothing if autocomplete is not enabled
    if (!getVal("autocomplete.enabled"))
      return -1;

    // Bottom 2 bits of default.behavior specify history/bookmark
    return getVal("default.behavior") & 3;
  },

  /**
   * Write the location bar enabled and suggestion prefs when necessary
   * @return Bool value for enabled pref
   */
  writeSuggestionPref: function PPP_writeSuggestionPref()
  {
    let menuVal = document.getElementById("locationBarSuggestion").value;
    let enabled = menuVal != -1;

    // Only update default.behavior if we're giving suggestions
    if (enabled) {
      // Put the selected menu item's value directly into the bottom 2 bits
      let behavior = document.getElementById("browser.urlbar.default.behavior");
      behavior.value = behavior.value >> 2 << 2 | menuVal;
    }

    // Always update the enabled pref
    return enabled;
  },

  /*
   * Preferences:
   *
   * NOTE: These first two are no longer shown in the UI. They're controlled
   *       via the checkbox, which uses the zero state of the pref to turn
   *       history off.
   * browser.history_expire_days
   * - the number of days of history to remember
   * browser.history_expire_days.mirror
   * - a preference whose value mirrors that of browser.history_expire_days, to
   *   make the "days of history" checkbox easier to code
   *
   * browser.history_expire_days_min
   * - the mininum number of days of history to remember
   * browser.history_expire_days_min.mirror
   * - a preference whose value mirrors that of browser.history_expire_days_min
   *   to make the "days of history" checkbox easier to code
   * browser.formfill.enable
   * - true if entries in forms and the search bar should be saved, false
   *   otherwise
   * browser.download.manager.retention
   * - determines when downloads are automatically removed from the download
   *   manager:
   *
   *     0 means remove downloads when they finish downloading
   *     1 means downloads will be removed when the browser quits
   *     2 means never remove downloads
   */

  /**
   * Initializes the days-of-history mirror preference and connects it to the
   * days-of-history checkbox so that updates to the textbox are transmitted to
   * the real days-of-history preference.
   */
  _updateHistoryDaysUI: function ()
  {
    var pref = document.getElementById("browser.history_expire_days");
    var mirror = document.getElementById("browser.history_expire_days.mirror");
    var pref_min = document.getElementById("browser.history_expire_days_min");
    var textbox = document.getElementById("historyDays");
    var checkbox = document.getElementById("rememberHistoryDays");

    // handle mirror non-existence or mirror/pref unsync
    if (mirror.value === null || mirror.value != pref.value || 
        (mirror.value == pref.value && mirror.value == 0) )
      mirror.value = pref.value ? pref.value : pref.defaultValue;

    checkbox.checked = (pref.value > 0);
    textbox.disabled = !checkbox.checked;
  },

  /**
   * Responds to the checking or unchecking of the days-of-history UI, storing
   * the appropriate value to the days-of-history preference and enabling or
   * disabling the number textbox as appropriate.
   */
  onchangeHistoryDaysCheck: function ()
  {
    var pref = document.getElementById("browser.history_expire_days");
    var mirror = document.getElementById("browser.history_expire_days.mirror");
    var textbox = document.getElementById("historyDays");
    var checkbox = document.getElementById("rememberHistoryDays");

    if (!this._autoStartPrivateBrowsing)
      pref.value = checkbox.checked ? mirror.value : 0;
    textbox.disabled = !checkbox.checked;
  },

  /**
   * Responds to changes in the days-of-history textbox,
   * unchecking the history-enabled checkbox if the days
   * value is zero.
   */
  onkeyupHistoryDaysText: function ()
  {
    var textbox = document.getElementById("historyDays");
    var checkbox = document.getElementById("rememberHistoryDays");
    
    checkbox.checked = textbox.value != 0;
  },

  /**
   * Converts the value of the browser.download.manager.retention preference
   * into a Boolean value.  "remove on close" and "don't remember" both map
   * to an unchecked checkbox, while "remember" maps to a checked checkbox.
   */
  readDownloadRetention: function ()
  {
    var pref = document.getElementById("browser.download.manager.retention");
    return (pref.value == 2);
  },

  /**
   * Returns the appropriate value of the browser.download.manager.retention
   * preference for the current UI.
   */
  writeDownloadRetention: function ()
  {
    var checkbox = document.getElementById("rememberDownloads");
    return checkbox.checked ? 2 : 0;
  },

  // COOKIES

  /*
   * Preferences:
   *
   * network.cookie.cookieBehavior
   * - determines how the browser should handle cookies:
   *     0   means enable all cookies
   *     1   means reject third party cookies; see
   *         netwerk/cookie/src/nsCookieService.cpp for a hairier definition
   *     2   means disable all cookies
   * network.cookie.lifetimePolicy
   * - determines how long cookies are stored:
   *     0   means keep cookies until they expire
   *     1   means ask how long to keep each cookie
   *     2   means keep cookies until the browser is closed
   */

  /**
   * Reads the network.cookie.cookieBehavior preference value and
   * enables/disables the rest of the cookie UI accordingly, returning true
   * if cookies are enabled.
   */
  readAcceptCookies: function ()
  {
    var pref = document.getElementById("network.cookie.cookieBehavior");
    var acceptThirdParty = document.getElementById("acceptThirdParty");
    var keepUntil = document.getElementById("keepUntil");
    var menu = document.getElementById("keepCookiesUntil");

    // enable the rest of the UI for anything other than "disable all cookies"
    var acceptCookies = (pref.value != 2);

    acceptThirdParty.disabled = !acceptCookies;
    keepUntil.disabled = menu.disabled = this._autoStartPrivateBrowsing || !acceptCookies;
    
    return acceptCookies;
  },

  readAcceptThirdPartyCookies: function ()
  {
    var pref = document.getElementById("network.cookie.cookieBehavior");
    return pref.value == 0;
  },

  /**
   * Enables/disables the "keep until" label and menulist in response to the
   * "accept cookies" checkbox being checked or unchecked.
   */
  writeAcceptCookies: function ()
  {
    var accept = document.getElementById("acceptCookies");
    var acceptThirdParty = document.getElementById("acceptThirdParty");

    // if we're enabling cookies, automatically check 'accept third party'
    if (accept.checked)
      acceptThirdParty.checked = true;

    return accept.checked ? (acceptThirdParty.checked ? 0 : 1) : 2;
  },

  writeAcceptThirdPartyCookies: function ()
  {
    var accept = document.getElementById("acceptCookies");
    var acceptThirdParty = document.getElementById("acceptThirdParty");
    return accept.checked ? (acceptThirdParty.checked ? 0 : 1) : 2;
  },

  /**
   * Displays fine-grained, per-site preferences for cookies.
   */
  showCookieExceptions: function ()
  {
    var bundlePreferences = document.getElementById("bundlePreferences");
    var params = { blockVisible   : true, 
                   sessionVisible : true, 
                   allowVisible   : true, 
                   prefilledHost  : "", 
                   permissionType : "cookie",
                   windowTitle    : bundlePreferences.getString("cookiepermissionstitle"),
                   introText      : bundlePreferences.getString("cookiepermissionstext") };
    document.documentElement.openWindow("Browser:Permissions",
                                        "chrome://browser/content/preferences/permissions.xul",
                                        "", params);
  },

  /**
   * Displays all the user's cookies in a dialog.
   */  
  showCookies: function (aCategory)
  {
    document.documentElement.openWindow("Browser:Cookies",
                                        "chrome://browser/content/preferences/cookies.xul",
                                        "", null);
  },

  // CLEAR PRIVATE DATA

  /*
   * Preferences:
   *
   * privacy.sanitize.sanitizeOnShutdown
   * - true if the user's private data is cleared on startup according to the
   *   Clear Private Data settings, false otherwise
   */

  /**
   * Displays the Clear Private Data settings dialog.
   */
  showClearPrivateDataSettings: function ()
  {
    document.documentElement.openSubDialog("chrome://browser/content/preferences/sanitize.xul",
                                           "", null);
  },

  /**
   * Displays a dialog from which individual parts of private data may be
   * cleared.
   */
  clearPrivateDataNow: function (aClearEverything)
  {
    var ts = document.getElementById("privacy.sanitize.timeSpan");
    var timeSpanOrig = ts.value;
    if (aClearEverything)
      ts.value = 0;

    const Cc = Components.classes, Ci = Components.interfaces;
    var glue = Cc["@mozilla.org/browser/browserglue;1"]
                 .getService(Ci.nsIBrowserGlue);
    glue.sanitize(window || null);

    // reset the timeSpan pref
    if (aClearEverything)
      ts.value = timeSpanOrig;
  },

  /**
   * Enables or disables the "Settings..." button depending
   * on the privacy.sanitize.sanitizeOnShutdown preference value
   */
  _updateSanitizeSettingsButton: function ()
   {
    var settingsButton = document.getElementById("clearDataSettings");
    var sanitizeOnShutdownPref = document.getElementById("privacy.sanitize.sanitizeOnShutdown");
    
    settingsButton.disabled = !sanitizeOnShutdownPref.value;  	
   }

};
