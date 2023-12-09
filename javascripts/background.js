//server = "http://127.0.0.1:3000";
server = "https://readermode.io";

// Open reader
function startReaderMode(tab) {
  chrome.scripting.executeScript(
    {
      target: {tabId: tab.id, allFrames: true},
      files: [
        "javascripts/readability.js",
        "javascripts/jquery-3.4.1.min.js",
        "javascripts/jquery-ui.min.js",
        "javascripts/fullscreen.min.js",
        "javascripts/articulate.min.js",
        "javascripts/rangy.js",
        "javascripts/tag-it.js",
        "javascripts/content.js"
      ]
    }
  );
}

// Open login modal
function openLoginModal (tab) {
  setTimeout(function() {
    chrome.scripting.executeScript(
      {
        target: {tabId: tab.id, allFrames: true},
        files: [
          "javascripts/jquery-3.4.1.min.js",
          //"javascripts/login.js"
        ]
      }
    );
  }, 1000);
}

// Open activation modal
function openActivationModal (tab) {
  setTimeout(function() {
    chrome.scripting.executeScript(
      {
        target: {tabId: tab.id, allFrames: true},
        files: [
          "javascripts/jquery-3.4.1.min.js",
          //"javascripts/activation.js"
        ]
      }
    );
  }, 1000);
}

// Proxy for opening Reader/Login/Activation
function init(tab) {
  startReaderMode(tab);

  var url = `${server}/api/auths/cookie`;
  fetch(url).then(response => {
    return response.json()
  }).then(data => {
    if (data.response && data.response.status == 403) {
      // Remove user data
      chrome.storage.local.remove('cr_user', function (result) {});

      console.log('Login data has expired.');
      openLoginModal(tab);
    } else {
      if (data.response.premium_member == true)  {

        // Save user data
        var user = {
          id: data.response.id,
          name: data.response.name,
          email: data.response.email,
          hash_id: data.response.hash_id,
          app_setting_existed: data.response.app_setting_existed
        }
        chrome.storage.local.set({cr_user: user});

      } else {
        // Remove user data
        chrome.storage.local.remove('cr_user', function (result) {});

        console.log("License hasn't been activated yet or has expired");
        openActivationModal(tab);
      }
    }
  })
  .catch(e => {
    console.log('The server cannot be reached.');
    openLoginModal(tab);
  })
}

// Listen for the extension's click
chrome.action.onClicked.addListener((tab) => {
  init(tab);
});

// Create contextMenu for user text selection
chrome.contextMenus.create({
  id: "view-selection",
  title: "View this selection in ReaderMode",
  contexts:["selection"]
});

// Create contextMenu for when user want to link with CR automatically
linkCMId = chrome.contextMenus.create({
  id: "view-linked-page",
  title: "View the linked page using ReaderMode",
  contexts:["link"]
});

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if(clickData.menuItemId == "view-selection") {
    chrome.tabs.query({ active: true }, function(tabs) {
      let tab = tabs[0];
      startReaderMode(tab);
    });
  } else if(clickData.menuItemId == "view-linked-page" && clickData.linkUrl) {
    chrome.tabs.create(
      { url: clickData.linkUrl, active: false },
      function(newTab) {
        startReaderMode(newTab);
      }
    );
  } else {
  }
});

// Pull settings from server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "pull-settings") {
      user = request.user;

      var url = `${server}/api/app_settings/pull`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })();

    }

    return true;
  }
);

// Push settings from server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "push-settings") {
      user = request.user;

      var url = `${server}/api/app_settings/push`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            app_setting: request.app_setting
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })();

    }

    return true;
  }
);

