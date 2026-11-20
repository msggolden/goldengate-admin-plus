// ==UserScript==
// @name         GoldenGate ADMIN plus
// @description  Szobánkénti ranghoz kötött moderátori eszközök és admin Clon scan.
// @namespace    local.goldengate.admin
// @version      0.10.2
// @homepageURL  https://github.com/msggolden/goldengate-admin-plus
// @updateURL    https://raw.githubusercontent.com/msggolden/goldengate-admin-plus/main/goldengate-admin.meta.js
// @downloadURL  https://raw.githubusercontent.com/msggolden/goldengate-admin-plus/main/goldengate-admin.user.js
// @match        *://chat.goldengate.hu/*
// @run-at       document-idle
// @noframes
// @grant        GM_info
// ==/UserScript==

(function () {
    'use strict';
    const version = '0.10.2';
    const cloneScan = createCloneScan();
    const warningReason = 'figyelmeztés-1perc mulva jöhetsz vissza';
    const allRoomsReason = 'Ismételt vagy súlyos szabálysértés, illetve korábbi szabályszegések következménye.';
    const pending = new Set();
    const busyUsers = new Set();
    const operationControllers = new Set();
    let moderationKey = null;
    let enhancedMenu = null;
    let selectedUser = null;
    let fitScheduled = false;
    let watchedWindow = null;
    const sizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(scheduleFit) : null;

    function getOwnIdentity() {
        const id = document.getElementById('myDiv')?.textContent.trim();
        const room = document.getElementById('roomDiv')?.textContent.trim();
        if (!/^\d+$/.test(id) || !validId(id) || !/^\d+$/.test(room) || !validId(room)) return null;
        const userId = String(Number(id));
        const roomId = String(Number(room));
        const link = [...document.querySelectorAll('#usersList a.user_bubble[rel]')].find(link =>
            link.getAttribute('rel') === userId + '_' + roomId);
        if (!link) return null;
        return {
            id:userId, room:roomId,
            admin:link.classList.contains('adm'),
            operator:link.classList.contains('ope')
        };
    }

    function getModerationKey() {
        const own = getOwnIdentity();
        return own && (own.admin || own.operator) ? own.id + ':' + own.room : null;
    }

    function canModerate(room) {
        const own = getOwnIdentity();
        return !!own && (own.admin || own.operator) && (room === undefined || own.room === String(room));
    }

    function restoreEnhancements() {
        const saved = enhancedMenu;
        enhancedMenu = null;
        if (!saved?.menu.isConnected) return;
        saved.menu.innerHTML = saved.html;
        if (saved.style === null) saved.menu.removeAttribute('style');
        else saved.menu.setAttribute('style', saved.style);
        const popup = saved.menu.closest('#user_window');
        if (popup) popup.style.display = 'none';
    }

    function syncModeration() {
        const key = getModerationKey();
        if (key !== moderationKey) {
            moderationKey = key;
            for (const controller of operationControllers) controller.abort();
            restoreEnhancements();
            selectedUser = null;
        }
        return key;
    }

    function createCloneScan() {
        const nativeFetch = (...args) => fetch(...args);
        let activeRun = null;
        let panel = null;
        let access = {userId:null, room:null, allowed:false, blocked:false};
    
        function validId(value) {
            return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
        }
    
        function readUser(link) {
            const parts = (link.getAttribute('rel') || '').match(/^(\d+)_(\d+)$/);
            if (!parts || !validId(parts[1]) || !validId(parts[2])) return null;
            return {
                id: String(Number(parts[1])), room: String(Number(parts[2])),
                name: link.textContent.trim().replace(/^#{1,2}/, '') || 'Felhasználó'
            };
        }
    
        function getUsers() {
            const users = new Map();
            document.querySelectorAll('#usersList a.user_bubble[rel]').forEach(link => {
                const user = readUser(link);
                if (user) users.set(user.id, user);
            });
            return [...users.values()].filter(user => user.room === getOwnIdentity()?.room);
        }
    
        function normalizeIp(value) {
            const ip = value.trim();
            if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                const parts = ip.split('.').map(Number);
                return parts.every(part => part <= 255) ? parts.join('.') : null;
            }
            if (ip.includes(':') && /^[0-9a-f:.]+$/i.test(ip)) {
                try { return new URL('http://[' + ip + ']/').hostname.slice(1, -1).toLowerCase(); }
                catch (_) { return null; }
            }
            return null;
        }
    
        function extractIp(html) {
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            parsed.querySelectorAll('script,style').forEach(node => node.remove());
            const text = parsed.body.textContent.replace(/\s+/g, ' ');
            const found = text.match(/Utols[oó]\s+IP(?:[-–]\s*je)?\s*:\s*([0-9a-f:.]+)/i);
            return found ? normalizeIp(found[1]) : null;
        }
    
        function classifyAccess(html) {
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            parsed.querySelectorAll('script,style').forEach(node => node.remove());
            const text = parsed.body.textContent.replace(/\s+/g, ' ');
            if (/Utols[oó]\s+IP(?:[-–]\s*je)?\s*:/i.test(text)) return 'allowed';
            if (/Megnézem az adatlapját|Privát chat indítása/i.test(text)) return 'denied';
            return 'unknown';
        }
    
        function accessError(message) {
            const error = new Error(message);
            error.code = 'IP_ACCESS_DENIED';
            return error;
        }
    
        function hideButton() {
            document.getElementById('gg-clone-button')?.remove();
        }
    
        // Az élő chatben megfigyelt, kizárólag adatot lekérő végpont.
        function makeUserRequest(user) {
            if (!validId(user.id) || !validId(user.room)) throw new Error('Érvénytelen felhasználó- vagy szobaazonosító.');
            const url = new URL('/includes/ajax/user_bubble.php', location.origin);
            url.searchParams.set('user_id', user.id);
            url.searchParams.set('chat', '1');
            url.searchParams.set('channel_id', user.room);
            return {url:url.href, method:'GET'};
        }
    
        function groupMatches(rows) {
            const groups = new Map();
            for (const row of rows) {
                const ip = normalizeIp(row.ip);
                if (!ip) continue;
                if (!groups.has(ip)) groups.set(ip, new Map());
                groups.get(ip).set(row.id, row);
            }
            return [...groups].map(([ip, users]) => ({ip, users:[...users.values()]}))
                .filter(group => group.users.length > 1)
                .sort((a, b) => b.users.length - a.users.length || a.ip.localeCompare(b.ip));
        }
    
        function line(text, bold = false) {
            const node = document.createElement(bold ? 'strong' : 'div');
            node.textContent = text;
            node.style.cssText = 'display:block;margin:5px 0;';
            return node;
        }

        function separator() {
            const node = document.createElement('hr');
            node.style.cssText = 'width:100%;max-width:100%;box-sizing:border-box;margin:6px 0;';
            return node;
        }
    
        function closePanel() {
            if (activeRun) activeRun.controller.abort();
            activeRun = null;
            document.getElementById('gg-clone-window')?.remove();
            panel = null;
        }
    
        function openPanel() {
            if (panel?.isConnected) return;
            const popup = document.createElement('div');
            popup.id = 'gg-clone-window';
            popup.setAttribute('role', 'dialog');
            popup.setAttribute('aria-label', 'Clon scan');
            popup.style.cssText = 'position:fixed;left:12px;top:32px;width:min(390px,calc(100vw - 24px));z-index:10001;';
            const frame = document.createElement('div');
            frame.style.cssText = 'position:relative;margin:0 0 6px 19px;font:12px Verdana,Arial,sans-serif;color:#bb4b07;';
            const content = document.createElement('div');
            content.style.cssText = 'position:relative;padding:15px 14px 0 0;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat right top;';
            const side = document.createElement('div');
            side.style.cssText = 'position:absolute;top:0;left:-19px;width:19px;height:100%;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat left top;';
            const close = document.createElement('a');
            close.href = '#'; close.setAttribute('aria-label', 'Bezárás');
            close.style.cssText = 'position:absolute;right:18px;top:16px;width:13px;height:13px;line-height:13px;z-index:1;';
            const image = document.createElement('img');
            image.src = 'https://www.goldengate.hu/images/close_x.gif'; image.alt = 'Bezárás';
            close.append(image);
            close.addEventListener('click', event => { event.preventDefault(); closePanel(); });
            const heading = line('Clon scan', true);
            heading.style.paddingRight = '24px';
            panel = document.createElement('div');
            panel.style.cssText = 'min-width:0;max-width:100%;box-sizing:border-box;max-height:calc(100vh - 130px);overflow-x:hidden;overflow-y:auto;overflow-wrap:anywhere;line-height:1.45;';
            content.append(side, close, heading, separator(), panel);
            const bottom = document.createElement('div');
            bottom.style.cssText = 'position:relative;height:19px;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat right bottom;';
            const corner = document.createElement('div');
            corner.style.cssText = 'position:relative;left:-19px;width:19px;height:19px;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat left bottom;';
            bottom.append(corner); frame.append(content, bottom); popup.append(frame); document.body.append(popup);
        }
    
        async function fetchUserHtml(user, signal) {
            const request = makeUserRequest(user);
            const controller = new AbortController();
            const abort = () => controller.abort();
            signal.addEventListener('abort', abort, {once:true});
            const timer = setTimeout(abort, 12000);
            try {
                if (signal.aborted) throw new Error('Megszakítva.');
                const response = await nativeFetch(request.url, {
                    method:request.method, body:request.body,
                    headers:request.method === 'POST'
                        ? {'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8', 'X-Requested-With':'XMLHttpRequest'}
                        : {'X-Requested-With':'XMLHttpRequest'},
                    credentials:'same-origin', cache:'no-store', redirect:'error', signal:controller.signal
                });
                if (response.status === 401 || response.status === 403) throw accessError('HTTP ' + response.status + ' – nincs hozzáférés.');
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return await response.text();
            } finally {
                clearTimeout(timer);
                signal.removeEventListener('abort', abort);
            }
        }
    
        async function fetchUserIp(user, signal) {
            const html = await fetchUserHtml(user, signal);
            if (classifyAccess(html) === 'denied') throw accessError('Nincs jogosultság az IP-adatok olvasásához.');
            const ip = extractIp(html);
            if (!ip) throw new Error('Nincs kiolvasható IP-adat.');
            return ip;
        }
    
        // Kizárólag a már betöltött saját ID és saját névsori rang alapján.
        // A gomb megjelenítéséhez sem saját, sem más felhasználó adatlapját nem kérjük le.
        function ensureButton() {
            const own = getOwnIdentity();
            const userId = own?.id || null;
            const room = own?.room || null;
            if (room !== access.room || userId !== access.userId) {
                access = {userId, room, allowed:false, blocked:false};
                hideButton(); closePanel();
            }
            access.allowed = own?.admin === true && !access.blocked;
            if (access.allowed) renderButton();
            else { hideButton(); closePanel(); }
        }
    
        async function scan() {
            if (activeRun) return;
            ensureButton();
            if (!access.allowed) return;
            openPanel();
            const users = getUsers();
            if (!users.length) { panel.replaceChildren(line('Nincs feldolgozható felhasználó a jelenlegi szobalistában.')); return; }
            const run = {controller:new AbortController()};
            activeRun = run;
            const rows = [];
            const errors = [];
            panel.replaceChildren();
            const progress = line('Vizsgálat indul…', true);
            progress.setAttribute('role', 'status');
            panel.append(progress, line('A vizsgálat kezdetekor a névsorban szereplő felhasználókat ellenőrzöm. Az X megállítja a lekéréseket.'));
            for (let index = 0; index < users.length; index++) {
                ensureButton();
                if (run.controller.signal.aborted) break;
                const user = users[index];
                progress.textContent = 'Lekérdezés: ' + (index + 1) + '/' + users.length;
                try { rows.push({...user, ip:await fetchUserIp(user, run.controller.signal)}); }
                catch (error) {
                    if (run.controller.signal.aborted) break;
                    if (error.code === 'IP_ACCESS_DENIED') {
                        access.allowed = false;
                        access.blocked = true;
                        hideButton(); closePanel();
                        return;
                    }
                    errors.push({user, message:error.message});
                }
                // Egyszerre egy kérés; a szervert nem terheljük párhuzamos lekérdezésekkel.
                if (index < users.length - 1) await new Promise(resolve => {
                    const done = () => { clearTimeout(timer); run.controller.signal.removeEventListener('abort', done); resolve(); };
                    const timer = setTimeout(done, 500);
                    run.controller.signal.addEventListener('abort', done, {once:true});
                    if (run.controller.signal.aborted) done();
                });
            }
            if (activeRun !== run || run.controller.signal.aborted || !panel?.isConnected) return;
            activeRun = null;
            const groups = groupMatches(rows);
            panel.replaceChildren(line('Kész: ' + rows.length + '/' + users.length + ' IP kiolvasva, ' + errors.length + ' hiba.', true));
            if (!groups.length) panel.append(line(errors.length ? 'A sikeresen kiolvasott IP-címek között nincs egyezés.' : 'Nincs IP-egyezés az ellenőrzött felhasználók között.'));
            for (const group of groups) {
                panel.append(separator(), line('IP: ' + group.ip, true));
                for (const user of group.users) {
                    const name = line(user.name);
                    name.style.paddingLeft = '10px'; name.title = 'ID: ' + user.id;
                    panel.append(name);
                }
            }
            if (errors.length) {
                const details = document.createElement('details');
                const summary = document.createElement('summary'); summary.textContent = 'Sikertelen lekérések (' + errors.length + ')';
                details.append(summary);
                errors.forEach(error => details.append(line(error.user.name + ': ' + error.message)));
                panel.append(separator(), details);
            }
            panel.append(separator(), line('Az oldal „Utolsó IP-je” mezőjét hasonlítjuk össze. Az IP-egyezés önmagában nem bizonyítja, hogy ugyanaz a személy.'));
            const again = document.createElement('a'); again.href = '#'; again.textContent = 'Új vizsgálat';
            again.addEventListener('click', event => { event.preventDefault(); void scan(); });
            panel.append(again);
        }
    
        function renderButton() {
            const menu = document.getElementById('MainMenu');
            if (!menu || document.getElementById('gg-clone-button')) return;
            const button = document.createElement('a');
            button.id = 'gg-clone-button'; button.href = '#';
            button.title = 'Clon scan – az aktuális szoba IP-egyezései';
            button.style.cssText = 'position:absolute;top:3px;left:445px;width:106px;height:17px;';
            const background = document.createElement('img');
            background.src = 'https://chat.goldengate.hu/images/chat/gomb_off.gif'; background.alt = '';
            background.style.cssText = 'position:absolute;top:0;left:0;width:106px;height:17px;border:0;';
            const label = document.createElement('div'); label.textContent = 'Clon scan'; label.className = 'font_mainmenu';
            label.style.cssText = 'position:absolute;top:2px;left:0;width:106px;text-align:center;white-space:nowrap;color:#145c14;';
            button.append(background, label);
            button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); void scan(); });
            menu.append(button);
        }
    
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && panel?.isConnected) { event.preventDefault(); closePanel(); }
        });
        return {update:ensureButton, close:closePanel};
    
    }

    function scheduleFit() {
        if (fitScheduled) return;
        fitScheduled = true;
        requestAnimationFrame(() => {
            fitScheduled = false;
            fitUserWindow();
        });
    }

    function fitUserWindow() {
        if (!canModerate()) return;
        const popup = document.getElementById('user_window');
        if (!popup) return;
        if (watchedWindow !== popup) {
            sizeObserver?.disconnect();
            sizeObserver?.observe(popup);
            watchedWindow = popup;
        }
        const style = getComputedStyle(popup);
        if (style.display === 'none' || style.visibility === 'hidden' || !popup.getClientRects().length) return;
        const content = popup.querySelector('.content');
        if (!content) return;
        const margin = 8;
        const width = document.documentElement.clientWidth || innerWidth;
        const height = document.documentElement.clientHeight || innerHeight;
        // A régi keret kilóg a .content dobozából: ezt nem szabad levágni.
        if (content.style.maxHeight) content.style.maxHeight = '';
        if (content.style.overflow !== 'visible') content.style.overflow = 'visible';
        // A moderátori menü végén lévő hr margója maradjon a háttéren belül.
        // Így nem nyílik rés a tartalom és a külön alsó keretelem között.
        if (content.style.display !== 'flow-root') content.style.display = 'flow-root';
        const boxes = [popup, ...popup.querySelectorAll('.dialog, .content, .t, .b, .b > div')]
            .map(node => node.getBoundingClientRect());
        const current = {
            left: Math.min(...boxes.map(box => box.left)),
            top: Math.min(...boxes.map(box => box.top)),
            right: Math.max(...boxes.map(box => box.right)),
            bottom: Math.max(...boxes.map(box => box.bottom))
        };
        current.width = current.right - current.left;
        current.height = current.bottom - current.top;
        const left = Math.max(margin, Math.min(current.left, width - margin - current.width));
        const top = Math.max(margin, Math.min(current.top, height - margin - current.height));
        const deltaX = left - current.left;
        const deltaY = top - current.top;
        if (Math.abs(deltaX) > 0.5) {
            popup.style.left = ((parseFloat(getComputedStyle(popup).left) || 0) + deltaX) + 'px';
        }
        if (Math.abs(deltaY) > 0.5) {
            popup.style.top = ((parseFloat(getComputedStyle(popup).top) || 0) + deltaY) + 'px';
        }
    }

    function rememberUser(link) {
        const match = (link.getAttribute('rel') || '').match(/^(\d+)_(\d+)$/);
        if (!match || !validId(match[1]) || !validId(match[2])) return;
        if (!canModerate(match[2])) return;
        const menu = document.querySelector('#user_window .content');
        selectedUser = {
            userId: match[1], roomId: match[2],
            name: link.textContent.trim().replace(/^#{1,2}/, ''),
            previousMenu: menu,
            previousError: menu?.querySelector('.error') || null
        };
    }

    function restoreMissingMenu(menu) {
        if (!canModerate(selectedUser?.roomId)) return;
        if (menu.querySelector('#gg-missing-user-actions')) return;
        const error = menu.querySelector('.error');
        if (!error || error.textContent.trim() !== 'Nem létező felhasználó!' || !selectedUser) return;
        // Csak az újonnan betöltött választ egészítjük ki.
        if (menu === selectedUser.previousMenu && error === selectedUser.previousError) return;
        const { userId, roomId, name } = selectedUser;
        const fragment = document.createDocumentFragment();
        const identity = document.createElement('div');
        identity.id = 'gg-user-identity';
        identity.dataset.userId = userId;
        identity.dataset.userName = name;
        identity.textContent = name;
        identity.style.cssText = 'font-weight:bold;font-size:inherit;line-height:inherit;';
        fragment.append(identity);
        const addLink = (label, code) => {
            const action = document.createElement('a');
            action.href = '#';
            action.textContent = label;
            action.setAttribute('onclick', code + '; return false;');
            fragment.append(action, document.createElement('br'));
        };
        addLink('Privát chat indítása', 'startPrivateChat(' + userId + ')');
        fragment.append(document.createElement('hr'));
        for (const [minutes, label] of [
            [1, 'Kirúgom'], [10, 'Kitiltom a szobából 10 percre'],
            [30, 'Kitiltom a szobából 30 percre'], [60, 'Kitiltom a szobából 60 percre'],
            [300, 'Kitiltom a szobából 5 órára']
        ]) {
            addLink(label, 'PrepareModerateRoom(1,' + minutes + ',' + userId + ',' + roomId + ')');
        }
        const actions = document.createElement('div');
        actions.id = 'gg-missing-user-actions';
        actions.append(fragment);
        error.after(document.createElement('hr'), actions);
    }

    function validId(value) {
        return Number.isSafeInteger(Number(value)) && Number(value) > 0;
    }

    function getRooms() {
        const rooms = new Map();
        document.querySelectorAll('#roomsList a[onclick]').forEach(link => {
            const match = (link.getAttribute('onclick') || '').match(/startRoomChat\(\s*(\d+)\s*\)/);
            if (!match || !validId(match[1])) return;
            const id = String(Number(match[1]));
            rooms.set(id, { id, name: link.textContent.trim().replace(/\s*\(\d+\)\s*$/, '') || id });
        });
        return [...rooms.values()];
    }

    async function banRoom(userId, roomId, minutes, reason, expectedKey = getModerationKey()) {
        if (!expectedKey || expectedKey !== getModerationKey()) throw new Error('Az aktuális szobában nincs moderátori jogosultságod.');
        if (!validId(userId) || !validId(roomId) || !validId(minutes)) {
            throw new Error('Érvénytelen azonosító vagy időtartam.');
        }
        const url = new URL('/chat_rooms_moderate.php', location.origin);
        url.search = new URLSearchParams({
            command: 'tilt', ttime: String(minutes), tuser: userId,
            troom: roomId, ttext: btoa(encodeURIComponent(reason))
        }).toString();
        const controller = new AbortController();
        operationControllers.add(controller);
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(url, {
                method: 'GET', credentials: 'same-origin', cache: 'no-store',
                signal: controller.signal, redirect: 'error'
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.status;
        } finally {
            clearTimeout(timer);
            operationControllers.delete(controller);
        }
    }

    async function banAllRooms(panel, minutes) {
        const expectedKey = getModerationKey();
        if (!expectedKey || panel.dataset.ggContext !== expectedKey) return;
        const userId = panel.dataset.userId;
        const summary = panel.querySelector('[data-gg-summary]');
        const results = panel.querySelector('[data-gg-results]');
        if (busyUsers.has(userId) || pending.has(userId)) return;
        const rooms = getRooms();
        results.replaceChildren();
        if (!rooms.length) {
            summary.textContent = 'Nem található szoba a szobalistában.';
            return;
        }
        busyUsers.add(userId);
        const choices = panel.querySelectorAll('[data-gg-duration]');
        choices.forEach(choice => { choice.setAttribute('aria-disabled', 'true'); });
        summary.textContent = 'Küldés…';
        let accepted = 0;
        let failed = 0;
        try {
            for (const room of rooms) {
                if (getModerationKey() !== expectedKey) {
                    summary.textContent = 'A művelet leállt: megváltozott a szoba vagy a jogosultságod.';
                    return;
                }
                const line = document.createElement('div');
                line.style.cssText = 'display:flex;justify-content:space-between;gap:8px;';
                const name = document.createElement('span');
                name.textContent = room.name;
                name.title = room.name;
                name.style.cssText = 'min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                const state = document.createElement('strong');
                state.textContent = '…';
                state.style.flexShrink = '0';
                line.append(name, state);
                results.append(line);
                try {
                    await banRoom(userId, room.id, minutes, allRoomsReason, expectedKey);
                    accepted++;
                    state.textContent = 'OK';
                } catch (error) {
                    failed++;
                    state.textContent = 'Hiba';
                    state.title = error.name === 'AbortError' ? 'Válaszidő túllépve.' : error.message;
                }
            }
            summary.textContent = 'Tiltási kérelem elküldve:\n' +
                (minutes < 60 ? minutes + ' perc' : (minutes / 60) + ' óra') +
                '\n' + rooms.length + ' szobából:\n' + accepted + ' fogadva, ' + failed + ' hiba';
        } finally {
            busyUsers.delete(userId);
            choices.forEach(choice => { choice.removeAttribute('aria-disabled'); });
        }
    }

    async function sendWarning(link) {
        const userId = link.dataset.userId;
        const roomId = link.dataset.roomId;
        if (!canModerate(roomId)) return;
        const expectedKey = getModerationKey();
        if (!Number.isSafeInteger(Number(userId)) || Number(userId) <= 0 ||
            !Number.isSafeInteger(Number(roomId)) || Number(roomId) <= 0) return;
        const key = userId;
        if (busyUsers.has(userId)) return;
        if (pending.has(key)) return;
        pending.add(key);
        link.textContent = 'Küldés…';
        try {
            await banRoom(userId, roomId, 1, warningReason, expectedKey);
            if (link.isConnected && link.dataset.userId === userId && link.dataset.roomId === roomId) {
                const userWindow = link.closest('#user_window');
                if (userWindow) userWindow.style.display = 'none';
            }
        } catch (error) {
            if (link.isConnected && link.dataset.userId === userId && link.dataset.roomId === roomId) {
                link.textContent = 'Hiba – újrapróbálás';
                link.title = error.message;
            }
        } finally {
            pending.delete(key);
        }
    }

    function addIdentity(menu, userId) {
        const links = Array.from(menu.querySelectorAll('a'));
        const profile = links.find(link => link.textContent.trim() === 'Megnézem az adatlapját');
        const target = profile || links.find(link =>
            (link.getAttribute('onclick') || '').includes('startPrivateChat('));
        if (!target) return;
        const user = Array.from(document.querySelectorAll('a.user_bubble[rel]')).find(link =>
            (link.getAttribute('rel') || '').split('_')[0] === userId);
        let name = user ? user.textContent.trim().replace(/^##/, '') : '';
        if (!name && profile) {
            const path = new URL(profile.href, location.href).pathname;
            const prefix = '/amator/' + userId + '-';
            if (path.startsWith(prefix)) name = decodeURIComponent(path.slice(prefix.length));
        }
        if (!name && selectedUser?.userId === userId) name = selectedUser.name;
        name = name || 'Felhasználó';
        let block = menu.querySelector('#gg-user-identity');
        if (block && block.dataset.userId === userId && block.dataset.userName === name) return;
        if (!block) {
            block = document.createElement('div');
            block.id = 'gg-user-identity';
            target.before(block);
        }
        const font = getComputedStyle(target);
        block.style.cssText = 'margin:0;padding:0;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        block.style.fontSize = font.fontSize;
        block.style.fontFamily = font.fontFamily;
        block.style.lineHeight = font.lineHeight;
        block.title = name;
        block.textContent = name;
        block.dataset.userId = userId;
        block.dataset.userName = name;
    }

    function showUserPanel(row) {
        if (!canModerate(row.dataset.roomId)) return;
        const menu = row.closest('#user_window .content');
        if (!menu) return;
        const close = menu.querySelector('.close_dialog');
        const top = menu.querySelector('.t');
        if (!close) return;
        const panel = document.createElement('div');
        panel.id = 'gg-allrooms-panel';
        panel.dataset.userId = row.dataset.userId;
        panel.dataset.ggContext = getModerationKey();
        panel.style.cssText = 'padding-top:8px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow-x:hidden;overflow-y:auto;white-space:normal;overflow-wrap:anywhere;';
        const roomWindow = menu.closest('#user_window');
        panel.style.maxHeight = Math.max(120, innerHeight - roomWindow.getBoundingClientRect().top - 35) + 'px';
        const title = document.createElement('strong');
        title.textContent = 'Minden szoba';
        const name = document.createElement('strong');
        name.textContent = row.dataset.userName || 'Felhasználó';
        const identity = document.createElement('span');
        identity.textContent = 'ID: ' + row.dataset.userId;
        identity.style.cssText = 'font-family:inherit;font-size:inherit;font-weight:normal;';
        identity.style.fontSize = getComputedStyle(row.querySelector('a')).fontSize;
        const separator = document.createElement('hr');
        separator.style.cssText = 'width:100%;max-width:100%;box-sizing:border-box;margin:6px 0;';
        const headingSeparator = separator.cloneNode(false);
        panel.append(title, headingSeparator, name,
            document.createElement('br'), identity,
            separator);
        const durations = [
            [1, 'Teszt - 1perc'], [30, 'Tiltás – 30 perc'],
            [60, 'Tiltás – 1 óra'], [300, 'Tiltás – 5 óra'],
            [600, 'Tiltás – 10 óra'], [900, 'Tiltás – 15 óra']
        ];
        for (const [minutes, label] of durations) {
            const choice = document.createElement('a');
            choice.href = '#';
            choice.dataset.ggDuration = String(minutes);
            choice.textContent = label;
            choice.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                void banAllRooms(panel, minutes);
            });
            panel.append(choice, document.createElement('br'));
        }
        const summary = document.createElement('div');
        summary.dataset.ggSummary = '';
        summary.setAttribute('role', 'status');
        summary.style.marginTop = '8px';
        summary.style.whiteSpace = 'pre-line';
        summary.textContent = 'Szobák: ' + getRooms().length;
        const results = document.createElement('div');
        results.dataset.ggResults = '';
        panel.append(summary, results);
        const nodes = top ? [top, close, panel] : [close, panel];
        menu.replaceChildren(...nodes);
    }

    function closeInfo() {
        const dialog = document.getElementById('gg-admin-info-window');
        if (!dialog) return;
        dialog.remove();
        const button = document.getElementById('gg-admin-status');
        button?.setAttribute('aria-expanded', 'false');
        button?.focus();
    }

    function showInfo() {
        const existing = document.getElementById('gg-admin-info-window');
        if (existing) {
            existing.querySelector('.close_dialog')?.focus();
            return;
        }
        const popup = document.createElement('div');
        popup.id = 'gg-admin-info-window';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-labelledby', 'gg-admin-info-title');
        popup.style.cssText = 'position:fixed;left:12px;top:32px;width:min(620px,calc(100vw - 24px));z-index:10000;';
        const frame = document.createElement('div');
        frame.className = 'dialog';
        frame.style.cssText = 'position:relative;margin:0 0 6px 19px;padding:0;font:12px Verdana,Arial,Helvetica,sans-serif;color:#bb4b07;';
        const content = document.createElement('div');
        content.className = 'content';
        content.style.cssText = 'position:relative;margin:0;padding:15px 14px 0 0;overflow:visible;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat right top;';
        const top = document.createElement('div');
        top.className = 't';
        top.style.cssText = 'position:absolute;top:0;left:0;margin-left:-19px;width:19px;height:100%;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat left top;';
        const close = document.createElement('a');
        close.href = '#';
        close.className = 'close_dialog';
        close.setAttribute('aria-label', 'Bezárás');
        close.style.cssText = 'position:absolute;right:18px;top:16px;width:13px;height:13px;line-height:13px;z-index:1;';
        const closeImage = document.createElement('img');
        closeImage.src = document.querySelector('#user_window .close_dialog img')?.src ||
            'https://www.goldengate.hu/images/close_x.gif';
        closeImage.alt = 'Bezárás';
        close.append(closeImage);
        close.addEventListener('click', event => {
            event.preventDefault();
            closeInfo();
        });
        const heading = document.createElement('strong');
        heading.id = 'gg-admin-info-title';
        heading.textContent = 'GoldenGate ADMIN plusz – ' + version;
        heading.style.cssText = 'display:block;padding-right:22px;';
        const body = document.createElement('div');
        body.style.cssText = 'max-height:calc(100vh - 120px);overflow-y:auto;overflow-x:hidden;overflow-wrap:anywhere;line-height:1.45;padding-right:6px;';
        const intro = document.createElement('p');
        intro.textContent = 'Adminoknak és moderátoroknak készült kiegészítő, amely gyorsítja a felhasználók kezelését, és javítja a kezelőablak megjelenését.';
        intro.style.margin = '10px 0';
        body.append(intro);
        const sections = [
            ['Felhasználónév megjelenítése:', 'Kiírja a kiválasztott felhasználó nevét a kezelőablakban, így könnyebb ellenőrizni, kin hajtod végre a műveletet.'],
            ['Gyors, egyperces kirúgás:', 'Lecseréli az eredeti, indoklást kérő „Kirúgom” menüpontot. Egy kattintással elküldi az egyperces kirúgást, ezzel az automatikus indokkal: „' + warningReason + '”. Amikor a szerver visszajelez, hogy fogadta a kérést, bezárja a kezelőablakot.'],
            ['„Kitiltom minden szobából »” almenü:', 'Választható időtartamok: tesztként 1 perc, továbbá 30 perc, 1, 5, 10 és 15 óra. Mindig az aktuális szobalistát olvassa be, így az újonnan megjelenő szobákat is figyelembe veszi. A tiltás csak azokban a szobákban hajtható végre, amelyekben van hozzá jogosultságod. Az indok: „' + allRoomsReason + '”'],
            ['Szobánkénti visszajelzés a „Kitiltom minden szobából” almenüben:', 'A „Tiltási kérelem elküldve:” felirat alatt külön sorban jelenik meg a választott időtartam. Ezután a szobák száma következik, például „5 szobából:”, alatta pedig az összesítés: „4 fogadva, 1 hiba”. A szobák mellett külön „OK” vagy „Hiba” jelzés látható. Az „OK” azt jelzi, hogy a szerver fogadta a kérést; a tiltás tényleges végrehajtását külön nem ellenőrzi.'],
            ['„Nem létező felhasználó” javítása:', 'Megtartja az eredeti hibaüzenetet, alatta pedig elérhetővé teszi a felhasználó nevét, a privát chat indítását és a moderálási lehetőségeket.'],
            ['Kezelőablak elhelyezésének javítása:', 'A teljes keretet együtt igazítja a látható területre, így a lista alsó neveinél megnyitott ablak is megfelelően jelenik meg. Megőrzi az eredeti adatokat, képet és bezárógombot.'],
            ['Működésjelző, leírás és verziószám:', 'Az „ADMIN plus” gomb jelzi, hogy a szkript betöltődött. Rákattintva megnyitható a funkciók leírása és az aktuális verziószám.']
        ];
        sections.push(
            ['Szobánkénti jogosultság:', 'Az ADMIN plusz gomb és ez a leírás mindig elérhető. A többi kiegészítés csak akkor működik, ha az aktuális szobában admin vagy moderátor/szobatulajdonos rangod van. A névsor frissítésekor újra ellenőrzi a saját rangodat, külön adatlekérés nélkül. Szobaváltáskor vagy a jogosultság megszűnésekor eltünteti a kiegészítéseket és leállítja a folyamatban lévő további kéréseket.'],
            ['Clon scan – csak adminoknak:', 'Kattintásra beolvassa az aktuális szoba névsorát, majd sorban lekéri az „Utolsó IP-je” mezőket. Az egyező IP-k alatt felsorolja a felhasználókat. A gomb megjelenítéséhez nem kér le adatlapot. Az X vagy az Escape leállítja a vizsgálatot és bezárja az ablakot. Az eredményeket nem menti el. Az IP-egyezés önmagában nem bizonyítja, hogy ugyanaz a személy.']
        );
        sections.forEach(([title, text], index) => {
            const paragraph = document.createElement('p');
            paragraph.style.margin = '10px 0';
            const label = document.createElement('strong');
            label.textContent = title + ' ';
            paragraph.append(label, document.createTextNode(text));
            if (index === 2) {
                const note = document.createElement('strong');
                note.textContent = 'Vegyétek figyelembe, hogy az éjfél és hajnal közötti szerver-újraindulás minden tiltást töröl, így azok a beállított idő lejárta előtt is megszűnhetnek.';
                paragraph.append(document.createElement('br'), note);
            }
            body.append(paragraph);
        });
        content.append(top, close, heading, document.createElement('hr'), body);
        const bottom = document.createElement('div');
        bottom.className = 'b';
        bottom.style.cssText = 'position:relative;width:100%;height:19px;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat right bottom;font-size:1px;';
        const corner = document.createElement('div');
        corner.style.cssText = 'position:relative;width:19px;height:19px;margin-left:-19px;background:url("https://chat.goldengate.hu/images/dialog_bg.png") no-repeat left bottom;';
        bottom.append(corner);
        frame.append(content, bottom);
        popup.append(frame);
        document.body.append(popup);
        document.getElementById('gg-admin-status')?.setAttribute('aria-expanded', 'true');
        close.focus();
    }

    function update() {
        const mainMenu = document.getElementById('MainMenu');
        if (mainMenu && !document.getElementById('gg-admin-status')) {
            const status = document.createElement('a');
            status.id = 'gg-admin-status';
            status.href = '#';
            status.style.cssText = 'position:absolute;top:3px;left:335px;width:106px;height:17px;';
            status.title = 'ADMIN plusz – ' + version + ' – Leírás';
            status.setAttribute('aria-haspopup', 'dialog');
            status.setAttribute('aria-controls', 'gg-admin-info-window');
            status.setAttribute('aria-expanded', 'false');
            const background = document.createElement('img');
            background.src = 'https://chat.goldengate.hu/images/chat/gomb_off.gif';
            background.alt = '';
            background.style.cssText = 'position:absolute;top:0;left:0;width:106px;height:17px;border:0;';
            const label = document.createElement('div');
            label.className = 'font_mainmenu';
            label.textContent = 'ADMIN plus';
            label.style.cssText = 'position:absolute;top:2px;left:0;width:106px;text-align:center;white-space:nowrap;color:#145c14;';
            status.append(background, label);
            mainMenu.appendChild(status);
        }
        const key = syncModeration();
        cloneScan.update();
        if (!key) return;
        const menu = document.querySelector('#user_window .content');
        if (!menu) return;
        if (enhancedMenu?.menu !== menu) enhancedMenu = {menu, html:menu.innerHTML, style:menu.getAttribute('style')};
        restoreMissingMenu(menu);
        const anchor = Array.from(menu.querySelectorAll('a')).find(function (link) {
            return link.textContent.trim() === 'Kitiltom a szobából 5 órára';
        });
        if (!anchor) return;
        const code = anchor.getAttribute('onclick') || '';
        const args = code.slice(code.indexOf('(') + 1).split(',');
        const userId = (args[2] || '').trim();
        if (!Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) return;
        const roomId = (args[3] || '').split(')')[0].trim();
        if (!canModerate(roomId)) return;
        const kick = menu.querySelector('#gg-warning-kick') ||
            Array.from(menu.querySelectorAll('a')).find(link => link.textContent.trim() === 'Kirúgom');
        if (kick && Number.isSafeInteger(Number(roomId)) && Number(roomId) > 0) {
            const changed = kick.dataset.userId !== userId || kick.dataset.roomId !== roomId;
            kick.id = 'gg-warning-kick';
            if (kick.hasAttribute('onclick')) kick.removeAttribute('onclick');
            if (changed) {
                kick.dataset.userId = userId;
                kick.dataset.roomId = roomId;
                kick.textContent = 'Kirúgom (1 perc)';
                kick.title = warningReason;
            }
        }
        addIdentity(menu, userId);
        let row = menu.querySelector('#gg-extra-user-action');
        if (!row) {
            row = document.createElement('div');
            row.id = 'gg-extra-user-action';
            const action = document.createElement('a');
            action.href = '#';
            action.textContent = 'Kitiltom minden szobából »';
            action.title = 'Időtartam választása minden aktuális szobára.';
            row.appendChild(action);
            const next = anchor.nextElementSibling;
            if (next && next.tagName === 'BR') next.after(row);
            else anchor.after(row);
        }
        row.dataset.userId = userId;
        row.dataset.roomId = roomId;
        row.dataset.userName = menu.querySelector('#gg-user-identity')?.dataset.userName || 'Felhasználó';
    }

    document.addEventListener('click', function (event) {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest('#gg-admin-status')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            showInfo();
            return;
        }
        if (!syncModeration()) return;
        const user = event.target.closest('a.user_bubble[rel]');
        if (user) rememberUser(user);
        const kick = event.target.closest('#gg-warning-kick');
        if (kick) {
            event.preventDefault();
            event.stopImmediatePropagation();
            void sendWarning(kick);
            return;
        }
        const action = event.target.closest('#gg-extra-user-action a');
        if (!action) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showUserPanel(action.closest('#gg-extra-user-action'));
    }, true);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.getElementById('gg-admin-info-window')) {
            event.preventDefault();
            closeInfo();
        }
    });

    new MutationObserver(() => {
        update();
        scheduleFit();
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
        attributeFilter: ['href', 'style', 'class', 'onclick', 'rel']
    });
    window.addEventListener('resize', scheduleFit);
    document.addEventListener('load', event => {
        if (event.target instanceof Element && event.target.closest('#user_window')) scheduleFit();
    }, true);
    update();
    scheduleFit();
})();
