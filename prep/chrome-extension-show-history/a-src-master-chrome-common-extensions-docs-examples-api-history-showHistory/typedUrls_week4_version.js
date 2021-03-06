// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Event listner for clicks on links in a browser action popup.
// Open the link in a new tab of the current window.
function onAnchorClick(event) {
  chrome.tabs.create({
    selected: true,
    url: event.srcElement.href
  });
  return false;
}

// Given an array of URLs, build a DOM list of those URLs in the
// browser action popup.
function buildPopupDom(divName, data) {
  var popupDiv = document.getElementById(divName);

  var ul = document.createElement('ul');
  popupDiv.appendChild(ul);

  for (var i = 0, ie = data.length; i < ie; ++i) {
    var a = document.createElement('a');
    a.href = data[i];
    a.appendChild(document.createTextNode(data[i]));
    a.addEventListener('click', onAnchorClick);

    var li = document.createElement('li');
    li.appendChild(a);

    ul.appendChild(li);
  }
}

// Search history to find up to ten links that a user has typed in,
// and show those links in a popup.
function buildTypedUrlList(divName) {
  // To look for history items visited in the last week,
  // subtract a week of microseconds from the current time.
  // var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  // var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

  // @Jiamin change from week to year
  var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7 * 31 * 12;
  var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

  // Track the number of callbacks from chrome.history.getVisits()
  // that we expect to get.  When it reaches zero, we have all results.
  var numRequestsOutstanding = 0;

  //@Jiamin, map visitId to url
  var visitIdUrl = {};
  var stringPopArray = [];

  chrome.history.search({
      // 'text': '',              // Return every history item....
      // @Jiamin, search in certain sites.
      'text': 'ucsd.edu',              // Return every history item....
      'startTime': oneWeekAgo  // that was accessed less than one week ago.
    },
    function(historyItems) {
      // For each history item, get details on all visits.
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        var processVisitsWithUrl = function(url) {
          // We need the url of the visited item to process the visit.
          // Use a closure to bind the  url into the callback's args.
          return function(visitItems) {
            processVisits(url, visitItems);
          };
        };
        chrome.history.getVisits({url: url}, processVisitsWithUrl(url));
        // @Jiamin. move it down
        // numRequestsOutstanding++;
      }

      //@Jiamin. iterate again
      for(var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        var outputReferring = function(url) {
          return function(visitItems) {
            searchReferring(url, visitItems);
          };
        };
        chrome.history.getVisits({url:url}, outputReferring(url));
        numRequestsOutstanding++;
      }

      // @Jiamin. output
      console.log("hi length:\t" + stringPopArray.length);
      buildPopupDom(divName, stringPopArray.slice(0, 25));

      if (!numRequestsOutstanding) {
        onAllVisitsProcessed();
      }
    });

  // @Jiamin. search referring visit id
  var searchReferring = function(url, visitItems) {
    for (var i = 0, ie = visitItems.length; i < ie; ++i) {

      if(visitIdUrl[visitItems[i].referringVisitId])
      console.log(visitItems[i].transition + ":\t " +"From: \t"+visitIdUrl[visitItems[i].referringVisitId] + "\tTo:\t" +url);
      var o = {'type':visitItems[i].transition,
        "from":visitIdUrl[visitItems[i].referringVisitId],
        "to":url};
      o.toString = function printItem(){
          return "From:"+this.from+"\nTo:"+this.to+"\n\n";
        }
      stringPopArray.push(o);
      //console.log("h:\t" + stringPopArray.length);
    }
    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };


  // Maps URLs to a count of the number of times the user typed that URL into
  // the omnibox.
  var urlToCount = {};

  // Callback for chrome.history.getVisits().  Counts the number of
  // times a user visited a URL by typing the address.
  var processVisits = function(url, visitItems) {
    for (var i = 0, ie = visitItems.length; i < ie; ++i) {

      // @Jiamin
      // test transition type
      // console.log(visitItems[i].transition + ":\t\t " +  url + ":\t\t" + visitItems[i].referringVisitId + ":\t\t" + visitItems[i].visitId + ":\t\t" + visitItems[i].id + ":\t\t" + i);
      // if (visitItems[i].transition == 'typed') {
      //   console.log(visitItems[i].transition + ":\t\t " +  url);
      // }

      // want to search visitId, this not works.
      // for(var j = 0; j < ie; ++j){
      //   if(visitItems[i].referringVisitId == visitItems[j].visitId){
      //     console.log("referring id: " + visitItems[j].id);
      //   }
      // }

      // most of them are undefined, should not output here.
      if (!visitIdUrl[visitItems[i].visitId]) {
        visitIdUrl[visitItems[i].visitId] = "";
      }
      visitIdUrl[visitItems[i].visitId] = url;
      // console.log("Referring: \t"+visitIdUrl[visitItems[i].referringVisitId]);
      
      // Ignore items unless the user typed the URL.
      // if (visitItems[i].transition != 'typed') {
      //   continue;
      // }

      // @Jiamin not dealing with 'typed'
      // if (visitItems[i].transition != 'keyword_generated') {
      //   continue;
      // }

      if (!urlToCount[url]) {
        urlToCount[url] = 0;
      }

      urlToCount[url]++;
    }

    // If this is the final outstanding call to processVisits(),
    // then we have the final results.  Use them to build the list
    // of URLs to show in the popup.
    // if (!--numRequestsOutstanding) {
    //   onAllVisitsProcessed();
    // }
  };

  // This function is called when we have the final list of URls to display.
  var onAllVisitsProcessed = function() {
    // Get the top scorring urls.
    // urlArray = [];
    // for (var url in urlToCount) {
    //   urlArray.push(url);
    // }

    //@Jiamin. push to new array
    urlArray = [];
    for (var i = 0, ie = stringPopArray.length; i < ie; ++i) {
      console.log("string: \t" + stringPopArray[i]);
      urlArray.push(stringPopArray[i]);
    }

    // Sort the URLs by the number of times the user typed them.
    // @Jiamin. Do not sort
    // urlArray.sort(function(a, b) {
    //   return urlToCount[b] - urlToCount[a];
    // });

    // buildPopupDom(divName, urlArray.slice(0, 10));
    // @Jiamin change size.
    // buildPopupDom(divName, urlArray.slice(0, 25));
    // @Jiamin change output.
    console.log("hi:\t" + stringPopArray[0]);
    buildPopupDom(divName, stringPopArray.slice(0, 25));
  };
}

var download = function(format) {
  document.getElementById('json').innerText = "preparing file...";

  
}

document.addEventListener('DOMContentLoaded', function () {
  window.data = document.getElementById('data');
  buildTypedUrlList("typedUrl_div");
  document.getElementById('json').onclick = function(){
    download('json');
  };
});