articles_checked_for_current_url = false;
// AutoRun setting if url match saved rules
chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
  //if (info.status === 'complete') {
    var url = new URL(tab.url);
    var protocol = url.protocol // http: or https:
    var domain = url.hostname; // domain name
    var pathname = url.pathname.substring(1); // use substring to remove '/' at the beginning

    /*
    * Checker List
    * if (pathname.indexOf("post") > -1)
    * pathname.indexOf(url_does_not_contain) === -1
    * pathname.startsWith("post")
    * pathname.endsWith("hunt")
    */
    chrome.storage.sync.get(['cr_auto_run_rules'], function(result) {
      let default_val = result.cr_auto_run_rules
      if (default_val) {
        rules = JSON.parse(default_val);

        for (var key in rules) {
          var id = rules[key]["id"];

          var domain_is = rules[key]["domain_name_is"];
          var url_is = rules[key]["url_is"];
          var url_is_not = rules[key]["url_is_not"];
          var url_contains = rules[key]["url_contains"];
          var url_does_not_contain = rules[key]["url_does_not_contain"];
          var url_starts_with = rules[key]["url_starts_with"];
          var url_ends_with = rules[key]["url_ends_with"];
          var url_rule_in_sentence = rules[key]["url_rule_in_sentence"];

          if ( (domain_is != "") && (url_is != "") && (url_is_not != "") && (url_contains != "") && (url_contains != "") &&
            (url_does_not_contain != "") && (url_starts_with != "") && (url_ends_with != "")
          ) {
            if ( (domain == domain_is) &&
              (url == url_is) &&
              (url != url_is_not) &&
              (pathname.indexOf(url_contains) > -1 ) &&
              (pathname.indexOf(url_does_not_contain) === -1 ) &&
              (pathname.startsWith(url_starts_with)) &&
              (pathname.endsWith(url_ends_with))
            ){
              startReaderMode(tab);
            }
          } else if ( (domain_is != "") && (url_is != "") && (url_is_not != "") && (url_contains != "") && (url_contains != "") && (url_does_not_contain != "") && (url_starts_with != "") ) {
            if ( (domain == domain_is) &&
              (url == url_is) &&
              (url != url_is_not) &&
              (pathname.indexOf(url_contains) > -1 ) &&
              (pathname.indexOf(url_does_not_contain) === -1 ) &&
              (pathname.startsWith(url_starts_with))
            ){
              startReaderMode(tab);
            }
          } else if ( (domain_is != "") && (url_is != "") && (url_is_not != "") && (url_contains != "") && (url_contains != "") && (url_does_not_contain != "") ) {
            if ( (domain == domain_is) &&
              (url == url_is) &&
              (url != url_is_not) &&
              (pathname.indexOf(url_contains) > -1 ) &&
              (pathname.indexOf(url_does_not_contain) === -1 )
            ){
              startReaderMode(tab);
            }
          } else if ( (domain_is != "") && (url_is != "") && (url_is_not != "") && (url_contains != "") && (url_contains != "") ) {
            if ( (domain == domain_is) &&
              (url == url_is) &&
              (url != url_is_not) &&
              (pathname.indexOf(url_contains) > -1 )
            ){
              startReaderMode(tab);
            }
          } else if ( (domain_is != "") && (url_is != "") && (url_is_not != "") ) {
            if ( (domain == domain_is) &&
              (url == url_is) &&
              (url != url_is_not)
            ){
              startReaderMode(tab);
            }
          } else if ( (domain_is != "") && (url_is != "") ) {
            if ( (domain == domain_is) &&
              (url == url_is)
            ){
              startReaderMode(tab);
            }
          } else if ( (domain_is != "") ) {
            if ( (domain == domain_is) ){
              startReaderMode(tab);
            }
          } else {
          }
        }
      }
    });

  //}
});

// Pull folders from server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "pull-folders") {
      user = request.user;

      var url = `${server}/api/folders/pull`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })();  

    }

    return true;
  }
);

// Create folder
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "create-folder") {
      user = request.user;
      folder = request.folder;

      var url = `${server}/api/folders/create`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            name: folder.name,
            parent_id: folder.parent_id
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 
    }

    return true;
  }
);

// Update folder
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-folder") {
      user = request.user;
      folder = request.folder;

      var url = `${server}/api/folders/update`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            name: folder.name,
            id: folder.id
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 
    }

    return true;
  }
);

