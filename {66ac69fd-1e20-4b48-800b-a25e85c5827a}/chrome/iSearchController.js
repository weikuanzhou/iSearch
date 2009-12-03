
function utf16to8(str) {
    var out, i, len, c;

    out = "";
    len = str.length;
    for(i = 0; i < len; i++) {
        c = str.charCodeAt(i);
        if ((c >= 0x0001) && (c <= 0x007F)) {
            out += str.charAt(i);
        } else if (c > 0x07FF) {
            out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));
            out += String.fromCharCode(0x80 | ((c >>  6) & 0x3F));
            out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));
        } else {
            out += String.fromCharCode(0xC0 | ((c >>  6) & 0x1F));
            out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));
        }
    }
    return out;
}

function utf8to16(str) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = str.length;
    i = 0;
    while(i < len) {
        c = str.charCodeAt(i++);
        switch(c >> 4)
        { 
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                // 0xxxxxxx
                out += str.charAt(i-1);
                break;
            case 12: case 13:
                // 110x xxxx   10xx xxxx
                char2 = str.charCodeAt(i++);
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = str.charCodeAt(i++);
                char3 = str.charCodeAt(i++);
                out += String.fromCharCode(((c & 0x0F) << 12) |
                        ((char2 & 0x3F) << 6) |
                        ((char3 & 0x3F) << 0));
                break;
        }
    }

    return out;
}

function strcasecmp(a, b){
    return a.toLowerCase() == b.toLowerCase();
}

function ISearchController (aInput){
    aInput.mController = this;
    this.mResults = [];
    this.mSearches = [];
    this.mHolders = [];
    this.mcResults = [];

    this.mEnterAfterSearch = 0;
    this.mDefaultIndexCompleted = false;
    this.mBackspaced = false;
    this.mPopupClosedByCompositionStart = false;
    this.mIsIMEComposing = false;
    this.mIgnoreHandleText = false;
    this.mIsOpen = false;
    this.mSearchStatus = 0;
    this.mRowCount = 0;
    this.mSearchesOngoing = 0;
    this.mFirstSearchResult = false;

    var re = /(\w+)/;
    var mat = re.exec(navigator.platform);
    if(mat != null){
        this.mPlatform = mat[1];
    } else {
        this.mPlatform = 'unknown';
    }

    this.mInput = null;
    this.input = aInput;
}

