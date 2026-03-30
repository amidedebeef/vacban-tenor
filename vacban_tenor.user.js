// ==UserScript==
// @name         VacBan - Tenor GIF
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a Tenor button to VacBan.wtf editor to insert GIFs via BBCode (Tenor V1)
// @author       AMIAY_seg
// @match        *://vacban.wtf/*
// @grant        none
// @updateURL   
// @downloadURL 
// ==/UserScript==

(function() {
    'use strict';
    const TENOR_API_KEY = "LIVDSRZULELA";
    const LIMIT = 21;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = "" +
        "#tenor-popup { display: none; position: absolute; z-index: 10000; width: 320px; background: #2c2c2c; border: 1px solid #444; border-radius: 4px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); padding: 10px; font-family: sans-serif; color: white; }\n" +
        "#tenor-search-input { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #1a1a1a; color: white; margin-bottom: 10px; box-sizing: border-box; outline: none; }\n" +
        "#tenor-search-input:focus { border-color: #00b0ff; }\n" +
        "#tenor-results { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; max-height: 250px; overflow-y: auto; padding-right: 5px; }\n" +
        ".tenor-gif { width: 100%; height: 70px; object-fit: cover; cursor: pointer; border-radius: 4px; transition: opacity 0.1s; }\n" +
        ".tenor-gif:hover { opacity: 0.7; }\n" +
        "#tenor-btn svg { vertical-align: middle; }\n" +
        ".tenor-message { text-align: center; color: #aaa; font-size: 13px; grid-column: 1 / -1; padding: 20px 0; }\n" +
        "#tenor-results::-webkit-scrollbar { width: 6px; }\n" +
        "#tenor-results::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 4px; }\n" +
        "#tenor-results::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }";
    document.head.appendChild(styleSheet);

    const popup = document.createElement('div');
    popup.id = 'tenor-popup';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'tenor-search-input';
    searchInput.placeholder = 'Search Tenor...';
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'tenor-results';
    
    popup.appendChild(searchInput);
    popup.appendChild(resultsDiv);
    document.body.appendChild(popup);

    const closePopup = function() {
        popup.style.display = 'none';
    };

    document.addEventListener('click', function(e) {
        if (popup.style.display === 'block' && !popup.contains(e.target) && !e.target.closest('#tenor-btn')) {
            closePopup();
        }
    });

    const searchGifs = function(query) {
        let url = "https://api.tenor.com/v1/trending?key=" + TENOR_API_KEY + "&limit=" + LIMIT;
        if (query && query.trim() !== "") {
            url = "https://api.tenor.com/v1/search?q=" + encodeURIComponent(query) + "&key=" + TENOR_API_KEY + "&limit=" + LIMIT;
        }

        resultsDiv.innerHTML = '<div class="tenor-message">Loading...</div>';

        fetch(url)
            .then(function(response) {
                if (!response.ok) throw new Error("HTTP error " + response.status);
                return response.json();
            })
            .then(function(data) {
                resultsDiv.innerHTML = '';
                if (data.results && data.results.length > 0) {
                    data.results.forEach(function(result) {
                        if (result.media && result.media[0]) {
                            const img = document.createElement('img');
                            const gifUrl = result.media[0].gif.url;
                            img.src = result.media[0].nanogif.url;
                            img.className = 'tenor-gif';
                            img.onclick = function() {
                                insertGif(gifUrl);
                                closePopup();
                            };
                            resultsDiv.appendChild(img);
                        }
                    });
                } else {
                    resultsDiv.innerHTML = '<div class="tenor-message">No results found.</div>';
                }
            })
            .catch(function(error) {
                resultsDiv.innerHTML = '<div class="tenor-message">Error: ' + error.message + '</div>';
            });
    };

    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchGifs(searchInput.value);
        }
    });

    const insertGif = function(url) {
        const bbcode = "[IMG]" + url + "[/IMG]";
        if (typeof window.XF !== 'undefined' && window.XF.insertIntoEditor) {
            const editor = document.querySelector('.js-editor');
            if (editor && typeof jQuery !== 'undefined') {
                window.XF.insertIntoEditor(jQuery(editor), bbcode, bbcode);
                return;
            }
        }
        const textarea = document.querySelector('textarea[name="message"]');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const val = textarea.value;
            textarea.value = val.substring(0, start) + bbcode + val.substring(end);
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const injectButton = function() {
        const toolbar = document.querySelector('.fr-toolbar');
        if (!toolbar || document.getElementById('tenor-btn')) return;

        if (toolbar.closest('#siropuChat') || toolbar.closest('.siropuChat')) {
            return;
        }

        const btnGroups = toolbar.querySelectorAll('.fr-btn-grp');
        const targetGrp = btnGroups.length > 2 ? btnGroups[2] : btnGroups[0];
        
        if (!targetGrp) return;

        const btn = document.createElement('button');
        btn.id = 'tenor-btn';
        btn.type = 'button';
        btn.className = 'fr-command fr-btn';
        btn.title = 'Tenor GIF';
        
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 4H4V28H12.5V17H19.5V28H28V4H12.5ZM23.5 13H8.5V8.5H23.5V13Z" fill="#00b0ff"/></svg>';

        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (popup.style.display === 'block') {
                closePopup();
                return;
            }

            const rect = btn.getBoundingClientRect();
            popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            popup.style.left = (rect.left + window.scrollX) + 'px';
            popup.style.display = 'block';
            
            searchInput.focus();
            
            if (resultsDiv.children.length === 0) {
                searchGifs('');
            }
        };

        targetGrp.appendChild(btn);
    };

    const observer = new MutationObserver(function() {
        if (document.querySelector('.fr-toolbar') && !document.getElementById('tenor-btn')) {
            injectButton();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectButton, 1000);
})();