// Delete folder
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "delete-folder") {
      user = request.user;
      folder = request.folder;

      var url = `${server}/api/folders/destroy`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            id: folder.id
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 
    }

    return true;
  }
);

// Update styles to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-styles") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/styles`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            font_family: settings.font_family,
            font_size: settings.font_size,
            line_height: settings.line_height,
            letter_space: settings.letter_space,
            max_width: settings.max_width,
            h1_size: settings.h1_size,
            h2_size: settings.h2_size,
            h3_size: settings.h3_size,
            h4_size: settings.h4_size,
            h5_size: settings.h5_size,
            h6_size: settings.h6_size
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Update theme to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-themes") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/themes`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            theme: settings.theme,
            background_color: settings.background_color,
            background_color_light: settings.background_color_light,
            background_color_dark: settings.background_color_dark,
            text_color: settings.text_color,
            text_color_light: settings.text_color_light,
            text_color_dark: settings.text_color_dark,
            link_color: settings.link_color,
            link_color_light: settings.link_color_light,
            link_color_dark: settings.link_color_dark,
            highlighter_color: settings.highlighter_color,
            highlighter_color_light: settings.highlighter_color_light,
            highlighter_color_dark: settings.highlighter_color_dark
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Update reader components to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-reader-components") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/reader_components`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            dark_panel: settings.dark_panel,
            display_footer: settings.display_footer,
            auto_scroll: settings.auto_scroll,
            scroll_speed: settings.scroll_speed,
            display_outline: settings.display_outline,
            display_images: settings.display_images,
            display_notes: settings.display_notes,
            display_meta: settings.display_meta,
            display_author: settings.display_author,
            display_reading_time: settings.display_reading_time,
            display_saved_info: settings.display_saved_info
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);




// Update ruler to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-ruler") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/ruler`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            display_ruler: settings.display_ruler,
            ruler_color: settings.ruler_color,
            ruler_height: settings.ruler_height,
            ruler_position: settings.ruler_position
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Update auto-run-rules to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-auto-run-rules") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/auto_run_rules`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            auto_run_rules: settings.auto_run_rules
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 


    }

    return true;
  }
);

// Update default css to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-default-css") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/default_css`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            default_css: settings.default_css
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Update translate to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-translate") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/translate`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            translate_to: settings.translate_to
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Update articulate to server
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "update-articulate") {
      user = request.user;
      settings = request.settings;

      var url = `${server}/api/app_settings/update/articulate`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            articulate_voice: settings.articulate_voice,
            articulate_rate: settings.articulate_rate,
            articulate_pitch: settings.articulate_pitch,
            articulate_volume: settings.articulate_volume
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Get saved article if any
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "get-article") {
      user = request.user;
      url = request.url;

      var url = `${server}/api/articles/get?user_id=${user.id}&hash_id=${user.hash_id}&url=${url}`;
      fetch(url).then(response => {
        return response.json()
      }).then(data => {
        sendResponse({data: data});
      })
      .catch(err => {
        sendResponse({data: "Server can't be reached."});
      })
    }

    return true;
  }
);

// Save given/current article
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "save-article") {
      user = request.user
      article = request.article;
      folder = request.folder;

      var url = `${server}/api/articles/save`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=utf-8'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            url: article.url,
            reading_time: article.reading_time,
            html: article.html,
            title: article.title,
            excerpt: article.excerpt,
            author: article.author,
            tag_list: article.tag_list,
            folder_id: folder.id
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Remove given/current article
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "remove-article") {
      user = request.user;
      url = request.url;

      var api_url = `${server}/api/articles/delete`;
      (async () => {
        const rawResponse = await fetch(api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=utf-8'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            url: url
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);

// Change folder of the saved article
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.query == "change-folder") {
      user = request.user
      article = request.article;
      folder = request.folder;

      var url = `${server}/api/articles/change_folder`;
      (async () => {
        const rawResponse = await fetch(url, {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            hash_id: user.hash_id,
            url: article.url,
            folder_id: folder.id
          })
        });
        const content = await rawResponse.json();

        sendResponse({data: content});

        console.log(content);
      })(); 

    }

    return true;
  }
);