ISearchController.prototype = {
    // this.mResults
    // this.mHolder
    // this.mcResults

    /* nsIAutocomplteController */
    get input(){
        return this.mInput; 
    },
    set input(aInput){
        if(this.mInput == aInput || aInput == null)
            return;
        if(this.mInput){
            this.stopSearch();
            this.clearResults();
            if(this.mIsOpen)
                this.closePopup();
            this.mSearches = [];
        }

        this.mInput = aInput;
        var newValue = aInput.textValue;

        //Reset all search state members
        this.mSearchString = newValue;
        this.mEnterAfterSearch = 0;
        this.DefaultIndexCompleted = false;
        this.mBackspaced = false;
        this.mSearchStatus = STATUS_NONE;
        this.mRowCount = 0;
        this.mSearchesOngoing = 0;

        //Initialize our list of search objects
        var searchCount = aInput.searchCount;
        this.mResults.length = searchCount;
        this.mHolders.length = searchCount;
        //this.mMatchCounts

        var search = Cc["@mozilla.org/autocomplete/search;1?name=history"]
                .getService(Ci.nsIAutoCompleteSearch);
        if(search ){
            this.mSearches.push(search);
        }
        search = new parseYahoo(this);
        if(search != null){
            this.mSearches.push(search);
        }
        search = new parseGoogle(this);
        if(search != null){
            this.mSearches.push(search);
        }
    },
    get searchStatus(){
        return this.mSearchStatus; 
    },
    get matchCount(){
        return this.mcResults.length;
    },
    set matchCount(mc){
        this.mRowCount= mc;
        alert("reset match count as " + mc);
    },
    get searchString(){
        return this.mSearchString; 
    },
    set searchString(aString){
        this.mSearchString = aString;
    },
    get selection(){
        return this.mSelection;
    },
    set selection(aSel){
        this.mSelection = aSel;
    },

    startSearch: function(searchText){
        this.mSearchString = searchText;
        this.startSearchTimer();
    },
    handleText: function(aIgnoreSelection){
        if(!this.mInput){
            this.stopSearch();
            //Error report here.
            return;
        }
        
        var newValue = this.mInput.textValue;
        if(this.mIgnoreHandleText){
            this.mIgnoreHandleText = false;
            if(newValue == this.mSearchString)
                return;
            //Error Report here.
        }
        this.stopSearch();
        if(!this.mInput) return;

        var disabled = this.mInput.disableAutoComplete;
        if(newValue.length > 0 && newValue == this.mSearchString)
            return;
        
        if(newValue.length < this.mSearchString.length &&
            this.mSearchString.substr(0, newValue.length)==newValue){
            this.clearResults();
            this.mBackSpaced = true;
        } else {
            this.mBackSpaced = false;
        }
        if(this.mRowCount == 0)
            this.clearResults();
        this.mSearchString = newValue;

        if(newValue.length == 0){
            this.closePopup();
            return;
        }

        if(aIgnoreSelection) {
            this.startSearchTimer();
        } else {
            var selStart = this.mInput.selectionStart;
            var selEnd = this.mInput.selectionEnd;
            if(selStart == selEnd && selStart == this.mSearchString.length){
                this.startSearchTimer();
            }
        }

    },
    handleEnter: function(aIsPopupSelection){
        if(!this.mInput) return false;
        var ret = this.mInput.popupOpen;
        if(ret){
            var popup = this.mInput.popup;
            if(popup){
                var selIndex = popup.selectedIndex;
                ret = (selIndex >=0);
            }
        }
        if(this.mSearchStatus != STATUS_SEARCHING)
            this.clearSearchTimer();
        this.enterMatch(aIsPopupSelection);
        return ret;
    },
    handleEscape: function(){
        var ret = false;
        if(!this.mInput) return ret;
        ret = this.mInput.popupOpen;
        this.stopSearch();
        this.clearResults();
        this.revertTextValue();
        this.closePopup();
        return ret;
    },
    handleStartComposition: function(){
        this.mPopupClosedByCompositionStart = false;
        this.mIsIMEComposing = true;
        if(!this.mInput) return;

        var disabled = this.mInput.disableAutoComplete;
        if(disabled) return;

        this.stopSearch();
        var isOpen = this.mInput.popupOpen;
        if(isOpen)
            this.closePopup();
        this.mPopupClosedByCompositionStart = isOpen;
    },
    handleEndComposition: function(){
        this.mIsIMEComposing = false;
        var forceOpenPopup = this.mPopupClosedByCompositionStart;
        this.mPopupClosedByCompositionStart = false;
        if(!this.mInput) return;

        var value = this.mInput.textValue;
        this.mSearchString = '';
        if(value != ''){
            this.handleText(true);
        } else if(forceOpenPopup){
            this.handleKeyNavigation(Ci.nsIDOMKeyEvent.DOM_VK_DOWN);
        }
        this.mIgnoreHandleText = true;
    },
    handleTab: function(){
        return this.handleEnter(false);
    },
    handleKeyNavigation: function(aKey){
        var ret = false;
        if(!this.mInput){
            // Error Report Here
            return ret;
        }
        var input = this.mInput;
        var popup = input.popup;
        var disabled = input.disableAutoComplete;

        if (aKey == Ci.nsIDOMKeyEvent.DOM_VK_UP ||
                aKey == Ci.nsIDOMKeyEvent.DOM_VK_DOWN ||
                aKey == Ci.nsIDOMKeyEvent.DOM_VK_PAGE_UP ||
                aKey == Ci.nsIDOMKeyEvent.DOM_VK_PAGE_DOWN)
        {
            ret = true;
            var isOpen = input.popupOpen;
            if(isOpen){
                var reverse = aKey == Ci.nsIDOMKeyEvent.DOM_VK_UP ||
                    aKey == Ci.nsIDOMKeyEvent.DOM_VK_PAGE_UP ? true: false;
                var page = aKey == Ci.nsIDOMKeyEvent.DOM_VK_PAGE_UP ||
                    aKey == Ci.nsIDOMKeyEvent.DOM_VK_PAGE_DOWN ? true: false;
                var completeSelection = input.completeSelectedIndex;
                popup.selectBy(reverse, page);
                if(completeSelection){
                    var selectedIndex = popup.selectedIndex;
                    if(selectedIndex >= 0){
                        var value = this.getResultValueAt(selectedIndex, true);
                        if(value != null){
                            input.textValue = value;
                            input.selectTextRange(value.length, value.length);
                        } else {
                            input.textValue = this.mSearchString;
                            input.selectTextRange(this.mSearchString.length, this.mSearchString.length);
                        }
                    }
                }
            } else {
                if(this.mPlatform == "Mac"){
                    var start, end;
                    if (aKey == Ci.nsIDOMKeyEvent.DOM_VK_UP) {
                        start = input.selectionStart;
                        end = input.selectionEnd;
                        if (start > 0 || start != end)
                            ret = false;
                    }
                    else if (aKey == Ci.nsIDOMKeyEvent.DOM_VK_DOWN) {
                        var text = input.textValue();
                        start = input.selectionStart;
                        end = input.selectionEnd;
                        if (start != end || end < text.length)
                            ret = false;
                    }

                }
                if(ret){
                    var resultCount = this.mResults.count();
                    if(resultCount){
                        if(this.mRowCount){
                            this.openPopup();
                        }
                    } else {
                        this.startSearchTimer();
                    }
                }
            }
        } else if(aKey == Ci.nsIDOMKeyEvent.DOM_VK_LEFT
            || aKey == Ci.nsIDOMKeyEvent.DOM_VK_RIGHT
            || (this.mPlatform=='Mac' && aKey==Ci.nsIDOMKeyEvent.DOM_VK_HOME)){
            var isOpen = input.popupOpen;
            if(isOpen){
                var selectedIndex = popup.selectedIndex;
                if(selectedIndex >= 0){
                    var value = this.getResultValueAt(selectedIndex, true);
                    if(value != null){
                        input.textValue = value;
                        input.selectTextRange(value.length, value.length);
                    }
                }
                this.clearSearchTimer();
                this.closePopup();
            }
            var value = input.textValue;
            this.mSearchString = value;
        }
        return ret;
    },
    handleDelete: function(){
        var ret = false;
        // hook here
        return ret; // temporarily disable this.
        if(!this.mInput) return ret;
        var input = this.mInput;
        var isOpen = input.popupOpen;
        if(!isOpen || this.mRowCount <=0){
            this.handleText(false);
            return ret;
        }

        var popup = input.popup;
        var index = popup.selectedIndex;
        var rowIndex;
        // Let search result has property: searchIndex 
        var tmp = this.rowIndexToSearch(index);
        var searchIndex = tmp.searchIndex;
        var rowIndex = tmp.rowIndex;
        var result = this.mResults[searchIndex];
        var search = input.searchParam;
        result.removeValueAt(rowIndex, true);
        --mRowCount;
        popup.setSelectedIndex(-1);

        if(this.mTree)
            this.mTree.rowCountChanged(this.mRowCount, -1);
        if(index >= this.mRowCount)
            index = this.mRowCount - 1;
        if(this.mRowCount > 0){
            index = popup.setSelectedIndex();
            var value = this.getResultValueAt(index, true);
            if(value != null){
                this.completeValue(value, false);
                ret = true;
            }
            popup.invalidate();
        } else {
            this.clearSearchTimer();
            this.closePopup();
        }
        return ret;
    },
    getValueAt: function(idx){
        return this.getResultValueAt(idx, false);
    },
    getCommentAt: function(idx){
        // hook here
        return this.mcResults[idx].comment;
        var tmp = this.rowIndexToSearch(idx);
        var searchIndex = tmp.searchIndex;
        var rowIndex = tmp.rowIndex;

        var result = this.mResults[searchIndex];
        return result.getCommentAt(rowIndex);
    },
    getImageAt: function(idx){
        // hook here
        return this.mcResults[idx].image;
        var tmp = this.rowIndexToSearch(idx);
        var searchIndex = tmp.searchIndex;
        var rowIndex = tmp.rowIndex;

        var result = this.mResults[searchIndex];
        return result.getImageAt(rowIndex);
    },
    getStyleAt: function(idx){
        // hook here
        return this.mcResults[idx].style;
        var tmp = this.rowIndexToSearch(idx);
        var searchIndex = tmp.searchIndex;
        var rowIndex = tmp.rowIndex;

        var result = this.mResults[searchIndex];
        return result.getStyleAt(rowIndex);
    },

    /* nsIAutocomplteObserver */
    onSearchResult: function(search, results){
        if (results.searchString != this.searchString)
            return;
        var count, i; 
        // hook here
        var idx = 0;
        var c = search._id?search._id:'H';
        count = results.matchCount;
        for(i=0; i<count && idx < MAXS; i++, idx++){
            while(idx < MAXS && orderStr.charAt(idx)!=c){
                idx++;
            }
            if(orderStr.charAt(idx) != c)
                break;
            this.mHolders[idx] = {};
            this.mHolders[idx].value    = results.getValueAt(i);
            this.mHolders[idx].comment  = results.getCommentAt(i);
            this.mHolders[idx].image    = results.getImageAt(i);
            this.mHolders[idx].style    = results.getStyleAt(i);
            this.mHolders[idx].searchString    = results.searchString;
            this.mHolders[idx].id       = c;
        }
        this.mcResults = [];
        count = this.mHolders.length;
        for(i=0; i<count; i++){
            if(this.mHolders[i] == null)
                continue; 
            if (this.mHolders[i].searchString != this.searchString){
                continue;
            }
            var j, add=true;
            var len= this.mcResults.length;
            for (j=0; j<len; ++j){
                if (this.mcResults[j].value == this.mHolders[i].value){
                    add = false;
                    break;
                }
            }
            if (add){
                this.mcResults.push(this.mHolders[i]);
            }
        }
        /*
        var s="";
        for(i=0; i<this.mHolders.length; i++){
            if(this.mHolders[i])
                s += ", " + this.mHolders[i].id;
            else
                s += ", null";
        }*/

        count = this.mSearches.length;
        for(i=0; i<count; i++){
            if(search == this.mSearches[i]){
                this.processResult(i, results);
                break;
            }
        }
    },

    /* nsITimerCallback */
    notify: function(aTimer){
        this.mTimer = null;
        this.startSearch();
    },

    /* assistant functions */
    openPopup: function(){
        var minResults = this.mInput.minResultsForPopup;
        if(this.mRowCount >= minResults){
            this.mIsOpen = true;
            this.mInput.popupOpen = true;
        }
    },
    closePopup: function(){
        if(!this.mInput)
            return;
        var isOpen = this.mInput.popupOpen;
        if(!isOpen)
            return;
        var popup = this.mInput.popup;
        popup.selectedIndex = -1;
        this.mIsOpen = false;
        this.mInput.popupOpen = false;
    },
    startSearch: function() {
        var input = this.mInput;
        this.mSearchStatus = STATUS_SEARCHING;
        this.mDefaultIndexCompleted = false;

        var count = this.mSearches.length;
        this.mSearchesOngoing = count;
        this.mFirstSearchResult = true;

        input.onSearchBegin();

        var nSearchFails = 0;
        for(var i=0; i<count; i++){
            var search = this.mSearches[i];
            var result = this.mResults[i];
            if(result){
                var nSearchResult = result.searchResult;
                if(nSearchResult != ACResult.RESULT_SUCCESS 
                    && nSearchResult != ACResult.RESULT_SUCCESS_ONGOING){
                    result = null;
                }
            }
            var sSearchParam;
            try {
                sSearchParam = input.searchParam;
            } catch(e){
                return;
            }
            try {
                search.startSearch(this.mSearchString, sSearchParam, result, this);
            } catch(e){
                ++nSearchFails;
                --this.mSearchesOnGoing;
            }
        }
        if(nSearchFails == count ){
            this.postSearchCleanup();
        }
    },
    stopSearch: function() {
        this.clearSearchTimer();
        if(this.mSearchStatus == STATUS_SEARCHING){
            var count = this.mSearches.length;
            for(var i=0; i<count; i++){
                var search = this.mSearches[i];
                search.stopSearch();
            }
            this.mSearchesOnGoing = 0;
            this.postSearchCleanup();
        }
    },
    startSearchTimer: function(){
        if(this.mTimer || !this.mInput)
            return;
        var timeout = this.mInput.timeout;
        try {
            this.mTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        }catch(e){
            return;
        }
        try{
            this.mTimer.initWithCallback(this, timeout, Ci.nsITimer.TYPE_ONE_SHOT);
        } catch(e){
            this.mTimer = null;
        }
    },
    clearSearchTimer: function(){
        if(this.mTimer){
            this.mTimer.cancel();
            this.mTimer = null;
        }
    },
    enterMatch: function(aIsPopupSelection){
        if(this.mSearchStatus == STATUS_SEARCHING){
            this.mEnterAfterSearch = aIsPopupSelection ? 2 : 1;
            return;
        }
        this.mEnterAfterSearch = 0;
        var input = this.mInput;
        var popup = input.popup;
        var forceComplete = input.forceComplete;
        var value = popup.overrideValue;
        if(value == null || value.length == 0){
            var completeSelection = input.completeSelectedIndex;
            var selectedIndex = popup.selectedIndex;
            if(selectedIndex >= 0 && (!completeSelection || aIsPopupSelection)){
                value = this.getResultValueAt(selectedIndex, true);
            }
            if(forceComplete && (value==null || value.length == 0)){
                var count = this.mSearches.length;
                for(var i=0; i<count; i++){
                    var result = this.mResults[i];
                    if(result){
                        var defaultIndex = result.defaultIndex;
                        if(defaultIndex >= 0){
                            value = result.getValueAt(defaultIndex);
                            break;
                        }
                    }
                }
            }
        }
        var obsSvc = Cc["@mozilla.org/observer-service;1"]
            .getService(Ci.nsIObserverService);
        obsSvc.notifyObservers(input, "autocomplete-will-enter-text", null);

        if (value!=null && value.length != 0) {
            input.textValue = value;
            input.selectTextRange(value.length, value.length);
            this.mSearchString = value;
        }

        obsSvc.notifyObservers(input, "autocomplete-did-enter-text", null);
        this.closePopup();
        input.onTextEntered();
    },
    revertTextValue: function(){
        if (!this.mInput)
            return ;

        var oldValue = this.mSearchString;
        var input = this.mInput;
        var cancel = input.onTextReverted();

        if (!cancel) {
            var obsSvc = Cc["@mozilla.org/observer-service;1"]
                .getService(Ci.nsIObserverService);
            obsSvc.notifyObservers(input, "autocomplete-will-revert-text", null);
            input.textValue = oldValue;
            obsSvc.notifyObservers(input, "autocomplete-did-revert-text", null);
        }
    },
    processResult: function(aSearchIndex, aResult){
        var input = this.mInput;
        if(this.mFirstSearchResult){
            this.clearResults();
            this.mFirstSearchResult = false;
        }
        var result; 
        try {
            result = aResult.searchResult;
        } catch(e){
            result = 0;
        }
        // if our results are incremental, the search is still ongoing
        if (result != ACResult.RESULT_SUCCESS_ONGOING &&
                result != ACResult.RESULT_NOMATCH_ONGOING) {
            --this.mSearchesOngoing;
        }

        var oldMatchCount = 0;
        var matchCount = 0;
        if (aResult)
            matchCount = aResult.matchCount;

        var oldIndex = this.mResults.indexOf(aResult);
        if (oldIndex == -1) {
            // cache the result
            this.mResults.push(aResult);
            this.mMatchCounts.push(matchCount);
        }
        else {
            // replace the cached result
            this.mResults[oldIndex] = aResult;
            oldMatchCount = this.mMatchCounts[aSearchIndex];
            this.mMatchCounts[oldIndex] = matchCount;
        }

        var oldRowCount = this.mRowCount;
        // If the search failed, increase the match count 
        // to include the error description
        if (result == ACResult.RESULT_FAILURE) {
            var error = aResult.errorDescription;
            if (error && error.length != 0) {
                ++this.mRowCount;
                if (this.mTree)
                    this.mTree.rowCountChanged(oldRowCount, 1);
            }
        } else if (result == ACResult.RESULT_SUCCESS ||
                result == ACResult.RESULT_SUCCESS_ONGOING) {
            // Increase the match count for all matches in this result
            this.mRowCount += matchCount - oldMatchCount;

            if (this.mTree)
                this.mTree.rowCountChanged(oldRowCount, matchCount - oldMatchCount);

            // Try to autocomplete the default index for this search
            this.completeDefaultIndex(aSearchIndex);
        }

        // Refresh the popup view to display the new search results
        var popup = input.popup;
        popup.invalidate();

        // Make sure the popup is open, if necessary, since we now have at least one
        // search result ready to display. Don't force the popup closed if we might
        // get results in the future to avoid unnecessarily canceling searches.
        if (this.mRowCount)
            this.openPopup();
        else if (result != ACResult.RESULT_NOMATCH_ONGOING)
            this.closePopup();

        if (this.mSearchesOngoing == 0) {
            // If this is the last search to return, cleanup
            this.postSearchCleanup();
        }
        else if (this.mEnterAfterSearch) {
            // since we still have searches ongoing (mSearchesOngoing != 0)
            // and the user has hit enter, stop the searches
            this.stopSearch();
        }
    },
    completeDefaultIndex: function(aSearchIndex){
        if (this.mDefaultIndexCompleted || this.mEnterAfterSearch 
                || this.mBackspaced || this.mRowCount == 0 
                || this.mSearchString.length == 0)
            return ;

        var shouldComplete = this.mInput.completeDefaultIndex;
        if (!shouldComplete)
            return ;

        var search = this.mSearches[aSearchIndex];
        var result = this.mResults[aSearchIndex];

        // The search must explicitly provide a default index in order
        // for us to be able to complete 
        var defaultIndex = result.defaultIndex;
        var resultValue = result.getValueAt(defaultIndex);
        this.completeValue(resultValue, true);
        this.mDefaultIndexCompleted = true;
    },
    completeValue: function(aValue, selectDifference){
        var len = this.mSearchString.length;
        var endSelect = aValue.length;  // By default, select all of aValue.
        if (aValue.length==0 || (aValue.length >= len 
                    && strcasecmp(aValue.substr(0, len),this.mSearchString) ) ) {
            this.mInput.textValue = aValue;
        } else {
            var findIndex;
            var ios = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService);
            var scheme = ios.extractSchema(utf16to8(aValue));
            if (!scheme) {
                findIndex = 7; // length of "http://"
                if ((endSelect < findIndex + len) ||
                   !strcasecmp(scheme, "http") ||
                   !strcasecmp(aValue.substr(findIndex, len),this.mSearchString )) {
                    return ;
                }
            } else {
                var iter, end;
                aValue.BeginReading(iter);
                aValue.EndReading(end);
                var start = iter.get();
                ++iter;  // Skip past beginning since we know that doesn't match

                FindInReadable(mSearchString, iter, end, 
                        nsCaseInsensitiveStringComparator());

                findIndex = iter.get() - start;
            }

            this.mInput.textValue = this.mSearchString 
                + aValue.substr( len + findIndex, endSelect);

            endSelect -= findIndex; // We're skipping this many characters of aValue.
        }

        this.mInput.selectTextRange(selectDifference ? 
                len : endSelect, endSelect);
    },
    getResultValueAt: function(aIndex, aValueOnly){
        // hook here
        if(!this.mcResults[aIndex])
            return null;
        return this.mcResults[aIndex].value;
        var retVal;
        var tmp = this.rowIndexToSearch(aIndex );
        var searchIndex = tmp.searchIndex;
        var rowIndex = tmp.rowIndex;

        var result = this.mResults[searchIndex];
        var searchResult = result.searchResult;

        if (searchResult == ACResult.RESULT_FAILURE) {
            if (aValueOnly)
                return null;
            retVal = result.errorDescription();
        } else if (searchResult == ACResult.RESULT_SUCCESS ||
                searchResult == ACResult.RESULT_SUCCESS_ONGOING) {
            retVal = result.getValueAt(rowIndex);
        }
        return retVal;
    },
    clearResults: function(){
        // hook here
        var oldRowCount = this.mRowCount;
        this.mRowCount = 0;
        this.mResults = [];
        this.mcResults= [];
        this.mMatchCounts = [];
        if (oldRowCount != 0) {
            if (this.mTree)
                this.mTree.rowCountChanged(0, -oldRowCount);
            else if (this.mInput) {
                var popup = this.mInput.popup;
                popup.selectedIndex = -1;
            }
        }
    },
    postSearchCleanup: function(){
        var input = this.mInput;
        if (this.mRowCount) {
            this.openPopup();
            this.mSearchStatus = STATUS_COMPLETE_MATCH;
        } else {
            this.mSearchStatus = STATUS_COMPLETE_NO_MATCH;
            this.closePopup();
        }

        input.onSearchComplete();
        if (this.mEnterAfterSearch)
            this.enterMatch(this.mEnterAfterSearch == 2);
    },
    rowIndexToSearch: function(aRowIndex){
        var searchIndex = -1;
        var itemIndex = -1;

        var count = this.mSearches.length;
        var index = 0;

        for (var i = 0; i < count; ++i) {
            var result = this.mResults[i];
            if (!result)
                continue;

            var searchResult = result.searchResult;
            var rowCount = 0;
            if (searchResult == ACResult.RESULT_SUCCESS ||
                   searchResult == ACResult.RESULT_SUCCESS_ONGOING) {
                rowCount = result.matchCount;
            }

            if ((rowCount != 0) && (index + rowCount-1 >=  aRowIndex)) {
                searchIndex = i;
                itemIndex = aRowIndex - index;
                var tmp = {searchIndex: searchIndex, rowIndex: itemIndex};
                return tmp;
            }

            // Advance the popup table index cursor past the
            // results of the current search.
            index += rowCount;
        }
        var tmp = {searchIndex: searchIndex, rowIndex: itemIndex};
        return tmp;
    },
    ///////////////////////////////////////////////////////////////////
    // nsITreeView
    get rowCount(){
        return this.mRowCount;
    },

    getRowProperties: function(index, properties) {
        var currentIndex = this.mSelection.currentIndex;
    },

    getCellProperties:function(row, col) {
        this.getRowProperties(row, properties);

        if (row >= 0) {
            var className = this.getStyleAt(row);
            if (className.length != 0) {
                var atomSvc = Cc["@mozilla.org/atom-service;1"]
                    .getService(Ci.nsIAtomService);
                var atom = atomSvc.getAtom(className);
                properties.push(atom);
            }
        }
    },

    getColumnProperties : function(col, properties) { 
    },

    getImageSrc:function(row, col){
        var retVal="";
        var colID = col.getIdConst();

        if ("treecolAutoCompleteValue" == colID){
            retVal = this.getImageAt(row);
        }
        return retVal;
    },

    getProgressMode:function(row, col) {
        return "";
    },

    getCellValue:function(row, col) {  
        return "";
    },

    getCellText: function(row, col) {
        var colID = col.getIdConst();
        var retVal = "";
        if ("treecolAutoCompleteValue" == colID){
            retVal = this.getValueAt(row);
        }
        else if ("treecolAutoCompleteComment"==colID){
            retVal = this.getCommentAt(row);
        } else {
            retVal = "Who Calls me here?";
        }

        return retVal;
    },

    isContainer:function(index) {
        return false;
    },

    isContainerOpen:function(index) {
    },

    isContainerEmpty:function(index) {
    },

    getLevel:function(index) {
        return 0;
    },

    getParentIndex:function(rowIndex) {
        return -1;
    },

    hasNextSibling:function(rowIndex, afterIndex) {
        return false;
    },

    toggleOpenState:function(index) {
    },

    setTree:function(tree) {
        this.mTree = tree;
    },

    getSelection:function() {
        return this.mSelection;
    },

    setSelection:function(aSelection) {
        this.mSelection = aSelection;
    },

    selectionChanged:function() {
    },

    setCellValue:function(row, col, value) {
    },

    setCellText:function(row, col, value) {
    },

    cycleHeader:function(col) {
    },

    cycleCell:function(row, col) {
    },

    isEditable:function(row, col) {
        return false;
    },

    isSelectable:function(row, col) {
        return false;
    },

    isSeparator:function(index) {
        return false;
    },

    isSorted:function() {
        return false;
    },

    canDrop:function(index, orientation) {
        return false;
    },

    drop:function(row, orientation) {
    },

    performAction:function(action) {
    },

    performActionOnRow:function(action, row) {
    },

    performActionOnCell:function(action, row, col) {
    },

    /* Common Components */
    QueryInterface: function(aIID){
        if (!aIID.equals(Ci.nsIAutoCompleteController) 
                && !aIID.equals(Ci.nsITreeView)
                && !aIID.equals(Ci.nsIAutoCompleteObserver)
                && !aIID.equals(Ci.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
        return this;
    },
};


