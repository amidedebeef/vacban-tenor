// ==UserScript==
// @name         VacBan - Tenor GIF Pro+
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Tenor GIF Search with Favorites, Categories, Infinite Scroll and Hover Preview for VacBan.wtf
// @author       AMIAY_seg
// @match        *://vacban.wtf/*
// @grant        none
// @updateURL   https://github.com/amidedebeef/vacban-tenor/raw/refs/heads/main/vacban_tenor.user.js
// @downloadURL https://github.com/amidedebeef/vacban-tenor/raw/refs/heads/main/vacban_tenor.user.js
// ==/UserScript==

(function() {
    'use strict';
    const TENOR_API_KEY = "LIVDSRZULELA";
    const LIMIT = 10;
    const HOVER_DELAY = 320;

    let current_pos = "";
    let current_query = "";
    let is_loading = false;
    let current_view = "categories";
    let hover_timeout = null;

    const categories = [
        "Trending", "oh my god..", "Crazy", "uh..", "ew", "shocked",
        "angry", "but why", "waouh", "hehe", "rich", "cute cat", "cute dog"
    ];

    const styleSheet = document.createElement("style");
    styleSheet.innerText = "" +
        "#tenor-popup { display: none; position: absolute; z-index: 10000; width: 340px; background: #1e1e2d; border: 1px solid #2b2b40; border-radius: 9px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); padding: 0; font-family: 'Poppins', 'Helvetica Neue', Helvetica, Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', sans-serif; color: #a1a5b7; overflow: hidden; }\n" +
        "#tenor-header { background: #1e1e2d; padding: 12px 15px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #2b2b40; display: flex; justify-content: space-between; align-items: center; color: #fff; }\n" +
        "#tenor-back { cursor: pointer; color: #009ef7; margin-right: 10px; display: none; transition: color 0.3s; }\n" +
        "#tenor-back:hover { color: #fff; }\n" +
        "#tenor-search-container { padding: 10px 15px; border-bottom: 1px solid #2b2b40; }\n" +
        "#tenor-search-input { width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid #2b2b40; background: #2b2b40; color: #a1a5b7; box-sizing: border-box; outline: none; font-size: 13px; transition: border-color 0.3s, color 0.3s; }\n" +
        "#tenor-search-input:focus { border-color: #009ef7; color: #fff; }\n" +
        "#tenor-results { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-height: 380px; overflow-y: auto; padding: 15px; }\n" +
        ".tenor-item { position: relative; width: 100%; height: 95px; border-radius: 6px; overflow: hidden; cursor: pointer; background: #2b2b40; }\n" +
        ".tenor-gif { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }\n" +
        ".tenor-item:hover .tenor-gif { transform: scale(1.05); }\n" +
        ".tenor-fav-btn { position: absolute; top: 6px; right: 6px; color: #fff; font-size: 16px; opacity: 0; transition: opacity 0.2s, color 0.2s; text-shadow: 0 0 4px rgba(0,0,0,0.9); z-index: 5; }\n" +
        ".tenor-item:hover .tenor-fav-btn { opacity: 1; }\n" +
        ".tenor-fav-btn.active { opacity: 1; color: #ffc700; }\n" +
        ".tenor-cat-tile { position: relative; height: 75px; border-radius: 6px; overflow: hidden; cursor: pointer; background: #2b2b40; transition: transform 0.2s; }\n" +
        ".tenor-cat-tile:hover { transform: scale(1.02); }\n" +
        ".tenor-cat-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; text-align: center; font-size: 12px; font-weight: 600; color: #fff; transition: background 0.2s; text-transform: capitalize; padding: 5px; }\n" +
        ".tenor-cat-tile:hover .tenor-cat-overlay { background: rgba(0,0,0,0.2); }\n" +
        "#tenor-big-preview { display: none; position: fixed; z-index: 10001; width: 220px; height: auto; background: #1e1e2d; border: 1px solid #009ef7; border-radius: 9px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); pointer-events: none; overflow: hidden; }\n" +
        "#tenor-big-preview img { width: 100%; height: 100%; display: block; }\n" +
        ".tenor-message { text-align: center; color: #5e6278; font-size: 12px; grid-column: 1 / -1; padding: 15px 0; }\n" +
        "#tenor-results::-webkit-scrollbar { width: 6px; }\n" +
        "#tenor-results::-webkit-scrollbar-thumb { background: #2b2b40; border-radius: 6px; }\n" +
        "#tenor-results::-webkit-scrollbar-track { background: #1e1e2d; }";
    document.head.appendChild(styleSheet);

    const getFavs = () => JSON.parse(localStorage.getItem('tenor_favs') || '[]');
    const toggleFav = (gif, e) => {
        e.stopPropagation();
        let favs = getFavs();
        const index = favs.findIndex(f => f.url === gif.url);
        if (index > -1) favs.splice(index, 1);
        else favs.push(gif);
        localStorage.setItem('tenor_favs', JSON.stringify(favs));
        if (current_view === 'favorites') renderFavorites();
        else e.target.classList.toggle('active');
    };

    const popup = document.createElement('div');
    popup.id = 'tenor-popup';
    popup.innerHTML = `
        <div id="tenor-header">
            <div style="display: flex; align-items: center;">
                <span id="tenor-back">◀</span>
                <span>GIF Search</span>
            </div>
            <span id="tenor-close" style="cursor:pointer; font-size:16px;">&times;</span>
        </div>
        <div id="tenor-search-container">
            <input type="text" id="tenor-search-input" placeholder="Search GIFs or browse categories...">
        </div>
        <div id="tenor-results"></div>
    `;
    document.body.appendChild(popup);

    const previewBox = document.createElement('div');
    previewBox.id = 'tenor-big-preview';
    document.body.appendChild(previewBox);

    const resultsDiv = popup.querySelector('#tenor-results');
    const searchInput = popup.querySelector('#tenor-search-input');
    const backBtn = popup.querySelector('#tenor-back');
    const closeBtn = popup.querySelector('#tenor-close');

    const showBigPreview = (src, rect) => {
        previewBox.innerHTML = `<img src="${src}">`;
        previewBox.style.display = 'block';

        let left = rect.left - 230;
        if (left < 10) left = rect.right + 10;

        let top = rect.top - 20;
        if (top + 200 > window.innerHeight) top = window.innerHeight - 220;
        if (top < 10) top = 10;

        previewBox.style.left = left + 'px';
        previewBox.style.top = top + 'px';
    };

    const renderItem = (gif) => {
        const isFav = getFavs().some(f => f.url === gif.url);
        const div = document.createElement('div');
        div.className = 'tenor-item';
        div.innerHTML = `
            <img src="${gif.preview}" class="tenor-gif" loading="lazy">
            <span class="tenor-fav-btn ${isFav ? 'active' : ''}">★</span>
        `;

        div.onclick = () => insertGif(gif.url);
        div.querySelector('.tenor-fav-btn').onclick = (e) => toggleFav(gif, e);

        div.onmouseenter = () => {
            hover_timeout = setTimeout(() => {
                showBigPreview(gif.url, div.getBoundingClientRect());
            }, HOVER_DELAY);
        };
        div.onmouseleave = () => {
            clearTimeout(hover_timeout);
            previewBox.style.display = 'none';
        };

        return div;
    };

    const renderCategories = () => {
        current_view = "categories";
        current_pos = "";
        backBtn.style.display = 'none';
        resultsDiv.innerHTML = '';

        const favTile = document.createElement('div');
        favTile.className = 'tenor-cat-tile';
        favTile.style.background = '#009ef7';
        favTile.innerHTML = `<div class="tenor-cat-overlay" style="background: rgba(0,158,247,0.6)">Favorites ★</div>`;
        favTile.onclick = renderFavorites;
        resultsDiv.appendChild(favTile);

        categories.forEach(cat => {
            const tile = document.createElement('div');
            tile.className = 'tenor-cat-tile';
            tile.innerHTML = `<div class="tenor-cat-overlay">${cat}</div>`;
            tile.onclick = () => {
                current_query = cat;
                current_pos = "";
                resultsDiv.innerHTML = '';
                searchGifs(cat);
            };
            resultsDiv.appendChild(tile);

            const url = cat === "Trending" ?
                `https://api.tenor.com/v1/trending?key=${TENOR_API_KEY}&limit=1` :
                `https://api.tenor.com/v1/search?q=${encodeURIComponent(cat)}&key=${TENOR_API_KEY}&limit=1`;

            fetch(url).then(r => r.json()).then(data => {
                if (data.results && data.results[0]) {
                    tile.style.backgroundImage = `url(${data.results[0].media[0].nanogif.url})`;
                    tile.style.backgroundSize = 'cover';
                }
            });
        });
    };

    const renderFavorites = () => {
        current_view = "favorites";
        backBtn.style.display = 'block';
        resultsDiv.innerHTML = '';
        const favs = getFavs();
        if (favs.length === 0) {
            resultsDiv.innerHTML = '<div class="tenor-message">No favorites yet. Click the star on a GIF!</div>';
            return;
        }
        favs.forEach(gif => resultsDiv.appendChild(renderItem(gif)));
    };

    const searchGifs = (query, append = false) => {
        if (is_loading) return;
        is_loading = true;
        current_view = "search";
        backBtn.style.display = 'block';

        if (!append) resultsDiv.innerHTML = '<div class="tenor-message">Loading...</div>';

        const endpoint = query === "Trending" ? "trending" : "search";
        let url = `https://api.tenor.com/v1/${endpoint}?key=${TENOR_API_KEY}&limit=${LIMIT}&pos=${current_pos}`;
        if (query !== "Trending") url += `&q=${encodeURIComponent(query)}`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (!append) resultsDiv.innerHTML = '';
                else resultsDiv.querySelectorAll('.tenor-message').forEach(m => m.remove());

                if (data.results && data.results.length > 0) {
                    data.results.forEach(res => {
                        const gif = { url: res.media[0].gif.url, preview: res.media[0].nanogif.url };
                        resultsDiv.appendChild(renderItem(gif));
                    });
                    current_pos = data.next || "";
                } else if (!append) {
                    resultsDiv.innerHTML = '<div class="tenor-message">No results found.</div>';
                }
                is_loading = false;
            })
            .catch(() => {
                is_loading = false;
                if (!append) resultsDiv.innerHTML = '<div class="tenor-message">API Error.</div>';
            });
    };

    resultsDiv.onscroll = () => {
        if (current_view === "search" && !is_loading && current_pos) {
            if (resultsDiv.scrollTop + resultsDiv.clientHeight >= resultsDiv.scrollHeight - 50) {
                searchGifs(current_query, true);
            }
        }
    };

    searchInput.onkeyup = (e) => {
        if (e.key === 'Enter' && searchInput.value.trim() !== "") {
            current_query = searchInput.value;
            current_pos = "";
            resultsDiv.innerHTML = '';
            searchGifs(current_query);
        }
    };

    backBtn.onclick = renderCategories;
    closeBtn.onclick = () => {
        popup.style.display = 'none';
        previewBox.style.display = 'none';
    };

    const insertGif = (url) => {
        const bbcode = `[IMG]${url}[/IMG]`;
        if (typeof window.XF !== 'undefined' && window.XF.insertIntoEditor) {
            const editor = document.querySelector('.js-editor');
            if (editor && typeof jQuery !== 'undefined') {
                window.XF.insertIntoEditor(jQuery(editor), bbcode, bbcode);
                popup.style.display = 'none';
                previewBox.style.display = 'none';
                return;
            }
        }
        const textarea = document.querySelector('textarea[name="message"]');
        if (textarea) {
            const start = textarea.selectionStart;
            textarea.value = textarea.value.substring(0, start) + bbcode + textarea.value.substring(textarea.selectionEnd);
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            popup.style.display = 'none';
            previewBox.style.display = 'none';
        }
    };

    const injectButton = () => {
        const toolbar = document.querySelector('.fr-toolbar');
        if (!toolbar || document.getElementById('tenor-btn')) return;
        if (toolbar.closest('#siropuChat') || toolbar.closest('.siropuChat')) return;

        const targetGrp = toolbar.querySelectorAll('.fr-btn-grp')[2] || toolbar.querySelectorAll('.fr-btn-grp')[0];
        if (!targetGrp) return;

        const btn = document.createElement('button');
        btn.id = 'tenor-btn';
        btn.type = 'button';
        btn.className = 'fr-command fr-btn';
        btn.title = 'Tenor GIF';

        btn.innerHTML = '<svg class="fr-svg" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><path d="M18.75,3.50054297 C20.5449254,3.50054297 22,4.95561754 22,6.75054297 L22,17.2531195 C22,19.048045 20.5449254,20.5031195 18.75,20.5031195 L5.25,20.5031195 C3.45507456,20.5031195 2,19.048045 2,17.2531195 L2,6.75054297 C2,4.95561754 3.45507456,3.50054297 5.25,3.50054297 L18.75,3.50054297 Z M8.01459972,8.87193666 C6.38839145,8.87193666 5.26103525,10.2816525 5.26103525,11.9943017 C5.26103525,13.707564 6.38857781,15.1202789 8.01459972,15.1202789 C8.90237918,15.1202789 9.71768065,14.6931811 10.1262731,13.9063503 L10.2024697,13.7442077 L10.226,13.674543 L10.2440163,13.5999276 L10.2440163,13.5999276 L10.2516169,13.5169334 L10.2518215,11.9961937 L10.2450448,11.9038358 C10.2053646,11.6359388 9.99569349,11.4234501 9.72919932,11.3795378 L9.62682145,11.3711937 L8.62521827,11.3711937 L8.53286035,11.3779703 C8.26496328,11.4176506 8.05247466,11.6273217 8.00856234,11.8938159 L8.00021827,11.9961937 L8.00699487,12.0885517 C8.0466751,12.3564487 8.25634623,12.5689373 8.5228404,12.6128497 L8.62521827,12.6211937 L9.00103525,12.6209367 L9.00103525,13.3549367 L8.99484486,13.3695045 C8.80607251,13.6904125 8.44322427,13.8702789 8.01459972,13.8702789 C7.14873038,13.8702789 6.51103525,13.0713011 6.51103525,11.9943017 C6.51103525,10.9182985 7.14788947,10.1219367 8.01459972,10.1219367 C8.43601415,10.1219367 8.67582824,10.1681491 8.97565738,10.3121334 C9.28681641,10.4615586 9.6601937,10.3304474 9.80961888,10.0192884 C9.95904407,9.70812933 9.82793289,9.33475204 9.51677386,9.18532686 C9.03352891,8.95326234 8.61149825,8.87193666 8.01459972,8.87193666 Z M12.6289445,8.99393497 C12.3151463,8.99393497 12.0553614,9.22519285 12.0107211,9.52657705 L12.0039445,9.61893497 L12.0039445,14.381065 L12.0107211,14.4734229 C12.0553614,14.7748072 12.3151463,15.006065 12.6289445,15.006065 C12.9427427,15.006065 13.2025276,14.7748072 13.2471679,14.4734229 L13.2539445,14.381065 L13.2539445,9.61893497 L13.2471679,9.52657705 C13.2025276,9.22519285 12.9427427,8.99393497 12.6289445,8.99393497 Z M17.6221579,9.00083497 L15.6247564,8.99393111 C15.3109601,8.99285493 15.0503782,9.22321481 15.0046948,9.52444312 L14.9975984,9.61677709 L14.9975984,14.3649711 L15.0043751,14.4573291 C15.0440553,14.7252261 15.2537265,14.9377148 15.5202206,14.9816271 L15.6225985,14.9899711 L15.7149564,14.9831945 C15.9828535,14.9435143 16.1953421,14.7338432 16.2392544,14.467349 L16.2475985,14.3649711 L16.2470353,13.2499367 L17.37,13.2504012 L17.4623579,13.2436246 C17.730255,13.2039444 17.9427436,12.9942732 17.9866559,12.7277791 L17.995,12.6254012 L17.9882234,12.5330433 C17.9485432,12.2651462 17.738872,12.0526576 17.4723779,12.0087453 L17.37,12.0004012 L16.2470353,11.9999367 L16.2470353,10.2449367 L17.6178421,10.2508313 L17.7102229,10.2443727 C18.0117595,10.2007704 18.2439132,9.94178541 18.2450039,9.62798912 C18.24608,9.31419284 18.0157202,9.05361096 17.7144919,9.00793041 L17.6221579,9.00083497 L15.6247564,8.99393111 L17.6221579,9.00083497 Z"></path></svg>';

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (popup.style.display === 'block') {
                popup.style.display = 'none';
                previewBox.style.display = 'none';
                return;
            }
            const rect = btn.getBoundingClientRect();
            popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            popup.style.left = (rect.left + window.scrollX) + 'px';
            popup.style.display = 'block';
            renderCategories();
        };
        targetGrp.appendChild(btn);
    };

    const observer = new MutationObserver(() => {
        if (document.querySelector('.fr-toolbar') && !document.getElementById('tenor-btn')) injectButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectButton, 1000);
})();
