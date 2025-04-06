// ==UserScript==
// @name         Bangumi Subject Helper
// @version      1.7
// @description  为 Bangumi 条目页面添加辅助功能
// @match        https://bgm.tv/subject/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @updateURL    https://github.com/MagmaBlock/my-browser-scripts/raw/refs/heads/main/bangumi-subject-helper.user.js
// @downloadURL  https://github.com/MagmaBlock/my-browser-scripts/raw/refs/heads/main/bangumi-subject-helper.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        #bangumiHelper {
            position: fixed;
            top: 20px;
            right: 90px; /* 增加间距，避免紧挨按钮 */
            width: 300px;
            background-color: white;
            border: 1px solid #ccc;
            padding: 15px;
            z-index: 9999;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            font-size: 14px;
            line-height: 1.5;
            display: none; /* 初始隐藏面板 */
        }
        #bangumiHelper.dark {
            background-color: #333;
            color: #fff;
            border-color: #555;
        }
        #bangumiHelper input[type="checkbox"] {
            margin-right: 5px;
        }
        #bangumiHelper select, #bangumiHelper textarea {
            width: 100%;
            margin: 5px 0;
        }
        #bangumiHelper textarea {
            height: 60px;
            resize: vertical;
        }
        #bangumiHelper button {
            margin: 5px 0;
            padding: 5px 10px;
        }
        #bangumiHelper a {
            display: inline-block;
            margin: 5px 10px 5px 0;
            text-decoration: none;
            color: #0084B4;
        }
        #bangumiHelper.dark a {
            color: #6CB5D9;
        }
        #triggerButton {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 60px; /* 增大按钮宽度 */
            height: 40px; /* 增大按钮高度 */
            background-color: #FE8994; /* 使用指定颜色 */
            color: white;
            border: none;
            border-radius: 8px; /* 圆角 */
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            transition: background-color 0.2s, transform 0.2s;
        }
        #triggerButton:hover {
            background-color: #FF6B6B; /* 悬停时稍深的粉色 */
            transform: scale(1.05); /* 悬停时轻微放大 */
        }
        .button-row {
            display: flex;
            align-items: center;
            gap: 5px;
        }
    `);

    // 创建浮窗
    function createFloatingWindow() {
        const floatingWindow = document.createElement('div');
        floatingWindow.id = 'bangumiHelper';
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            floatingWindow.classList.add('dark');
        }

        document.body.appendChild(floatingWindow);

        return floatingWindow;
    }

    // 创建触发按钮
    function createTriggerButton() {
        const triggerButton = document.createElement('button');
        triggerButton.id = 'triggerButton';
        triggerButton.textContent = '助手'; // 使用文字“助手”
        document.body.appendChild(triggerButton);

        return triggerButton;
    }

    // 获取季节
    function getSeason(month) {
        if (month >= 1 && month <= 3) return '1月冬';
        if (month >= 4 && month <= 6) return '4月春';
        if (month >= 7 && month <= 9) return '7月夏';
        return '10月秋';
    }

    // 格式化文件夹名
    function formatFolderName(data, includePath, isBDRip) {
        const name = data.name_cn || data.name;
        const id = data.id;
        let folderName = `${name} ${isBDRip ? '[BDRip] ' : ''}${id}`;

        if (includePath) {
            const date = new Date(data.date);
            const year = date.getFullYear();
            let pathPrefix;

            if (data.platform === '剧场版') {
                pathPrefix = `/LavaAnimeLib/${year}年/剧场版/`;
            } else {
                const month = date.getMonth() + 1;
                const season = getSeason(month);
                pathPrefix = `/LavaAnimeLib/${year}年/${season}/`;
            }

            folderName = pathPrefix + folderName;
        }

        return folderName;
    }

    // 创建UI元素
    function createUI(data) {
        const window = createFloatingWindow();
        const triggerButton = createTriggerButton();

        window.innerHTML = `
            <div><select id="nameSelect"></select></div>
            <div><textarea id="folderName" readonly></textarea></div>
            <div class="button-row">
                <button id="copyButton">复制</button>
                <label><input type="checkbox" id="includePath"> 包含路径</label>
                <label><input type="checkbox" id="bdrip"> BDRip</label>
            </div>
            <div class="button-row">
                <a id="acgnxButton" target="_blank">搜索 ACGNX</a>
                <a id="mikanButton" target="_blank">搜索 Mikan</a>
                <a id="nyaaButton" target="_blank">搜索 Nyaa</a>
            </div>
            <div class="button-row">
                <a id="subtitleButton" target="_blank">搜索字幕</a>
                <a id="lavaniButton" target="_blank">在番剧库搜索</a>
            </div>
            <div style="margin-top: 10px;">
                <strong>收藏统计:</strong>
                <div id="collectionSum"></div>
            </div>
        `;

        const includePathCheckboxElement = window.querySelector('#includePath');
        const bdripCheckboxElement = window.querySelector('#bdrip');
        const nameSelectElement = window.querySelector('#nameSelect');
        const folderNameTextareaElement = window.querySelector('#folderName');
        const copyButtonElement = window.querySelector('#copyButton');
        const acgnxButtonElement = window.querySelector('#acgnxButton');
        const mikanButtonElement = window.querySelector('#mikanButton');
        const subtitleButtonElement = window.querySelector('#subtitleButton');
        const lavaniButtonElement = window.querySelector('#lavaniButton');
        const nyaaButtonElement = window.querySelector('#nyaaButton');

        // 填充名称选择下拉框
        const names = [data.name_cn, data.name];
        const aliasInfo = data.infobox.find(item => item.key === '别名');
        if (aliasInfo) {
            if (Array.isArray(aliasInfo.value)) {
                names.push(...aliasInfo.value.map(alias => alias.v));
            } else if (typeof aliasInfo.value === 'string') {
                names.push(aliasInfo.value);
            }
        }
        names.filter(Boolean).forEach(name => {
            const option = document.createElement('option');
            option.value = option.textContent = name;
            nameSelectElement.appendChild(option);
        });

        // 更新文件夹名和搜索链接
        function updateUI() {
            const includePath = includePathCheckboxElement.checked;
            const isBDRip = bdripCheckboxElement.checked;
            const selectedName = nameSelectElement.value;

            data.name_cn = selectedName;
            folderNameTextareaElement.value = formatFolderName(data, includePath, isBDRip);

            // 计算并显示 collection 数据加和
            const collectionSum = Object.values(data.collection).reduce((sum, val) => sum + val, 0);
            window.querySelector('#collectionSum').textContent = `总计: ${collectionSum}`;

            const encodedName = encodeURIComponent(selectedName);
            acgnxButtonElement.href = `https://share.acgnx.se/search.php?sort_id=0&keyword=${encodedName}`;
            mikanButtonElement.href = `https://mikanani.me/Home/Search?searchstr=${encodedName}`;

            // 更新为 Google 站内搜索链接
            const googleSearchQuery = encodeURIComponent(`allintitle:${selectedName} site:bbs.acgrip.com`);
            subtitleButtonElement.href = `https://www.google.com/search?q=${googleSearchQuery}`;

            // 设置番剧库搜索链接
            lavaniButtonElement.href = `https://lavani.me/search-bgm/${data.id}`;

            // 设置 Nyaa 搜索链接
            nyaaButtonElement.href = `https://nyaa.si/?q=${encodedName}`;
        }

        includePathCheckboxElement.onchange = updateUI;
        bdripCheckboxElement.onchange = updateUI;
        nameSelectElement.onchange = updateUI;
        copyButtonElement.onclick = () => GM_setClipboard(folderNameTextareaElement.value);

        updateUI();

        // 面板显示状态
        let isPanelVisible = true;
        showPanel(); // 初始显示面板

        // 显示面板
        function showPanel() {
            window.style.display = 'block';
            isPanelVisible = true;
        }

        // 隐藏面板
        function hidePanel() {
            window.style.display = 'none';
            isPanelVisible = false;
        }

        // 切换面板显示/隐藏
        function togglePanel() {
            if (isPanelVisible) {
                hidePanel();
            } else {
                showPanel();
            }
        }

        // 鼠标和触摸事件控制面板显示和隐藏
        let hideTimeout;
        let isTouchInteraction = false;

        // 处理触摸开始
        triggerButton.addEventListener('touchstart', (e) => {
            isTouchInteraction = true;
            e.preventDefault(); // 防止触发 click 事件
            clearTimeout(hideTimeout);
            if (!isPanelVisible) {
                showPanel();
            }
        }, { passive: false });

        // 处理鼠标进入
        triggerButton.addEventListener('mouseenter', () => {
            if (!isTouchInteraction) {
                clearTimeout(hideTimeout);
                showPanel();
            }
        });

        // 处理触摸结束
        window.addEventListener('touchend', (e) => {
            if (!window.contains(e.target) && !triggerButton.contains(e.target)) {
                hideTimeout = setTimeout(() => {
                    hidePanel();
                }, 500);
            }
        });

        // 处理鼠标离开
        window.addEventListener('mouseleave', () => {
            if (!isTouchInteraction) {
                hideTimeout = setTimeout(() => {
                    hidePanel();
                }, 500);
            }
        });

        window.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
        });

        // 处理点击事件
        triggerButton.addEventListener('click', (e) => {
            if (!isTouchInteraction) {
                e.stopPropagation();
                togglePanel();
            }
        });

        // 处理页面点击
        document.addEventListener('click', (e) => {
            if (isPanelVisible && !window.contains(e.target) && !triggerButton.contains(e.target)) {
                hidePanel();
            }
        });

        // 重置触摸状态
        document.addEventListener('touchstart', () => {
            isTouchInteraction = true;
        });
        document.addEventListener('touchend', () => {
            setTimeout(() => {
                isTouchInteraction = false;
            }, 100);
        });
    }

    // 获取条目数据并创建UI
    const subjectId = location.pathname.split('/').pop();
    GM_xmlhttpRequest({
        method: 'GET',
        url: `https://api.bgm.tv/v0/subjects/${subjectId}`,
        onload: function(response) {
            const data = JSON.parse(response.responseText);
            createUI(data);
        }
    });
})();
